import {
  BUILDINGS,
  DECOHERENCE_BASE_COST,
  DECOHERENCE_MAX,
  DECOHERENCE_STEP,
  ECHO_MEMORY_FRACTION,
  FABRIC_UNLOCK_ECHOES,
  SYMMETRIC_AURA,
  SYMMETRIC_MAX,
  TEAR_BASE_COST,
  TEAR_LAYER_BONUS,
  TEAR_LAYER_CAP,
  THREAD_DIVISOR,
  WAVE_RATE_TAU,
  WAVE_STORE_CAP,
  ZONE_STABLE_MIN,
  ZONE_STRAINED_MIN,
} from './data';
import type { FabricState, GameState, LabOutcome, LabPeak, Quad, Tier } from './types';

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

export function createFabric(): FabricState {
  return {
    threads: 0,
    threadsEarned: 0,
    weaves: 0,
    decoherence: [0, 0, 0, 0],
    tapping: false,
    ancestral: false,
    wormholeUsed: false,
    dilation: { activeLeft: 0 },
    waveforms: 0,
    tapRate: 0,
    recentLabs: [],
    pairs: 0,
    bestEchoes: 0,
    tears: 0,
    shattered: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

/** Fabric opens once enough Echoes have been earned, whether or not they are still unspent. */
export function fabricUnlocked(state: GameState): boolean {
  return state.echoesEarned >= FABRIC_UNLOCK_ECHOES;
}

/** Threads a lab that produced `runAmplitude` would pay when woven, with the risk multiplier applied. */
export function threadsFor(runAmplitude: number, riskMult: number): number {
  if (!(runAmplitude > 0)) return 0;
  return Math.floor(Math.sqrt(runAmplitude / THREAD_DIVISOR) * riskMult);
}

/** Run amplitude needed to weave `threads` Threads at a given risk multiplier. */
export function amplitudeForThreads(threads: number, riskMult: number): number {
  const base = threads / riskMult;
  return base * base * THREAD_DIVISOR;
}

/* ------------------------------------------------------------------ */
/* Cost Decoherence                                                    */
/* ------------------------------------------------------------------ */

/** Cost growth of a tier after the Cost Decoherence bought for it. */
export function growthFor(fabric: FabricState, tier: Tier): number {
  return BUILDINGS[tier].costGrowth - DECOHERENCE_STEP[tier] * fabric.decoherence[tier];
}

export function growthOf(fabric: FabricState): Quad {
  return [growthFor(fabric, 0), growthFor(fabric, 1), growthFor(fabric, 2), growthFor(fabric, 3)];
}

/** Thread cost of the next Cost Decoherence for a tier, or null when the tier is done. */
export function decoherenceCost(fabric: FabricState, tier: Tier): number | null {
  const owned = fabric.decoherence[tier];
  if (owned >= DECOHERENCE_MAX) return null;
  return DECOHERENCE_BASE_COST[tier] * Math.pow(2, owned);
}

export function buyDecoherence(state: GameState, tier: Tier): GameState {
  const cost = decoherenceCost(state.fabric, tier);
  if (cost === null || !(state.fabric.threads >= cost)) return state;
  const decoherence: Quad = [...state.fabric.decoherence];
  decoherence[tier] += 1;
  return { ...state, fabric: { ...state.fabric, threads: state.fabric.threads - cost, decoherence } };
}

/* ------------------------------------------------------------------ */
/* Ancestral Legacy                                                    */
/* ------------------------------------------------------------------ */

/** Echo Memory: the extra Echoes every Collapse pays once Ancestral Legacy is owned. */
export function echoMemory(fabric: FabricState): number {
  if (!fabric.ancestral || !(fabric.bestEchoes > 0)) return 0;
  return Math.round(fabric.bestEchoes * ECHO_MEMORY_FRACTION);
}

/** Production multiplier from Symmetric Pairs. */
export function pairAura(fabric: FabricState): number {
  return 1 + SYMMETRIC_AURA * Math.min(fabric.pairs, SYMMETRIC_MAX);
}

/* ------------------------------------------------------------------ */
/* Continuum Tear                                                      */
/* ------------------------------------------------------------------ */

/** Production multiplier from Shattered Reality Layers. */
export function shatterMult(fabric: FabricState): number {
  return 1 + TEAR_LAYER_BONUS * Math.min(fabric.shattered, TEAR_LAYER_CAP);
}

/** Thread cost of stitching a Tear closed. Rises with every layer already earned. */
export function tearCost(fabric: FabricState): number {
  return TEAR_BASE_COST + Math.min(fabric.shattered, TEAR_LAYER_CAP);
}

/**
 * A Tear is open while the last-chance window runs and Fabric is unlocked. If the
 * window runs out unstitched the lab falls into the black hole as before.
 */
export function tearOpen(state: GameState): boolean {
  return fabricUnlocked(state) && state.lab.grace > 0;
}

/** How a lab ended, judged by its lowest stability. */
export function peakOf(outcome: LabOutcome, minStability: number): LabPeak {
  if (outcome === 'blackHole') return 'collapsed';
  if (minStability >= ZONE_STABLE_MIN) return 'stable';
  if (minStability < ZONE_STRAINED_MIN) return 'survived';
  return 'strained';
}

/** One lab that stayed Stable throughout and one that survived Critical. */
export function isSymmetricPair(recent: readonly LabPeak[]): boolean {
  return recent.length === 2 && recent.includes('stable') && recent.includes('survived');
}

export interface FabricClose {
  fabric: FabricState;
  /** True when this Weave formed a Symmetric Pair. */
  paired: boolean;
}

/**
 * Updates Fabric when a lab closes: banks Threads from a Weave, remembers how
 * the lab ended, and forms a Symmetric Pair on a Weave when the last two labs
 * qualify. The lab-scoped parts of Fabric reset with the lab.
 */
export function closeFabric(
  fabric: FabricState,
  close: { outcome: LabOutcome; minStability: number; echoes: number; threads: number },
): FabricClose {
  const woven = close.outcome === 'woven';
  let recent = [...fabric.recentLabs, peakOf(close.outcome, close.minStability)].slice(-2);
  let pairs = fabric.pairs;
  let paired = false;
  if (woven && fabric.ancestral && pairs < SYMMETRIC_MAX && isSymmetricPair(recent)) {
    pairs += 1;
    paired = true;
    recent = [];
  }
  return {
    paired,
    fabric: {
      ...fabric,
      threads: fabric.threads + close.threads,
      threadsEarned: fabric.threadsEarned + close.threads,
      weaves: fabric.weaves + (woven ? 1 : 0),
      wormholeUsed: false,
      dilation: { activeLeft: 0 },
      waveforms: 0,
      tapRate: 0,
      recentLabs: recent,
      pairs,
      bestEchoes: Math.max(fabric.bestEchoes, close.echoes),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Time and taps                                                       */
/* ------------------------------------------------------------------ */

/** Runs the Dilated Time clock down and lets the recent tap rate fade. Returns the same object when idle. */
export function tickFabric(fabric: FabricState, dt: number): FabricState {
  const dilating = fabric.dilation.activeLeft > 0;
  const tapping = fabric.tapRate > 0;
  if (!dilating && !tapping) return fabric;
  const decayed = fabric.tapRate * Math.exp(-dt / WAVE_RATE_TAU);
  return {
    ...fabric,
    dilation: dilating ? { activeLeft: Math.max(0, fabric.dilation.activeLeft - dt) } : fabric.dilation,
    tapRate: decayed < 0.001 ? 0 : decayed,
  };
}

/** A tap under Superposition Tapping: one more Unresolved Waveform, and a nudge to the tap rate. */
export function addWaveform(fabric: FabricState): FabricState {
  return {
    ...fabric,
    waveforms: Math.min(WAVE_STORE_CAP, fabric.waveforms + 1),
    tapRate: fabric.tapRate + 1 / WAVE_RATE_TAU,
  };
}
