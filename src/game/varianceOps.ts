import { canStitch, stitchTear } from './fabricOps';
import { tearOpen } from './fabric';
import { addNote, draft } from './lab';
import { multiverseUnlocked } from './multiverse';
import { narrative } from './narrative';
import type { AutoStitchMode, GameState, VarianceId } from './types';
import { autoStitchUnlocked, enterBlock, VARIANCE_BY_ID } from './variance';

/**
 * Enters a Variance from the Convergence Chamber. Allowed only at the start of
 * a lab (nothing bought yet) and only while no other Variance is running.
 */
export function enterVariance(state: GameState, id: VarianceId): GameState {
  if (!multiverseUnlocked(state) || enterBlock(state, id) !== null) return state;
  const def = VARIANCE_BY_ID[id];
  const s = draft(state);
  s.multiverse = { ...s.multiverse, active: id, streak: 0 };
  addNote(s, narrative.varianceEntered(def.name, def.goal));
  return s;
}

/** Leaves the running Variance. The streak is lost; the lab carries on as a normal one. */
export function leaveVariance(state: GameState): GameState {
  const id = state.multiverse.active;
  if (id === null) return state;
  const s = draft(state);
  s.multiverse = { ...s.multiverse, active: null, streak: 0 };
  addNote(s, narrative.varianceLeft(VARIANCE_BY_ID[id].name));
  return s;
}

/** Sets the automatic stitching mode. Only available once the Entropy Paradox is cleared. */
export function setAutoStitch(state: GameState, mode: AutoStitchMode): GameState {
  if (!autoStitchUnlocked(state.multiverse) || state.multiverse.autoStitch === mode) return state;
  const s = draft(state);
  s.multiverse = { ...s.multiverse, autoStitch: mode };
  return s;
}

/**
 * Stitches an open Continuum Tear on its own: with Threads first, then with a
 * Shard when the mode allows it. Does nothing when no Tear is open or nothing is affordable.
 */
export function autoStitchTear(state: GameState): GameState {
  const mode = state.multiverse.autoStitch;
  if (mode === 'off' || !autoStitchUnlocked(state.multiverse) || !tearOpen(state)) return state;
  if (canStitch(state, 'threads')) return stitchTear(state, 'threads');
  if (mode === 'any' && canStitch(state, 'shards')) return stitchTear(state, 'shards');
  return state;
}
