import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJSON } from '../src/api.ts';
import { expiryAge, forecastRecord, freshnessDeadline, isFresh, maxForecasts, pruneForecasts, refreshAge, validRecord } from '../src/forecast-cache.ts';
import { normalizeForecast } from '../src/normalize.ts';
import { weatherState } from '../src/state.ts';
import { defaultLocation } from '../src/locations.ts';
import { forecastFixture } from './weather-fixture.mjs';

const raw = forecastFixture();
const now = raw.current.time * 1000;
const forecast = normalizeForecast(raw, raw.current.time);
const record = (updated = now) => forecastRecord(defaultLocation.id, forecast, updated);

test('validates cache schema, age, location, time zone and normalized fields', () => {
  assert.ok(validRecord(record(), defaultLocation.id, now));
  assert.ok(validRecord(record(now - expiryAge + 1), defaultLocation.id, now));
  assert.equal(validRecord(record(now - expiryAge), defaultLocation.id, now), false);
  assert.equal(validRecord(record(now + 1), defaultLocation.id, now), false);
  assert.equal(validRecord(record(), 'different-city', now), false);
  assert.equal(validRecord({ ...record(), version: 999 }, defaultLocation.id, now), false);
  for (const corrupt of [
    { ...forecast, timezone: 'broken' }, { ...forecast, days: [] }, { ...forecast, days: new Array(1) },
    { ...forecast, days: [{ ...forecast.days[0], key: '2026-02-30' }] },
    { ...forecast, days: [{ ...forecast.days[0], wind: 'invalid' }] },
    { ...forecast, days: [{ ...forecast.days[0], hours: new Array(24) }] },
    { ...forecast, days: [{ ...forecast.days[0], condition: { code: 95, scene: 'sunny', icon: 'storm' } }] }
  ]) assert.equal(validRecord({ ...record(), forecast: corrupt }, defaultLocation.id, now), false);
});

test('bounds the cache and removes expired or incompatible entries', () => {
  const rows = Array.from({ length: maxForecasts + 2 }, (_, i) => forecastRecord(`city-${i}`, forecast, now - i));
  rows.push(forecastRecord('expired', forecast, now - expiryAge));
  rows.push({ ...record(), locationId: 'old-schema', version: 0 });
  assert.deepEqual(new Set(pruneForecasts(rows, now)), new Set(['city-12', 'city-13', 'expired', 'old-schema']));
});

function setup(t, savedRecord, online = true) {
  let clock = now;
  t.mock.method(Date, 'now', () => clock);
  let saved = JSON.stringify({ cities: [], selected: null, followDevice: false });
  const globals = { navigator: { onLine: online }, localStorage: { getItem: () => saved, setItem: (_, value) => { saved = value; } } };
  for (const [name, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, name, old) : delete globalThis[name]);
  }
  const writes = [];
  const seen = [];
  let idle;
  const state = weatherState(() => {
    seen.push({ loading: state.loading, snapshot: state.snapshot, error: state.error?.code });
    if (!state.loading && idle) {
      idle();
      idle = undefined;
    }
  }, {
    read: async () => savedRecord,
    write: async value => { writes.push(value); },
    remove: async () => {}
  });
  return { state, writes, seen, navigator: globals.navigator, advance: delta => { clock += delta; },
    waitForIdle: () => new Promise(resolve => { idle = resolve; }) };
}

test('offline launch restores before network, retry stays offline and reconnect updates', async t => {
  const client = setup(t, record(now - refreshAge), false);
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(raw));
  await client.state.update(false);
  assert.equal(client.state.snapshot.restored, true);
  assert.equal(client.state.snapshot.updated, now - refreshAge);
  assert.equal(client.state.error.code, 'offline');
  assert.ok(client.seen.some(frame => frame.snapshot?.restored && frame.loading));
  await client.state.update();
  assert.equal(fetch.mock.callCount(), 0);
  client.navigator.onLine = true;
  const ready = client.waitForIdle();
  client.state.reconnect();
  await ready;
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(client.state.error, null);
  assert.equal(client.state.snapshot.restored, false);
  assert.equal(client.writes.length, 1);
});

test('freshness ends at the city’s midnight even when the forecast is less than 15 minutes old', () => {
  for (const [timezone, midnight] of [
    ['Europe/Prague', '2026-10-25T23:00:00Z'],
    ['America/New_York', '2026-11-02T05:00:00Z'],
    ['Asia/Tokyo', '2026-11-10T15:00:00Z']
  ]) {
    const boundary = Date.parse(midnight);
    const snapshot = forecastRecord(defaultLocation.id, { ...forecast, timezone }, boundary - 5 * 60_000);
    assert.equal(freshnessDeadline(snapshot), boundary);
    assert.equal(isFresh(snapshot, boundary - 1), true);
    assert.equal(isFresh(snapshot, boundary), false);
    assert.equal(isFresh(snapshot, snapshot.updated - 1), false);
  }
});

