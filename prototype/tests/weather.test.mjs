import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherCondition } from '../src/conditions.ts';
import { conditionText, degrees, formatOffset } from '../src/i18n/format.ts';
import { normalizeForecast } from '../src/normalize.ts';
import { forecastFixture, seconds } from './weather-fixture.mjs';

test('maps WMO families and derives night atmosphere independently of the icon', () => {
  const families = { sunny: [0, 1], cloudy: [2, 3], fog: [45, 48], rainy: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82],
    snow: [71, 73, 75, 77, 85, 86], storm: [95, 96, 99] };
  for (const [icon, codes] of Object.entries(families)) {
    for (const code of codes) assert.equal(weatherCondition(code, true).icon, icon);
  }
  assert.equal(conditionText(weatherCondition(0, false)), 'Clear night');
  assert.deepEqual(weatherCondition(95, false), {
    code: 95, scene: 'night', icon: 'storm'
  });
  assert.equal(conditionText(weatherCondition(200, true)), 'Conditions unavailable');
});

test('temperatures close to zero are displayed without a minus sign after rounding', () => {
  assert.equal(degrees(-0.2, 'C'), '0°');
  assert.equal(degrees(-18, 'F'), '0°');
  assert.equal(degrees(-1, 'C'), '-1°');
});

test('a same-day reading more than an hour old is replaced by the covering hourly forecast', () => {
  const raw = forecastFixture();
  const now = raw.current.time;
  raw.current.time -= 3600;
  const { days, incomplete } = normalizeForecast(raw, now);
  assert.equal(incomplete, true);
  assert.equal(days[0].temperature, days[0].hours[0].temperature);
  assert.equal(days[0].readingTimestamp, days[0].hours[0].timestamp);
});

test('normalizes real fields and selects the correct city-local hour across midnight', () => {
  // The extra hour completes the final local date after the clock moves back.
  const raw = forecastFixture({ length: 169 });
  const forecast = normalizeForecast(raw, raw.current.time);
  const [today, tomorrow] = forecast.days;
  assert.equal(forecast.days.length, 7);
  assert.equal(forecast.timezone, 'Europe/Prague');
  assert.equal(forecast.incomplete, false);
  assert.deepEqual([today.temperature, today.feelsLike, today.low, today.high], [9.8, 7.1, 2, 14]);
  assert.deepEqual([today.wind, today.direction, today.humidity, today.uv], [14, 245, 86, 2.2]);
  assert.deepEqual([today.sunrise, today.sunset, today.condition.scene], [raw.daily.sunrise[0], raw.daily.sunset[0], 'night']);
  assert.equal(today.dailyCondition.code, 63);
  assert.equal(today.hours.length, 24);
  assert.equal(today.hours[0].localMinute, 23 * 60);
  assert.equal(today.hours[0].precipitation, 15);
  assert.equal(today.hours[0].temperature, 2.3);
  assert.equal(today.hours[1].date, '2026-10-24');
  assert.equal(today.hours[1].localMinute, 0);
  assert.equal(tomorrow.hours[0].date, tomorrow.key);
  assert.equal(tomorrow.temperature, 3.6);
  assert.equal(tomorrow.readingTimestamp, seconds('2026-10-24T10:00:00Z'));
  assert.deepEqual([tomorrow.feelsLike, tomorrow.wind, tomorrow.direction, tomorrow.humidity], [4, 10, 90, 50]);
});

test('the city date wins over UTC and half-hour offsets keep the current local hour', () => {
  const raw = forecastFixture({ timezone: 'Asia/Kolkata', offset: 19800,
    start: '2026-11-09T18:30:00Z', now: '2026-11-09T19:15:00Z' });
  const { days } = normalizeForecast(raw, raw.current.time);
  assert.equal(days[0].key, '2026-11-10');
  assert.equal(days[0].hours[0].localMinute, 0);
  assert.equal(formatOffset(days[0].hours[0].timestamp, 'Asia/Kolkata'), 'GMT+5:30');
});

test('fall-back retains both repeated local hours and uses their individual offsets', () => {
  const raw = forecastFixture();
  const { days, incomplete } = normalizeForecast(raw, raw.current.time);
  const fallBack = days.find(day => day.key === '2026-10-25');
  assert.equal(fallBack.hours.length, 25);
  assert.deepEqual(fallBack.hours.filter(hour => hour.localMinute === 120).map(hour => formatOffset(hour.timestamp, 'Europe/Prague')), ['GMT+2', 'GMT+1']);
  assert.equal(days.at(-1).hours.length, 23);
  assert.equal(incomplete, true);
  const duringRepeat = normalizeForecast(raw, seconds('2026-10-25T01:30:00Z'));
  assert.equal(formatOffset(duringRepeat.days[0].hours[0].timestamp, 'Europe/Prague'), 'GMT+1');
  assert.equal(duringRepeat.days[0].hours[0].localMinute, 120);
});

test('spring-forward has 23 hours and uses the city offset for sunrise', () => {
  const raw = forecastFixture({ start: '2026-03-26T23:00:00Z', offset: 3600, now: '2026-03-27T10:00:00Z' });
  const spring = normalizeForecast(raw, raw.current.time).days.find(day => day.key === '2026-03-29');
  assert.equal(spring.hours.length, 23);
  assert.equal(spring.hours.some(hour => hour.localMinute === 120), false);
  assert.equal(spring.sunrise, seconds('2026-03-29T05:00:00Z'));
});

