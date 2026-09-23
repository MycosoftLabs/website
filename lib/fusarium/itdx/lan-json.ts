import http from "node:http"
import https from "node:https"
import { URL } from "node:url"

export interface LanJsonResult {
  ok: boolean
  status: number | null
  ms: number
  body: Record<string, unknown> | null
  error: string | null
}

/**
 * LAN GET that bypasses Next's patched fetch (which has aborted/hung
 * 192.168.0.x probes during compile). Inventory only — no model pulls.
 */
export function getLanJson(url: string, timeoutMs: number, init?: { method?: string; body?: string }): Promise<LanJsonResult> {
  const started = Date.now()
  return new Promise((resolve) => {
    let settled = false
    const finish = (result: Omit<LanJsonResult, "ms">) => {
      if (settled) return
      settled = true
      resolve({ ...result, ms: Date.now() - started })
    }
    try {
      const target = new URL(url)
      const lib = target.protocol === "https:" ? https : http
      const req = lib.request(
        {
          hostname: target.hostname,
          port: target.port || (target.protocol === "https:" ? 443 : 80),
          path: `${target.pathname}${target.search}`,
          method: init?.method || "GET",
          timeout: timeoutMs,
          headers: init?.body ? { "Content-Type": "application/json" } : undefined,
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8")
            let body: Record<string, unknown> | null = null
            try {
              body = text ? (JSON.parse(text) as Record<string, unknown>) : null
            } catch {
              body = null
            }
            const status = res.statusCode ?? null
            finish({
              ok: status !== null && status >= 200 && status < 300,
              status,
              body,
              error: null,
            })
          })
        },
      )
      req.on("timeout", () => {
        req.destroy()
        finish({ ok: false, status: null, body: null, error: "timeout" })
      })
      req.on("error", (error) => {
        finish({ ok: false, status: null, body: null, error: error.name || "probe_failed" })
      })
      if (init?.body) req.write(init.body)
      req.end()
    } catch (error) {
      finish({
        ok: false,
        status: null,
        body: null,
        error: error instanceof Error ? error.name : "probe_failed",
      })
    }
  })
}
