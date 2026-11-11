# Weather App 2.0

A local Vite and TypeScript weather app on `weather-v2`. The installable prototype uses live
Open-Meteo forecasts, city search and offline forecast storage, with Prague marked as the default until a city
or device location is chosen.

See [the Stage 4.1 audit and release checklist](./RELEASE.md) for the Pages build,
verification results and Stage 4.2 instructions.

## Run locally

Requires Node 22.18 or later.

```sh
cd /Users/konstantin/Desktop/WEATHER-APP/prototype
npm ci
npm run dev
```

Open the URL printed by Vite. Select the city name in the header to search, switch, or remove saved
cities. Search results support touch, Tab, Up/Down, and Enter. **Settings** controls
language, theme, °C/°F, and ambient animation. Pull down from the top of the page on a touch screen to refresh. On desktop or with a keyboard, use **Settings → Update forecast**. **Dev preview** overrides the Hero atmosphere
and previews appearance and reduced motion in dev mode. The forecast stays live.

For a phone on the same Wi-Fi, run `npm run dev -- --host 0.0.0.0` and open the
**Network** address. City search works there. Device geolocation requires HTTPS or
localhost. On the first visit, the browser asks whether to share your location.
Subsequent visits and refreshes use it automatically while permission is granted.
If permission expires, use the city button and choose **Use device location**. If a new position is unavailable, the app uses the last
known location, then a saved city or the default Prague forecast. Choosing a city
turns off automatic location and clears the remembered device position.
Device coordinates are rounded to two decimals and stored on the device for this
fallback. Open-Meteo receives them for weather, and [BigDataCloud](https://www.bigdatacloud.com/geocoding-apis/free-reverse-geocode-to-city-api)
receives fresh positions to resolve the city name.

`npm test` uses deterministic fixtures and does not call Open-Meteo.
For the browser regression test, open `/tests/day-switch-qa.html` on the Vite
development server. It checks horizontal keyboard scrolling, day selection,
card geometry, and language switching with mocked forecasts.
`npm run build` type-checks and builds into `dist/`. `npm run preview` serves that
build locally. `npm run build:pages` produces the explicit `/weather-app/` build.

## Install and test offline

```sh
npm run build
npm run validate:pwa
npm run preview
```

Open the preview on localhost and wait for the forecast and the service worker to
finish loading. Open **Settings → Install weather.** for the browser's install
prompt when available and instructions for adding the app to an iPhone or iPad
home screen. Phone installation requires a secure origin such as HTTPS.

Use the browser's offline mode and reload after the first successful online visit.
The app should display the saved forecast and its update time. Select another day,
open Settings, and use Retry while offline. Re-enable the network to refresh an
outdated forecast. If a city has no saved forecast, the app shows a localized
offline message and keeps saved cities and Settings accessible.

### Offline storage and updates

- Vite PWA generates a Workbox service worker for production builds. It precaches
  the HTML shell, hashed JavaScript and CSS, Inter subsets, manifest and icons.
  The worker URL resolves relative to Vite's base. The manifest's relative ID,
  scope and start URL work at the origin root and under `/weather-app/`.
- A waiting worker activates after tabs controlled by the previous worker close.
  Workbox cleans old precache entries at activation. The page never needs an
  automatic reload to apply an update.
- IndexedDB stores normalized forecasts, the city ID, fetch time, IANA time zone,
  and schema version. A successful read displays the saved data before fetching.
  The cache retains up to 12 entries for seven days. Invalid entries are ignored
  and pruned on write. A failed refresh preserves the last valid forecast.
- The app checks freshness on open, foreground resume, reconnect and manual
  refresh. An open tab labels the forecast as previous after 15 minutes or the
  city's local midnight, whichever comes first. The label updates without a
  network request. Manual refresh can run sooner.
- The geometric sun and cloud SVGs live in `public/icons/`. The manifest lists
  192px and 512px PNGs and a separate full-bleed 512px maskable PNG. Safari has a
  180px Apple touch icon. The manifest uses standalone display mode.

### Stage 3 verification

- TypeScript, the production build, 26 unit tests and the manifest and precache
  validator passed.
- A local production copy served at `/weather-app/` launched with the server
  stopped. Simulated browser connectivity exercised the saved forecast, retry,
  switching days and languages, the uncached city state, and recovery with a
  newer IndexedDB record. Mobile and desktop checks used 390px and 1440px.
- A second worker and asset revision waited while the first version remained
  open. After the last controlled tab closed, the new shell opened, the old
  JavaScript was removed from the precache, and IndexedDB data remained.
- The browser can evict offline storage. The installation UI depends on the
  browser. Native installation and launching from a phone home screen still
  need a physical device check.

## API requests

| Endpoint | Fields and parameters |
| --- | --- |
| [Forecast](https://open-meteo.com/en/docs) · `https://api.open-meteo.com/v1/forecast` | Coordinates, `timezone=auto`, `timeformat=unixtime`, `forecast_days=7` |
| Current | `temperature_2m`, `apparent_temperature`, `relative_humidity_2m`, `weather_code`, `is_day`, `wind_speed_10m`, `wind_direction_10m` |
| Hourly | Same current fields plus `precipitation_probability`. The additional fields supply the selected day's readings around local noon. |
| Daily | `temperature_2m_min`, `temperature_2m_max`, `weather_code`, `sunrise`, `sunset`, `uv_index_max` |
| [Geocoding](https://open-meteo.com/en/docs/geocoding-api) · `https://geocoding-api.open-meteo.com/v1/search` | `name`, `count=8`, `language` set to the current interface language. Results use ID, name, region, country, and coordinates. |

Forecasts use the city's reported IANA time zone for hours and sun events. The
API's fixed offset identifies the date associated with each daily aggregate. Today's
hourly chart starts at the current city hour and can continue into tomorrow. Other
dates show the hours that actually fall on that local day. Repeated hours show their
UTC offsets. Today's weather uses current measurements. Future dates show the daily
condition and the available hourly reading closest to local noon. The details
heading shows the actual time used. UV remains the daily maximum. The hourly
timeline scrolls horizontally. Focus the timeline and use the arrow keys, Home,
or End to scroll it from the keyboard.

## Localization

Open **Settings → Language** and select **Українська**, **English**, **Čeština**,
or **Русский**. A valid saved preference takes precedence. Otherwise the first
supported entry in the browser's ordered language list is used, including regional
variants such as `uk-UA` and `cs-CZ`. English is the fallback.

The four dictionaries share TypeScript keys and parameter names. Native `Intl`
formats dates, times, numbers and units. Forecast models keep timestamps, local
date keys and WMO codes. The display uses the selected city's time zone. Language
changes update the existing controls and preserve weather data, location, day,
scroll position, theme and units.

City search asks Open-Meteo for names in the current language. Already saved city
names and resolved device city names retain the provider's spelling. Browser
permission prompts follow the browser or operating system language.

### Stage 2.2 files

- Added `src/i18n/index.ts`, `types.ts`, `format.ts`, and the four dictionaries in
  `src/i18n/locales/`. Added `src/errors.ts` and `tests/i18n.test.mjs`.
- Updated `src/main.ts`, `hero.ts`, `chart.ts`, `forecast-ui.ts`, `location-ui.ts`,
  `preview.ts`, `pull-refresh.ts`, `style.css`, and `tokens.css`.
- Updated `src/api.ts`, `conditions.ts`, `data.ts`, `geolocation.ts`,
  `normalize.ts`, `search.ts`, and `state.ts`.
- Updated `index.html`, `tests/weather.test.mjs`, `tests/day-switch-qa.html`,
  and this README.

## Earlier stage files

- Added `src/api.ts`, `src/api-types.ts`, `src/normalize.ts`, and `src/conditions.ts`
  for requests, decoding, calendar handling, and WMO conditions.
- Added `src/search.ts`, `src/geolocation.ts`, `src/locations.ts`,
  `src/location-ui.ts`, `src/state.ts`, and `src/forecast-ui.ts` for location flows,
  cached forecast state, and rendering.
- Updated `src/main.ts`, `src/data.ts`, `src/chart.ts`, `src/hero.ts`,
  `src/hero.css`, `src/icons.ts`, `src/style.css`, `index.html`, `tsconfig.json`,
  `tests/foundation.test.mjs`, and this README.
- Added `vite.config.ts` and deterministic tests in `tests/weather.test.mjs`,
  `tests/weather-fixture.mjs`, and `tests/locations.test.mjs`.
- Local `screenshots/` and `preview.png` document earlier design stages and
  are ignored by Git.

## Verification and limitations

- 20 unit tests cover language selection, dictionary coverage and formatting, WMO conditions, normalization, city time zones, DST,
  forecast boundaries, malformed or incomplete data, theme preferences, and saved cities.
- Stage 2.2 verified all four locales at 320, 375, 390, 768, 1024 and 1440 px.
  The browser regression test checks that changing languages sends no forecast request.
- Earlier live browser checks covered Prague, Paris and Tokyo, duplicate-name results,
  keyboard and click selection, save/reload, switching and removal, themes, units,
  horizontal scrolling and daily selection, and layouts at 320, 390, 768, and 1440 px.
  Stage 2.1 compared the live forecast fields for Prague, New York, and Tokyo and
  checked daylight-saving transitions and partial days using mocked responses.
- Browser simulations covered denied geolocation, initial and refresh network
  failures, preserving the previous forecast, and retrying search and forecasts.
- Missing values are shown as em dashes and missing chart readings leave gaps.
  Forecast coverage and availability depend on Open-Meteo.
- Daily summaries use Open-Meteo's date-labeled aggregates. Its daily bins use a
  fixed UTC offset from the request, so they can differ from the local hourly
  timeline when the offset changes within a forecast.
- Device geolocation success and physical touchscreen interaction were not tested.
