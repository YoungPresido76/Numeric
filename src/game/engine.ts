import {
  BASE_OFFLINE_EFFICIENCY,
  BASE_TAP_FRACTION,
  BUILDINGS,
  ECHO_BONUS_EACH,
  ECHO_DISCOUNT_CAP,
  ECHO_DISCOUNT_EACH,
  ECHO_DIVISOR,
  MILESTONES,
  OFFLINE_CAP_SECONDS,
  START_AMPLITUDE,
  SURGE_BASE_COOLDOWN,
  SURGE_BASE_DURATION,
  SURGE_MULT,
  UPGRADE_BY_ID,
} from './data';
import { clampFinite } from './math';
import type {
  BuyAmount,
  Derived,
  GameState,
  OfflineReport,
  Quad,
  Tier,
  UpgradeDef,
  UpgradeId,
} from './types';

export function createInitialState(now: number): GameState {
  return {
    version: 1,
    amplitude: START_AMPLITUDE,
    runAmplitude: 0,
    bought: [0, 0, 0, 0],
    generated: [0, 0, 0, 0],
    upgrades: [],
    surge: { activeLeft: 0, cooldownLeft: 0 },
    echoes: 0,
    stats: { totalAmplitude: 0, taps: 0, collapses: 0, playSeconds: 0 },
    tutorial: { step: 0, done: false },
    settings: { sound: true },
    lastSaved: now,
  };
}

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

/** Output doubles each time `count` crosses a milestone. */
export function milestoneMult(count: number): number {
  let mult = 1;
  for (const threshold of MILESTONES) {
    if (count >= threshold) mult *= 2;
  }
  return mult;
}

/** The next milestone above `count`, or null when all are reached. */
export function nextMilestone(count: number): number | null {
  for (const threshold of MILESTONES) {
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
    BUILDINGS[0].baseRate * milestoneMult(state.bought[0]) * tierMult[0],
    BUILDINGS[1].baseRate * milestoneMult(state.bought[1]) * tierMult[1],
    BUILDINGS[2].baseRate * milestoneMult(state.bought[2]) * tierMult[2],
    BUILDINGS[3].baseRate * milestoneMult(state.bought[3]) * tierMult[3],
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
  };
}

/* ------------------------------------------------------------------ */
/* Time advancement                                                    */
/* ------------------------------------------------------------------ */

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
  const integral =
    n0 * t + (a1 * n1 * t2) / 2 + (a1 * a2 * n2 * t3) / 6 + (a1 * a2 * a3 * n3 * t4) / 24;
  const gained = clampFinite(a0 * integral * d.outputMult);

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
    stats: {
      ...state.stats,
      totalAmplitude: clampFinite(state.stats.totalAmplitude + gained),
    },
  };
}

/** Advances the simulation by `dt` seconds, splitting where Surge expires. */
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
 * scaled by the offline efficiency. Surge never grants offline bonus.
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

  const next: GameState = {
    ...state,
    amplitude: clampFinite(state.amplitude + gained),
    runAmplitude: clampFinite(state.runAmplitude + gained),
    generated,
    surge: {
      activeLeft: 0,
      cooldownLeft: Math.max(0, state.surge.cooldownLeft - elapsedSeconds),
    },
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

/** A building appears once you own it, or own the tier below it. */
export function isTierVisible(state: GameState, tier: Tier): boolean {
  if (tier === 0) return true;
  const below = (tier - 1) as Tier;
  return state.bought[tier] > 0 || state.bought[below] > 0;
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
/* Prestige: Collapse                                                  */
/* ------------------------------------------------------------------ */

/** Echoes earned by collapsing a reality that produced `runAmplitude`. */
export function echoGain(runAmplitude: number): number {
  if (!(runAmplitude > 0)) return 0;
  return Math.floor(Math.sqrt(runAmplitude / ECHO_DIVISOR));
}

/** Run amplitude required to earn `echoes` Echoes in one collapse. */
export function amplitudeForEchoes(echoes: number): number {
  return echoes * echoes * ECHO_DIVISOR;
}

export function collapse(state: GameState): GameState {
  const gain = echoGain(state.runAmplitude);
  if (gain < 1) return state;
  const fresh = createInitialState(state.lastSaved);
  return {
    ...fresh,
    echoes: state.echoes + gain,
    stats: { ...state.stats, collapses: state.stats.collapses + 1 },
    tutorial: state.tutorial,
    settings: state.settings,
  };
}
