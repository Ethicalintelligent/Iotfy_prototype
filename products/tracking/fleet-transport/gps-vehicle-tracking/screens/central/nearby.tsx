// IT-0045 (bug sheet 16-11-2026, MultiTrack #56): "Nearby" in the Live Monitor (the maximized
// view of a vehicle). It opens Map View's own Nearby Vehicles dialog (same markup, texts, range
// slider and hover highlight on the map), drawn with Map View's stylesheet.
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, ScopeAs, usePortalRoot } from '../smart-track/kit';
import { NearbyDialog, type NearbyKind, type Row as NearbyRow } from '../map/Nearby';
import '../map/map.css';
import '../map/map.fix.css';
import '../map/icons';
import type { Row } from './fleet';
import { Img } from './parts';

function useNearbyKind(rows: Row[]): NearbyKind {
  return useMemo(() => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    return {
      code: (r) => byId.get(r.id)?.vehicle.code ?? undefined,
      driverOf: (id) => {
        const o = byId.get(id)?.vehicle.operator;
        return o
          ? { name: o.name?.trim() || undefined, id: o.tagId || undefined, phone: o.phone || undefined }
          : {};
      },
      marker: (id) => {
        const r = byId.get(id);
        return { plate: r?.vehicle.code ?? r?.name ?? '', img: r?.vehicle.image };
      },
      media: (id, size) => {
        const r = byId.get(id);
        const ph = (
          <span className="td-vthumb" style={{ width: size * 1.4, height: size }}>
            <Icon name="Truck" size={size * 0.62} strokeWidth={1.6} />
          </span>
        );
        return r?.vehicle.image ? (
          <Img src={r.vehicle.image} alt="" width={33} height={33} className="vh-nearby__img" fallback={ph} />
        ) : (
          ph
        );
      },
    };
  }, [rows]);
}

/** The Live Monitor header's Nearby button and its dialog. */
export function NearbyButton({ row, rows }: { row: Row; rows: Row[] }) {
  const [open, setOpen] = useState(false);
  const kind = useNearbyKind(rows);
  return (
    <>
      <button
        type="button"
        className="td-btn td-btn--ghost td-tracker__nearby"
        onClick={() => setOpen(true)}
        title={`Vehicles near ${row.vehicle.code || row.name}`}
      >
        <Icon name="Radar" size={14} />
        <span>Nearby</span>
      </button>
      {open && (
        <ScopeAs scope="st-map">
          <NearbyPortal
            kind={kind}
            row={row as unknown as NearbyRow}
            rows={rows as unknown as NearbyRow[]}
            onClose={() => setOpen(false)}
          />
        </ScopeAs>
      )}
    </>
  );
}

function NearbyPortal({
  kind,
  row,
  rows,
  onClose,
}: {
  kind: NearbyKind;
  row: NearbyRow;
  rows: NearbyRow[];
  onClose: () => void;
}) {
  const portal = usePortalRoot();
  return portal
    ? createPortal(
        <NearbyDialog kind={kind} row={row} rows={rows} now={Date.now()} onClose={onClose} />,
        portal,
      )
    : null;
}
