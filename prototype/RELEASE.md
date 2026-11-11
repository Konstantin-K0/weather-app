# Weather App 2.0 — Release candidate

Stage 4.1 is scoped to `prototype/` on `weather-v2`. The release build can
be reproduced locally. The current Pages source and the default branch need
to be reviewed before any publishing change.

## Audit findings

| Severity | Finding | Disposition |
| --- | --- | --- |
| Critical | Vite 7.3.1 was affected by a critical issue when the development server was exposed to the network, including the phone-preview setup. | Updated to the patched 7.3.8 release. [Vite advisory](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7) |
| High | A tab left open could indefinitely display an old forecast as current. A timestamp from many hours earlier could also pass the same-day observation check. | Labels now expire after 15 minutes or at midnight in the forecast city, whichever comes first. Expired records disappear after seven days. Current samples at least an hour old fall back to the covering hourly sample if present. |
| Medium | Tabs held independent copies of saved cities. An edit could overwrite a city saved in another tab. | Read the latest list before edits and when opening the picker. Delayed geolocation results cannot persist over a newer manual selection. |
| Medium | The search field consumed the first Escape. Forecast buttons had accessible names that disagreed with the visible text. The settings dialog overflowed at 320 px with larger text, and form boundaries had low contrast. | Escape closes the picker and returns focus. The skip link focuses the forecast. Day buttons derive their names from visible text and expose a localized description. Dialog text wraps and control boundaries use higher-contrast colors. |
| Medium | Open-Meteo uses the request-time UTC offset for every daily aggregation in the response. | Preserve the provider's summaries and document their limits below. |
| Low | Temperatures near zero could display as `-0°`. The footer shifted when the first forecast loaded. | Normalize rounded zero and show the footer once the first forecast or its error state is ready. |
| Low | Distribution lacked the Workbox license text and an explicit link to the weather data license. | Add the Workbox notice alongside the existing Inter notice and link the data license from the attribution. |

The API boundary checks untrusted response shapes before reading fields. Forecast,
search and reverse-geocoding requests share timeout and cancellation handling
with listener cleanup. A late response for a previous city cannot replace the
current forecast. The remaining UI and media-query listeners are attached once
per page and have the page's lifetime. The release bundle excludes the development
preview controls. No app dependencies were added. Saved-city edits read the
latest persisted list. Two writes that overlap exactly still share
`localStorage` without a cross-tab transaction.

## Data and offline behavior

- Hourly readings use epoch seconds and the reported IANA time zone. Both copies
  of a repeated clock hour display their individual offsets. Daily cards use
  the actual local calendar date. Today's chart starts with the covering hour,
  and future dates only include hours on that date. Selected future-day wind,
  direction, humidity and apparent temperature use the available hour nearest
  to noon, with its time shown. UV is the day's maximum. Missing values show an
  em dash and missing chart temperatures leave gaps.
