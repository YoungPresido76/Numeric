import { MULTIVERSE_UNLOCK_WEAVES, SHARD_DIVISOR } from './data';
import type { GameState, MultiverseState } from './types';

export function createMultiverse(): MultiverseState {
  return { shards: 0, shardsEarned: 0, converges: 0 };
}

/**
 * The Multiverse opens after two Weaves and stays open: a Converge wipes the
 * Weave count, so having converged once is proof enough.
 */
export function multiverseUnlocked(state: GameState): boolean {
  return state.multiverse.converges > 0 || state.fabric.weaves >= MULTIVERSE_UNLOCK_WEAVES;
}

/** Shards a Converge pays for `threadsEarned` Threads drawn since the last one. */
export function shardsFor(threadsEarned: number): number {
  if (!(threadsEarned > 0)) return 0;
  return Math.floor(Math.sqrt(threadsEarned / SHARD_DIVISOR));
}

/** Threads that must have been drawn for a Converge to pay `shards` Shards. */
export function threadsForShards(shards: number): number {
  return shards * shards * SHARD_DIVISOR;
}

export interface ConvergePreview {
  /** Shards a Converge would pay right now. */
  shards: number;
  /** Threads drawn since the last Converge. */
  threads: number;
  /** Threads at which the current Shard count was reached. */
  previousAt: number;
  /** Threads needed for one more Shard. */
  nextAt: number;
}

export function convergePreview(state: GameState): ConvergePreview {
  const threads = state.fabric.threadsEarned;
  const shards = shardsFor(threads);
  return { shards, threads, previousAt: threadsForShards(shards), nextAt: threadsForShards(shards + 1) };
}

export function canConverge(state: GameState): boolean {
  return multiverseUnlocked(state) && shardsFor(state.fabric.threadsEarned) >= 1;
}
