import './tokens.css';
import './style.css';
import type { Day, Scene, TemperatureUnit } from './data';
import { icon } from './icons';
import { getTheme, setTheme } from './theme';
import { mountForecast } from './forecast-ui';
import { mountLocationPicker } from './location-ui';
import { defaultLocation } from './locations';
import { weatherState } from './state';
import { mountHero } from './hero';
import { mountPullRefresh } from './pull-refresh';
import { getLanguage, isLanguage, languageNames, setLanguage, t, translateStatic, type Language } from './i18n';
import { cityName, errorText, formatCount, formatUpdated } from './i18n/format';
import { expiryAge, freshnessDeadline } from './forecast-cache';
import { mountInstallSettings, registerOfflineShell } from './pwa';

let selectedDay: string | undefined;
let unit: TemperatureUnit = 'C';
try { if (localStorage.getItem('weather-v2-unit') === 'F') unit = 'F'; }
catch { /* The current tab can still use either unit. */ }
let override: Scene | null = null;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <a class="skip-link" href="#forecast" data-t="skip"></a>
  <div class="pull-indicator" aria-hidden="true">
    <span class="pull-icon">${icon('arrow')}</span><span class="pull-label"></span>
  </div>
  <div class="shell">
    <header class="header">
      <a class="brand" href="#" data-t-label="home">${icon('sunny')}<span>weather<span class="brand-dot">.</span></span></a>
      <div class="header-controls">
        <button class="quiet-button location-control" id="open-locations" aria-haspopup="dialog">${icon('pin')}<span class="location-name"></span></button>
        <button class="icon-button" id="settings" aria-haspopup="dialog" data-t-label="openSettings">${icon('settings')}</button>
      </div>
    </header>
    <main id="forecast" tabindex="-1">
      <h1 class="sr-only" data-t="forecast"></h1>
      <div class="forecast-status" hidden>
        <p id="forecast-notice" aria-hidden="true"></p>
        <button class="quiet-button" id="refresh" hidden></button>
      </div>
      <section class="hero" aria-labelledby="hero-title" hidden></section>
      <div class="forecast-grid" hidden>
        <section class="panel hourly-panel" aria-labelledby="hourly-title"><div class="section-heading"><h2 id="hourly-title" data-t="hourly"></h2><span id="hourly-day"></span></div><div id="hourly"></div></section>
        <section class="panel daily-panel" aria-labelledby="daily-title"><div class="section-heading"><h2 id="daily-title" data-t="week"></h2><span id="day-count"></span></div><div id="daily"></div></section>
        <section class="details-section" aria-labelledby="details-title"><div class="section-heading"><h2 id="details-title" data-t="details"></h2><span id="detail-day"></span></div><div id="details" class="details-grid"></div></section>
      </div>
      <p class="sr-only" id="forecast-message" role="status"></p>
    </main>
    <footer hidden><span>${icon('sunny')} <span data-t="footer"></span></span><span><span data-t="weatherSource"></span> <a href="https://open-meteo.com/">Open-Meteo</a> · <a href="https://open-meteo.com/en/licence">CC BY 4.0</a></span></footer>
  </div>
  <dialog id="settings-dialog" aria-labelledby="settings-title"><div class="section-heading"><h2 id="settings-title" data-t="settings"></h2><button id="close-settings" class="icon-button" data-t-label="closeSettings">${icon('close')}</button></div><p data-t="settingsIntro"></p><label class="setting-label" for="theme" data-t="appearance"></label><select id="theme"><option value="system" data-t="system"></option><option value="light" data-t="light"></option><option value="dark" data-t="dark"></option></select><label class="setting-label" for="language" data-t="language"></label><select id="language">${Object.entries(languageNames).map(([code, name]) => `<option value="${code}" lang="${code}">${name}</option>`).join('')}</select><label class="setting-label" for="unit" data-t="temperatureUnit"></label><select id="unit"><option value="C" data-t="celsius"></option><option value="F" data-t="fahrenheit"></option></select><label class="motion-setting"><input id="pause-motion" type="checkbox" /> <span data-t="pauseMotion"></span></label><p class="settings-note" data-t="settingsNote"></p><p class="settings-note" id="forecast-updated"></p><button class="quiet-button" id="settings-refresh" data-t="updateForecast"></button>
    <section class="install-settings" aria-labelledby="install-title">
      <h3 id="install-title" data-t="installTitle"></h3>
      <button class="quiet-button" id="install-app" hidden data-t="installAction"></button>
      <div id="install-guidance" class="settings-note">
        <p data-t="installIos"></p>
        <p data-t="installFallback"></p>
      </div>
      <p id="install-installed" class="settings-note" hidden data-t="installInstalled"></p>
    </section>
  </dialog>
  <dialog id="location-dialog" aria-labelledby="location-title">
    <div class="section-heading">
      <h2 id="location-title" data-t="locations"></h2>
      <button class="icon-button" id="close-locations" data-t-label="closeLocations">${icon('close')}</button>
    </div>
    <label class="setting-label" for="city-search" data-t="searchCity"></label>
    <input type="search" id="city-search" data-t-placeholder="cityName" autocomplete="off" maxlength="120" autofocus />
    <p class="location-message" id="search-status" role="status"></p>
    <button class="quiet-button" id="retry-search" hidden data-t="retrySearch"></button>
    <ul id="city-results" class="city-list" data-t-label="matchingCities"></ul>
    <h3 class="saved-title" data-t="savedCities"></h3>
    <p class="location-message" id="storage-status" role="status"></p>
    <ul id="saved-cities" class="city-list"></ul>
    <div class="location-actions">
      <button class="quiet-button" id="use-default"></button>
      <button class="quiet-button" id="use-device" data-t="useDevice"></button>
    </div>
    <p class="location-message" data-t="locationPrivacy"></p>
    <p class="location-message" id="geo-status" role="status"></p>
  </dialog>`;

const heroElement = app.querySelector<HTMLElement>('.hero')!;
const grid = app.querySelector<HTMLElement>('.forecast-grid')!;
const footer = app.querySelector('footer')!;
const message = app.querySelector('#forecast-message')!;
const refresh = app.querySelector<HTMLButtonElement>('#refresh')!;
const locationButton = app.querySelector<HTMLButtonElement>('#open-locations')!;
const locationName = locationButton.querySelector('.location-name')!;
const forecastNotice = app.querySelector('#forecast-notice')!;
const statusRow = app.querySelector<HTMLElement>('.forecast-status')!;
const updatedNote = app.querySelector('#forecast-updated')!;
const hero = mountHero(heroElement);
const state = weatherState(render);
const renderForecast = mountForecast(app);
let rendered: { day: Day; unit: TemperatureUnit; location: string; language: Language; previous: boolean } | undefined;
let renderedLocation: string | undefined;
let refreshTimer: number | undefined;

function canAutoRefresh(): boolean {
  return !document.hidden && navigator.onLine && !state.loading;
}

function scheduleRefresh(updated: number | undefined, labelsExpire: number): void {
  window.clearTimeout(refreshTimer);
  const now = Date.now();
  const expires = updated === undefined ? Infinity : updated + expiryAge;
  const deadline = Math.min(expires, labelsExpire > now ? labelsExpire : Infinity,
    canAutoRefresh() ? state.nextRefreshAt : Infinity);
  if (!Number.isFinite(deadline)) return;
  refreshTimer = window.setTimeout(() => {
    if (canAutoRefresh() && Date.now() >= state.nextRefreshAt) void state.refreshIfDue();
    else render();
  }, Math.max(1, deadline - now));
}

function render(): void {
  const snapshot = state.snapshot;
  heroElement.hidden = grid.hidden = !snapshot;
  footer.hidden = !snapshot && state.loading;

  const city = state.location;
  const name = cityName(city);
  const language = getLanguage();
  locationName.textContent = name;
  locationButton.setAttribute('aria-label', t('changeLocation', { city: name }));
  if (renderedLocation !== city.id) {
    renderedLocation = city.id;
    selectedDay = undefined;
  }
  const updated = snapshot && formatUpdated(snapshot.updated, snapshot.forecast.timezone);
  const offline = !navigator.onLine;
  const labelsExpire = snapshot ? freshnessDeadline(snapshot) : 0;
  scheduleRefresh(snapshot?.updated, labelsExpire);
  refresh.hidden = !!snapshot || state.loading;
  refresh.textContent = t('retry');
  let status = '';
  const updateLabel = updated ? t('updated', { time: updated }) : '';
  if (offline) {
    status = snapshot ? `${t('offline')} ${t('previousForecast')} ${updateLabel}` : t('offlineEmpty');
  } else if (!snapshot) {
    status = state.locating ? t('locating') : state.loading ? t('loading', { city: name }) :
      errorText(state.error, 'forecastFailed');
  }
  if (message.textContent !== status) message.textContent = status;
  statusRow.hidden = !status;
  forecastNotice.textContent = status;
  updatedNote.textContent = [
    updateLabel,
    snapshot?.forecast.incomplete ? t('incomplete') : '',
    !offline && snapshot && state.error ? errorText(state.error, 'forecastFailed') : ''
  ].filter(Boolean).join(' ');
  if (!snapshot) { rendered = undefined; return; }

  // Keep existing forecast labels stable while the replacement is in flight.
  const previous = offline || snapshot.restored || (state.loading && rendered?.location === city.id
    ? rendered.previous : !!state.error || Date.now() >= labelsExpire);
  const { days } = snapshot.forecast;
  const day = days.find(item => item.key === selectedDay) ?? days[0]!;
  hero.update(name, day, unit,
    city.id === defaultLocation.id ? t('defaultCity') : '', override, previous);
  if (rendered?.day === day && rendered.unit === unit && rendered.language === language && rendered.previous === previous) return;
  const resetScroll = rendered?.day.key !== day.key || rendered.location !== city.id;
  renderForecast(days, day, unit, snapshot.forecast.timezone, resetScroll, previous);
  app.querySelector('#day-count')!.textContent = formatCount(days.length, 'day');
  rendered = { day, unit, location: city.id, language, previous };
}

app.querySelector('#daily')!.addEventListener('click', event => {
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-day]') : null;
  if (!button) return;
  selectedDay = state.snapshot?.forecast.days[Number(button.dataset.day)]?.key;
  render();
});
const updateWeather = () => state.update();
refresh.addEventListener('click', updateWeather);
const localizePull = mountPullRefresh(app, () => state.loading, updateWeather);
const localizePicker = mountLocationPicker(app.querySelector<HTMLDialogElement>('#location-dialog')!, state);

const dialog = app.querySelector<HTMLDialogElement>('#settings-dialog')!;
mountInstallSettings(dialog);
app.querySelector('#settings')!.addEventListener('click', () => dialog.showModal());
app.querySelector('#close-settings')!.addEventListener('click', () => dialog.close());
app.querySelector('#settings-refresh')!.addEventListener('click', () => {
  dialog.close();
  void updateWeather();
});
const languageSelect = app.querySelector<HTMLSelectElement>('#language')!;
function applyLanguage(): void {
  const language = getLanguage();
  document.documentElement.lang = language;
  document.title = `${t('forecast')} · weather.`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('forecast'));
  languageSelect.value = language;
  translateStatic(document);
  localizePicker();
  localizePull();
}
languageSelect.addEventListener('change', () => {
  const value = languageSelect.value;
  if (!isLanguage(value)) return;
  setLanguage(value);
  applyLanguage();
  render();
});

const themeSelect = app.querySelector<HTMLSelectElement>('#theme')!;
themeSelect.value = getTheme();
themeSelect.addEventListener('change', () => {
  const value = themeSelect.value;
  if (value === 'system' || value === 'light' || value === 'dark') setTheme(value);
});
const unitSelect = app.querySelector<HTMLSelectElement>('#unit')!;
unitSelect.value = unit;
unitSelect.addEventListener('change', () => {
  unit = unitSelect.value === 'F' ? 'F' : 'C';
  try { localStorage.setItem('weather-v2-unit', unit); }
  catch { /* Use the selected unit for the current session. */ }
  render();
});
const pauseMotion = app.querySelector<HTMLInputElement>('#pause-motion')!;
pauseMotion.addEventListener('change', () => {
  hero.pauseAmbient(pauseMotion.checked);
});

function resumeRefresh(): void {
  render();
  if (canAutoRefresh()) void state.refreshIfDue(true);
}
document.addEventListener('visibilitychange', resumeRefresh);
window.addEventListener('pageshow', event => { if (event.persisted) resumeRefresh(); });
window.addEventListener('online', () => {
  render();
  if (!document.hidden) state.reconnect();
});
window.addEventListener('offline', render);
applyLanguage();
registerOfflineShell();
const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
void state.update(navigation?.type === 'reload');

if (import.meta.env.DEV) {
  void import('./preview').then(({ mountPreview }) => mountPreview(
    scene => {
      override = scene;
      render();
    },
    hero.previewReducedMotion
  ));
}
