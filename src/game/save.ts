import { SAVE_KEY, SAVE_VERSION, isUpgradeId } from './data';
import { clampFinite } from './math';
import { createInitialState } from './engine';
import type { GameState, Quad, SurgeState, UpgradeId } from './types';

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState }
  | { status: 'corrupt' }
  | { status: 'unavailable' };

export type ImportResult = { ok: true; state: GameState } | { ok: false; error: string };

const EXPORT_PREFIX = 'NUMERIC1:';
const CORRUPT_BACKUP_KEY = `${SAVE_KEY}.corrupt`;

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

/**
 * Rebuilds a GameState from untrusted data. Every field is validated and
 * clamped, so a damaged or hand-edited save can never crash the game.
 */
export function parseSave(raw: unknown, now: number): GameState | null {
  if (!isRecord(raw)) return null;
  if (raw['version'] !== SAVE_VERSION) return null;

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

  return {
    version: 1,
    amplitude: readNumber(raw['amplitude'], base.amplitude),
    runAmplitude: readNumber(raw['runAmplitude'], 0),
    bought: readQuad(raw['bought'], true),
    generated: readQuad(raw['generated'], false),
    upgrades,
    surge: readSurge(raw['surge']),
    echoes: readCount(raw['echoes']),
    stats: {
      totalAmplitude: readNumber(stats['totalAmplitude'], 0),
      taps: readCount(stats['taps']),
      collapses: readCount(stats['collapses']),
      playSeconds: readNumber(stats['playSeconds'], 0),
    },
    tutorial: {
      step: readCount(tutorial['step']),
      done: tutorial['done'] === true,
    },
    settings: {
      sound: typeof settings['sound'] === 'boolean' ? settings['sound'] : true,
    },
    lastSaved: Math.min(readNumber(raw['lastSaved'], now), now),
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

export function encodeExport(state: GameState): string {
  return `${EXPORT_PREFIX}${btoa(JSON.stringify(state))}`;
}

export function decodeImport(text: string, now: number): ImportResult {
  const cleaned = text.replace(/\s+/g, '');
  if (cleaned.length === 0) return { ok: false, error: 'Paste a save code first.' };
  if (!cleaned.startsWith(EXPORT_PREFIX)) {
    return { ok: false, error: 'That does not look like a Numeric save code.' };
  }
  let json: string;
  try {
    json = atob(cleaned.slice(EXPORT_PREFIX.length));
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
