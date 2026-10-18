import type { ReactElement } from 'react';
import { FlaskConical, Layers, Orbit, Settings, TrendingUp } from './icons';

export type TabId = 'build' | 'upgrades' | 'lab' | 'collapse' | 'system';

interface TabBarProps {
  active: TabId;
  onSelect: (id: TabId) => void;
  /** A tab the tutorial wants the player to open. */
  hintTab: TabId | null;
  /** Tabs with something new to do. */
  badges: Readonly<Partial<Record<TabId, boolean>>>;
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
  { id: 'system', label: 'System', Icon: Settings },
];

export function TabBar({ active, onSelect, hintTab, badges }: TabBarProps): ReactElement {
  return (
    <nav
      role="tablist"
      aria-label="Game sections"
      className="grid shrink-0 grid-cols-5 border-t bg-void/90 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-colors duration-700"
      style={{ borderTopColor: 'color-mix(in srgb, var(--zone-a) 28%, transparent)' }}
    >
      {TABS.map(({ id, label, Icon }) => {
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
            {label}
          </button>
        );
      })}
    </nav>
  );
}