test('uses sunrise/sunset when is_day is missing, and keeps available data at range boundaries', () => {
  const raw = forecastFixture({ length: 24 });
  raw.current.is_day = null;
  raw.hourly.precipitation_probability = [];
  raw.hourly.temperature_2m[23] = null;
  const result = normalizeForecast(raw, raw.current.time);
  assert.equal(result.incomplete, true);
  assert.equal(result.days[0].condition.scene, 'night');
  assert.equal(result.days[0].hours.length, 1);
  assert.equal(result.days[0].hours[0].temperature, null);
  assert.equal(result.days[0].hours[0].precipitation, null);
  assert.deepEqual(result.days.at(-1).hours, []);
  const beyond = normalizeForecast(raw, seconds('2026-10-24T12:00:00Z'));
  assert.deepEqual(beyond.days[0].hours, []);
});

test('rejects malformed or unusable forecasts without throwing an Intl formatting error', () => {
  for (const raw of [null, {}, { timezone: 'Wrong/Zone', utc_offset_seconds: 0 },
    { ...forecastFixture(), daily: { time: [NaN, '2026-10-25'] } }]) {
    assert.throws(() => normalizeForecast(raw), /forecastInvalid/);
  }
});

test('Tokyo starts a new local date before UTC midnight and ignores yesterday’s current reading', () => {
  const raw = forecastFixture({ start: '2026-11-09T15:00:00Z', timezone: 'Asia/Tokyo', offset: 32400,
    now: '2026-11-10T14:45:00Z' });
  const { days } = normalizeForecast(raw, seconds('2026-11-10T15:05:00Z'));
  assert.equal(days[0].key, '2026-11-11');
  assert.equal(days[0].relativeDay, 0);
  assert.equal(days[0].hours[0].localMinute, 0);
  assert.equal(formatOffset(days[0].hours[0].timestamp, 'Asia/Tokyo'), 'GMT+9');
  assert.deepEqual([days[0].temperature, days[0].feelsLike, days[0].wind, days[0].humidity], [2.4, 4, 10, 50]);
  assert.equal(days[1].hours.length, 24);
});

test('New York spring and autumn transitions retain the right local hour and day', () => {
  const spring = forecastFixture({ start: '2026-03-07T05:00:00Z', timezone: 'America/New_York', offset: -18000,
    now: '2026-03-07T17:00:00Z' });
  const springDay = normalizeForecast(spring, spring.current.time).days[1];
  assert.equal(springDay.key, '2026-03-08');
  assert.equal(springDay.hours.length, 23);
  assert.deepEqual(springDay.hours.slice(0, 3).map(hour => hour.localMinute), [0, 60, 180]);
  assert.equal(springDay.readingTimestamp, seconds('2026-03-08T16:00:00Z'));

  const fall = forecastFixture({ start: '2026-10-31T04:00:00Z', timezone: 'America/New_York', offset: -14400,
    now: '2026-10-31T16:00:00Z' });
  const fallDay = normalizeForecast(fall, fall.current.time).days[1];
  assert.equal(fallDay.key, '2026-11-01');
  assert.equal(fallDay.hours.length, 25);
  assert.deepEqual(fallDay.hours.filter(hour => hour.localMinute === 60).map(hour => formatOffset(hour.timestamp, 'America/New_York')), ['GMT-4', 'GMT-5']);
  assert.equal(normalizeForecast(fall, seconds('2026-11-01T06:30:00Z')).days[0].hours[0].timestamp, seconds('2026-11-01T06:00:00Z'));
});

test('partial future days use their own actual hourly reading and leave missing values empty', () => {
  const raw = forecastFixture({ length: 32 });
  raw.hourly.apparent_temperature[31] = 3.2;
  raw.hourly.wind_speed_10m[31] = 6.4;
  raw.hourly.wind_direction_10m[31] = 184;
  raw.hourly.relative_humidity_2m[31] = null;
  raw.daily.uv_index_max[1] = 5.1;
  raw.daily.sunset[1] = null;
  const { days, incomplete } = normalizeForecast(raw, raw.current.time);
  assert.equal(incomplete, true);
  const tomorrow = days[1];
  assert.equal(tomorrow.hours.length, 8);
  assert.deepEqual([tomorrow.readingTimestamp, tomorrow.temperature, tomorrow.feelsLike], [seconds('2026-10-24T05:00:00Z'), 3.1, 3.2]);
  assert.deepEqual([tomorrow.wind, tomorrow.direction, tomorrow.humidity, tomorrow.uv], [6.4, 184, null, 5.1]);
  assert.deepEqual([tomorrow.sunrise, tomorrow.sunset], [raw.daily.sunrise[1], null]);
  assert.deepEqual([days[2].readingTimestamp, days[2].temperature, days[2].wind, days[2].humidity], [null, null, null, null]);
  assert.equal(days[2].uv, 2.2);
});

test('missing current data does not promote an upcoming hour or a daily condition into a current reading', () => {
  const raw = forecastFixture();
  raw.current.time = seconds('2026-10-23T11:00:00Z');
  const now = seconds('2026-10-23T10:30:00Z');
  const dayStartIndex = raw.hourly.time.findIndex(time => time > now);
  for (const key of Object.keys(raw.hourly)) raw.hourly[key] = raw.hourly[key].slice(dayStartIndex);
  raw.daily.sunrise[0] = 0;
  const { days, incomplete } = normalizeForecast(raw, now);
  const today = days[0];
  assert.equal(incomplete, true);
  assert.equal(today.temperature, null);
  assert.equal(today.readingTimestamp, null);
  assert.equal(today.condition.code, null);
  assert.equal(today.dailyCondition.code, 63);
  assert.equal(today.sunrise, null);
  assert.equal(today.hours[0].localMinute, 13 * 60);
});
