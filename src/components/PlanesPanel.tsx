import { useState, type ReactElement } from 'react';
import { multiverseUnlocked } from '../game/multiverse';
import type { AutoStitchMode, GameState, ThreadUpgradeId, Tier, VarianceId } from '../game/types';
import { FabricPanel } from './FabricPanel';
import { MultiverseLocked, MultiversePanel } from './MultiversePanel';

interface PlanesPanelProps {
  state: GameState;
  onWeave: () => void;
  onDecoherence: (tier: Tier) => void;
  onWormhole: (at: number) => void;
  onDilate: () => void;
  onThreadUpgrade: (id: ThreadUpgradeId) => void;
  onConverge: () => void;
  onEnterVariance: (id: VarianceId) => void;
  onLeaveVariance: () => void;
  onAutoStitch: (mode: AutoStitchMode) => void;
}

type Plane = 'fabric' | 'multiverse';

const PLANES: readonly { id: Plane; label: string; dim: string }[] = [
  { id: 'fabric', label: 'Fabric', dim: '4D' },
  { id: 'multiverse', label: 'Multiverse', dim: '5D' },
];

/** The planes above the lab. Fabric alone at first; a switch appears once the Multiverse opens. */
export function PlanesPanel(props: PlanesPanelProps): ReactElement {
  const { state } = props;
  const open = multiverseUnlocked(state);
  const [plane, setPlane] = useState<Plane>('fabric');
  const view: Plane = open ? plane : 'fabric';

  return (
    <div className="space-y-3">
      {open ? (
        <div role="group" aria-label="Plane" className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1">
          {PLANES.map(({ id, label, dim }) => {
            const selected = view === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => setPlane(id)}
                className={`min-h-10 touch-manipulation rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                  selected ? 'bg-white/10 text-white' : 'text-slate-400 active:text-slate-200'
                }`}
              >
                {label} <span className="font-numeric text-[10px] text-slate-500">{dim}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <MultiverseLocked weaves={state.fabric.weaves} />
      )}

      {view === 'fabric' ? (
        <FabricPanel
          state={state}
          onWeave={props.onWeave}
          onDecoherence={props.onDecoherence}
          onWormhole={props.onWormhole}
          onDilate={props.onDilate}
          onThreadUpgrade={props.onThreadUpgrade}
        />
      ) : (
        <MultiversePanel
          state={state}
          onConverge={props.onConverge}
          onEnterVariance={props.onEnterVariance}
          onLeaveVariance={props.onLeaveVariance}
          onAutoStitch={props.onAutoStitch}
        />
      )}
    </div>
  );
}
