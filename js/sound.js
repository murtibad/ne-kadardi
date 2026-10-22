// Recorded CC0 Web Audio sound effects and haptic feedback.
// Pure module, testable without a real browser AudioContext.

export const SOUND_FILES = Object.freeze({
  print: Object.freeze({ url: 'sounds/print.mp3', gain: 0.55 }),
  tear: Object.freeze({ url: 'sounds/tear.mp3', gain: 0.45 }),
  beep: Object.freeze({ url: 'sounds/beep.mp3', gain: 0.35 }),
  bell: Object.freeze({ url: 'sounds/bell.mp3', gain: 0.45 }),
});

// A click sound that arrives later than this feels detached from the tap, so it is skipped.
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
  let resuming = null;
  const rawPromises = new Map();
  const bufferPromises = new Map();
  const decodedBuffers = new Map();
  const activeSources = new Map();
  // stop() bumps a name's generation, so a play() still loading when it was stopped stays silent.
  const generations = new Map();

  function isEnabled() {
    return enabled;
  }

  function stop(name) {
    if (typeof name !== 'string') return;
    generations.set(name, (generations.get(name) || 0) + 1);
    const set = activeSources.get(name);
    if (!set) return;
    activeSources.delete(name);
    for (const src of set) {
      try {
        src.stop();
      } catch {
        // Ignore already-stopped or invalid state errors.
      }
    }
  }

  function setEnabled(val) {
    enabled = Boolean(val);
    if (!enabled) {
      for (const name of [...activeSources.keys()]) {
        stop(name);
      }
    }
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
        if (res && typeof res.then === 'function') {
          resuming = res.then(() => {}, () => {});
        }
      }
      return ctx;
    } catch {
      return null;
    }
  }

  // Downloading needs no AudioContext, so it can start at page load, before the first tap;
  // only decoding waits for the context. This keeps the very first sound from being skipped.
  function fetchRaw(name) {
    if (rawPromises.has(name)) return rawPromises.get(name);
    const spec = SOUND_FILES[name];
    const promise = (async () => {
      const res = await fetchFn(spec.url);
      if (!res || res.ok === false || typeof res.arrayBuffer !== 'function') {
        throw new Error(`Failed to fetch sound: ${spec.url}`);
      }
      return res.arrayBuffer();
    })();
    rawPromises.set(name, promise);
    promise.catch(() => rawPromises.delete(name));
    return promise;
  }

  function prefetch() {
    if (!enabled || typeof fetchFn !== 'function' || !AudioContextCtor) return false;
    for (const name of Object.keys(SOUND_FILES)) {
      fetchRaw(name).catch(() => {});
    }
    return true;
  }

  function load(audioCtx, name) {
    if (bufferPromises.has(name)) {
      return bufferPromises.get(name);
    }
    const spec = SOUND_FILES[name];
    const promise = (async () => {
      const arrayBuffer = await fetchRaw(name);
      // decodeAudioData detaches the bytes; a failed decode must fetch them again.
      rawPromises.delete(name);
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

    // A context waking from the background (or from a phone call on iOS) keeps its clock frozen
    // until resume() settles, so a sound scheduled now would come out late: wait, then check.
    const ready = audioCtx.state === 'running' || !resuming ? null : resuming;
    const generation = generations.get(name) || 0;
    Promise.all([load(audioCtx, name), ready]).then(([buffer]) => {
      if (!buffer || !enabled || (generations.get(name) || 0) !== generation) return;
      if (!wasCached || ready) {
        const elapsedMs = (typeof clock === 'function' ? clock() : Date.now()) - startMs;
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
        let set = activeSources.get(name);
        if (!set) {
          set = new Set();
          activeSources.set(name, set);
        }
        set.add(source);
        source.onended = () => {
          set.delete(source);
        };
        source.start(baseTime + safeDelay);
      } catch {
        // Audio errors must never crash caller logic.
      }
    });

    return true;
  }

  // Called on every tap and when the tab becomes visible again: resumes a sleeping context and
  // plays a silent sample so the audio output is awake before the real sound is needed.
  function wake() {
    if (!enabled || !ctx) return false;
    const wasRunning = ctx.state === 'running';
    ensureContext();
    if (wasRunning) return true;
    try {
      const silent = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // Older engines without createBuffer still get the resume above.
    }
    return true;
  }

  return {
    isEnabled,
    setEnabled,
    toggle,
    unlock,
    prefetch,
    wake,
    play,
    stop,
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
