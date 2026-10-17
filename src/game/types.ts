/** Index of a production building: 0 = Qubit … 3 = Reality Branch. */
export type Tier = 0 | 1 | 2 | 3;

/** One number per building tier. */
export type Quad = [number, number, number, number];

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
}

export interface GameState {
  version: 1;
  /** Current spendable Amplitude (ψ). */
  amplitude: number;
  /** Amplitude produced during the current reality (drives Echo gain). */
  runAmplitude: number;
  /** Buildings bought by the player. Drives cost and milestones. */
  bought: Quad;
  /** Buildings produced by higher tiers. Free, fractional. */
  generated: Quad;
  upgrades: UpgradeId[];
  surge: SurgeState;
  /** Prestige currency. Persists through Collapse. */
  echoes: number;
  stats: Stats;
  tutorial: TutorialState;
  settings: Settings;
  /** Epoch ms of the last save. Used to compute offline progress. */
  lastSaved: number;
}

export interface BuildingDef {
  tier: Tier;
  name: string;
  /** Short glyph shown on the building tile. */
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

export type GameAction =
  | { type: 'tap' }
  | { type: 'buy'; tier: Tier; amount: BuyAmount }
  | { type: 'upgrade'; id: UpgradeId }
  | { type: 'surge' }
  | { type: 'collapse' }
  | { type: 'setSound'; value: boolean }
  | { type: 'skipTutorial' };
