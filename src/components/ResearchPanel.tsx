import type { ReactElement } from 'react';
import {
  RESEARCH_MAIN_MAX,
  RESEARCH_SUB_MAX,
  RESEARCH_TREES,
  type ResearchEffect,
  type ResearchTreeDef,
} from '../game/data';
import { isTreeComplete, nodeStatus, subCap, type NodeStatus } from '../game/research';
import { formatNumber } from '../game/math';
import type { GameState, ResearchNode, TreeId } from '../game/types';
import { Coins, Eye, FlaskConical, type IconComponent } from './icons';

interface ResearchPanelProps {
  state: GameState;
  onBuy: (tree: TreeId, node: ResearchNode) => void;
}

interface TreeStyle {
  Icon: IconComponent;
  tile: string;
  bar: string;
  barDim: string;
  button: string;
  text: string;
  border: string;
}

/** One accent per tree. Full class names so Tailwind can see them. */
const TREE_STYLE: Readonly<Record<TreeId, TreeStyle>> = {
  grant: {
    Icon: Coins,
    tile: 'bg-amber-400/15 text-amber-200 ring-amber-300/30',
    bar: 'bg-amber-300',
    barDim: 'bg-amber-300/25',
    button: 'bg-amber-300 text-slate-950 active:bg-amber-200',
    text: 'text-amber-200',
    border: 'border-amber-300/30',
  },
  observation: {
    Icon: Eye,
    tile: 'bg-sky-400/15 text-sky-200 ring-sky-300/30',
    bar: 'bg-sky-300',
    barDim: 'bg-sky-300/25',
    button: 'bg-sky-300 text-slate-950 active:bg-sky-200',
    text: 'text-sky-200',
    border: 'border-sky-300/30',
  },
  calibration: {
    Icon: FlaskConical,
    tile: 'bg-lime-400/15 text-lime-200 ring-lime-300/30',
    bar: 'bg-lime-300',
    barDim: 'bg-lime-300/25',
    button: 'bg-lime-300 text-slate-950 active:bg-lime-200',
    text: 'text-lime-200',
    border: 'border-lime-300/30',
  },
};

function percent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}

/** What the ranks bought so far add up to, in words. */
function totalText(effect: ResearchEffect, ranks: number): string {
  const total = effect.per * ranks;
  switch (effect.kind) {
    case 'output':
      return `+${percent(total)} ψ output`;
    case 'costCut':
      return `−${percent(total)} project costs`;
    case 'observedPayout':
      return `+${percent(total)} observed payout`;
    case 'tapFraction':
      return `+${percent(total)} of ψ/s per tap`;
    case 'surgeSeconds':
      return `+${total}s Surge`;
    case 'taskTime':
      return `+${percent(total)} experiment time`;
    case 'failureLoss':
      return `−${percent(total)} failure losses`;
    case 'successStability':
      return `+${total} stability per success`;
  }
}

interface NodeButtonProps {
  status: NodeStatus;
  amplitude: number;
  label: string;
  style: TreeStyle;
  onPress: () => void;
}

function NodeButton({ status, amplitude, label, style, onPress }: NodeButtonProps): ReactElement {
  const base =
    'flex min-h-11 min-w-[5.5rem] touch-manipulation flex-col items-center justify-center rounded-xl px-2.5 py-1 text-center transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300';
  if (status.kind === 'ready') {
    const affordable = amplitude >= status.cost;
    return (
      <button
        type="button"
        onClick={onPress}
        disabled={!affordable}
        aria-label={`Research ${label} for ${formatNumber(status.cost)} amplitude`}
        className={`${base} ${affordable ? `${style.button} active:scale-95` : 'bg-white/5 text-slate-500'}`}
      >
        <span className="text-xs font-bold">Research</span>
        <span className="font-numeric text-[11px] tabular-nums">{formatNumber(status.cost)} ψ</span>
      </button>
    );
  }
  const text =
    status.kind === 'maxed' ? 'Done' : status.kind === 'locked' ? `Subs at ${status.need}` : 'Stage cap';
  const hint = status.kind === 'locked' ? 'Both lines first' : status.kind === 'capped' ? 'Needs Main' : 'Complete';
  return (
    <div
      aria-label={`${label}: ${text}`}
      className={`${base} ${status.kind === 'maxed' ? 'bg-white/[0.06] text-slate-300' : 'bg-white/5 text-slate-500'}`}
    >
      <span className="text-xs font-bold">{text}</span>
      <span className="text-[10px]">{hint}</span>
    </div>
  );
}

interface RankBarProps {
  rank: number;
  cap: number;
  style: TreeStyle;
}

