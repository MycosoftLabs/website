import { DevicesCommandCenter } from '@/components/devices/devices-command-center';
import { getDevicesSnapshot } from '@/lib/devices/data';

export const dynamic = 'force-dynamic';

export default async function DevicesPage() {
  const snapshot = await getDevicesSnapshot();
  return <DevicesCommandCenter initialSnapshot={snapshot} />;
}
