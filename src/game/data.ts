import type { BuildingDef, Tier, UpgradeDef, UpgradeId } from './types';

export const SAVE_KEY = 'numeric.save.v1';
export const SAVE_VERSION = 1;

export const TIERS: readonly Tier[] = [0, 1, 2, 3];

/** Amplitude a fresh reality starts with: enough for the first Qubit. */
export const START_AMPLITUDE = 10;

/** Owning this many of a building doubles its output (stacks). */
export const MILESTONES: readonly number[] = [10, 25, 50];

/** Superposition Surge: multiplies Amplitude output while active. */
export const SURGE_MULT = 5;
export const SURGE_BASE_DURATION = 12;
export const SURGE_BASE_COOLDOWN = 60;

/** Each tap grants 1 + (this fraction × current ψ/s). */
export const BASE_TAP_FRACTION = 0.01;

/** Offline progress. */
export const BASE_OFFLINE_EFFICIENCY = 0.5;
export const OFFLINE_CAP_SECONDS = 8 * 60 * 60;
/** A gap longer than this between ticks counts as time away. */
export const AWAY_THRESHOLD_SECONDS = 5;
/** Away time shorter than this is applied silently, without the welcome-back card. */
export const AWAY_REPORT_SECONDS = 30;

/** Collapse: Echoes = floor(sqrt(runAmplitude / ECHO_DIVISOR)). */
export const ECHO_DIVISOR = 1_000_000;
export const ECHO_BONUS_EACH = 0.1;
export const ECHO_DISCOUNT_EACH = 0.005;
export const ECHO_DISCOUNT_CAP = 0.3;

export const BUILDINGS: readonly BuildingDef[] = [
  {
    tier: 0,
    name: 'Qubit',
    symbol: 'Σ',
    operation: 'adds',
    blurb: 'A two-state system. Adds amplitude every second.',
    baseCost: 10,
    costGrowth: 1.15,
    baseRate: 1,
    outputName: 'ψ',
  },
  {
    tier: 1,
    name: 'Superposition Gate',
    symbol: '×',
    operation: 'multiplies',
    blurb: 'Holds qubits in superposition, spawning more of them.',
    baseCost: 500,
    costGrowth: 1.5,
    baseRate: 0.1,
    outputName: 'Qubits',
  },
  {
    tier: 2,
    name: 'Entanglement Lattice',
    symbol: '⊗',
    operation: 'entangles',
    blurb: 'Links gates together so they replicate in step.',
    baseCost: 60000,
    costGrowth: 1.7,
    baseRate: 0.06,
    outputName: 'Gates',
  },
  {
    tier: 3,
    name: 'Reality Branch',
    symbol: '∥',
    operation: 'branches',
    blurb: 'A parallel reality running lattices of its own.',
    baseCost: 15000000,
    costGrowth: 1.9,
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
