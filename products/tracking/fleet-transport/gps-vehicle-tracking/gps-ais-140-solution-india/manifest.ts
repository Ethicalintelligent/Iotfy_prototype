// GPS AIS 140 Solution (India) (N009, Edition of GPS Vehicle Tracking). Everything the base has,
// plus panic buttons forwarded to ERSS and the vehicles' AIS 140 certificates.
import { lazy } from 'react';
import { defineProduct } from '@iotify/app-kit';
import { manifest as vehicle } from '..';

export const manifest = defineProduct({
  id: 'N009',
  extends: vehicle,
  add: {
    menu: [
      [
        'Operations',
        [
          ['panic', 'Panic & ERSS'],
          ['certs', 'Certificates'],
        ],
      ],
    ],
    icons: { panic: 'bell', certs: 'certs' },
    tables: {
      // Port of legacy xPage 'panic' (legacy/src/app.js ~999). Demo activity.
      panic: {
        title: 'Panic & ERSS',
        hint: 'AIS 140: panic buttons forwarded to the state emergency system (ERSS).',
        columns: ['Time', 'Vehicle', 'Source', 'Forwarded to ERSS', 'Status'],
        rows: 6,
        row: (c, i) => [
          c.d(i * 3) + ' ' + c.t(i * 5),
          c.a(i),
          'Panic button',
          '+Yes · ' + c.i(2, 9) + ' s',
          i === 0 ? '~Open' : '+Closed',
        ],
      },
    },
    screens: {
      certs: {
        title: 'Certificates',
        description:
          'AIS 140 certificates per vehicle. A vehicle can’t clear its fitness certificate (FC) until its certificate is issued. Your dealer issues and renews them.',
        component: lazy(() => import('./screens/CertificatesScreen')),
      },
    },
    alerts: ['!Panic button · forwarded to ERSS', '~AIS 140 certificate expires in 30 days'],
    reports: [['Panic & ERSS', 'Every panic alert and how fast ERSS received it']],
    rules: [['Panic button', 'Driver or passenger presses panic', 'ERSS + app + SMS']],
  },
});
