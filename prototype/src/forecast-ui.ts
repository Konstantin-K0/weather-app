import { mountChart } from './chart';
import type { Day, TemperatureUnit } from './data';
import { getLanguage, t, type Language } from './i18n';
import { accessibleDegrees, compassLabel, conditionText, dayLabel, degrees, formatCount, formatNumber, formatTime } from './i18n/format';
import { icon } from './icons';

const value = (number: number | null) => number === null ? '—' : formatNumber(number);

export function mountForecast(root: HTMLElement) {
  const updateChart = mountChart(root.querySelector('#hourly')!);
  const hourlyDay = root.querySelector('#hourly-day')!;
  const detailDay = root.querySelector('#detail-day')!;
  const daily = root.querySelector('#daily')!;
  const details = root.querySelector('#details')!;
  details.innerHTML = `
    <article class="detail"><h3>${icon('wind')}<span data-t="wind"></span></h3><p><span class="detail-value" id="wind-value"></span><span data-t="windUnit"></span></p><div class="detail-bottom"><span id="wind-compass"></span><span id="wind-arrow" aria-hidden="true">${icon('arrow')}</span></div></article>
    <article class="detail"><h3>${icon('drop')}<span data-t="humidity"></span></h3><p><span class="detail-value" id="humidity-value"></span><span>%</span></p><div class="meter" aria-hidden="true"><i id="humidity-fill"></i></div><small data-t="relativeHumidity"></small></article>
    <article class="detail"><h3>${icon('sunny')}<span data-t="uv"></span></h3><p><span class="detail-value" id="uv-value"></span><span id="uv-level"></span></p><div class="uv-meter" aria-hidden="true"><i id="uv-marker"></i></div><small data-t="dailyMax"></small></article>
    <article class="detail sun-times"><h3>${icon('sunrise')}<span data-t="sunTimes"></span></h3><div class="sun-arc" aria-hidden="true"><span>☀</span></div><div class="sun-labels"><span><strong id="sunrise-value"></strong><small data-t="sunrise"></small></span><span><strong id="sunset-value"></strong><small data-t="sunset"></small></span></div></article>`;
  const wind = details.querySelector('#wind-value')!;
  const compass = details.querySelector('#wind-compass')!;
  const arrow = details.querySelector<HTMLElement>('#wind-arrow')!;
  const humidity = details.querySelector('#humidity-value')!;
  const humidityFill = details.querySelector<HTMLElement>('#humidity-fill')!;
  const uvValue = details.querySelector('#uv-value')!;
  const uvLevel = details.querySelector('#uv-level')!;
  const uvMarker = details.querySelector<HTMLElement>('#uv-marker')!;
  const sunrise = details.querySelector('#sunrise-value')!;
  const sunset = details.querySelector('#sunset-value')!;
  let previousDays: Day[] | undefined;
  let previousUnit: TemperatureUnit | undefined;
  let previousLanguage: Language | undefined;
  let previousDates = false;

  return (days: Day[], day: Day, unit: TemperatureUnit, timezone: string, resetScroll: boolean, previous: boolean): void => {
    if (previousDays !== days || previousUnit !== unit || previousLanguage !== getLanguage() || previousDates !== previous) {
      updateDaily(daily, days, unit, previous);
      previousDates = previous;
      previousDays = days;
      previousUnit = unit;
      previousLanguage = getLanguage();
    }
    Array.from(daily.children).forEach((button, index) =>
      button.setAttribute('aria-pressed', String(days[index] === day)));

    const label = dayLabel(day, previous);
    hourlyDay.textContent = previous || day.relativeDay !== 0 ? label :
      day.hours.length === 24 ? t('nextHours') : t('availableHours', { count: formatCount(day.hours.length, 'hour') });
    detailDay.textContent = day.readingTimestamp === null ? label : !previous && day.relativeDay === 0 ? t('now') :
      `${label} · ${formatTime(day.readingTimestamp, timezone)}`;
    updateChart(day.hours, unit, timezone, resetScroll);

    const direction = day.direction === null ? null : (day.direction % 360 + 360) % 360;
    wind.textContent = value(day.wind);
    compass.textContent = direction === null ? '—' : compassLabel(direction);
    compass.setAttribute('aria-label', direction === null ? t('directionMissing') : t('windFrom', { direction: compass.textContent }));
    arrow.style.visibility = direction === null ? 'hidden' : '';
    arrow.style.rotate = direction === null ? '' : `${direction + 180}deg`;
    humidity.textContent = value(day.humidity);
    humidityFill.style.width = `${day.humidity ?? 0}%`;
    const uv = day.uv;
    uvValue.textContent = uv === null ? '—' : formatNumber(uv, 1);
    uvLevel.textContent = uv === null ? '' : t(uv < 3 ? 'uvLow' : uv < 6 ? 'uvModerate' :
      uv < 8 ? 'uvHigh' : uv < 11 ? 'uvVeryHigh' : 'uvExtreme');
    uvMarker.hidden = uv === null;
    uvMarker.style.left = uv === null ? '' : `${Math.max(0, Math.min(100, uv / 11 * 100))}%`;
    sunrise.textContent = day.sunrise === null ? '—' : formatTime(day.sunrise, timezone);
    sunset.textContent = day.sunset === null ? '—' : formatTime(day.sunset, timezone);
  };
}

function updateDaily(daily: Element, days: Day[], unit: TemperatureUnit, previous: boolean): void {
  const temperatures = days.flatMap(item => [item.low, item.high]).filter(item => item !== null);
  const weekLow = Math.min(...temperatures);
  const span = Math.max(Math.max(...temperatures) - weekLow, 1);
  if (daily.children.length !== days.length) daily.innerHTML = days.map((_, index) =>
    `<button class="day" data-day="${index}" aria-pressed="false"></button>`).join('');
  days.forEach((item, index) => {
    const button = daily.children[index]!;
    const low = degrees(item.low, unit);
    const high = degrees(item.high, unit);
    const label = dayLabel(item, previous);
    button.setAttribute('aria-description', t('dailyDescription', {
      condition: conditionText(item.dailyCondition),
      low: accessibleDegrees(item.low, unit), high: accessibleDegrees(item.high, unit)
    }));
    const range = item.low === null || item.high === null ? '' :
      `<i style="left:${(item.low - weekLow) / span * 100}%;width:${Math.max(0, (item.high - item.low) / span * 100)}%"></i>`;
    button.innerHTML = `<span class="day-name">${label}</span>${icon(item.dailyCondition.icon)}<span class="low">${low}</span><span class="range" aria-hidden="true">${range}</span><span>${high}</span>`;
  });
}
