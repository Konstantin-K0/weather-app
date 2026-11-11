import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { detectLanguage, dictionaries, getLanguage, languageKey, setLanguage, t } from '../src/i18n/index.ts';
import { conditionText, dayLabel, degrees, errorText, formatDate, formatOffset, formatTime } from '../src/i18n/format.ts';
import { weatherCondition } from '../src/conditions.ts';
import { normalizeForecast } from '../src/normalize.ts';
import { AppError } from '../src/errors.ts';
import { forecastFixture, seconds } from './weather-fixture.mjs';

const memory = () => {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
};

test('detects regional browser languages in order and falls back to English', () => {
  assert.equal(detectLanguage(['fr-FR', 'uk-UA', 'cs-CZ'], memory()), 'uk');
  assert.equal(detectLanguage(['CS-CZ', 'ru-RU', 'en-US'], memory()), 'cs');
  assert.equal(detectLanguage(['ru-RU'], memory()), 'ru');
  assert.equal(detectLanguage(['de-DE', 'ja-JP'], memory()), 'en');
  assert.equal(detectLanguage([], memory()), 'en');
});

test('a saved preference wins, and invalid or inaccessible preferences defer to detection', () => {
  const storage = memory();
  setLanguage('ru', storage);
  assert.equal(getLanguage(), 'ru');
  assert.equal(detectLanguage(['uk-UA'], storage), 'ru');
  storage.setItem(languageKey, 'unsupported');
  assert.equal(detectLanguage(['uk-UA'], storage), 'uk');
  assert.equal(detectLanguage(['cs-CZ'], { getItem() { throw new Error(); } }), 'cs');
});

test('all dictionaries and static templates have complete keys and matching parameters', () => {
  const english = dictionaries.en;
  const parameters = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [language, dictionary] of Object.entries(dictionaries)) {
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(english).sort(), language);
    for (const [key, value] of Object.entries(dictionary)) {
      assert.ok(value.trim(), `${language}:${key}`);
      assert.deepEqual(parameters(value), parameters(english[key]), `${language}:${key}`);
    }
  }
  const src = new URL('../src/', import.meta.url);
  for (const file of readdirSync(src).filter(name => name.endsWith('.ts'))) {
    const code = readFileSync(new URL(file, src), 'utf8');
    for (const [, key] of code.matchAll(/\bdata-t(?:-label|-placeholder)?="(\w+)"/g)) {
      assert.ok(Object.hasOwn(english, key), `${file}:${key}`);
      assert.deepEqual(parameters(english[key]), [], `${file}:${key} requires parameters`);
    }
  }
});

test('localizes all WMO codes, clear night variants, unknown conditions and errors', () => {
  const expectedNight = { en: 'Clear night', uk: 'Ясна ніч', cs: 'Jasná noc', ru: 'Ясная ночь' };
  for (const language of Object.keys(dictionaries)) {
    setLanguage(language, memory());
    for (const key of Object.keys(dictionaries.en).filter(key => /^wmo\d+$/.test(key))) {
      const condition = weatherCondition(Number(key.slice(3)), true);
      assert.notEqual(condition.code, null);
      assert.equal(conditionText(condition), dictionaries[language][key]);
    }
    assert.equal(conditionText(weatherCondition(0, false)), expectedNight[language]);
    assert.equal(conditionText(weatherCondition(1, false)), dictionaries[language].mostlyClearNight);
    assert.equal(conditionText(weatherCondition(200, true)), dictionaries[language].unknownWeather);
    assert.equal(errorText(new AppError('apiStatus', 503), 'forecastFailed'), t('apiStatus', { status: 503 }));
    assert.equal(errorText(new AppError('geoDenied'), 'geoUnavailable'), t('geoDenied'));
  }
});

test('localizes dates, day labels and time zones without altering forecast data or units', () => {
  const raw = forecastFixture({ timezone: 'Asia/Tokyo', offset: 32400, start: '2026-11-09T15:00:00Z',
    now: '2026-11-09T15:15:00Z' });
  const forecast = normalizeForecast(raw, raw.current.time);
  const initial = structuredClone(forecast);
  const expected = {
    en: ['Today', 'Tomorrow', 'November 10, 2026'],
    uk: ['Сьогодні', 'Завтра', '10 листопада 2026 р.'],
    cs: ['Dnes', 'Zítra', '10. listopadu 2026'],
    ru: ['Сегодня', 'Завтра', '10 ноября 2026 г.']
  };
  for (const [language, labels] of Object.entries(expected)) {
    setLanguage(language, memory());
    assert.deepEqual([dayLabel(forecast.days[0]), dayLabel(forecast.days[1]), formatDate(forecast.days[0].key)], labels);
    const timestamp = seconds('2026-11-09T15:00:00Z');
    assert.equal(formatTime(timestamp, forecast.timezone), new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : language, {
      timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit'
    }).format(timestamp * 1000));
    assert.notEqual(formatTime(timestamp, forecast.timezone), formatTime(timestamp, 'UTC'));
    assert.match(formatOffset(timestamp, forecast.timezone), /\+9/);
    assert.equal(degrees(10, 'C'), '10°');
    assert.equal(degrees(10, 'F'), '50°');
    assert.deepEqual(forecast, initial);
  }
});
