import { AppError } from './errors.ts';
import { requestForecast } from './api.ts';
import { expiryAge, forecastRecord, forecastStore, isFresh, maxForecasts, refreshAge, validRecord, type ForecastRecord, type ForecastStore } from './forecast-cache.ts';
import { deviceCity, deviceLocation } from './geolocation.ts';
import { defaultLocation, loadLocations, removeSaved, saveLocations, selectSaved, type Location } from './locations.ts';
import { normalizeForecast } from './normalize.ts';

type Snapshot = ForecastRecord & { restored: boolean };

export function weatherState(render: () => void, store: ForecastStore = forecastStore) {
  let saved = loadLocations();
  const selectedCity = () => saved.cities.find(city => city.id === saved.selected) ?? defaultLocation;
  let location = saved.followDevice && saved.lastDevice ? saved.lastDevice : selectedCity();
  let active: AbortController | undefined;
  let recoverWhenIdle = false;
  let naming: AbortController | undefined;
  let locating = false;
  let error: AppError | null = null;
  let lastFailure = 0;
  let storageAvailable = true;
  const cache = new Map<string, Snapshot>();
  function syncSaved(): void {
    if (storageAvailable) saved = loadLocations();
  }

  function snapshotFor(id: string): Snapshot | undefined {
    const record = cache.get(id);
    const now = Date.now();
    if (record && now >= record.updated && now - record.updated < expiryAge) return record;
    cache.delete(id);
  }

  function keep(record: ForecastRecord, restored: boolean): void {
    cache.delete(record.locationId);
    cache.set(record.locationId, { ...record, restored });
    const oldest = cache.keys().next().value;
    if (cache.size > maxForecasts && oldest !== undefined) cache.delete(oldest);
  }

  async function restore(city: Location, signal: AbortSignal): Promise<void> {
    if (snapshotFor(city.id)) return;
    const record = await store.read(city.id);
    if (signal.aborted || !validRecord(record, city.id)) return;
    keep(record, true);
    render();
  }

  function adoptDevice(position: Location): void {
    const previous = saved.lastDevice;
    const city = previous?.id === position.id ? previous : position;
    location = city;
    saved = { ...saved, followDevice: true, lastDevice: city };
    storageAvailable = saveLocations(saved);

    if (previous?.id === city.id && previous.name !== 'Device location') return;
    naming?.abort();
    const request = new AbortController();
    naming = request;
    void deviceCity(position, request.signal).then(name => {
      if (!name || request.signal.aborted || location !== city || !saved.followDevice) return;
      location = { ...city, name };
      syncSaved();
      if (saved.followDevice && saved.lastDevice?.id === city.id) {
        saved = { ...saved, lastDevice: location };
        storageAvailable = saveLocations(saved);
      }
      render();
    }).catch(() => { /* Coordinates are sufficient for a forecast. */ });
  }

  function cancel(): void {
    active?.abort();
    active = undefined;
    locating = false;
    recoverWhenIdle = false;
    lastFailure = 0;
  }

  const nextRefreshAt = () => Math.max(snapshotFor(location.id)?.updated ?? 0, lastFailure) + refreshAge;

  async function refreshIfDue(useDevice = false): Promise<void> {
    if (navigator.onLine && Date.now() >= nextRefreshAt()) await update(false, useDevice);
  }

  async function update(force = true, useDevice = true): Promise<void> {
    if (active) return;
    if (!force && !error && navigator.onLine && isFresh(snapshotFor(location.id))) {
      render();
      return;
    }
    const request = new AbortController();
    active = request;
    const retry = error !== null;
    error = null;
    render();
    try {
      await restore(location, request.signal);
      if (request.signal.aborted) return;
      if (!navigator.onLine) throw new AppError('offline');
      if (!force && !retry && isFresh(snapshotFor(location.id))) return;

      syncSaved();
      const firstVisit = saved.followDevice === undefined && saved.selected === null;
      if (useDevice && (firstVisit || saved.followDevice)) {
        if (firstVisit) {
          saved.followDevice = true;
          storageAvailable = saveLocations(saved);
        }
        locating = true;
        render();
        const position = await deviceLocation(firstVisit).catch(() => undefined);
        if (request.signal.aborted) return;
        locating = false;
        syncSaved();
        if (position && saved.followDevice) {
          adoptDevice(position);
          await restore(location, request.signal);
        }
        if (request.signal.aborted) return;
        if (!force && !retry && isFresh(snapshotFor(location.id))) return;
      }

      const city = location;
      render();
      const payload = await requestForecast(city, request.signal);
      if (request.signal.aborted) return;
      const updated = Date.now();
      const forecast = normalizeForecast(payload, updated / 1000);
      const record = forecastRecord(city.id, forecast, updated);
      keep(record, false);
      lastFailure = 0;
      // Let the successful weather display while the disk transaction completes.
      void store.write(record);
    } catch (reason) {
      if (!request.signal.aborted) {
        error = reason instanceof AppError ? reason : new AppError('forecastFailed');
        if (navigator.onLine && error.code !== 'offline') lastFailure = Date.now();
      }
    } finally {
      if (active === request) {
        active = undefined;
        locating = false;
        render();
        const recover = recoverWhenIdle && error && navigator.onLine;
        recoverWhenIdle = false;
        if (recover) void update(false);
      }
    }
  }

  function choose(city: Location, remember: boolean): void {
    cancel();
    naming?.abort();
    syncSaved();
    error = null;
    if (saved.lastDevice) {
      cache.delete(saved.lastDevice.id);
      void store.remove(saved.lastDevice.id);
    }
    saved.followDevice = false;
    delete saved.lastDevice;
    location = city;
    if (remember) saved = selectSaved(saved, city);
    else if (city.id === defaultLocation.id) saved = { ...saved, selected: null };
    storageAvailable = saveLocations(saved);
    void update(false, false);
  }

  function chooseDevice(position: Location): Promise<void> {
    cancel();
    syncSaved();
    adoptDevice(position);
    return update(true, false);
  }

  function remove(id: string): void {
    syncSaved();
    saved = removeSaved(saved, id);
    storageAvailable = saveLocations(saved);
    cache.delete(id);
    void store.remove(id);
    if (location.id === id) {
      cancel();
      location = selectedCity();
      void update(false, false);
    } else {
      render();
    }
  }

  function reconnect(): void {
    if (active) recoverWhenIdle = true;
    else if (error?.code === 'offline') void update(false);
    else void refreshIfDue(true);
  }

  return {
    get location() { return location; },
    get saved() { syncSaved(); return saved; },
    get snapshot() { return snapshotFor(location.id); },
    get loading() { return !!active; },
    get locating() { return locating; },
    get error() { return error; },
    get nextRefreshAt() { return nextRefreshAt(); },
    get storageAvailable() { return storageAvailable; },
    choose, chooseDevice, remove, update, refreshIfDue, reconnect
  };
}
