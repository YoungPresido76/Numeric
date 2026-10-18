import {
  ANCESTRAL_COST,
  DILATION_COST,
  DILATION_SECONDS,
  TAPPING_COST,
  WAVE_EXP_FAST,
  WAVE_EXP_SLOW,
  WAVE_MAX,
  WAVE_MIN,
  WAVE_RATE_FULL,
  WAVE_SETBACK_CHANCE,
  WAVE_SETBACK_STABILITY,
  WORMHOLE_BASE,
  WORMHOLE_CAP,
  WORMHOLE_COST,
  WORMHOLE_MAX_POINT,
  WORMHOLE_MIN_SECONDS,
} from './data';
import { closeLab, derive } from './engine';
import { amplitudeForThreads, fabricUnlocked, threadsFor } from './fabric';
import { addNote, draft, random, riskMultiplier, shiftStability, zoneOf } from './lab';
import { clamp, clampFinite, formatNumber } from './math';
import { narrative } from './narrative';
import type { GameState, History, ThreadUpgradeId } from './types';

/* ------------------------------------------------------------------ */
/* Weave                                                               */
/* ------------------------------------------------------------------ */

export interface WeavePreview {
  /** Threads the lab would pay if woven now. */
  threads: number;
  /** Risk multiplier already counted in `threads`. */
  mult: number;
  /** Run amplitude at which the current Thread count was reached. */
  previousAt: number;
  /** Run amplitude needed for one more Thread. */
  nextAt: number;
}

export function weavePreview(state: GameState): WeavePreview {
  const mult = riskMultiplier(state.lab.minStability);
  const threads = threadsFor(state.runAmplitude, mult);
  return {
    threads,
    mult,
    previousAt: threads > 0 ? amplitudeForThreads(threads, mult) : 0,
    nextAt: amplitudeForThreads(threads + 1, mult),
  };
}

export function canWeave(state: GameState): boolean {
  return fabricUnlocked(state) && weavePreview(state).threads >= 1;
}

/** Closes the lab for Threads instead of Echoes. */
export function weave(state: GameState): GameState {
  if (!canWeave(state)) return state;
  return closeLab(state, 'woven');
}

/* ------------------------------------------------------------------ */
/* Temporal Wormhole                                                   */
/* ------------------------------------------------------------------ */

export type WormholeBlock = 'used' | 'young' | 'poor';

export interface WormholePreview {
  /** Share of the Amplitude produced since the chosen point that is paid back. */
  fraction: number;
  /** Amplitude produced since the chosen point. */
  since: number;
  /** Amplitude paid at install. */
  gain: number;
}

/** Share of the lab's production that came after `at`, a fraction of the run so far. */
function shareAfter(history: History, at: number): number {
  const samples = history.samples;
  const total = samples.reduce((sum, sample) => sum + sample.ps, 0);
  if (samples.length === 0 || !(total > 0)) return 1 - at;
  const position = at * samples.length;
  const whole = Math.min(samples.length, Math.floor(position));
  let before = 0;
  for (let i = 0; i < whole; i += 1) before += samples[i]?.ps ?? 0;
  if (whole < samples.length) before += (position - whole) * (samples[whole]?.ps ?? 0);
  return clamp(1 - before / total, 0, 1);
}

/** Why a Wormhole cannot be installed right now, or null when it can. */
export function wormholeBlock(state: GameState): WormholeBlock | null {
  if (state.fabric.wormholeUsed) return 'used';
  if (state.lab.run.seconds < WORMHOLE_MIN_SECONDS) return 'young';
  if (!(state.fabric.threads >= WORMHOLE_COST)) return 'poor';
  return null;
}

/**
 * What a Wormhole installed at `at` (0 = the start of the lab, 1 = now) would pay.
 * The share is WORMHOLE_BASE x (time since the point / run length so far), capped.
 */
export function wormholePreview(state: GameState, at: number): WormholePreview {
  const point = clamp(at, 0, WORMHOLE_MAX_POINT);
  const fraction = Math.min(WORMHOLE_CAP, WORMHOLE_BASE * (1 - point));
  const since = state.runAmplitude * shareAfter(state.history, point);
  return { fraction, since, gain: clampFinite(since * fraction) };
}

