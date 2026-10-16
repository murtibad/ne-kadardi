// Synthesized Web Audio sound effects and haptic feedback.
// Pure module, testable without a real browser AudioContext.

export const SOUND_PLANS = {
  // Supermarket barcode scanner single beep.
  beep: [
    { kind: 'tone', wave: 'sine', freq: 900, start: 0, dur: 0.07, gain: 0.15 },
  ],
  // Thermal receipt printer paper advance noise through bandpass.
  print: [
    { kind: 'noise', filter: 3000, start: 0, dur: 0.26, gain: 0.08 },
  ],
  // Cash register ka-ching: mechanical click followed by two metallic tones.
  cashbox: [
    { kind: 'noise', filter: 4000, start: 0, dur: 0.03, gain: 0.12 },
    { kind: 'tone', wave: 'triangle', freq: 1760, start: 0.03, dur: 0.35, gain: 0.18 },
    { kind: 'tone', wave: 'sine', freq: 2349, start: 0.03, dur: 0.35, gain: 0.15 },
  ],
  // Pleasant two-note rise for high scores.
  good: [
    { kind: 'tone', wave: 'sine', freq: 660, start: 0, dur: 0.12, gain: 0.16 },
    { kind: 'tone', wave: 'sine', freq: 880, start: 0.12, dur: 0.18, gain: 0.18 },
  ],
  // Three falling notes for poor guesses.
  sad: [
    { kind: 'tone', wave: 'triangle', freq: 392, start: 0, dur: 0.14, gain: 0.16 },
    { kind: 'tone', wave: 'triangle', freq: 330, start: 0.14, dur: 0.14, gain: 0.16 },
    { kind: 'tone', wave: 'triangle', freq: 262, start: 0.28, dur: 0.14, gain: 0.16 },
  ],
  // Subtle click for UI buttons and quick actions.
  tick: [
    { kind: 'tone', wave: 'sine', freq: 1200, start: 0, dur: 0.025, gain: 0.12 },
  ],
};

/**
 * Return sound effect name appropriate for the guess result, or null if neutral.
 */
export function soundForResult(score, factor) {
  if (factor === 1) return 'cashbox';
  if (typeof score === 'number' && Number.isFinite(score)) {
    if (score >= 70) return 'good';
    if (score < 20) return 'sad';
  }
  return null;
}

const STORAGE_KEY = 'ne-kadardi-sound';

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

/**
 * Schedule a single synthesis step (tone or bandpassed noise) with attack/release envelopes.
 */
function scheduleStep(ctx, step, baseTime) {
  const startOffset = typeof step.start === 'number' && Number.isFinite(step.start)
    ? Math.max(0, step.start)
    : 0;
  const dur = typeof step.dur === 'number' && Number.isFinite(step.dur)
    ? Math.max(0.001, step.dur)
    : 0.05;
  const t0 = baseTime + startOffset;
  const t1 = t0 + dur;
  const peakGain = Math.min(0.25, Math.max(0, typeof step.gain === 'number' ? step.gain : 0.1));

  // Short attack and release ramps prevent audible clicks/pops.
  const attack = Math.min(0.005, dur * 0.2);
  const release = Math.min(0.015, dur * 0.3);

  const gainNode = ctx.createGain();
  const gainParam = gainNode?.gain;

  if (gainParam) {
    if (typeof gainParam.setValueAtTime === 'function') {
      gainParam.setValueAtTime(0, t0);
      if (typeof gainParam.linearRampToValueAtTime === 'function') {
        gainParam.linearRampToValueAtTime(peakGain, t0 + attack);
        const sustainEnd = Math.max(t0 + attack, t1 - release);
        gainParam.setValueAtTime(peakGain, sustainEnd);
        gainParam.linearRampToValueAtTime(0, t1);
      } else {
        gainParam.setValueAtTime(peakGain, t0);
      }
    } else {
      gainParam.value = peakGain;
    }
  }

  if (step.kind === 'noise') {
    const sampleRate = ctx.sampleRate || 44100;
    const sampleCount = Math.max(1, Math.floor(sampleRate * dur));
    const buffer = ctx.createBuffer(1, sampleCount, sampleRate);
    if (buffer && typeof buffer.getChannelData === 'function') {
      const channelData = buffer.getChannelData(0);
      if (channelData && typeof channelData.length === 'number') {
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] = Math.random() * 2 - 1;
        }
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    if (typeof step.filter === 'number' && typeof ctx.createBiquadFilter === 'function') {
      const filterNode = ctx.createBiquadFilter();
      filterNode.type = 'bandpass';
      if (filterNode.frequency) {
        if (typeof filterNode.frequency.setValueAtTime === 'function') {
          filterNode.frequency.setValueAtTime(step.filter, t0);
        } else {
          filterNode.frequency.value = step.filter;
        }
      }
      if (filterNode.Q) {
        filterNode.Q.value = 1;
      }
      source.connect(filterNode);
      filterNode.connect(gainNode);
    } else {
      source.connect(gainNode);
    }

    gainNode.connect(ctx.destination);
    if (typeof source.start === 'function') source.start(t0);
    if (typeof source.stop === 'function') source.stop(t1 + 0.05);
  } else {
    const osc = ctx.createOscillator();
    osc.type = step.wave || 'sine';
    if (typeof step.freq === 'number') {
      if (typeof osc.frequency?.setValueAtTime === 'function') {
        osc.frequency.setValueAtTime(step.freq, t0);
        if (typeof step.endFreq === 'number' && typeof osc.frequency.linearRampToValueAtTime === 'function') {
          osc.frequency.linearRampToValueAtTime(step.endFreq, t1);
        }
      } else if (osc.frequency) {
        osc.frequency.value = step.freq;
      }
    }

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    if (typeof osc.start === 'function') osc.start(t0);
    if (typeof osc.stop === 'function') osc.stop(t1 + 0.05);
  }
}

/**
 * Sound effects player managing Web Audio lifecycle and persistence.
 */
export function createSoundPlayer(options = {}) {
  const {
    storage = getDefaultStorage(),
    AudioContextCtor = getDefaultAudioContext(),
    now,
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

  function play(name) {
    if (!enabled) return false;
    if (!AudioContextCtor) return false;
    const plan = SOUND_PLANS[name];
    if (!plan || !Array.isArray(plan) || plan.length === 0) return false;

    try {
      if (!ctx) {
        ctx = new AudioContextCtor();
      }
      if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        const res = ctx.resume();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      }

      const baseTime = typeof now === 'function'
        ? now(ctx)
        : (typeof ctx?.currentTime === 'number' ? ctx.currentTime : 0);

      for (const step of plan) {
        scheduleStep(ctx, step, baseTime);
      }
      return true;
    } catch {
      // Audio errors must never crash caller logic.
      return false;
    }
  }

  return {
    isEnabled,
    setEnabled,
    toggle,
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
