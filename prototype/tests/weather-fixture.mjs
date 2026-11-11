export const seconds = iso => Date.parse(iso) / 1000;
export function forecastFixture({
  start = '2026-10-22T22:00:00Z', timezone = 'Europe/Prague', offset = 7200,
  now = '2026-10-23T21:37:00Z', length = 168
} = {}) {
  const first = seconds(start);
  const hour = Array.from({ length }, (_, index) => first + index * 3600);
  const days = Array.from({ length: 7 }, (_, index) => first + index * 86400);
  const hourly = value => hour.map(() => value);
  const daily = value => days.map(() => value);
  return {
    timezone, utc_offset_seconds: offset,
    current: { time: seconds(now), temperature_2m: 9.8, apparent_temperature: 7.1,
      relative_humidity_2m: 86, weather_code: 0, is_day: 0, wind_speed_10m: 14, wind_direction_10m: 245 },
    hourly: {
      time: hour, temperature_2m: hour.map((_, index) => index / 10), apparent_temperature: hourly(4),
      precipitation_probability: hourly(15), weather_code: hourly(2), is_day: hourly(1),
      relative_humidity_2m: hourly(50), wind_speed_10m: hourly(10), wind_direction_10m: hourly(90)
    },
    daily: {
      time: days, weather_code: daily(63), temperature_2m_min: daily(2), temperature_2m_max: daily(14),
      sunrise: days.map(time => time + 6 * 3600), sunset: days.map(time => time + 18 * 3600),
      uv_index_max: daily(2.2)
    }
  };
}
