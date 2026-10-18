import {
  BASE_OFFLINE_EFFICIENCY,
  BASE_TAP_FRACTION,
  BLACK_HOLE_PAYOUT,
  BUILDINGS,
  ECHO_BONUS_EACH,
  ECHO_DISCOUNT_CAP,
  ECHO_DISCOUNT_EACH,
  ECHO_DIVISOR,
  LEGACY_CAP,
  LEGACY_PER_ECHO,
  MAX_NOTES,
  MILESTONES,
  OFFLINE_CAP_SECONDS,
  START_AMPLITUDE,
  SURGE_BASE_COOLDOWN,
  SURGE_BASE_DURATION,
  SURGE_MULT,
  UPGRADE_BY_ID,
} from './data';
import { createHistory, createLab, addNotes, riskMultiplier, zoneOf } from './lab';
import { clampFinite, formatNumber } from './math';
import { narrative, type Line } from './narrative';
import type {
  BuyAmount,
  Derived,
  GameState,
  LabOutcome,
  OfflineReport,
  ProjectTier,
  Quad,
  RunSummary,
  Tier,
  UpgradeDef,
  UpgradeId,
} from './types';

export function createInitialState(now: number): GameState {
  const seed = ((now ^ 0x9e3779b9) >>> 0) || 1;
  const lab = createLab(seed, 1);
  const opening = narrative.labOpened(1, 0);
  return {
    version: 2,
    amplitude: START_AMPLITUDE,
    runAmplitude: 0,
    bought: [0, 0, 0, 0],
    generated: [0, 0, 0, 0],
    upgrades: [],
    surge: { activeLeft: 0, cooldownLeft: 0 },
    echoes: 0,
    perks: [],
    lab: { ...lab, nextId: 2 },
    notes: [{ id: 1, text: opening.text, tone: opening.tone }],
    history: createHistory(),
    summary: null,
    stats: {
      totalAmplitude: 0,
      taps: 0,
      collapses: 0,
      playSeconds: 0,
      experiments: 0,
      observed: 0,
      blackHoles: 0,
    },
    tutorial: { step: 0, done: false },
    settings: { sound: true },
    lastSaved: now,
    introSeen: false,
  };
}

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

/** Output doubles each time `count` crosses one of this tier's milestones. */
export function milestoneMult(tier: Tier, count: number): number {
  let mult = 1;
  for (const threshold of MILESTONES[tier] ?? []) {
    if (count >= threshold) mult *= 2;
  }
  return mult;
}

/** The next milestone above `count` for this tier, or null when all are reached. */
export function nextMilestone(tier: Tier, count: number): number | null {
  for (const threshold of MILESTONES[tier] ?? []) {
    if (count < threshold) return threshold;
  }
  return null;
}

export function costDiscountFor(echoes: number): number {
  return Math.min(ECHO_DISCOUNT_CAP, echoes * ECHO_DISCOUNT_EACH);
}

export function echoMultFor(echoes: number): number {
  return 1 + ECHO_BONUS_EACH * echoes;
}

