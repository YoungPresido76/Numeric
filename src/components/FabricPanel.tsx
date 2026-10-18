import { useState, type ReactElement, type ReactNode } from 'react';
import {
  ANCESTRAL_COST,
  BUILDINGS,
  DECOHERENCE_MAX,
  DECOHERENCE_STEP,
  DILATION_BOOST,
  DILATION_COST,
  DILATION_DRAIN_MULT,
  DILATION_SECONDS,
  ECHO_MEMORY_FRACTION,
  SYMMETRIC_AURA,
  SYMMETRIC_MAX,
  TAPPING_COST,
  TEAR_LAYER_BONUS,
  TEAR_LAYER_CAP,
  TIERS,
  WORMHOLE_CAP,
  WORMHOLE_COST,
  WORMHOLE_MAX_POINT,
  WORMHOLE_MIN_SECONDS,
} from '../game/data';
import { echoPayout } from '../game/engine';
import { decoherenceCost, echoMemory, growthFor, shatterMult, tearCost } from '../game/fabric';
import {
  canDilate,
  canWeave,
  weavePreview,
  wormholeBlock,
  wormholePreview,
  type WormholeBlock,
} from '../game/fabricOps';
import { clamp, formatDuration, formatNumber } from '../game/math';
import { useConfirm } from '../hooks/useConfirm';
import type { GameState, LabPeak, ThreadUpgradeId, Tier } from '../game/types';
import { AudioWaveform, History, Hourglass, Spline, Waypoints } from './icons';

interface FabricPanelProps {
  state: GameState;
  onWeave: () => void;
  onDecoherence: (tier: Tier) => void;
  onWormhole: (at: number) => void;
  onDilate: () => void;
  onThreadUpgrade: (id: ThreadUpgradeId) => void;
}

const PEAK_LABEL: Readonly<Record<LabPeak, string>> = {
  stable: 'Stayed stable',
  strained: 'Strained',
  survived: 'Survived Critical',
  collapsed: 'Black hole',
};

const WORMHOLE_BLOCK_TEXT: Readonly<Record<WormholeBlock, string>> = {
  used: 'Already installed in this lab.',
  young: `This lab needs ${formatDuration(WORMHOLE_MIN_SECONDS)} of history first.`,
  poor: `Needs ${WORMHOLE_COST} Threads.`,
};

function percent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}

interface ThreadButtonProps {
  cost: number;
  threads: number;
  label: string;
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
}

/** A purchase button priced in Threads. */
function ThreadButton({ cost, threads, label, ariaLabel, disabled = false, onClick }: ThreadButtonProps): ReactElement {
  const affordable = threads >= cost && !disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!affordable}
      aria-label={ariaLabel}
      className={`flex min-h-12 min-w-24 touch-manipulation flex-col items-center justify-center rounded-xl px-3 py-1.5 text-center transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
        affordable ? 'bg-teal-300 text-slate-950 active:scale-95 active:bg-teal-200' : 'bg-white/5 text-slate-500'
      }`}
    >
      <span className="text-xs font-bold">{label}</span>
      <span className="font-numeric text-[11px] tabular-nums">{formatNumber(cost)} θ</span>
    </button>
  );
}

interface CardProps {
  icon: ReactElement;
  title: string;
  children: ReactNode;
}

