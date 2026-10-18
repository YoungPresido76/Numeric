import {
  BASE_SUCCESS_CHANCE,
  EXPERIMENT_WINDOW,
  FAIL_LOSS_MAX,
  FAIL_LOSS_MIN,
  FAIL_STABILITY_MAX,
  FAIL_STABILITY_MIN,
  GRACE_SECONDS,
  GRANT_MILESTONES,
  HISTORY_MAX_SAMPLES,
  HISTORY_START_INTERVAL,
  MAX_NOTES,
  NEUTRALIZE_COST_FRACTION,
  NEUTRALIZE_ESCALATION,
  NEUTRALIZE_STABILITY,
  NEUTRALIZE_WINDOW,
  OBSERVE_BONUS,
  OBSERVE_WINDOW,
  PROJECT_TIERS,
  RISK_MULT_MAX,
  SPAWN_RANGE,
  STABILITY_MAX,
  SUCCESS_PAYOUT_SECONDS,
  SUCCESS_STABILITY,
  ZONE_CRITICAL_MIN,
  ZONE_STABLE_MIN,
  ZONE_STRAINED_MIN,
  DRAIN_PER_FAILURE,
} from './data';
import { clamp } from './math';
import { narrative, type Line } from './narrative';
import type {
  Experiment,
  GameState,
  History,
  LabState,
  NoteLine,
  ObserveTarget,
  ProjectTier,
  RunStats,
  Tier,
  Zone,
} from './types';

/* ------------------------------------------------------------------ */
/* Zones and risk                                                      */
/* ------------------------------------------------------------------ */

export function zoneOf(stability: number): Zone {
  if (stability >= ZONE_STABLE_MIN) return 'stable';
  if (stability >= ZONE_STRAINED_MIN) return 'strained';
  if (stability >= ZONE_CRITICAL_MIN) return 'critical';
  return 'imminent';
}

/** Higher is worse. Lets code compare zones without caring about names. */
export function zoneRank(zone: Zone): number {
  switch (zone) {
    case 'stable':
      return 0;
    case 'strained':
      return 1;
    case 'critical':
      return 2;
    case 'imminent':
      return 3;
  }
}

/**
 * Echo multiplier for how close the lab came to failing: 1× if it never left
 * Stable, rising linearly to the maximum as the lowest point nears the brink.
 */
export function riskMultiplier(minStability: number): number {
  if (minStability >= ZONE_STABLE_MIN) return 1;
  const depth = clamp(
    (ZONE_STABLE_MIN - minStability) / (ZONE_STABLE_MIN - ZONE_CRITICAL_MIN),
    0,
    1,
  );
  return 1 + (RISK_MULT_MAX - 1) * depth;
}

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

export function createRunStats(): RunStats {
  return {
    seconds: 0,
    experiments: 0,
    successes: 0,
    failures: 0,
    survived: 0,
    observed: 0,
    fundsLost: 0,
    tapped: 0,
    byTier: [0, 0, 0, 0],
  };
}

export function createLab(seed: number, nextId: number): LabState {
  return {
    stability: STABILITY_MAX,
    minStability: STABILITY_MAX,
    experiments: [],
    failures: [],
    festering: 0,
    spawn: [-1, -1, -1],
    grace: -1,
    neutralizes: 0,
    recovery: null,
    lastCause: null,
    grants: 0,
    run: createRunStats(),
    rng: seed >>> 0,
    nextId,
  };
}

export function createHistory(): History {
  return { interval: HISTORY_START_INTERVAL, acc: 0, samples: [] };
}

/* ------------------------------------------------------------------ */
/* Working copy helpers                                                */
/* ------------------------------------------------------------------ */

function cloneLab(lab: LabState): LabState {
  return {
    ...lab,
    experiments: lab.experiments.map((e) => ({ ...e })),
    failures: lab.failures.map((f) => ({ ...f })),
    spawn: [lab.spawn[0], lab.spawn[1], lab.spawn[2]],
    run: { ...lab.run, byTier: [...lab.run.byTier] },
  };
}

/** A mutable copy of the parts of the state this module changes. */
function draft(state: GameState): GameState {
  return {
    ...state,
    lab: cloneLab(state.lab),
    notes: state.notes.slice(),
    stats: { ...state.stats },
    history: { ...state.history, samples: state.history.samples.slice() },
  };
}

