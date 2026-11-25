// Grid View list layout (approved design's listHtml): one row per vehicle, 10 columns.
import type { ReactNode } from 'react';
import { cardLook } from './cardLook';
import { Indicator } from './icons';
import type { GridVehicle } from './model';

function Th({ children, pad = '10px 8px' }: { children: ReactNode; pad?: string }) {
  return (
    <th scope="col" style={{ padding: pad, fontSize: 12, fontWeight: 700, color: '#3D4A5C' }}>
      {children}
    </th>
  );
}

export function VehicleList({ vehicles }: { vehicles: GridVehicle[] }) {
  return (
    <div
      className="vgv-scroll"
      style={{
        overflowX: 'auto',
        borderRadius: 10,
        background: '#fff',
        boxShadow: 'inset 0 0 0 1px #E9ECEF',
      }}
    >
      <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: '#F4F6F8', textAlign: 'left' }}>
            <Th pad="10px 12px">Vehicle</Th>
            <Th>Status</Th>
            <Th>Indicators</Th>
            <Th>Operator</Th>
            <Th>Speed</Th>
            <Th>Location</Th>
            <Th>Odometer</Th>
            <Th>Sensors</Th>
            <Th>Vehicle Status</Th>
            <Th pad="10px 12px 10px 8px">Last update</Th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => {
            const c = cardLook(v);
            return (
              <tr key={v.id} className="h-row" style={{ boxShadow: 'inset 0 -1px 0 #EEF0F2' }}>
                <td style={{ padding: '6px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={v.image}
                      alt=""
                      style={{ width: 40, height: 28, objectFit: v.imageFit }}
                    />
                    <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '15px' }}>
                      <b style={{ fontWeight: 700 }}>{v.name}</b>
                      <span style={{ fontSize: 11.5, color: '#6B7685' }}>{v.plate}</span>
                    </span>
                  </div>
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      height: 20,
                      padding: '0 8px',
                      borderRadius: 999,
                      background: c.grad,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      textShadow: '0 1px 2px rgba(1,29,50,.35)',
                    }}
                  >
                    <span
                      style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }}
                    />
                    {v.status}
                  </span>
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    {c.indicators.map((i) => (
                      <span
                        key={i.key}
                        title={i.title}
                        style={{
                          position: 'relative',
                          display: 'block',
                          width: 12,
                          height: 12,
                          color: i.color,
                        }}
                      >
                        <Indicator icon={i.icon} />
                        {i.badge && (
                          <span
                            style={{
                              position: 'absolute',
                              top: -6,
                              right: -7,
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
                </td>
                <td style={{ padding: '6px 8px', color: c.opFg, whiteSpace: 'nowrap' }}>
                  {v.operator}
                </td>
                <td
                  style={{
                    padding: '6px 8px',
                    fontWeight: 700,
                    color: c.speedFg,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {v.speed}
                </td>
                <td
                  title={v.location}
                  style={{
                    padding: '6px 8px',
                    maxWidth: 220,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {v.location}
                </td>
                <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{v.odometer}</td>
                <td style={{ padding: '6px 8px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.sensorChips.map((s, i) => (
                      <span
                        key={i}
                        style={{
                          height: 20,
                          lineHeight: '20px',
                          padding: '0 7px',
                          borderRadius: 6,
                          background: s.bg,
                          color: s.fg,
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.text}
                      </span>
                    ))}
                    {!c.sensors.length && <span style={{ color: '#94A0AF' }}>—</span>}
                  </div>
                </td>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: c.vsFg }}>{v.vstatus}</td>
                <td style={{ padding: '6px 12px 6px 8px', whiteSpace: 'nowrap', color: '#3D4A5C' }}>
                  {v.updated}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
