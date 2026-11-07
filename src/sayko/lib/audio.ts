// @ts-nocheck
/**
 * High-performance, zero-latency Web Audio sound effects manager.
 * Provides tactile click/pop feedback with user-controlled volume and toggle.
 */

class SoundManager {
  private static instance: SoundManager;
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private soundVolume: number = 0.5; // 0.0 to 1.0
  private lastPlayTime: number = 0;

  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedEnabled = localStorage.getItem('soundEnabled');
        this.soundEnabled = savedEnabled !== null ? savedEnabled === 'true' : true;

        const savedVol = localStorage.getItem('soundVolume');
        this.soundVolume = savedVol !== null ? Math.min(1, Math.max(0, parseFloat(savedVol))) : 0.5;
      } catch (e) {
        this.soundEnabled = true;
        this.soundVolume = 0.5;
      }
    }
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch (e) {
      // AudioContext guarded
    }
    return this.audioCtx;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('soundEnabled', String(enabled));
    } catch {}
  }

  public getVolume(): number {
    return this.soundVolume;
  }

  public setVolume(volume: number): void {
    this.soundVolume = Math.min(1, Math.max(0, volume));
    try {
      localStorage.setItem('soundVolume', String(this.soundVolume));
    } catch {}
  }

  /**
   * Subtle, soft, short UI click/tick sound (35-45ms duration)
   */
  public playClick(): void {
    if (!this.soundEnabled || this.soundVolume <= 0) return;

    // Debounce rapid double events (e.g., label + input or nested svg bubbles)
    const nowMs = Date.now();
    if (nowMs - this.lastPlayTime < 28) return;
    this.lastPlayTime = nowMs;

    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      const vol = this.soundVolume * 0.22; // crisp, pleasant, audible

      // Soft mechanical pop/tick frequency drop
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.038);

      // Instant attack, smooth exponential decay
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Audio playback silently guarded
    }
  }

  /**
   * Slightly brighter tone for horse selection / checkbox toggles
   */
  public playSelect(): void {
    if (!this.soundEnabled || this.soundVolume <= 0) return;

    const nowMs = Date.now();
    if (nowMs - this.lastPlayTime < 28) return;
    this.lastPlayTime = nowMs;

    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      const vol = this.soundVolume * 0.25;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.05);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  /**
   * Pleasant ascending chord tone for success events
   */
  public playSuccess(): void {
    if (!this.soundEnabled || this.soundVolume <= 0) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.04;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);
        gain.gain.setValueAtTime(this.soundVolume * 0.18, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + 0.13);
      });
    } catch (e) {}
  }

  /**
   * Subtle alert / rejection tone
   */
  public playAlert(): void {
    if (!this.soundEnabled || this.soundVolume <= 0) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [340, 260].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.05;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteStart);
        gain.gain.setValueAtTime(this.soundVolume * 0.15, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + 0.08);
      });
    } catch (e) {}
  }
}

export const sound = SoundManager.getInstance();
