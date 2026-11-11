import type { Condition, Day, TemperatureUnit } from '../data.ts';
import { temperatureValue } from '../data.ts';
import { AppError, type AppErrorCode } from '../errors.ts';
import { defaultLocation, type Location } from '../locations.ts';
import { getLanguage, t, type Language } from './index.ts';

const dateFormats = new Map<string, Intl.DateTimeFormat>();
function dateFormat(key: string, timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const language = getLanguage();
  // Keep the existing 24-hour clock in the English forecast.
  const locale = language === 'en' && (key === 'time' || key === 'updated') ? 'en-GB' : language;
  const id = `${locale}:${timeZone}:${key}`;
  let formatter = dateFormats.get(id);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone });
    dateFormats.set(id, formatter);
  }
  return formatter;
}

export const formatTime = (seconds: number, zone: string) =>
  dateFormat('time', zone, { hour: '2-digit', minute: '2-digit' }).format(seconds * 1000);
export const formatOffset = (seconds: number, zone: string) =>
  dateFormat('offset', zone, { timeZoneName: 'shortOffset' }).formatToParts(seconds * 1000)
    .find(part => part.type === 'timeZoneName')?.value ?? '';
export const formatUpdated = (milliseconds: number, zone: string) =>
  dateFormat('updated', zone, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    .format(milliseconds);
export const formatDate = (key: string) =>
  dateFormat('date', 'UTC', { dateStyle: 'long' }).format(new Date(`${key}T00:00:00Z`));
export const dayLabel = (day: Pick<Day, 'relativeDay' | 'key'>, previous = false) =>
  !previous && day.relativeDay === 0 ? t('today') : !previous && day.relativeDay === 1 ? t('tomorrow') :
  dateFormat('weekday', 'UTC', { weekday: 'long' }).format(new Date(`${day.key}T00:00:00Z`));

const numberFormats = new Map<string, Intl.NumberFormat>();
function numberFormat(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const language = getLanguage();
  const id = `${language}:${key}`;
  let formatter = numberFormats.get(id);
  if (!formatter) {
    formatter = new Intl.NumberFormat(language, options);
    numberFormats.set(id, formatter);
  }
  return formatter;
}
export const formatNumber = (value: number, maximumFractionDigits = 0) =>
  numberFormat(`decimal:${maximumFractionDigits}`, { maximumFractionDigits }).format(value);
export const formatPercent = (value: number) =>
  numberFormat('percent', { style: 'percent', maximumFractionDigits: 0 }).format(value / 100);
export const formatCount = (value: number, unit: 'day' | 'hour') =>
  numberFormat(unit, { style: 'unit', unit, unitDisplay: 'long' }).format(value);

export function degrees(value: number | null, unit: TemperatureUnit): string {
  return value === null ? '—' : `${formatNumber(temperatureValue(value, unit))}°`;
}
export function accessibleDegrees(value: number | null, unit: TemperatureUnit): string {
  return value === null ? t('tempMissing') : t(unit === 'C' ? 'degreesCelsius' : 'degreesFahrenheit', {
    value: formatNumber(temperatureValue(value, unit))
  });
}
export function conditionText(condition: Condition): string {
  if (condition.code === null) return t('unknownWeather');
  if (condition.scene === 'night' && condition.code <= 1) {
    return t(condition.code === 0 ? 'clearNight' : 'mostlyClearNight');
  }
  return t(`wmo${condition.code}`);
}

export function errorText(error: unknown, fallback: Exclude<AppErrorCode, 'apiStatus'>): string {
  if (!(error instanceof AppError)) return t(fallback);
  if (error.code === 'apiStatus') return t('apiStatus', { status: error.status ?? '—' });
  return t(error.code);
}

export function cityName(city: Location): string {
  if (city.id === defaultLocation.id) return t('prague');
  if (city.id.startsWith('device:') && city.name === 'Device location') return t('deviceLocation');
  return city.name;
}

const compassLabels: Record<Language, readonly string[]> = {
  en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  uk: ['Пн', 'ПнСх', 'Сх', 'ПдСх', 'Пд', 'ПдЗх', 'Зх', 'ПнЗх'],
  cs: ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'],
  ru: ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']
};
export const compassLabel = (direction: number) => compassLabels[getLanguage()][Math.round(direction / 45) % 8]!;
