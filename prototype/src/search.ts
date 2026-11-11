import { AppError } from './errors.ts';
import { requestJSON } from './api';
import type { Language } from './i18n/types';
import { apiObject } from './api-types';
import { validLocation, type Location } from './locations';

export async function searchCities(query: string, signal: AbortSignal, language: Language): Promise<Location[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name: query, count: '8', language }).toString();
  const data = apiObject(await requestJSON(url, signal));
  if (!data || (data.results !== undefined && !Array.isArray(data.results))) {
    throw new AppError('searchInvalid');
  }
  const cities = new Map<string, Location>();
  for (const entry of data.results ?? []) {
    const result = apiObject(entry);
    if (!result || !Number.isInteger(result.id)) continue;
    const region = [result.admin2, result.admin1].filter((name, index, names) =>
      typeof name === 'string' && name !== result.name && names.indexOf(name) === index).join(', ');
    const city = {
      id: String(result.id), name: result.name, latitude: result.latitude, longitude: result.longitude,
      ...(region ? { region } : {}), ...(result.country ? { country: result.country } : {})
    };
    if (validLocation(city)) cities.set(city.id, city);
  }
  return [...cities.values()];
}
