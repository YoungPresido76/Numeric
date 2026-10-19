import { closeLab } from './engine';
import { canConverge } from './multiverse';
import type { GameState } from './types';

/**
 * Converges the Fabric into Shards. Closes the lab with no Echoes and wipes
 * every part of the Fabric: Threads, Thread upgrades, Cost Decoherence, pairs and layers.
 */
export function converge(state: GameState): GameState {
  if (!canConverge(state)) return state;
  return closeLab(state, 'converged');
}
