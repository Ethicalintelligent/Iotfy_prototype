/* IT-0032 · Vehicle Tracking → Grid View (approved; copied from iterations/IT-0032/prototype).
 * Page content of the approved design (design-reference/Vehicle Grid View screen.dc.html),
 * ported to plain JavaScript: controls row (status dropdown since round 7), card grid (front / flipped back), list view,
 * Vehicle Filters panel, sort popup, pagination, toast. Sizes, colours, data and rules are
 * the reference's own. The reference's sidebar, top bar and solution selector are left out:
 * the IoTIFY shell provides the sidebar and header. Demo data only (data.js). */
(function () {
  'use strict';

  var VEH = window.VGV_VEH;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ic(d, w) {
    w = w || 15;
    return '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block">' + d + '</svg>';
  }
  function ic12(d) { return ic(d, 12); }
  function fillI(inner) { return '<svg viewBox="0 0 24 24" width="12" height="12" style="display:block">' + inner + '</svg>'; }

  /* ---------- icons (same paths as the reference) ---------- */
  var P = {
    chevDown: '<path d="m6 9 6 6 6-6"/>', chevL: '<path d="m15 18-6-6 6-6"/>', chevR: '<path d="m9 18 6-6-6-6"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    funnel: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sort: '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    odo: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m7 14 4-4 4 4 5-5"/>',
    flip: '<path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/><path d="M16 16h5v5"/>',
    details: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 8.38A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    live: '<path d="M17 9c0 4.2-5 10-5 10s-5-5.8-5-10a5 5 0 0 1 10 0Z"/><circle cx="12" cy="9" r="1.8"/><path d="M4.8 7.6a7 7 0 0 0 0 6.8"/><path d="M19.2 7.6a7 7 0 0 1 0 6.8"/>',
    nearby: '<path d="M16 11c0 2.4-2.6 4.8-3.3 5.4a1 1 0 0 1-1.4 0C10.6 15.8 8 13.4 8 11a4 4 0 0 1 8 0Z"/><circle cx="12" cy="11" r="1"/><circle cx="12" cy="12" r="10" stroke-dasharray="2 3"/>',
    report: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M8 17v-4"/><path d="M12.5 17V8"/><path d="M17 17v-6"/>',
    immob: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    sensor: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
    speed: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  };
  var I = {
    grid: ic(P.grid, 13), list: ic(P.list, 13), funnel: ic(P.funnel, 13), close: ic(P.close, 14),
    sensor: ic(P.sensor, 14), flip14: ic(P.flip, 14), chev13L: ic(P.chevL, 13), chev13R: ic(P.chevR, 13),
    speedSm: ic(P.speed, 12), pin: ic(P.pin, 12), odo: ic(P.odo, 12), search: ic(P.search, 14),
    sort13: ic(P.sort, 13), check: ic(P.check, 14), chevDown: ic(P.chevDown, 14), reset: ic(P.reset, 14),
    details: ic(P.details), live: ic(P.live), nearby: ic(P.nearby), report: ic(P.report), immob: ic(P.immob), settings: ic(P.settings),
    userSm: '<span aria-hidden="true" style="display:block;width:12px;height:12px;flex-shrink:0;background:#12955F;-webkit-mask:url(vgv-operator.png) center / contain no-repeat;mask:url(vgv-operator.png) center / contain no-repeat"></span>',
  };
  var SEC_ICON = {
    operator: ic(P.user, 15), sensor: ic(P.sensor, 15),
    device: ic('<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>', 15),
    location: ic(P.pin, 15), group: ic(P.grid, 15),
  };
  var INST_ICON = {
    Temperature: ic('<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>', 14),
    Load: ic('<path d="M12 3a2.5 2.5 0 0 1 2.5 2.5c0 .6-.2 1.1-.5 1.5h3.6a1 1 0 0 1 1 .8L21 20a1 1 0 0 1-1 1.2H4A1 1 0 0 1 3 20L5.4 7.8a1 1 0 0 1 1-.8H10c-.3-.4-.5-.9-.5-1.5A2.5 2.5 0 0 1 12 3Z"/>', 14),
    Door: ic('<path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/>', 14),
    AC: ic('<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9"/>', 14),
  };
  /* Card telemetry icons */
  var CI = {
    gps: ic12('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
    battery: fillI('<rect x="7" y="4" width="10" height="18" rx="2" fill="currentColor"/><rect x="10" y="2" width="4" height="3" rx="1" fill="currentColor"/>'),
    power: fillI('<rect x="2" y="7" width="20" height="13" rx="2" fill="currentColor"/><path d="M6 7V5h3v2M15 7V5h3v2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5.5 13.5h4M16 11.5v4M14 13.5h4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'),
    gsm: fillI('<path d="M21 3v18H3z" fill="currentColor"/>'),
    key: ic12('<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2"/>'),
    ac: ic12('<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2M4 9l2 3-2 3M20 9l-2 3 2 3"/>'),
    belt: ic12('<circle cx="12" cy="4.5" r="2.5"/><path d="M8 22v-8a4 4 0 0 1 8 0v8"/><path d="M7 10l10 9"/>'),
    front: fillI('<path d="M2 22V10.2c0-.5.2-1 .5-1.3L8.4 2.6c.4-.4.9-.6 1.4-.6H20a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2Z" fill="currentColor"/><path d="M6 9.5 9.6 5.5H19v4Z" fill="#fff" fill-opacity=".85"/>'),
    back: fillI('<g transform="matrix(-1 0 0 1 24 0)"><path d="M2 22V10.2c0-.5.2-1 .5-1.3L8.4 2.6c.4-.4.9-.6 1.4-.6H20a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2Z" fill="currentColor"/><path d="M6 9.5 9.6 5.5H19v4Z" fill="#fff" fill-opacity=".85"/></g>'),
    alert: ic12('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  };

  /* ---------- colour rules ---------- */
  var G = '#0E7F5E', O = '#F76C09', R = '#F90507', A = '#F5A70A', N = '#B3B9C0';
  function gsmCol(v) { return /^Strong/.test(v) ? G : /^Weak/.test(v) ? A : /^No signal/.test(v) ? R : N; }
  function batCol(v) { return /Very High|^High/.test(v) ? G : v === 'Medium' ? A : v === 'Low' ? R : N; }
  var C = {
    gps: function (v) { return v === 'Available' ? G : v === 'Not available' ? R : N; },
    ext: function (v) { return v === 'Connected' ? G : v === 'Disconnected' ? R : N; },
    eng: function (v) { return v === 'On' ? G : v === 'Off' ? R : N; },
    ac: function (v) { return v === 'On' ? G : N; },
    belt: function (v) { return v === 'Fastened' ? G : v === 'Unfastened' ? R : N; },
    door: function (v) { return v === 'Closed' ? G : v === 'Open' ? O : N; },
  };
  var GRAD = 'linear-gradient(90deg,#009863 0%,#005965 100%)';
  var ST = {
    'Running': { dot: '#009863', fg: '#009863', ring: '#03AD86', grad: 'linear-gradient(90deg,#005965 0%,#009863 100%)' },
    'Stopped': { dot: '#F90507', fg: '#F90507', ring: '#FF8A8A', grad: 'linear-gradient(90deg,#F90507 0%,#FF8887 100%)' },
    'Idle': { dot: '#0363FF', fg: '#0363FF', ring: '#8BB8FF', grad: 'linear-gradient(90deg,#0363FF 0%,#74AAFF 100%)' },
    'Overspeed': { dot: '#FF6B2C', fg: '#FF5A1F', ring: '#FFA36B', grad: 'linear-gradient(90deg,#FF5A14 0%,#FF6F2A 55%,#FF9447 100%)' },
    'Towed': { dot: '#4BA9B5', fg: '#11636A', ring: '#6FE0E0', grad: 'linear-gradient(90deg,#2B98A5 0%,#4FB3BE 55%,#86D0D6 100%)' },
    'No Transmit': { dot: '#1F2328', fg: '#111827', ring: '#6B7280', grad: 'linear-gradient(90deg,#1F2328 0%,#3A4048 55%,#6B7280 100%)' },
    'Yet to Transmit': { dot: '#9AA3B2', fg: '#8A94A6', ring: '#C3C9D2', grad: 'linear-gradient(90deg,#7C8798 0%,#9AA3B2 55%,#C3C9D2 100%)' },
  };
  var PILL = { 'Running': ['#009863', '#E6F5EF'], 'Stopped': ['#F90507', '#FDECEC'], 'Idle': ['#0363FF', '#E8F0FF'], 'Overspeed': ['#F76C09', '#FFF1E6'], 'Towed': ['#07B1B4', '#E3F7F7'], 'No Transmit': ['#2B333C', '#ECEEF0'], 'Yet to Transmit': ['#748093', '#F2F4F6'] };
  var CHIP_DEF = [['all', 'All'], ['Running', 'Running'], ['Stopped', 'Stopped'], ['Idle', 'Idle'], ['No Transmit', 'No Trans'], ['Overspeed', 'Overspeed'], ['Towed', 'Towed'], ['Yet to Transmit', 'YTT']];
  var ST_ORDER = ['Running', 'Overspeed', 'Idle', 'Stopped', 'Towed', 'No Transmit', 'Yet to Transmit'];
  var IMG = { truck: 'vgv-box-truck.png', van: 'vgv-van.png', pickup: 'vgv-pickup.png' };
  var GROUPS = ['Riyadh', 'Jeddah'];
  var SORTS = [['no', 'Vehicle no.'], ['status', 'Status'], ['speed', 'Highest speed'], ['odo', 'Highest odometer'], ['recent', 'Recently updated']];
  var VTYPES = ['Garbage Compactor', 'Pickup-1 cabin', 'Small Truck Covered', 'Van', 'Van Delivery'];
  var TYPE_NAME = { truck: 'Small Truck Covered', pickup: 'Pickup-1 cabin', van: 'Van' };
  var GEOFENCES = ['Customer Zone East', 'Head Office'];
  var PAGE = 12;

  function num(s) { var m = String(s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; }
  function rangeOf(r) { if (!r) return null; var p = String(r).replace(/,/g, '').split('–'); if (p.length < 2) return null; var lo = num(p[0]), hi = num(p[1]); return lo == null || hi == null ? null : [lo, hi]; }
  function outOfRange(s) { var r = rangeOf(s.range), v = num(s.value); return !!r && v != null && (v < r[0] || v > r[1]); }

  /* ---------- filters ---------- */
  var DEF = { unassigned: false, ignition: 'Any', installed: [], ac: 'Any', seatbelt: 'Any', door: 'Any', outOfRange: false, gps: 'Any', extBat: 'Any', watch: 'Any', gsm: 'any', intBat: 'any', geofence: 'any', vtypes: [], groups: null };
  function copyF(f) { var o = {}; Object.keys(DEF).forEach(function (k) { o[k] = Array.isArray(f[k]) ? f[k].slice() : f[k]; }); return o; }
  function isSet(f, k) { return Array.isArray(DEF[k]) ? f[k].length > 0 : k === 'groups' ? f.groups != null : f[k] !== DEF[k]; }
  function activeCountOf(f) { return Object.keys(DEF).filter(function (k) { return isSet(f, k); }).length; }
  function sameF(a, b) { return Object.keys(DEF).every(function (k) { return JSON.stringify(a[k]) === JSON.stringify(b[k]); }); }
  function matches(v, f) {
    if (f.unassigned && v.operator !== 'Not Assigned') return false;
    if (f.ignition !== 'Any' && v.engine !== f.ignition) return false;
    for (var i = 0; i < f.installed.length; i++) {
      var s = f.installed[i];
      if (s === 'Temperature' && !v.sensors.some(function (x) { return /temp/i.test(x.name); })) return false;
      if (s === 'Load' && !v.sensors.some(function (x) { return /load/i.test(x.name); })) return false;
      if (s === 'Door' && !(['Open', 'Closed'].indexOf(v.frontDoor) >= 0 || ['Open', 'Closed'].indexOf(v.backDoor) >= 0)) return false;
      if (s === 'AC' && ['On', 'Off'].indexOf(v.ac) < 0) return false;
    }
    if (f.ac !== 'Any' && v.ac !== f.ac) return false;
    if (f.seatbelt !== 'Any' && v.seatbelt !== f.seatbelt) return false;
    if (f.door === 'Open' && !(v.frontDoor === 'Open' || v.backDoor === 'Open')) return false;
    if (f.door === 'Closed' && !((v.frontDoor === 'Closed' || v.backDoor === 'Closed') && v.frontDoor !== 'Open' && v.backDoor !== 'Open')) return false;
    if (f.outOfRange && !v.sensors.some(outOfRange)) return false;
    if (f.gps !== 'Any' && v.gps !== f.gps) return false;
    if (f.extBat !== 'Any' && v.extBat !== f.extBat) return false;
    if (f.watch === 'On') return false; /* no vehicle is in Watch Mode in this data */
    if (f.gsm !== 'any' && !(f.gsm === 'nodata' ? v.gsm === 'No data' : f.gsm === 'none' ? /^No signal/.test(v.gsm) : f.gsm === 'strong' ? /^Strong/.test(v.gsm) : /^Weak/.test(v.gsm))) return false;
    if (f.intBat !== 'any' && v.intBat !== f.intBat) return false;
    if (f.geofence !== 'any') return false; /* no vehicle is inside a geofence in this data */
    if (f.vtypes.length && f.vtypes.indexOf(TYPE_NAME[v.type]) < 0) return false;
    if (f.groups && f.groups.indexOf(v.group) < 0) return false;
    return true;
  }

  /* ---------- state ---------- */
  var S = {
    status: 'all', view: 'grid', query: '', sort: 'no', page: 0, flipped: {},
    filterOpen: false, sortOpen: false, statusOpen: false, applied: copyF(DEF), d: copyF(DEF),
    open: { operator: true, sensor: true, device: true, location: true, group: true },
    typeOpen: false, typeQuery: '', groupQuery: '', toast: '',
  };
  var justFlipped = null, toTop = false, toastTimer = 0;
  function set(patch) { Object.assign(S, patch); render(); }
  function setD(patch) { S.d = Object.assign(copyF(S.d), patch); render(); }
  function say(msg) { clearTimeout(toastTimer); set({ toast: msg }); toastTimer = setTimeout(function () { set({ toast: '' }); }, 2000); }

  /* Event handlers are registered per render and looked up by index (data-h / data-c). */
  var H = [];
  function h(fn) { H.push(fn); return H.length - 1; }

  /* ---------- views ---------- */
  function cardData(v) {
    var st = ST[v.status] || ST['Yet to Transmit'];
    var pill = PILL[v.status] || PILL['Yet to Transmit'];
    var icons = [
      { title: 'GPS: ' + v.gps + (v.gpsSat ? ' · ' + v.gpsSat : ''), color: C.gps(v.gps), svg: CI.gps },
      { title: 'Internal battery: ' + v.intBat, color: batCol(v.intBat), svg: CI.battery },
      { title: 'External power: ' + v.extBat + (v.extV ? ' · ' + v.extV : ''), color: C.ext(v.extBat), svg: CI.power },
      { title: 'GSM: ' + v.gsm, color: gsmCol(v.gsm), svg: CI.gsm },
      { title: 'Ignition: ' + v.engine, color: C.eng(v.engine), svg: CI.key },
      { title: 'AC: ' + v.ac, color: C.ac(v.ac), svg: CI.ac },
      { title: 'Seat belt: ' + v.seatbelt, color: C.belt(v.seatbelt), svg: CI.belt },
      { title: 'Front door: ' + v.frontDoor, color: C.door(v.frontDoor), svg: CI.front },
      { title: 'Back door: ' + v.backDoor, color: C.door(v.backDoor), svg: CI.back },
      { title: v.alerts ? v.alerts + ' active alert' + (v.alerts > 1 ? 's' : '') : 'No active alerts', color: v.alerts ? O : N, svg: CI.alert, badge: v.alerts ? String(v.alerts) : '' },
    ];
    /* IT-0032 (owner's choice): each action opens the matching existing Vehicle Tracking page.
       The shell (DesignPage) follows the page change and switches the menu item. */
    function act(label, svg, page, danger) { return { label: label, svg: svg, page: page, bg: danger ? '#FDECEC' : '#fff', ring: danger ? 'inset 0 0 0 1px #FBD0D0' : 'inset 0 0 0 1px #E3E6EA', fg: danger ? '#F90507' : '#3D4A5C' }; }
    var actions = [act('Vehicle details', I.details, 'Manage-Vehicle.html'), act('Live Monitor', I.live, 'Tracking.html'), act('Nearby Vehicles', I.nearby, 'Map-View.html'), act('Vehicle Report', I.report, 'Reports.html')];
    if (v.immobilizer) actions.push(act('Immobilizer', I.immob, 'Tracking.html', true));
    actions.push(act('Settings', I.settings, 'Manage-Vehicle.html'));
    var sensors = v.sensors.map(function (x) {
      var bad = outOfRange(x);
      return { name: x.name, source: x.source, value: x.value, range: 'Range ' + (x.range || ''), bg: bad ? '#FFF4F4' : '#F6FBF8', line: bad ? '#FBD0D0' : '#D5EEE2', fg: bad ? '#C70406' : '#0B1B2B' };
    });
    var kv = [
      { label: 'GPS', value: v.gps + (v.gpsSat ? ' · ' + v.gpsSat : ''), color: C.gps(v.gps), svg: CI.gps },
      { label: 'GSM', value: v.gsm, color: gsmCol(v.gsm), svg: CI.gsm },
      { label: 'Internal battery', value: v.intBat, color: batCol(v.intBat), svg: CI.battery },
      { label: 'External power', value: v.extBat + (v.extV ? ' · ' + v.extV : ''), color: C.ext(v.extBat), svg: CI.power },
    ];
    function chip(label, value, col) {
      var m = col === G ? ['#E6F5EF', '#0A6B4B'] : col === O ? ['#FFF1E6', '#B4530A'] : col === R ? ['#FDECEC', '#C70406'] : ['#F1F3F5', '#6B7685'];
      return { label: label, value: value, short: { 'Ignition': 'Engine', 'Seat belt': 'Belt', 'Front door': 'Front', 'Back door': 'Back' }[label] || label, shortVal: value === 'Not configured' ? 'N/C' : value === 'No data' ? 'N/A' : value, dot: col, bg: m[0], fg: m[1] };
    }
    var inputs = [chip('Ignition', v.engine, C.eng(v.engine)), chip('AC', v.ac, C.ac(v.ac)), chip('Seat belt', v.seatbelt, C.belt(v.seatbelt)), chip('Front door', v.frontDoor, C.door(v.frontDoor)), chip('Back door', v.backDoor, C.door(v.backDoor))];
    return {
      v: v, grad: st.grad, img: IMG[v.type] || IMG.truck,
      speedFg: num(v.speed) > 0 ? '#009863' : '#3D4A5C', opFg: v.operator === 'Not Assigned' ? '#748093' : '#4B5563',
      vsFg: v.vstatus === 'Maintenance' ? '#B4530A' : '#0E7F5E',
      dateShort: (v.updated.match(/^([A-Za-z]{3} \d{1,2})/) || ['', 'No update'])[1],
      timeShort: (v.updated.match(/(\d{1,2}:\d{2} [AP]M)$/) || ['', ''])[1],
      pillSpace: (v.status.length * 6 + 30).toFixed(0) + 'px', pillColor: pill[0], pillSoft: pill[1],
      maint: v.vstatus === 'Maintenance', icons: icons, actions: actions, sensors: sensors, kv: kv, inputs: inputs,
      sensorChips: v.sensors.map(function (x) { var b = outOfRange(x); return { text: x.name + ' ' + x.value, bg: b ? '#FDECEC' : '#E6F5EF', fg: b ? '#C70406' : '#0A6B4B' }; }),
    };
  }

  function statusPill(c, extra) {
    return '<span title="Status: ' + esc(c.v.status) + '" style="' + extra + 'height:18px;display:inline-flex;align-items:center;gap:5px;padding:0 7px;border-radius:999px;background:' + c.pillSoft + ';font-size:10.5px;font-weight:600;color:' + c.pillColor + ';white-space:nowrap"><span style="width:6px;height:6px;border-radius:50%;background:' + c.pillColor + '"></span>' + esc(c.v.status) + '</span>';
  }
  /* inRow (round 6, card front): the tab is the first item of the action row, pinned to the
     bottom-left corner, so the action icons follow its real width (8px after it). */
  function dateTab(c, inRow) {
    return '<div title="Last update · ' + esc(c.v.lastReport) + '" style="' + (inRow ? 'align-self:flex-end;flex-shrink:0;margin-right:2px;' : 'position:absolute;left:0;bottom:0;') + 'height:16px;padding:0 12px 0 13px;box-sizing:border-box;border-radius:0 8px 0 0;background:' + c.grad + ';display:flex;align-items:center;gap:5px;font-size:11px;color:#fff;white-space:nowrap;text-shadow:0 1px 2px rgba(1,29,50,.35)"><b style="font-weight:700">' + esc(c.dateShort) + '</b>' + esc(c.timeShort) + '</div>';
  }
  var FLIP_BTN_STYLE = 'border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:700;color:#0B7A55;white-space:nowrap;background:linear-gradient(180deg,#E3F6EC 0%,#CDEFDF 100%);box-shadow:inset 0 0 0 1px #9ED8BF,0 1px 4px rgba(3,173,134,.16)';
  /* Round 3 (owner's request, deviation from the reference's 0.9fr / 1fr / 2.6fr): Speed and
     Odometer size to their content and are never cut off; Location takes the remaining width and
     ends in "…" when too long (full address in the tooltip). `fit` = size to content. */
  function metric(title, icon, label, value, fit) {
    return '<div title="' + esc(title) + '" style="min-width:0;box-sizing:border-box;height:38px;display:flex;flex-direction:column;justify-content:center;gap:2px;padding:0 9px;border-radius:8px;background:#F5F7F9;box-shadow:inset 0 0 0 1px #EDF0F3"><span style="display:flex;align-items:center;gap:4px;font-size:10.5px;font-weight:500;color:#6B7685;line-height:14px;white-space:nowrap"><span style="display:grid;place-items:center;color:#12955F">' + icon + '</span>' + label + '</span><span style="font-size:12px;font-weight:600;color:#0B1B2B;line-height:16px;white-space:nowrap' + (fit ? '' : ';overflow:hidden;text-overflow:ellipsis') + '">' + esc(value) + '</span></div>';
  }

  function cardHtml(c) {
    var v = c.v, back = !!S.flipped[v.id];
    var flip = h(function () { var f = Object.assign({}, S.flipped); f[v.id] = !f[v.id]; justFlipped = v.id; set({ flipped: f }); });
    var out = '<article class="vgv-card h-card" aria-label="' + esc(v.name + ' ' + v.plate) + '" style="position:relative;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #E1E5EA,0 1px 2px rgba(1,29,50,.06),0 4px 14px rgba(1,29,50,.06);overflow:hidden;transition:transform .18s ease, filter .18s ease">';
    if (!back) {
      out += '<div style="position:relative;height:126px">' +
        '<img src="' + c.img + '" alt="" style="position:absolute;left:10px;top:18px;width:60px;height:44px;object-fit:contain;object-position:left center">' +
        statusPill(c, 'position:absolute;top:10px;right:10px;') +
        '<div style="position:absolute;left:80px;top:10px;right:10px;display:flex;flex-direction:column;gap:4px">' +
          '<span style="height:17px;line-height:17px;padding-right:' + c.pillSpace + ';font-size:12.5px;font-weight:700;color:#0B1B2B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(v.name) + ' <span style="font-weight:500;color:#6B7685">· ' + esc(v.plate) + '</span></span>' +
          '<span title="Operator: ' + esc(v.operator) + '" style="height:17px;min-width:0;display:flex;align-items:center;gap:5px;color:#12955F">' + I.userSm + '<span style="min-width:0;font-size:12px;font-weight:600;color:' + c.opFg + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(v.operator) + '</span></span>' +
          '<div aria-label="Vehicle indicators" style="height:20px;display:flex;align-items:center;gap:4px">' +
            c.icons.map(function (i) {
              return '<span title="' + esc(i.title) + '" style="position:relative;flex-shrink:0;width:20px;height:20px;box-sizing:border-box;border-radius:6px;background:#fff;box-shadow:inset 0 0 0 1px #E3E6EA;display:grid;place-items:center;color:' + i.color + '">' + i.svg +
                (i.badge ? '<span style="position:absolute;top:-5px;right:-5px;min-width:12px;height:12px;padding:0 2px;box-sizing:border-box;border-radius:999px;background:#F76C09;color:#fff;font-size:8.5px;font-weight:800;line-height:12px;text-align:center">' + i.badge + '</span>' : '') + '</span>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div aria-label="Vehicle metrics" style="position:absolute;left:10px;right:10px;top:80px;height:38px;display:grid;grid-template-columns:max-content max-content minmax(0, 1fr);gap:8px">' +
          metric('Speed: ' + v.speed, I.speedSm, 'Speed', v.speed, true) +
          metric('Odometer: ' + v.odometer, I.odo, 'Odometer', v.odometer, true) +
          metric('Location: ' + v.location, I.pin, 'Location', v.location) +
        '</div>' +
        '<div aria-hidden="true" style="position:absolute;left:10px;right:10px;bottom:0;height:1px;background:#EEF0F2"></div>' +
        (c.maint ? '<span title="Vehicle status" style="position:absolute;top:32px;right:10px;height:18px;line-height:18px;padding:0 7px;border-radius:999px;background:#FFF1E6;color:#B4530A;font-size:10.5px;font-weight:700">Maintenance</span>' : '') +
      '</div>' +
      '<div class="vgv-actrow" style="height:42px;box-sizing:border-box;padding:0 10px 0 0;display:flex;align-items:center;gap:6px">' +
        dateTab(c, true) +
        c.actions.map(function (a) {
          var run = h(function () { window.location.href = a.page; });
          return '<button type="button" class="h-act" data-h="' + run + '" aria-label="' + esc(a.label + ': ' + v.name) + '" title="' + esc(a.label) + '" style="flex-shrink:0;width:26px;height:26px;border:none;border-radius:8px;padding:0;display:grid;place-items:center;cursor:pointer;background:' + a.bg + ';box-shadow:' + a.ring + ';color:' + a.fg + '">' + a.svg + '</button>';
        }).join('') +
        '<div style="flex:1"></div>' +
        '<button type="button" class="h-sens" data-h="' + flip + '" aria-label="More details: sensors and device" title="Sensors &amp; Device" style="flex-shrink:0;align-self:center;box-sizing:border-box;height:26px;line-height:1;padding:0 9px 0 7px;display:flex;align-items:center;gap:5px;' + FLIP_BTN_STYLE + '">' + I.sensor + '<span class="vgv-sens-label">Sensors</span></button>' +
      '</div>';
    } else {
      out += '<div class="' + (justFlipped === v.id ? 'vgv-flip-in' : '') + '" style="height:168px;box-sizing:border-box;padding:10px;display:flex;flex-direction:column;gap:8px;overflow:hidden">' +
        '<div style="height:24px;flex-shrink:0;display:flex;align-items:center;gap:8px">' +
          '<span style="width:24px;height:24px;border-radius:6px;background:' + c.grad /* round 5: the vehicle's status gradient, same as its date tab */ + ';color:#fff;display:grid;place-items:center;flex-shrink:0">' + I.sensor + '</span>' +
          '<span style="flex:1;min-width:0;font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(v.name) + ' <span style="font-weight:500;color:#6B7685">· ' + esc(v.plate) + '</span></span>' +
          statusPill(c, 'flex-shrink:0;') +
        '</div>' +
        (c.sensors.length
          ? '<div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:8px;flex-shrink:0">' +
              c.sensors.map(function (s) {
                return '<div class="vgv-met" title="' + esc(s.name + ' · ' + s.source + ' · ' + s.range) + '" style="min-width:0;height:26px;box-sizing:border-box;padding:0 9px;border-radius:8px;background:' + s.bg + ';box-shadow:inset 0 0 0 1px ' + s.line + ';display:flex;flex-direction:column;justify-content:center;gap:4px">' +
                  '<span class="vgv-met-row" style="height:15px;display:flex;align-items:baseline;gap:6px;min-width:0"><span style="flex:1;min-width:0;font-size:10.5px;line-height:15px;color:#6B7685;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(s.name) + '</span><span style="font-size:12px;line-height:15px;font-weight:600;color:' + s.fg + ';white-space:nowrap">' + esc(s.value) + '</span></span></div>';
              }).join('') +
            '</div>'
          : '<div style="height:26px;flex-shrink:0;box-sizing:border-box;border-radius:8px;background:#F5F7F9;box-shadow:inset 0 0 0 1px #EDF0F3;display:flex;align-items:center;justify-content:center;font-size:11.5px;color:#6B7685">No sensors configured</div>') +
        '<div style="display:flex;align-items:flex-start;gap:10px;min-height:0;flex:1;margin-bottom:8px">' +
          '<div class="vgv-dev" aria-label="Device status" style="width:44%;flex-shrink:0;display:flex;flex-direction:column;gap:6px">' +
            c.kv.map(function (k) {
              return '<div title="' + esc(k.label + ': ' + k.value) + '" style="min-width:0;height:12px;display:flex;align-items:center;gap:6px"><span style="display:block;width:12px;height:12px;flex-shrink:0;color:' + k.color + '">' + k.svg + '</span><span style="min-width:0;font-size:11px;line-height:12px;font-weight:600;color:#0B1B2B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(k.value) + '</span></div>';
            }).join('') +
          '</div>' +
          '<span aria-hidden="true" style="width:1px;height:66px;background:#E9ECEF;flex-shrink:0"></span>' +
          '<div aria-label="Inputs" style="flex:1;min-width:0;height:66px;display:flex;flex-wrap:wrap;align-content:flex-start;gap:4px">' +
            c.inputs.map(function (p) {
              return '<span class="vgv-pill" title="' + esc(p.label + ': ' + p.value) + '" style="height:20px;box-sizing:border-box;padding:0 7px;border-radius:999px;background:' + p.bg + ';color:' + p.fg + ';display:flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;white-space:nowrap"><span style="width:5px;height:5px;border-radius:50%;background:' + p.dot + '"></span><span>' + esc(p.short) + '</span><span>·</span><span>' + esc(p.shortVal) + '</span></span>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<button type="button" class="h-sens" data-h="' + flip + '" aria-label="Vehicle info: back to the card" title="Vehicle info" style="position:absolute;right:10px;bottom:8px;box-sizing:border-box;width:30px;height:26px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;' + FLIP_BTN_STYLE + '">' + I.flip14 + '</button>' +
        dateTab(c) +
      '</div>';
    }
    return out + '</article>';
  }

  function listHtml(rows) {
    var th = function (t, pad) { return '<th scope="col" style="padding:' + (pad || '10px 8px') + ';font-size:12px;font-weight:700;color:#3D4A5C">' + t + '</th>'; };
    return '<div class="vgv-scroll" data-sk="list" style="overflow-x:auto;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1px #E9ECEF">' +
      '<table style="width:100%;min-width:1180px;border-collapse:collapse;font-size:12.5px"><thead><tr style="background:#F4F6F8;text-align:left">' +
      th('Vehicle', '10px 12px') + th('Status') + th('Indicators') + th('Operator') + th('Speed') + th('Location') + th('Odometer') + th('Sensors') + th('Vehicle Status') + th('Last update', '10px 12px 10px 8px') +
      '</tr></thead><tbody>' +
      rows.map(function (c) {
        var v = c.v;
        return '<tr class="h-row" style="box-shadow:inset 0 -1px 0 #EEF0F2">' +
          '<td style="padding:6px 12px"><div style="display:flex;align-items:center;gap:10px"><img src="' + c.img + '" alt="" style="width:40px;height:28px;object-fit:contain"><span style="display:flex;flex-direction:column;line-height:15px"><b style="font-weight:700">' + esc(v.name) + '</b><span style="font-size:11.5px;color:#6B7685">' + esc(v.plate) + '</span></span></div></td>' +
          '<td style="padding:6px 8px"><span style="display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:999px;background:' + c.grad + ';color:#fff;font-size:11px;font-weight:700;white-space:nowrap;text-shadow:0 1px 2px rgba(1,29,50,.35)"><span style="width:5px;height:5px;border-radius:50%;background:#fff"></span>' + esc(v.status) + '</span></td>' +
          '<td style="padding:6px 8px"><div style="display:flex;align-items:center;gap:9px">' +
            c.icons.map(function (i) {
              return '<span title="' + esc(i.title) + '" style="position:relative;display:block;width:12px;height:12px;color:' + i.color + '">' + i.svg +
                (i.badge ? '<span style="position:absolute;top:-6px;right:-7px;min-width:12px;height:12px;padding:0 2px;box-sizing:border-box;border-radius:999px;background:#F76C09;color:#fff;font-size:8.5px;font-weight:800;line-height:12px;text-align:center">' + i.badge + '</span>' : '') + '</span>';
            }).join('') + '</div></td>' +
          '<td style="padding:6px 8px;color:' + c.opFg + ';white-space:nowrap">' + esc(v.operator) + '</td>' +
          '<td style="padding:6px 8px;font-weight:700;color:' + c.speedFg + ';white-space:nowrap">' + esc(v.speed) + '</td>' +
          '<td style="padding:6px 8px;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + esc(v.location) + '">' + esc(v.location) + '</td>' +
          '<td style="padding:6px 8px;white-space:nowrap">' + esc(v.odometer) + '</td>' +
          '<td style="padding:6px 8px"><div style="display:flex;gap:4px;flex-wrap:wrap">' +
            c.sensorChips.map(function (s) { return '<span style="height:20px;line-height:20px;padding:0 7px;border-radius:6px;background:' + s.bg + ';color:' + s.fg + ';font-size:11px;font-weight:600;white-space:nowrap">' + esc(s.text) + '</span>'; }).join('') +
            (c.sensors.length ? '' : '<span style="color:#94A0AF">—</span>') + '</div></td>' +
          '<td style="padding:6px 8px;font-weight:700;color:' + c.vsFg + '">' + esc(v.vstatus) + '</td>' +
          '<td style="padding:6px 12px 6px 8px;white-space:nowrap;color:#3D4A5C">' + esc(v.updated) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  /* ----- filter panel fields ----- */
  var CB_MARK = { on: ic(P.check, 12), mid: ic('<path d="M6 12h12"/>', 12) };
  function cbox(state) {
    var on = state === true || state === 'mid';
    return '<span style="width:18px;height:18px;box-sizing:border-box;border-radius:6px;display:grid;place-items:center;flex-shrink:0;background:' + (on ? GRAD : '#fff') + ';box-shadow:' + (on ? 'none' : 'inset 0 0 0 1.5px #C3CAD3') + '">' +
      (on ? '<span style="color:#fff;display:grid;place-items:center">' + (state === true ? CB_MARK.on : CB_MARK.mid) + '</span>' : '') + '</span>';
  }
  var LABEL = '<span style="font-size:12px;font-weight:700;color:#0B1B2B">';
  function segF(label, key, opts) {
    var d = S.d;
    return '<div style="display:flex;flex-direction:column;gap:6px">' + LABEL + label + '</span>' +
      '<div role="radiogroup" aria-label="' + label + '" style="display:flex;height:34px;box-sizing:border-box;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1px #DCE1E6;padding:2px;gap:2px">' +
      opts.map(function (o) {
        var on = d[key] === o, p = {}; p[key] = o;
        var pick = h(function () { setD(p); });
        return '<button type="button" role="radio" aria-checked="' + on + '" data-h="' + pick + '" style="flex:1 1 0;min-width:0;border:none;border-radius:6px;padding:0 2px;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:' + (on ? 700 : 500) + ';background:' + (on ? GRAD : 'transparent') + ';box-shadow:' + (on ? '0 2px 6px rgba(3,173,134,.30)' : 'none') + ';color:' + (on ? '#fff' : '#3D4A5C') + ';text-shadow:' + (on ? '0 1px 2px rgba(1,29,50,.30)' : 'none') + ';white-space:nowrap">' + o + '</button>';
      }).join('') + '</div></div>';
  }
  function selF(label, key, opts, disabled) {
    var d = S.d, val = disabled ? '' : d[key];
    var weight = disabled || d[key] === DEF[key] ? 500 : 600;
    var fg = disabled ? '#94A0AF' : d[key] === DEF[key] ? '#6B7685' : '#0B1B2B';
    var change = h(function (e) { var p = {}; p[key] = e.target.value; setD(p); });
    return '<label style="display:flex;flex-direction:column;gap:6px">' + LABEL + label + '</span>' +
      '<span style="position:relative;display:block">' +
      '<select data-c="' + change + '"' + (disabled ? ' disabled' : '') + ' aria-label="' + label + '" style="width:100%;height:34px;box-sizing:border-box;border:none;border-radius:8px;padding:0 32px 0 10px;appearance:none;-webkit-appearance:none;background:#F9F9FB;box-shadow:inset 0 0 0 1px #D7D8DB;font-family:inherit;font-size:12.5px;font-weight:' + weight + ';color:' + fg + ';cursor:pointer">' +
      opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') +
      '</select>' +
      '<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;width:14px;height:14px;display:grid;place-items:center;color:#6B7685">' + I.chevDown + '</span>' +
      '</span></label>';
  }
  function swF(label, sub, key) {
    var on = S.d[key], p = {}; p[key] = !on;
    var t = h(function () { setD(p); });
    return '<div style="display:flex;align-items:center;gap:10px">' +
      '<span style="flex:1;display:flex;flex-direction:column;line-height:16px"><span style="font-size:12px;font-weight:700;color:#0B1B2B">' + label + '</span><span style="font-size:11px;color:#6B7685">' + sub + '</span></span>' +
      '<button type="button" role="switch" aria-checked="' + on + '" aria-label="' + label + '" data-h="' + t + '" style="width:34px;height:20px;border:none;border-radius:999px;padding:0;position:relative;cursor:pointer;flex-shrink:0;background:' + (on ? '#0E7F5E' : '#C3CAD3') + '"><span style="position:absolute;top:2px;left:' + (on ? '16px' : '2px') + ';width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s ease"></span></button></div>';
  }
  function chipsF() {
    var d = S.d;
    return '<div style="display:flex;flex-direction:column;gap:6px">' + LABEL + 'Installed sensors</span><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
      ['Temperature', 'Load', 'Door', 'AC'].map(function (label) {
        var on = d.installed.indexOf(label) >= 0;
        var pick = h(function () { setD({ installed: on ? d.installed.filter(function (x) { return x !== label; }) : d.installed.concat(label) }); });
        return '<button type="button" data-h="' + pick + '" aria-pressed="' + on + '" style="height:34px;border:none;border-radius:8px;padding:0 10px;display:flex;align-items:center;gap:8px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:' + (on ? 700 : 600) + ';background:' + (on ? '#E6F5EF' : '#fff') + ';box-shadow:' + (on ? 'inset 0 0 0 1.5px #12955F' : 'inset 0 0 0 1px #DCE1E6') + ';color:' + (on ? '#0A6B4B' : '#0B1B2B') + '"><span style="display:grid;place-items:center;color:' + (on ? '#0B9467' : '#3D4A5C') + '">' + INST_ICON[label] + '</span>' + label + '</button>';
      }).join('') + '</div></div>';
  }
  function multiF() {
    var d = S.d, open = S.typeOpen, tq = S.typeQuery.trim().toLowerCase();
    var allT = d.vtypes.length === VTYPES.length;
    var toggleOpen = h(function () { set({ typeOpen: !S.typeOpen }); });
    var summary = !d.vtypes.length ? 'Any type' : d.vtypes.length === 1 ? d.vtypes[0] : d.vtypes.length + ' types selected';
    var out = '<div style="position:relative;display:flex;flex-direction:column;gap:6px">' + LABEL + 'Vehicle type</span>' +
      '<button type="button" data-h="' + toggleOpen + '" aria-expanded="' + open + '" aria-label="Vehicle type" style="width:100%;height:34px;box-sizing:border-box;border:none;border-radius:8px;padding:0 10px;background:#F9F9FB;box-shadow:' + (open ? 'inset 0 0 0 1.5px #03AD86' : 'inset 0 0 0 1px #D7D8DB') + ';display:flex;align-items:center;gap:8px;cursor:pointer;font-family:inherit;text-align:left">' +
      '<span style="flex:1;min-width:0;font-size:12.5px;font-weight:' + (d.vtypes.length ? 600 : 500) + ';color:' + (d.vtypes.length ? '#0B1B2B' : '#6B7685') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(summary) + '</span>' +
      '<span style="display:grid;place-items:center;color:#6B7685;transform:' + (open ? 'rotate(180deg)' : 'none') + '">' + I.chevDown + '</span></button>';
    if (open) {
      var setQ = h(function (e) { set({ typeQuery: e.target.value }); });
      var items = [{ label: 'Select all', count: '', weight: 700, rowBg: '#F2F4F6', cb: allT ? true : d.vtypes.length ? 'mid' : false, toggle: function () { setD({ vtypes: allT ? [] : VTYPES.slice() }); } }]
        .concat(VTYPES.filter(function (t) { return !tq || t.toLowerCase().indexOf(tq) >= 0; }).map(function (t) {
          var on = d.vtypes.indexOf(t) >= 0;
          return { label: t, count: String(VEH.filter(function (v) { return TYPE_NAME[v.type] === t; }).length), weight: 500, rowBg: 'transparent', cb: on, toggle: function () { setD({ vtypes: on ? d.vtypes.filter(function (x) { return x !== t; }) : d.vtypes.concat(t) }); } };
        }));
      out += '<div style="position:absolute;left:0;right:0;top:64px;z-index:5;background:#fff;border-radius:10px;box-shadow:0 12px 28px rgba(1,29,50,.18),inset 0 0 0 1px #E9ECEF;padding:8px;display:flex;flex-direction:column;gap:6px">' +
        '<label style="height:32px;box-sizing:border-box;padding:0 10px;border-radius:8px;background:#F9F9FB;box-shadow:inset 0 0 0 1px #D7D8DB;display:flex;align-items:center;gap:8px;color:#6B7685">' + I.search +
        '<input type="text" data-fk="typeq" data-c="' + setQ + '" value="' + esc(S.typeQuery) + '" placeholder="Search types..." aria-label="Search types" style="flex:1;min-width:0;border:none;background:transparent;font-family:inherit;font-size:12px;color:#0B1B2B"></label>' +
        '<div style="border-radius:8px;box-shadow:inset 0 0 0 1px #E3E6EA;padding:4px;display:flex;flex-direction:column;gap:2px">' +
        items.map(function (it) {
          return '<button type="button" class="h-opt" data-h="' + h(it.toggle) + '" style="height:28px;border:none;border-radius:6px;background:' + it.rowBg + ';display:flex;align-items:center;gap:8px;padding:0 8px;cursor:pointer;font-family:inherit;text-align:left">' + cbox(it.cb) +
            '<span style="flex:1;font-size:12px;font-weight:' + it.weight + ';color:#0B1B2B">' + esc(it.label) + '</span><span style="font-size:11px;color:#8A94A3">' + it.count + '</span></button>';
        }).join('') + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px"><span style="font-size:11.5px;color:#6B7685">' + d.vtypes.length + ' selected</span>' +
        '<button type="button" data-h="' + toggleOpen + '" style="height:28px;padding:0 14px;border:none;border-radius:8px;background:' + GRAD + ';box-shadow:inset 0 0 0 1.5px #03AD86;color:#fff;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">Done</button></div>' +
        '</div>';
    }
    return out + '</div>';
  }
  function groupsF() {
    var d = S.d, gq = S.groupQuery.trim().toLowerCase(), names = GROUPS.slice().sort(), sel = d.groups;
    var allG = sel != null && sel.length === names.length;
    var setQ = h(function (e) { set({ groupQuery: e.target.value }); });
    var items = [{ label: 'Select all', count: '', weight: 700, rowBg: '#F2F4F6', cb: allG ? true : sel && sel.length ? 'mid' : false, toggle: function () { setD({ groups: allG ? null : names.slice() }); } }]
      .concat(names.filter(function (n) { return !gq || n.toLowerCase().indexOf(gq) >= 0; }).map(function (n) {
        var on = sel != null && sel.indexOf(n) >= 0;
        return { label: n, count: String(VEH.filter(function (v) { return v.group === n; }).length), weight: 500, rowBg: 'transparent', cb: on,
          toggle: function () { var cur = sel || []; var next = on ? cur.filter(function (x) { return x !== n; }) : cur.concat(n); setD({ groups: next.length ? next : null }); } };
      }));
    return '<div style="display:flex;flex-direction:column;gap:6px">' +
      '<label style="height:34px;box-sizing:border-box;padding:0 10px;border-radius:8px;background:#F9F9FB;box-shadow:inset 0 0 0 1px #D7D8DB;display:flex;align-items:center;gap:8px;color:#6B7685">' + I.search +
      '<input type="text" data-fk="groupq" data-c="' + setQ + '" value="' + esc(S.groupQuery) + '" placeholder="Search groups..." aria-label="Search groups" style="flex:1;min-width:0;border:none;background:transparent;font-family:inherit;font-size:12.5px;color:#0B1B2B"></label>' +
      '<div style="border-radius:10px;box-shadow:inset 0 0 0 1px #E3E6EA;padding:4px;display:flex;flex-direction:column;gap:2px">' +
      items.map(function (it) {
        return '<button type="button" class="h-opt" data-h="' + h(it.toggle) + '" style="height:30px;border:none;border-radius:6px;background:' + it.rowBg + ';display:flex;align-items:center;gap:8px;padding:0 8px;cursor:pointer;font-family:inherit;text-align:left">' + cbox(it.cb) +
          '<span style="flex:1;font-size:12.5px;font-weight:' + it.weight + ';color:#0B1B2B">' + esc(it.label) + '</span><span style="font-size:11.5px;font-weight:600;color:#6B7685">' + it.count + '</span></button>';
      }).join('') + '</div></div>';
  }

  function filterPanelHtml(activeCount) {
    var d = S.d, f = S.applied;
    var close = h(function () { set({ filterOpen: false, typeOpen: false }); });
    var SECS = [
      ['operator', 'Operator', ['unassigned'], function () { return selF('Fleet Manager', 'x', [['', 'No fleet manager recorded']], true) + selF('Supervisor', 'x', [['', 'No supervisor recorded']], true) + selF('Vehicle Operator', 'x', [['', 'No vehicle operator recorded']], true) + swF('Unassigned operator only', 'Vehicles with no operator assigned', 'unassigned'); }],
      ['sensor', 'Sensor', ['ignition', 'installed', 'ac', 'seatbelt', 'door', 'outOfRange'], function () { return segF('Ignition', 'ignition', ['Any', 'On', 'Off']) + chipsF() + segF('AC', 'ac', ['Any', 'On', 'Off']) + segF('Seat Belt', 'seatbelt', ['Any', 'Fastened', 'Unfastened']) + segF('Door', 'door', ['Any', 'Open', 'Closed']) + swF('Out-of-range readings only', 'Sensors outside their set limits', 'outOfRange'); }],
      ['device', 'Device', ['gps', 'extBat', 'watch', 'gsm', 'intBat'], function () {
        return segF('GPS', 'gps', ['Any', 'Available', 'Not available']) + segF('External Battery', 'extBat', ['Any', 'Connected', 'Disconnected']) + segF('Watch Mode', 'watch', ['Any', 'On', 'Off']) +
          selF('GSM', 'gsm', [['any', 'Any gsm'], ['strong', 'Strong signal'], ['weak', 'Weak signal'], ['none', 'No signal'], ['nodata', 'No data']]) +
          selF('Internal Battery', 'intBat', [['any', 'Any internal battery'], ['Very High', 'Very High'], ['High', 'High'], ['Medium', 'Medium'], ['Low', 'Low'], ['No data', 'No data']]);
      }],
      ['location', 'Location', ['geofence'], function () { return selF('Geofence', 'geofence', [['any', 'Any geofence']].concat(GEOFENCES.map(function (g) { return [g, g]; }))); }],
      ['group', 'Group', ['vtypes', 'groups'], function () { return multiF() + groupsF(); }],
    ];
    var noChanges = sameF(d, f);
    var reset = h(function () { set({ d: copyF(DEF), applied: copyF(DEF), page: 0, typeOpen: false }); });
    var submit = h(function () { if (!sameF(S.d, S.applied)) set({ applied: copyF(S.d), page: 0, typeOpen: false }); });
    return '<div data-h="' + close + '" style="position:fixed;inset:0;z-index:25"></div>' +
      '<aside role="dialog" aria-label="Vehicle Filters" style="position:absolute;right:0;top:0;bottom:0;z-index:30;width:264px;box-sizing:border-box;background:#fff;border-radius:14px;box-shadow:0 14px 36px rgba(1,29,50,.18),0 2px 6px rgba(1,29,50,.06),inset 0 0 0 1px #E9ECEF;display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="height:56px;flex-shrink:0;box-sizing:border-box;padding:0 12px;display:flex;align-items:center;gap:10px;box-shadow:inset 0 -1px 0 #EEF0F2">' +
          '<span style="width:34px;height:34px;border-radius:10px;background:' + GRAD + ';box-shadow:0 0 0 1.5px #03AD86,0 0 10px rgba(3,173,134,.45);color:#fff;display:grid;place-items:center;flex-shrink:0">' + I.funnel + '</span>' +
          '<div style="flex:1;min-width:0;display:flex;flex-direction:column;line-height:17px"><span style="font-size:14px;font-weight:700;color:#0B1B2B">Vehicle Filters</span><span style="font-size:12px;color:#6B7685">' + (activeCount ? activeCount + ' filter' + (activeCount > 1 ? 's' : '') + ' applied' : 'No filters applied') + '</span></div>' +
          '<button type="button" class="h-close" data-h="' + close + '" aria-label="Close filters" title="Close" style="width:26px;height:26px;border:none;border-radius:8px;background:#fff;box-shadow:0 2px 6px rgba(1,29,50,.16),inset 0 0 0 1px #EEF0F2;color:#3D4A5C;display:grid;place-items:center;cursor:pointer;padding:0;flex-shrink:0">' + I.close + '</button>' +
        '</div>' +
        '<div class="vgv-scroll" data-sk="fbody" style="flex:1;min-height:0;overflow-y:auto">' +
          SECS.map(function (sec) {
            var key = sec[0], n = sec[2].filter(function (k) { return isSet(d, k); }).length, open = !!S.open[key];
            var toggle = h(function () { var o = Object.assign({}, S.open); o[key] = !o[key]; set({ open: o }); });
            return '<section style="box-shadow:inset 0 -1px 0 #EEF0F2;padding:0 12px">' +
              '<button type="button" data-h="' + toggle + '" aria-expanded="' + open + '" style="width:100%;height:50px;border:none;background:transparent;padding:0;display:flex;align-items:center;gap:10px;cursor:pointer;font-family:inherit;text-align:left">' +
                '<span style="width:28px;height:28px;border-radius:8px;background:#E6F5EF;color:#0B9467;display:grid;place-items:center;flex-shrink:0">' + SEC_ICON[key] + '</span>' +
                '<span style="flex:1;font-size:13px;font-weight:700;color:#0B1B2B">' + sec[1] + '</span>' +
                (n ? '<span style="min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:999px;background:' + GRAD + ';color:#fff;font-size:10.5px;font-weight:700;line-height:18px;text-align:center">' + n + '</span>' : '') +
                '<span style="display:grid;place-items:center;width:14px;height:14px;margin-right:10px;color:#6B7685;transform:' + (open ? 'none' : 'rotate(-90deg)') + ';transition:transform .18s ease">' + I.chevDown + '</span>' +
              '</button>' +
              (open ? '<div style="display:flex;flex-direction:column;gap:12px;padding:0 0 14px">' + sec[3]() + '</div>' : '') +
            '</section>';
          }).join('') +
        '</div>' +
        '<div style="flex-shrink:0;padding:10px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;box-shadow:inset 0 1px 0 #EEF0F2">' +
          '<button type="button" data-h="' + reset + '" style="height:36px;border:none;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1px #E3E6EA;display:flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;font-size:13px;font-weight:700;color:#3D4A5C;cursor:pointer">' + I.reset + ' Reset</button>' +
          '<button type="button" data-h="' + submit + '"' + (noChanges ? ' disabled' : '') + ' style="height:36px;border:none;border-radius:8px;background:' + GRAD + ';box-shadow:inset 0 0 0 1.5px #03AD86;font-family:inherit;font-size:13px;font-weight:700;color:#fff;cursor:' + (noChanges ? 'default' : 'pointer') + ';opacity:' + (noChanges ? '.5' : '1') + ';text-shadow:0 1px 2px rgba(1,29,50,.35)">Submit</button>' +
        '</div>' +
      '</aside>';
  }

  /* ---------- main render ---------- */
  var root = document.getElementById('root');

  function render() {
    H = [];
    var f = S.applied, q = S.query.trim().toLowerCase();
    var base = VEH.filter(function (v) { return matches(v, f) && (!q || [v.name, v.plate, v.location, v.operator].join(' ').toLowerCase().indexOf(q) >= 0); });
    var counts = {}; base.forEach(function (v) { counts[v.status] = (counts[v.status] || 0) + 1; });
    var list = S.status === 'all' ? base : base.filter(function (v) { return v.status === S.status; });
    var t = function (v) { return Date.parse(v.updated) || 0; };
    var sorters = {
      no: function (a, b) { return a.id - b.id; },
      status: function (a, b) { return ST_ORDER.indexOf(a.status) - ST_ORDER.indexOf(b.status) || a.id - b.id; },
      speed: function (a, b) { return num(b.speed) - num(a.speed); },
      odo: function (a, b) { return (num(b.odometer) || 0) - (num(a.odometer) || 0); },
      recent: function (a, b) { return t(b) - t(a) || a.id - b.id; },
    };
    list = list.slice().sort(sorters[S.sort]);
    var pageCount = Math.max(1, Math.ceil(list.length / PAGE));
    var page = Math.min(S.page, pageCount - 1);
    var rows = list.slice(page * PAGE, page * PAGE + PAGE).map(cardData);
    var activeCount = activeCountOf(f), isOpen = S.filterOpen;
    var sortOn = S.sortOpen || S.sort !== 'no';
    var fb = isOpen || activeCount
      ? { bg: 'linear-gradient(90deg, #009863 0%, #005965 100%)', shadow: '0 0 0 1.5px #03AD86, 0 0 10px rgba(3,173,134,.45)', fg: '#fff' }
      : { bg: '#E8F5EF', shadow: 'inset 0 0 0 1.5px #A9D8C3', fg: '#12955F' };
    var sortLabel = (SORTS.filter(function (o) { return o[0] === S.sort; })[0] || SORTS[0])[1];

    /* Round 7: STATUS DROPDOWN (replaces the status chips). Same 8 statuses, colours and live
       counts as the chips had; counts follow the search and the applied filters. */
    var statusInfo = function (k) {
      var isAll = k === 'all', st = ST[k];
      return { label: CHIP_DEF.filter(function (c) { return c[0] === k; })[0][1], dot: isAll ? '#6B7685' : st.dot, pillFg: isAll ? '#0B1B2B' : st.fg, n: isAll ? base.length : (counts[k] || 0) };
    };
    var countPill = function (si) { return '<span style="height:18px;line-height:18px;padding:0 7px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px #D5DADF;font-size:11px;font-weight:700;color:' + si.pillFg + '">' + si.n + '</span>'; };
    var dotHtml = function (si) { return '<span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;background:' + si.dot + '"></span>'; };
    var cur = statusInfo(S.status);
    var toggleStatus = h(function () { set({ statusOpen: !S.statusOpen, sortOpen: false, filterOpen: false, typeOpen: false }); });
    var closeStatus = h(function () { set({ statusOpen: false }); });
    var statusPopup = !S.statusOpen ? '' :
      '<div data-h="' + closeStatus + '" style="position:fixed;inset:0;z-index:25"></div>' +
      '<div role="listbox" aria-label="Vehicle status" style="position:absolute;left:0;top:40px;z-index:30;width:220px;box-sizing:border-box;padding:6px;background:#fff;border-radius:10px;box-shadow:0 12px 28px rgba(1,29,50,.18),inset 0 0 0 1px #E9ECEF;display:flex;flex-direction:column;gap:2px">' +
        '<span style="padding:4px 8px 6px;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#8A94A3">VEHICLE STATUS</span>' +
        CHIP_DEF.map(function (cd) {
          var k = cd[0], on = S.status === k, si = statusInfo(k);
          var pick = h(function () { toTop = true; set({ status: k, page: 0, statusOpen: false }); });
          return '<button type="button" role="option" class="h-opt" aria-selected="' + on + '" data-h="' + pick + '" style="height:30px;border:none;border-radius:6px;padding:0 8px;display:flex;align-items:center;gap:8px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:' + (on ? 700 : 500) + ';color:#0B1B2B;text-align:left;background:' + (on ? '#E6F5EF' : 'transparent') + '">' +
            dotHtml(si) + '<span style="flex:1;white-space:nowrap">' + si.label + '</span>' + countPill(si) +
            '<span style="width:14px;display:grid;place-items:center;color:#0E7F5E">' + (on ? I.check : '') + '</span></button>';
        }).join('') +
      '</div>';

    var toggleSort = h(function () { set({ sortOpen: !S.sortOpen, statusOpen: false, filterOpen: false, typeOpen: false }); });
    var closeSort = h(function () { set({ sortOpen: false }); });
    var sortPopup = !S.sortOpen ? '' :
      '<div data-h="' + closeSort + '" style="position:fixed;inset:0;z-index:25"></div>' +
      '<div role="listbox" aria-label="Sort by" style="position:absolute;right:0;top:40px;z-index:30;width:200px;box-sizing:border-box;padding:6px;background:#fff;border-radius:10px;box-shadow:0 12px 28px rgba(1,29,50,.18),inset 0 0 0 1px #E9ECEF;display:flex;flex-direction:column;gap:2px">' +
        '<span style="padding:4px 8px 6px;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#8A94A3">SORT BY</span>' +
        SORTS.map(function (o) {
          var on = S.sort === o[0];
          var pick = h(function () { toTop = true; set({ sort: o[0], page: 0, sortOpen: false }); });
          return '<button type="button" role="option" class="h-opt" aria-selected="' + on + '" data-h="' + pick + '" style="height:30px;border:none;border-radius:6px;padding:0 8px;display:flex;align-items:center;gap:8px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:' + (on ? 700 : 500) + ';color:#0B1B2B;text-align:left;background:' + (on ? '#E6F5EF' : 'transparent') + '"><span style="flex:1">' + o[1] + '</span><span style="display:grid;place-items:center;color:#0E7F5E">' + (on ? I.check : '') + '</span></button>';
        }).join('') +
      '</div>';

    var setGrid = h(function () { set({ view: 'grid' }); }), setList = h(function () { set({ view: 'list' }); });
    var setQuery = h(function (e) { set({ query: e.target.value, page: 0 }); });
    var toggleFilter = h(function () { set({ filterOpen: !S.filterOpen, sortOpen: false, statusOpen: false, typeOpen: false }); });
    var clearAll = h(function () { set({ status: 'all', query: '', applied: copyF(DEF), d: copyF(DEF), page: 0 }); });
    var viewBtn = function (on, hid, label, title, icon) {
      return '<button type="button" data-h="' + hid + '" aria-label="' + label + '" aria-pressed="' + on + '" title="' + title + '" style="width:28px;height:28px;border:none;border-radius:7px;padding:0;display:grid;place-items:center;cursor:pointer;background:' + (on ? GRAD : 'transparent') + ';color:' + (on ? '#fff' : '#3D4A5C') + '">' + icon + '</button>';
    };
    var goPage = function (i) { return h(function () { toTop = true; set({ page: i }); }); };

    /* IT-0040 (preview): toolbar order, left to right. Left, next to the page title and its info icon:
       Status ▾. Right, after the global search: Filter · Sort · Grid/List, then the shell's bell and
       avatar. Same components as before (32px, 8px apart); only their place and order changed. In the
       shell they go into two slots (#vgv-header-slot-left / -right, Grid View only); opened on its own,
       the page shows Status on the left and the other three on the right, above the cards. */
    var statusCtl =
        '<div style="position:relative;flex-shrink:0">' +
          '<button type="button" data-h="' + toggleStatus + '" aria-label="Vehicle status: ' + cur.label + ' (' + cur.n + ')" aria-haspopup="listbox" aria-expanded="' + S.statusOpen + '" style="height:32px;box-sizing:border-box;border:none;border-radius:9px;padding:0 8px 0 10px;background:#fff;box-shadow:inset 0 0 0 1.5px ' + (S.statusOpen ? '#03AD86' : '#E3E6EA') + ';display:flex;align-items:center;gap:6px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700;color:#0B1B2B;white-space:nowrap">' +
            dotHtml(cur) + cur.label + countPill(cur) +
            '<span style="display:grid;place-items:center;color:#6B7685;transform:' + (S.statusOpen ? 'rotate(180deg)' : 'none') + ';transition:transform .18s ease">' + I.chevDown + '</span>' +
          '</button>' +
          statusPopup +
        '</div>';
    var rightCtl =
        '<div style="position:relative;flex-shrink:0">' +
          '<button type="button" data-h="' + toggleFilter + '" aria-label="Vehicle filters" aria-expanded="' + isOpen + '" title="' + (activeCount ? activeCount + ' filter' + (activeCount > 1 ? 's' : '') + ' applied' : 'Vehicle filters') + '" style="width:44px;height:32px;box-sizing:border-box;border:none;border-radius:9px;padding:0;background:' + fb.bg + ';box-shadow:' + fb.shadow + ';color:' + fb.fg + ';display:flex;align-items:center;justify-content:center;gap:' + (activeCount ? '4px' : '0') + ';cursor:pointer;font-family:inherit">' + I.funnel +
            (activeCount ? '<span style="width:16px;height:16px;border-radius:999px;background:rgba(255,255,255,.22);font-size:11px;font-weight:700;line-height:16px;text-align:center;color:#fff">' + activeCount + '</span>' : '') +
          '</button>' +
        '</div>' +
        '<div style="position:relative;flex-shrink:0">' +
          '<button type="button" data-h="' + toggleSort + '" aria-label="Sort vehicles" aria-haspopup="listbox" aria-expanded="' + S.sortOpen + '" title="Sort: ' + sortLabel + '" style="width:32px;height:32px;box-sizing:border-box;border:none;border-radius:9px;padding:0;display:grid;place-items:center;cursor:pointer;background:' + (sortOn ? GRAD : '#fff') + ';box-shadow:' + (sortOn ? '0 0 0 1.5px #03AD86' : 'inset 0 0 0 1.5px #E3E6EA') + ';color:' + (sortOn ? '#fff' : '#3D4A5C') + '">' + I.sort13 + '</button>' +
          sortPopup +
        '</div>' +
        '<div role="group" aria-label="Layout" style="flex-shrink:0;height:32px;box-sizing:border-box;display:flex;gap:2px;padding:2px;border-radius:9px;background:#fff;box-shadow:inset 0 0 0 1.5px #E3E6EA">' +
          viewBtn(S.view === 'grid', setGrid, 'Grid', 'Grid view', I.grid) + viewBtn(S.view === 'list', setList, 'List', 'List view', I.list) +
        '</div>';
    var controls =
      '<section aria-label="Status filter and view" style="position:relative;height:32px;flex-shrink:0;display:flex;align-items:center;gap:8px;z-index:20">' +
        statusCtl + '<div style="flex:1"></div>' + rightCtl +
      '</section>';
    var host = headerSlots();
    var html =
      '<main style="height:100vh;box-sizing:border-box;padding:8px;display:flex;gap:8px;overflow:hidden">' +
      '<div style="position:relative;flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:8px">' +

      (host ? '' : controls) +

      /* vehicles panel (+ filter overlay spanning its full height on the right) */
      '<div style="position:relative;flex:1;min-height:0;display:flex">' +
      '<section aria-label="Vehicles" style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:8px">' +
        '<div class="vgv-scroll" data-sk="grid" style="flex:1;min-height:0;overflow-y:auto;margin:-3px -8px -3px -3px;padding:3px 8px 3px 3px">' +
          (!list.length ? '<div style="padding:48px 16px;text-align:center;color:#6B7685;font-size:13px">No vehicles match these filters. <button type="button" data-h="' + clearAll + '" style="border:none;background:transparent;color:#0E7F5E;font-family:inherit;font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer">Clear filters</button></div>' : '') +
          (S.view === 'grid' && list.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(380px, 1fr));gap:8px;align-items:start;padding:0">' + rows.map(cardHtml).join('') + '</div>' : '') +
          (S.view === 'list' && list.length ? listHtml(rows) : '') +
        '</div>' +
        (list.length ?
          '<nav aria-label="Pagination" style="flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:4px;padding:0;height:22px">' +
            '<span style="font-size:11.5px;color:#6B7685;margin-right:8px">Showing ' + (page * PAGE + 1) + '–' + Math.min(list.length, (page + 1) * PAGE) + ' of ' + list.length + '</span>' +
            '<button type="button" data-h="' + goPage(Math.max(0, page - 1)) + '" aria-label="Previous page"' + (page === 0 ? ' disabled' : '') + ' style="width:22px;height:22px;border:none;border-radius:6px;background:#fff;box-shadow:inset 0 0 0 1px #E3E6EA;color:#3D4A5C;display:grid;place-items:center;cursor:pointer;padding:0">' + I.chev13L + '</button>' +
            Array.apply(null, { length: pageCount }).map(function (_, i) {
              var cur = i === page;
              return '<button type="button" data-h="' + goPage(i) + '" aria-current="' + (cur ? 'page' : 'false') + '" style="min-width:22px;height:22px;border:none;border-radius:6px;padding:0 5px;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:700;background:' + (cur ? GRAD : '#fff') + ';box-shadow:' + (cur ? 'none' : 'inset 0 0 0 1px #E3E6EA') + ';color:' + (cur ? '#fff' : '#3D4A5C') + '">' + (i + 1) + '</button>';
            }).join('') +
            '<button type="button" data-h="' + goPage(Math.min(pageCount - 1, page + 1)) + '" aria-label="Next page"' + (page >= pageCount - 1 ? ' disabled' : '') + ' style="width:22px;height:22px;border:none;border-radius:6px;background:#fff;box-shadow:inset 0 0 0 1px #E3E6EA;color:#3D4A5C;display:grid;place-items:center;cursor:pointer;padding:0">' + I.chev13R + '</button>' +
          '</nav>' : '') +
      '</section>' +
      (isOpen ? filterPanelHtml(activeCount) : '') +
      '</div>' +
      '</div></main>' +
      (S.toast ? '<div role="status" style="position:fixed;left:50%;bottom:20px;transform:translateX(-50%);animation:vgvToast .2s ease-out;z-index:50;padding:10px 14px;border-radius:10px;background:#0B1B2B;color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 24px rgba(1,29,50,.25)">' + esc(S.toast) + '</div>' : '');

    /* keep focus, caret and scroll positions across re-renders */
    var ae = document.activeElement, fk = ae && ae.getAttribute && ae.getAttribute('data-fk');
    var caret = fk ? [ae.selectionStart, ae.selectionEnd] : null;
    var scroll = {};
    root.querySelectorAll('[data-sk]').forEach(function (el) { scroll[el.getAttribute('data-sk')] = [el.scrollTop, el.scrollLeft]; });

    root.innerHTML = html;
    if (host) {
      host.left.innerHTML = '<section aria-label="Status filter" style="position:relative;display:flex;align-items:center;z-index:20">' + statusCtl + '</section>';
      host.right.innerHTML = '<section aria-label="View controls" style="position:relative;display:flex;align-items:center;gap:8px;z-index:20">' + rightCtl + '</section>';
    }

    root.querySelectorAll('[data-sk]').forEach(function (el) {
      var k = el.getAttribute('data-sk'), s = scroll[k];
      if (k === 'grid' && toTop) { el.scrollTop = 0; return; }
      if (s) { el.scrollTop = s[0]; el.scrollLeft = s[1]; }
    });
    toTop = false; justFlipped = null;
    if (fk) {
      var el = root.querySelector('[data-fk="' + fk + '"]');
      if (el) { el.focus(); try { el.setSelectionRange(caret[0], caret[1]); } catch (e) {} }
    }
  }


  /* ---------- header slots (IT-0040) ----------
     The shell (DesignPage, Grid View only) puts two empty slots in its header row:
     #vgv-header-slot-left after the page title and info icon, #vgv-header-slot-right inside the
     header tools between the global search and the bell. This page renders its controls into them
     (same origin), wires their events and empties them when the page goes away. Without the slots
     (page opened on its own) the controls stay on the page. */
  var SLOT_CSS = '[id^="vgv-header-slot"] .h-opt:hover{background:#F2F4F6!important}' +
    '[id^="vgv-header-slot"] :where(button):focus-visible{outline:2px solid #03AD86;outline-offset:2px}';
  function headerSlots() {
    try {
      if (window.parent === window) return null;
      var pd = window.parent.document;
      var left = pd.getElementById('vgv-header-slot-left'), right = pd.getElementById('vgv-header-slot-right');
      if (!left || !right) return null;
      if (!left.__vgv) {
        left.__vgv = right.__vgv = true;
        left.addEventListener('click', onClick);
        right.addEventListener('click', onClick);
        pd.addEventListener('keydown', onKey);
        /* a click anywhere else in the shell closes the filter panel, as a click outside it does here */
        pd.addEventListener('mousedown', function (e) { if (S.filterOpen && !left.contains(e.target) && !right.contains(e.target) && e.target.tagName !== 'IFRAME') set({ filterOpen: false, typeOpen: false }); });
        if (!pd.getElementById('vgv-header-slot-css')) {
          var st = pd.createElement('style'); st.id = 'vgv-header-slot-css'; st.textContent = SLOT_CSS; pd.head.appendChild(st);
        }
        window.addEventListener('pagehide', function () { left.innerHTML = ''; right.innerHTML = ''; });
      }
      return { left: left, right: right };
    } catch (e) { return null; }
  }
  /* the shell may add the slots just after this page has loaded */
  [150, 600, 1500].forEach(function (ms) { setTimeout(function () { var s = headerSlots(); if (s && !s.left.firstChild) render(); }, ms); });

  /* ---------- events (delegated) ---------- */
  function onClick(e) {
    var el = e.target.closest('[data-h]');
    if (!el || el.disabled) return;
    var fn = H[+el.getAttribute('data-h')];
    if (fn) fn(e);
  }
  function onKey(e) {
    if (e.key === 'Escape' && (S.filterOpen || S.sortOpen || S.statusOpen)) set({ filterOpen: false, sortOpen: false, statusOpen: false, typeOpen: false });
  }
  root.addEventListener('click', onClick);
  root.addEventListener('input', function (e) {
    var el = e.target; if (el.tagName !== 'INPUT' || !el.hasAttribute('data-c')) return;
    var fn = H[+el.getAttribute('data-c')]; if (fn) fn(e);
  });
  root.addEventListener('change', function (e) {
    var el = e.target; if (el.tagName !== 'SELECT' || !el.hasAttribute('data-c')) return;
    var fn = H[+el.getAttribute('data-c')]; if (fn) fn(e);
  });
  window.addEventListener('keydown', onKey);

  render();
})();
