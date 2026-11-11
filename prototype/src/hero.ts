import './hero.css';
import { scenes, type Day, type Scene, type TemperatureUnit } from './data';
import { icon } from './icons';
import { accessibleDegrees, conditionText, dayLabel, degrees, formatDate } from './i18n/format';

type HeroWeather = Pick<Day, 'key' | 'relativeDay' | 'condition' | 'temperature' | 'feelsLike' | 'high' | 'low'>;

const layers: Record<Scene, string> = {
  sunny: '<i class="field primary"></i><i class="field secondary"></i>',
  cloudy: '<i class="field primary"></i><i class="field secondary"></i><i class="field veil"></i>',
  rainy: '<i class="field primary"></i><i class="field secondary"></i>' +
    Array.from({ length: 9 }, (_, index) =>
      `<i class="streak" style="--x:${24 + index * 8}%;--y:${12 + index * 29 % 76}%;--delay:${-index * .73}s"></i>`
    ).join(''),
  night: '<i class="field primary"></i><i class="field secondary"></i><i class="night-points"></i>'
};

export function mountHero(hero: HTMLElement) {
  hero.innerHTML = `
    <div class="atmospheres" aria-hidden="true">
      ${scenes.map(scene => `
        <div class="atmosphere" data-atmosphere="${scene}">
          <div class="atmosphere-field">${layers[scene]}</div>
        </div>`).join('')}
    </div>
    <div class="hero-content" data-enter>
      <header class="hero-heading">
        <h2 id="hero-title"></h2>
        <p class="hero-date"></p>
        <span class="hero-sample" hidden></span>
      </header>
      <div class="hero-reading">
        <p class="temperature"><span class="hero-value"></span></p>
        <p class="condition"><span class="hero-icon"></span><span class="hero-condition"></span></p>
      </div>
      <dl class="hero-metrics">
        <div><dt data-t="feels"></dt><dd class="hero-feels"></dd></div>
        <div><dt data-t="high"></dt><dd class="hero-high"></dd></div>
        <div><dt data-t="low"></dt><dd class="hero-low"></dd></div>
      </dl>
    </div>`;

  const content = hero.querySelector('.hero-content')!;
  content.addEventListener('animationend', event => {
    if (event.target === content) content.removeAttribute('data-enter');
  });
  const title = hero.querySelector('#hero-title')!;
  const date = hero.querySelector('.hero-date')!;
  const value = hero.querySelector('.hero-value')!;
  const sample = hero.querySelector<HTMLElement>('.hero-sample')!;
  const symbol = hero.querySelector('.hero-icon')!;
  const condition = hero.querySelector('.hero-condition')!;
  const feels = hero.querySelector('.hero-feels')!;
  const high = hero.querySelector('.hero-high')!;
  const low = hero.querySelector('.hero-low')!;
  const atmospheres = hero.querySelectorAll<HTMLElement>('.atmosphere');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scene: Scene | undefined;
  let paused = false;
  let previewReduced = false;
  let pendingFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  function resetPointer(): void {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
    hero.style.removeProperty('--pointer-x');
    hero.style.removeProperty('--pointer-y');
  }

  function syncMotion(): void {
    const reduced = reducedMotion.matches || previewReduced;
    hero.toggleAttribute('data-reduced', reduced);
    if (reduced) content.removeAttribute('data-enter');
    hero.toggleAttribute('data-still', paused || reduced || document.hidden);
    if (!finePointer.matches || hero.hasAttribute('data-still')) resetPointer();
  }

  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || hero.hasAttribute('data-still')) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = (pointerX - bounds.left) / bounds.width - .5;
      const y = (pointerY - bounds.top) / bounds.height - .5;
      const clamp = (offset: number) => Math.max(-8, Math.min(8, offset * 16));
      hero.style.setProperty('--pointer-x', `${clamp(x)}px`);
      hero.style.setProperty('--pointer-y', `${clamp(y)}px`);
    });
  }, { passive: true });
  hero.addEventListener('pointerleave', resetPointer);
  finePointer.addEventListener('change', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();

  return {
    update(city: string, weather: HeroWeather, unit: TemperatureUnit, locationBadge: string, preview: Scene | null, previous: boolean): void {
      title.textContent = city;
      date.textContent = previous ? formatDate(weather.key) : `${dayLabel(weather)} · ${formatDate(weather.key)}`;
      sample.textContent = locationBadge;
      sample.hidden = !locationBadge;
      value.textContent = degrees(weather.temperature, unit);
      value.setAttribute('aria-label', accessibleDegrees(weather.temperature, unit));
      feels.textContent = degrees(weather.feelsLike, unit);
      high.textContent = degrees(weather.high, unit);
      low.textContent = degrees(weather.low, unit);
      condition.textContent = conditionText(weather.condition);
      symbol.innerHTML = icon(weather.condition.icon);
      const nextScene = preview ?? weather.condition.scene;
      if (scene === nextScene) return;
      scene = nextScene;
      hero.dataset.scene = scene;
      for (const layer of atmospheres) {
        layer.classList.toggle('active', layer.dataset.atmosphere === scene);
      }
    },
    pauseAmbient(value: boolean): void {
      paused = value;
      syncMotion();
    },
    previewReducedMotion(value: boolean): void {
      previewReduced = value;
      document.documentElement.toggleAttribute('data-preview-reduced', value);
      syncMotion();
    }
  };
}