/** mulberry32. Returns a value in [0, 1) and advances the stored seed. */
function random(s: GameState): number {
  const seed = (s.lab.rng + 0x6d2b79f5) >>> 0;
  s.lab.rng = seed;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randomBetween(s: GameState, min: number, max: number): number {
  return min + random(s) * (max - min);
}

function addNote(s: GameState, text: Line): void {
  const note: NoteLine = { id: s.lab.nextId, text: text.text, tone: text.tone };
  s.lab.nextId += 1;
  s.notes.push(note);
  if (s.notes.length > MAX_NOTES) s.notes.splice(0, s.notes.length - MAX_NOTES);
}

/** Appends notebook lines to a state. Used by code outside this module. */
export function addNotes(state: GameState, lines: readonly Line[]): GameState {
  if (lines.length === 0) return state;
  const s = draft(state);
  for (const entry of lines) addNote(s, entry);
  return s;
}

export function noteForPurchase(state: GameState, tier: Tier): GameState {
  return addNotes(state, [narrative.purchase(tier, state.lab.nextId)]);
}

/* ------------------------------------------------------------------ */
/* Stability                                                           */
/* ------------------------------------------------------------------ */

/**
 * Changes stability, tracks the lowest point, and remembers the project that
 * pulled the lab back from Critical so it can be carried to the next lab.
 */
function shiftStability(s: GameState, delta: number, project: ProjectTier | null): void {
  const lab = s.lab;
  const before = lab.stability;
  lab.stability = clamp(before + delta, 0, STABILITY_MAX);
  if (lab.stability < lab.minStability) lab.minStability = lab.stability;

  if (
    delta > 0 &&
    project !== null &&
    before < ZONE_STRAINED_MIN &&
    lab.stability >= ZONE_STRAINED_MIN &&
    (lab.recovery === null || before < lab.recovery.depth)
  ) {
    lab.recovery = { tier: project, depth: before };
  }
}

/* ------------------------------------------------------------------ */
/* Experiments                                                         */
/* ------------------------------------------------------------------ */

/** An experiment can be observed in its first seconds, or at any age while Surge is active. */
export function canObserve(experiment: Experiment, surgeActive: boolean): boolean {
  return surgeActive || experiment.age <= OBSERVE_WINDOW;
}

/** Cost to neutralize a failure right now. Escalates with each repair this lab. */
export function neutralizeCost(state: GameState): number {
  const raw =
    state.amplitude * NEUTRALIZE_COST_FRACTION * (1 + NEUTRALIZE_ESCALATION * state.lab.neutralizes);
  return Math.max(1, raw);
}

function startExperiment(s: GameState, tier: ProjectTier): void {
  s.lab.experiments.push({ id: s.lab.nextId, tier, age: 0 });
  s.lab.nextId += 1;
  addNote(s, narrative.experimentStarted(tier, s.lab.nextId));
}

function resolveExperiment(s: GameState, experiment: Experiment, observed: boolean, ps: number): void {
  const lab = s.lab;
  lab.experiments = lab.experiments.filter((e) => e.id !== experiment.id);
  lab.run.experiments += 1;
  s.stats.experiments += 1;
  if (observed) {
    lab.run.observed += 1;
    s.stats.observed += 1;
  }

  const chance = BASE_SUCCESS_CHANCE + (observed ? OBSERVE_BONUS : 0);
  if (random(s) < chance) {
    const payout = ps * SUCCESS_PAYOUT_SECONDS;
    s.amplitude += payout;
    s.runAmplitude += payout;
    s.stats.totalAmplitude += payout;
    lab.run.successes += 1;
    shiftStability(s, SUCCESS_STABILITY, experiment.tier);
    addNote(s, narrative.success(experiment.tier, observed, lab.nextId));
    return;
  }

  const loss = s.amplitude * randomBetween(s, FAIL_LOSS_MIN, FAIL_LOSS_MAX);
  s.amplitude -= loss;
  lab.run.fundsLost += loss;
  lab.run.failures += 1;
  lab.lastCause = experiment.tier;
  shiftStability(s, -randomBetween(s, FAIL_STABILITY_MIN, FAIL_STABILITY_MAX), null);
  lab.failures.push({ id: lab.nextId, tier: experiment.tier, left: NEUTRALIZE_WINDOW });
  lab.nextId += 1;
  addNote(s, narrative.failure(experiment.tier, lab.nextId));
}

/** Observes one experiment, or every observable one, resolving it immediately with the bonus. */
export function observe(state: GameState, target: ObserveTarget, ps: number): GameState {
  const surgeActive = state.surge.activeLeft > 0;
  const hits = state.lab.experiments.filter(
    (e) => (target === 'all' || e.id === target) && canObserve(e, surgeActive),
  );
  if (hits.length === 0) return state;
  const s = draft(state);
  for (const experiment of hits) resolveExperiment(s, experiment, true, ps);
  return s;
}

/** Pays to repair a failure inside its window. Restores stability. */
export function neutralize(state: GameState, id: number): GameState {
  const failure = state.lab.failures.find((f) => f.id === id);
  if (!failure) return state;
  const cost = neutralizeCost(state);
  if (state.amplitude < cost) return state;

  const s = draft(state);
  s.amplitude -= cost;
  s.lab.run.fundsLost += cost;
  s.lab.failures = s.lab.failures.filter((f) => f.id !== id);
  s.lab.neutralizes += 1;
  s.lab.run.survived += 1;
  shiftStability(s, NEUTRALIZE_STABILITY, failure.tier);
  addNote(s, narrative.neutralized(failure.tier, s.lab.nextId));
  return s;
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

function sampleHistory(s: GameState, dt: number, ps: number): void {
  const history = s.history;
  history.acc += dt;
  while (history.acc >= history.interval) {
    history.acc -= history.interval;
    history.samples.push({ ps, stab: s.lab.stability });
    if (history.samples.length > HISTORY_MAX_SAMPLES) {
      history.samples = history.samples.filter((_, index) => index % 2 === 1);
      history.interval *= 2;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Stepping                                                            */
/* ------------------------------------------------------------------ */

export interface LabStep {
  state: GameState;
  /** True when the grace window ran out and the lab must fall into a black hole. */
  blackHole: boolean;
}

/**
 * Advances the lab by `dt` seconds of active play: schedules and ages
 * experiments, drains stability for open failures, runs the last-chance window
 * and writes notebook lines. Production is integrated separately by the engine.
 */
export function stepLab(state: GameState, dt: number, ps: number): LabStep {
  const s = draft(state);
  const lab = s.lab;
  const zoneBefore = zoneOf(lab.stability);

  lab.run.seconds += dt;

  for (const tier of PROJECT_TIERS) {
    const index = tier - 1;
    const range = SPAWN_RANGE[index] ?? SPAWN_RANGE[0] ?? [180, 300];
    if (s.bought[tier] <= 0) {
      lab.spawn[index] = -1;
      continue;
    }
    if (lab.spawn[index] < 0) {
      lab.spawn[index] = randomBetween(s, range[0], range[1]);
      continue;
    }
    lab.spawn[index] -= dt;
    if (lab.spawn[index] > 0) continue;
    if (lab.experiments.some((e) => e.tier === tier)) {
      lab.spawn[index] = 10;
      continue;
    }
    startExperiment(s, tier);
    lab.spawn[index] = randomBetween(s, range[0], range[1]);
  }

  for (const experiment of lab.experiments) experiment.age += dt;
  for (const experiment of lab.experiments.filter((e) => e.age >= EXPERIMENT_WINDOW)) {
    resolveExperiment(s, experiment, false, ps);
  }

  for (const failure of lab.failures) failure.left -= dt;
  for (const failure of lab.failures.filter((f) => f.left <= 0)) {
    lab.failures = lab.failures.filter((f) => f.id !== failure.id);
    lab.festering += 1;
    lab.lastCause = failure.tier;
    addNote(s, narrative.ignored(failure.tier));
  }

  const draining = lab.failures.length + lab.festering;
  if (draining > 0) shiftStability(s, -draining * DRAIN_PER_FAILURE * dt, null);

  while (lab.grants < GRANT_MILESTONES.length && s.runAmplitude >= (GRANT_MILESTONES[lab.grants] ?? Infinity)) {
    addNote(s, narrative.grant(lab.grants, lab.nextId));
    lab.grants += 1;
  }

  const zoneAfter = zoneOf(lab.stability);
  if (zoneRank(zoneAfter) > zoneRank(zoneBefore)) {
    if (zoneAfter === 'strained') addNote(s, narrative.strained(lab.lastCause));
    else if (zoneAfter === 'critical') addNote(s, narrative.critical(lab.lastCause));
    else addNote(s, narrative.imminent());
  } else if (zoneRank(zoneBefore) >= 2 && zoneRank(zoneAfter) <= 1) {
    addNote(s, narrative.stabilised());
  }

  let blackHole = false;
  if (lab.stability < ZONE_CRITICAL_MIN) {
    if (lab.grace < 0) lab.grace = GRACE_SECONDS;
    else lab.grace -= dt;
    if (lab.grace <= 0) blackHole = true;
  } else {
    lab.grace = -1;
  }

  sampleHistory(s, dt, ps);
  return { state: s, blackHole };
}
