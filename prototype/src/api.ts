import { AppError } from './errors.ts';
import type { Location } from './locations.ts';

interface RequestOptions {
  timeout?: number;
  referrerPolicy?: ReferrerPolicy;
}

export async function requestJSON(url: URL, signal: AbortSignal, options: RequestOptions = {}): Promise<unknown> {
  if (navigator.onLine === false) throw new AppError('offline');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    abort();
  }, options.timeout ?? 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      ...(options.referrerPolicy ? { referrerPolicy: options.referrerPolicy } : {})
    });
    if (!response.ok) throw new AppError('apiStatus', response.status);
    try { return await response.json(); }
    catch (error) {
      if (error instanceof SyntaxError) throw new AppError('apiUnreadable');
      throw error;
    }
  } catch (error) {
    if (signal.aborted) throw error;
    if (timedOut) throw new AppError('apiTimeout');
    if (error instanceof TypeError) throw new AppError(navigator.onLine ? 'apiConnection' : 'offline');
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

const current = ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'weather_code', 'is_day', 'wind_speed_10m', 'wind_direction_10m'];
const daily = ['temperature_2m_min', 'temperature_2m_max', 'weather_code', 'sunrise', 'sunset', 'uv_index_max'];
export function requestForecast(location: Location, signal: AbortSignal): Promise<unknown> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude),
    timezone: 'auto', timeformat: 'unixtime', forecast_days: '7',
    current: current.join(','), hourly: [...current, 'precipitation_probability'].join(','), daily: daily.join(',')
  }).toString();
  return requestJSON(url, signal);
}
