import { buyAutobuyer, toggleAutobuyer } from './autobuyers';
import { activateSurge, buyBuilding, buyUpgrade, collapse, derive, tap } from './engine';
import { buyDecoherence } from './fabric';
import {
  activateDilation,
  buyThreadUpgrade,
  installWormhole,
  resolveWaveforms,
  stitchTear,
  weave,
} from './fabricOps';
import { addNotes, neutralize, noteForPurchase, observe } from './lab';
import { converge } from './multiverseOps';
import { narrative, type Line } from './narrative';
import { buyResearch, isTreeComplete } from './research';
import { syncTutorial } from './tutorial';
import type { GameAction, GameState } from './types';

function apply(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'tap':
      return tap(state);
    case 'buy': {
      const next = buyBuilding(state, action.tier, action.amount);
      if (next === state) return state;
      return state.bought[action.tier] === 0 ? noteForPurchase(next, action.tier) : next;
    }
    case 'upgrade':
      return buyUpgrade(state, action.id);
    case 'research': {
      const next = buyResearch(state, action.tree, action.node);
      if (next === state) return state;
      const lines: Line[] = [];
      if (action.node === 'main') {
        lines.push(narrative.researchMain(action.tree, next.research[action.tree].main, next.lab.nextId));
      }
      if (isTreeComplete(next.research[action.tree]) && !isTreeComplete(state.research[action.tree])) {
        lines.push(narrative.researchComplete(action.tree));
      }
      return addNotes(next, lines);
    }
    case 'autoBuy': {
      const installing = !state.autobuyers[action.tier].owned;
      const next = buyAutobuyer(state, action.tier);
      if (next === state) return state;
      return installing ? addNotes(next, [narrative.autobuyerInstalled(action.tier)]) : next;
    }
    case 'autoToggle':
      return toggleAutobuyer(state, action.tier);
    case 'weave':
      return weave(state);
    case 'decoherence': {
      const next = buyDecoherence(state, action.tier);
      return next === state ? state : addNotes(next, [narrative.decoherence(action.tier)]);
    }
    case 'wormhole':
      return installWormhole(state, action.at);
    case 'dilate':
      return activateDilation(state);
    case 'stitch':
      return stitchTear(state, action.currency ?? 'threads');
    case 'converge':
      return converge(state);
    case 'threadUpgrade':
      return buyThreadUpgrade(state, action.id);
    case 'resolve':
      return resolveWaveforms(state);
    case 'surge':
      return activateSurge(state);
    case 'collapse':
      return collapse(state);
    case 'observe':
      return observe(state, action.target, derive(state).psPerSecond);
    case 'neutralize':
      return neutralize(state, action.id);
    case 'dismissSummary':
      return state.summary === null ? state : { ...state, summary: null };
    case 'setSound':
      return state.settings.sound === action.value
        ? state
        : { ...state, settings: { ...state.settings, sound: action.value } };
    case 'skipTutorial':
      return { ...state, tutorial: { ...state.tutorial, done: true } };
    case 'finishIntro':
      return state.introSeen ? state : { ...state, introSeen: true };
  }
}

/**
 * Pure game reducer. Returns the same object when an action had no effect,
 * so callers can use identity to tell whether a purchase succeeded.
 */
export function reduce(state: GameState, action: GameAction): GameState {
  const next = apply(state, action);
  return next === state ? state : syncTutorial(next);
}
