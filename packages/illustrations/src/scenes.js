// Sign-in scenes as SVG markup. Ported unchanged from the legacy prototype (legacy/src/app.js
// ~558–781: ART_DEFS, the ax* helpers, artVehicle, artConstruct and SCENES) so the pictures look
// exactly the same. Plain JavaScript on purpose: it is string templates, typed in scenes.d.ts.
// Only SignInScene.tsx uses it. Demo content only (invented names and numbers).
const ART_DEFS = `<defs>
  <linearGradient id="agBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0D2A4A"/><stop offset="1" stop-color="#06172A"/></linearGradient>
  <radialGradient id="agGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3EF7FF" stop-opacity=".35"/><stop offset="1" stop-color="#3EF7FF" stop-opacity="0"/></radialGradient>
  <linearGradient id="agRoute" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#03AD86"/><stop offset="1" stop-color="#3EF7FF"/></linearGradient>
  <filter id="afGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <pattern id="apHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="#FF5A5F" fill-opacity=".28"/></pattern>
</defs>`;
// small glass card used inside scenes
const aCard = (x, y, w, h, body) =>
  `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="10" fill="rgba(12,36,64,.78)" stroke="rgba(120,200,255,.28)"/>${body}</g>`;
const aDots = (seed, n, w, h) => {
  let s = seed,
    out = '';
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++)
    out += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(r() * 1.2 + 0.4).toFixed(1)}" fill="#7FD3FF" opacity="${(r() * 0.5 + 0.15).toFixed(2)}"/>`;
  return out;
};