export function installWormhole(state: GameState, at: number): GameState {
  if (!fabricUnlocked(state) || wormholeBlock(state) !== null) return state;
  const { gain } = wormholePreview(state, at);
  const s = draft(state);
  s.amplitude = clampFinite(s.amplitude + gain);
  s.runAmplitude = clampFinite(s.runAmplitude + gain);
  s.stats.totalAmplitude = clampFinite(s.stats.totalAmplitude + gain);
  s.fabric = { ...s.fabric, threads: s.fabric.threads - WORMHOLE_COST, wormholeUsed: true };
  addNote(s, narrative.wormhole(formatNumber(gain)));
  return s;
}

/* ------------------------------------------------------------------ */
/* Dilated Time                                                        */
/* ------------------------------------------------------------------ */

export function canDilate(state: GameState): boolean {
  return (
    fabricUnlocked(state) && state.fabric.dilation.activeLeft <= 0 && state.fabric.threads >= DILATION_COST
  );
}

/** Pays Threads for a window of faster Qubits and faster-draining stability. */
export function activateDilation(state: GameState): GameState {
  if (!canDilate(state)) return state;
  const s = draft(state);
  s.fabric = {
    ...s.fabric,
    threads: s.fabric.threads - DILATION_COST,
    dilation: { activeLeft: DILATION_SECONDS },
  };
  addNote(s, narrative.dilation());
  return s;
}

/* ------------------------------------------------------------------ */
/* Superposition Tapping and Ancestral Legacy                          */
/* ------------------------------------------------------------------ */

export const THREAD_UPGRADE_COST: Readonly<Record<ThreadUpgradeId, number>> = {
  tapping: TAPPING_COST,
  ancestral: ANCESTRAL_COST,
};

export function ownsThreadUpgrade(state: GameState, id: ThreadUpgradeId): boolean {
  return id === 'tapping' ? state.fabric.tapping : state.fabric.ancestral;
}

export function buyThreadUpgrade(state: GameState, id: ThreadUpgradeId): GameState {
  if (!fabricUnlocked(state) || ownsThreadUpgrade(state, id)) return state;
  const cost = THREAD_UPGRADE_COST[id];
  if (!(state.fabric.threads >= cost)) return state;
  const fabric = {
    ...state.fabric,
    threads: state.fabric.threads - cost,
    tapping: id === 'tapping' ? true : state.fabric.tapping,
    ancestral: id === 'ancestral' ? true : state.fabric.ancestral,
  };
  const s = draft({ ...state, fabric });
  addNote(s, id === 'tapping' ? narrative.tapping() : narrative.ancestral());
  return s;
}

/* ------------------------------------------------------------------ */
/* Observing waveforms                                                 */
/* ------------------------------------------------------------------ */

/** Chance that observing now collapses into an Instability Setback. */
export function setbackChance(state: GameState): number {
  return WAVE_SETBACK_CHANCE[zoneOf(state.lab.stability)];
}

/** How far recent tapping tilts the burst curve toward big results, 0 to 1. */
export function waveWeight(state: GameState): number {
  return clamp(state.fabric.tapRate / WAVE_RATE_FULL, 0, 1);
}

/**
 * Observes every Unresolved Waveform at once. The burst is waveforms x tap gain x
 * a multiplier drawn from a curve that favours big results the faster the player
 * has been tapping. At a poor moment (any zone but Stable) it may collapse into
 * an Instability Setback instead, which costs the waveforms and some stability.
 */
export function resolveWaveforms(state: GameState): GameState {
  if (!state.fabric.tapping || state.fabric.waveforms < 1) return state;
  const s = draft(state);
  const zone = zoneOf(s.lab.stability);
  const count = Math.floor(s.fabric.waveforms);

  if (random(s) < WAVE_SETBACK_CHANCE[zone]) {
    s.fabric = { ...s.fabric, waveforms: 0, tapRate: 0 };
    shiftStability(s, -WAVE_SETBACK_STABILITY, null);
    addNote(s, narrative.waveSetback(zone));
    return s;
  }

  const exponent = WAVE_EXP_SLOW + (WAVE_EXP_FAST - WAVE_EXP_SLOW) * waveWeight(s);
  const mult = WAVE_MIN + (WAVE_MAX - WAVE_MIN) * Math.pow(random(s), exponent);
  const gain = clampFinite(count * derive(s).tapGain * mult);
  s.amplitude = clampFinite(s.amplitude + gain);
  s.runAmplitude = clampFinite(s.runAmplitude + gain);
  s.stats.totalAmplitude = clampFinite(s.stats.totalAmplitude + gain);
  s.lab.run.tapped += gain;
  s.fabric = { ...s.fabric, waveforms: 0 };
  addNote(s, narrative.waveResolved(formatNumber(gain), count));
  return s;
}
