import { useState, type CSSProperties, type ReactElement } from 'react';
import { AlertStack } from './components/AlertStack';
import { BuildingsPanel } from './components/BuildingsPanel';
import { CollapsePanel } from './components/CollapsePanel';
import { FabricPanel } from './components/FabricPanel';
import { InfoFab, type SheetTab } from './components/InfoFab';
import { IntroSequence } from './components/IntroSequence';
import { LabPanel } from './components/LabPanel';
import { NewsTicker } from './components/NewsTicker';
import { OfflineModal } from './components/OfflineModal';
import { Stage } from './components/Stage';
import { SummaryModal } from './components/SummaryModal';
import { TabBar, type TabId } from './components/TabBar';
import { UpgradesPanel } from './components/UpgradesPanel';
import { WaveBackground } from './components/WaveBackground';
import { ZoneOverlay } from './components/ZoneOverlay';
import { UPGRADES } from './game/data';
import { canAffordAutobuyer } from './game/autobuyers';
import { echoGain, isUpgradeVisible } from './game/engine';
import { fabricUnlocked } from './game/fabric';
import { canWeave } from './game/fabricOps';
import { clamp } from './game/math';
import { canAffordResearch } from './game/research';
import { TUTORIAL_STEPS } from './game/tutorial';
import type { BuyAmount } from './game/types';
import { useGame } from './hooks/useGame';

/** Height of the news ticker, including the top safe-area inset. Alerts are stacked below it. */
const ROOT_VARS = { '--ticker-h': 'calc(1.875rem + env(safe-area-inset-top, 0px))' } as CSSProperties;

export default function App(): ReactElement {
  const { snapshot, actions } = useGame();
  const { state, derived } = snapshot;
  const zone = derived.zone;
  const [tab, setTab] = useState<TabId>('build');
  const [amount, setAmount] = useState<BuyAmount>(1);
  const [sheet, setSheet] = useState<SheetTab | null>(null);

  const intensity = clamp(Math.log10(derived.psPerSecond + 1) / 12, 0, 1);

  const step = state.tutorial.done ? undefined : TUTORIAL_STEPS[state.tutorial.step];
  const hintTab: TabId | null = step && step.isVisible(state) ? step.hintTab : null;

  const badges: Partial<Record<TabId, boolean>> = {
    upgrades:
      UPGRADES.some((u) => isUpgradeVisible(state, u) && state.amplitude >= u.cost) || canAffordResearch(state),
    lab: state.lab.experiments.length > 0 || state.lab.failures.length > 0,
    collapse: echoGain(state.runAmplitude) >= 1 || canAffordAutobuyer(state),
    fabric: canWeave(state),
  };
  const showFabric = fabricUnlocked(state);

  let panel: ReactElement;
  switch (tab) {
    case 'build':
      panel = (
        <BuildingsPanel
          state={state}
          derived={derived}
          amount={amount}
          onAmountChange={setAmount}
          onBuy={actions.buy}
          onToggleAuto={actions.toggleAutobuyer}
        />
      );
      break;
    case 'upgrades':
      panel = <UpgradesPanel state={state} onBuy={actions.buyUpgrade} onResearch={actions.buyResearch} />;
      break;
    case 'lab':
      panel = <LabPanel state={state} zone={zone} />;
      break;
    case 'collapse':
      panel = (
        <CollapsePanel
          state={state}
          onCollapse={actions.collapse}
          onAutoBuy={actions.buyAutobuyer}
          onAutoToggle={actions.toggleAutobuyer}
        />
      );
      break;
    case 'fabric':
      panel = (
        <FabricPanel
          state={state}
          onWeave={actions.weave}
          onDecoherence={actions.buyDecoherence}
          onWormhole={actions.installWormhole}
          onDilate={actions.dilate}
          onThreadUpgrade={actions.buyThreadUpgrade}
        />
      );
      break;
  }

  return (
    <div
      data-zone={zone}
      style={ROOT_VARS}
      className="zone-root relative isolate h-dvh w-full overflow-hidden bg-void text-slate-100"
    >
      <WaveBackground intensity={intensity} surging={state.surge.activeLeft > 0} zone={zone} />
      <ZoneOverlay zone={zone} />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col md:border-x md:border-white/10 md:bg-void/50">
        <NewsTicker notes={state.notes} onOpen={() => setSheet('log')} />
        <Stage snapshot={snapshot} onTap={actions.tap} onSurge={actions.surge} onResolve={actions.resolveWaveforms} />

        <main
          id="panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="scroll-clean min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-1 pb-24"
        >
          {panel}
        </main>

        <TabBar active={tab} onSelect={setTab} hintTab={hintTab} badges={badges} showFabric={showFabric} />

        <AlertStack snapshot={snapshot} actions={actions} />
        <InfoFab snapshot={snapshot} actions={actions} sheet={sheet} onSheet={setSheet} />
      </div>

      {state.introSeen ? null : <IntroSequence onDone={actions.finishIntro} />}
      <OfflineModal report={snapshot.offlineReport} onClose={actions.dismissOffline} />
      <SummaryModal summary={state.summary} onClose={actions.dismissSummary} />
    </div>
  );
}
