// Live map / floor view picture: dark map (or floor plan) with a dot per asset.
// Ported from the legacy xMap / axMap / axFloor art. Purely visual: positions are spread
// across the picture until real coordinates arrive.

export interface MapPoint {
  id: string;
  label: string;
  /** Amber dot (needs attention). */
  warn?: boolean;
}
export interface FloorZone {
  name: string;
  /** Restricted area (red hatching). */
  restricted?: boolean;
}

const W = 560;
const H = 290;

function stars(seed: number, n: number) {
  let s = seed;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  return [...Array(n)].map((_, i) => (
    <circle
      key={i}
      cx={(r() * W).toFixed(1)}
      cy={(r() * H).toFixed(1)}
      r={(r() * 1.2 + 0.4).toFixed(1)}
      fill="#7FD3FF"
      opacity={(r() * 0.5 + 0.15).toFixed(2)}
    />
  ));
}

function Streets() {
  return (
    <>
      <g stroke="#5AA9FF" strokeOpacity=".12">
        {[40, 95, 150, 205, 260].map((y) => (
          <line key={'h' + y} x1={0} y1={y} x2={570} y2={y - 30} />
        ))}
        {[60, 140, 220, 300, 380, 460, 540].map((x) => (
          <line key={'v' + x} x1={x} y1={0} x2={x - 40} y2={300} />
        ))}
      </g>
      <g fill="#5AA9FF" fillOpacity=".06">
        {[
          [70, 60, 50, 30],
          [150, 120, 44, 40],
          [300, 40, 60, 34],
          [420, 150, 70, 46],
          [210, 240, 56, 30],
          [470, 230, 60, 40],
        ].map(([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={3} />
        ))}
      </g>
    </>
  );
}

/** Six rooms by default; the first zones' names label them. */
function Floor({ zones }: { zones: FloorZone[] }) {
  const boxes = [
    [20, 20, 130, 120],
    [150, 20, 130, 120],
    [280, 20, 130, 120],
    [410, 20, 130, 120],
    [20, 170, 260, 100],
    [280, 170, 260, 100],
  ];
  return (
    <>
      <defs>
        <pattern
          id="akHatch"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill="rgba(255,90,95,.08)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#FF5A5F" strokeOpacity=".35" strokeWidth="3" />
        </pattern>
      </defs>
      <rect
        x={20}
        y={20}
        width={520}
        height={250}
        rx={6}
        fill="rgba(90,169,255,.05)"
        stroke="#7FA7FF"
        strokeOpacity=".5"
        strokeWidth={2}
      />
      {boxes.map(([x, y, w, h], i) => {
        const z = zones[i] ?? { name: `ZONE ${String.fromCharCode(65 + i)}` };
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={z.restricted ? 'url(#akHatch)' : 'none'}
              stroke={z.restricted ? '#FF5A5F' : '#7FA7FF'}
              strokeOpacity={z.restricted ? 0.8 : 0.35}
              strokeWidth={1.5}
            />
            <text
              x={x! + 6}
              y={y! + 13}
              fill={z.restricted ? '#FF9A9D' : '#9FB4C8'}
              fontSize={8.5}
              fontWeight={700}
              letterSpacing=".06em"
            >
              {z.name.toUpperCase()}
            </text>
          </g>
        );
      })}
    </>
  );
}

export interface AssetMapProps {
  points: MapPoint[];
  /** Floor view (zones) instead of a street map. */
  floor?: boolean;
  zones?: FloorZone[];
  label?: string;
}

/** Map or floor plan with a pulsing dot per asset. */
export function AssetMap({ points, floor, zones = [], label = 'Map of assets' }: AssetMapProps) {
  const pts = points.map((p, i) => ({
    ...p,
    x: 60 + ((i * 137 + 40) % 420),
    y: 50 + ((i * 89 + 30) % 190),
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ui-assetmap" role="img" aria-label={label}>
      <rect width={W} height={H} fill="var(--map-bg)" />
      {stars(5, 30)}
      {floor ? <Floor zones={zones} /> : <Streets />}
      {pts.map((p) => {
        const col = p.warn ? '#F68C3C' : '#03AD86';
        const end = p.x > 400;
        return (
          <g key={p.id} transform={`translate(${p.x} ${p.y})`}>
            <circle r={12} fill={col} opacity={0.2}>
              <animate attributeName="r" values="6;15;6" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle r={6} fill={col} stroke="#fff" strokeWidth={2} />
            <text
              x={end ? -12 : 12}
              y={4}
              textAnchor={end ? 'end' : undefined}
              fill="#DDEBFF"
              fontSize={10}
              fontWeight={700}
            >
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
