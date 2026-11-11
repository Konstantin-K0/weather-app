import type { WeatherIcon } from './data';
export type Icon = WeatherIcon | 'pin' | 'settings' | 'wind' | 'drop' | 'sunrise' | 'arrow' | 'close';
const paths: Record<Icon, string> = {
  sunny: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  cloudy: '<path d="M6 18a4 4 0 0 1-1-7.9A6 6 0 0 1 16.5 8a5 5 0 1 1 1.5 10Z"/>',
  rainy: '<path d="M5 15a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 1 1 2 9M8 18l-1 3m6-3-1 3m6-3-1 3"/>',
  night: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/><path d="M18 2v4m-2-2h4"/>',
  fog: '<path d="M4 8h16M2 12h16M6 16h16"/>',
  snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3m-6 16 3-3 3 3"/>',
  storm: '<path d="M5 15a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 1 1 2 9m-6-3-3 5h4l-2 5"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--surface)"/><circle cx="16" cy="17" r="3" fill="var(--surface)"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3"/>',
  drop: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>',
  sunrise: '<path d="M2 18h20M4 22h16M6 18a6 6 0 0 1 12 0M12 2v7m-3-4 3-3 3 3M2 10l3 3m17-3-3 3"/>',
  arrow: '<path d="m5 12 7-7 7 7M12 5v15"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>'
};
export function icon(name: Icon, className = ''): string {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
