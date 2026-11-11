import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const directory = resolve(process.argv[2] ?? 'dist');
const read = name => readFileSync(resolve(directory, name));
const html = read('index.html').toString();
const sw = read('sw.js').toString();
const manifest = JSON.parse(read('manifest.webmanifest'));

assert.equal(manifest.name, 'Weather');
assert.equal(manifest.short_name, 'Weather');
assert.equal(manifest.display, 'standalone');
for (const color of [manifest.theme_color, manifest.background_color]) assert.match(color, /^#[0-9a-f]{6}$/i);

const link = rel => {
  const match = html.match(new RegExp(`<link rel="${rel}"[^>]* href="([^"]+)"`));
  assert.ok(match, `Missing ${rel} link`);
  return match[1];
};
const pagesOnly = link('manifest').startsWith('/weather-app/');
if (process.argv.includes('--pages')) assert.ok(pagesOnly, 'Expected a build with base /weather-app/');
const roots = pagesOnly ? ['https://example.test/weather-app/'] : ['https://example.test/', 'https://example.test/weather-app/'];
for (const root of roots) {
  const manifestURL = new URL(link('manifest'), root);
  assert.equal(manifestURL.href, new URL('manifest.webmanifest', root).href);
  for (const field of ['id', 'scope', 'start_url']) assert.equal(new URL(manifest[field], manifestURL).href, root);
  for (const icon of manifest.icons) assert.equal(new URL(icon.src, manifestURL).href, new URL(icon.src, root).href);
  const apple = new URL(link('apple-touch-icon'), root);
  assert.equal(apple.href, new URL('icons/apple-touch-icon.png', root).href);
  for (const match of html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)) {
    const asset = new URL(match[1], root);
    assert.ok(asset.href.startsWith(new URL('assets/', root).href));
    assert.ok(read(asset.href.slice(root.length)).length);
  }
}

function pngSize(path, size) {
  const bytes = read(path);
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  assert.equal(bytes.readUInt32BE(16), size);
  assert.equal(bytes.readUInt32BE(20), size);
}
for (const [purpose, size] of [['any', 192], ['any', 512], ['maskable', 512]]) {
  const icon = manifest.icons.find(item => item.purpose === purpose && item.sizes === `${size}x${size}`);
  assert.ok(icon, `Missing ${purpose} ${size} icon`);
  assert.equal(icon.type, 'image/png');
  pngSize(icon.src, size);
}
pngSize('icons/apple-touch-icon.png', 180);
assert.match(read('INTER-LICENSE.txt').toString(), /SIL Open Font License/);
assert.match(read('WORKBOX-LICENSE.txt').toString(), /Copyright 2018 Google LLC/);

for (const file of ['index.html', 'manifest.webmanifest', 'icons/apple-touch-icon.png',
  ...manifest.icons.map(icon => icon.src), ...readdirSync(resolve(directory, 'assets')).map(file => `assets/${file}`)]) {
  assert.ok(sw.includes(`url:"${file}"`), `Missing or root-relative precache entry: ${file}`);
}
assert.ok(sw.includes('createHandlerBoundToURL("index.html")'), 'Navigation fallback must resolve from worker scope');
assert.ok(sw.includes('cleanupOutdatedCaches'));
assert.ok(!sw.includes('clientsClaim()'));
assert.ok(!sw.includes('api.open-meteo.com'), 'Weather data belongs in IndexedDB');
console.log('Manifest, icons, licenses, scoped asset paths and Workbox precache validated.');
