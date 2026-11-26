// Product icon preloading: warms the browser cache via `new Image().src = url` without touching the DOM.
const preloaded = new Set();

/** Icon URL for a question or timeline entry (matching nextQuestion's `q.image.src`), or null. */
export function questionIconUrl(q) {
  const src = q?.image?.src;
  return typeof src === 'string' && src ? src : null;
}

/** Unique icon URLs for the given question ids (`productId@date`), preserving order. */
export function dailyIconUrls(all, ids) {
  if (!Array.isArray(all) || !Array.isArray(ids) || ids.length === 0) return [];
  const byId = new Map();
  for (const q of all) {
    if (q?.id && !byId.has(q.id)) byId.set(q.id, q);
  }
  const urls = [];
  const seen = new Set();
  for (const id of ids) {
    const url = questionIconUrl(byId.get(id));
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

/**
 * Preload a single icon URL via `new Image().src = url` (no DOM insertion).
 * Deduplicates with a module-level Set and never throws.
 */
export function preloadIcon(url, { seen = preloaded, ImageCtor = globalThis.Image } = {}) {
  try {
    if (typeof url !== 'string' || !url || seen.has(url)) return false;
    if (typeof ImageCtor !== 'function') return false;
    const img = new ImageCtor();
    img.src = url;
    seen.add(url);
    return true;
  } catch {
    return false;
  }
}

/** Preload an iterable of icon URLs safely. Returns the count of newly triggered loads. */
export function preloadIcons(urls, options) {
  try {
    if (!urls || typeof urls[Symbol.iterator] !== 'function') return 0;
    let count = 0;
    for (const url of urls) {
      if (preloadIcon(url, options)) count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}
