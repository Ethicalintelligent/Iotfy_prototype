// IT-0036. Manage, rebuilt in React from the owner's pages (Manage-Vehicle.html, removed in IT-0037 (git history),
// Manage-Device, -Operator, -SIM-Card, -User, -Alert-Configuration, -Geo-Configuration and
// -Geo-Association: one page with a module switcher, the reference). Same markup, class names,
// texts and behaviour. Data is read and saved in Neon through @iotify/data (see modules/source.ts
// and each module's file), instead of the page's built-in demo API.
import { useMemo, useState } from 'react';
import { useReloadData } from '@iotify/data';
import type { ScreenContext } from '@iotify/app-kit';
import { SmartTrackPage } from '../smart-track/kit';
import { EMPTY_LAYOUT, type GridLayout } from './grid/DataGrid';
import { ModulePicker, type ModuleChoice } from './grid/Toolbar';
import { buildModules } from './modules/defs';
import { ListModule } from './modules/ListModule';
import { useManageSource } from './modules/source';
import { trackerCatalogue } from './modules/deviceCatalogue';
import { BulkUploadButton } from './bulk/BulkUpload';
import { UserModule } from './user/UserModule';
import { GeoConfigModule } from './geo/GeoConfigModule';
import { GeoAssocModule } from './geo/GeoAssocModule';
import { AlertConfigModule } from './alerts/AlertConfigModule';
import { Toast } from './ui';
import './manage.css';

const EXTRA: ModuleChoice[] = [
  { id: 'user', label: 'User', icon: 'Users' },
  { id: 'geoconfig', label: 'Geo Configuration', icon: 'MapPinned' },
  { id: 'geoassoc', label: 'Geo Association', icon: 'Link' },
  { id: 'alertconfig', label: 'Alert Configuration', icon: 'Bell' },
];

export default function ManageScreen({ companyId, readOnly }: ScreenContext) {
  const reload = useReloadData();
  const refresh = () => void reload();
  const { source, catalogue, unassignDevice } = useManageSource(companyId, !!readOnly, refresh);
  // The tracker pane lists Neon's device models plus the original catalogue (with its ports).
  const modules = useMemo(
    () => buildModules({ catalogue: trackerCatalogue(catalogue), unassignDevice }),
    [catalogue, unassignDevice],
  );
  const [moduleId, setModuleId] = useState('vehicle');
  const [layouts, setLayouts] = useState<Record<string, GridLayout>>({});
  const [imported, setImported] = useState<string | null>(null);
  const choices = useMemo(
    () => [...modules.map((m) => ({ id: m.id, label: m.label, icon: m.icon })), ...EXTRA],
    [modules],
  );
  const picker = <ModulePicker modules={choices} value={moduleId} onChange={setModuleId} />;
  const gridProps = {
    layout: layouts[moduleId] ?? EMPTY_LAYOUT,
    onLayout: (l: GridLayout) => setLayouts((all) => ({ ...all, [moduleId]: l })),
  };
  const onImported = (n: number, noun: string) => {
    const t = `${n} ${noun}${n === 1 ? '' : 's'} imported.`;
    setImported(t);
    setTimeout(() => setImported((x) => (x === t ? null : x)), 3500);
  };

  let body;
  if (moduleId === 'user')
    body = (
      <UserModule
        key="user"
        companyId={companyId}
        readOnly={!!readOnly}
        picker={picker}
        {...gridProps}
      />
    );
  else if (moduleId === 'geoconfig')
    body = (
      <GeoConfigModule
        key="geoconfig"
        companyId={companyId}
        readOnly={!!readOnly}
        picker={picker}
        {...gridProps}
      />
    );
  else if (moduleId === 'geoassoc')
    body = (
      <GeoAssocModule
        key="geoassoc"
        companyId={companyId}
        readOnly={!!readOnly}
        picker={picker}
        {...gridProps}
      />
    );
  else if (moduleId === 'alertconfig')
    body = (
      <AlertConfigModule
        key="alertconfig"
        companyId={companyId}
        readOnly={!!readOnly}
        picker={picker}
        {...gridProps}
      />
    );
  else
    body = (
      <ListModule
        key={moduleId}
        modules={modules}
        moduleId={moduleId}
        source={source}
        picker={picker}
        upload={
          readOnly ? undefined : (
            <BulkUploadButton
              module={moduleId}
              companyId={companyId}
              source={source}
              onDone={onImported}
            />
          )
        }
        {...gridProps}
      />
    );

  return (
    <SmartTrackPage scope="st-manage">
      {body}
      {imported && <Toast>{imported}</Toast>}
    </SmartTrackPage>
  );
}