- On a date with a clock change, the provider's fixed-offset bin and the civil
  day can have different lengths. On following dates in the same response,
  the bin can start and end one hour early or late for Prague and New York.
  A boundary hour can affect the reported low, high, maximum UV or daily
  WMO code. A fall-back response can end before the final local hour.
  Sunrise and sunset are formatted from their own timestamps and shown only
  if they fall on the corresponding city date. Tokyo fixtures cover midnight
  without a DST shift. Rebuilding all daily values would require complete
  boundary coverage, hourly UV and a verified equivalent of the provider's
  daily weather-severity aggregation. The release uses the provider's
  published daily values. [Open-Meteo forecast documentation](https://open-meteo.com/en/docs)
- Restored forecasts carry the previous-forecast notice and retrieval time.
  Offline and API error states retain valid saved data. Records with invalid
  data, an unknown schema, a future timestamp, or an expired retrieval time
  are rejected. The next successful fetch writes the supported record format.
  IndexedDB may be unavailable or evicted by the browser, in which case the
  app can still show live forecasts and gives an explicit empty state offline.
- City search uses the current UI language. Already saved names retain their
  provider spelling. The browser controls permission prompts and installation
  language. Device coordinates are rounded and sent to Open-Meteo for weather.
  BigDataCloud receives only a newly obtained, consented device location for
  the city label. [BigDataCloud usage policy](https://www.bigdatacloud.com/docs/article/fair-use-policy-for-free-client-side-reverse-geocoding-api)
- Weather data are credited to Open-Meteo under CC BY 4.0. Weather converts units,
  rounds displayed temperatures, translates labels and aligns time series to
  local dates. The free API has non-commercial use and rate limits. [Data license](https://open-meteo.com/en/licence)
  [API terms](https://open-meteo.com/en/terms)

## Verification

| Check | Result |
| --- | --- |
| TypeScript | Strict check passed, including unused declarations and unchecked indexed access. |
| Deterministic tests | 32 passed. Cover WMO families, required and missing fields, selected-day mapping, cache age and schema, city-switch cancellation, saved cities, four locales, and Prague, New York and Tokyo calendar boundaries. DST fixtures include 23- and 25-hour days, partial ranges, and a half-hour zone case. |
| Live weather | Prague, New York and Tokyo responses passed field-by-field comparison for current conditions, daily aggregates, sunrise and sunset, hourly temperatures and precipitation, and selected-day readings. DST transitions used deterministic fixtures. |
| Layout and accessibility | Headless Chrome at 320, 375, 390, 768, 1024 and 1440 px. 48 width, theme and language combinations passed. The browser checks covered stable daily switching, hourly keyboard scrolling, reduced motion, dialog focus and Escape, live system theme changes, and 200% root text at 320 px. Automated accessibility checks supplement manual verification. |
| PWA lifecycle | Chrome's installability check passed. Headless Chrome installed a fresh worker at `/weather-app/` and exercised offline navigation, IndexedDB restoration, aging in place, reconnect, corrupted record recovery and a worker update with three controlled tabs. The update waited for the last tab, pruned old assets and opened the new build offline. Simulated touch verified pull-to-refresh and horizontal scrolling. Native Home Screen installation remains a physical-device check. |
| Build and manifest | A clean lockfile install passed the relative and Pages builds, manifest links, icon dimensions, licenses, and Workbox precache checks. The generated Pages worker matched the workspace build. |
| Dependencies | `npm audit --omit=dev` reported zero. Full audit reported seven entries, four moderate and three low, in build tooling and its dependency tree. These include Workbox transitive dependencies and esbuild's development server on Windows. The Vite patch removed the direct high-severity audit entry. |
| Lighthouse 13.6.0 | Mobile emulation on a cold Pages preview. Performance 99, accessibility 100, best practices 100, SEO 100. LCP 2.2 s, CLS 0, TBT 0 ms. One lab run; automated scores do not establish WCAG conformance. |

The Pages build contains 71.75 kB of JS (24.70 kB gzip) and 20.10 kB of CSS
(5.55 kB gzip). Workbox precaches 14 entries totaling 326.71 KiB. Inter
uses four self-hosted Latin and Cyrillic subsets with `font-display: swap`.
The cold English run loaded only Latin for rendering and made one forecast
request. Animation remains CSS-based with reduced-motion, hidden-tab and
manual-pause handling.

## Stage 4.2 deployment runbook

### Current production and rollback baseline

The public `github-pages` deployment succeeded on March 6, 2026 from `main`
at `65cd849fa296759fcf41cccad897d55f318a863f`. Its GitHub-managed build, the
remote branch and the live HTML, manifest and sampled assets agree with the
legacy files at the repository root. The Pages settings API returned 404
without repository privileges. The owner should record the exact source,
folder, domain and HTTPS options from **Settings → Pages** before changing
them. Public evidence points to branch publishing from `main` at `/`.
[Successful Pages run](https://github.com/Konstantin-K0/weather-app/actions/runs/22761598761)
[Deployment status](https://api.github.com/repos/Konstantin-K0/weather-app/deployments/3997434334/statuses)

The live legacy site links `manifest.json`. The tracked legacy source has no
worker registration, and the live `sw.js` and `service-worker.js` endpoints
returned 404. The v2 artifact uses manifest ID, start URL and scope
`/weather-app/`, with worker URL `/weather-app/sw.js` and the same scope.
[Live legacy site](https://konstantin-k0.github.io/weather-app/)

### Local preparation checks

- A clean copy of the Git-visible prototype files passed lockfile install,
  32 tests, TypeScript, the Pages build and the manifest and precache validator.
- `actionlint` passed. The rollback archive matched the live legacy HTML,
  manifest, scripts, stylesheet and sampled icons byte for byte. The staged
  artifact contained the static files and the retirement worker.
- Local Chromium verified offline v2 launch, rollback with two tabs open,
  removal of the v2 cache and registration, preservation of unrelated
  Cache Storage and IndexedDB data, legacy navigation and v2 reinstallation.
  GitHub-hosted execution and physical-device installation remain release checks.

### Before cutover

1. Confirm `weather-v2` points to the reviewed release candidate. From the
   repository root, inspect the working tree and the candidate commit.
   Local design screenshots are ignored by Git.

   ```sh
   git status --short --branch
   git show --stat --oneline weather-v2
   ```

2. Verify the annotated tag `weather-legacy-prod-2026-03-06` and back up the
   legacy source and Pages artifact. The workflow intentionally pins rollback
   to that production commit. If production changes before cutover, verify
   and tag the new baseline separately, update the workflow pin and rerun
   the rollback checks.

   ```sh
   legacy=65cd849fa296759fcf41cccad897d55f318a863f
   test "$(git cat-file -t refs/tags/weather-legacy-prod-2026-03-06)" = tag
   test "$(git rev-parse 'refs/tags/weather-legacy-prod-2026-03-06^{commit}')" = "$legacy"
   backup=$(mktemp -d /tmp/weather-pages-backup.XXXXXX)
   git archive --format=tar --output="$backup/legacy-source.tar" "$legacy"
   bash .github/pages/stage-legacy.sh . "$legacy" "$backup/legacy-pages"
   tar -czf "$backup/legacy-pages.tar.gz" -C "$backup/legacy-pages" .
   shasum -a 256 "$backup/legacy-source.tar" "$backup/legacy-pages.tar.gz"
   ```

   Save both archives and their checksums in the release owner's backup
   location. The rollback artifact adds the retirement worker to the static
   legacy files. The legacy source archive preserves the original tree.

3. Verify native install, standalone and offline launch, location permissions
   and VoiceOver or TalkBack on physical iPhone and Android devices using a
   secure preview. The workflow uses Node 24.21.0. To rebuild the release
   artifact and check it locally, run the following from the repository root.

   ```sh
   cd prototype
   npm ci
   npm test
   npm run build:pages
   npm run validate:pwa -- dist --pages
   npm run preview -- --base=/weather-app/
   ```

### Activation after explicit approval

1. Push the reviewed `weather-v2` branch and the verified baseline tag only
   after approval. Keep the default branch serving the legacy site until the
   scheduled cutover. Confirm the current Pages settings, the saved rollback
   artifact and who can restore the site.

   ```sh
   git push origin weather-v2
   git push origin refs/tags/weather-legacy-prod-2026-03-06
   ```

2. At cutover, select **Settings → Pages → Build and deployment → Source →
   GitHub Actions**. Do this before merging the prototype into the default
   branch so a branch-based Pages build cannot publish the prototype source
   tree. A brief interruption during the source change is possible. Merge
   the reviewed candidate into the default branch so GitHub can expose
   the manual workflow. Keep `github-pages` restricted to the default
   branch and use environment approval if available.
   [Pages source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-site)
   [Manual workflow trigger](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)
3. In **Actions → Weather App Pages → Run workflow**, choose the default
   branch, `target=v2` and leave `publish` unchecked. Confirm **build**
   succeeds and **deploy** is skipped. Download `github-pages` and check
   that its archive root contains `index.html`, `manifest.webmanifest`,
   `sw.js`, the Workbox bundle, icons and hashed assets. Save the validated
   artifact and its commit SHA before dispatching again. Repeat with
   `target=legacy` and `publish` unchecked to verify the hosted runner can
   package the rollback.
4. At the same reviewed default-branch revision, dispatch `target=v2`
   with `publish` checked. Review any environment approval. The build and
   deploy jobs use separate permissions and the Pages job is serialized.
   Confirm the live HTTPS URL serves the new manifest, worker, JS and CSS.
   Reload in a clean browser profile, verify the installed worker's
   `/weather-app/` scope, then test offline navigation and reconnect.
   [Custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

### Rollback

1. Stop further publish dispatches. Cancel any queued publish for the bad
   revision, and wait for any active Pages deployment to settle. In
   **Actions → Weather App Pages → Run workflow** on the default branch,
   dispatch `target=legacy` with `publish` unchecked to review the rollback
   artifact, or use the one already verified for this baseline.
2. Dispatch `target=legacy` with `publish` checked and approve the
   `github-pages` job as needed. The workflow reads the pinned production
   commit and adds a retirement worker at the original v2 URL. It does not
   require a branch reset or a Pages settings change.
3. Verify the live root and `manifest.json` again match the legacy
   baseline, and `/weather-app/sw.js` serves the retirement worker with a
   JavaScript content type. In an existing v2 browser profile, reconnect,
   reload, and allow the browser to update its worker. The replacement
   activates with old tabs open, removes only the Workbox shell cache for
   that scope, and unregisters itself. Reload to reach the legacy site.
   Leave the retirement endpoint available for returning clients. Devices
   that stay offline keep their cached shell until they reconnect.
4. If Actions deployment is unavailable, publish the saved rollback
   artifact from a dedicated branch such as `rollback/weather-legacy`.
   Put the artifact files at that branch's root and keep `sw.js` alongside
   `index.html`. After rollback approval, use **Settings → Pages → Source →
   Deploy from a branch**, select the rollback branch and **/ (root)**, then
   save. Preserve the previous domain and HTTPS settings. Keep IndexedDB
   and other app caches intact.
5. To release v2 again, validate the approved candidate and run
   `target=v2` through the activation procedure. The same worker URL
   can register again. Close any tabs still controlled by the retirement
   worker before checking reinstallation in the same browser profile.
   For a later v2-to-v2 rollback, use a verified prior v2 artifact from
   the approved default branch with the original base path and worker scope.
