import type {
  AutoAmount,
  BuildingDef,
  ProjectTier,
  Quad,
  ResearchBonuses,
  Tier,
  TreeId,
  Triple,
  UpgradeDef,
  UpgradeId,
  Zone,
} from './types';

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
/** Neutralize cost as a fraction of current Amplitude. */
export const NEUTRALIZE_COST_FRACTION = 0.5;
/** The cost never exceeds this share of current Amplitude, so the escalation cannot make a repair unaffordable. */
export const NEUTRALIZE_COST_CAP = 0.5;
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

/* ------------------------------------------------------------------ */
/* Fabric (4D)                                                         */
/* ------------------------------------------------------------------ */

/** Fabric unlocks once this many Echoes have been earned in total. */
export const FABRIC_UNLOCK_ECHOES = 15;
/** Weave: Threads = floor(sqrt(runAmplitude / THREAD_DIVISOR) x risk multiplier). */
export const THREAD_DIVISOR = 2.5e12;

/** Cost Decoherence: fixed amount taken off a tier's cost growth per purchase (Qubit 1.22 to 1.18). */
export const DECOHERENCE_STEP: Quad = [0.04, 0.06, 0.07, 0.08];
export const DECOHERENCE_MAX = 3;
/** Thread cost of a tier's first Cost Decoherence. Each later one costs twice the one before. */
export const DECOHERENCE_BASE_COST: Quad = [1, 2, 3, 4];

/**
 * Temporal Wormhole: pays once, at install, a share of the Amplitude produced since the chosen
 * point. The share is WORMHOLE_BASE x (time since the point / run length so far), capped.
 */
export const WORMHOLE_COST = 3;
export const WORMHOLE_BASE = 0.5;
export const WORMHOLE_CAP = 0.25;
/** The lab must be this old before it has a history worth rewriting. */
export const WORMHOLE_MIN_SECONDS = 120;
/** Latest point that can be chosen, as a fraction of the run so far. */
export const WORMHOLE_MAX_POINT = 0.9;

/** Dilated Time: a paid window of faster Qubits and faster-draining stability. */
export const DILATION_COST = 2;
export const DILATION_SECONDS = 60;
export const DILATION_BOOST = 0.4;
export const DILATION_DRAIN_MULT = 2;
/** The window itself counts as this many open failures while it lasts, so it always costs stability. */
export const DILATION_BASE_DRAIN = 1;

/** Superposition Tapping and Ancestral Legacy are bought once, with Threads. */
export const TAPPING_COST = 6;
export const ANCESTRAL_COST = 10;

/** Unresolved Waveforms. A burst is waveforms x tap gain x a multiplier drawn from a curve. */
export const WAVE_RATE_TAU = 5;
/** Taps per second at which the curve is fully tilted toward big bursts. */
export const WAVE_RATE_FULL = 4;
export const WAVE_MIN = 0.5;
export const WAVE_MAX = 4;
/** The draw is u^exponent: a slow tapper gets WAVE_EXP_SLOW, a fast one WAVE_EXP_FAST. */
export const WAVE_EXP_SLOW = 2;
export const WAVE_EXP_FAST = 0.5;
export const WAVE_STORE_CAP = 500;
/** Chance an observation collapses into an Instability Setback, by stability zone. */
export const WAVE_SETBACK_CHANCE: Readonly<Record<Zone, number>> = {
  stable: 0,
  strained: 0.25,
  critical: 0.5,
  imminent: 0.75,
};
export const WAVE_SETBACK_STABILITY = 5;

/**
 * Continuum Tear: once Fabric is open, the last-chance window before a black hole becomes a Tear
 * that Threads can stitch closed. A stitch costs TEAR_BASE_COST plus one per layer already earned,
 * restores stability, and adds a permanent Shattered Reality Layer.
 */
export const TEAR_BASE_COST = 2;
export const TEAR_LAYER_CAP = 25;
export const TEAR_LAYER_BONUS = 0.02;
export const TEAR_STITCH_STABILITY = 45;

/** Ancestral Legacy: Echo Memory adds this share of your best lab's Echoes to every Collapse. */
export const ECHO_MEMORY_FRACTION = 0.1;
/** Each Symmetric Pair adds this to production, up to SYMMETRIC_MAX pairs. */
export const SYMMETRIC_AURA = 0.05;
export const SYMMETRIC_MAX = 10;

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

/**
 * Upgrade costs: each was multiplied by 10, then by a further 2 for every
 * upgrade further down the list (cost = original x 10 x 2^position).
 */
