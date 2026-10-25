// Animation setting. The phone's "reduce motion" switch is only the default: players can turn the
// game's animations back on (or off) themselves, and the choice is kept on this device.
// index.html sets <html data-motion> before first paint with the same rule as resolveMotion.

export const MOTION_KEY = 'ne-kadardi-motion';

/** 'full' or 'reduce': a saved choice wins, otherwise the system setting decides. */
export function resolveMotion(saved, systemReduce) {
  if (saved === 'full' || saved === 'reduce') return saved;
  return systemReduce ? 'reduce' : 'full';
}

/** True when animations should be skipped right now. */
export function reducedMotion(root = globalThis.document?.documentElement) {
  return root?.dataset?.motion === 'reduce';
}

/** Button text for the footer switch. */
export function motionLabel(mode) {
  return mode === 'reduce' ? 'Animasyonlar: kapalı' : 'Animasyonlar: açık';
}
