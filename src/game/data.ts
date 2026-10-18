import type { BuildingDef, ProjectTier, Tier, Triple, UpgradeDef, UpgradeId, Zone } from './types';

export const SAVE_KEY = 'numeric.save.v1';
export const SAVE_VERSION = 2;

export const TIERS: readonly Tier[] = [0, 1, 2, 3];
export const PROJECT_TIERS: readonly ProjectTier[] = [1, 2, 3];

/** Amplitude a fresh lab starts with: enough for the first Qubit. */
export const START_AMPLITUDE = 10;

/** Per tier: owning this many doubles that building's output. Qubit and Gate get a fourth step. */
export const MILESTONES: readonly (readonly number[])[] = [
  [10, 25, 50, 100],
  [10, 25, 50, 100],
  [10, 25, 50],
  [10, 25, 50],
];

/**
 * Superposition Surge: multiplies Amplitude output while active, and lets any
 * experiment be observed instantly (with the observation bonus) at any age.
 */
export const SURGE_MULT = 2;
export const SURGE_BASE_DURATION = 10;
export const SURGE_BASE_COOLDOWN = 45;

/** Each tap grants 1 + (this fraction × current ψ/s). */
export const BASE_TAP_FRACTION = 0.01;

/** Offline progress. */
export const BASE_OFFLINE_EFFICIENCY = 0.5;
export const OFFLINE_CAP_SECONDS = 8 * 60 * 60;
/** A gap longer than this between ticks counts as time away. */
export const AWAY_THRESHOLD_SECONDS = 5;
/** Away time shorter than this is applied silently, without the welcome-back card. */
export const AWAY_REPORT_SECONDS = 30;

/** Collapse: base Echoes = floor(sqrt(runAmplitude / ECHO_DIVISOR)). */
export const ECHO_DIVISOR = 2e11;
export const ECHO_BONUS_EACH = 0.1;
export const ECHO_DISCOUNT_EACH = 0.005;
export const ECHO_DISCOUNT_CAP = 0.3;

/* ------------------------------------------------------------------ */
/* Lab: experiments, stability and risk                                */
/* ------------------------------------------------------------------ */

export const STABILITY_MAX = 100;
/** Zone floors: stability at or above the value is in that zone. */
export const ZONE_STABLE_MIN = 70;
export const ZONE_STRAINED_MIN = 40;
export const ZONE_CRITICAL_MIN = 15;
/** Seconds the player has to recover once stability falls below the Critical floor. */
export const GRACE_SECONDS = 20;

/** Seconds between experiments for each project once it is online: [min, max]. Higher tiers run more often. */
export const SPAWN_RANGE: readonly (readonly [number, number])[] = [
  [180, 300],
  [150, 260],
  [120, 220],
];
/** A completed task releases this many seconds of current production as funding. */
export const SUCCESS_PAYOUT_SECONDS = 15;
export const SUCCESS_STABILITY = 5;

/** Task shapes. Limits are seconds on the clock. */
export const TASK_EARN_LIMIT = 30;
/** The earn target is this multiple of what passive production alone would give. */
export const TASK_EARN_FACTOR = 1.15;
export const TASK_EARN_MIN = 50;
/** Chance that an earn task also forbids funding one tier you own. */
export const TASK_FORBID_CHANCE = 0.4;
export const TASK_FUND_LIMIT = 45;
export const TASK_TAP_LIMIT = 20;
export const TASK_TAP_COUNT = 25;
export const TASK_HOLD_LIMIT = 25;
/** Relative odds of each task. Fund is only offered when something is within reach. */
export const TASK_WEIGHTS = { earn: 3, fund: 3, tap: 2, hold: 2 } as const;
/** Seconds of a stable run between unprompted notebook lines. */
export const IDLE_NOTE_SECONDS = 150;

/** A failure takes this fraction of current Amplitude and this much stability. */
export const FAIL_LOSS_MIN = 0.08;
export const FAIL_LOSS_MAX = 0.15;
export const FAIL_STABILITY_MIN = 10;
export const FAIL_STABILITY_MAX = 20;

/** Seconds to neutralize a failure before it festers. */
export const NEUTRALIZE_WINDOW = 90;
export const NEUTRALIZE_COST_FRACTION = 0.02;
/** Each neutralization this lab adds this fraction to the next cost. */
export const NEUTRALIZE_ESCALATION = 0.15;
export const NEUTRALIZE_STABILITY = 15;
/** Stability lost per second for each open or festering failure. */
export const DRAIN_PER_FAILURE = 0.025;

/** Risk multiplier on Echoes: 1 at Strained-and-above, rising to this when the lab touched the brink. */
export const RISK_MULT_MAX = 1.5;
/** A black hole pays this fraction of the risk-weighted Echoes. */
export const BLACK_HOLE_PAYOUT = 0.5;

/** Legacy Grant: starting Amplitude for each new lab, scaled by banked Echoes and capped. */
export const LEGACY_PER_ECHO = 40;
export const LEGACY_CAP = 5000;

