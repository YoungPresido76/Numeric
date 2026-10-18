import { useEffect, useRef, type ReactElement } from 'react';
import { OFFLINE_CAP_SECONDS } from '../game/data';
import { formatDuration, formatNumber } from '../game/math';
import type { OfflineReport } from '../game/types';

interface OfflineModalProps {
  report: OfflineReport | null;
  onClose: () => void;
}

/** Welcome-back card summarising what your realities produced while you were away. */
export function OfflineModal({ report, onClose }: OfflineModalProps): ReactElement | null {
  const button = useRef<HTMLButtonElement>(null);
  const open = report !== null;

  useEffect(() => {
    if (!open) return undefined;
    button.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-title"
        className="fade-in w-full max-w-xs rounded-3xl border border-cyan-300/30 bg-panel p-6 text-center shadow-2xl shadow-cyan-500/10"
      >
        <p className="font-numeric text-[11px] tracking-[0.3em] text-slate-400 uppercase">While you were away</p>
        <h2 id="offline-title" className="mt-2 font-display text-2xl italic text-cyan-100">
          {formatDuration(report.seconds)}
        </h2>
        <p className="mt-4 font-display text-4xl tabular-nums text-white">
          +{formatNumber(report.gained)}
          <span className="ml-1.5 text-2xl italic text-cyan-300">ψ</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          Your realities ran at {Math.round(report.efficiency * 100)}% efficiency
          {report.capped
            ? `, counting only the first ${formatDuration(OFFLINE_CAP_SECONDS)} of your absence.`
            : '.'}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Experiments were paused while you were away, so the lab is exactly as you left it.
        </p>
        <button
          ref={button}
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-cyan-300 py-3 text-sm font-semibold text-slate-950 active:bg-cyan-200"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
