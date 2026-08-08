/**
 * Supabase Edge Function: Process Telemetry
 *
 * Processes incoming telemetry data from MycoBrain devices.
 *
 * Auth model:
 *  - `user`   → an end user (e.g. dashboard) submitting telemetry on behalf of a device they own
 *  - `secret` → a MycoBrain device or backend agent using a Supabase secret key (server-to-server)
 *
 * `withSupabase` handles:
 *  - JWT verification (asymmetric signing keys, JWKS)
 *  - Claims parsing
 *  - CORS (preflight + response headers)
 *  - User-scoped client (`ctx.supabase`, RLS-aware)
 *  - Admin client (`ctx.supabaseAdmin`, service role)
 *
 * Env (provided automatically on the Supabase platform):
 *   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEYS, SUPABASE_SECRET_KEYS, SUPABASE_JWKS
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "npm:@supabase/server@latest"

Deno.serve(
  withSupabase(
    {
      auth: ["user", "secret"],
      // Tighten this to known origins once we audit dashboard + device callers.
      cors: { origin: "*", methods: ["POST", "OPTIONS"] },
    },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 })
      }

      let payload: { device_id?: string; telemetry_data?: Record<string, unknown> }
      try {
        payload = await req.json()
      } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 })
      }

      const { device_id, telemetry_data } = payload
      if (!device_id) {
        return Response.json({ error: "device_id is required" }, { status: 400 })
      }

      // If a real user is calling, ensure they own this device. RLS on `devices`
      // should enforce this too, but failing fast here gives a cleaner error.
      if (ctx.authMode === "user") {
        const { data: device, error: ownerErr } = await ctx.supabase
          .from("devices")
          .select("id")
          .eq("id", device_id)
          .maybeSingle()

        if (ownerErr) {
          console.error("device ownership check failed:", ownerErr)
          return Response.json({ error: "Device lookup failed" }, { status: 500 })
        }
        if (!device) {
          return Response.json({ error: "Device not found or not accessible" }, { status: 403 })
        }
      }

      // Writes go through the admin client so telemetry inserts are not blocked
      // by user RLS, while reads above remain user-scoped.
      const now = new Date().toISOString()

      const { data, error } = await ctx.supabaseAdmin
        .from("telemetry")
        .insert({
          device_id,
          ...(telemetry_data ?? {}),
          timestamp: now,
        })
        .select("id")
        .single()

      if (error) {
        console.error("telemetry insert failed:", error)
        return Response.json({ error: error.message }, { status: 500 })
      }

      const { error: deviceUpdateErr } = await ctx.supabaseAdmin
        .from("devices")
        .update({ last_seen: now })
        .eq("id", device_id)

      if (deviceUpdateErr) {
        // Non-fatal: telemetry is recorded, last_seen is best-effort.
        console.warn("devices.last_seen update failed:", deviceUpdateErr)
      }

      return Response.json({
        success: true,
        telemetry_id: data.id,
        auth_mode: ctx.authMode,
      })
    },
  ),
)
