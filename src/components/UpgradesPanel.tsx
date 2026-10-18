import { useState, type ReactElement } from 'react';
import { UPGRADES } from '../game/data';
import { isUpgradeVisible } from '../game/engine';
import { formatNumber } from '../game/math';
import { isResearchUnlocked } from '../game/research';
import type { GameState, ResearchNode, TreeId, UpgradeId } from '../game/types';
import { ResearchPanel } from './ResearchPanel';

interface UpgradesPanelProps {
  state: GameState;
  onBuy: (id: UpgradeId) => void;
  onResearch: (tree: TreeId, node: ResearchNode) => void;
}

type View = 'upgrades' | 'research';

const VIEWS: readonly { value: View; label: string }[] = [
  { value: 'upgrades', label: 'Upgrades' },
  { value: 'research', label: 'Research' },
];

interface UpgradeListProps {
  state: GameState;
  onBuy: (id: UpgradeId) => void;
}

function UpgradeList({ state, onBuy }: UpgradeListProps): ReactElement {
  const acquired = UPGRADES.filter((u) => state.upgrades.includes(u.id));
  const unbought = UPGRADES.filter((u) => !state.upgrades.includes(u.id));
  const visible = unbought.filter((u) => isUpgradeVisible(state, u));
  const hiddenCount = unbought.length - visible.length;

  return (
    <div className="fade-in space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg italic text-slate-200">Upgrades</h2>
        <p className="font-numeric text-xs text-slate-500">
          {acquired.length}/{UPGRADES.length} acquired
        </p>
      </div>

      {visible.length === 0 && unbought.length > 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs leading-relaxed text-slate-500">
          Nothing to discover yet. Keep producing ψ and new upgrades will surface as this reality grows.
        </p>
      ) : null}

      {unbought.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cyan-300/20 px-4 py-6 text-center text-xs leading-relaxed text-cyan-200/70">
          Every upgrade in this reality is acquired. Collapse to begin again, stronger.
        </p>
      ) : null}

      <ul className="space-y-2.5">
        {visible.map((upgrade) => {
          const affordable = state.amplitude >= upgrade.cost;
          return (
            <li
              key={upgrade.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
            >
              <div
                aria-hidden="true"
                className="grid size-11 place-items-center rounded-xl bg-violet-400/15 font-display text-lg text-violet-200 ring-1 ring-violet-300/30"
              >
                {upgrade.symbol}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-100">{upgrade.name}</h3>
                <p className="mt-0.5 text-xs leading-snug text-slate-400">{upgrade.description}</p>
              </div>
              <button
                type="button"
                onClick={() => onBuy(upgrade.id)}
                disabled={!affordable}
                aria-label={`Buy ${upgrade.name} for ${formatNumber(upgrade.cost)} amplitude`}
                className={`flex min-h-12 min-w-24 touch-manipulation flex-col items-center justify-center rounded-xl px-3 py-1.5 text-center transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                  affordable
                    ? 'bg-violet-300 text-slate-950 active:scale-95 active:bg-violet-200'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                <span className="text-xs font-bold">Buy</span>
                <span className="font-numeric text-[11px] tabular-nums">{formatNumber(upgrade.cost)} ψ</span>
              </button>
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 && visible.length > 0 ? (
        <p className="text-center text-xs text-slate-600">
          +{hiddenCount} more {hiddenCount === 1 ? 'upgrade' : 'upgrades'} waiting at higher amplitude
        </p>
      ) : null}

      {acquired.length > 0 ? (
        <details className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400 select-none">
            Acquired ({acquired.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {acquired.map((upgrade) => (
              <li key={upgrade.id} className="text-xs text-slate-400">
                <span className="font-semibold text-slate-200">{upgrade.name}</span>
                <span className="text-slate-500"> · {upgrade.description}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function UpgradesPanel({ state, onBuy, onResearch }: UpgradesPanelProps): ReactElement {
  const [view, setView] = useState<View>('upgrades');
  const researchOpen = isResearchUnlocked(state);

  if (!researchOpen) return <UpgradeList state={state} onBuy={onBuy} />;

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Upgrades or research"
        className="grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.04] p-0.5"
      >
        {VIEWS.map((option) => {
          const selected = option.value === view;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setView(option.value)}
              className={`min-h-10 touch-manipulation rounded-[10px] px-3 text-xs font-semibold transition-colors ${
                selected ? 'bg-violet-300 text-slate-950' : 'text-slate-400 active:text-slate-100'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {view === 'upgrades' ? (
        <UpgradeList state={state} onBuy={onBuy} />
      ) : (
        <ResearchPanel state={state} onBuy={onResearch} />
      )}
    </div>
  );
}
