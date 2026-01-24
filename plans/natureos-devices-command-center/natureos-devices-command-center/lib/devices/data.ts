import type { DevicesSnapshot } from './types';

/**
 * Server-side loader for the Devices page.
 *
 * Plug this into your real backend by setting:
 *   - NATUREOS_DEVICES_ENDPOINT (e.g. http://localhost:3000/api/devices/snapshot)
 */
export async function getDevicesSnapshot(): Promise<DevicesSnapshot> {
  const endpoint = process.env.NATUREOS_DEVICES_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      "NATUREOS_DEVICES_ENDPOINT is not set. Mock data has been removed; wire this to a real devices snapshot endpoint.",
    )
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
      throw new Error(`Devices snapshot fetch failed: ${res.status}`)
    }

    const json = (await res.json()) as DevicesSnapshot;

    // Minimal sanity checks
    if (!json || !Array.isArray((json as any).devices)) {
      throw new Error("Devices snapshot response invalid: missing devices array")
    }

    return json;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}
