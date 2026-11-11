import { getLanguage, t } from './i18n';
import { cityName, errorText, formatNumber } from './i18n/format';
import { deviceLocation } from './geolocation';
import { defaultLocation, locationLabel, type Location } from './locations';
import { searchCities } from './search';
import type { weatherState } from './state';

export function mountLocationPicker(dialog: HTMLDialogElement, state: ReturnType<typeof weatherState>): () => void {
  const input = dialog.querySelector<HTMLInputElement>('#city-search')!;
  const results = dialog.querySelector('#city-results')!;
  const searchStatus = dialog.querySelector('#search-status')!;
  const retry = dialog.querySelector<HTMLButtonElement>('#retry-search')!;
  const locate = dialog.querySelector<HTMLButtonElement>('#use-device')!;
  const geoStatus = dialog.querySelector('#geo-status')!;
  const savedList = dialog.querySelector('#saved-cities')!;
  const storageStatus = dialog.querySelector('#storage-status')!;
  let timer = 0;
  let request: AbortController | undefined;
  let geoAttempt = 0;
  let searchMessage = () => '';
  let geoMessage = () => '';

  function showSearch(message: () => string): void {
    searchMessage = message;
    searchStatus.textContent = message();
  }

  function showGeo(message: () => string): void {
    geoMessage = message;
    geoStatus.textContent = message();
  }

  function cancelSearch(): void {
    window.clearTimeout(timer);
    request?.abort();
  }

  function close(): void {
    cancelSearch();
    geoAttempt++;
    locate.disabled = false;
    dialog.close();
  }

  function choose(city: Location, remember: boolean): void {
    close();
    state.choose(city, remember);
  }

  function cityButton(city: Location): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'city-choice';
    button.textContent = locationLabel(city);
    button.addEventListener('click', () => choose(city, true));
    return button;
  }

  function renderSaved(): void {
    const rows = state.saved.cities.map(city => {
      const row = document.createElement('li');
      const select = cityButton(city);
      if (city.id === state.location.id) select.setAttribute('aria-current', 'true');
      const remove = document.createElement('button');
      remove.className = 'quiet-button';
      remove.dataset.removeCity = locationLabel(city);
      remove.addEventListener('click', () => {
        state.remove(city.id);
        renderSaved();
        (savedList.querySelector<HTMLButtonElement>('.city-choice') ?? input).focus();
      });
      row.append(select, remove);
      return row;
    });
    savedList.replaceChildren(...rows);
    localize();
  }

  async function search(query: string): Promise<void> {
    const active = new AbortController();
    request = active;
    showSearch(() => t('searching'));
    try {
      const cities = await searchCities(query, active.signal, getLanguage());
      if (active.signal.aborted || !dialog.open) return;
      results.replaceChildren(...cities.map(city => {
        const row = document.createElement('li');
        row.append(cityButton(city));
        return row;
      }));
      showSearch(() => cities.length ? t('matchCount', { count: formatNumber(cities.length) }) : t('noCities'));
    } catch (error) {
      if (active.signal.aborted || !dialog.open) return;
      showSearch(() => errorText(error, 'searchFailed'));
      retry.hidden = false;
    }
  }

  function queueSearch(delay: number): void {
    cancelSearch();
    results.replaceChildren();
    retry.hidden = true;
    const query = input.value.trim();
    showSearch(() => t(query.length < 2 ? 'searchMin' : 'searching'));
    if (query.length >= 2) timer = window.setTimeout(() => void search(query), delay);
  }
  input.addEventListener('input', () => queueSearch(300));
  retry.addEventListener('click', () => { input.focus(); queueSearch(0); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.isComposing) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = [...results.querySelectorAll('button')];
    if (!buttons.length) return;
    const target = document.activeElement;
    if (target === input && event.key === 'ArrowDown') {
      event.preventDefault();
      buttons[0]?.focus();
    } else if (target instanceof HTMLButtonElement && buttons.includes(target)) {
      event.preventDefault();
      const index = buttons.indexOf(target) + (event.key === 'ArrowDown' ? 1 : -1);
      (index < 0 ? input : buttons[Math.min(index, buttons.length - 1)])?.focus();
    }
  });

  locate.addEventListener('click', async () => {
    const attempt = ++geoAttempt;
    locate.disabled = true;
    showGeo(() => t('locating'));
    try {
      const city = await deviceLocation();
      if (attempt === geoAttempt && dialog.open) {
        close();
        void state.chooseDevice(city);
      }
    } catch (error) {
      if (attempt === geoAttempt && dialog.open) showGeo(() => errorText(error, 'geoUnavailable'));
    } finally {
      if (attempt === geoAttempt) locate.disabled = false;
    }
  });

  dialog.querySelector('#use-default')!.addEventListener('click', () => choose(defaultLocation, false));
  dialog.querySelector('#close-locations')!.addEventListener('click', close);
  dialog.addEventListener('cancel', () => {
    cancelSearch();
    geoAttempt++;
    locate.disabled = false;
  });
  document.querySelector('#open-locations')!.addEventListener('click', () => {
    renderSaved();
    showGeo(() => '');
    dialog.showModal();
    input.focus();
    queueSearch(0);
  });

  function localize(): void {
    searchStatus.textContent = searchMessage();
    geoStatus.textContent = geoMessage();
    storageStatus.textContent = !state.storageAvailable ? t('storageUnavailable') :
      savedList.childElementCount ? '' : t('saveCityHint');
    dialog.querySelector('#use-default')!.textContent = `${t('defaultCity')} · ${cityName(defaultLocation)}`;
    for (const button of savedList.querySelectorAll<HTMLButtonElement>('[data-remove-city]')) {
      button.textContent = t('remove');
      button.setAttribute('aria-label', t('removeCity', { city: button.dataset.removeCity ?? '' }));
    }
  }
  return localize;
}
