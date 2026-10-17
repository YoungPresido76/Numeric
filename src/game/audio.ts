export type SfxName = 'tap' | 'buy' | 'upgrade' | 'surge' | 'collapse';

type OscType = 'sine' | 'triangle' | 'square' | 'sawtooth';

interface WebkitWindow {
  webkitAudioContext?: typeof AudioContext;
}

const TAP_NOTES: readonly number[] = [523.25, 587.33, 659.25, 783.99, 880];

/**
 * Tiny synthesized sound board. Nothing is downloaded, and the AudioContext is
 * only created after a user gesture, which is what mobile browsers require.
 */
class SoundBoard {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private tapIndex = 0;

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /** Call from a user gesture so audio is allowed to start. */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
  }

  play(name: SfxName): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const now = ctx.currentTime;

    switch (name) {
      case 'tap': {
        const note = TAP_NOTES[this.tapIndex % TAP_NOTES.length] ?? 523.25;
        this.tapIndex += 1;
        this.tone(ctx, note, now, 0.09, 'sine', 0.05);
        break;
      }
      case 'buy':
        this.tone(ctx, 440, now, 0.08, 'triangle', 0.06);
        this.tone(ctx, 660, now + 0.06, 0.1, 'triangle', 0.06);
        break;
      case 'upgrade':
        this.tone(ctx, 523.25, now, 0.1, 'sine', 0.06);
        this.tone(ctx, 659.25, now + 0.08, 0.1, 'sine', 0.06);
        this.tone(ctx, 783.99, now + 0.16, 0.18, 'sine', 0.06);
        break;
      case 'surge':
        this.tone(ctx, 180, now, 0.5, 'sawtooth', 0.035, 900);
        this.tone(ctx, 360, now, 0.5, 'sine', 0.04, 1800);
        break;
      case 'collapse':
        this.tone(ctx, 900, now, 0.9, 'sine', 0.06, 90);
        this.tone(ctx, 90, now + 0.2, 0.9, 'triangle', 0.05, 540);
        break;
    }
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor: typeof AudioContext | undefined =
      typeof AudioContext !== 'undefined'
        ? AudioContext
        : (window as unknown as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  private tone(
    ctx: AudioContext,
    frequency: number,
    start: number,
    duration: number,
    type: OscType,
    peak: number,
    endFrequency?: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}

export const sound = new SoundBoard();
