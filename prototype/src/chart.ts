import type { Hour, TemperatureUnit } from './data';
import { t } from './i18n';
import { accessibleDegrees, conditionText, degrees, formatDate, formatOffset, formatPercent, formatTime } from './i18n/format';
import { icon } from './icons';

const columnWidth = 76;
const inset = 12;

export function mountChart(container: HTMLElement) {
  container.innerHTML = `
    <div class="hour-viewport">
      <div class="hour-scroll" tabindex="0" role="region" data-t-label="hourlyScroll">
        <div class="chart-inner">
          <svg class="chart" aria-hidden="true"></svg>
          <ul class="hours" role="list"></ul>
        </div>
      </div>
      <p class="empty-hours" hidden data-t="hourlyEmpty"></p>
    </div>`;
  const scroller = container.querySelector<HTMLElement>('.hour-scroll')!;
  const chart = container.querySelector<SVGSVGElement>('.chart')!;
  const inner = container.querySelector<HTMLElement>('.chart-inner')!;
  const list = container.querySelector('.hours')!;
  const empty = container.querySelector<HTMLElement>('.empty-hours')!;

  scroller.addEventListener('keydown', event => {
    let left: number;
    switch (event.key) {
      case 'ArrowLeft': left = scroller.scrollLeft - columnWidth; break;
      case 'ArrowRight': left = scroller.scrollLeft + columnWidth; break;
      case 'Home': left = 0; break;
      case 'End': left = scroller.scrollWidth - scroller.clientWidth; break;
      default: return;
    }
    event.preventDefault();
    scroller.scrollTo({ left, behavior: 'instant' });
  });

  return (hours: Hour[], unit: TemperatureUnit, timezone: string, resetScroll: boolean): void => {
    const scrollLeft = resetScroll ? 0 : scroller.scrollLeft;
    const hasHours = hours.length > 0;
    scroller.tabIndex = hasHours ? 0 : -1;
    empty.hidden = hasHours;
    inner.style.visibility = hasHours ? '' : 'hidden';
    if (hasHours) renderHours(chart, list, inner, hours, unit, timezone);
    else {
      inner.style.width = '';
      chart.style.width = '';
      chart.replaceChildren();
      list.replaceChildren();
    }
    scroller.scrollTo({ left: scrollLeft, behavior: 'instant' });
  };
}

function renderHours(chart: SVGSVGElement, list: Element, inner: HTMLElement, hours: Hour[], unit: TemperatureUnit, timezone: string): void {
  const width = hours.length * columnWidth + inset * 2;
  const temperatures = hours.flatMap(hour => hour.temperature === null ? [] : [hour.temperature]);
  const min = Math.min(...temperatures) - 2;
  const max = Math.max(...temperatures) + 2;
  const points = hours.map((hour, i) => ({
    x: inset + (i + .5) * columnWidth,
    y: hour.temperature === null ? null : 115 - (hour.temperature - min) / (max - min) * 80
  }));

  // Each uninterrupted run gets its own curve, so missing values are never interpolated.
  const runs: { first: number; last: number; path: string }[] = [];
  points.forEach((point, i) => {
    if (point.y === null) return;
    const previous = points[i - 1];
    if (!previous || previous.y === null) {
      const first = i === 0 ? 0 : point.x;
      runs.push({ first, last: point.x, path: `M ${first} ${point.y} H ${point.x}` });
      return;
    }
    const run = runs.at(-1)!;
    const midpoint = (previous.x + point.x) / 2;
    run.path += ` C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
    run.last = point.x;
  });
  const finalPoint = points.at(-1);
  if (finalPoint && finalPoint.y !== null) {
    const run = runs.at(-1)!;
    run.path += ` H ${width}`;
    run.last = width;
  }
  const repeats = new Set<string>();
  const seen = new Set<string>();
  for (const hour of hours) {
    const key = `${hour.date}:${hour.localMinute}`;
    if (seen.has(key)) repeats.add(key);
    seen.add(key);
  }
  inner.style.width = `${width}px`;
  chart.style.width = `${width}px`;
  chart.setAttribute('viewBox', `0 0 ${width} 144`);
  chart.innerHTML = `
    <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--accent)" stop-opacity=".16"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${runs.map(({ first, last, path }) => `<path d="${path} L ${last} 144 L ${first} 144 Z" fill="url(#chart-fill)"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`).join('')}
    ${points.map((point, i) => `<text x="${point.x}" y="${point.y === null ? 115 : point.y - 17}" text-anchor="middle">${degrees(hours[i]!.temperature, unit)}</text>`).join('')}`;

  list.innerHTML = hours.map(hour => {
    const time = formatTime(hour.timestamp, timezone);
    const offset = formatOffset(hour.timestamp, timezone);
    const temperature = accessibleDegrees(hour.temperature, unit);
    const probability = hour.precipitation === null ? '—' : formatPercent(hour.precipitation);
    const precipitation = hour.precipitation === null ? t('precipMissing') : t('precipChance', { value: probability });
    const repeatedOffset = repeats.has(`${hour.date}:${hour.localMinute}`) ? offset : '';
    return `<li class="hour">
      <span class="sr-only">${formatDate(hour.date)}, ${time} ${offset}, ${temperature}, ${conditionText(hour.condition)}, ${precipitation}</span>
      ${icon(hour.condition.icon)}
      <span aria-hidden="true">${time}<small>${repeatedOffset}</small></span>
      <small aria-hidden="true">${probability}</small>
    </li>`;
  }).join('');
}