function artVehicle() {
  const route =
    'M30 268 C 90 262 120 222 170 214 S 250 200 280 170 S 330 112 390 104 S 480 70 540 44';
  return `<svg class="heroart" viewBox="0 0 570 300" role="img" aria-label="Live map with a truck moving along its route, a geofence and live vehicle cards">${ART_DEFS}
  <rect width="570" height="300" rx="18" fill="url(#agBg)"/>
  <g stroke="#5AA9FF" stroke-opacity=".12" stroke-width="1">${[40, 95, 150, 205, 260].map((y) => `<line x1="0" y1="${y}" x2="570" y2="${y - 30}"/>`).join('')}${[60, 140, 220, 300, 380, 460, 540].map((x) => `<line x1="${x}" y1="0" x2="${x - 40}" y2="300"/>`).join('')}</g>
  <g fill="#5AA9FF" fill-opacity=".06">${[
    [70, 60, 50, 30],
    [150, 120, 44, 40],
    [300, 40, 60, 34],
    [420, 150, 70, 46],
    [210, 240, 56, 30],
    [470, 230, 60, 40],
  ]
    .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`)
    .join('')}</g>
  <g>${aDots(7, 40, 570, 300)}</g>
  <circle cx="170" cy="214" r="46" fill="url(#agGlow)"/><circle cx="170" cy="214" r="38" fill="none" stroke="#3EF7FF" stroke-opacity=".7" stroke-dasharray="5 5"><animateTransform attributeName="transform" type="rotate" from="0 170 214" to="360 170 214" dur="30s" repeatCount="indefinite"/></circle>
  <text x="128" y="270" fill="#9FE9FF" font-size="10" font-weight="700" letter-spacing=".06em">GEOFENCE · RIYADH DEPOT</text>
  <path d="${route}" fill="none" stroke="#03AD86" stroke-opacity=".25" stroke-width="8" stroke-linecap="round"/>
  <path d="${route}" fill="none" stroke="url(#agRoute)" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 6" filter="url(#afGlow)"><animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite"/></path>
  <g><animateMotion dur="14s" repeatCount="indefinite" rotate="auto" path="${route}"/>
    <circle r="16" fill="#03AD86" opacity=".25"><animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".45;0;.45" dur="2s" repeatCount="indefinite"/></circle>
    <circle r="9" fill="#03AD86" stroke="#fff" stroke-width="2"/><path d="M-3 -4 L5 0 L-3 4 Z" fill="#fff"/></g>
  <g transform="translate(300 232)"><circle r="7" fill="#F6B73C" stroke="#fff" stroke-width="2"/><text x="12" y="4" fill="#FFD98A" font-size="10" font-weight="700">Truck 15 · idle</text></g>
  <g transform="translate(470 120)"><circle r="7" fill="#7FA7FF" stroke="#fff" stroke-width="2"/><text x="-12" y="4" text-anchor="end" fill="#C9D8FF" font-size="10" font-weight="700">Van 3 · parked</text></g>
  ${aCard(
    18,
    16,
    170,
    70,
    `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">TRUCK 14 · MOVING</text><text x="12" y="46" fill="#fff" font-size="22" font-weight="800">62<tspan font-size="11" fill="#9FB4C8" font-weight="700"> km/h</tspan></text>
    <polyline points="92,52 104,44 114,48 126,34 138,40 150,28 160,32" fill="none" stroke="#3EF7FF" stroke-width="2" stroke-linecap="round"/><text x="12" y="62" fill="#7FE6CF" font-size="9" font-weight="700">Ignition on · Fuel 64%</text>`,
  )}
  ${aCard(
    390,
    196,
    162,
    86,
    `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">TODAY</text>
    <text x="12" y="44" fill="#fff" font-size="16" font-weight="800">1,284 km</text><text x="94" y="44" fill="#9FB4C8" font-size="10" font-weight="600">3 vehicles</text>
    <rect x="12" y="54" width="138" height="6" rx="3" fill="rgba(255,255,255,.1)"/><rect x="12" y="54" width="96" height="6" rx="3" fill="#03AD86"/><text x="12" y="76" fill="#9FB4C8" font-size="9" font-weight="600">On-time deliveries 70%</text>`,
  )}
  <g transform="translate(330 22)"><rect width="150" height="28" rx="14" fill="rgba(246,140,60,.18)" stroke="#F68C3C" stroke-opacity=".7"/><circle cx="16" cy="14" r="5" fill="#F68C3C"><animate attributeName="opacity" values="1;.3;1" dur="1.4s" repeatCount="indefinite"/></circle><text x="28" y="18" fill="#FFC79A" font-size="10.5" font-weight="700">Harsh braking · Truck 15</text></g>
  </svg>`;
}

function artConstruct() {
  const worker = (x, y, c, ok = true) =>
    `<g transform="translate(${x} ${y})"><circle r="11" fill="${ok ? '#03AD86' : '#FF5A5F'}" opacity=".18"><animate attributeName="r" values="8;14;8" dur="${ok ? 3 : 1.2}s" repeatCount="indefinite"/></circle><circle cy="-6" r="4" fill="#E9D7C2"/><path d="M-5 -7 a5 5 0 0 1 10 0 Z" fill="${c}"/><rect x="-4" y="-1" width="8" height="10" rx="2" fill="#F68C3C"/><rect x="-4" y="2" width="8" height="1.6" fill="#FFF3A6"/></g>`;
  const floors = [210, 170, 130, 90];
  return `<svg class="heroart" viewBox="0 0 570 300" role="img" aria-label="Construction site with a crane, workers wearing tagged helmets, a crane danger zone and live safety cards">${ART_DEFS}
  <rect width="570" height="300" rx="18" fill="url(#agBg)"/><g>${aDots(11, 40, 570, 300)}</g>
  <rect x="0" y="252" width="570" height="48" rx="0" fill="#0A2036"/><line x1="0" y1="252" x2="570" y2="252" stroke="#5AA9FF" stroke-opacity=".25"/>
  <g stroke="#7FA7FF" stroke-opacity=".55" stroke-width="2" fill="none">${[300, 350, 400, 450].map((x) => `<line x1="${x}" y1="252" x2="${x}" y2="70"/>`).join('')}${floors.map((y) => `<line x1="296" y1="${y}" x2="454" y2="${y}"/>`).join('')}<line x1="296" y1="252" x2="454" y2="252"/>
    ${floors.map((y) => `<line x1="300" y1="${y + 40}" x2="350" y2="${y}" stroke-opacity=".25"/><line x1="400" y1="${y}" x2="450" y2="${y + 40}" stroke-opacity=".25"/>`).join('')}</g>
  <g fill="#3EF7FF">${[
    [325, 205],
    [375, 165],
    [425, 125],
  ]
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="3"><animate attributeName="opacity" values="1;.2;1" dur="2.4s" begin="${(x % 7) / 3}s" repeatCount="indefinite"/></circle>`,
    )
    .join('')}</g>
  <g stroke="#F6B73C" stroke-width="2" fill="none"><line x1="150" y1="252" x2="150" y2="44"/><line x1="166" y1="252" x2="166" y2="44"/>${[232, 212, 192, 172, 152, 132, 112, 92, 72].map((y) => `<line x1="150" y1="${y}" x2="166" y2="${y - 20}"/>`).join('')}
    <line x1="80" y1="44" x2="300" y2="44"/><line x1="80" y1="56" x2="300" y2="44"/><line x1="158" y1="22" x2="80" y2="44"/><line x1="158" y1="22" x2="300" y2="44"/><line x1="158" y1="22" x2="158" y2="44"/></g>
  <rect x="80" y="46" width="22" height="16" fill="#F6B73C" opacity=".85"/>
  <g><animateTransform attributeName="transform" type="translate" values="0 0;40 0;0 0" dur="10s" repeatCount="indefinite"/>
    <line x1="232" y1="46" x2="232" y2="150" stroke="#C9D8FF" stroke-width="1.5"/><rect x="216" y="150" width="32" height="12" fill="#7FA7FF"/>
    <ellipse cx="232" cy="248" rx="54" ry="10" fill="url(#apHatch)" stroke="#FF5A5F" stroke-opacity=".7" stroke-dasharray="4 4"/></g>
  <text x="168" y="282" fill="#FF9A9D" font-size="10" font-weight="700" letter-spacing=".06em">CRANE SWING ZONE · RESTRICTED</text>
  ${worker(60, 240, '#F6E04C')}${worker(110, 244, '#FFFFFF')}${worker(330, 244, '#F6E04C')}${worker(380, 246, '#F6E04C')}${worker(500, 242, '#FFFFFF')}${worker(250, 244, '#F6E04C', false)}${worker(425, 206, '#F6E04C')}
  ${aCard(18, 76, 118, 74, `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">ON SITE NOW</text><text x="12" y="46" fill="#fff" font-size="22" font-weight="800">23</text><text x="44" y="46" fill="#9FB4C8" font-size="10" font-weight="600">workers</text><text x="12" y="63" fill="#7FE6CF" font-size="9" font-weight="700">Helmets on 21/23</text>`)}
  ${aCard(466, 70, 92, 92, `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">GAS · CO</text><circle cx="46" cy="56" r="22" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="6"/><circle cx="46" cy="56" r="22" fill="none" stroke="#03AD86" stroke-width="6" stroke-dasharray="40 140" transform="rotate(-90 46 56)"/><text x="46" y="60" text-anchor="middle" fill="#fff" font-size="12" font-weight="800">12</text><text x="46" y="88" text-anchor="middle" fill="#7FE6CF" font-size="8.5" font-weight="700">ppm · normal</text>`)}
  <g transform="translate(330 14)"><rect width="190" height="30" rx="15" fill="rgba(255,90,95,.18)" stroke="#FF5A5F" stroke-opacity=".8"/><circle cx="17" cy="15" r="5" fill="#FF5A5F"><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite"/></circle><text x="30" y="19" fill="#FFB3B5" font-size="10.5" font-weight="700">Worker in crane zone · Block B</text></g>
  </svg>`;
}
// ---------- shared drawing pieces
const axSvg = (label, inner, seed = 3) =>
  `<svg class="heroart" viewBox="0 0 570 300" role="img" aria-label="${label}">${ART_DEFS}<rect width="570" height="300" rx="18" fill="url(#agBg)"/><g>${aDots(seed, 34, 570, 300)}</g>${inner}</svg>`;
const axMap = () =>
  `<g stroke="#5AA9FF" stroke-opacity=".12">${[40, 95, 150, 205, 260].map((y) => `<line x1="0" y1="${y}" x2="570" y2="${y - 30}"/>`).join('')}${[60, 140, 220, 300, 380, 460, 540].map((x) => `<line x1="${x}" y1="0" x2="${x - 40}" y2="300"/>`).join('')}</g><g fill="#5AA9FF" fill-opacity=".06">${[
    [70, 60, 50, 30],
    [150, 120, 44, 40],
    [300, 40, 60, 34],
    [420, 150, 70, 46],
    [210, 240, 56, 30],
    [470, 230, 60, 40],
  ]
    .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`)
    .join('')}</g>`;
const axPill = (x, y, w, text, col = '#F68C3C', blink = 1.4) =>
  `<g transform="translate(${x} ${y})"><rect width="${w}" height="28" rx="14" fill="${col}" fill-opacity=".18" stroke="${col}" stroke-opacity=".8"/><circle cx="16" cy="14" r="5" fill="${col}"><animate attributeName="opacity" values="1;.25;1" dur="${blink}s" repeatCount="indefinite"/></circle><text x="28" y="18" fill="#fff" fill-opacity=".92" font-size="10.5" font-weight="700">${text}</text></g>`;
const axStat = (x, y, w, h, title, big, unit = '', sub = '', subCol = '#7FE6CF', extra = '') =>
  aCard(
    x,
    y,
    w,
    h,
    `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">${title}</text><text x="12" y="${h > 60 ? 46 : 42}" fill="#fff" font-size="${big.length > 8 ? 16 : 21}" font-weight="800">${big}<tspan font-size="10.5" fill="#9FB4C8" font-weight="700"> ${unit}</tspan></text>${sub ? `<text x="12" y="${h - 10}" fill="${subCol}" font-size="9" font-weight="700">${sub}</text>` : ''}${extra}`,
  );
const axBar = (x, y, w, pct, col = '#03AD86') =>
  `<rect x="${x}" y="${y}" width="${w}" height="6" rx="3" fill="rgba(255,255,255,.1)"/><rect x="${x}" y="${y}" width="${(w * pct) / 100}" height="6" rx="3" fill="${col}"/>`;
const axRing = (cx, cy, r, pct, col, txt) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * r * pct) / 100} 999" transform="rotate(-90 ${cx} ${cy})"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="12" font-weight="800">${txt}</text>`;
const axDot = (x, y, col, label = '', end = false, r = 7) =>
  `<g transform="translate(${x} ${y})"><circle r="${r + 6}" fill="${col}" opacity=".2"><animate attributeName="r" values="${r};${r + 9};${r}" dur="2.4s" repeatCount="indefinite"/></circle><circle r="${r}" fill="${col}" stroke="#fff" stroke-width="2"/>${label ? `<text x="${end ? -r - 6 : r + 6}" y="4" ${end ? 'text-anchor="end"' : ''} fill="#DDEBFF" font-size="10" font-weight="700">${label}</text>` : ''}</g>`;
const axMover = (path, col, dur = 12, r = 8, inner = '') =>
  `<g><animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"/><circle r="${r + 8}" fill="${col}" opacity=".25"><animate attributeName="r" values="${r};${r + 10};${r}" dur="2s" repeatCount="indefinite"/></circle><circle r="${r}" fill="${col}" stroke="#fff" stroke-width="2"/>${inner}</g>`;
const axRoute = (d, w = 3) =>
  `<path d="${d}" fill="none" stroke="#03AD86" stroke-opacity=".22" stroke-width="8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="url(#agRoute)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="6 6" filter="url(#afGlow)"><animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite"/></path>`;
const axPerson = (x, y, col = '#7FA7FF', s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><circle cy="-14" r="5" fill="${col}"/><path d="M-7 4 Q-7 -7 0 -7 Q7 -7 7 4 Z" fill="${col}"/></g>`;
const axBox = (x, y, w, h, label, col = '#3EF7FF') =>
  `<g fill="none" stroke="${col}" stroke-width="2"><path d="M${x} ${y + 10}V${y}H${x + 10}M${x + w - 10} ${y}H${x + w}V${y + 10}M${x + w} ${y + h - 10}V${y + h}H${x + w - 10}M${x + 10} ${y + h}H${x}V${y + h - 10}"/></g>${label ? `<rect x="${x}" y="${y - 16}" width="${label.length * 5.6 + 10}" height="14" rx="3" fill="${col}"/><text x="${x + 5}" y="${y - 6}" fill="#06172A" font-size="9" font-weight="800">${label}</text>` : ''}`;
const axFloor = (x, y, w, h, rooms) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="rgba(90,169,255,.05)" stroke="#7FA7FF" stroke-opacity=".5" stroke-width="2"/>${rooms.map(([rx, ry, rw, rh, name, hot]) => `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${hot ? 'url(#apHatch)' : 'none'}" stroke="${hot ? '#FF5A5F' : '#7FA7FF'}" stroke-opacity="${hot ? 0.8 : 0.35}" stroke-width="1.5"/><text x="${rx + 6}" y="${ry + 13}" fill="${hot ? '#FF9A9D' : '#9FB4C8'}" font-size="8.5" font-weight="700" letter-spacing=".06em">${name}</text>`).join('')}`;
const axTruck = (x, y, s, body = '#7FA7FF', cab = '#5AA9FF') =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="0" y="-42" width="92" height="38" rx="4" fill="${body}" fill-opacity=".9"/><path d="M92 -32 h22 l14 14 v14 h-36 z" fill="${cab}"/><rect x="99" y="-28" width="12" height="9" fill="#C9F4FF" opacity=".8"/><circle cx="22" cy="0" r="8" fill="#0A1626" stroke="#C9D8FF" stroke-width="3"/><circle cx="106" cy="0" r="8" fill="#0A1626" stroke="#C9D8FF" stroke-width="3"/></g>`;
const axGround = (y = 252) =>
  `<rect x="0" y="${y}" width="570" height="${300 - y}" fill="#0A2036"/><line x1="0" y1="${y}" x2="570" y2="${y}" stroke="#5AA9FF" stroke-opacity=".25"/>`;
const axBlink = (x, y, col, r = 2.5, d = 1.6) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"><animate attributeName="opacity" values="1;.15;1" dur="${d}s" begin="${((x + y) % 9) / 6}s" repeatCount="indefinite"/></circle>`;

// ---------- scenes
const SCENES = {
  fleet: () =>
    axSvg(
      'Fleet depot with trucks, service reminders and fuel costs',
      `${axGround(238)}
    ${axTruck(40, 236, 0.95)}${axTruck(200, 236, 0.95, '#5AA9FF', '#3EF7FF')}${axTruck(360, 236, 0.95, '#7FA7FF', '#F6B73C')}
    <g transform="translate(470 196)"><circle r="18" fill="rgba(246,183,60,.18)" stroke="#F6B73C"/><path d="M-7 7 L4 -4 M2 -9 a6 6 0 1 0 7 7" stroke="#F6B73C" stroke-width="3" fill="none" stroke-linecap="round"/></g>
    ${axStat(18, 18, 168, 74, 'SERVICE DUE', 'Truck 14', '', 'In 1,200 km · oil & filters', '#FFD98A')}
    ${axStat(198, 18, 168, 74, 'FUEL · THIS MONTH', 'SAR 18,420', '', '6.1 km/L average')}
    ${aCard(378, 18, 174, 74, `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">DRIVER SCORE</text>${axRing(140, 44, 20, 86, '#03AD86', '86')}<text x="12" y="46" fill="#fff" font-size="15" font-weight="800">Good</text><text x="12" y="62" fill="#9FB4C8" font-size="9" font-weight="600">Fleet average</text>`)}
    ${axPill(150, 112, 270, 'Licence expires in 7 days · Driver Faisal', '#F6B73C')}`,
    ),
  dashcam: () =>
    axSvg(
      'Dashcam view of the road ahead with AI detection boxes and a collision warning',
      `
    <path d="M0 150 L80 140 L110 120 L140 140 L200 128 L230 104 L260 132 L330 122 L360 96 L390 126 L470 116 L500 98 L530 130 L570 124 V170 H0 Z" fill="#0B2440"/>
    <path d="M40 300 L262 150 L308 150 L530 300 Z" fill="#0A1C30"/><g stroke="#C9D8FF" stroke-width="3" stroke-dasharray="14 16"><line x1="285" y1="152" x2="285" y2="300"><animate attributeName="stroke-dashoffset" from="0" to="-30" dur=".6s" repeatCount="indefinite"/></line></g>
    <line x1="262" y1="150" x2="40" y2="300" stroke="#F6B73C" stroke-width="2.5"/><line x1="308" y1="150" x2="530" y2="300" stroke="#F6B73C" stroke-width="2.5"/>
    <rect x="252" y="176" width="66" height="38" rx="6" fill="#33435A"/><rect x="258" y="182" width="54" height="12" rx="3" fill="#7FA7FF" opacity=".5"/><circle cx="262" cy="206" r="3" fill="#FF5A5F"/><circle cx="308" cy="206" r="3" fill="#FF5A5F"/>
    ${axBox(244, 170, 82, 50, 'CAR · 14 m', '#FF5A5F')}${axBox(420, 156, 26, 40, 'SIGN', '#3EF7FF')}
    <g transform="translate(22 22)"><circle cx="6" cy="6" r="5" fill="#FF5A5F"><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite"/></circle><text x="16" y="10" fill="#fff" font-size="10.5" font-weight="800">REC 00:14:32</text></g>
    ${axStat(18, 216, 120, 66, 'SPEED', '64', 'km/h', 'Limit 80')}
    ${aCard(430, 18, 122, 98, `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">DRIVER CAM</text><circle cx="61" cy="52" r="16" fill="#33435A"/><path d="M37 86 Q61 60 85 86" fill="#33435A"/>${axBox(42, 34, 38, 40, '', '#03AD86')}<text x="12" y="92" fill="#7FE6CF" font-size="9" font-weight="700">Attentive · no phone</text>`)}
    ${axPill(170, 22, 220, 'Forward collision warning', '#FF5A5F', 0.9)}`,
      5,
    ),
  waste: () => {
    const r =
      'M30 250 C 100 240 120 200 180 196 S 260 170 300 150 S 380 110 440 104 S 520 80 548 60';
    const bins = [
      [90, 238, 1],
      [160, 200, 1],
      [230, 186, 1],
      [300, 150, 0],
      [360, 126, 2],
      [440, 104, 0],
      [510, 78, 0],
    ];
    return axSvg(
      'Waste collection route with RFID-tagged bins and a garbage truck',
      `${axMap()}${axRoute(r)}
    ${bins.map(([x, y, s]) => `<g transform="translate(${x} ${y - 16})"><rect x="-7" y="-10" width="14" height="16" rx="2" fill="${['#03AD86', '#7FA7FF', '#FF5A5F'][s === 1 ? 0 : s === 2 ? 2 : 1]}"/><rect x="-9" y="-13" width="18" height="4" rx="1" fill="#C9D8FF"/>${s === 2 ? `<circle r="14" fill="none" stroke="#FF5A5F"><animate attributeName="r" values="10;18;10" dur="1.2s" repeatCount="indefinite"/></circle>` : ''}</g>`).join('')}
    ${axMover(r, '#F6B73C', 16, 9, '<rect x="-5" y="-4" width="10" height="8" rx="1" fill="#06172A"/>')}
    ${aCard(18, 18, 176, 78, `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">BINS COLLECTED TODAY</text><text x="12" y="46" fill="#fff" font-size="21" font-weight="800">142<tspan font-size="11" fill="#9FB4C8"> / 160</tspan></text>${axBar(12, 58, 152, 89)}`)}
    ${axPill(300, 220, 236, 'Missed bin · Al Olaya St, bin 14', '#FF5A5F')}
    ${axStat(212, 18, 160, 64, 'TRUCK W-07', 'Lifting bin', '', 'RFID tag 4471 read ✓')}`,
      9,
    );
  },
  schoolbus: () => {
    const r = 'M28 240 C 110 232 130 186 200 184 S 300 160 330 130 S 420 96 470 92 S 530 80 548 66';
    const stops = [
      [120, 222, 'Stop 1'],
      [250, 176, 'Stop 2'],
      [380, 108, 'Stop 3'],
      [530, 72, 'School'],
    ];
    return axSvg(
      'School bus route with stops, a moving bus and student RFID boarding',
      `${axMap()}${axRoute(r)}
    ${stops.map(([x, y, l], i) => `<g transform="translate(${x} ${y})"><circle r="9" fill="${i === 3 ? '#03AD86' : '#0D2A4A'}" stroke="#3EF7FF" stroke-width="2"/><text y="-14" text-anchor="middle" fill="#9FE9FF" font-size="9.5" font-weight="700">${l}</text></g>`).join('')}
    <g><animateMotion dur="15s" repeatCount="indefinite" path="${r}"/><rect x="-16" y="-9" width="32" height="18" rx="4" fill="#F6B73C" stroke="#fff" stroke-width="2"/><rect x="-11" y="-5" width="7" height="5" fill="#06172A"/><rect x="-1" y="-5" width="7" height="5" fill="#06172A"/><rect x="9" y="-5" width="4" height="5" fill="#06172A"/></g>
    ${aCard(18, 18, 200, 70, `<circle cx="28" cy="35" r="14" fill="#3EF7FF" opacity=".25"/>${axPerson(28, 44, '#9FE9FF', 0.9)}<text x="52" y="28" fill="#fff" font-size="12" font-weight="800">Ahmed boarded</text><text x="52" y="44" fill="#9FB4C8" font-size="9.5" font-weight="600">07:12 · RFID card · Stop 1</text><text x="52" y="60" fill="#7FE6CF" font-size="9" font-weight="700">Parent notified ✓</text>`)}
    ${axStat(380, 196, 172, 84, 'NEXT STOP · STOP 3', '6 min', 'ETA', '28 students on board')}
    ${axPill(226, 22, 196, 'Bus 12 running 4 min late', '#F6B73C')}`,
      13,
    );
  },
  workforce: () =>
    axSvg(
      'Map of field staff with check-ins, a client site geofence and an SOS alert',
      `${axMap()}
    <polygon points="300,120 390,100 420,170 330,190" fill="rgba(3,173,134,.12)" stroke="#03AD86" stroke-dasharray="5 4"/><text x="318" y="208" fill="#7FE6CF" font-size="9.5" font-weight="700" letter-spacing=".06em">CLIENT SITE 7</text>
    ${[
      [350, 150, '#03AD86'],
      [372, 132, '#03AD86'],
      [120, 200, '#7FA7FF'],
      [210, 120, '#7FA7FF'],
      [470, 230, '#7FA7FF'],
      [500, 140, '#03AD86'],
    ]
      .map(([x, y, c]) => axDot(x, y, c, '', false, 6))
      .join('')}
    ${axDot(160, 250, '#FF5A5F', 'Imran · SOS')}
    ${axStat(18, 18, 170, 74, 'IN THE FIELD', '18', 'staff', '3 at client sites')}
    ${aCard(372, 18, 180, 62, `<text x="12" y="22" fill="#fff" font-size="12" font-weight="800">Mohammed checked in</text><text x="12" y="38" fill="#9FB4C8" font-size="9.5" font-weight="600">Client site 7 · 08:05</text><text x="12" y="52" fill="#7FE6CF" font-size="9" font-weight="700">Inside geofence ✓</text>`)}
    ${axPill(200, 22, 160, 'SOS · Field tech Imran', '#FF5A5F', 0.9)}`,
      17,
    ),
  indoorpeople: () =>
    axSvg(
      'Floor plan with people moving between rooms and a restricted server room',
      `${axFloor(30, 40, 360, 230, [
        [30, 40, 140, 100, 'LOBBY'],
        [170, 40, 110, 100, 'LAB'],
        [280, 40, 110, 100, 'SERVER ROOM', 1],
        [30, 170, 120, 100, 'OFFICE A'],
        [150, 170, 120, 100, 'MEETING'],
        [270, 170, 120, 100, 'OFFICE B'],
      ])}
    <line x1="30" y1="155" x2="390" y2="155" stroke="#7FA7FF" stroke-opacity=".15" stroke-width="22"/>
    ${axMover('M50 155 H370', '#3EF7FF', 9, 5)}${axMover('M200 155 V100 H240 V155 H320 V220', '#03AD86', 11, 5)}${axMover('M90 220 V155 H210 V210', '#7FA7FF', 13, 5)}
    ${[
      [70, 90],
      [110, 110],
      [210, 80],
      [250, 110],
      [80, 220],
      [200, 210],
      [320, 230],
      [350, 200],
    ]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="4.5" fill="#7FA7FF" stroke="#fff" stroke-width="1.5"/>`,
      )
      .join('')}
    ${axDot(340, 100, '#FF5A5F', '', false, 5)}
    ${axStat(408, 40, 144, 70, 'FLOOR 2 · NOW', '34', 'people', '12 visitors')}
    ${axStat(408, 124, 144, 70, 'ROLL CALL', '0', 'missing', 'Last drill 10 Nov')}
    ${axPill(404, 210, 152, 'Restricted · Server room', '#FF5A5F')}`,
      19,
    ),
  mobicop: () => {
    const r = 'M60 230 L140 180 L230 210 L300 140 L380 170 L450 100 L520 130';
    const cps = [
      [60, 230],
      [140, 180],
      [230, 210],
      [300, 140],
      [380, 170],
      [450, 100],
      [520, 130],
    ];
    return axSvg(
      'Night patrol route with checkpoints, an officer on patrol and an SOS alert',
      `${axMap()}<path d="${r}" fill="none" stroke="#7FA7FF" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 6"/>
    ${cps.map(([x, y], i) => `<g transform="translate(${x} ${y})"><path d="M0 -11 L9 -7 V1 Q9 8 0 12 Q-9 8 -9 1 V-7 Z" fill="${i < 5 ? '#03AD86' : '#33435A'}" stroke="#fff" stroke-width="1.5"/><text y="4" text-anchor="middle" fill="#fff" font-size="8" font-weight="800">${i + 1}</text></g>`).join('')}
    ${axMover('M60 230 L140 180 L230 210 L300 140 L380 170', '#3EF7FF', 12, 6)}
    ${axStat(18, 18, 168, 74, 'PATROL A · TONIGHT', '5 / 7', 'checkpoints', 'On schedule')}
    ${axStat(384, 210, 168, 72, 'ON DUTY', '6', 'officers', 'Shift 18:00 – 02:00')}
    ${axPill(214, 22, 214, 'SOS · Officer 214 · 2 min ago', '#FF5A5F', 0.9)}`,
      23,
    );
  },
  asset: () => {
    const r = 'M70 240 C 160 236 200 190 280 180 S 400 150 470 90';
    const box = (x, y, c) =>
      `<g transform="translate(${x} ${y})"><rect x="-22" y="-12" width="44" height="24" rx="2" fill="${c}"/>${[-14, -6, 2, 10].map((v) => `<line x1="${v}" y1="-10" x2="${v}" y2="10" stroke="#06172A" stroke-opacity=".35"/>`).join('')}<circle cx="16" cy="-16" r="4" fill="#3EF7FF"/></g>`;
    return axSvg(
      'Containers and equipment with GPS tags, one moving along a route out of the port yard',
      `${axMap()}<rect x="30" y="200" width="150" height="80" rx="8" fill="rgba(3,173,134,.08)" stroke="#03AD86" stroke-dasharray="5 4"/><text x="40" y="294" fill="#7FE6CF" font-size="9.5" font-weight="700" letter-spacing=".06em">PORT YARD</text>
    ${box(70, 225, '#5AA9FF')}${box(130, 225, '#7FA7FF')}${box(100, 258, '#F6B73C')}${axRoute(r)}
    <g><animateMotion dur="12s" repeatCount="indefinite" path="${r}"/>${box(0, 0, '#03AD86')}</g>
    ${axStat(18, 18, 190, 74, 'CONTAINER C-221', 'Moved 3.4 km', '', 'Since 10:42 · on a truck', '#FFD98A')}
    ${axStat(400, 196, 152, 74, 'TRACKER', '82%', 'battery', 'Last ping 30 s ago')}
    ${axPill(250, 22, 186, 'Left geofence · Port yard', '#F68C3C')}`,
      29,
    );
  },
  atm: (tracking) => {
    const atm = `<g transform="translate(250 60)"><rect x="0" y="0" width="120" height="192" rx="10" fill="#33435A" stroke="#7FA7FF" stroke-opacity=".6"/><rect x="14" y="16" width="92" height="56" rx="4" fill="#0A2036" stroke="#3EF7FF" stroke-opacity=".6"/><text x="60" y="48" text-anchor="middle" fill="#9FE9FF" font-size="10" font-weight="800">WELCOME</text>
      ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${22 + c * 18}" y="${86 + r * 14}" width="14" height="10" rx="2" fill="#5B6B82"/>`).join('')).join('')}<rect x="82" y="88" width="16" height="6" rx="2" fill="#03AD86"/><rect x="82" y="100" width="16" height="6" rx="2" fill="#F6B73C"/><rect x="82" y="112" width="16" height="6" rx="2" fill="#FF5A5F"/>
      <rect x="20" y="138" width="80" height="8" rx="3" fill="#0A1626"/><rect x="30" y="160" width="60" height="6" rx="3" fill="#0A1626"/></g>`;
    const waves = `<g stroke="#FF5A5F" stroke-width="2" fill="none" opacity=".8">${[16, 26, 36].map((d, i) => `<path d="M${380 + d} 120 q8 30 0 60"><animate attributeName="opacity" values="1;.1;1" dur="1.2s" begin="${i * 0.2}s" repeatCount="indefinite"/></path>`).join('')}</g>`;
    return axSvg(
      tracking
        ? 'ATM with a GPS tracker raising an alert when it is moved from its site'
        : 'ATM with door, vibration, power and camera sensors',
      `${axGround(252)}${atm}${waves}
    ${axDot(240, 80, '#03AD86', 'Door', true, 5)}${axDot(240, 150, '#3EF7FF', 'Camera', true, 5)}${axDot(240, 220, tracking ? '#F6B73C' : '#03AD86', tracking ? 'GPS' : 'Power', true, 5)}
    ${
      tracking
        ? `${aCard(410, 40, 142, 120, `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">LOCATION</text><g transform="translate(0 6)" stroke="#5AA9FF" stroke-opacity=".2">${[40, 60, 80, 100].map((y) => `<line x1="8" y1="${y}" x2="134" y2="${y - 10}"/>`).join('')}</g><circle cx="40" cy="80" r="20" fill="none" stroke="#03AD86" stroke-dasharray="4 4"/><path d="M40 80 L104 56" stroke="#FF5A5F" stroke-width="2" stroke-dasharray="4 3"/>${axDot(104, 56, '#FF5A5F', '', false, 5)}<text x="12" y="112" fill="#FF9A9D" font-size="9" font-weight="700">280 m from its site</text>`)}${axStat(18, 40, 170, 74, 'ATM 0412', 'Sealed', '', 'Tracker battery 91%')}${axPill(18, 230, 196, 'ATM moved · after hours', '#FF5A5F', 0.9)}`
        : `${axStat(18, 40, 170, 74, 'CASH CASSETTES', '78%', '', '≈ 2 days of cash left')}${axStat(410, 40, 142, 74, 'POWER', 'Mains ✓', '', 'UPS 100%')}${axPill(18, 230, 214, 'Vibration detected · ATM 0412', '#FF5A5F', 0.9)}${axStat(410, 130, 142, 64, 'TEMPERATURE', '27°C', '', 'Normal')}`
    }`,
      31,
    );
  },
  indoorasset: () =>
    axSvg(
      'Ward floor plan with tagged equipment, gateways and an item leaving its area',
      `${axFloor(30, 40, 360, 230, [
        [30, 40, 120, 110, 'WARD 3'],
        [150, 40, 120, 110, 'ROOM 304'],
        [270, 40, 120, 110, 'STORE'],
        [30, 180, 180, 90, 'CORRIDOR'],
        [210, 180, 180, 90, 'ICU'],
      ])}
    ${[
      [90, 100],
      [330, 100],
      [120, 225],
      [300, 225],
    ]
      .map(
        ([x, y]) =>
          `<g transform="translate(${x} ${y})"><circle r="5" fill="#3EF7FF"/>${[12, 20].map((r, i) => `<circle r="${r}" fill="none" stroke="#3EF7FF" stroke-opacity=".5"><animate attributeName="opacity" values="1;0;1" dur="2s" begin="${i * 0.5}s" repeatCount="indefinite"/></circle>`).join('')}</g>`,
      )
      .join('')}
    ${[
      [190, 90, '#03AD86'],
      [220, 120, '#03AD86'],
      [300, 70, '#7FA7FF'],
      [350, 130, '#7FA7FF'],
      [60, 130, '#03AD86'],
      [260, 240, '#03AD86'],
    ]
      .map(
        ([x, y, c]) =>
          `<g transform="translate(${x} ${y})"><rect x="-8" y="-6" width="16" height="12" rx="2" fill="${c}"/><circle cx="8" cy="-6" r="3" fill="#F6B73C"/></g>`,
      )
      .join('')}
    <g><animateMotion dur="8s" repeatCount="indefinite" path="M170 225 H40"/><rect x="-8" y="-6" width="16" height="12" rx="2" fill="#FF5A5F"/></g>
    ${axStat(408, 40, 144, 76, 'INFUSION PUMP 12', 'Room 304', '', 'Ward 3 · seen 20 s ago')}
    ${aCard(408, 128, 144, 66, `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">IN USE TODAY</text><text x="12" y="40" fill="#fff" font-size="18" font-weight="800">68%</text>${axBar(12, 48, 120, 68)}`)}
    ${axPill(404, 210, 152, 'Left area · Wheelchair 5', '#F68C3C')}`,
      37,
    ),
  dg: () =>
    axSvg(
      'Diesel generator with fuel level, running hours and a fuel theft alert',
      `${axGround(252)}
    <g transform="translate(160 120)"><rect x="0" y="0" width="230" height="132" rx="10" fill="#1E3A5C" stroke="#7FA7FF" stroke-opacity=".6"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${20 + i * 14}" y="22" width="6" height="60" rx="2" fill="#0A2036"/>`).join('')}<rect x="130" y="22" width="80" height="40" rx="4" fill="#0A2036" stroke="#3EF7FF" stroke-opacity=".5"/><text x="170" y="47" text-anchor="middle" fill="#7FE6CF" font-size="12" font-weight="800">RUN</text>${axBlink(144, 76, '#03AD86', 4)}${axBlink(160, 76, '#03AD86', 4, 1)}<rect x="0" y="100" width="230" height="32" rx="6" fill="#16304E"/><text x="14" y="121" fill="#9FB4C8" font-size="10" font-weight="700">FUEL</text>${axBar(54, 113, 160, 46, '#F6B73C')}</g>
    <rect x="186" y="72" width="16" height="50" fill="#33435A"/>${[0, 1, 2].map((i) => `<circle cx="194" cy="66" r="8" fill="#C9D8FF" opacity=".25"><animate attributeName="cy" values="66;20" dur="3s" begin="${i}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".35;0" dur="3s" begin="${i}s" repeatCount="indefinite"/><animate attributeName="r" values="6;16" dur="3s" begin="${i}s" repeatCount="indefinite"/></circle>`).join('')}
    ${axStat(18, 20, 128, 74, 'RUNNING', '3h 12m', '', 'Since mains failed')}
    ${axStat(18, 108, 128, 74, 'FUEL', '210', 'L', '46% · ~9 h left', '#FFD98A')}
    ${axStat(410, 20, 142, 74, 'LOAD', '62', 'kVA', 'Battery charging')}
    ${axPill(300, 262, 254, 'Fuel dropped 40 L in 5 min · possible theft', '#FF5A5F', 0.9)}`,
      41,
    ),
  datacenter: () =>
    axSvg(
      'Data centre racks with cold and hot aisle temperatures and a hot spot alert',
      `${axGround(262)}
    ${[0, 1, 2, 3].map((i) => `<g transform="translate(${150 + i * 72} 62)"><rect width="60" height="200" rx="4" fill="#1E3A5C" stroke="#7FA7FF" stroke-opacity=".5"/>${[...Array(10)].map((_, j) => `<rect x="6" y="${10 + j * 19}" width="48" height="14" rx="2" fill="#0A2036"/>${axBlink(14, 17 + j * 19, j % 3 ? '#03AD86' : '#3EF7FF', 2)}${axBlink(22, 17 + j * 19, '#03AD86', 2, 2.2)}`).join('')}${i === 2 ? `<rect width="60" height="200" rx="4" fill="none" stroke="#F68C3C" stroke-width="3"><animate attributeName="stroke-opacity" values="1;.3;1" dur="1.4s" repeatCount="indefinite"/></rect>` : ''}</g>`).join('')}
    <g stroke="#3EF7FF" stroke-width="2" fill="none" opacity=".7">${[170, 250, 320, 400].map((x, i) => `<path d="M${x} 280 v-12"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" begin="${i * 0.3}s" repeatCount="indefinite"/></path>`).join('')}</g>
    <g stroke="#FF5A5F" stroke-width="2" fill="none" opacity=".6">${[180, 260, 330, 410].map((x, i) => `<path d="M${x} 52 v-14 m-4 4 l4 -4 l4 4"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" begin="${i * 0.3}s" repeatCount="indefinite"/></path>`).join('')}</g>
    ${axStat(18, 40, 120, 74, 'COLD AISLE', '22.4°C', '', '45% RH · normal')}
    ${axStat(18, 128, 120, 74, 'WATER LEAK', 'Dry', '', 'All 6 sensors ✓')}
    ${axStat(452, 40, 100, 74, 'RACK B3', '31.2°C', '', 'Above 28°C', '#FFD98A')}
    ${axPill(12, 216, 134, 'Hot spot · Rack B3', '#F68C3C')}`,
      43,
    ),
  telecom: () =>
    axSvg(
      'Telecom tower site running on battery with a shelter door alert',
      `${axGround(252)}
    <g stroke="#7FA7FF" stroke-width="2" fill="none" stroke-opacity=".8"><path d="M200 252 L240 40 L280 252"/>${[
      220, 190, 160, 130, 100, 70,
    ]
      .map((y) => {
        const k = (252 - y) / 212;
        return `<line x1="${200 + 40 * k}" y1="${y}" x2="${280 - 40 * k}" y2="${y}"/><line x1="${200 + 40 * k}" y1="${y}" x2="${280 - 40 * ((252 - y + 30) / 212)}" y2="${y - 30}"/>`;
      })
      .join('')}</g>
    ${[
      [222, 62],
      [258, 62],
      [240, 50],
    ]
      .map(([x, y]) => `<rect x="${x - 4}" y="${y}" width="8" height="22" rx="2" fill="#C9D8FF"/>`)
      .join('')}
    <g stroke="#3EF7FF" fill="none" stroke-width="2">${[18, 30, 42].map((r, i) => `<path d="M${240 - r} ${46 - r * 0.3} a${r} ${r} 0 0 1 ${r * 2} 0"><animate attributeName="opacity" values="1;.1;1" dur="1.8s" begin="${i * 0.3}s" repeatCount="indefinite"/></path>`).join('')}</g>
    <rect x="300" y="186" width="96" height="66" rx="4" fill="#1E3A5C" stroke="#7FA7FF" stroke-opacity=".6"/><rect x="356" y="198" width="30" height="54" fill="#0A2036" stroke="#FF5A5F" stroke-width="2"><animate attributeName="stroke-opacity" values="1;.3;1" dur="1s" repeatCount="indefinite"/></rect><text x="310" y="204" fill="#9FB4C8" font-size="8.5" font-weight="700">SHELTER</text>
    <g transform="translate(110 206)"><rect width="70" height="46" rx="4" fill="#16304E" stroke="#03AD86" stroke-opacity=".6"/>${[0, 1, 2].map((i) => `<rect x="${8 + i * 20}" y="10" width="14" height="28" rx="2" fill="#03AD86" opacity="${i < 2 ? 0.9 : 0.35}"/>`).join('')}</g>
    <g transform="translate(430 196) skewX(-20)"><rect width="90" height="40" fill="#1E4D7A" stroke="#7FA7FF"/>${[22, 45, 67].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="40" stroke="#7FA7FF" stroke-opacity=".6"/>`).join('')}<line x1="0" y1="20" x2="90" y2="20" stroke="#7FA7FF" stroke-opacity=".6"/></g>
    ${axStat(18, 20, 150, 74, 'MAINS POWER', 'OFF', '', 'On battery since 06:40', '#FFD98A')}
    ${axStat(18, 108, 150, 74, 'BATTERY', '74%', '', '≈ 4 h 10 m left')}
    ${axPill(320, 22, 232, 'Shelter door opened · Site RUH-221', '#FF5A5F', 0.9)}`,
      47,
    ),
  tank: () =>
    axSvg(
      'Fuel tank with a radar level sensor, current level and a sudden drop alert',
      `${axGround(262)}
    <g transform="translate(190 70)"><rect x="0" y="0" width="180" height="192" rx="18" fill="#16304E" stroke="#7FA7FF" stroke-opacity=".6" stroke-width="2"/>
    <clipPath id="acTank"><rect x="4" y="4" width="172" height="184" rx="15"/></clipPath><g clip-path="url(#acTank)"><path d="M0 64 q22 -8 45 0 t45 0 t45 0 t45 0 t45 0 V200 H0 Z" fill="#03AD86" fill-opacity=".55"><animateTransform attributeName="transform" type="translate" values="0 0;-45 0;0 0" dur="6s" repeatCount="indefinite"/></path></g>
    <rect x="70" y="-18" width="40" height="18" rx="4" fill="#C9D8FF"/><g stroke="#3EF7FF" stroke-width="2" stroke-dasharray="4 5"><line x1="90" y1="4" x2="90" y2="58"><animate attributeName="stroke-dashoffset" from="0" to="-18" dur=".8s" repeatCount="indefinite"/></line></g>
    <text x="90" y="130" text-anchor="middle" fill="#fff" font-size="28" font-weight="800">68%</text><text x="90" y="150" text-anchor="middle" fill="#C9F4FF" font-size="11" font-weight="700">34,000 L</text></g>
    ${axStat(18, 40, 150, 74, 'LAST DELIVERY', '+12,000', 'L', 'Today 08:30 · matched ✓')}
    ${axStat(18, 128, 150, 74, 'DAYS LEFT', '≈ 5', 'days', 'At current use', '#FFD98A')}
    ${axStat(400, 40, 152, 74, 'RADAR SENSOR', '±2 mm', '', 'Reading every 60 s')}
    ${axPill(384, 220, 170, 'Sudden drop 900 L · Tank 3', '#FF5A5F', 0.9)}`,
      53,
    ),
  dispenser: () =>
    axSvg(
      'Fuel dispenser with a live litre counter, a car refuelling and an unauthorised dispense alert',
      `${axGround(252)}
    <g transform="translate(200 60)"><rect width="110" height="192" rx="10" fill="#1E3A5C" stroke="#7FA7FF" stroke-opacity=".6"/><rect x="14" y="16" width="82" height="50" rx="4" fill="#0A2036" stroke="#3EF7FF" stroke-opacity=".6"/><text x="55" y="38" text-anchor="middle" fill="#9FE9FF" font-size="9" font-weight="700">LITRES</text><text x="55" y="58" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">48.20</text>
    <rect x="14" y="80" width="82" height="20" rx="3" fill="#03AD86" opacity=".7"/><text x="55" y="94" text-anchor="middle" fill="#06172A" font-size="9" font-weight="800">DIESEL</text><rect x="96" y="110" width="22" height="36" rx="4" fill="#33435A"/></g>
    <path d="M318 172 C 360 172 360 220 400 214" fill="none" stroke="#C9D8FF" stroke-width="5"/>
    <g transform="translate(380 252)"><path d="M0 -30 L20 -50 H120 L150 -30 H170 V0 H0 Z" fill="#33435A" stroke="#7FA7FF" stroke-opacity=".5"/><rect x="34" y="-46" width="36" height="14" rx="2" fill="#C9F4FF" opacity=".6"/><rect x="78" y="-46" width="36" height="14" rx="2" fill="#C9F4FF" opacity=".6"/><circle cx="36" cy="0" r="12" fill="#0A1626" stroke="#C9D8FF" stroke-width="3"/><circle cx="136" cy="0" r="12" fill="#0A1626" stroke="#C9D8FF" stroke-width="3"/></g>
    ${axStat(18, 40, 160, 74, 'DISPENSED TODAY', '8,420', 'L', '212 transactions')}
    ${axStat(18, 128, 160, 74, 'TOTALISER', 'Matched ✓', '', 'vs sales system')}
    ${axPill(330, 22, 224, 'Dispense without approval · Pump 4', '#FF5A5F', 0.9)}`,
      59,
    ),
  video: () =>
    axSvg(
      'Camera view with AI boxes on people and a vehicle, a missing helmet and an intrusion alert',
      `
    <rect x="18" y="18" width="534" height="264" rx="12" fill="#0B2036" stroke="#7FA7FF" stroke-opacity=".35"/>
    <path d="M18 200 L552 160 V282 H18 Z" fill="#0F2A44"/><line x1="18" y1="200" x2="552" y2="160" stroke="#5AA9FF" stroke-opacity=".3"/>
    <g fill="#5B6B82">${[
      [120, 170, 1.3],
      [200, 172, 1.2],
      [420, 154, 1.2],
    ]
      .map(
        ([x, y, s]) =>
          `<g transform="translate(${x} ${y}) scale(${s})"><circle cy="-30" r="7"/><rect x="-8" y="-22" width="16" height="26" rx="5"/><rect x="-7" y="4" width="5" height="18" rx="2"/><rect x="2" y="4" width="5" height="18" rx="2"/></g>`,
      )
      .join('')}</g>
    <path d="M118 128 a8 6 0 0 1 16 0 Z" fill="#F6E04C"/>
    <g transform="translate(300 186)"><rect x="0" y="-30" width="80" height="30" rx="6" fill="#5B6B82"/><rect x="12" y="-44" width="50" height="16" rx="4" fill="#5B6B82"/><circle cx="18" cy="2" r="7" fill="#0A1626"/><circle cx="64" cy="2" r="7" fill="#0A1626"/></g>
    ${axBox(100, 116, 40, 82, 'PERSON 0.97')}${axBox(182, 120, 38, 78, 'NO HELMET', '#FF5A5F')}${axBox(292, 134, 98, 62, 'VEHICLE 0.92')}${axBox(404, 106, 36, 72, 'INTRUDER', '#FF5A5F')}
    <path d="M470 60 V150 H552" fill="rgba(255,90,95,.12)" stroke="#FF5A5F" stroke-dasharray="5 4"/>
    <rect x="18" y="18" width="534" height="3" fill="#3EF7FF" opacity=".35"><animate attributeName="y" values="18;278;18" dur="5s" repeatCount="indefinite"/></rect>
    <g transform="translate(34 32)"><circle cx="5" cy="5" r="5" fill="#FF5A5F"><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite"/></circle><text x="16" y="9" fill="#fff" font-size="10.5" font-weight="800">CAM 03 · LIVE</text></g>
    ${axStat(34, 204, 170, 66, 'TODAY', '3 · 12', '', 'Intrusions · PPE alerts')}
    ${axPill(330, 30, 206, 'Intrusion · North gate perimeter', '#FF5A5F', 0.9)}`,
      61,
    ),
  rfid: () =>
    axSvg(
      'Warehouse gate with an RFID portal reading tagged pallets on a forklift',
      `${axGround(252)}
    <g fill="#16304E" stroke="#7FA7FF" stroke-opacity=".35">${[0, 1, 2].map((r) => `<rect x="20" y="${70 + r * 60}" width="140" height="50" rx="3"/>`).join('')}</g>${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${30 + c * 32}" y="${86 + r * 60}" width="24" height="26" rx="2" fill="#7FA7FF" opacity=".55"/>`).join('')).join('')}
    <g fill="#33435A" stroke="#7FA7FF" stroke-opacity=".6"><rect x="250" y="70" width="18" height="182" rx="4"/><rect x="380" y="70" width="18" height="182" rx="4"/><rect x="250" y="62" width="148" height="14" rx="4"/></g>
    <g stroke="#3EF7FF" fill="none" stroke-width="2">${[14, 26, 38].map((r, i) => `<path d="M268 ${150 - r} a${r} ${r} 0 0 1 0 ${r * 2}"><animate attributeName="opacity" values="1;.1;1" dur="1.4s" begin="${i * 0.25}s" repeatCount="indefinite"/></path><path d="M380 ${150 - r} a${r} ${r} 0 0 0 0 ${r * 2}"><animate attributeName="opacity" values="1;.1;1" dur="1.4s" begin="${i * 0.25}s" repeatCount="indefinite"/></path>`).join('')}</g>
    <g><animateTransform attributeName="transform" type="translate" values="-60 0;300 0" dur="7s" repeatCount="indefinite"/><g transform="translate(200 252)"><rect x="0" y="-36" width="50" height="26" rx="4" fill="#F6B73C"/><rect x="34" y="-60" width="6" height="34" fill="#C9D8FF"/><rect x="40" y="-14" width="34" height="5" fill="#C9D8FF"/>${[0, 1].map((r) => [0, 1].map((c) => `<rect x="${46 + c * 14}" y="${-38 - r * 14}" width="12" height="12" rx="1" fill="#C9A26B"/><circle cx="${52 + c * 14}" cy="${-32 - r * 14}" r="2" fill="#3EF7FF"/>`).join('')).join('')}<circle cx="12" cy="-6" r="6" fill="#0A1626" stroke="#C9D8FF" stroke-width="2"/><circle cx="40" cy="-6" r="6" fill="#0A1626" stroke="#C9D8FF" stroke-width="2"/></g></g>
    ${axStat(420, 40, 132, 74, 'GATE 2 · TODAY', '148', 'items out', '0 unknown tags')}
    ${axStat(420, 128, 132, 74, 'STOCK COUNT', '99.6%', '', 'Aisle 7 · matched')}
    ${axPill(176, 22, 220, 'Unauthorised exit · Item 4471', '#FF5A5F', 0.9)}`,
      67,
    ),
  health: () =>
    axSvg(
      'Hospital ward floor plan with nurse badges, tagged equipment and a panic button alert',
      `${axFloor(30, 40, 360, 230, [
        [30, 40, 90, 100, 'ROOM 201'],
        [120, 40, 90, 100, 'ROOM 204'],
        [210, 40, 90, 100, 'ROOM 208'],
        [300, 40, 90, 100, 'NURSE ST.'],
        [30, 180, 180, 90, 'WARD 3'],
        [210, 180, 180, 90, 'PHARMACY'],
      ])}
    ${[
      [50, 70],
      [140, 70],
      [230, 70],
      [50, 210],
      [110, 210],
      [170, 210],
    ]
      .map(
        ([x, y]) =>
          `<rect x="${x}" y="${y}" width="34" height="18" rx="3" fill="#33435A" stroke="#7FA7FF" stroke-opacity=".5"/><rect x="${x + 2}" y="${y + 2}" width="9" height="14" rx="2" fill="#C9D8FF" opacity=".7"/>`,
      )
      .join('')}
    <line x1="30" y1="160" x2="390" y2="160" stroke="#7FA7FF" stroke-opacity=".15" stroke-width="22"/>
    ${axMover('M330 160 H160 V110', '#03AD86', 8, 5)}${axMover('M340 100 V160 H60', '#3EF7FF', 11, 5)}
    <g transform="translate(250 112)"><circle r="7" fill="#FF5A5F"/><circle r="7" fill="none" stroke="#FF5A5F"><animate attributeName="r" values="7;20;7" dur="1.1s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite"/></circle></g>
    <g transform="translate(150 118)"><rect x="-8" y="-6" width="16" height="12" rx="2" fill="#7FA7FF"/><circle cx="8" cy="-6" r="3" fill="#F6B73C"/></g>
    ${axStat(408, 40, 144, 76, 'NURSE CALL', 'Room 204', '', 'Answered in 45 s')}
    ${aCard(408, 128, 144, 66, `<text x="12" y="20" fill="#9FB4C8" font-size="9.5" font-weight="700" letter-spacing=".08em">HAND HYGIENE</text>${axRing(112, 40, 16, 92, '#03AD86', '92')}<text x="12" y="46" fill="#fff" font-size="15" font-weight="800">92%</text><text x="12" y="58" fill="#9FB4C8" font-size="8.5" font-weight="600">this shift</text>`)}
    ${axPill(404, 210, 152, 'Panic button · Room 208', '#FF5A5F', 0.9)}`,
      71,
    ),
};

/** Every scene, by the name a product manifest gives (`scene: 'vehicle'`). */
const ALL = {
  ...SCENES,
  vehicle: artVehicle,
  construct: artConstruct,
  atm: () => SCENES.atm(false),
  atmtrack: () => SCENES.atm(true),
};

export const SCENE_NAMES = Object.keys(ALL);

/** The scene's SVG markup, or '' for an unknown name. */
export function sceneMarkup(name) {
  return ALL[name] ? ALL[name]() : '';
}
