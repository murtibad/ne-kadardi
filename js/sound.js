// Recorded CC0 Web Audio sound effects and haptic feedback.
// Pure module, testable without a real browser AudioContext.

export const SOUND_FILES = Object.freeze({
  print: Object.freeze({ url: 'sounds/print.mp3', gain: 0.55 }),
  tear: Object.freeze({ url: 'sounds/tear.mp3', gain: 0.45 }),
  beep: Object.freeze({ url: 'sounds/beep.mp3', gain: 0.35 }),
  bell: Object.freeze({ url: 'sounds/bell.mp3', gain: 0.45 }),
});

const MAX_LOAD_WAIT_MS = 400;
const STORAGE_KEY = 'ne-kadardi-sound';

/**
 * Return sound effect name for an exact guess, or null otherwise.
 * The receipt printer sound plays on every result; score jingles are omitted.
 */
export function soundForResult(score, factor) {
  if (factor === 1) return 'bell';
  return null;
}

function getDefaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function getDefaultAudioContext() {
  try {
    return globalThis.AudioContext || globalThis.webkitAudioContext;
  } catch {
    return undefined;
  }
}

function getDefaultFetch() {
  try {
    return typeof globalThis.fetch === 'function'
      ? globalThis.fetch.bind(globalThis)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Support both modern Promise-returning decodeAudioData and legacy Safari callbacks.
 */
function decodeAudio(ctx, arrayBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const result = ctx.decodeAudioData(arrayBuffer, resolve, reject);
      if (result && typeof result.then === 'function') {
        result.then(resolve, reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Sound effects player managing Web Audio lifecycle, buffer caching, and persistence.
 */
export function createSoundPlayer(options = {}) {
  const {
    storage = getDefaultStorage(),
    AudioContextCtor = getDefaultAudioContext(),
    fetchFn = getDefaultFetch(),
    now,
    clock = Date.now,
  } = options;

  let enabled = true;
  try {
    if (storage && typeof storage.getItem === 'function') {
      const val = storage.getItem(STORAGE_KEY);
      if (val === '0') {
        enabled = false;
      }
    }
  } catch {
    // Default to enabled if storage access is blocked.
  }

  let ctx = null;
  const bufferPromises = new Map();
  const decodedBuffers = new Map();

  function isEnabled() {
    return enabled;
  }

  function setEnabled(val) {
    enabled = Boolean(val);
    try {
      if (storage && typeof storage.setItem === 'function') {
        storage.setItem(STORAGE_KEY, enabled ? '1' : '0');
      }
    } catch {
      // Ignore storage write errors (quota or private mode).
    }
    return enabled;
  }

  function toggle() {
    return setEnabled(!enabled);
  }

  function ensureContext() {
    if (!AudioContextCtor) return null;
    try {
      if (!ctx) {
        ctx = new AudioContextCtor();
      }
      // iOS Safari reports 'interrupted' after a phone call or Siri.
      if (ctx && (ctx.state === 'suspended' || ctx.state === 'interrupted') && typeof ctx.resume === 'function') {
        const res = ctx.resume();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      }
      return ctx;
    } catch {
      return null;
    }
  }

  function load(audioCtx, name) {
    if (bufferPromises.has(name)) {
      return bufferPromises.get(name);
    }
    const spec = SOUND_FILES[name];
    const promise = (async () => {
      const res = await fetchFn(spec.url);
      if (!res || res.ok === false || typeof res.arrayBuffer !== 'function') {
        throw new Error(`Failed to fetch sound: ${spec.url}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await decodeAudio(audioCtx, arrayBuffer);
      if (!audioBuffer) {
        throw new Error(`Failed to decode sound: ${spec.url}`);
      }
      decodedBuffers.set(name, audioBuffer);
      return audioBuffer;
    })().catch(() => {
      // Evict failed loads so a later play() or unlock() can retry.
      bufferPromises.delete(name);
      return null;
    });

    bufferPromises.set(name, promise);
    return promise;
  }

  function unlock() {
    if (!enabled) return false;
    if (typeof fetchFn !== 'function') return false;
    const audioCtx = ensureContext();
    if (!audioCtx) return false;

    for (const name of Object.keys(SOUND_FILES)) {
      load(audioCtx, name);
    }
    return true;
  }

  function play(name, { delay = 0 } = {}) {
    if (!enabled) return false;
    const spec = typeof name === 'string' && Object.hasOwn(SOUND_FILES, name)
      ? SOUND_FILES[name]
      : null;
    if (!spec) return false;
    if (typeof fetchFn !== 'function') return false;

    const audioCtx = ensureContext();
    if (!audioCtx) return false;

    const wasCached = decodedBuffers.has(name);
    const startMs = typeof clock === 'function' ? clock() : Date.now();
    const safeDelay = typeof delay === 'number' && Number.isFinite(delay) && delay > 0
      ? delay
      : 0;

    load(audioCtx, name).then((buffer) => {
      if (!buffer || !enabled) return;
      if (!wasCached) {
        const elapsedMs = (typeof clock === 'function' ? clock() : Date.now()) - startMs;
        // Skip sounds that took too long on first fetch so feedback never feels detached.
        if (elapsedMs > MAX_LOAD_WAIT_MS) return;
      }

      try {
        const baseTime = typeof now === 'function'
          ? now(audioCtx)
          : (typeof audioCtx.currentTime === 'number' ? audioCtx.currentTime : 0);

        const source = audioCtx.createBufferSource();
        const gainNode = audioCtx.createGain();
        source.buffer = buffer;
        if (gainNode && gainNode.gain) {
          gainNode.gain.value = spec.gain;
        }
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start(baseTime + safeDelay);
      } catch {
        // Audio errors must never crash caller logic.
      }
    });

    return true;
  }

  return {
    isEnabled,
    setEnabled,
    toggle,
    unlock,
    play,
  };
}

/**
 * Trigger device vibration if available and allowed.
 */
export function haptic(ms = 10, nav = globalThis.navigator) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
    return false;
  }
  try {
    if (!nav || typeof nav.vibrate !== 'function') {
      return false;
    }
    const res = nav.vibrate(ms);
    return res !== false;
  } catch {
    return false;
  }
}
