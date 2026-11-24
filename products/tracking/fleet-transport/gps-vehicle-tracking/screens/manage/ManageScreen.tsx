// Manage (approved design, Desktop/vs/Manage-*.html): one screen, a "Manage Module" picker and the
// chosen module. The module is kept in the address (?module=device) so a link opens it.
import { Suspense, useState } from 'react';
import { Loading, MenuSelect } from '@iotify/ui';
import type { ScreenContext } from '@iotify/app-kit';
import { MODULES, type ModuleKey } from './modules';

const fromUrl = (): ModuleKey => {
  const m = new URLSearchParams(window.location.search).get('module');
  return (MODULES.find((x) => x.key === m)?.key ?? 'vehicle') as ModuleKey;
};

export default function ManageScreen(ctx: ScreenContext) {
  const [module, setModule] = useState<ModuleKey>(fromUrl);
  const choose = (m: ModuleKey) => {
    setModule(m);
    const url = new URL(window.location.href);
    url.searchParams.set('module', m);
    window.history.replaceState(window.history.state, '', url);
  };
  const current = MODULES.find((m) => m.key === module) ?? MODULES[0]!;
  const Module = current.component;
  const picker = (
    <MenuSelect
      label="Manage Module"
      value={module}
      onChange={choose}
      options={MODULES.map((m) => ({ value: m.key, label: m.label, icon: m.icon }))}
      width={240}
    />
  );
  return (
    <Suspense fallback={<Loading>Loading {current.label.toLowerCase()}…</Loading>}>
      <Module key={module} {...ctx} picker={picker} />
    </Suspense>
  );
}