/** Eight segments: filled for ranks held, solid-dim up to the current cap, empty past it. */
function RankBar({ rank, cap, style }: RankBarProps): ReactElement {
  const segments = Array.from({ length: RESEARCH_SUB_MAX }, (_, index) => index);
  return (
    <div className="flex gap-0.5" aria-hidden="true">
      {segments.map((index) => (
        <span
          key={index}
          className={`h-1.5 flex-1 rounded-full ${
            index < rank ? style.bar : index < cap ? style.barDim : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

interface TreeCardProps {
  def: ResearchTreeDef;
  state: GameState;
  onBuy: (tree: TreeId, node: ResearchNode) => void;
}

function TreeCard({ def, state, onBuy }: TreeCardProps): ReactElement {
  const style = TREE_STYLE[def.id];
  const ranks = state.research[def.id];
  const complete = isTreeComplete(ranks);
  const cap = subCap(ranks.main);
  const mainStatus = nodeStatus(state, def.id, 'main');
  const Icon = style.Icon;

  return (
    <li
      className={`rounded-2xl border p-3 ${complete ? style.border : 'border-white/10'} bg-white/[0.04]`}
    >
      <div className="flex items-center gap-3">
        <div aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ${style.tile}`}>
          <Icon className="size-6" strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-100">{def.name}</h3>
          <p className="text-[11px] text-slate-400">
            {def.focus} · {def.blurb}
          </p>
        </div>
        <div
          role="img"
          aria-label={`Main stage ${ranks.main} of ${RESEARCH_MAIN_MAX}`}
          className="flex shrink-0 gap-1"
        >
          {Array.from({ length: RESEARCH_MAIN_MAX }, (_, index) => (
            <span
              key={index}
              className={`size-2 rounded-full ${index < ranks.main ? style.bar : 'bg-white/15'}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-black/25 p-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-100">
            <span aria-hidden="true" className={`mr-1.5 font-display ${style.text}`}>
              {def.mainSymbol}
            </span>
            {def.mainName}
            <span className="ml-1.5 font-numeric text-[10px] font-normal text-slate-400">
              {ranks.main}/{RESEARCH_MAIN_MAX}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
            {def.perRank} per stage
            {ranks.main > 0 ? <span className={style.text}> · now {totalText(def.mainEffect, ranks.main)}</span> : null}
          </p>
        </div>
        <NodeButton
          status={mainStatus}
          amplitude={state.amplitude}
          label={def.mainName}
          style={style}
          onPress={() => onBuy(def.id, 'main')}
        />
      </div>

      <ul className="mt-2 space-y-2">
        {def.subs.map((sub, index) => {
          const node: ResearchNode = index === 0 ? 'subA' : 'subB';
          const rank = ranks.subs[index === 0 ? 0 : 1];
          const status = nodeStatus(state, def.id, node);
          return (
            <li key={sub.name} className="grid grid-cols-[1fr_auto] items-center gap-3 px-1">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-200">
                  <span aria-hidden="true" className="mr-1.5 text-slate-500">
                    {sub.symbol}
                  </span>
                  {sub.name}
                  <span className="ml-1.5 font-numeric text-[10px] text-slate-400">
                    {rank}/{Math.min(cap, RESEARCH_SUB_MAX)}
                  </span>
                </p>
                <p className="mb-1 text-[11px] text-slate-500">
                  {sub.perRank}
                  {rank > 0 ? <span className={style.text}> · now {totalText(sub.effect, rank)}</span> : null}
                </p>
                <RankBar rank={rank} cap={cap} style={style} />
              </div>
              <NodeButton
                status={status}
                amplitude={state.amplitude}
                label={sub.name}
                style={style}
                onPress={() => onBuy(def.id, node)}
              />
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export function ResearchPanel({ state, onBuy }: ResearchPanelProps): ReactElement {
  const completed = RESEARCH_TREES.filter((def) => isTreeComplete(state.research[def.id])).length;

  return (
    <div className="fade-in space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg italic text-slate-200">Research</h2>
        <p className="font-numeric text-xs text-slate-500">
          {completed}/{RESEARCH_TREES.length} complete
        </p>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">
        Each line has a Main upgrade with three stages. Raise both of its sub-lines to the current cap to unlock
        the next stage; the cap grows from 4 to 6 to 8. Research is reset when the lab closes.
      </p>
      {state.treesCleared ? (
        <p className="rounded-2xl border border-cyan-300/20 px-4 py-3 text-center text-xs leading-relaxed text-cyan-200/80">
          All three lines have been completed in a single lab.
        </p>
      ) : null}
      <ul className="space-y-2.5">
        {RESEARCH_TREES.map((def) => (
          <TreeCard key={def.id} def={def} state={state} onBuy={onBuy} />
        ))}
      </ul>
    </div>
  );
}
