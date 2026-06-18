"use client";

import { useEffect, useRef } from "react";

/**
 * FPS auto-governor — keeps the Earth Simulator above a usable frame rate by progressively
 * shedding the HEAVIEST non-essential layers when the user's live FPS stays below target, then
 * restoring them when it recovers.
 *
 * Why this exists: on desktop the map runs near-uncapped, so with everything on (~6,500 animated
 * movers — satellites + orbit ribbons, vessels, aircraft — plus 200+ map layers) the frame rate
 * can collapse to single digits. This sheds load automatically so the map never stays unusable.
 *
 * HARD RULE: it NEVER touches fungal / nature / observation / emergency data — only the heavy
 * "background" movers and dense global infrastructure, in a fixed order.
 *
 * Safety:
 *   • Only acts on a genuinely-rendering-but-slow map. A backgrounded/again-focused tab throttles
 *     rAF (frameMs balloons), which we ignore so we don't shed while you're on another tab.
 *   • Hysteresis (shed below LOW, restore above RECOVER, with consecutive-sample streaks) prevents
 *     flapping.
 *   • Only restores layers IT turned off — never fights a layer you toggled yourself.
 */

// Heaviest / least-essential → lightest. One step shed per sustained-low window; restored in reverse.
const SHED_ORDER: string[][] = [
  ["satellites"],                                                       // ~1,130 sats + 376 orbit ribbons re-animated every frame
  ["ships"],                                                            // ~2,500 AIS vessels
  ["aviation"],                                                         // ~2,500 aircraft
  ["txLinesFull", "txLinesGlobal", "submarineCables", "cellTowersG", "dataCentersG"], // dense global infra
];

const LOW = 26;       // sustained below this → shed a step (target floor is 30)
const RECOVER = 44;   // sustained above this → restore a step (gap from LOW avoids flapping)
const CHECK_MS = 2000;

type LayerState = { id: string; enabled: boolean };

export default function FpsAutoGovernor() {
  const level = useRef(0);                       // how many shed steps are currently applied
  const shedByUs = useRef<Set<string>>(new Set()); // layers WE disabled (only restore these)
  const lowStreak = useRef(0);
  const highStreak = useRef(0);

  useEffect(() => {
    const w = window as unknown as {
      __crep_fps?: { fps?: number; frameMs?: number };
      __crep_setLayer?: (id: string, on?: boolean) => unknown;
      __crep_layers?: () => LayerState[];
    };
    const setLayer = (id: string, on: boolean) => { try { w.__crep_setLayer?.(id, on); } catch { /* */ } };
    const layerState = () => { try { return w.__crep_layers?.(); } catch { return undefined; } };

    const tick = () => {
      const f = w.__crep_fps;
      const fps = typeof f?.fps === "number" ? f.fps : null;
      const frameMs = typeof f?.frameMs === "number" ? f.frameMs : null;
      // Ignore backgrounded / throttled tabs (rAF clamped → frameMs balloons). Only act on a
      // map that is actually rendering but slow.
      if (fps == null || frameMs == null || frameMs > 1500) return;

      if (fps < LOW) { lowStreak.current++; highStreak.current = 0; }
      else if (fps > RECOVER) { highStreak.current++; lowStreak.current = 0; }
      else { lowStreak.current = 0; highStreak.current = 0; }

      // Shed the next-heaviest group after 2 consecutive low samples.
      if (lowStreak.current >= 2 && level.current < SHED_ORDER.length) {
        const group = SHED_ORDER[level.current];
        const st = layerState();
        for (const id of group) {
          const cur = st?.find((l) => l.id === id);
          if (!cur || cur.enabled) { setLayer(id, false); shedByUs.current.add(id); }
        }
        level.current++;
        lowStreak.current = 0;
        // eslint-disable-next-line no-console
        console.log(`[FPS-Governor] ${Math.round(fps)} fps < ${LOW} → shed [${group.join(", ")}] (level ${level.current})`);
      }

      // Restore one group after 3 consecutive healthy samples.
      if (highStreak.current >= 3 && level.current > 0) {
        level.current--;
        const group = SHED_ORDER[level.current];
        for (const id of group) {
          if (shedByUs.current.has(id)) { setLayer(id, true); shedByUs.current.delete(id); }
        }
        highStreak.current = 0;
        // eslint-disable-next-line no-console
        console.log(`[FPS-Governor] ${Math.round(fps)} fps recovered → restore [${group.join(", ")}] (level ${level.current})`);
      }
    };

    const iv = window.setInterval(tick, CHECK_MS);
    return () => window.clearInterval(iv);
  }, []);

  return null;
}
