/** Index of a production building: 0 = Qubit … 3 = Reality Branch. */
export type Tier = 0 | 1 | 2 | 3;

/** Projects that run experiments: Gate, Lattice and Branch. */
export type ProjectTier = 1 | 2 | 3;

/** One number per building tier. */
export type Quad = [number, number, number, number];

/** One number per project tier (Gate, Lattice, Branch). */
export type Triple = [number, number, number];

export type UpgradeId =
  | 'phaseLock'
  | 'observer'
  | 'interference'
  | 'coherence'
  | 'tensorWeave'
  | 'errorCorrection'
  | 'decoherence'
  | 'persistentState'
  | 'branchResonance'
  | 'unification';

export type BuyAmount = 1 | 10 | 'max';

/** Stability is never shown as a number; the zone drives colour, motion and warnings. */
export type Zone = 'stable' | 'strained' | 'critical' | 'imminent';

export type NoteTone = 'info' | 'good' | 'warn' | 'alert';

export type LabOutcome = 'published' | 'blackHole';

export interface SurgeState {
  /** Seconds of Surge remaining (0 when inactive). */
  activeLeft: number;
  /** Seconds until Surge can be used again, measured from activation. */
  cooldownLeft: number;
}

export interface TutorialState {
  step: number;
  done: boolean;
}

export interface Settings {
  sound: boolean;
}

export interface Stats {
  totalAmplitude: number;
  taps: number;
  collapses: number;
  playSeconds: number;
  /** Lifetime experiments that resolved. */
  experiments: number;
  /** Lifetime experiments the player observed. */
  observed: number;
  blackHoles: number;
}

/** A line in the lab notebook. */
export interface NoteLine {
  id: number;
  text: string;
  tone: NoteTone;
}

/** An in-progress experiment, superposed until observed or until its window ends. */
export interface Experiment {
  id: number;
  tier: ProjectTier;
  /** Seconds since the experiment started. */
  age: number;
}

/** A failed experiment that can still be neutralized. */
export interface Failure {
  id: number;
  tier: ProjectTier;
  /** Seconds left to neutralize before it starts festering. */
  left: number;
}

/** Counters for the lab currently running. Feeds the run summary. */
export interface RunStats {
  /** Seconds of active play this lab. */
  seconds: number;
  experiments: number;
  successes: number;
  failures: number;
  /** Failures the player neutralized. */
  survived: number;
  observed: number;
  /** ψ lost to failures and neutralizing. */
  fundsLost: number;
  /** ψ gained by tapping. */
  tapped: number;
  /** ψ attributed to each tier's chain. */
  byTier: Quad;
}

export interface BestRecovery {
  tier: ProjectTier;
  /** Stability just before the recovery. Lower means riskier. */
  depth: number;
}

export interface LabState {
  /** 0–100, internal. */
  stability: number;
  /** Lowest stability reached this lab. Drives the Echo risk multiplier. */
  minStability: number;
  experiments: Experiment[];
  failures: Failure[];
  /** Failures that were ignored and keep draining stability. */
  festering: number;
  /** Seconds until the next experiment per project tier. Negative when that project is offline. */
  spawn: Triple;
  /** Seconds left in the last-chance window. Negative when inactive. */
  grace: number;
  /** Neutralizations this lab. Escalates the next cost. */
  neutralizes: number;
  /** The project whose recovery from Critical carries to the next lab. */
  recovery: BestRecovery | null;
  /** The project that most recently caused trouble. Names the cause in warnings. */
  lastCause: ProjectTier | null;
  /** How many amplitude milestones have already been announced in the notebook. */
  grants: number;
  run: RunStats;
  /** PRNG state. */
  rng: number;
  /** Next id for experiments, failures and notes. */
  nextId: number;
}

export interface HistorySample {
  ps: number;
  stab: number;
}

