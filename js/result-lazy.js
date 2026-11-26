// Result-screen modules (~35 KB gzip) load after the menu has painted instead of before it.
// Importers read their exports from `R`, which is filled once loadResultModules() resolves.
// Anything that renders a question or a result must go through loadResultModules() first.
export const R = {};
let init = null;
let loading = null;

// Called once the modules exist, e.g. to wire their event handlers.
export function setResultInit(fn) {
  init = fn;
}

export function loadResultModules() {
  loading ??= Promise.all([
    import('./banter.js'),
    import('./cashier.js'),
    import('./hint.js'),
    import('./tax.js'),
    import('./count-up.js'),
    import('./confetti.js'),
    import('./tendency.js'),
    import('./chart-ui.js'),
    import('./share-ui.js'),
    import('./icon-preload.js'),
  ]).then((mods) => {
    Object.assign(R, ...mods);
    R.ready = true;
    init?.();
  }).catch((err) => {
    loading = null; // a failed fetch (offline blip) can be retried on the next tap
    throw err;
  });
  return loading;
}

// Start the download when the browser is idle, right after the menu is on screen.
export function loadResultModulesWhenIdle() {
  const go = () => loadResultModules().catch(() => {});
  if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 2000 });
  else setTimeout(go, 300);
}
