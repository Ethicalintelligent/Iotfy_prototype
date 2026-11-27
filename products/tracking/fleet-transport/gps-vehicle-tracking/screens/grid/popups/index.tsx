// IT-0055. Grid View vehicle card popups (Heeba's approved prototype IT-0055): the six card actions
// open these popups on the Grid View page instead of other pages. Vehicle name, plate, status,
// operator, odometer, location and picture come from the Grid View's vehicles (Neon + the page's
// demo activity); alerts, trips, report figures, distances, commands and sensors are seeded demo data.
import 'leaflet/dist/leaflet.css';
import './popups.css';
import '../../dash/dash.css';
import '../../dash/dash.fix.css';
import { useCallback, useMemo } from 'react';
import type { GridVehicle } from '../model';
import { DetailsPopup } from './Details';
import type { PopupKind } from './Frame';
import { ImmobPopup } from './Immob';
import { LivePopup, type LiveMode } from './Live';
import { NearbyPopup } from './Nearby';
import { ReportPopup } from './Report';
import { SettingsPopup } from './Settings';
import { ToastHost, toPV, type PV } from './kit';

export type { PopupKind } from './Frame';
export interface OpenPopup {
  kind: PopupKind;
  id: string;
  mode?: LiveMode;
}

export function VehiclePopups({
  open,
  vehicles,
  onOpen,
  onClose,
}: {
  open: OpenPopup | null;
  /** the vehicles the popups can switch between (the Grid View's list) */
  vehicles: GridVehicle[];
  onOpen: (o: OpenPopup) => void;
  onClose: () => void;
}) {
  const all = useMemo(() => vehicles.map(toPV), [vehicles]);
  const nav = useCallback(
    (kind: PopupKind, v: PV, mode?: LiveMode) => onOpen({ kind, id: v.id, mode }),
    [onOpen],
  );
  if (!open) return null;
  const v = all.find((x) => x.id === open.id);
  if (!v) return null;
  const key = open.kind + ':' + v.id + ':' + (open.mode ?? '');
  let popup;
  switch (open.kind) {
    case 'details':
      popup = <DetailsPopup key={key} v={v} onNav={nav} onClose={onClose} />;
      break;
    case 'live':
      popup = <LivePopup key={key} v={v} all={all} mode={open.mode ?? 'live'} onNav={nav} onClose={onClose} />;
      break;
    case 'nearby':
      popup = <NearbyPopup key={key} v={v} all={all} onNav={nav} onClose={onClose} />;
      break;
    case 'report':
      popup = <ReportPopup key={key} v={v} all={all} onNav={nav} onClose={onClose} />;
      break;
    case 'immob':
      popup = <ImmobPopup key={key} v={v} onNav={nav} onClose={onClose} />;
      break;
    case 'settings':
      popup = <SettingsPopup key={key} v={v} onNav={nav} onClose={onClose} />;
      break;
  }
  return <ToastHost>{popup}</ToastHost>;
}
