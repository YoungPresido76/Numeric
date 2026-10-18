import type { ReactElement, ReactNode } from 'react';
import { PROJECT_NAMES, PROJECT_TIERS } from '../game/data';
import { formatDuration, formatNumber } from '../game/math';
import type { GameState, NoteTone, Zone } from '../game/types';
import { ProductionChart, StabilityChart, TierShare, zoneWord } from './Charts';
import { TIER_ICONS, TIER_TILE } from './icons';

interface LabPanelProps {
  state: GameState;
  zone: Zone;
}

const ZONE_BLURB: Readonly<Record<Zone, string>> = {
  stable: 'Calm and cool. Nothing needs you.',
  strained: 'The lab is straining. Watch for the project named in the notebook.',
  critical: 'Failures are spreading. Neutralize them or publish soon.',
  imminent: 'The last-chance window is open. Repair something now or publish.',
};

const ZONE_DOT: Readonly<Record<Zone, string>> = {
  stable: 'bg-sky-300',
  strained: 'bg-amber-300',
  critical: 'bg-rose-400',
  imminent: 'bg-rose-500 animate-pulse',
};

const TONE_CLASS: Readonly<Record<NoteTone, string>> = {
  info: 'text-slate-300',
  good: 'text-cyan-200',
  warn: 'text-amber-200',
  alert: 'text-rose-300',
};

function Card({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <h3 className="text-[11px] tracking-widest text-slate-400 uppercase">{title}</h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

export function LabPanel({ state, zone }: LabPanelProps): ReactElement {
  const { lab, history, notes } = state;
  const run = lab.run;
  const recent = notes.slice(-10).reverse();

  const stats: readonly { label: string; value: string }[] = [
    { label: 'Time in lab', value: formatDuration(run.seconds) },
    { label: 'Experiments run', value: formatNumber(run.experiments) },
    { label: 'Observed', value: formatNumber(run.observed) },
    { label: 'Failures survived', value: `${formatNumber(run.survived)} / ${formatNumber(run.failures)}` },
  ];

  return (
    <div className="fade-in space-y-3">
      <h2 className="font-display text-lg italic text-slate-200">Lab</h2>

      <Card title="Stability">
        <div className="mb-2 flex items-center gap-2">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${ZONE_DOT[zone]}`} />
          <p className="text-sm font-semibold text-slate-100">{zoneWord(zone)}</p>
        </div>
        <StabilityChart
          samples={history.samples}
          label={`Stability history. The lab is currently ${zoneWord(zone).toLowerCase()}.`}
        />
        <p className="mt-2 text-xs leading-snug text-slate-400">{ZONE_BLURB[zone]}</p>
      </Card>

      <Card title="Projects running experiments">
        <ul className="space-y-2">
          {PROJECT_TIERS.map((tier) => {
            const Icon = TIER_ICONS[tier];
            const online = state.bought[tier] > 0;
            const active = lab.experiments.some((e) => e.tier === tier);
            return (
              <li key={tier} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ring-1 ${
                    online ? TIER_TILE[tier] : 'bg-white/5 text-slate-600 ring-white/10'
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[13px] ${online ? 'text-slate-100' : 'text-slate-500'}`}>
                    {PROJECT_NAMES[tier]}
                  </p>
                  <p className="font-numeric text-[11px] text-slate-500">
                    {!online ? 'Offline. Fund this project to start.' : active ? 'Experiment superposed now' : 'Online'}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Production over time">
        <ProductionChart samples={history.samples} label="Production over time, log scale" />
        <p className="mt-1.5 text-[11px] text-slate-500">Log scale. A straight climb means exponential growth.</p>
      </Card>

      <Card title="Where the ψ came from">
        <TierShare byTier={run.byTier} tapped={run.tapped} />
      </Card>

      <Card title="This lab">
        <dl className="grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/5 px-3 py-2">
              <dt className="text-[10px] tracking-wide text-slate-500 uppercase">{stat.label}</dt>
              <dd className="mt-0.5 font-numeric text-sm text-slate-100 tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Notebook">
        <ol className="space-y-2">
          {recent.map((note) => (
            <li key={note.id} className={`font-numeric text-[12px] leading-snug ${TONE_CLASS[note.tone]}`}>
              {note.text}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
