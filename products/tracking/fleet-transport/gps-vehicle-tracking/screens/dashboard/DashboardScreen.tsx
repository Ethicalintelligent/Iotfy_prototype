// Dashboard of the approved GPS Vehicle Tracking design (Desktop/vs/Dashboard.html): today's
// alerts, vehicle statuses, live map, geofences, alert summary, activity timeline, odometer,
// speed, time per status, unused vehicles, top-10 lists, drivers and utilisation.
import { EmptyState, Loading, Note, PanelGrid, PanelWide, Stack, TickerStrip } from '@iotify/ui';
import { DemoNote, type ScreenContext } from '@iotify/app-kit';
import { useFleet } from '../../shared/useFleet';
import {
  ActivityPanel,
  AlertSummaryPanel,
  DistributionPanel,
  GeofencePanel,
  LiveMapPanel,
  OdometerPanel,
  SpeedPanel,
  StatusSummary,
  TopDistancePanel,
  TopDriversPanel,
  TopOverspeedPanel,
  TopPerformingPanel,
  TopUnusedPanel,
  UnusedPanel,
  tickerData,
} from './panels';

export default function DashboardScreen(ctx: ScreenContext) {
  const fleet = useFleet(ctx);
  if (fleet.error) return <Note tone="red">{fleet.error}</Note>;
  if (fleet.loading) return <Loading>Loading vehicles…</Loading>;
  if (!fleet.live.length)
    return (
      <EmptyState title="No vehicles yet" icon="vehicles">
        Vehicles appear here once your dealer adds them to {ctx.companyName}.
      </EmptyState>
    );
  const ticker = tickerData(fleet);
  const open = ctx.onNavigate ? () => ctx.onNavigate!('tracking') : undefined;
  return (
    <Stack dir="col" gap={12} align="stretch">
      <TickerStrip label="Today's alerts by type" lead={ticker.lead} items={ticker.items} />
      <StatusSummary fleet={fleet} />
      <PanelGrid>
        <LiveMapPanel fleet={fleet} onOpen={open} />
        <GeofencePanel fleet={fleet} />
        <AlertSummaryPanel fleet={fleet} />
        <ActivityPanel fleet={fleet} />
        <OdometerPanel fleet={fleet} />
        <SpeedPanel fleet={fleet} />
        <DistributionPanel fleet={fleet} />
        <UnusedPanel fleet={fleet} />
        <TopDistancePanel fleet={fleet} />
        <TopOverspeedPanel fleet={fleet} />
        <TopUnusedPanel fleet={fleet} />
        <TopDriversPanel fleet={fleet} />
        <PanelWide>
          <TopPerformingPanel fleet={fleet} />
        </PanelWide>
      </PanelGrid>
      <DemoNote companyName={ctx.companyName} count={fleet.live.length} />
    </Stack>
  );
}
