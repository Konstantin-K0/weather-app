import { AppError } from './errors.ts';
import { apiObject } from './api-types.ts';
import type { Day, Forecast, Hour } from './data.ts';
import { weatherCondition } from './conditions.ts';

const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const timestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 8.64e12;
const at = (series: unknown, index: number): number | null => Array.isArray(series) ? finite(series[index]) : null;
const percent = (value: number | null) => value !== null && value >= 0 && value <= 100 ? value : null;
const hourSeconds = 3600;

function nearestToNoon<T extends Hour>(hours: T[]): T | undefined {
  let closest: T | undefined;
  let distance = Infinity;
  for (const hour of hours) {
    const fromNoon = Math.abs(hour.localMinute - 720);
    if (fromNoon >= distance) continue;
    closest = hour;
    distance = fromNoon;
  }
  return closest;
}

export function normalizeForecast(payload: unknown, now = Date.now() / 1000): Forecast {
  const fail = () => new AppError('forecastInvalid');
  const raw = apiObject(payload);
  if (!raw || typeof raw.timezone !== 'string') throw fail();
  const offset = finite(raw.utc_offset_seconds);
  if (offset === null || !Number.isInteger(offset) || Math.abs(offset) > 24 * hourSeconds) throw fail();
  const timezone = raw.timezone;
  let calendar: Intl.DateTimeFormat;
  try {
    calendar = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { throw fail(); }
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const localDate = (seconds: number) => {
    const parts = calendar.formatToParts(seconds * 1000);
    const get = (name: string) => parts.find(part => part.type === name)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  };
  const today = localDate(now);
  const dayStart = (key: string) => Date.parse(`${key}T00:00:00Z`);
  const daily = apiObject(raw.daily);
  const hourly = apiObject(raw.hourly);
  const current = apiObject(raw.current);
  const dayTimes = Array.isArray(daily?.time) ? daily.time : [];
  const hourTimes = Array.isArray(hourly?.time) ? hourly.time : [];
  const sunTimes = new Map<string, [number | null, number | null]>();
  // Daily boundaries are Open-Meteo's fixed-offset calendar keys. Hourly instants and
  // sun events use the IANA zone, which can change offset during the forecast.
  const keyForDay = (time: number) => new Date((time + offset) * 1000).toISOString().slice(0, 10);
  const validDay = (time: unknown): time is number => timestamp(time) && timestamp(time + offset);
  dayTimes.forEach((time, index) => {
    if (!validDay(time)) return;
    const key = keyForDay(time);
    if (sunTimes.has(key)) return;
    const eventOnDay = (series: unknown) => {
      const event = at(series, index);
      return timestamp(event) && localDate(event) === key ? event : null;
    };
    sunTimes.set(key, [eventOnDay(daily?.sunrise), eventOnDay(daily?.sunset)]);
  });
  function isDay(time: number, key: string, flag: number | null): boolean {
    if (flag === 1 || flag === 0) return flag === 1;
    const [rise, set] = sunTimes.get(key) ?? [];
    return timestamp(rise) && timestamp(set) ? time >= rise && time < set : true;
  }

  const seenHours = new Set<number>();
  const hours: (Hour & { index: number })[] = [];
  hourTimes.forEach((time, index) => {
    if (!timestamp(time) || seenHours.has(time)) return;
    seenHours.add(time);
    const date = localDate(time);
    const localTime = clock.format(time * 1000);
    hours.push({
      index, timestamp: time, date,
      localMinute: Number(localTime.slice(0, 2)) * 60 + Number(localTime.slice(3)),
      temperature: at(hourly?.temperature_2m, index),
      precipitation: percent(at(hourly?.precipitation_probability, index)),
      condition: weatherCondition(at(hourly?.weather_code, index), isDay(time, date, at(hourly?.is_day, index)))
    });
  });
  hours.sort((a, b) => a.timestamp - b.timestamp);
  const currentHour = hours.findIndex(hour => hour.timestamp + hourSeconds > now);
  const reading = current?.time;
  const observationTime = timestamp(reading) && reading <= now && now - reading < hourSeconds && localDate(reading) === today
    ? reading : null;
  const seenDays = new Set<string>();
  const days: Day[] = [];
  let hasPartialDay = false;
  dayTimes.forEach((time, index) => {
    if (!validDay(time)) return;
    const key = keyForDay(time);
    if (key < today || seenDays.has(key)) return;
    seenDays.add(key);
    const thisDay = hours.filter(hour => hour.date === key);
    const isToday = key === today;
    const nearest = isToday
      ? thisDay.find(hour => hour.timestamp <= now && hour.timestamp + hourSeconds > now)
      : nearestToNoon(thisDay);
    const hourIndex = nearest?.index ?? -1;
    const readingTime = isToday ? observationTime : null;
    const observationForDay = readingTime !== null ? current : undefined;
    const details = (field: 'apparent_temperature' | 'relative_humidity_2m' | 'wind_speed_10m' | 'wind_direction_10m') =>
      finite(observationForDay?.[field]) ?? at(hourly?.[field], hourIndex);
    const dailyCondition = weatherCondition(at(daily?.weather_code, index), true);
    const currentCondition = readingTime !== null
      ? weatherCondition(finite(observationForDay?.weather_code), isDay(readingTime, key, finite(observationForDay?.is_day)))
      : undefined;
    const condition = !isToday ? dailyCondition :
      currentCondition?.code != null ? currentCondition :
        nearest?.condition ?? currentCondition ?? weatherCondition(null, true);
    const low = at(daily?.temperature_2m_min, index);
    const high = at(daily?.temperature_2m_max, index);
    const [rise, set] = sunTimes.get(key) ?? [];
    const timeline = isToday ? (currentHour >= 0 ? hours.slice(currentHour, currentHour + 24) : []) : thisDay;
    const first = timeline[0];
    const last = timeline.at(-1);
    hasPartialDay ||= !first || !last ||
      (isToday ? first.timestamp > now || timeline.length < 24 :
        localDate(first.timestamp - hourSeconds) === key || localDate(last.timestamp + hourSeconds) === key) ||
      timeline.some((hour, i) => i > 0 && hour.timestamp - timeline[i - 1]!.timestamp !== hourSeconds);
    days.push({
      key, relativeDay: (dayStart(key) - dayStart(today)) / 86_400_000,
      condition, dailyCondition, low, high,
      readingTimestamp: readingTime ?? nearest?.timestamp ?? null,
      temperature: finite(observationForDay?.temperature_2m) ?? nearest?.temperature ?? null,
      feelsLike: details('apparent_temperature'), wind: details('wind_speed_10m'),
      direction: details('wind_direction_10m'), humidity: percent(details('relative_humidity_2m')),
      uv: at(daily?.uv_index_max, index),
      sunrise: rise ?? null,
      sunset: set ?? null,
      hours: timeline
    });
  });
  days.sort((a, b) => a.key.localeCompare(b.key));
  if (!days.length || !days.some(day => day.temperature !== null || day.high !== null || day.hours.some(hour => hour.temperature !== null))) throw fail();
  return {
    timezone, days: days.slice(0, 7),
    incomplete: observationTime === null || !seenDays.has(today) || days.length < 7 || hasPartialDay ||
      days.some(day => [day.temperature, day.feelsLike, day.low, day.high, day.wind, day.direction,
        day.humidity, day.uv, day.sunrise, day.sunset, day.condition.code, day.dailyCondition.code].includes(null) ||
        !day.hours.length || day.hours.some(hour => hour.temperature === null || hour.precipitation === null || hour.condition.code === null))
  };
}
