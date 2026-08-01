/**
 * Temporary development-only device label for debugging cross-device sync.
 * Does not expose hardware identifiers or sensitive device IDs.
 */
let _debugDeviceId: string | null = null;

export const getDeviceId = (): string => {
  if (!_debugDeviceId) {
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    _debugDeviceId = `Device-${randomHex}`;
  }
  return _debugDeviceId;
};

export const setDebugDeviceId = (label: string): void => {
  _debugDeviceId = label;
};
