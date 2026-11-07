// @ts-nocheck
/** Haptic (vibration) feedback with user-controlled toggle and intensity, saved on this device. */
export const HAPTIC_LEVELS = [
  { id: 'light', label: 'ملایم', ms: 5 },
  { id: 'medium', label: 'متوسط', ms: 10 },
  { id: 'strong', label: 'قوی', ms: 20 },
] as const;

class HapticManager {
  enabled = true;
  ms = 10;
  constructor() {
    try {
      const e = localStorage.getItem('hapticEnabled');
      if (e !== null) this.enabled = e === 'true';
      const m = parseInt(localStorage.getItem('hapticMs') || '', 10);
      if (!isNaN(m)) this.ms = m;
    } catch {}
  }
  isSupported() { return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'; }
  setEnabled(v: boolean) { this.enabled = v; try { localStorage.setItem('hapticEnabled', String(v)); } catch {} }
  setMs(ms: number) { this.ms = ms; try { localStorage.setItem('hapticMs', String(ms)); } catch {} }
  tap(force = false) {
    if ((!this.enabled && !force) || !this.isSupported()) return;
    try { navigator.vibrate(this.ms); } catch {}
  }
}
export const haptics = new HapticManager();
