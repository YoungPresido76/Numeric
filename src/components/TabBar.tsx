import type { ReactElement } from 'react';
import { FlaskConical, Layers, Orbit, TrendingUp, Waypoints } from './icons';

export type TabId = 'build' | 'upgrades' | 'lab' | 'collapse' | 'fabric';

interface TabBarProps {
  active: TabId;
  onSelect: (id: TabId) => void;
  /** A tab the tutorial wants the player to open. */
  hintTab: TabId | null;
  /** Tabs with something new to do. */
  badges: Readonly<Partial<Record<TabId, boolean>>>;
  /** The Fabric tab appears once Fabric is unlocked. */
  showFabric: boolean;
  /** Once the Multiverse is open the Fabric tab becomes Planes. */
  showPlanes: boolean;
}

interface TabDef {
  id: TabId;
  label: string;
  Icon: typeof Layers;
}

const TABS: readonly TabDef[] = [
  { id: 'build', label: 'Projects', Icon: Layers },
  { id: 'upgrades', label: 'Upgrades', Icon: TrendingUp },
  { id: 'lab', label: 'Lab', Icon: FlaskConical },
  { id: 'collapse', label: 'Collapse', Icon: Orbit },
  { id: 'fabric', label: 'Fabric', Icon: Waypoints },
];

export function TabBar({ active, onSelect, hintTab, badges, showFabric, showPlanes }: TabBarProps): ReactElement {
  const tabs = showFabric ? TABS : TABS.filter((tab) => tab.id !== 'fabric');
  return (
    <nav
      role="tablist"
      aria-label="Game sections"
      className={`grid shrink-0 ${showFabric ? 'grid-cols-5' : 'grid-cols-4'} border-t bg-void/90 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-colors duration-700`}
      style={{ borderTopColor: 'color-mix(in srgb, var(--zone-a) 28%, transparent)' }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const selected = id === active;
        const hinted = hintTab === id && !selected;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={selected}
            aria-controls="panel"
            onClick={() => onSelect(id)}
            className={`relative flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-300 ${
              selected ? 'text-cyan-200' : 'text-slate-400 active:text-slate-200'
            }`}
          >
            {selected ? (
              <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-cyan-300" />
            ) : null}
            <span className="relative">
              <Icon aria-hidden="true" strokeWidth={1.7} className={`size-6 ${hinted ? 'animate-pulse text-cyan-300' : ''}`} />
              {badges[id] && !selected ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-1 size-2 rounded-full bg-fuchsia-400 ring-2 ring-void"
                />
              ) : null}
            </span>
            {id === 'fabric' && showPlanes ? 'Planes' : label}
          </button>
        );
      })}
    </nav>
  );
}
