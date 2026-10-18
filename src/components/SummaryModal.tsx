import { useEffect, useRef, useState, type ReactElement } from 'react';
import { PROJECT_NAMES } from '../game/data';
import { formatDuration, formatNumber } from '../game/math';
import type { RunSummary } from '../game/types';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ProductionChart, TierShare, zoneWord } from './Charts';
import { Galaxy } from './Galaxy';

interface SummaryModalProps {
  summary: RunSummary | null;
  onClose: () => void;
}

const SINGULARITY_MS = 1900;

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-xl bg-white/[0.06] px-3 py-2 text-left">
      <dt className="text-[10px] tracking-wide text-slate-400 uppercase">{label}</dt>
      <dd className="mt-0.5 font-numeric text-sm text-white tabular-nums">{value}</dd>
    </div>
  );
}

interface ReportProps {
  summary: RunSummary;
  onClose: () => void;
}

function Report({ summary, onClose }: ReportProps): ReactElement {
  const button = useRef<HTMLButtonElement>(null);
  const blackHole = summary.outcome === 'blackHole';

  useEffect(() => {
    button.current?.focus();
  }, []);

  return (
    <div className="fade-in relative z-10 mx-auto max-h-full w-full max-w-sm overflow-y-auto rounded-3xl border border-white/15 bg-black/55 p-5 text-center shadow-2xl backdrop-blur-md">
      <p className="font-numeric text-[11px] tracking-[0.3em] text-slate-400 uppercase">Lab {summary.lab}</p>
      <h2 id="summary-title" className="mt-1.5 font-display text-2xl italic text-white">
        {blackHole ? 'The lab fell into a black hole' : 'Lab published'}
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        {blackHole
          ? 'Its last-chance window ran out. Half the Echoes survive.'
          : 'Your research is published. The next team inherits it.'}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="Funds earned" value={`${formatNumber(summary.funds)} ψ`} />
        <Stat label="Time taken" value={formatDuration(summary.seconds)} />
        <Stat label="Experiments run" value={formatNumber(summary.experiments)} />
        <Stat label="Failures survived" value={`${formatNumber(summary.survived)} of ${formatNumber(summary.failures)}`} />
      </dl>

      <div className="mt-4 rounded-2xl bg-white/[0.06] p-3 text-left">
        <p className="text-[11px] tracking-wide text-slate-400 uppercase">Echoes</p>
        <p className="mt-1 font-display text-3xl text-fuchsia-200 tabular-nums">
          +{formatNumber(summary.echoesEarned)}
          <span className="ml-1 text-xl italic">ε</span>
        </p>
        <p className="mt-1 font-numeric text-[11px] leading-snug text-slate-400">
          {formatNumber(summary.baseEchoes)} base × {summary.riskMult.toFixed(2)} risk
          {blackHole ? ' × 0.5 black hole' : ''}. Closest call: {zoneWord(summary.closestZone).toLowerCase()}.
        </p>
      </div>

      <div className="mt-3 rounded-2xl bg-white/[0.06] p-3 text-left">
        <p className="mb-1.5 text-[11px] tracking-wide text-slate-400 uppercase">Production this lab</p>
        <ProductionChart samples={summary.history} label="Production this lab, log scale" />
      </div>

      <div className="mt-3 rounded-2xl bg-white/[0.06] p-3 text-left">
        <p className="mb-2 text-[11px] tracking-wide text-slate-400 uppercase">Where the ψ came from</p>
        <TierShare byTier={summary.byTier} tapped={summary.tapped} />
      </div>

      <ul className="mt-3 space-y-1 text-left text-xs leading-snug text-slate-300">
        {summary.legacyGrant > 0 ? (
          <li>Legacy grant for the next lab: {formatNumber(summary.legacyGrant)} ψ.</li>
        ) : null}
        {summary.perkTier !== null ? (
          <li>Carried forward: {PROJECT_NAMES[summary.perkTier]} appears earlier from now on.</li>
        ) : null}
      </ul>

      <button
        ref={button}
        type="button"
        onClick={onClose}
        className="mt-5 min-h-12 w-full touch-manipulation rounded-xl bg-cyan-300 text-sm font-bold text-slate-950 active:bg-cyan-200"
      >
        Open Lab {summary.lab + 1}
      </button>
    </div>
  );
}

/**
 * The meta-layer between labs: a galaxy backdrop, the run summary, and what is
 * carried forward. A black hole plays a short singularity sequence first.
 */
export function SummaryModal({ summary, onClose }: SummaryModalProps): ReactElement | null {
  const reducedMotion = useReducedMotion();
  const [revealedFor, setRevealedFor] = useState<number | null>(null);
  const labNumber = summary?.lab ?? null;
  const blackHole = summary?.outcome === 'blackHole';

  useEffect(() => {
    if (labNumber === null || !blackHole || reducedMotion) return undefined;
    const id = window.setTimeout(() => setRevealedFor(labNumber), SINGULARITY_MS);
    return () => window.clearTimeout(id);
  }, [labNumber, blackHole, reducedMotion]);

  if (!summary) return null;
  const showReport = !blackHole || reducedMotion || revealedFor === summary.lab;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={showReport ? 'summary-title' : undefined}
      aria-label={showReport ? undefined : 'The lab is collapsing'}
      className="fixed inset-0 z-50 grid place-items-center p-4"
    >
      <Galaxy variant={blackHole ? 'void' : 'violet'} />
      {showReport ? <Report summary={summary} onClose={onClose} /> : <div aria-hidden="true" className="singularity" />}
    </div>
  );
}
