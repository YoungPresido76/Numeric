import { AWAY_REPORT_SECONDS, AWAY_THRESHOLD_SECONDS } from './data';
import { advance, applyOffline, createInitialState, derive } from './engine';
import { reduce } from './reducer';
import {
  clearSave,
  decodeImport,
  encodeExport,
  loadGame,
  persistGame,
  type ImportResult,
} from './save';
import type { Derived, GameAction, GameState, OfflineReport } from './types';

export type SaveStatus = 'ok' | 'unavailable' | 'error';

export interface Notice {
  id: number;
  kind: 'info' | 'warning';
  message: string;
}

export interface Snapshot {
  state: GameState;
  derived: Derived;
  offlineReport: OfflineReport | null;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  notice: Notice | null;
}

/**
 * Holds the game state outside React. Components subscribe through
 * `useSyncExternalStore`; every change replaces the snapshot object.
 */
export class GameStore {
  private snapshot: Snapshot;
  private readonly listeners = new Set<() => void>();
  private lastWall: number;
  private noticeCounter = 0;

  constructor(now: number = Date.now()) {
    this.lastWall = now;
    const loaded = loadGame(now);

    let state: GameState = createInitialState(now);
    let offlineReport: OfflineReport | null = null;
    let notice: Notice | null = null;
    let saveStatus: SaveStatus = 'ok';
    let lastSavedAt: number | null = null;

    if (loaded.status === 'ok') {
      state = loaded.state;
      lastSavedAt = loaded.state.lastSaved;
      const away = (now - loaded.state.lastSaved) / 1000;
      if (away > AWAY_THRESHOLD_SECONDS) {
        const result = applyOffline(state, away);
        state = result.state;
        if (away >= AWAY_REPORT_SECONDS) offlineReport = result.report;
      }
    } else if (loaded.status === 'corrupt') {
      notice = this.makeNotice(
        'warning',
        'Your saved game could not be read, so a fresh reality was started. The damaged data was kept as a backup in this browser.',
      );
    } else if (loaded.status === 'unavailable') {
      saveStatus = 'unavailable';
      notice = this.makeNotice(
        'warning',
        'This browser is blocking saves. Use Export in the System tab to keep your progress.',
      );
    }

    this.snapshot = { state, derived: derive(state), offlineReport, saveStatus, lastSavedAt, notice };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): Snapshot => this.snapshot;

  /** Applies an action. Returns true when it changed the game. */
  dispatch(action: GameAction): boolean {
    const prev = this.snapshot.state;
    const next = reduce(prev, action);
    if (next === prev) return false;
    this.commit({ state: next });
    return true;
  }

  /** Advances the game to wall-clock time `now`. Long gaps count as time away. */
  tick(now: number): void {
    const gapMs = now - this.lastWall;
    this.lastWall = now;
    if (gapMs <= 0) return;
    const seconds = gapMs / 1000;
    const state = this.snapshot.state;

    if (seconds > AWAY_THRESHOLD_SECONDS) {
      const result = applyOffline(state, seconds);
      this.commit({
        state: result.state,
        offlineReport: seconds >= AWAY_REPORT_SECONDS ? result.report : this.snapshot.offlineReport,
      });
      return;
    }

    const advanced = advance(state, seconds);
    this.commit({
      state: {
        ...advanced,
        stats: { ...advanced.stats, playSeconds: advanced.stats.playSeconds + seconds },
      },
    });
  }

  save(now: number = Date.now()): void {
    const ok = persistGame({ ...this.snapshot.state, lastSaved: now });
    if (ok) {
      this.commit({ lastSavedAt: now, saveStatus: 'ok' });
    } else if (this.snapshot.saveStatus !== 'unavailable') {
      this.commit({ saveStatus: 'error' });
    }
  }

  exportCode(): string {
    return encodeExport({ ...this.snapshot.state, lastSaved: Date.now() });
  }

  importCode(text: string): ImportResult {
    const now = Date.now();
    const result = decodeImport(text, now);
    if (result.ok) {
      this.lastWall = now;
      this.commit({ state: result.state, offlineReport: null });
      this.save(now);
    }
    return result;
  }

  hardReset(): void {
    const now = Date.now();
    clearSave();
    this.lastWall = now;
    this.commit({
      state: createInitialState(now),
      offlineReport: null,
      lastSavedAt: null,
      notice: null,
    });
    this.save(now);
  }

  dismissOffline(): void {
    if (this.snapshot.offlineReport) this.commit({ offlineReport: null });
  }

  dismissNotice(): void {
    if (this.snapshot.notice) this.commit({ notice: null });
  }

  private makeNotice(kind: Notice['kind'], message: string): Notice {
    this.noticeCounter += 1;
    return { id: this.noticeCounter, kind, message };
  }

  private commit(patch: Partial<Snapshot>): void {
    const next: Snapshot = { ...this.snapshot, ...patch };
    if (patch.state) next.derived = derive(patch.state);
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
}
