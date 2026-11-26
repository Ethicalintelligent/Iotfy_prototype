// The test fixtures (and the legacy app they are compared with) describe the data with the
// prototype's old tables: companies, assets, device_units, device_models (text ids). Since IT-0040
// these rows live in core.company, core.tracked_asset, core.device and core.device_model, and devices
// fitted to an asset are ACTIVE instead of Installed. This turns an old-shape fixture into the input
// createRules() takes now. Text ids are kept: the rules turn every id into text anyway.
import type { CoreDataInput } from '../src';

type Rows = Record<string, unknown>[];

export function fromOldShape(old: Record<string, unknown>): CoreDataInput {
  const {
    companies,
    assets,
    device_units,
    device_models,
    ...rest
  } = old as Record<string, Rows | undefined>;
  return {
    ...rest,
    company: companies ?? [],
    tracked_asset: assets ?? [],
    device_model: device_models ?? [],
    device: (device_units ?? []).map(({ device_model_id, status, ...u }) => ({
      ...u,
      model_id: device_model_id,
      status: status === 'Installed' ? 'ACTIVE' : status,
    })),
  } as unknown as CoreDataInput;
}

/** A fixture row in the old shape (text ids, any column). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OldRow = { id: string } & Record<string, any>;
/** A whole fixture in the old shape: table name → rows. */
export type OldData = Record<string, OldRow[]>;
