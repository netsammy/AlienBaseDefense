export function requestPointerLockSafely(canvas) {
  try {
    canvas.focus?.();
    const result = canvas.requestPointerLock?.();
    if (result?.catch) result.catch(() => {});
  } catch {
    // Pointer lock is optional and unsupported in some WebViews.
  }
}

