"use client";

/**
 * Ensures the GCS has an admin session so commands actually authenticate.
 *
 * The command BFF (`/api/devices/[id]/command`) requires admin auth — without it EVERY command
 * 401s and the ledger silently marks them "failed" (telemetry still works because reads are open,
 * producing the classic "telemetry live, controls dead" trap). This hook closes that gap:
 *   1. If a real login session already exists, use it.
 *   2. Otherwise mint the local-dev admin cookie (POST /api/auth/local-dev-session) — which is
 *      itself gated server-side to NODE_ENV=development + localhost/RFC1918, so it 404s (no-op)
 *      anywhere else. On the bench PC / iPad-over-LAN this makes commands just work.
 *
 * Exposes `authed` so the Safety strip can show a loud CONTROLS-LOCKED state instead of failing
 * commands silently.
 */

import { useEffect, useState } from "react";

export interface ControlSession {
  authed: boolean;
  checking: boolean;
  method: "login" | "local-dev" | null;
  error: string | null;
}

export function useControlSession(): ControlSession {
  const [state, setState] = useState<ControlSession>({ authed: false, checking: true, method: null, error: null });

  useEffect(() => {
    let cancelled = false;
    const set = (s: ControlSession) => { if (!cancelled) setState(s); };
    (async () => {
      try {
        // 1. Already authenticated (real Supabase/login session)?
        const s = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
          .then((r) => r.json())
          .catch(() => null);
        if (s?.ok && s?.user) { set({ authed: true, checking: false, method: "login", error: null }); return; }

        // 2. Mint the local-dev admin session (dev + localhost/LAN only; 404 elsewhere).
        const r = await fetch("/api/auth/local-dev-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({}),
        });
        if (r.ok) { set({ authed: true, checking: false, method: "local-dev", error: null }); return; }
        set({
          authed: false,
          checking: false,
          method: null,
          error: r.status === 404
            ? "No session: open the GCS on the dev PC (localhost) or over WiFi (192.168.x), or log in."
            : `Auth failed (HTTP ${r.status}) — commands will be rejected.`,
        });
      } catch (e) {
        set({ authed: false, checking: false, method: null, error: `Auth check failed: ${(e as Error).message}` });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}
