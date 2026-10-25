// Animations play for everyone. With the phone's reduce-motion switch on the mode is 'gentle':
// CSS turns big movements into fades. index.html sets <html data-motion> before first paint.

/** 'gentle' when the system asks for less motion, else 'full'. */
export function resolveMotion(systemReduce) {
  return systemReduce ? 'gentle' : 'full';
}

/** True in gentle mode: JS skips only movement it controls itself (smooth scrolling). */
export function gentleMotion(root = globalThis.document?.documentElement) {
  return root?.dataset?.motion === 'gentle';
}