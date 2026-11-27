// Grid View card (approved design): front (picture, name · plate, status, operator, 10 indicators,
// Speed / Odometer / Location, date tab, actions, Sensors button) and back (sensor readings, device
// status, input chips, flip-back button). Sizes and colours are the design's own, inline.
import type { CSSProperties } from 'react';
import { Icon, Indicator, OperatorIcon, type IconName } from './icons';
import { cardLook, type CardLook } from './cardLook';
import type { GridVehicle } from './model';
import { ActionIcon, type PopupKind } from './popups/Frame';

/** Card actions: each opens its popup on the Grid View page (IT-0055; was: the matching page). */
export interface CardAction {
  label: string;
  icon: IconName;
  kind: PopupKind;
  danger?: boolean;
}
export function actionsOf(v: GridVehicle): CardAction[] {
  const list: CardAction[] = [
    { label: 'Vehicle details', icon: 'details', kind: 'details' },
    { label: 'Live Monitor', icon: 'live', kind: 'live' },
    { label: 'Nearby Vehicles', icon: 'nearby', kind: 'nearby' },
    { label: 'Vehicle Report', icon: 'report', kind: 'report' },
  ];
  if (v.immobilizer) list.push({ label: 'Immobilizer', icon: 'immob', kind: 'immob', danger: true });
  list.push({ label: 'Settings', icon: 'settings', kind: 'settings' });
  return list;
}

const FLIP_BUTTON: CSSProperties = {
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 11.5,
  fontWeight: 700,
  color: '#0B7A55',
  whiteSpace: 'nowrap',
  background: 'linear-gradient(180deg,#E3F6EC 0%,#CDEFDF 100%)',
  boxShadow: 'inset 0 0 0 1px #9ED8BF,0 1px 4px rgba(3,173,134,.16)',
};

export function StatusPill({ look, style }: { look: CardLook; style: CSSProperties }) {
  const status = look.vehicle.status;
  return (
    <span
      title={`Status: ${status}`}
      style={{
        ...style,
        height: 18,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '0 7px',
        borderRadius: 999,
        background: look.pillSoft,
        fontSize: 10.5,
        fontWeight: 600,
        color: look.pillColor,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: look.pillColor }} />
      {status}
    </span>
  );
}

/** The last-update tab in the bottom-left corner (in the action row on the front). */
function DateTab({ look, inRow }: { look: CardLook; inRow?: boolean }) {
  const place: CSSProperties = inRow
    ? { alignSelf: 'flex-end', flexShrink: 0, marginRight: 2 }
    : { position: 'absolute', left: 0, bottom: 0 };
  return (
    <div
      title={`Last update · ${look.vehicle.lastReport}`}
      style={{
        ...place,
        height: 16,
        padding: '0 12px 0 13px',
        boxSizing: 'border-box',
        borderRadius: '0 8px 0 0',
        background: look.grad,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: '#fff',
        whiteSpace: 'nowrap',
        textShadow: '0 1px 2px rgba(1,29,50,.35)',
      }}
    >
      <b style={{ fontWeight: 700 }}>{look.dateShort}</b>
      {look.timeShort}
    </div>
  );
}

/** Speed / Odometer / Location box. `fit` = sized to its content, never cut off. */
function Metric({
  title,
  icon,
  label,
  value,
  fit,
}: {
  title: string;
  icon: IconName;
  label: string;
  value: string;
  fit?: boolean;
}) {
  return (
    <div
      title={title}
      style={{
        minWidth: 0,
        boxSizing: 'border-box',
        height: 38,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        padding: '0 9px',
        borderRadius: 8,
        background: '#F5F7F9',
        boxShadow: 'inset 0 0 0 1px #EDF0F3',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10.5,
          fontWeight: 500,
          color: '#6B7685',
          lineHeight: '14px',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ display: 'grid', placeItems: 'center', color: '#12955F' }}>
          <Icon name={icon} size={12} />
        </span>
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#0B1B2B',
          lineHeight: '16px',
          whiteSpace: 'nowrap',
          ...(fit ? {} : { overflow: 'hidden', textOverflow: 'ellipsis' }),
        }}
      >
        {value}
      </span>
    </div>
  );
}

