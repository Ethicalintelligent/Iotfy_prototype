// GPS ATM Tracking (N020, Edition of GPS Asset Tracking). Everything GPS Asset Tracking has, plus
// ATM sites and movement events, an ATM map and its own dashboard.
import { defineProduct } from '@iotify/app-kit';
import { manifest as asset } from '..';
import { atmTrackingSpec as atm } from './spec';

export const manifest = defineProduct({
  id: 'N020',
  scene: 'atmtrack',
  extends: asset,
  add: {
    menu: [
      ['Monitor', [['map', 'ATM map']]],
      ['ATMs', atm.menu.find(([h]) => h === 'ATMs')![1]],
    ],
    tables: atm.tables,
    kpis: atm.kpis,
    chart: atm.chart,
    alerts: atm.alerts,
    reports: atm.reports,
  },
});
