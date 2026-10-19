import {
  DECOHERENCE_MAX,
  GRANT_MILESTONES,
  HISTORY_MAX_SAMPLES,
  MAX_NOTES,
  SAVE_KEY,
  RESEARCH_MAIN_MAX,
  RESEARCH_TREES,
  SYMMETRIC_MAX,
  TEAR_LAYER_CAP,
  WAVE_STORE_CAP,
  ZONES,
  isUpgradeId,
} from './data';
import { AUTOBUYER_MAX_LEVEL, createAutobuyer } from './autobuyers';
import { createInitialState } from './engine';
import { createFabric } from './fabric';
import { createHistory, createLab, createRunStats } from './lab';
import { clamp, clampFinite } from './math';
import { subCap } from './research';
import type {
  AutobuyerSet,
  AutobuyerState,
  Experiment,
  FabricState,
  Failure,
  GameState,
  History,
  HistorySample,
  LabOutcome,
  LabPeak,
  LabState,
  MultiverseState,
  NoteLine,
  NoteTone,
  ProjectTier,
  Quad,
  ResearchState,
  RunStats,
  RunSummary,
  SurgeState,
  Task,
  TaskBase,
  Tier,
  TreeState,
  Triple,
  UpgradeId,
  Zone,
} from './types';

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState }
  | { status: 'corrupt' }
  | { status: 'unavailable' };

export type ImportResult = { ok: true; state: GameState } | { ok: false; error: string };

const EXPORT_PREFIX = 'NUMERIC1:';
const CORRUPT_BACKUP_KEY = `${SAVE_KEY}.corrupt`;
/** Saves from the first prototype (no lab) are upgraded on load. */
const READABLE_VERSIONS: readonly unknown[] = [1, 2];
const NOTE_TONES: readonly NoteTone[] = ['info', 'good', 'warn', 'alert'];
const OUTCOMES: readonly LabOutcome[] = ['published', 'blackHole', 'woven', 'converged'];
const PEAKS: readonly LabPeak[] = ['stable', 'strained', 'survived', 'collapsed'];
const MAX_TEXT = 400;
const MAX_LIST = 12;

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown, fallback: number, min = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, clampFinite(value));
}

function readCount(value: unknown): number {
  return Math.floor(readNumber(value, 0));
}

function readQuad(value: unknown, whole: boolean): Quad {
  const source: unknown[] = Array.isArray(value) ? value : [];
  const read = (i: number): number => (whole ? readCount(source[i]) : readNumber(source[i], 0));
  return [read(0), read(1), read(2), read(3)];
}

function readSurge(value: unknown): SurgeState {
  const source = isRecord(value) ? value : {};
  return {
    activeLeft: readNumber(source['activeLeft'], 0),
    cooldownLeft: readNumber(source['cooldownLeft'], 0),
  };
}