/** Notebook and history sizing. */
export const MAX_NOTES = 40;
export const HISTORY_MAX_SAMPLES = 180;
export const HISTORY_START_INTERVAL = 15;

/** Run amplitude thresholds that earn a grant line in the notebook. */
export const GRANT_MILESTONES: readonly number[] = [1e3, 1e5, 1e7, 1e9, 1e10, 1e11];

export const PROJECT_NAMES: Readonly<Record<ProjectTier, string>> = {
  1: 'Gate calibration',
  2: 'Lattice entanglement run',
  3: 'Branch divergence test',
};

export const ZONES: readonly Zone[] = ['stable', 'strained', 'critical', 'imminent'];

export const NO_SPAWN: Triple = [-1, -1, -1];

export const BUILDINGS: readonly BuildingDef[] = [
  {
    tier: 0,
    name: 'Qubit',
    symbol: 'Σ',
    operation: 'adds',
    blurb: 'A two-state instrument. Its readings are the lab\'s income.',
    baseCost: 10,
    costGrowth: 1.22,
    baseRate: 1,
    outputName: 'ψ',
  },
  {
    tier: 1,
    name: 'Superposition Gate',
    symbol: '×',
    operation: 'multiplies',
    blurb: 'A switch that holds qubits in superposition and spawns more of them.',
    baseCost: 500,
    costGrowth: 1.65,
    baseRate: 0.1,
    outputName: 'Qubits',
  },
  {
    tier: 2,
    name: 'Entanglement Lattice',
    symbol: '⊗',
    operation: 'entangles',
    blurb: 'A mesh that links gates so they replicate in step.',
    baseCost: 60000,
    costGrowth: 1.85,
    baseRate: 0.06,
    outputName: 'Gates',
  },
  {
    tier: 3,
    name: 'Reality Branch',
    symbol: '∥',
    operation: 'branches',
    blurb: 'A forking line of research running lattices of its own.',
    baseCost: 15000000,
    costGrowth: 2.05,
    baseRate: 0.03,
    outputName: 'Lattices',
  },
];

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'phaseLock',
    name: 'Phase Lock',
    symbol: 'φ',
    description: 'Qubit output ×2.',
    cost: 2500,
    effect: { kind: 'tierMult', tier: 0, mult: 2 },
  },
  {
    id: 'observer',
    name: 'Quantum Observer',
    symbol: '⟨ψ|',
    description: 'Taps gain +4% of ψ/s (5% total).',
    cost: 10000,
    effect: { kind: 'tapFraction', add: 0.04 },
  },
  {
    id: 'interference',
    name: 'Constructive Interference',
    symbol: '≈',
    description: 'Gate output ×2.',
    cost: 40000,
    effect: { kind: 'tierMult', tier: 1, mult: 2 },
  },
  {
    id: 'coherence',
    name: 'Coherence Window',
    symbol: 'τ',
    description: 'Surge lasts 50% longer.',
    cost: 150000,
    effect: { kind: 'surgeDuration', mult: 1.5 },
  },
  {
    id: 'tensorWeave',
    name: 'Tensor Weave',
    symbol: '⊗',
    description: 'Lattice output ×2.',
    cost: 600000,
    effect: { kind: 'tierMult', tier: 2, mult: 2 },
  },
  {
    id: 'errorCorrection',
    name: 'Error Correction',
    symbol: '✓',
    description: 'All ψ output ×1.5.',
    cost: 1500000,
    effect: { kind: 'globalMult', mult: 1.5 },
  },
  {
    id: 'decoherence',
    name: 'Rapid Recharge',
    symbol: '↻',
    description: 'Surge recharges 40% faster.',
    cost: 4000000,
    effect: { kind: 'surgeCooldown', mult: 0.6 },
  },
  {
    id: 'persistentState',
    name: 'Persistent State',
    symbol: '∣⟩',
    description: 'Offline progress runs at 80% instead of 50%.',
    cost: 12000000,
    effect: { kind: 'offlineEfficiency', value: 0.8 },
  },
  {
    id: 'branchResonance',
    name: 'Branch Resonance',
    symbol: '∥',
    description: 'Branch output ×2.',
    cost: 50000000,
    effect: { kind: 'tierMult', tier: 3, mult: 2 },
  },
  {
    id: 'unification',
    name: 'Grand Unification',
    symbol: '∞',
    description: 'All ψ output ×3.',
    cost: 1200000000,
    effect: { kind: 'globalMult', mult: 3 },
  },
];

export const UPGRADE_IDS: readonly UpgradeId[] = UPGRADES.map((u) => u.id);

export const UPGRADE_BY_ID: Readonly<Record<UpgradeId, UpgradeDef>> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
) as Record<UpgradeId, UpgradeDef>;

export function isUpgradeId(value: unknown): value is UpgradeId {
  return typeof value === 'string' && (UPGRADE_IDS as readonly string[]).includes(value);
}
