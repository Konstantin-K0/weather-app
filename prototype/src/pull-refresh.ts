import { t } from './i18n';

const threshold = 72;
const directionThreshold = 8;

export function mountPullRefresh(root: HTMLElement, busy: () => boolean, refresh: () => Promise<void>): () => void {
  const label = root.querySelector('.pull-label')!;
  let gesture: { x: number; y: number; pulling: boolean; ready: boolean } | undefined;
  let refreshing = false;

  function reset(): void {
    gesture = undefined;
    delete root.dataset.pull;
    root.style.removeProperty('--pull-distance');
    root.style.removeProperty('--pull-progress');
  }

  root.addEventListener('touchstart', event => {
    if (refreshing) return;
    const touch = event.touches[0];
    if (!touch || event.touches.length !== 1 || window.scrollY > 0 || busy() ||
        (event.target instanceof Element && event.target.closest('dialog'))) {
      reset();
      return;
    }
    gesture = { x: touch.clientX, y: touch.clientY, pulling: false, ready: false };
  }, { passive: true });

  root.addEventListener('touchmove', event => {
    const touch = event.touches[0];
    if (!gesture || !touch) return;
    if (event.touches.length !== 1 || window.scrollY > 0 || busy()) return reset();

    const dx = Math.abs(touch.clientX - gesture.x);
    const dy = touch.clientY - gesture.y;
    if (!gesture.pulling) {
      if (Math.max(dx, Math.abs(dy)) < directionThreshold) return;
      if (dy <= dx) return reset();
      gesture.pulling = true;
    }
    if (event.cancelable) event.preventDefault();
    const distance = Math.max(0, dy);
    gesture.ready = distance >= threshold;
    // Resistance increases as the user pulls farther.
    root.style.setProperty('--pull-distance', `${96 * (1 - Math.exp(-distance / 100))}px`);
    root.style.setProperty('--pull-progress', String(Math.min(distance / threshold, 1)));
    root.dataset.pull = gesture.ready ? 'ready' : 'dragging';
    localize();
  }, { passive: false });

  root.addEventListener('touchend', async () => {
    if (refreshing) return;
    if (!gesture?.ready || busy()) return reset();
    gesture = undefined;
    refreshing = true;
    root.dataset.pull = 'refreshing';
    root.style.setProperty('--pull-distance', '52px');
    localize();
    try {
      await refresh();
    } finally {
      refreshing = false;
      reset();
    }
  }, { passive: true });
  root.addEventListener('touchcancel', () => { if (!refreshing) reset(); }, { passive: true });
  function localize(): void {
    label.textContent = t(refreshing ? 'refreshing' : gesture?.ready ? 'release' : 'pull');
  }
  return localize;
}
