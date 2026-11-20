// HealthSafe (N052, Package). Composes Indoor People Tracking and Indoor Asset Tracking (badges and
// equipment tags on the wards) and adds the hospital screens: nurse calls, staff location,
// equipment and hand hygiene, a ward view and its own dashboard.
import { defineProduct } from '@iotify/app-kit';
import { manifest as people } from '../../tracking/people-tracking/indoor-people-tracking';
import { manifest as indoorAsset } from '../../tracking/asset-tracking/indoor-asset-tracking';
import { healthSpec as health } from './spec';

export const manifest = defineProduct({
  id: 'N052',
  scene: 'health',
  members: [people, indoorAsset],
  add: {
    menu: [
      ['Monitor', [['floor', 'Ward view']]],
      ['Care', health.menu.find(([h]) => h === 'Care')![1]],
    ],
    tables: health.tables,
    kpis: health.kpis,
    chart: health.chart,
    alerts: health.alerts,
    reports: health.reports,
  },
});