export function derive(state: GameState): Derived {
  const tierMult: Quad = [1, 1, 1, 1];
  let upgradeGlobal = 1;
  let tapFraction = BASE_TAP_FRACTION;
  let surgeDurationMult = 1;
  let surgeCooldownMult = 1;
  let offlineEfficiency = BASE_OFFLINE_EFFICIENCY;

  for (const id of state.upgrades) {
    const effect = UPGRADE_BY_ID[id].effect;
    switch (effect.kind) {
      case 'tierMult':
        tierMult[effect.tier] *= effect.mult;
        break;
      case 'globalMult':
        upgradeGlobal *= effect.mult;
        break;
      case 'tapFraction':
        tapFraction += effect.add;
        break;
      case 'surgeDuration':
        surgeDurationMult *= effect.mult;
        break;
      case 'surgeCooldown':
        surgeCooldownMult *= effect.mult;
        break;
      case 'offlineEfficiency':
        offlineEfficiency = Math.max(offlineEfficiency, effect.value);
        break;
    }
  }

  const units: Quad = [
    state.bought[0] + state.generated[0],
    state.bought[1] + state.generated[1],
    state.bought[2] + state.generated[2],
    state.bought[3] + state.generated[3],
  ];
  const rates: Quad = [
    BUILDINGS[0].baseRate * milestoneMult(0, state.bought[0]) * tierMult[0],
    BUILDINGS[1].baseRate * milestoneMult(1, state.bought[1]) * tierMult[1],
    BUILDINGS[2].baseRate * milestoneMult(2, state.bought[2]) * tierMult[2],
    BUILDINGS[3].baseRate * milestoneMult(3, state.bought[3]) * tierMult[3],
  ];

  const surgeFactor = state.surge.activeLeft > 0 ? SURGE_MULT : 1;
  const echoMult = echoMultFor(state.echoes);
  const outputMult = upgradeGlobal * surgeFactor * echoMult;
  const psPerSecond = clampFinite(units[0] * rates[0] * outputMult);

  return {
    units,
    rates,
    upgradeGlobal,
    surgeFactor,
    echoMult,
    outputMult,
    psPerSecond,
    tapGain: clampFinite(1 + psPerSecond * tapFraction),
    surgeDuration: SURGE_BASE_DURATION * surgeDurationMult,
    surgeCooldown: SURGE_BASE_COOLDOWN * surgeCooldownMult,
    offlineEfficiency,
    costDiscount: costDiscountFor(state.echoes),
    zone: zoneOf(state.lab.stability),
  };
}

/* ------------------------------------------------------------------ */
/* Time advancement                                                    */
/* ------------------------------------------------------------------ */

function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

/**
 * Integrates production over `t` seconds with every multiplier held constant.
 *
 * Each tier produces the tier below it, so unit counts are polynomials in time
 * and the integral has a closed form. That makes this exact for any `t`, which
 * is what lets offline progress run as a single call instead of many small steps.
 *
 *   n3(t) = n3
 *   n2(t) = n2 + a3·n3·t
 *   n1(t) = n1 + a2·n2·t + a2·a3·n3·t²/2
 *   n0(t) = n0 + a1·n1·t + a1·a2·n2·t²/2 + a1·a2·a3·n3·t³/6
 *   ψ     = out · a0 · ∫ n0 dt
 *
 * Each term of the integral is also credited to a tier for the output
 * breakdown: bought units credit their own tier, generated units credit the
 * tier that spawned them.
 */
function integrate(state: GameState, t: number): GameState {
  const d = derive(state);
  const [n0, n1, n2, n3] = d.units;
  const [a0, a1, a2, a3] = d.rates;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;

  const dg2 = a3 * n3 * t;
  const dg1 = a2 * n2 * t + (a2 * a3 * n3 * t2) / 2;
  const dg0 = a1 * n1 * t + (a1 * a2 * n2 * t2) / 2 + (a1 * a2 * a3 * n3 * t3) / 6;

  const term0 = n0 * t;
  const term1 = (a1 * n1 * t2) / 2;
  const term2 = (a1 * a2 * n2 * t3) / 6;
  const term3 = (a1 * a2 * a3 * n3 * t4) / 24;
  const scale = a0 * d.outputMult;
  const gained = clampFinite(scale * (term0 + term1 + term2 + term3));

  const bought0 = ratio(state.bought[0], n0);
  const bought1 = ratio(state.bought[1], n1);
  const bought2 = ratio(state.bought[2], n2);
  const byTier: Quad = [
    state.lab.run.byTier[0] + scale * term0 * bought0,
    state.lab.run.byTier[1] + scale * (term0 * (1 - bought0) + term1 * bought1),
    state.lab.run.byTier[2] + scale * (term1 * (1 - bought1) + term2 * bought2),
    state.lab.run.byTier[3] + scale * (term2 * (1 - bought2) + term3),
  ];

  const generated: Quad = [
    clampFinite(state.generated[0] + dg0),
    clampFinite(state.generated[1] + dg1),
    clampFinite(state.generated[2] + dg2),
    0,
  ];

  return {
    ...state,
    amplitude: clampFinite(state.amplitude + gained),
    runAmplitude: clampFinite(state.runAmplitude + gained),
    generated,
    surge: {
      activeLeft: Math.max(0, state.surge.activeLeft - t),
      cooldownLeft: Math.max(0, state.surge.cooldownLeft - t),
    },
    lab: {
      ...state.lab,
      run: { ...state.lab.run, byTier: byTier.map(clampFinite) as Quad },
    },
    stats: {
      ...state.stats,
      totalAmplitude: clampFinite(state.stats.totalAmplitude + gained),
    },
  };
}

