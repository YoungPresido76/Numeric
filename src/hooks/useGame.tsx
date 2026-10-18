import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react';
import { sound } from '../game/audio';
import { zoneOf, zoneRank } from '../game/lab';
import type { ImportResult } from '../game/save';
import { GameStore, type Snapshot } from '../game/store';
import type { BuyAmount, ObserveTarget, Tier, UpgradeId } from '../game/types';

const TICK_MS = 100;
const AUTOSAVE_MS = 10_000;

export interface GameActions {
  tap: () => void;
  buy: (tier: Tier, amount: BuyAmount) => void;
  buyUpgrade: (id: UpgradeId) => void;
  surge: () => void;
  collapse: () => void;
  observe: (target: ObserveTarget) => void;
  neutralize: (id: number) => void;
  dismissSummary: () => void;
  finishIntro: () => void;
  setSound: (value: boolean) => void;
  skipTutorial: () => void;
  saveNow: () => void;
  exportCode: () => string;
  importCode: (text: string) => ImportResult;
  hardReset: () => void;
  dismissOffline: () => void;
  dismissNotice: () => void;
}

interface GameContextValue {
  store: GameStore;
  actions: GameActions;
}

const GameContext = createContext<GameContextValue | null>(null);

function createActions(store: GameStore): GameActions {
  return {
    tap: () => {
      sound.unlock();
      if (store.dispatch({ type: 'tap' })) sound.play('tap');
    },
    buy: (tier, amount) => {
      sound.unlock();
      if (store.dispatch({ type: 'buy', tier, amount })) sound.play('buy');
    },
    buyUpgrade: (id) => {
      sound.unlock();
      if (store.dispatch({ type: 'upgrade', id })) sound.play('upgrade');
    },
    surge: () => {
      sound.unlock();
      if (store.dispatch({ type: 'surge' })) sound.play('surge');
    },
    collapse: () => {
      sound.unlock();
      if (store.dispatch({ type: 'collapse' })) {
        sound.play('collapse');
        store.save();
      }
    },
    // Observation sounds come from the result (success or failure), see GameProvider.
    observe: (target) => {
      sound.unlock();
      store.dispatch({ type: 'observe', target });
    },
    neutralize: (id) => {
      sound.unlock();
      if (store.dispatch({ type: 'neutralize', id })) sound.play('upgrade');
    },
    dismissSummary: () => {
      store.dispatch({ type: 'dismissSummary' });
      store.save();
    },
    finishIntro: () => {
      store.dispatch({ type: 'finishIntro' });
      store.save();
    },
    setSound: (value) => {
      store.dispatch({ type: 'setSound', value });
      if (value) {
        sound.unlock();
        sound.play('buy');
      }
    },
    skipTutorial: () => {
      store.dispatch({ type: 'skipTutorial' });
    },
    saveNow: () => store.save(),
    exportCode: () => store.exportCode(),
    importCode: (text) => store.importCode(text),
    hardReset: () => store.hardReset(),
    dismissOffline: () => store.dismissOffline(),
    dismissNotice: () => store.dismissNotice(),
  };
}

export function GameProvider({ children }: { children: ReactNode }): ReactElement {
  const [store] = useState(() => new GameStore());
  const actions = useMemo(() => createActions(store), [store]);
  const value = useMemo<GameContextValue>(() => ({ store, actions }), [store, actions]);

  useEffect(() => {
    const syncSound = (): void => sound.setEnabled(store.getSnapshot().state.settings.sound);
    syncSound();
    return store.subscribe(syncSound);
  }, [store]);

  // Lab sounds: experiment results, zone warnings and black holes.
  useEffect(() => {
    let previous = store.getSnapshot().state;
    return store.subscribe(() => {
      const next = store.getSnapshot().state;
      const before = previous;
      previous = next;
      if (next === before) return;

      if (next.stats.blackHoles > before.stats.blackHoles) {
        sound.play('blackhole');
        return;
      }
      if (next.stats.collapses !== before.stats.collapses) return;

      if (next.lab.run.failures > before.lab.run.failures) sound.play('fail');
      else if (next.lab.run.successes > before.lab.run.successes) sound.play('success');

      if (zoneRank(zoneOf(next.lab.stability)) > zoneRank(zoneOf(before.lab.stability))) sound.play('alarm');
    });
  }, [store]);

  useEffect(() => {
    store.tick(Date.now());
    const tickId = window.setInterval(() => store.tick(Date.now()), TICK_MS);
    const saveId = window.setInterval(() => store.save(), AUTOSAVE_MS);

    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') store.save();
      else store.tick(Date.now());
    };
    const onPageHide = (): void => store.save();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(tickId);
      window.clearInterval(saveId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [store]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): { snapshot: Snapshot; actions: GameActions } {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  const snapshot = useSyncExternalStore(ctx.store.subscribe, ctx.store.getSnapshot, ctx.store.getSnapshot);
  return { snapshot, actions: ctx.actions };
}
