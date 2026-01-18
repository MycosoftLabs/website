import type { DevicesSnapshot } from './types';
import { mockDevicesSnapshot } from './mock';

/**
 * Server-side loader for the Devices page.
 *
 * Plug this into your real backend by setting:
 *   - NATUREOS_DEVICES_ENDPOINT (e.g. http://localhost:3000/api/devices/snapshot)
 */
export async function getDevicesSnapshot(): Promise<DevicesSnapshot> {
  const endpoint = process.env.NATUREOS_DEVICES_ENDPOINT;
  if (!endpoint) {
    return { ...mockDevicesSnapshot, generatedAt: new Date().toISOString() };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      // keep the command center real-time-ish; adjust if you prefer caching
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
      },
    });

    if (!res.ok) {
      return {
        ...mockDevicesSnapshot,
        source: 'mock',
        generatedAt: new Date().toISOString(),
      };
    }

    const json = (await res.json()) as DevicesSnapshot;

    // Minimal sanity checks
    if (!json || !Array.isArray((json as any).devices)) {
      return {
        ...mockDevicesSnapshot,
        source: 'mock',
        generatedAt: new Date().toISOString(),
      };
    }

    return json;
  } catch {
    return {
      ...mockDevicesSnapshot,
      source: 'mock',
      generatedAt: new Date().toISOString(),
    };
  }
}
