import { AppError } from './errors.ts';
import { requestJSON } from './api.ts';
import { apiObject } from './api-types.ts';
import type { Location } from './locations';

export async function deviceLocation(interactive = true): Promise<Location> {
  if (!interactive) {
    const permission = await navigator.permissions?.query({ name: 'geolocation' }).catch(() => undefined);
    if (permission?.state !== 'granted') throw new AppError('geoPermission');
  }
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext || !navigator.geolocation) {
      reject(new AppError(window.isSecureContext ? 'geoUnsupported' : 'geoSecure'));
      return;
    }
    // The browser's timeout can exclude the time spent waiting for permission.
    const deadline = window.setTimeout(() => reject(new AppError('geoTimeout')), interactive ? 15_000 : 6_000);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      window.clearTimeout(deadline);
      const latitude = Math.round(coords.latitude * 100) / 100;
      const longitude = Math.round(coords.longitude * 100) / 100;
      resolve({ id: `device:${latitude},${longitude}`, name: 'Device location', latitude, longitude });
    }, error => {
      window.clearTimeout(deadline);
      reject(new AppError(error.code === 1 ? 'geoDenied' : error.code === 3 ? 'geoTimeout' : 'geoUnavailable'));
    }, { enableHighAccuracy: false, timeout: interactive ? 10_000 : 5_000, maximumAge: 300_000 });
  });
}

export async function deviceCity(location: Location, signal: AbortSignal): Promise<string | undefined> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.search = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude), localityLanguage: 'en'
  }).toString();
  const result = apiObject(await requestJSON(url, signal, { timeout: 5_000, referrerPolicy: 'no-referrer' }));
  const name = [result?.city, result?.locality].find(value => typeof value === 'string' && value.trim());
  return typeof name === 'string' ? name.trim() : undefined;
}
