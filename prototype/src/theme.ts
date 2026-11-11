export type Theme = 'system' | 'light' | 'dark';
const system = window.matchMedia('(prefers-color-scheme: dark)');
let preference: Theme = 'system';
let preview: Theme | null = null;
try {
  const saved = localStorage.getItem('weather-v2-theme');
  if (saved === 'light' || saved === 'dark') preference = saved;
} catch { /* Storage can be unavailable in private contexts. */ }
function apply(): void {
  const choice = preview ?? preference;
  const theme = choice === 'system' ? (system.matches ? 'dark' : 'light') : choice;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111820' : '#f5f6f8');
}
export function setTheme(theme: Theme): void {
  preference = theme;
  try { localStorage.setItem('weather-v2-theme', theme); } catch { /* Memory-only fallback. */ }
  apply();
}
export function setThemePreview(theme: Theme | null): void {
  preview = theme;
  apply();
}
export function getTheme(): Theme { return preference; }
system.addEventListener('change', apply);
apply();