test('request timeout and caller cancellation stay distinct', async t => {
  const url = new URL('https://example.test/forecast');
  t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  await assert.rejects(requestJSON(url, new AbortController().signal, { timeout: 0 }), { code: 'apiTimeout' });
  const controller = new AbortController();
  const pending = requestJSON(url, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('changing cities cancels the previous request and discards its late result', async t => {
  const client = setup(t, null);
  let resolveOld;
  let oldSignal;
  let started;
  const firstStarted = new Promise(resolve => { started = resolve; });
  t.mock.method(globalThis, 'fetch', (url, options) => {
    if (url.searchParams.get('latitude') !== String(defaultLocation.latitude)) return Promise.resolve(Response.json(raw));
    oldSignal = options.signal;
    started();
    return new Promise(resolve => { resolveOld = resolve; });
  });
  const old = client.state.update(false);
  await firstStarted;
  const ready = client.waitForIdle();
  client.state.choose({ id: 'tokyo', name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 }, true);
  await ready;
  assert.equal(oldSignal.aborted, true);
  resolveOld(Response.json(raw));
  await old;
  assert.equal(client.state.snapshot.locationId, 'tokyo');
  assert.deepEqual(client.writes.map(entry => entry.locationId), ['tokyo']);
});

test('saved-city edits in two tabs preserve both lists and do not switch the other tab’s forecast', async t => {
  const client = setup(t, null, false);
  const other = weatherState(() => {}, { read: async () => null, remove: async () => {}, write: async () => {} });
  client.state.choose({ id: 'prague', name: 'Prague', latitude: 50, longitude: 14 }, true);
  other.choose({ id: 'tokyo', name: 'Tokyo', latitude: 35, longitude: 139 }, true);
  await Promise.resolve();
  assert.deepEqual(client.state.saved.cities.map(city => city.id), ['prague', 'tokyo']);
  assert.equal(client.state.location.id, 'prague');
  assert.equal(other.location.id, 'tokyo');
  client.state.remove('tokyo');
  assert.deepEqual(other.saved.cities.map(city => city.id), ['prague']);
});

test('an uncached offline launch is usable and reports the missing forecast', async t => {
  const client = setup(t, null, false);
  const fetch = t.mock.method(globalThis, 'fetch');
  await client.state.update(false);
  assert.equal(client.state.snapshot, undefined);
  assert.equal(client.state.error.code, 'offline');
  assert.equal(client.state.loading, false);
  assert.equal(fetch.mock.callCount(), 0);
});

test('refresh policy skips fresh readings, coalesces simultaneous work and writes only success', async t => {
  const client = setup(t, record());
  let completeFetch;
  let signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const fetch = t.mock.method(globalThis, 'fetch', () => {
    signalStarted();
    return new Promise(resolve => { completeFetch = resolve; });
  });
  await client.state.update(false);
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(isFresh(client.state.snapshot), true);
  client.advance(refreshAge);
  assert.equal(isFresh(client.state.snapshot), false);
  const first = client.state.update(false);
  await started;
  await client.state.update();
  assert.equal(fetch.mock.callCount(), 1);
  completeFetch(new Response('{}', { status: 503 }));
  await first;
  assert.equal(client.state.snapshot.updated, now);
  assert.equal(client.writes.length, 0);
  assert.equal(client.state.error.code, 'apiStatus');
});

test('automatic and foreground refresh share a 15-minute deadline and back off after failure', async t => {
  const client = setup(t, record());
  let attempts = 0;
  const fetch = t.mock.method(globalThis, 'fetch', async () => ++attempts === 1
    ? new Response('{}', { status: 503 })
    : Response.json(raw));
  await client.state.update(false);
  assert.equal(client.state.nextRefreshAt, now + refreshAge);
  client.advance(refreshAge - 1);
  await client.state.refreshIfDue(true);
  assert.equal(fetch.mock.callCount(), 0);

  client.advance(1);
  await Promise.all([client.state.refreshIfDue(), client.state.refreshIfDue(true)]);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(client.state.snapshot.updated, now);
  assert.equal(client.writes.length, 0);
  assert.equal(client.state.nextRefreshAt, now + 2 * refreshAge);
  await client.state.refreshIfDue(true);
  assert.equal(fetch.mock.callCount(), 1);

  client.advance(refreshAge);
  client.navigator.onLine = false;
  await client.state.refreshIfDue();
  assert.equal(fetch.mock.callCount(), 1);
  client.navigator.onLine = true;
  await client.state.refreshIfDue(true);
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(client.state.snapshot.updated, now + 2 * refreshAge);
  assert.equal(client.state.nextRefreshAt, now + 3 * refreshAge);
  assert.equal(client.writes.length, 1);
});

test('a reconnect during an in-flight request retries only after that request fails', async t => {
  const client = setup(t, record(now - refreshAge));
  let fail;
  let started;
  const firstStarted = new Promise(resolve => { started = resolve; });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', () => {
    if (++calls > 1) return Promise.resolve(Response.json(raw));
    started();
    return new Promise(resolve => { fail = resolve; });
  });
  const update = client.state.update(false);
  await firstStarted;
  client.state.reconnect();
  assert.equal(calls, 1);
  fail(new Response('{}', { status: 503 }));
  await update;
  if (client.state.loading) await client.waitForIdle();
  assert.equal(calls, 2);
  assert.equal(client.state.error, null);
  assert.equal(client.writes.length, 1);
});
