// Manage > Sim (approved design). Being built (IT-0012).
import { Stack } from '@iotify/ui';
import NextStep from '../../NextStep';
import { ManageToolbar } from '../ManageToolbar';
import type { ModuleProps } from '../modules';

export default function SimModule({ picker }: ModuleProps) {
  return (
    <Stack dir="col" gap={12} align="stretch">
      <ManageToolbar picker={picker} />
      <NextStep />
    </Stack>
  );
}
