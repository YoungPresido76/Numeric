import {
  NO_RESEARCH_BONUSES,
  RESEARCH_MAIN_MAX,
  RESEARCH_STAGE_COST_MULT,
  RESEARCH_SUB_CAPS,
  RESEARCH_SUB_MAX,
  RESEARCH_TREES,
  RESEARCH_TREE_BY_ID,
  RESEARCH_UNLOCK_RUN,
  type ResearchEffect,
  type ResearchTreeDef,
} from './data';
import type {
  GameState,
  ResearchBonuses,
  ResearchNode,
  ResearchState,
  TreeId,
  TreeState,
} from './types';

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

export function createTreeState(): TreeState {
  return { main: 0, subs: [0, 0] };
}

export function createResearch(): ResearchState {
  return {
    grant: createTreeState(),
    observation: createTreeState(),
    calibration: createTreeState(),
  };
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

/** The most ranks a Sub-upgrade may hold while its Main upgrade is at `mainRank`. */
export function subCap(mainRank: number): number {
  if (mainRank >= RESEARCH_MAIN_MAX) return RESEARCH_SUB_MAX;
  return RESEARCH_SUB_CAPS[Math.max(0, mainRank)] ?? RESEARCH_SUB_MAX;
}

export function isTreeComplete(tree: TreeState): boolean {
  return tree.main >= RESEARCH_MAIN_MAX && tree.subs[0] >= RESEARCH_SUB_MAX && tree.subs[1] >= RESEARCH_SUB_MAX;
}

export function treesComplete(research: ResearchState): boolean {
  return RESEARCH_TREES.every((def) => isTreeComplete(research[def.id]));
}

/** The research section is shown once a lab has some funding behind it, or after any Collapse. */
export function isResearchUnlocked(state: GameState): boolean {
  return state.stats.collapses > 0 || state.runAmplitude >= RESEARCH_UNLOCK_RUN;
}

/** Amplitude cost of Main stage `mainRank + 1`: each stage costs 5 times the one before. */
export function mainCost(def: ResearchTreeDef, mainRank: number): number {
  return def.mainBaseCost * Math.pow(RESEARCH_STAGE_COST_MULT, mainRank);
}

/**
 * Amplitude cost of the next rank of a Sub-upgrade that holds `rank` ranks. It rises with every rank,
 * and again by the stage multiplier for each Main stage already bought, so the Subs that unlock the
 * next Main stage cost more than the ones before.
 */
export function subCost(def: ResearchTreeDef, sub: 0 | 1, rank: number, mainRank: number): number {
  const entry = def.subs[sub];
  return entry.baseCost * Math.pow(entry.costGrowth, rank) * Math.pow(RESEARCH_STAGE_COST_MULT, mainRank);
}

export type NodeStatus =
  /** Can be bought if the player has the funds. */
  | { kind: 'ready'; cost: number; rank: number; max: number }
  /** A Sub-upgrade at the current cap, waiting for the Main upgrade. */
  | { kind: 'capped'; rank: number; max: number }
  /** A Main upgrade whose Sub-upgrades are not yet at the cap. */
  | { kind: 'locked'; cost: number; rank: number; max: number; need: number }
  | { kind: 'maxed'; rank: number; max: number };

function subIndex(node: ResearchNode): 0 | 1 {
  return node === 'subA' ? 0 : 1;
}

export function nodeStatus(state: GameState, tree: TreeId, node: ResearchNode): NodeStatus {
  const def = RESEARCH_TREE_BY_ID[tree];
  const ranks = state.research[tree];

  if (node === 'main') {
    if (ranks.main >= RESEARCH_MAIN_MAX) return { kind: 'maxed', rank: ranks.main, max: RESEARCH_MAIN_MAX };
    const cost = mainCost(def, ranks.main);
    const need = subCap(ranks.main);
    if (ranks.subs[0] < need || ranks.subs[1] < need) {
      return { kind: 'locked', cost, rank: ranks.main, max: RESEARCH_MAIN_MAX, need };
    }
    return { kind: 'ready', cost, rank: ranks.main, max: RESEARCH_MAIN_MAX };
  }

  const index = subIndex(node);
  const rank = ranks.subs[index];
  const cap = subCap(ranks.main);
  if (rank >= RESEARCH_SUB_MAX) return { kind: 'maxed', rank, max: RESEARCH_SUB_MAX };
  if (rank >= cap) return { kind: 'capped', rank, max: cap };
  return { kind: 'ready', cost: subCost(def, index, rank, ranks.main), rank, max: cap };
}

/** True when any research node can be bought right now. Drives the tab badge. */
export function canAffordResearch(state: GameState): boolean {
  if (!isResearchUnlocked(state)) return false;
  for (const def of RESEARCH_TREES) {
    for (const node of ['main', 'subA', 'subB'] as const) {
      const status = nodeStatus(state, def.id, node);
      if (status.kind === 'ready' && state.amplitude >= status.cost) return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

interface Accumulator {
  output: number;
  costCut: number;
  observedPayout: number;
  tapFraction: number;
  surgeSeconds: number;
  taskTime: number;
  failureLoss: number;
  successStability: number;
}

function applyEffect(acc: Accumulator, effect: ResearchEffect, ranks: number): void {
  if (ranks <= 0) return;
  const amount = effect.per * ranks;
  switch (effect.kind) {
    case 'output':
      acc.output += amount;
      break;
    case 'costCut':
      acc.costCut += amount;
      break;
    case 'observedPayout':
      acc.observedPayout += amount;
      break;
    case 'tapFraction':
      acc.tapFraction += amount;
      break;
    case 'surgeSeconds':
      acc.surgeSeconds += amount;
      break;
    case 'taskTime':
      acc.taskTime += amount;
      break;
    case 'failureLoss':
      acc.failureLoss -= amount;
      break;
    case 'successStability':
      acc.successStability += amount;
      break;
  }
}

/** Sums every rank bought in every tree into one set of bonuses. */
export function researchBonuses(research: ResearchState): ResearchBonuses {
  const acc: Accumulator = { ...NO_RESEARCH_BONUSES };
  for (const def of RESEARCH_TREES) {
    const ranks = research[def.id];
    applyEffect(acc, def.mainEffect, ranks.main);
    applyEffect(acc, def.subs[0].effect, ranks.subs[0]);
    applyEffect(acc, def.subs[1].effect, ranks.subs[1]);
  }
  return {
    ...acc,
    failureLoss: Math.max(0, acc.failureLoss),
    costCut: Math.min(0.5, acc.costCut),
  };
}

/* ------------------------------------------------------------------ */
/* Purchases                                                           */
/* ------------------------------------------------------------------ */

function withRank(ranks: TreeState, node: ResearchNode): TreeState {
  if (node === 'main') return { ...ranks, main: ranks.main + 1 };
  const subs: [number, number] = [ranks.subs[0], ranks.subs[1]];
  subs[subIndex(node)] += 1;
  return { ...ranks, subs };
}

/**
 * Buys one rank of a research node with Amplitude. Returns the same state when
 * it cannot be bought. Notebook lines are added by the reducer.
 */
export function buyResearch(state: GameState, tree: TreeId, node: ResearchNode): GameState {
  if (!isResearchUnlocked(state)) return state;
  const status = nodeStatus(state, tree, node);
  if (status.kind !== 'ready' || !(state.amplitude >= status.cost)) return state;

  const research: ResearchState = { ...state.research, [tree]: withRank(state.research[tree], node) };
  return {
    ...state,
    amplitude: state.amplitude - status.cost,
    research,
    treesCleared: state.treesCleared || treesComplete(research),
  };
}
