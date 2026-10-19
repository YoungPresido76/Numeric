import type { ReactElement } from 'react';
import type { Snapshot } from '../game/store';
import type { GameActions } from '../hooks/useGame';
import { ExperimentDock } from './ExperimentDock';
import { NoticeBar } from './NoticeBar';
import { TearAlert } from './TearAlert';
import { TutorialCard } from './TutorialCard';
import { VarianceBanner } from './VarianceBanner';
import { ZoneBanner } from './ZoneBanner';

interface AlertStackProps {
  snapshot: Snapshot;
  actions: GameActions;
}

/**
 * Everything the player must read or act on, stacked under the news ticker:
 * save notices, Continuum Tear, zone warnings, tutorial guidance, and the
 * experiment and failure cards. It overlays the stage, so the orb never
 * jumps when an alert appears. The ticker above carries flavour only.
 * An empty stack has no height and blocks no taps.
 */
export function AlertStack({ snapshot, actions }: AlertStackProps): ReactElement {
  const { state } = snapshot;
  return (
    <div
      aria-label="Alerts"
      className="scroll-clean absolute inset-x-0 z-30 flex max-h-[46dvh] flex-col overflow-y-auto overscroll-contain [&>:first-child]:mt-2"
      style={{ top: 'var(--ticker-h)' }}
    >
      <NoticeBar notice={snapshot.notice} saveStatus={snapshot.saveStatus} onDismiss={actions.dismissNotice} />
      <TearAlert state={state} onStitch={actions.stitch} />
      <ZoneBanner zone={snapshot.derived.zone} lab={state.lab} />
      <VarianceBanner multiverse={state.multiverse} />
      <TutorialCard state={state} onSkip={actions.skipTutorial} />
      <ExperimentDock state={state} onObserve={actions.observe} onNeutralize={actions.neutralize} />
    </div>
  );
}
