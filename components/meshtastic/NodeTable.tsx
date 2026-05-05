"use client"

import { Button } from "@/components/ui/button"
import { useMeshtasticNodes } from "@/hooks/use-meshtastic-nodes"

export function NodeTable() {
  const { nodes: rows, error, isLoading, isValidating, mutate } = useMeshtasticNodes()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-[44px] touch-manipulation"
          onClick={() => void mutate()}
        >
          Refresh
        </Button>
        {isLoading && rows.length === 0 ? (
          <span className="text-sm text-muted-foreground">Loading…</span>
        ) : null}
        {isValidating && rows.length > 0 ? (
          <span className="text-sm text-muted-foreground">Updating…</span>
        ) : null}
        {error ? (
          <span className="text-sm text-amber-600" role="alert">
            {error}
            {isValidating ? " — retrying…" : ""}
          </span>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="p-3 font-medium">Node</th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">HW</th>
              <th className="p-3 font-medium">Region</th>
              <th className="p-3 font-medium">Bat%</th>
              <th className="p-3 font-medium">Ch util</th>
              <th className="p-3 font-medium">Modem</th>
              <th className="p-3 font-medium">FW</th>
              <th className="p-3 font-medium">Observer</th>
              <th className="p-3 font-medium">Last heard</th>
              <th className="p-3 font-medium">Lat</th>
              <th className="p-3 font-medium">Lon</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={13} className="p-6 text-muted-foreground">
                  No rows yet — data comes from MAS → MINDEX when the MQTT bridge (or other ingest) is running.
                </td>
              </tr>
            ) : rows.length === 0 && isLoading ? (
              <tr>
                <td colSpan={13} className="p-6 text-muted-foreground">
                  Loading registry…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.node_id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 font-mono text-xs">{r.node_id}</td>
                  <td className="p-3">{r.long_name || r.short_name || "—"}</td>
                  <td className="p-3 text-xs">{r.role || "—"}</td>
                  <td className="p-3 text-muted-foreground text-xs">{r.hw_model || "—"}</td>
                  <td className="p-3">{r.region || "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.battery_pct != null ? r.battery_pct.toFixed(0) : "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.channel_util != null ? r.channel_util.toFixed(2) : "—"}</td>
                  <td className="p-3 text-xs">{r.modem_preset || "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.firmware || "—"}</td>
                  <td className="p-3">{r.is_observer === true ? "yes" : r.is_observer === false ? "no" : "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.last_heard_at || "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.lat ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.lon ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