export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'phaseLock',
    name: 'Phase Lock',
    symbol: 'φ',
    description: 'Qubit output ×2.',
    cost: 25_000,
    effect: { kind: 'tierMult', tier: 0, mult: 2 },
  },
  {
    id: 'observer',
    name: 'Quantum Observer',
    symbol: '⟨ψ|',
    description: 'Taps gain +4% of ψ/s (5% total).',
    cost: 200_000,
    effect: { kind: 'tapFraction', add: 0.04 },
  },
  {
    id: 'interference',
    name: 'Constructive Interference',
    symbol: '≈',
    description: 'Gate output ×2.',
    cost: 1_600_000,
    effect: { kind: 'tierMult', tier: 1, mult: 2 },
  },
  {
    id: 'coherence',
    name: 'Coherence Window',
    symbol: 'τ',
    description: 'Surge lasts 50% longer.',
    cost: 12_000_000,
    effect: { kind: 'surgeDuration', mult: 1.5 },
  },
  {
    id: 'tensorWeave',
    name: 'Tensor Weave',
    symbol: '⊗',
    description: 'Lattice output ×2.',
    cost: 96_000_000,
    effect: { kind: 'tierMult', tier: 2, mult: 2 },
  },
  {
    id: 'errorCorrection',
    name: 'Error Correction',
    symbol: '✓',
    description: 'All ψ output ×1.5.',
    cost: 480_000_000,
    effect: { kind: 'globalMult', mult: 1.5 },
  },
  {
    id: 'decoherence',
    name: 'Rapid Recharge',
    symbol: '↻',
    description: 'Surge recharges 40% faster.',
    cost: 2_560_000_000,
    effect: { kind: 'surgeCooldown', mult: 0.6 },
  },
  {
    id: 'persistentState',
    name: 'Persistent State',
    symbol: '∣⟩',
    description: 'Offline progress runs at 80% instead of 50%.',
    cost: 15_360_000_000,
    effect: { kind: 'offlineEfficiency', value: 0.8 },
  },
  {
    id: 'branchResonance',
    name: 'Branch Resonance',
    symbol: '∥',
    description: 'Branch output ×2.',
    cost: 128_000_000_000,
    effect: { kind: 'tierMult', tier: 3, mult: 2 },
  },
  {
    id: 'unification',
    name: 'Grand Unification',
    symbol: '∞',
    description: 'All ψ output ×3.',
    cost: 6_144_000_000_000,
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

/* ------------------------------------------------------------------ */
/* Research trees                                                      */
/* ------------------------------------------------------------------ */

/** The research section appears once a lab has produced this much, or after the first Collapse. */
export const RESEARCH_UNLOCK_RUN = 2000;
export const RESEARCH_MAIN_MAX = 3;
/**
 * Sub-upgrade cap while the Main upgrade is at rank 0, 1 and 2. A Main rank can
 * only be bought once both Subs are at the current cap; the cap then grows.
 * Once the Main upgrade is at rank 3 the cap stays at the last value.
 */
export const RESEARCH_SUB_CAPS: readonly number[] = [4, 6, 8];
export const RESEARCH_SUB_MAX = 8;
/** Each Main stage costs this many times the stage before. Sub-upgrade ranks bought under a later Main stage cost this much more per stage too. */
export const RESEARCH_STAGE_COST_MULT = 5;

/** What a rank of a research node does. `per` is the effect of one rank. */
export type ResearchEffect =
  | { kind: 'output'; per: number }
  | { kind: 'costCut'; per: number }
  | { kind: 'observedPayout'; per: number }
  | { kind: 'tapFraction'; per: number }
  | { kind: 'surgeSeconds'; per: number }
  | { kind: 'taskTime'; per: number }
  | { kind: 'failureLoss'; per: number }
  | { kind: 'successStability'; per: number };

export interface ResearchSubDef {
  name: string;
  symbol: string;
  /** Short effect text for one rank, shown on the row. */
  perRank: string;
  baseCost: number;
  /** Each rank costs this much more than the one before. */
  costGrowth: number;
  effect: ResearchEffect;
}

export interface ResearchTreeDef {
  id: TreeId;
  name: string;
  /** What the line improves. */
  focus: string;
  blurb: string;
  mainName: string;
  mainSymbol: string;
  perRank: string;
  /** Amplitude cost of Main stage 1. Each later stage costs RESEARCH_STAGE_COST_MULT times the one before. */
  mainBaseCost: number;
  mainEffect: ResearchEffect;
  subs: readonly [ResearchSubDef, ResearchSubDef];
}

export const RESEARCH_TREES: readonly ResearchTreeDef[] = [
  {
    id: 'grant',
    name: 'Grant Optimization',
    focus: 'Funds',
    blurb: 'Better proposals, leaner purchasing.',
    mainName: 'Funding Strategy',
    mainSymbol: '$',
    perRank: 'ψ output +20%',
    mainBaseCost: 200_000,
    mainEffect: { kind: 'output', per: 0.2 },
    subs: [
      {
        name: 'Grant Writing',
        symbol: '✎',
        perRank: 'ψ output +2%',
        baseCost: 8_000,
        costGrowth: 2.8,
        effect: { kind: 'output', per: 0.02 },
      },
      {
        name: 'Procurement',
        symbol: '⌁',
        perRank: 'Project costs −1%',
        baseCost: 10_000,
        costGrowth: 2.8,
        effect: { kind: 'costCut', per: 0.01 },
      },
    ],
  },
  {
    id: 'observation',
    name: 'Deep Observation',
    focus: 'Observation',
    blurb: 'Look harder, look longer.',
    mainName: 'Resolved Readings',
    mainSymbol: '◉',
    perRank: 'Observed experiments pay +25%',
    mainBaseCost: 400_000,
    mainEffect: { kind: 'observedPayout', per: 0.25 },
    subs: [
      {
        name: 'Steady Hands',
        symbol: '☝',
        perRank: 'Taps gain +0.5% of ψ/s',
        baseCost: 12_000,
        costGrowth: 2.8,
        effect: { kind: 'tapFraction', per: 0.005 },
      },
      {
        name: 'Long Exposure',
        symbol: '⏱',
        perRank: 'Surge lasts +0.5s',
        baseCost: 14_000,
        costGrowth: 2.8,
        effect: { kind: 'surgeSeconds', per: 0.5 },
      },
    ],
  },
  {
    id: 'calibration',
    name: 'Experiment Calibration',
    focus: 'Experiments',
    blurb: 'Fewer surprises, softer landings.',
    mainName: 'Protocol Review',
    mainSymbol: '⚖',
    perRank: 'Experiment clocks +10%',
    mainBaseCost: 300_000,
    mainEffect: { kind: 'taskTime', per: 0.1 },
    subs: [
      {
        name: 'Failure Dampening',
        symbol: '▽',
        perRank: 'Failures take 3% less ψ',
        baseCost: 9_000,
        costGrowth: 2.8,
        effect: { kind: 'failureLoss', per: 0.03 },
      },
      {
        name: 'Stability Margin',
        symbol: '≋',
        perRank: 'Successes restore +0.5 stability',
        baseCost: 11_000,
        costGrowth: 2.8,
        effect: { kind: 'successStability', per: 0.5 },
      },
    ],
  },
];

export const RESEARCH_TREE_IDS: readonly TreeId[] = RESEARCH_TREES.map((t) => t.id);

export const RESEARCH_TREE_BY_ID: Readonly<Record<TreeId, ResearchTreeDef>> = Object.fromEntries(
  RESEARCH_TREES.map((t) => [t.id, t]),
) as Record<TreeId, ResearchTreeDef>;

/** No research: every multiplier is neutral. */
export const NO_RESEARCH_BONUSES: ResearchBonuses = {
  output: 1,
  costCut: 0,
  observedPayout: 1,
  tapFraction: 0,
  surgeSeconds: 0,
  taskTime: 1,
  failureLoss: 1,
  successStability: 0,
};

/* ------------------------------------------------------------------ */
/* Autobuyers                                                          */
/* ------------------------------------------------------------------ */

/** Autobuyers unlock once this many Echoes have been earned in total. */
export const AUTOBUYER_UNLOCK_ECHOES = 10;
/** Seconds between autobuyer triggers. */
export const AUTOBUYER_INTERVAL = 1;
/** Most triggers run in one tick, so a long frame never stalls the game. */
export const AUTOBUYER_MAX_TRIGGERS = 5;
/** The amount ladder. Level 0 is the autobuyer as bought; each step is an upgrade. */
export const AUTOBUYER_AMOUNTS: readonly AutoAmount[] = [1, 2, 4, 16, 32, 'max'];
/** Echo cost to install the autobuyer for each tier: Qubit 10, each later tier 4 times the one before. */
export const AUTOBUYER_BASE_COST: Quad = [10, 40, 160, 640];
/** Upgrade step n costs the install price times this to the power n. */
export const AUTOBUYER_STEP_GROWTH = 10;
