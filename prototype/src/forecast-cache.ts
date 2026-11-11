import type { Condition, Forecast } from './data.ts';
import { weatherCondition } from './conditions.ts';

const schema = 1;
export const maxForecasts = 12;
export const refreshAge = 15 * 60_000;
export const expiryAge = 7 * 24 * 60 * 60_000;
const databaseName = 'weather-v2-forecasts';
const storeName = 'forecasts';

export interface ForecastRecord {
  version: number;
  locationId: string;
  updated: number;
  forecast: Forecast;
}
export interface ForecastStore {
  read(locationId: string): Promise<ForecastRecord | null>;
  write(record: ForecastRecord): Promise<void>;
  remove(locationId: string): Promise<void>;
}
export function freshnessDeadline({ updated, forecast }: Pick<ForecastRecord, 'updated' | 'forecast'>): number {
  const calendar = new Intl.DateTimeFormat('en', { timeZone: forecast.timezone, dateStyle: 'short' });
  const day = calendar.format(updated);
  let end = updated + refreshAge;
  if (calendar.format(end) === day) return end;
  // Find the local date boundary without assuming an offset or a 24-hour day.
  let start = updated;
  while (end - start > 1) {
    const middle = Math.floor((start + end) / 2);
    if (calendar.format(middle) === day) start = middle;
    else end = middle;
  }
  return end;
}

export const isFresh = (record: ForecastRecord | undefined, now = Date.now()) =>
  !!record && now >= record.updated && now < freshnessDeadline(record);

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nullable = (value: unknown): value is number | null => value === null || number(value);
const instant = (value: unknown) => number(value) && Math.abs(value) <= 8.64e12;
function calendarKey(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(time.getTime()) && time.toISOString().slice(0, 10) === value;
}
function condition(value: unknown): value is Condition {
  if (!object(value) || !nullable(value.code)) return false;
  const expected = weatherCondition(value.code, value.scene !== 'night');
  return value.code === expected.code && value.scene === expected.scene && value.icon === expected.icon;
}
function validForecast(value: unknown): value is Forecast {
  if (!object(value) || typeof value.timezone !== 'string' || typeof value.incomplete !== 'boolean' ||
      !Array.isArray(value.days) || value.days.length < 1 || value.days.length > 7) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value.timezone }); }
  catch { return false; }
  return Array.from(value.days).every(day => object(day) && calendarKey(day.key) && Number.isInteger(day.relativeDay) &&
    condition(day.condition) && condition(day.dailyCondition) &&
    ['temperature', 'feelsLike', 'low', 'high', 'wind', 'direction', 'humidity', 'uv'].every(key => nullable(day[key])) &&
    ['readingTimestamp', 'sunrise', 'sunset'].every(key => day[key] === null || instant(day[key])) &&
    Array.isArray(day.hours) && day.hours.length <= 26 &&
    Array.from(day.hours).every(hour => object(hour) && calendarKey(hour.date) && instant(hour.timestamp) &&
      number(hour.localMinute) && Number.isInteger(hour.localMinute) && hour.localMinute >= 0 && hour.localMinute < 1440 &&
      nullable(hour.temperature) && nullable(hour.precipitation) && condition(hour.condition)));
}

export function validRecord(value: unknown, locationId: string, now = Date.now()): value is ForecastRecord {
  return object(value) && value.version === schema && value.locationId === locationId &&
    number(value.updated) && value.updated > 0 && value.updated <= now && now - value.updated < expiryAge &&
    validForecast(value.forecast);
}
export function forecastRecord(locationId: string, forecast: Forecast, updated = Date.now()): ForecastRecord {
  return { version: schema, locationId, forecast, updated };
}

export function pruneForecasts(values: unknown[], now = Date.now()): string[] {
  const remove: string[] = [];
  const keep: ForecastRecord[] = [];
  for (const value of values) {
    if (!object(value) || typeof value.locationId !== 'string') continue;
    if (validRecord(value, value.locationId, now)) keep.push(value);
    else remove.push(value.locationId);
  }
  keep.sort((a, b) => b.updated - a.updated);
  return remove.concat(keep.slice(maxForecasts).map(record => record.locationId));
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(databaseName, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(storeName)) {
        open.result.createObjectStore(storeName, { keyPath: 'locationId' });
      }
    };
    open.onerror = () => reject(open.error);
    open.onblocked = () => {
      open.onsuccess = () => open.result.close();
      reject(new Error('Forecast database is blocked'));
    };
    open.onsuccess = () => resolve(open.result);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export const forecastStore: ForecastStore = {
  async read(locationId) {
    try {
      const value = await withStore('readonly', store => store.get(locationId));
      return validRecord(value, locationId) ? value : null;
    } catch { return null; }
  },
  async write(record) {
    if (!validRecord(record, record.locationId)) return;
    try {
      await withStore('readwrite', store => {
        const all = store.getAll();
        all.onsuccess = () => {
          const existing = all.result.find(entry => entry.locationId === record.locationId);
          if (validRecord(existing, record.locationId) && existing.updated > record.updated) return;
          store.put(record);
          const candidates = all.result.filter(entry => entry.locationId !== record.locationId);
          const remove = new Set(pruneForecasts([...candidates, record]));
          if (record.locationId.startsWith('device:')) {
            for (const entry of candidates) {
              if (typeof entry.locationId === 'string' && entry.locationId.startsWith('device:') &&
                  entry.updated <= record.updated) remove.add(entry.locationId);
            }
          }
          for (const key of remove) store.delete(key);
        };
        return all;
      });
    } catch { /* The live forecast is usable when persistence is unavailable. */ }
  },
  async remove(locationId) {
    try { await withStore('readwrite', store => store.delete(locationId)); }
    catch { /* Storage may be unavailable. */ }
  }
};
