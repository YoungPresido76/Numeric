import type { ReactElement } from 'react';
import { SURGE_MULT } from '../game/data';
import { clamp, formatDuration } from '../game/math';
import type { SurgeState } from '../game/types';

interface SurgeButtonProps {
  surge: SurgeState;
  duration: number;
  cooldown: number;
  onActivate: () => void;
}

function seconds(value: number): string {
  return value < 10 ? `${value.toFixed(1)}s` : formatDuration(value);
}

/** The active ability: a wide button whose fill shows remaining Surge or recharge progress. */
export function SurgeButton({ surge, duration, cooldown, onActivate }: SurgeButtonProps): ReactElement {
  const active = surge.activeLeft > 0;
  const cooling = !active && surge.cooldownLeft > 0;
  const ready = !active && !cooling;

  const progress = active
    ? surge.activeLeft / duration
    : cooling
      ? 1 - surge.cooldownLeft / cooldown
      : 1;
  const percent = clamp(progress * 100, 0, 100);

  const title = active ? `Superposed ×${SURGE_MULT}` : cooling ? 'Recharging' : 'Superposition Surge';
  const detail = active
    ? seconds(surge.activeLeft)
    : cooling
      ? seconds(surge.cooldownLeft)
      : `×${SURGE_MULT} for ${formatDuration(duration)}`;

  const shell = active
    ? 'border-amber-300/60 text-amber-100'
    : ready
      ? 'border-cyan-300/50 text-cyan-50 active:scale-[0.99]'
      : 'border-white/10 text-slate-400';
  const fill = active ? 'bg-amber-400/35' : ready ? 'bg-cyan-300/25' : 'bg-violet-400/20';

  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={!ready}
      aria-label={`${title}. ${detail}`}
      className={`relative mx-auto block h-11 w-full max-w-xs touch-manipulation overflow-hidden rounded-xl border bg-white/[0.04] transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${shell}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 ${fill} transition-[width] duration-100 ease-linear`}
        style={{ width: `${percent}%` }}
      />
      <span className="relative flex h-full items-center justify-between px-4 text-sm">
        <span className="font-semibold tracking-wide">{title}</span>
        <span className="font-numeric text-xs tabular-nums opacity-90">{detail}</span>
      </span>
    </button>
  );
}
