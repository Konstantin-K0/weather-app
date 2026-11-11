import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLocations, locationLabel, removeSaved, saveLocations, selectSaved } from '../src/locations.ts';

const paris = { id: '1', name: 'Paris', region: 'Île-de-France', country: 'France', latitude: 48.85, longitude: 2.35 };
const texas = { id: '2', name: 'Paris', region: 'Texas', country: 'United States', latitude: 33.66, longitude: -95.55 };

test('saves, restores, switches and removes same-name cities by stable ID', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const initial = loadLocations(storage);
  const saved = selectSaved(selectSaved(selectSaved(initial, paris), texas), paris);
  assert.equal(saveLocations(saved, storage), true);
  assert.equal(loadLocations(storage).selected, paris.id);
  assert.equal(loadLocations(storage).cities.length, 2);
  assert.notEqual(locationLabel(paris), locationLabel(texas));
  const removed = removeSaved(saved, paris.id);
  assert.equal(removed.selected, texas.id);
  assert.equal(removeSaved(removed, texas.id).selected, null);
});

test('invalid stored data and unavailable storage are recoverable', () => {
  const damaged = { getItem: () => '{"cities":[null,{"id":"2","latitude":999}],"selected":"2"}' };
  assert.deepEqual(loadLocations(damaged), { cities: [], selected: null });
  const disabled = { getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } };
  assert.deepEqual(loadLocations(disabled), { cities: [], selected: null });
  assert.equal(saveLocations({ cities: [], selected: null }, disabled), false);
});

test('restores the last device location without losing it when a saved city is removed', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const lastDevice = { id: 'device:50.08,14.42', name: 'Prague', latitude: 50.08, longitude: 14.42 };
  const saved = { cities: [paris], selected: paris.id, followDevice: true, lastDevice };
  saveLocations(removeSaved(saved, paris.id), storage);
  assert.deepEqual(loadLocations(storage), { cities: [], selected: null, followDevice: true, lastDevice });
});