export interface History {
  /** Seconds between samples. Doubles whenever the buffer is thinned. */
  interval: number;
  /** Seconds accumulated toward the next sample. */
  acc: number;
  samples: HistorySample[];
}

export interface RunSummary {
  outcome: LabOutcome;
  lab: number;
  seconds: number;
  funds: number;
  experiments: number;
  successes: number;
  failures: number;
  survived: number;
  observed: number;
  /** Lowest zone the lab reached, described in words in the UI. */
  closestZone: Zone;
  baseEchoes: number;
  riskMult: number;
  echoesEarned: number;
  tapped: number;
  byTier: Quad;
  history: HistorySample[];
  perkTier: ProjectTier | null;
  legacyGrant: number;
}

export interface GameState {
  version: 2;
  /** Current spendable Amplitude (ψ). */
  amplitude: number;
  /** Amplitude produced during the current lab (drives Echo gain). */
  runAmplitude: number;
  /** Buildings bought by the player. Drives cost and milestones. */
  bought: Quad;
  /** Buildings produced by higher tiers. Free, fractional. */
  generated: Quad;
  upgrades: UpgradeId[];
  surge: SurgeState;
  /** Prestige currency. Persists through Collapse. */
  echoes: number;
  /** Projects that appear one tier earlier in every lab. Earned from past labs. */
  perks: ProjectTier[];
  lab: LabState;
  notes: NoteLine[];
  history: History;
  /** Set when a lab closes. Shown until the player starts the next lab. */
  summary: RunSummary | null;
  stats: Stats;
  tutorial: TutorialState;
  settings: Settings;
  /** Epoch ms of the last save. Used to compute offline progress. */
  lastSaved: number;
}

export interface BuildingDef {
  tier: Tier;
  name: string;
  /** Short glyph shown beside the name. */
  symbol: string;
  /** One-word description of the math operation the building performs. */
  operation: string;
  blurb: string;
  baseCost: number;
  costGrowth: number;
  /** Units of output produced per unit owned, per second, before multipliers. */
  baseRate: number;
  /** What this building produces: Amplitude for tier 0, the tier below otherwise. */
  outputName: string;
}

export type UpgradeEffect =
  | { kind: 'tierMult'; tier: Tier; mult: number }
  | { kind: 'globalMult'; mult: number }
  | { kind: 'tapFraction'; add: number }
  | { kind: 'surgeDuration'; mult: number }
  | { kind: 'surgeCooldown'; mult: number }
  | { kind: 'offlineEfficiency'; value: number };

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  symbol: string;
  description: string;
  cost: number;
  effect: UpgradeEffect;
}

/** Values derived from a GameState. Recomputed each tick, never saved. */
export interface Derived {
  /** Effective units per tier: bought + generated. */
  units: Quad;
  /** Per-unit output rate per tier after milestones and upgrades. */
  rates: Quad;
  upgradeGlobal: number;
  surgeFactor: number;
  echoMult: number;
  /** upgradeGlobal × surgeFactor × echoMult, applied to Amplitude output. */
  outputMult: number;
  psPerSecond: number;
  tapGain: number;
  surgeDuration: number;
  surgeCooldown: number;
  offlineEfficiency: number;
  costDiscount: number;
  zone: Zone;
}

export interface OfflineReport {
  /** Real seconds away. */
  seconds: number;
  /** Seconds actually simulated after the offline cap. */
  credited: number;
  efficiency: number;
  gained: number;
  capped: boolean;
}

export type ObserveTarget = number | 'all';

export type GameAction =
  | { type: 'tap' }
  | { type: 'buy'; tier: Tier; amount: BuyAmount }
  | { type: 'upgrade'; id: UpgradeId }
  | { type: 'surge' }
  | { type: 'collapse' }
  | { type: 'observe'; target: ObserveTarget }
  | { type: 'neutralize'; id: number }
  | { type: 'dismissSummary' }
  | { type: 'setSound'; value: boolean }
  | { type: 'skipTutorial' };
