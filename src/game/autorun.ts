import { AUTOBUYER_INTERVAL, AUTOBUYER_MAX_TRIGGERS } from './data';
import { autobuyerAmount } from './autobuyers';
import { buildingCost, isTierVisible, maxAffordable, derive } from './engine';
import type { GameState, Quad, Tier } from './types';

/** Highest tier first, so a cheap Max autobuyer cannot starve the expensive ones. */
const ORDER: readonly Tier[] = [3, 2, 1, 0];

/**
 * Which purchases would break a running experiment. A hold task fails on any
 * purchase; an earn task can forbid one tier. Autobuyers wait instead of
 * costing the lab a failure.
 */
function blockedTiers(state: GameState): ReadonlySet<Tier> {
  const blocked = new Set<Tier>();
  for (const experiment of state.lab.experiments) {
    const task = experiment.task;
    if (task.kind === 'hold') return new Set<Tier>([0, 1, 2, 3]);
    if (task.kind === 'earn' && task.forbid !== null) blocked.add(task.forbid);
  }
  return blocked;
}

/** One trigger: every enabled autobuyer buys what it can afford, up to its amount. */
function trigger(state: GameState): GameState {
  const { costDiscount: discount, growth } = derive(state);
  const blocked = blockedTiers(state);
  let amplitude = state.amplitude;
  const bought: Quad = [...state.bought];
  let changed = false;

  for (const tier of ORDER) {
    const autobuyer = state.autobuyers[tier];
    if (!autobuyer.owned || !autobuyer.enabled || blocked.has(tier)) continue;
    // A project must be visible, and so unlocked by the player, before it can be automated.
    if (!isTierVisible({ ...state, bought }, tier)) continue;

    const owned = bought[tier];
    const fit = maxAffordable(tier, owned, amplitude, discount, growth[tier]);
    const wanted = autobuyerAmount(autobuyer.level);
    const count = wanted === 'max' ? fit : Math.min(wanted, fit);
    if (count < 1) continue;
    const cost = buildingCost(tier, owned, count, discount, growth[tier]);
    if (!(cost <= amplitude)) continue;
    amplitude -= cost;
    bought[tier] = owned + count;
    changed = true;
  }

  return changed ? { ...state, amplitude, bought } : state;
}

/** Tiers that went from none to some between two states, for the first-purchase notebook line. */
export function newlyOwned(before: GameState, after: GameState): Tier[] {
  return ([0, 1, 2, 3] as const).filter((tier) => before.bought[tier] === 0 && after.bought[tier] > 0);
}

/**
 * Advances the autobuyer clock by `dt` seconds and runs every trigger that
 * came due. Only live play calls this: autobuyers do not run offline.
 */
export function runAutobuyers(state: GameState, dt: number): GameState {
  if (!state.autobuyers.some((a) => a.owned && a.enabled)) {
    return state.autoClock === 0 ? state : { ...state, autoClock: 0 };
  }
  let clock = state.autoClock + dt;
  let next = state;
  let triggers = 0;
  while (clock >= AUTOBUYER_INTERVAL && triggers < AUTOBUYER_MAX_TRIGGERS) {
    clock -= AUTOBUYER_INTERVAL;
    triggers += 1;
    next = trigger(next);
  }
  if (clock >= AUTOBUYER_INTERVAL) clock = 0;
  return { ...next, autoClock: clock };
}