function Card({ icon, title, children }: CardProps): ReactElement {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-400/15 text-teal-200 ring-1 ring-teal-300/30"
        >
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>
      <div className="mt-2.5 space-y-2">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Weave                                                               */
/* ------------------------------------------------------------------ */

function WeaveCard({ state, onWeave }: { state: GameState; onWeave: () => void }): ReactElement {
  const confirm = useConfirm();
  const preview = weavePreview(state);
  const ready = canWeave(state);
  const forgone = echoPayout(state).published;
  const span = Math.max(1, preview.nextAt - preview.previousAt);
  const progress = clamp((state.runAmplitude - preview.previousAt) / span, 0, 1);

  return (
    <section
      className={`rounded-2xl border p-4 ${
        ready ? 'border-teal-300/40 bg-teal-400/10' : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <p className="text-xs tracking-widest text-slate-400 uppercase">Weave this lab</p>
      <p className="mt-2 font-display text-4xl text-white tabular-nums">
        +{formatNumber(preview.threads)}
        <span className="ml-1.5 text-2xl text-teal-300 italic">θ</span>
      </p>
      <p className="mt-1 font-numeric text-xs text-teal-100/80">
        {preview.mult > 1.001 ? `Includes ×${preview.mult.toFixed(2)} for a close call that survived. ` : ''}
        Weaving pays Threads instead of Echoes
        {forgone > 0 ? ` (this lab would have paid ${formatNumber(forgone)} ε)` : ''}.
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className="h-full rounded-full bg-teal-300" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="mt-1.5 font-numeric text-[11px] text-slate-500">
        {formatNumber(state.runAmplitude)} / {formatNumber(preview.nextAt)} ψ for the next Thread
      </p>

      <button
        type="button"
        disabled={!ready}
        onClick={() => confirm.press(onWeave)}
        className={`mt-4 min-h-12 w-full touch-manipulation rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 ${
          !ready
            ? 'bg-white/5 text-slate-500'
            : confirm.armed
              ? 'bg-amber-300 text-slate-950'
              : 'bg-teal-300 text-slate-950 active:bg-teal-200'
        }`}
      >
        {!ready ? 'Not enough funding yet' : confirm.armed ? 'Tap again to confirm' : 'Weave and close lab'}
      </button>

      <div className="mt-3 space-y-1 text-xs leading-relaxed text-slate-400">
        <p>
          <span className="font-semibold text-slate-200">Resets:</span> amplitude, projects, upgrades, research,
          Surge, experiments and stability, as in a Collapse.
        </p>
        <p>
          <span className="font-semibold text-slate-200">Keeps:</span> Echoes, autobuyers, Threads and every Thread
          upgrade.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Thread upgrades                                                     */
/* ------------------------------------------------------------------ */

function DecoherenceCard({ state, onBuy }: { state: GameState; onBuy: (tier: Tier) => void }): ReactElement {
  const { fabric } = state;
  return (
    <Card icon={<Spline className="size-5" strokeWidth={1.7} />} title="Cost Decoherence">
      <p className="text-xs leading-snug text-slate-400">
        Permanent. Each purchase takes a fixed amount off one project&apos;s cost growth, for every lab from now on.
      </p>
      <ul className="space-y-2">
        {TIERS.map((tier) => {
          const cost = decoherenceCost(fabric, tier);
          const owned = fabric.decoherence[tier];
          const now = growthFor(fabric, tier);
          const next = now - DECOHERENCE_STEP[tier];
          return (
            <li key={tier} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-black/25 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-200">{BUILDINGS[tier].name}</p>
                <p className="font-numeric text-[11px] text-slate-400 tabular-nums">
                  growth ×{now.toFixed(2)}
                  {cost === null ? ' · done' : ` → ×${next.toFixed(2)}`} · {owned}/{DECOHERENCE_MAX}
                </p>
              </div>
              {cost === null ? (
                <span className="rounded-md bg-white/10 px-2 py-1 font-numeric text-[10px] text-teal-200">Max</span>
              ) : (
                <ThreadButton
                  cost={cost}
                  threads={fabric.threads}
                  label="Buy"
                  ariaLabel={`Buy Cost Decoherence for ${BUILDINGS[tier].name} for ${cost} threads`}
                  onClick={() => onBuy(tier)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function WormholeCard({ state, onInstall }: { state: GameState; onInstall: (at: number) => void }): ReactElement {
  const [point, setPoint] = useState(0);
  const block = wormholeBlock(state);
  const preview = wormholePreview(state, point);
  const seconds = state.lab.run.seconds * point;

  return (
    <Card icon={<History className="size-5" strokeWidth={1.7} />} title="Temporal Wormhole">
      <p className="text-xs leading-snug text-slate-400">
        Once per lab, install a retroactive upgrade at a point in this lab&apos;s history. It pays a share of what the lab
        produced since then, once. The share shrinks the later the point, and tops out at {percent(WORMHOLE_CAP)}.
      </p>
      <label className="block">
        <span className="flex items-baseline justify-between text-[11px] text-slate-300">
          <span>Install point</span>
          <span className="font-numeric text-slate-400">
            {Math.round(point * 100)}% in · {formatDuration(seconds)} into the lab
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={WORMHOLE_MAX_POINT * 100}
          step={5}
          value={Math.round(point * 100)}
          onChange={(event) => setPoint(Number(event.target.value) / 100)}
          disabled={block === 'used'}
          className="mt-1 h-8 w-full touch-manipulation accent-teal-300"
        />
      </label>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <p className="font-numeric text-[11px] leading-snug text-slate-300 tabular-nums">
          {percent(preview.fraction)} of {formatNumber(preview.since)} ψ
          <br />
          <span className="text-teal-200">= +{formatNumber(preview.gain)} ψ</span>
        </p>
        <ThreadButton
          cost={WORMHOLE_COST}
          threads={state.fabric.threads}
          label="Install"
          ariaLabel={`Install a Temporal Wormhole at ${Math.round(point * 100)} percent for ${WORMHOLE_COST} threads`}
          disabled={block !== null && block !== 'poor'}
          onClick={() => onInstall(point)}
        />
      </div>
      {block !== null ? <p className="text-[11px] text-amber-200/80">{WORMHOLE_BLOCK_TEXT[block]}</p> : null}
    </Card>
  );
}

function DilationCard({ state, onDilate }: { state: GameState; onDilate: () => void }): ReactElement {
  const left = state.fabric.dilation.activeLeft;
  const active = left > 0;
  return (
    <Card icon={<Hourglass className="size-5" strokeWidth={1.7} />} title="Dilated Time">
      <p className="text-xs leading-snug text-slate-400">
        Spend Threads for {DILATION_SECONDS} seconds of +{percent(DILATION_BOOST)} Qubit output. Stability drains at{' '}
        {DILATION_DRAIN_MULT}× the rate for the whole window, and the window itself counts as an open failure. It is
        never free, even in Critical.
      </p>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <p className="font-numeric text-xs text-slate-300 tabular-nums">
          {active ? `Open · ${formatDuration(Math.ceil(left))} left` : 'Closed'}
        </p>
        <button
          type="button"
          onClick={onDilate}
          disabled={!canDilate(state)}
          aria-label={`Open Dilated Time for ${DILATION_COST} threads`}
          className={`flex min-h-12 min-w-24 touch-manipulation flex-col items-center justify-center rounded-xl px-3 py-1.5 text-center transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
            canDilate(state)
              ? 'bg-teal-300 text-slate-950 active:scale-95 active:bg-teal-200'
              : 'bg-white/5 text-slate-500'
          }`}
        >
          <span className="text-xs font-bold">{active ? 'Open' : 'Dilate'}</span>
          <span className="font-numeric text-[11px] tabular-nums">{DILATION_COST} θ</span>
        </button>
      </div>
    </Card>
  );
}

interface OnceCardProps {
  state: GameState;
  id: ThreadUpgradeId;
  onBuy: (id: ThreadUpgradeId) => void;
}

function TappingCard({ state, id, onBuy }: OnceCardProps): ReactElement {
  const owned = state.fabric.tapping;
  return (
    <Card icon={<AudioWaveform className="size-5" strokeWidth={1.7} />} title="Superposition Tapping">
      <p className="text-xs leading-snug text-slate-400">
        Taps stop paying instantly. Each one adds an Unresolved Waveform that waits. Press Observe under the orb to
        collapse them all into one burst, bigger the faster you have been tapping. Observing while the lab is
        Strained or worse can collapse into a small Instability Setback instead.
      </p>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <p className="text-xs text-slate-300">{owned ? 'Active. Taps now make waveforms.' : 'Changes tapping for good.'}</p>
        {owned ? (
          <span className="rounded-md bg-teal-300/15 px-2 py-1 font-numeric text-[11px] text-teal-200">Owned</span>
        ) : (
          <ThreadButton
            cost={TAPPING_COST}
            threads={state.fabric.threads}
            label="Buy"
            ariaLabel={`Buy Superposition Tapping for ${TAPPING_COST} threads`}
            onClick={() => onBuy(id)}
          />
        )}
      </div>
    </Card>
  );
}

function AncestralCard({ state, id, onBuy }: OnceCardProps): ReactElement {
  const { fabric } = state;
  const memory = echoMemory(fabric);
  return (
    <Card icon={<Waypoints className="size-5" strokeWidth={1.7} />} title="Ancestral Legacy">
      <p className="text-xs leading-snug text-slate-400">
        Echo Memory: every Collapse pays {percent(ECHO_MEMORY_FRACTION)} of your best lab&apos;s Echoes extra. Symmetric
        Pair: when you Weave, if the last two labs were one that stayed Stable throughout and one that survived
        Critical, they pair up for a permanent +{percent(SYMMETRIC_AURA)} production (up to {SYMMETRIC_MAX} pairs).
      </p>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0 font-numeric text-[11px] leading-snug text-slate-300 tabular-nums">
          {fabric.ancestral ? (
            <>
              <p>
                Echo Memory: +{formatNumber(memory)} ε per Collapse (best lab {formatNumber(fabric.bestEchoes)} ε)
              </p>
              <p>
                Pairs: {fabric.pairs}/{SYMMETRIC_MAX} · +{percent(SYMMETRIC_AURA * fabric.pairs)} production
              </p>
              <p className="text-slate-500">
                Last two labs:{' '}
                {fabric.recentLabs.length === 0
                  ? 'none recorded'
                  : fabric.recentLabs.map((peak) => PEAK_LABEL[peak]).join(' · ')}
              </p>
            </>
          ) : (
            <p className="font-sans text-xs">Remembers the old labs, and pairs them up.</p>
          )}
        </div>
        {fabric.ancestral ? (
          <span className="rounded-md bg-teal-300/15 px-2 py-1 font-numeric text-[11px] text-teal-200">Owned</span>
        ) : (
          <ThreadButton
            cost={ANCESTRAL_COST}
            threads={fabric.threads}
            label="Buy"
            ariaLabel={`Buy Ancestral Legacy for ${ANCESTRAL_COST} threads`}
            onClick={() => onBuy(id)}
          />
        )}
      </div>
    </Card>
  );
}

function TearCard({ state }: { state: GameState }): ReactElement {
  const { fabric } = state;
  return (
    <Card icon={<Spline className="size-5" strokeWidth={1.7} />} title="Continuum Tear">
      <p className="text-xs leading-snug text-slate-400">
        When a lab is about to fall into a black hole, the last-chance window opens as a Tear. Spend Threads before
        it runs out to stitch it closed: the lab survives with some stability back, and you gain a permanent
        Shattered Reality Layer (+{percent(TEAR_LAYER_BONUS)} production each, up to {TEAR_LAYER_CAP}). If the window
        runs out, the lab collapses as usual. Ordinary failures still work the old way.
      </p>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-black/25 px-2 py-2">
          <p className="text-[10px] tracking-wide text-slate-400 uppercase">Layers</p>
          <p className="mt-0.5 font-numeric text-sm text-teal-100">
            {fabric.shattered}/{TEAR_LAYER_CAP} · ×{shatterMult(fabric).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl bg-black/25 px-2 py-2">
          <p className="text-[10px] tracking-wide text-slate-400 uppercase">Next stitch</p>
          <p className="mt-0.5 font-numeric text-sm text-teal-100">{formatNumber(tearCost(fabric))} θ</p>
        </div>
      </div>
      <p className="font-numeric text-[11px] text-slate-500">{fabric.tears} stitched in total.</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Progress toward the next plane                                      */
/* ------------------------------------------------------------------ */

function Check({ done, children }: { done: boolean; children: ReactNode }): ReactElement {
  return (
    <li className="flex items-start gap-2 text-xs text-slate-300">
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] ${
          done ? 'bg-teal-300 text-slate-950' : 'bg-white/10 text-slate-500'
        }`}
      >
        {done ? '✓' : ''}
      </span>
      <span className={done ? 'text-slate-200' : 'text-slate-400'}>
        {children}
        <span className="sr-only">{done ? ' (done)' : ' (not yet)'}</span>
      </span>
    </li>
  );
}

