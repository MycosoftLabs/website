/**
 * Blob Worker: steps simulation via same-origin REST so the main thread stays responsive.
 * Pass `origin` (window.location.origin) — blob workers need absolute URLs for fetch.
 * Date: May 02, 2026
 */

export interface StepMessage {
  type: "step"
  origin: string
  n?: number
}

export function createPetriRestWorker(): Worker {
  const src = `
    self.onmessage = async (e) => {
      const msg = e.data || {};
      if (msg.type !== "step") return;
      const origin = msg.origin || "";
      const n = Math.min(3600, Math.max(1, Number(msg.n) || 1));
      try {
        const r = await fetch(origin + "/api/simulation/petri/v2/step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ n }),
        });
        const text = await r.text();
        postMessage({ type: "snapshot", ok: r.ok, status: r.status, body: text });
      } catch (err) {
        postMessage({ type: "error", message: String(err) });
      }
    };
  `
  const blob = new Blob([src], { type: "application/javascript" })
  const url = URL.createObjectURL(blob)
  return new Worker(url, { type: "classic" })
}
