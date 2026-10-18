import {
  FAIL_LOSS_MAX,
  FAIL_LOSS_MIN,
  FAIL_STABILITY_MAX,
  FAIL_STABILITY_MIN,
  GRACE_SECONDS,
  GRANT_MILESTONES,
  HISTORY_MAX_SAMPLES,
  HISTORY_START_INTERVAL,
  IDLE_NOTE_SECONDS,
  MAX_NOTES,
  NEUTRALIZE_COST_FRACTION,
  NEUTRALIZE_ESCALATION,
  NEUTRALIZE_STABILITY,
  NEUTRALIZE_WINDOW,
  PROJECT_TIERS,
  RISK_MULT_MAX,
  SPAWN_RANGE,
  STABILITY_MAX,
  SUCCESS_PAYOUT_SECONDS,
  SUCCESS_STABILITY,
  TASK_EARN_FACTOR,
  TASK_EARN_LIMIT,
  TASK_EARN_MIN,
  TASK_FORBID_CHANCE,
  TASK_FUND_LIMIT,
  TASK_HOLD_LIMIT,
  TASK_TAP_COUNT,
  TASK_TAP_LIMIT,
  TASK_WEIGHTS,
  ZONE_CRITICAL_MIN,
  ZONE_STABLE_MIN,
  ZONE_STRAINED_MIN,
  DRAIN_PER_FAILURE,
} from './data';
import { clamp, formatNumber } from './math';
import { narrative, type Line } from './narrative';
import type {
  Experiment,
  GameState,
  History,
  LabState,
  NoteLine,
  ObserveTarget,
  ProjectTier,
  Quad,
  RunStats,
  Task,
  TaskBase,
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
    experiments: lab.experiments.map((e) => ({ ...e, task: { ...e.task }, base: { ...e.base, bought: [...e.base.bought] as Quad } })),
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

/** Surge lets the player observe an experiment, which completes its task instantly. */
export function canObserve(_experiment: Experiment, surgeActive: boolean): boolean {
  return surgeActive;
}

/** Cost to neutralize a failure right now. Escalates with each repair this lab. */
export function neutralizeCost(state: GameState): number {
  const raw =
    state.amplitude * NEUTRALIZE_COST_FRACTION * (1 + NEUTRALIZE_ESCALATION * state.lab.neutralizes);
  return Math.max(1, raw);
}

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

type TaskVerdict = 'pending' | 'done' | 'broken' | 'late';

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function captureBase(s: GameState): TaskBase {
  return {
    run: s.runAmplitude,
    bought: [s.bought[0], s.bought[1], s.bought[2], s.bought[3]],
    taps: s.stats.taps,
    upgrades: s.upgrades.length,
  };
}

/** Highest tier the player could plausibly fund soon: one past what they own, capped at Branch. */
function reachableTiers(s: GameState, costs: readonly number[], limit: number, ps: number): Tier[] {
  const reach = s.amplitude + ps * limit * 0.7;
  const tiers: Tier[] = [];
  for (const tier of [0, 1, 2, 3] as const) {
    if (tier > 0 && s.bought[tier - 1] <= 0) continue;
    if ((costs[tier] ?? Infinity) <= reach) tiers.push(tier);
  }
  return tiers;
}

function makeTask(s: GameState, ps: number, costs: readonly number[]): Task {
  const fundTiers = reachableTiers(s, costs, TASK_FUND_LIMIT, ps);
  const weights: [Task['kind'], number][] = [
    ['earn', TASK_WEIGHTS.earn],
    ['fund', fundTiers.length > 0 ? TASK_WEIGHTS.fund : 0],
    ['tap', TASK_WEIGHTS.tap],
    ['hold', TASK_WEIGHTS.hold],
  ];
  const total = sum(weights.map(([, weight]) => weight));
  let roll = random(s) * total;
  let kind: Task['kind'] = 'earn';
  for (const [candidate, weight] of weights) {
    if (roll < weight) {
      kind = candidate;
      break;
    }
    roll -= weight;
  }

  switch (kind) {
    case 'fund': {
      const tier = fundTiers[Math.floor(random(s) * fundTiers.length)] ?? 0;
      return { kind, tier, limit: TASK_FUND_LIMIT };
    }
    case 'tap':
      return { kind, count: TASK_TAP_COUNT, limit: TASK_TAP_LIMIT };
    case 'hold':
      return { kind, limit: TASK_HOLD_LIMIT };
    case 'earn': {
      const owned: Tier[] = ([0, 1, 2, 3] as const).filter((tier) => s.bought[tier] > 0);
      const forbid =
        owned.length > 1 && random(s) < TASK_FORBID_CHANCE
          ? (owned[Math.floor(random(s) * owned.length)] ?? null)
          : null;
      return {
        kind,
        target: Math.max(TASK_EARN_MIN, ps * TASK_EARN_LIMIT * TASK_EARN_FACTOR),
        forbid,
        limit: TASK_EARN_LIMIT,
      };
    }
  }
}

function judge(s: GameState, experiment: Experiment): TaskVerdict {
  const { task, base } = experiment;
  const late = experiment.age >= task.limit;
  switch (task.kind) {
    case 'earn':
      if (task.forbid !== null && s.bought[task.forbid] > base.bought[task.forbid]) return 'broken';
      if (s.runAmplitude - base.run >= task.target) return 'done';
      return late ? 'late' : 'pending';
    case 'fund':
      if (s.bought[task.tier] > base.bought[task.tier]) return 'done';
      return late ? 'late' : 'pending';
    case 'tap':
      if (s.stats.taps - base.taps >= task.count) return 'done';
      return late ? 'late' : 'pending';
    case 'hold':
      if (sum(s.bought) > sum(base.bought) || s.upgrades.length > base.upgrades) return 'broken';
      return late ? 'done' : 'pending';
  }
}

export interface TaskStatus {
  /** 0 to 1 progress toward completing the task. */
  fraction: number;
  label: string;
}

/** Progress shown on the experiment card. */
export function taskStatus(state: GameState, experiment: Experiment): TaskStatus {
  const { task, base } = experiment;
  switch (task.kind) {
    case 'earn': {
      const gained = Math.max(0, state.runAmplitude - base.run);
      return {
        fraction: clamp(gained / task.target, 0, 1),
        label: `${formatNumber(gained)} / ${formatNumber(task.target)} ψ`,
      };
    }
    case 'fund': {
      const done = state.bought[task.tier] > base.bought[task.tier];
      return { fraction: done ? 1 : 0, label: done ? 'Funded' : 'Not funded yet' };
    }
    case 'tap': {
      const taps = Math.max(0, state.stats.taps - base.taps);
      return { fraction: clamp(taps / task.count, 0, 1), label: `${Math.min(taps, task.count)} / ${task.count} taps` };
    }
    case 'hold':
      return { fraction: clamp(experiment.age / task.limit, 0, 1), label: 'Holding steady' };
  }
}

function startExperiment(s: GameState, tier: ProjectTier, ps: number, costs: readonly number[]): void {
  const task = makeTask(s, ps, costs);
  s.lab.experiments.push({ id: s.lab.nextId, tier, age: 0, task, base: captureBase(s) });
  s.lab.nextId += 1;
  addNote(s, narrative.experimentStarted(tier, task, s.lab.nextId));
}

/**
 * Closes an experiment. `success` pays out and steadies the lab; otherwise it
 * fails. `surge` marks an instant Surge observation, `broken` a failed condition.
 */
function resolveExperiment(
  s: GameState,
  experiment: Experiment,
  outcome: { success: boolean; surge: boolean; broken: boolean },
  ps: number,
): void {
  const lab = s.lab;
  lab.experiments = lab.experiments.filter((e) => e.id !== experiment.id);
  lab.run.experiments += 1;
  s.stats.experiments += 1;
  if (outcome.surge) {
    lab.run.observed += 1;
    s.stats.observed += 1;
  }

  if (outcome.success) {
    const payout = ps * SUCCESS_PAYOUT_SECONDS;
    s.amplitude += payout;
    s.runAmplitude += payout;
    s.stats.totalAmplitude += payout;
    lab.run.successes += 1;
    shiftStability(s, SUCCESS_STABILITY, experiment.tier);
    addNote(s, narrative.success(experiment.tier, outcome.surge, lab.nextId));
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
  addNote(s, narrative.failure(experiment.tier, outcome.broken, lab.nextId));
}

/** Observes one experiment, or every one, under Surge. Each completes its task instantly. */
export function observe(state: GameState, target: ObserveTarget, ps: number): GameState {
  const surgeActive = state.surge.activeLeft > 0;
  const hits = state.lab.experiments.filter(
    (e) => (target === 'all' || e.id === target) && canObserve(e, surgeActive),
  );
  if (hits.length === 0) return state;
  const s = draft(state);
  for (const experiment of hits) {
    resolveExperiment(s, experiment, { success: true, surge: true, broken: false }, ps);
  }
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
 * Advances the lab by `dt` seconds of active play: schedules experiments and
 * judges their tasks, drains stability for open failures, runs the last-chance
 * window and writes notebook lines. `costs` is the price of the next building
 * of each tier. Production is integrated separately by the engine.
 */
export function stepLab(state: GameState, dt: number, ps: number, costs: readonly number[]): LabStep {
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
    startExperiment(s, tier, ps, costs);
    lab.spawn[index] = randomBetween(s, range[0], range[1]);
  }

  for (const experiment of lab.experiments) experiment.age += dt;
  for (const experiment of lab.experiments.slice()) {
    const verdict = judge(s, experiment);
    if (verdict === 'pending') continue;
    resolveExperiment(
      s,
      experiment,
      { success: verdict === 'done', surge: false, broken: verdict === 'broken' },
      ps,
    );
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
  const idleTick = Math.floor(lab.run.seconds / IDLE_NOTE_SECONDS) > Math.floor((lab.run.seconds - dt) / IDLE_NOTE_SECONDS);
  if (idleTick && zoneAfter === 'stable' && lab.run.seconds > IDLE_NOTE_SECONDS) {
    addNote(s, narrative.idle(lab.nextId));
  }
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
