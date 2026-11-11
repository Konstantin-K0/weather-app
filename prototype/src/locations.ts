export interface Location {
  id: string;
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
}
export interface SavedLocations {
  cities: Location[];
  selected: string | null;
  followDevice?: boolean;
  lastDevice?: Location;
}
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const key = 'weather-v2-locations';
export const defaultLocation: Location = {
  id: 'default-prague', name: 'Prague', country: 'Czechia', latitude: 50.0755, longitude: 14.4378
};

export function validLocation(value: unknown): value is Location {
  if (!value || typeof value !== 'object') return false;
  const city = value as Partial<Location>;
  return typeof city.id === 'string' && !!city.id &&
    typeof city.name === 'string' && !!city.name.trim() &&
    (city.region === undefined || typeof city.region === 'string') &&
    (city.country === undefined || typeof city.country === 'string') &&
    typeof city.latitude === 'number' && Math.abs(city.latitude) <= 90 &&
    typeof city.longitude === 'number' && Math.abs(city.longitude) <= 180;
}

export function locationLabel(city: Location): string {
  return [...new Set([city.name, city.region, city.country].filter(Boolean))].join(', ');
}

export function loadLocations(storage?: Storage): SavedLocations {
  try {
    const value = JSON.parse((storage ?? localStorage).getItem(key) ?? 'null');
    if (Array.isArray(value?.cities)) {
      const cities = [...new Map((value.cities as unknown[]).filter(validLocation).map(city => [city.id, city])).values()];
      return {
        cities,
        selected: cities.some(city => city.id === value.selected) ? value.selected : null,
        ...(typeof value.followDevice === 'boolean' ? { followDevice: value.followDevice } : {}),
        ...(validLocation(value.lastDevice) && value.lastDevice.id.startsWith('device:') ? { lastDevice: value.lastDevice } : {})
      };
    }
  } catch { /* An unavailable or invalid store starts empty. */ }
  return { cities: [], selected: null };
}

export function saveLocations(value: SavedLocations, storage?: Storage): boolean {
  try { (storage ?? localStorage).setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function selectSaved(saved: SavedLocations, city: Location): SavedLocations {
  return { ...saved, cities: [...saved.cities.filter(item => item.id !== city.id), city], selected: city.id };
}

export function removeSaved(saved: SavedLocations, id: string): SavedLocations {
  const cities = saved.cities.filter(city => city.id !== id);
  return { ...saved, cities, selected: saved.selected === id ? cities.at(-1)?.id ?? null : saved.selected };
}
