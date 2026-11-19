// @iotify/ui: the only UI import allowed in products.
// Before building any UI, check CATALOGUE.md.
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

// 1) EIT UI library first. Not linked yet: see ./eit.ts for how to link it.
export * from './eit';

// 2) IoTIFY pieces. When the EIT library gains a component with the same name,
//    delete the local one here (two exports with one name would clash).
export { ICONS, type IconName } from './icons';
export * from './components/basics';
export * from './components/fields';
export * from './components/Table';
export * from './components/overlays';
export * from './components/layout';
export * from './components/entry';
export * from './components/AssetMap';
