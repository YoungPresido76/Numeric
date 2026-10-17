import { useEffect, useRef, useState, type ReactElement } from 'react';
import { formatNumber } from '../game/math';
import type { Derived } from '../game/types';

interface EquationTickerProps {
  derived: Derived;
}

interface TermProps {
  symbol: string;
  label: string;
  text: string;
  tone: string;
  flashOnChange: boolean;
}

function Term({ symbol, label, text, tone, flashOnChange }: TermProps): ReactElement {
  const [pulse, setPulse] = useState(false);
  const previous = useRef(text);

  useEffect(() => {
    if (!flashOnChange || previous.current === text) {
      previous.current = text;
      return undefined;
    }
    previous.current = text;
    setPulse(true);
    const id = window.setTimeout(() => setPulse(false), 450);
    return () => window.clearTimeout(id);
  }, [text, flashOnChange]);

  return (
    <div className="flex min-w-0 flex-col items-center leading-none">
      <span className="font-display text-[11px] italic text-slate-400">{symbol}</span>
      <span
        className={`mt-1 font-numeric text-[13px] font-semibold tabular-nums ${tone} ${pulse ? 'chip-flash' : ''}`}
      >
        {text}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function Times(): ReactElement {
  return (
    <span aria-hidden="true" className="self-end pb-px font-numeric text-xs text-slate-600">
      ×
    </span>
  );
}

/** Live production equation: dψ/dt = n · r · Γ · S · ε, with current values substituted. */
export function EquationTicker({ derived }: EquationTickerProps): ReactElement {
  const surging = derived.surgeFactor > 1;
  return (
    <div
      role="group"
      aria-label="Production equation"
      className="mx-auto flex w-full max-w-xs items-end justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2"
    >
      <span aria-hidden="true" className="self-end pb-px font-display text-sm italic text-cyan-200/80">
        ψ̇ =
      </span>
      <Term symbol="n" label="Qubits" text={formatNumber(derived.units[0])} tone="text-slate-100" flashOnChange={false} />
      <Times />
      <Term symbol="r" label="Output per Qubit" text={formatNumber(derived.rates[0])} tone="text-cyan-200" flashOnChange />
      <Times />
      <Term symbol="Γ" label="Upgrade multiplier" text={formatNumber(derived.upgradeGlobal)} tone="text-violet-200" flashOnChange />
      <Times />
      <Term
        symbol="S"
        label="Surge multiplier"
        text={formatNumber(derived.surgeFactor)}
        tone={surging ? 'text-amber-300' : 'text-slate-500'}
        flashOnChange
      />
      <Times />
      <Term symbol="ε" label="Echo multiplier" text={formatNumber(derived.echoMult)} tone="text-fuchsia-200" flashOnChange />
    </div>
  );
}