function readProjectTier(value: unknown): ProjectTier | null {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

function readZone(value: unknown): Zone {
  return typeof value === 'string' && (ZONES as readonly string[]).includes(value)
    ? (value as Zone)
    : 'stable';
}

function readTier(value: unknown): Tier | null {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : null;
}

function readTask(value: unknown): Task | null {
  if (!isRecord(value)) return null;
  const limit = readNumber(value['limit'], 0, 0);
  if (limit <= 0) return null;
  switch (value['kind']) {
    case 'earn': {
      const target = readNumber(value['target'], 0, 0);
      return target > 0 ? { kind: 'earn', target, forbid: readTier(value['forbid']), limit } : null;
    }
    case 'fund': {
      const tier = readTier(value['tier']);
      return tier === null ? null : { kind: 'fund', tier, limit };
    }
    case 'tap': {
      const count = readCount(value['count']);
      return count > 0 ? { kind: 'tap', count, limit } : null;
    }
    case 'hold':
      return { kind: 'hold', limit };
    default:
      return null;
  }
}

function readTaskBase(value: unknown): TaskBase {
  const src = isRecord(value) ? value : {};
  return {
    run: readNumber(src['run'], 0),
    bought: readQuad(src['bought'], true),
    taps: readCount(src['taps']),
    upgrades: readCount(src['upgrades']),
  };
}

function readList(value: unknown, max: number): unknown[] {
  return Array.isArray(value) ? (value as unknown[]).slice(0, max) : [];
}

function readRun(value: unknown): RunStats {
  const src = isRecord(value) ? value : {};
  return {
    seconds: readNumber(src['seconds'], 0),
    experiments: readCount(src['experiments']),
    successes: readCount(src['successes']),
    failures: readCount(src['failures']),
    survived: readCount(src['survived']),
    observed: readCount(src['observed']),
    fundsLost: readNumber(src['fundsLost'], 0),
    tapped: readNumber(src['tapped'], 0),
    byTier: readQuad(src['byTier'], false),
  };
}

function readSamples(value: unknown, max: number): HistorySample[] {
  const samples: HistorySample[] = [];
  for (const entry of readList(value, max)) {
    if (!isRecord(entry)) continue;
    samples.push({
      ps: readNumber(entry['ps'], 0),
      stab: clamp(readNumber(entry['stab'], 100), 0, 100),
    });
  }
  return samples;
}

function readHistory(value: unknown): History {
  const src = isRecord(value) ? value : {};
  const base = createHistory();
  return {
    interval: readNumber(src['interval'], base.interval, 1),
    acc: readNumber(src['acc'], 0),
    samples: readSamples(src['samples'], HISTORY_MAX_SAMPLES),
  };
}

function readNotes(value: unknown, fallback: NoteLine[]): NoteLine[] {
  const notes: NoteLine[] = [];
  const seen = new Set<number>();
  for (const entry of readList(value, MAX_NOTES)) {
    if (!isRecord(entry) || typeof entry['text'] !== 'string') continue;
    const id = readCount(entry['id']);
    if (seen.has(id)) continue;
    seen.add(id);
    const tone = NOTE_TONES.find((t) => t === entry['tone']) ?? 'info';
    notes.push({ id, text: entry['text'].slice(0, MAX_TEXT), tone });
  }
  return notes.length > 0 ? notes : fallback;
}

function readLab(value: unknown, seed: number, notes: NoteLine[]): LabState {
  const src = isRecord(value) ? value : {};
  const base = createLab(seed, 1);
  const stability = clamp(readNumber(src['stability'], base.stability), 0, 100);
  const minStability = Math.min(stability, clamp(readNumber(src['minStability'], stability), 0, 100));

  const experiments: Experiment[] = [];
  const failures: Failure[] = [];
  const usedIds = new Set<number>();
  for (const entry of readList(src['experiments'], MAX_LIST)) {
    if (!isRecord(entry)) continue;
    const tier = readProjectTier(entry['tier']);
    const id = readCount(entry['id']);
    if (tier === null || usedIds.has(id)) continue;
    usedIds.add(id);
    // Experiments saved before tasks existed have no task and are dropped.
    const task = readTask(entry['task']);
    if (task === null) continue;
    experiments.push({ id, tier, age: readNumber(entry['age'], 0), task, base: readTaskBase(entry['base']) });
  }
  for (const entry of readList(src['failures'], MAX_LIST)) {
    if (!isRecord(entry)) continue;
    const tier = readProjectTier(entry['tier']);
    const id = readCount(entry['id']);
    if (tier === null || usedIds.has(id)) continue;
    usedIds.add(id);
    failures.push({ id, tier, left: readNumber(entry['left'], 0) });
  }

  const spawnSource: unknown[] = Array.isArray(src['spawn']) ? (src['spawn'] as unknown[]) : [];
  const spawn: Triple = [
    readNumber(spawnSource[0], -1, -1),
    readNumber(spawnSource[1], -1, -1),
    readNumber(spawnSource[2], -1, -1),
  ];

  const recoverySource = isRecord(src['recovery']) ? src['recovery'] : null;
  const recoveryTier = recoverySource ? readProjectTier(recoverySource['tier']) : null;
  const recovery =
    recoverySource && recoveryTier !== null
      ? { tier: recoveryTier, depth: clamp(readNumber(recoverySource['depth'], 0), 0, 100) }
      : null;

  const highestId = Math.max(0, ...notes.map((n) => n.id), ...usedIds);
  const rawRng = readNumber(src['rng'], seed);

  return {
    stability,
    minStability,
    experiments,
    failures,
    festering: readCount(src['festering']),
    spawn,
    grace: readNumber(src['grace'], -1, -1),
    neutralizes: readCount(src['neutralizes']),
    recovery,
    lastCause: readProjectTier(src['lastCause']),
    grants: Math.min(readCount(src['grants']), GRANT_MILESTONES.length),
    run: isRecord(src['run']) ? readRun(src['run']) : createRunStats(),
    rng: Math.floor(rawRng) >>> 0,
    nextId: Math.max(readCount(src['nextId']), highestId + 1, 1),
  };
}

function readSummary(value: unknown): RunSummary | null {
  if (!isRecord(value)) return null;
  const outcome = OUTCOMES.find((o) => o === value['outcome']);
  if (!outcome) return null;
  return {
    outcome,
    lab: Math.max(1, readCount(value['lab'])),
    seconds: readNumber(value['seconds'], 0),
    funds: readNumber(value['funds'], 0),
    experiments: readCount(value['experiments']),
    successes: readCount(value['successes']),
    failures: readCount(value['failures']),
    survived: readCount(value['survived']),
    observed: readCount(value['observed']),
    closestZone: readZone(value['closestZone']),
    baseEchoes: readCount(value['baseEchoes']),
    riskMult: clamp(readNumber(value['riskMult'], 1, 1), 1, 5),
    echoesEarned: readCount(value['echoesEarned']),
    threadsEarned: readCount(value['threadsEarned']),
    shardsEarned: readCount(value['shardsEarned']),
    tapped: readNumber(value['tapped'], 0),
    byTier: readQuad(value['byTier'], false),
    history: readSamples(value['history'], HISTORY_MAX_SAMPLES),
    perkTier: readProjectTier(value['perkTier']),
    legacyGrant: readNumber(value['legacyGrant'], 0),
  };
}

function readPerks(value: unknown): ProjectTier[] {
  const perks: ProjectTier[] = [];
  for (const entry of readList(value, 3)) {
    const tier = readProjectTier(entry);
    if (tier !== null && !perks.includes(tier)) perks.push(tier);
  }
  return perks;
}

function readRank(value: unknown, max: number): number {
  return Math.min(max, readCount(value));
}

function readTree(value: unknown): TreeState {
  const src = isRecord(value) ? value : {};
  const main = readRank(src['main'], RESEARCH_MAIN_MAX);
  const cap = subCap(main);
  const subs: unknown[] = Array.isArray(src['subs']) ? (src['subs'] as unknown[]) : [];
  return { main, subs: [readRank(subs[0], cap), readRank(subs[1], cap)] };
}

function readResearch(value: unknown): ResearchState {
  const src = isRecord(value) ? value : {};
  return {
    grant: readTree(src['grant']),
    observation: readTree(src['observation']),
    calibration: readTree(src['calibration']),
  };
}

function readFabric(value: unknown): FabricState {
  const src = isRecord(value) ? value : {};
  const base = createFabric();
  const threadsEarned = readCount(src['threadsEarned']);
  const dilation = isRecord(src['dilation']) ? src['dilation'] : {};
  const decoherence = Array.isArray(src['decoherence']) ? (src['decoherence'] as unknown[]) : [];
  const readDecoherence = (i: number): number => Math.min(DECOHERENCE_MAX, readCount(decoherence[i]));
  const recent: LabPeak[] = [];
  for (const entry of readList(src['recentLabs'], 2)) {
    const peak = PEAKS.find((p) => p === entry);
    if (peak) recent.push(peak);
  }
  return {
    ...base,
    threads: readCount(src['threads']),
    threadsEarned,
    weaves: readCount(src['weaves']),
    decoherence: [readDecoherence(0), readDecoherence(1), readDecoherence(2), readDecoherence(3)],
    tapping: src['tapping'] === true,
    ancestral: src['ancestral'] === true,
    wormholeUsed: src['wormholeUsed'] === true,
    dilation: { activeLeft: readNumber(dilation['activeLeft'], 0) },
    waveforms: Math.min(readNumber(src['waveforms'], 0), WAVE_STORE_CAP),
    tapRate: readNumber(src['tapRate'], 0),
    recentLabs: recent,
    pairs: Math.min(readCount(src['pairs']), SYMMETRIC_MAX),
    bestEchoes: readCount(src['bestEchoes']),
    tears: readCount(src['tears']),
    shattered: Math.min(readCount(src['shattered']), TEAR_LAYER_CAP),
  };
}

function readMultiverse(value: unknown): MultiverseState {
  const src = isRecord(value) ? value : {};
  const shardsEarned = readCount(src['shardsEarned']);
  return {
    // Spendable Shards can never exceed what was ever earned.
    shards: Math.min(readCount(src['shards']), shardsEarned),
    shardsEarned,
    converges: readCount(src['converges']),
  };
}

function readAutobuyer(value: unknown): AutobuyerState {
  const src = isRecord(value) ? value : {};
  if (src['owned'] !== true) return createAutobuyer();
  return {
    owned: true,
    level: readRank(src['level'], AUTOBUYER_MAX_LEVEL),
    enabled: src['enabled'] !== false,
  };
}

function readAutobuyers(value: unknown): AutobuyerSet {
  const source: unknown[] = Array.isArray(value) ? (value as unknown[]) : [];
  return [
    readAutobuyer(source[0]),
    readAutobuyer(source[1]),
    readAutobuyer(source[2]),
    readAutobuyer(source[3]),
  ];
}

/**
 * Rebuilds a GameState from untrusted data. Every field is validated and
 * clamped, so a damaged or hand-edited save can never crash the game.
 * Version 1 saves (before the lab existed) load with a fresh lab.
 */
export function parseSave(raw: unknown, now: number): GameState | null {
  if (!isRecord(raw)) return null;
  if (!READABLE_VERSIONS.includes(raw['version'])) return null;

  const base = createInitialState(now);
  const stats = isRecord(raw['stats']) ? raw['stats'] : {};
  const tutorial = isRecord(raw['tutorial']) ? raw['tutorial'] : {};
  const settings = isRecord(raw['settings']) ? raw['settings'] : {};

  const upgrades: UpgradeId[] = [];
  if (Array.isArray(raw['upgrades'])) {
    for (const entry of raw['upgrades'] as unknown[]) {
      if (isUpgradeId(entry) && !upgrades.includes(entry)) upgrades.push(entry);
    }
  }

  const notes = readNotes(raw['notes'], base.notes);
  const echoes = readCount(raw['echoes']);
  // Saves from before spendable Echoes had no lifetime total: it equals the balance.
  const echoesEarned = Math.max(echoes, readCount(raw['echoesEarned']));
  const research = readResearch(raw['research']);
  const treesCleared =
    raw['treesCleared'] === true || RESEARCH_TREES.every((def) => {
      const tree = research[def.id];
      return tree.main >= RESEARCH_MAIN_MAX && tree.subs[0] >= subCap(RESEARCH_MAIN_MAX) && tree.subs[1] >= subCap(RESEARCH_MAIN_MAX);
    });

  return {
    version: 2,
    amplitude: readNumber(raw['amplitude'], base.amplitude),
    runAmplitude: readNumber(raw['runAmplitude'], 0),
    bought: readQuad(raw['bought'], true),
    generated: readQuad(raw['generated'], false),
    upgrades,
    surge: readSurge(raw['surge']),
    echoes,
    echoesEarned,
    research,
    treesCleared,
    fabric: readFabric(raw['fabric']),
    multiverse: readMultiverse(raw['multiverse']),
    autobuyers: readAutobuyers(raw['autobuyers']),
    autoClock: Math.min(readNumber(raw['autoClock'], 0), 1),
    perks: readPerks(raw['perks']),
    lab: readLab(raw['lab'], base.lab.rng, notes),
    notes,
    history: readHistory(raw['history']),
    summary: readSummary(raw['summary']),
    stats: {
      totalAmplitude: readNumber(stats['totalAmplitude'], 0),
      taps: readCount(stats['taps']),
      collapses: readCount(stats['collapses']),
      playSeconds: readNumber(stats['playSeconds'], 0),
      experiments: readCount(stats['experiments']),
      observed: readCount(stats['observed']),
      blackHoles: readCount(stats['blackHoles']),
    },
    tutorial: {
      step: readCount(tutorial['step']),
      done: tutorial['done'] === true,
    },
    settings: {
      sound: typeof settings['sound'] === 'boolean' ? settings['sound'] : true,
    },
    lastSaved: Math.min(readNumber(raw['lastSaved'], now), now),
    // Saves from before the opening existed belong to returning players.
    introSeen:
      raw['introSeen'] === true || readCount(stats['taps']) > 0 || readNumber(stats['playSeconds'], 0) > 0,
  };
}

export function loadGame(now: number): LoadResult {
  const storage = getStorage();
  if (!storage) return { status: 'unavailable' };
  let text: string | null;
  try {
    text = storage.getItem(SAVE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (text === null) return { status: 'empty' };

  try {
    const state = parseSave(JSON.parse(text) as unknown, now);
    if (state) return { status: 'ok', state };
  } catch {
    // fall through to the corrupt path
  }
  try {
    storage.setItem(CORRUPT_BACKUP_KEY, text);
  } catch {
    // Backup is best-effort.
  }
  return { status: 'corrupt' };
}

/** Writes the save. Returns false when storage is missing or full. */
export function persistGame(state: GameState): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(SAVE_KEY);
    storage.removeItem(CORRUPT_BACKUP_KEY);
  } catch {
    // Nothing else to do.
  }
}

/** Notebook lines contain non-Latin characters (ψ), so encode as UTF-8 before base64. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(code: string): string {
  const binary = atob(code);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeExport(state: GameState): string {
  return `${EXPORT_PREFIX}${toBase64(JSON.stringify(state))}`;
}

export function decodeImport(text: string, now: number): ImportResult {
  const cleaned = text.replace(/\s+/g, '');
  if (cleaned.length === 0) return { ok: false, error: 'Paste a save code first.' };
  if (!cleaned.startsWith(EXPORT_PREFIX)) {
    return { ok: false, error: 'That does not look like a Numeric save code.' };
  }
  let json: string;
  try {
    json = fromBase64(cleaned.slice(EXPORT_PREFIX.length));
  } catch {
    return { ok: false, error: 'The save code is damaged or was cut off when copying.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, error: 'The save code is damaged or was cut off when copying.' };
  }
  const state = parseSave(parsed, now);
  if (!state) return { ok: false, error: 'This save was made by an incompatible version.' };
  return { ok: true, state: { ...state, lastSaved: now } };
}

