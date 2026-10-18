import type { ReactElement } from 'react';
import { BUILDINGS, ZONE_CRITICAL_MIN, ZONE_STABLE_MIN, ZONE_STRAINED_MIN } from '../game/data';
import { formatNumber } from '../game/math';
import type { HistorySample, Quad, Zone } from '../game/types';
import { TIER_CHART_COLORS } from './icons';

const W = 300;

interface LineChartProps {
  samples: readonly HistorySample[];
  label: string;
}

/** Production over time on a log scale, so exponential growth reads as a steady climb. */
export function ProductionChart({ samples, label }: LineChartProps): ReactElement {
  const H = 76;
  const usable = samples.filter((s) => s.ps > 0);
  if (usable.length < 2) {
    return (
      <div className="grid h-[76px] place-items-center rounded-xl bg-white/[0.03] text-xs text-slate-500">
        Collecting readings…
      </div>
    );
  }

  const logs = usable.map((s) => Math.log10(s.ps + 1));
  const lo = Math.min(...logs);
  const hi = Math.max(...logs);
  const span = Math.max(hi - lo, 0.5);
  const pad = 6;
  const point = (value: number, index: number): string => {
    const x = (index / (logs.length - 1)) * W;
    const y = H - pad - ((value - lo) / span) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const line = logs.map((v, i) => point(v, i));
  const area = `0,${H} ${line.join(' ')} ${W},${H}`;
  const last = usable[usable.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${label}. Now ${formatNumber(last?.ps ?? 0)} ψ per second, up from ${formatNumber(usable[0]?.ps ?? 0)}.`}
      className="h-[76px] w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="prod-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#prod-fill)" />
      <polyline
        points={line.join(' ')}
        fill="none"
        stroke="#7dd3fc"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const ZONE_WORDS: Readonly<Record<Zone, string>> = {
  stable: 'Stable',
  strained: 'Strained',
  critical: 'Critical',
  imminent: 'Collapse imminent',
};

export function zoneWord(zone: Zone): string {
  return ZONE_WORDS[zone];
}

interface StabilityChartProps {
  samples: readonly HistorySample[];
  label: string;
}

/**
 * Stability history with zone bands and no numbers: a glanceable line you read
 * against the coloured bands (stable, strained, critical, imminent from top to bottom).
 */
export function StabilityChart({ samples, label }: StabilityChartProps): ReactElement {
  const H = 56;
  const y = (stability: number): number => H - (stability / 100) * H;
  const bands: readonly { from: number; to: number; fill: string }[] = [
    { from: 100, to: ZONE_STABLE_MIN, fill: 'rgba(125, 211, 252, 0.09)' },
    { from: ZONE_STABLE_MIN, to: ZONE_STRAINED_MIN, fill: 'rgba(251, 146, 60, 0.11)' },
    { from: ZONE_STRAINED_MIN, to: ZONE_CRITICAL_MIN, fill: 'rgba(248, 113, 113, 0.14)' },
    { from: ZONE_CRITICAL_MIN, to: 0, fill: 'rgba(244, 63, 94, 0.22)' },
  ];

  const points =
    samples.length >= 2
      ? samples
          .map((s, i) => `${((i / (samples.length - 1)) * W).toFixed(1)},${y(s.stab).toFixed(1)}`)
          .join(' ')
      : '';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      className="h-14 w-full overflow-hidden rounded-xl"
      preserveAspectRatio="none"
    >
      {bands.map((band) => (
        <rect key={band.from} x="0" y={y(band.from)} width={W} height={y(band.to) - y(band.from)} fill={band.fill} />
      ))}
      {points ? (
        <polyline
          points={points}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}

interface TierShareProps {
  byTier: Quad;
  tapped: number;
}

/** Where this lab's ψ came from, by tier chain and taps. Segments are separated by gaps, with a labelled legend. */
export function TierShare({ byTier, tapped }: TierShareProps): ReactElement {
  const parts = [
    ...byTier.map((value, index) => ({
      key: BUILDINGS[index]?.name ?? `Tier ${index}`,
      value,
      color: TIER_CHART_COLORS[index as 0 | 1 | 2 | 3],
    })),
    { key: 'Taps', value: tapped, color: '#94a3b8' },
  ];
  const total = parts.reduce((sum, p) => sum + p.value, 0);

  if (!(total > 0)) {
    return (
      <div className="grid h-9 place-items-center rounded-xl bg-white/[0.03] text-xs text-slate-500">
        Nothing produced yet
      </div>
    );
  }

  return (
    <div>
      <div
        role="img"
        aria-label={`Output share: ${parts.map((p) => `${p.key} ${Math.round((p.value / total) * 100)}%`).join(', ')}`}
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
      >
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <div key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
          ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2 text-[11px] text-slate-400">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-sm" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate">{p.key}</span>
            <span className="font-numeric text-slate-300 tabular-nums">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
