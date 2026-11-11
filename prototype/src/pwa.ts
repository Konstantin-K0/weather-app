interface InstallPrompt extends Event {
  prompt(): Promise<unknown>;
}

export function mountInstallSettings(root: HTMLElement): void {
  const button = root.querySelector<HTMLButtonElement>('#install-app')!;
  const guidance = root.querySelector<HTMLElement>('#install-guidance')!;
  const installed = root.querySelector<HTMLElement>('#install-installed')!;
  const mode = window.matchMedia('(display-mode: standalone)');
  let prompt: InstallPrompt | undefined;
  let installedHere = false;

  function render(): void {
    const standalone = mode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const available = standalone || installedHere;
    button.hidden = available || !prompt;
    guidance.hidden = available || !!prompt;
    installed.hidden = !available;
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    prompt = event as InstallPrompt;
    render();
  });
  window.addEventListener('appinstalled', () => {
    installedHere = true;
    prompt = undefined;
    render();
  });
  mode.addEventListener('change', render);
  button.addEventListener('click', async () => {
    const request = prompt;
    if (!request) return;
    prompt = undefined;
    try { await request.prompt(); }
    catch { /* The platform guidance stays available. */ }
    render();
  });
  render();
}

export function registerOfflineShell(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  // The generated worker waits for old clients to close. No page reload is needed.
  void navigator.serviceWorker.register(new URL('sw.js', base), { updateViaCache: 'none' }).catch(() => {
    // Live weather and persisted forecasts are still available without the worker.
  });
}