/** Advances production by `dt` seconds, splitting where Surge expires. */
export function advance(state: GameState, dt: number): GameState {
  if (!(dt > 0)) return state;
  const surgeLeft = state.surge.activeLeft;
  if (surgeLeft > 0 && dt > surgeLeft) {
    return integrate(integrate(state, surgeLeft), dt - surgeLeft);
  }
  return integrate(state, dt);
}

/**
 * Applies time spent away. Production is simulated as if Surge were off, then
 * scaled by the offline efficiency. Surge never grants offline bonus. The lab
 * is paused: no experiments start or resolve and stability does not change.
 */
export function applyOffline(
  state: GameState,
  elapsedSeconds: number,
): { state: GameState; report: OfflineReport } {
  const d = derive(state);
  const credited = Math.min(Math.max(0, elapsedSeconds), OFFLINE_CAP_SECONDS);
  const efficiency = d.offlineEfficiency;

  const base: GameState = { ...state, surge: { activeLeft: 0, cooldownLeft: 0 } };
  const simulated = integrate(base, credited);

  const gained = (simulated.amplitude - base.amplitude) * efficiency;
  const generated: Quad = [
    base.generated[0] + (simulated.generated[0] - base.generated[0]) * efficiency,
    base.generated[1] + (simulated.generated[1] - base.generated[1]) * efficiency,
    base.generated[2] + (simulated.generated[2] - base.generated[2]) * efficiency,
    0,
  ];
  const byTier: Quad = [
    state.lab.run.byTier[0] + (simulated.lab.run.byTier[0] - state.lab.run.byTier[0]) * efficiency,
    state.lab.run.byTier[1] + (simulated.lab.run.byTier[1] - state.lab.run.byTier[1]) * efficiency,
    state.lab.run.byTier[2] + (simulated.lab.run.byTier[2] - state.lab.run.byTier[2]) * efficiency,
    state.lab.run.byTier[3] + (simulated.lab.run.byTier[3] - state.lab.run.byTier[3]) * efficiency,
  ];

  const next: GameState = {
    ...state,
    amplitude: clampFinite(state.amplitude + gained),
    runAmplitude: clampFinite(state.runAmplitude + gained),
    generated,
    surge: {
      activeLeft: 0,
      cooldownLeft: Math.max(0, state.surge.cooldownLeft - elapsedSeconds),
    },
    lab: { ...state.lab, run: { ...state.lab.run, byTier } },
    stats: {
      ...state.stats,
      totalAmplitude: clampFinite(state.stats.totalAmplitude + gained),
    },
  };

  return {
    state: next,
    report: {
      seconds: elapsedSeconds,
      credited,
      efficiency,
      gained,
      capped: elapsedSeconds > OFFLINE_CAP_SECONDS,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Costs and purchases                                                 */
/* ------------------------------------------------------------------ */

/** Total cost of buying `count` more of a building when `bought` are owned. */
export function buildingCost(tier: Tier, bought: number, count: number, discount: number): number {
  const def = BUILDINGS[tier];
  const g = def.costGrowth;
  const first = def.baseCost * Math.pow(g, bought);
  return first * ((Math.pow(g, count) - 1) / (g - 1)) * (1 - discount);
}

/** Largest number of buildings affordable with `amplitude`. */
export function maxAffordable(
  tier: Tier,
  bought: number,
  amplitude: number,
  discount: number,
): number {
  const g = BUILDINGS[tier].costGrowth;
  const first = BUILDINGS[tier].baseCost * Math.pow(g, bought) * (1 - discount);
  if (!(amplitude >= first)) return 0;
  let n = Math.floor(Math.log((amplitude * (g - 1)) / first + 1) / Math.log(g));
  if (!Number.isFinite(n) || n < 0) n = 0;
  while (n > 0 && buildingCost(tier, bought, n, discount) > amplitude) n -= 1;
  while (n < 100_000 && buildingCost(tier, bought, n + 1, discount) <= amplitude) n += 1;
  return n;
}

export function buyBuilding(state: GameState, tier: Tier, amount: BuyAmount): GameState {
  const discount = costDiscountFor(state.echoes);
  const owned = state.bought[tier];
  const count = amount === 'max' ? maxAffordable(tier, owned, state.amplitude, discount) : amount;
  if (count < 1) return state;
  const cost = buildingCost(tier, owned, count, discount);
  if (!(cost <= state.amplitude)) return state;
  const bought: Quad = [...state.bought];
  bought[tier] = owned + count;
  return { ...state, amplitude: state.amplitude - cost, bought };
}

export function buyUpgrade(state: GameState, id: UpgradeId): GameState {
  const def = UPGRADE_BY_ID[id];
  if (state.upgrades.includes(id) || state.amplitude < def.cost) return state;
  return { ...state, amplitude: state.amplitude - def.cost, upgrades: [...state.upgrades, id] };
}

/* ------------------------------------------------------------------ */
/* Visibility: what the interface reveals and when                     */
/* ------------------------------------------------------------------ */

/**
 * A project appears once you own it or the tier below it. A perk earned from a
 * past lab's close call shows it one tier earlier: when you own the tier two below.
 */
export function isTierVisible(state: GameState, tier: Tier): boolean {
  if (tier === 0) return true;
  if (state.bought[tier] > 0 || state.bought[(tier - 1) as Tier] > 0) return true;
  if (state.perks.includes(tier as ProjectTier)) {
    return tier === 1 || state.bought[(tier - 2) as Tier] > 0;
  }
  return false;
}

/** An unbought upgrade surfaces once the run is a fair way toward its cost. */
export function isUpgradeVisible(state: GameState, def: UpgradeDef): boolean {
  if (state.upgrades.includes(def.id)) return false;
  return state.amplitude >= def.cost || state.runAmplitude >= def.cost * 0.15;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export function tap(state: GameState): GameState {
  const gain = derive(state).tapGain;
  return {
    ...state,
    amplitude: clampFinite(state.amplitude + gain),
    runAmplitude: clampFinite(state.runAmplitude + gain),
    lab: { ...state.lab, run: { ...state.lab.run, tapped: state.lab.run.tapped + gain } },
    stats: {
      ...state.stats,
      taps: state.stats.taps + 1,
      totalAmplitude: clampFinite(state.stats.totalAmplitude + gain),
    },
  };
}

export function canSurge(state: GameState): boolean {
  return state.surge.activeLeft <= 0 && state.surge.cooldownLeft <= 0;
}

export function activateSurge(state: GameState): GameState {
  if (!canSurge(state)) return state;
  const d = derive(state);
  return { ...state, surge: { activeLeft: d.surgeDuration, cooldownLeft: d.surgeCooldown } };
}

/* ------------------------------------------------------------------ */
/* Prestige: closing a lab                                             */
/* ------------------------------------------------------------------ */

/** Base Echoes for a lab that produced `runAmplitude`, before the risk multiplier. */
export function echoGain(runAmplitude: number): number {
  if (!(runAmplitude > 0)) return 0;
  return Math.floor(Math.sqrt(runAmplitude / ECHO_DIVISOR));
}

/** Run amplitude required to earn `echoes` base Echoes. */
export function amplitudeForEchoes(echoes: number): number {
  return echoes * echoes * ECHO_DIVISOR;
}

export interface EchoPayout {
  base: number;
  mult: number;
  /** What a normal Collapse pays. */
  published: number;
  /** What a forced black-hole collapse would pay. */
  blackHole: number;
}

/** Echo payouts for closing the current lab now, including the risk multiplier. */
export function echoPayout(state: GameState): EchoPayout {
  const base = echoGain(state.runAmplitude);
  const mult = riskMultiplier(state.lab.minStability);
  const published = Math.round(base * mult);
  const blackHole = base > 0 ? Math.max(1, Math.floor(published * BLACK_HOLE_PAYOUT)) : 0;
  return { base, mult, published, blackHole };
}

/** Starting Amplitude bonus for a new lab, scaled by banked Echoes and capped. */
export function legacyGrantFor(echoes: number): number {
  return Math.min(LEGACY_CAP, LEGACY_PER_ECHO * echoes);
}

/**
 * Ends the current lab. A published lab pays the risk-weighted Echoes; a black
 * hole pays half of that. Everything else resets, a Legacy Grant seeds the next
 * lab, and the close call that pulled the lab back from Critical is carried on.
 */
export function closeLab(state: GameState, outcome: LabOutcome): GameState {
  const payout = echoPayout(state);
  const earned = outcome === 'blackHole' ? payout.blackHole : payout.published;
  const echoes = state.echoes + earned;
  const legacyGrant = legacyGrantFor(echoes);
  const perkTier = state.lab.recovery?.tier ?? null;
  const perks =
    perkTier !== null && !state.perks.includes(perkTier) ? [...state.perks, perkTier] : state.perks;
  const closed = state.stats.collapses + 1;
  const run = state.lab.run;

  const summary: RunSummary = {
    outcome,
    lab: closed,
    seconds: run.seconds,
    funds: state.runAmplitude,
    experiments: run.experiments,
    successes: run.successes,
    failures: run.failures,
    survived: run.survived,
    observed: run.observed,
    closestZone: zoneOf(state.lab.minStability),
    baseEchoes: payout.base,
    riskMult: payout.mult,
    echoesEarned: earned,
    tapped: run.tapped,
    byTier: [...run.byTier],
    history: state.history.samples.slice(),
    perkTier: perkTier !== null && !state.perks.includes(perkTier) ? perkTier : null,
    legacyGrant,
  };

  const lines: Line[] = [
    outcome === 'blackHole' ? narrative.blackHole() : narrative.published(closed, earned),
    narrative.labOpened(closed + 1, state.lab.nextId),
  ];
  if (legacyGrant > 0) lines.push(narrative.legacy(legacyGrant, formatNumber(legacyGrant)));
  if (summary.perkTier !== null) lines.push(narrative.perk(summary.perkTier));

  const fresh = createInitialState(state.lastSaved);
  const next: GameState = {
    ...fresh,
    amplitude: START_AMPLITUDE + legacyGrant,
    echoes,
    perks,
    lab: createLab(state.lab.rng, state.lab.nextId),
    notes: state.notes.slice(-(MAX_NOTES - lines.length)),
    summary,
    stats: {
      ...state.stats,
      collapses: closed,
      blackHoles: state.stats.blackHoles + (outcome === 'blackHole' ? 1 : 0),
    },
    tutorial: state.tutorial,
    settings: state.settings,
    lastSaved: state.lastSaved,
    introSeen: state.introSeen,
  };
  return addNotes(next, lines);
}

/** A deliberate Collapse. Needs at least one base Echo. */
export function collapse(state: GameState): GameState {
  if (echoGain(state.runAmplitude) < 1) return state;
  return closeLab(state, 'published');
}