function NextPlaneCard({ state }: { state: GameState }): ReactElement {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <h3 className="text-sm font-semibold text-slate-200">Toward the next plane</h3>
      <ul className="mt-2 space-y-1.5">
        <Check done={state.treesCleared}>Fully rank all three research trees in a single lab</Check>
        <Check done={state.fabric.weaves >= 2}>
          Gather Threads across at least two Weaves ({Math.min(state.fabric.weaves, 2)}/2)
        </Check>
      </ul>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        The plane above Fabric is not open yet. These conditions are being tracked for it.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function FabricPanel({
  state,
  onWeave,
  onDecoherence,
  onWormhole,
  onDilate,
  onThreadUpgrade,
}: FabricPanelProps): ReactElement {
  const { fabric } = state;
  return (
    <div className="fade-in space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg italic text-slate-200">Fabric</h2>
        <p className="font-display text-3xl text-teal-200 tabular-nums">
          {formatNumber(fabric.threads)}
          <span className="ml-1 text-xl italic">θ</span>
        </p>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">
        Weave a lab into Threads, then spend them below. {formatNumber(fabric.threadsEarned)} drawn in total across{' '}
        {fabric.weaves} {fabric.weaves === 1 ? 'Weave' : 'Weaves'}.
      </p>

      <WeaveCard state={state} onWeave={onWeave} />
      <DecoherenceCard state={state} onBuy={onDecoherence} />
      <WormholeCard state={state} onInstall={onWormhole} />
      <DilationCard state={state} onDilate={onDilate} />
      <TappingCard state={state} id="tapping" onBuy={onThreadUpgrade} />
      <AncestralCard state={state} id="ancestral" onBuy={onThreadUpgrade} />
      <TearCard state={state} />
      <NextPlaneCard state={state} />
    </div>
  );
}
