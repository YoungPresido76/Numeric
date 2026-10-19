import {
  ENTROPY_DRAIN_MULT,
  ENTROPY_PASSIVE_DRAIN,
  ENTROPY_REWARD_SHARDS,
  ENTROPY_SUCCESS_MULT,
  ENTROPY_TASK_CLOCK,
  VARIANCE_GOAL,
} from './data';
import type { GameState, MultiverseState, VarianceId } from './types';

export interface VarianceDef {
  id: VarianceId;
  name: string;
  /** The Shard flavour this Variance pays. A label only: there is one Shard currency. */
  shardLabel: string;
  tagline: string;
  /** What changes while it runs. */
  rules: readonly string[];
  victory: string;
  goal: number;
  rewardShards: number;
  /** What clearing it unlocks, in words. */
  unlocks: string;
}

export const VARIANCES: readonly VarianceDef[] = [
  {
    id: 'entropy',
    name: 'The Entropy Paradox',
    shardLabel: 'Chrono-Shards',
    tagline: 'Everything decays faster, and making ψ makes it worse.',
    rules: [
      `Stability drains ${ENTROPY_DRAIN_MULT}× faster.`,
      'Passive production itself bleeds stability, more the faster you produce.',
      `Experiment clocks are ${Math.round((ENTROPY_TASK_CLOCK - 1) * 100)}% longer.`,
      `A completed experiment restores ${ENTROPY_SUCCESS_MULT}× the stability.`,
    ],
    victory: `Close ${VARIANCE_GOAL} labs inside it without a single black hole.`,
    goal: VARIANCE_GOAL,
    rewardShards: ENTROPY_REWARD_SHARDS,
    unlocks: 'Automated stitching of Continuum Tears.',
  },
];

export const VARIANCE_BY_ID: Readonly<Record<VarianceId, VarianceDef>> = {
  entropy: VARIANCES[0] as VarianceDef,
};

/** What the running Variance changes about the lab. All neutral when none is active. */
export interface VarianceMods {
  /** Multiplier on stability drained by open failures and Dilated Time. */
  drainMult: number;
  /** Stability lost per second from production alone, given ψ/s. */
  passiveDrain: (ps: number) => number;
  /** Multiplier on every experiment clock. */
  taskClock: number;
  /** Multiplier on stability restored by a completed experiment. */
  successMult: number;
}

const NEUTRAL: VarianceMods = { drainMult: 1, passiveDrain: () => 0, taskClock: 1, successMult: 1 };

const ENTROPY: VarianceMods = {
  drainMult: ENTROPY_DRAIN_MULT,
  passiveDrain: (ps) => (ps > 1 ? ENTROPY_PASSIVE_DRAIN * Math.log10(ps) : 0),
  taskClock: ENTROPY_TASK_CLOCK,
  successMult: ENTROPY_SUCCESS_MULT,
};

export function varianceMods(active: VarianceId | null): VarianceMods {
  return active === 'entropy' ? ENTROPY : NEUTRAL;
}

export function isVarianceId(value: unknown): value is VarianceId {
  return value === 'entropy';
}

export type EnterBlock = 'running' | 'cleared' | 'started';

/** Why a Variance cannot be entered right now, or null when it can. Entry is only at the start of a lab. */
export function enterBlock(state: GameState, id: VarianceId): EnterBlock | null {
  if (state.multiverse.cleared.includes(id)) return 'cleared';
  if (state.multiverse.active !== null) return 'running';
  if (state.bought.some((count) => count > 0)) return 'started';
  return null;
}

/** Automatic Tear stitching is unlocked by clearing the Entropy Paradox. */
export function autoStitchUnlocked(multiverse: MultiverseState): boolean {
  return multiverse.cleared.includes('entropy');
}

export interface VarianceClose {
  multiverse: MultiverseState;
  /** The Variance this lab cleared. */
  cleared: VarianceId | null;
  /** A black hole ended the streak. */
  broken: boolean;
}

/**
 * Updates the chamber when a lab closes. Any ending but a black hole adds to the
 * streak; a black hole resets it. Reaching the goal clears the Variance, pays its
 * Shards and leaves the chamber.
 */
export function closeVariance(multiverse: MultiverseState, blackHole: boolean): VarianceClose {
  const id = multiverse.active;
  if (id === null) return { multiverse, cleared: null, broken: false };
  if (blackHole) return { multiverse: { ...multiverse, streak: 0 }, cleared: null, broken: multiverse.streak > 0 };

  const def = VARIANCE_BY_ID[id];
  const streak = multiverse.streak + 1;
  if (streak < def.goal) return { multiverse: { ...multiverse, streak }, cleared: null, broken: false };
  return {
    cleared: id,
    broken: false,
    multiverse: {
      ...multiverse,
      active: null,
      streak: 0,
      cleared: multiverse.cleared.includes(id) ? multiverse.cleared : [...multiverse.cleared, id],
      shards: multiverse.shards + def.rewardShards,
      shardsEarned: multiverse.shardsEarned + def.rewardShards,
    },
  };
}
