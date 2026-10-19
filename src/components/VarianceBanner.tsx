import type { ReactElement } from 'react';
import { VARIANCE_BY_ID } from '../game/variance';
import type { MultiverseState } from '../game/types';
import { Atom } from './icons';

/** A slim reminder, on every tab, that a Variance is running and how far its streak is. */
export function VarianceBanner({ multiverse }: { multiverse: MultiverseState }): ReactElement | null {
  if (multiverse.active === null) return null;
  const def = VARIANCE_BY_ID[multiverse.active];
  return (
    <div
      role="status"
      className="fade-in mx-3 mb-2 flex shrink-0 items-center gap-2.5 rounded-xl border border-violet-300/40 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100"
    >
      <Atom aria-hidden="true" className="size-4 shrink-0" />
      <p className="flex-1 leading-snug uppercase">{def.name}</p>
      <p className="font-numeric tabular-nums">
        {multiverse.streak}/{def.goal} labs
      </p>
    </div>
  );
}