function CardFront({
  look,
  onAction,
  onFlip,
}: {
  look: CardLook;
  onAction: (a: CardAction) => void;
  onFlip: () => void;
}) {
  const v = look.vehicle;
  return (
    <>
      <div style={{ position: 'relative', height: 126 }}>
        <img
          src={v.image}
          alt=""
          style={{
            position: 'absolute',
            left: 10,
            top: 18,
            width: 60,
            height: 44,
            objectFit: v.imageFit,
            objectPosition: 'left center',
          }}
        />
        <StatusPill look={look} style={{ position: 'absolute', top: 10, right: 10 }} />
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 10,
            right: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span
            style={{
              height: 17,
              lineHeight: '17px',
              paddingRight: look.pillSpace,
              fontSize: 12.5,
              fontWeight: 700,
              color: '#0B1B2B',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {v.name} <span style={{ fontWeight: 500, color: '#6B7685' }}>· {v.plate}</span>
          </span>
          <span
            title={`Operator: ${v.operator}`}
            style={{
              height: 17,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: '#12955F',
            }}
          >
            <OperatorIcon />
            <span
              style={{
                minWidth: 0,
                fontSize: 12,
                fontWeight: 600,
                color: look.opFg,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {v.operator}
            </span>
          </span>
          <div
            aria-label="Vehicle indicators"
            style={{ height: 20, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {look.indicators.map((i) => (
              <span
                key={i.key}
                title={i.title}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  boxSizing: 'border-box',
                  borderRadius: 6,
                  background: '#fff',
                  boxShadow: 'inset 0 0 0 1px #E3E6EA',
                  display: 'grid',
                  placeItems: 'center',
                  color: i.color,
                }}
              >
                <Indicator icon={i.icon} />
                {i.badge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      minWidth: 12,
                      height: 12,
                      padding: '0 2px',
                      boxSizing: 'border-box',
                      borderRadius: 999,
                      background: '#F76C09',
                      color: '#fff',
                      fontSize: 8.5,
                      fontWeight: 800,
                      lineHeight: '12px',
                      textAlign: 'center',
                    }}
                  >
                    {i.badge}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
        <div
          aria-label="Vehicle metrics"
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            top: 80,
            height: 38,
            display: 'grid',
            gridTemplateColumns: 'max-content max-content minmax(0, 1fr)',
            gap: 8,
          }}
        >
          <Metric title={`Speed: ${v.speed}`} icon="speed" label="Speed" value={v.speed} fit />
          <Metric
            title={`Odometer: ${v.odometer}`}
            icon="odo"
            label="Odometer"
            value={v.odometer}
            fit
          />
          <Metric
            title={`Location: ${v.location}`}
            icon="pin"
            label="Location"
            value={v.location}
          />
        </div>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: 0,
            height: 1,
            background: '#EEF0F2',
          }}
        />
        {look.maintenance && (
          <span
            title="Vehicle status"
            style={{
              position: 'absolute',
              top: 32,
              right: 10,
              height: 18,
              lineHeight: '18px',
              padding: '0 7px',
              borderRadius: 999,
              background: '#FFF1E6',
              color: '#B4530A',
              fontSize: 10.5,
              fontWeight: 700,
            }}
          >
            Maintenance
          </span>
        )}
      </div>
      <div
        className="vgv-actrow"
        style={{
          height: 42,
          boxSizing: 'border-box',
          padding: '0 10px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <DateTab look={look} inRow />
        {actionsOf(v).map((a) => (
          <button
            key={a.label}
            type="button"
            className="h-act"
            aria-label={`${a.label}: ${v.name}`}
            title={a.label}
            onClick={() => onAction(a)}
            style={{
              flexShrink: 0,
              width: 26,
              height: 26,
              border: 'none',
              borderRadius: 8,
              padding: 0,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              background: a.danger ? '#FDECEC' : '#fff',
              boxShadow: a.danger ? 'inset 0 0 0 1px #FBD0D0' : 'inset 0 0 0 1px #E3E6EA',
              color: a.danger ? '#F90507' : '#3D4A5C',
            }}
          >
            {/* IT-0055: the developer-provided Vehicle details / Nearby icons */}
            {a.kind === 'details' || a.kind === 'nearby' ? <ActionIcon kind={a.kind} /> : <Icon name={a.icon} />}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="h-sens"
          aria-label="More details: sensors and device"
          title="Sensors & Device"
          onClick={onFlip}
          style={{
            flexShrink: 0,
            alignSelf: 'center',
            boxSizing: 'border-box',
            height: 26,
            lineHeight: 1,
            padding: '0 9px 0 7px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            ...FLIP_BUTTON,
          }}
        >
          <Icon name="sensor" size={14} />
          <span className="vgv-sens-label">Sensors</span>
        </button>
      </div>
    </>
  );
}

function CardBack({
  look,
  animate,
  onFlip,
  onAnimationEnd,
}: {
  look: CardLook;
  animate: boolean;
  onFlip: () => void;
  onAnimationEnd: () => void;
}) {
  const v = look.vehicle;
  return (
    <div
      className={animate ? 'vgv-flip-in' : ''}
      onAnimationEnd={onAnimationEnd}
      style={{
        height: 168,
        boxSizing: 'border-box',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflow: 'hidden',
      }}
    >
      <div style={{ height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: look.grad,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="sensor" size={14} />
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {v.name} <span style={{ fontWeight: 500, color: '#6B7685' }}>· {v.plate}</span>
        </span>
        <StatusPill look={look} style={{ flexShrink: 0 }} />
      </div>
      {look.sensors.length ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {look.sensors.map((s, i) => (
            <div
              key={i}
              className="vgv-met"
              title={`${s.name} · ${s.source} · ${s.range}`}
              style={{
                minWidth: 0,
                height: 26,
                boxSizing: 'border-box',
                padding: '0 9px',
                borderRadius: 8,
                background: s.bg,
                boxShadow: `inset 0 0 0 1px ${s.line}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span
                className="vgv-met-row"
                style={{ height: 15, display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 10.5,
                    lineHeight: '15px',
                    color: '#6B7685',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    lineHeight: '15px',
                    fontWeight: 600,
                    color: s.fg,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.value}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            height: 26,
            flexShrink: 0,
            boxSizing: 'border-box',
            borderRadius: 8,
            background: '#F5F7F9',
            boxShadow: 'inset 0 0 0 1px #EDF0F3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11.5,
            color: '#6B7685',
          }}
        >
          No sensors configured
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          minHeight: 0,
          flex: 1,
          marginBottom: 8,
        }}
      >
        <div
          className="vgv-dev"
          aria-label="Device status"
          style={{ width: '44%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          {look.device.map((k) => (
            <div
              key={k.label}
              title={`${k.label}: ${k.value}`}
              style={{ minWidth: 0, height: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span
                style={{ display: 'block', width: 12, height: 12, flexShrink: 0, color: k.color }}
              >
                <Indicator icon={k.icon} />
              </span>
              <span
                style={{
                  minWidth: 0,
                  fontSize: 11,
                  lineHeight: '12px',
                  fontWeight: 600,
                  color: '#0B1B2B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {k.value}
              </span>
            </div>
          ))}
        </div>
        <span
          aria-hidden="true"
          style={{ width: 1, height: 66, background: '#E9ECEF', flexShrink: 0 }}
        />
        <div
          aria-label="Inputs"
          style={{
            flex: 1,
            minWidth: 0,
            height: 66,
            display: 'flex',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
            gap: 4,
          }}
        >
          {look.inputs.map((p) => (
            <span
              key={p.label}
              className="vgv-pill"
              title={`${p.label}: ${p.value}`}
              style={{
                height: 20,
                boxSizing: 'border-box',
                padding: '0 7px',
                borderRadius: 999,
                background: p.bg,
                color: p.fg,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.dot }} />
              <span>{p.short}</span>
              <span>·</span>
              <span>{p.shortValue}</span>
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="h-sens"
        aria-label="Vehicle info: back to the card"
        title="Vehicle info"
        onClick={onFlip}
        style={{
          position: 'absolute',
          right: 10,
          bottom: 8,
          boxSizing: 'border-box',
          width: 30,
          height: 26,
          lineHeight: 1,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...FLIP_BUTTON,
        }}
      >
        <Icon name="flip" size={14} />
      </button>
      <DateTab look={look} />
    </div>
  );
}

export interface VehicleCardProps {
  vehicle: GridVehicle;
  flipped: boolean;
  justFlipped: boolean;
  onFlip: () => void;
  onFlipShown: () => void;
  onAction: (a: CardAction) => void;
}

export function VehicleCard({
  vehicle,
  flipped,
  justFlipped,
  onFlip,
  onFlipShown,
  onAction,
}: VehicleCardProps) {
  const look = cardLook(vehicle);
  return (
    <article
      className="vgv-card h-card"
      aria-label={`${vehicle.name} ${vehicle.plate}`}
      style={{
        position: 'relative',
        borderRadius: 12,
        background: '#fff',
        boxShadow:
          'inset 0 0 0 1px #E1E5EA,0 1px 2px rgba(1,29,50,.06),0 4px 14px rgba(1,29,50,.06)',
        overflow: 'hidden',
        transition: 'transform .18s ease, filter .18s ease',
      }}
    >
      {flipped ? (
        <CardBack look={look} animate={justFlipped} onFlip={onFlip} onAnimationEnd={onFlipShown} />
      ) : (
        <CardFront look={look} onAction={onAction} onFlip={onFlip} />
      )}
    </article>
  );
}
