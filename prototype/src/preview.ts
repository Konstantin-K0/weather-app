import './preview.css';
import { translateStatic } from './i18n';
import { scenes, type Scene } from './data';
import { setThemePreview, type Theme } from './theme';

const sceneKeys = { sunny: 'sceneSunny', cloudy: 'sceneCloudy', rainy: 'sceneRainy', night: 'sceneNight' } as const;

export function mountPreview(selectScene: (scene: Scene | null) => void, reduceMotion: (value: boolean) => void): void {
  const container = document.createElement('div');
  container.innerHTML = `
    <button class="preview-trigger" aria-haspopup="dialog" data-t="devPreview"></button>
    <dialog class="preview-dialog" aria-labelledby="preview-title">
      <div class="section-heading">
        <h2 id="preview-title" data-t="atmospherePreview"></h2>
        <form method="dialog"><button class="preview-close" autofocus data-t="done"></button></form>
      </div>
      <label class="setting-label" for="preview-scene" data-t="weatherScene"></label>
      <select id="preview-scene">
        <option value="" data-t="followForecast"></option>
        ${scenes.map(scene => `<option value="${scene}" data-t="${sceneKeys[scene]}"></option>`).join('')}
      </select>
      <label class="setting-label" for="preview-theme" data-t="previewAppearance"></label>
      <select id="preview-theme">
        <option value="" data-t="savedAppearance"></option>
        <option value="system" data-t="system"></option>
        <option value="light" data-t="light"></option>
        <option value="dark" data-t="dark"></option>
      </select>
      <label class="motion-setting"><input type="checkbox" /> <span data-t="reducedMotion"></span></label>
    </dialog>`;
  translateStatic(container);
  document.body.append(container);

  const dialog = container.querySelector('dialog')!;
  container.querySelector('.preview-trigger')!.addEventListener('click', () => dialog.showModal());
  const scene = dialog.querySelector<HTMLSelectElement>('#preview-scene')!;
  scene.addEventListener('change', () => selectScene(scene.value ? scene.value as Scene : null));
  const theme = dialog.querySelector<HTMLSelectElement>('#preview-theme')!;
  theme.addEventListener('change', () => setThemePreview(theme.value ? theme.value as Theme : null));
  const reduced = dialog.querySelector<HTMLInputElement>('input')!;
  reduced.addEventListener('change', () => reduceMotion(reduced.checked));
}
