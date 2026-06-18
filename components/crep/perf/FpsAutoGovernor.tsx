"use client";

import { useEffect, useRef } from "react";

/**
 * FPS auto-governor — keeps the Earth Simulator above a usable frame rate by progressively
 * shedding the HEAVIEST non-essential layers when the user's live FPS stays below target, then
 * restoring them when it recovers.
 *
 * Why this exists: on desktop the map runs near-uncapped, so with everything on (measured 3 fps /
 * 338 ms-per-frame) the frame rate collapses. A differential showed the ~6,500 animated movers are
 * ~125 ms/frame (~37%); the rest is the aggregate of 144 enabled layers (especially the ~100
 * off-view regional infra packs) + DOM markers. So no single asset is "the" killer — it's having
 * everything on — and the fix is to shed load progressively until the frame rate is usable.
 *
 * Shed order (heaviest / least-essential first): satellites → vessels → aircraft → off-view
 * regional infra packs → dense global infrastructure. Restored in reverse on recovery.
 *
 * HARD RULE: it NEVER touches fungal / nature / observation / device / emergency / weather data —
 * the PROTECTED guard excludes those ids at every level.
 *
 * Safety: ignores backgrounded tabs (document.hidden + throttled frameMs) so it never sheds while
 * you're away; hysteresis (shed < LOW, restore > RECOVER, with sample streaks) avoids flapping; it
 * only ever restores layers IT disabled, so it never fights a layer you toggled yourself.
 */

// Never shed these — fungal/nature/observation + Mycosoft devices + emergency/weather safety layers.
const PROTECTED = /fungi|fungal|biodiversity|mycel|myco|nature|observ|spore|weatherradar|stormlightning|emergenc|sporebase|smartfence/i;

// Heaviest / least-essential → lightest. One step shed per sustained-low window; restored in reverse.
const SHED_ORDER: Array<{ label: string; match: (id: string) => boolean }> = [
  { label: "satellites",           match: (id) => id === "satellites" },                                   // ~1,130 sats + 376 orbit ribbons
  { label: "vessels",              match: (id) => id === "ships" },                                        // ~2,500 AIS vessels
  { label: "aircraft",             match: (id) => id === "aviation" },                                     // ~2,500 aircraft
  { label: "regional infra packs", match: (id) => /^(oyster|mojave|nyc|dc|vegas|sdtj|project)/.test(id) }, // off-view city/region detail packs (~100 layers)
  { label: "dense global infra",   match: (id) => /^(txLines|submarineCables|cellTowersG|dataCentersG|powerPlantsG|substations|radioStations)/.test(id) },
];

const LOW = 26;       // sustained below this → shed a step (target floor is 30)
const RECOVER = 44;   // sustained above this → restore a step (gap from LOW avoids flapping)
const CHECK_MS = 2000;

type LayerState = { id: string; enabled: boolean };

export default function FpsAutoGovernor() {
  const level = useRef(0);                  // how many shed steps are currently applied
  const shedByUs = useRef<string[][]>([]);  // exact ids WE disabled, per level (only restore these)
  const lowStreak = useRef(0);
  const highStreak = useRef(0);

  useEffect(() => {
    const w = window as unknown as {
      __crep_fps?: { fps?: number; frameMs?: number };
      __crep_setLayer?: (id: string, on?: boolean) => unknown;
      __crep_layers?: () => LayerState[];
    };
    const setLayer = (id: string, on: boolean) => { try { w.__crep_setLayer?.(id, on); } catch { /* */ } };
    const layerState = () => { try { return w.__crep_layers?.() ?? []; } catch { return []; } };

    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return; // never shed a backgrounded tab
      const f = w.__crep_fps;
      const fps = typeof f?.fps === "number" ? f.fps : null;
      const frameMs = typeof f?.frameMs === "number" ? f.frameMs : null;
      if (fps == null || frameMs == null || frameMs > 1500) return;   // throttled/idle tab — skip

      if (fps < LOW) { lowStreak.current++; highStreak.current = 0; }
      else if (fps > RECOVER) { highStreak.current++; lowStreak.current = 0; }
      else { lowStreak.current = 0; highStreak.current = 0; }

      // Shed the next-heaviest group after 2 consecutive low samples.
      if (lowStreak.current >= 2 && level.current < SHED_ORDER.length) {
        const step = SHED_ORDER[level.current];
        const shed: string[] = [];
        for (const l of layerState()) {
          if (l.enabled && !PROTECTED.test(l.id) && step.match(l.id)) { setLayer(l.id, false); shed.push(l.id); }
        }
        shedByUs.current[level.current] = shed;
        level.current++;
        lowStreak.current = 0;
        // eslint-disable-next-line no-console
        console.log(`[FPS-Governor] ${Math.round(fps)} fps < ${LOW} → shed ${shed.length} layer(s): ${step.label} (level ${level.current})`);
      }

      // Restore one group after 3 consecutive healthy samples.
      if (highStreak.current >= 3 && level.current > 0) {
        level.current--;
        const shed = shedByUs.current[level.current] || [];
        for (const id of shed) setLayer(id, true);
        shedByUs.current[level.current] = [];
        highStreak.current = 0;
        // eslint-disable-next-line no-console
        console.log(`[FPS-Governor] ${Math.round(fps)} fps recovered → restore ${shed.length} layer(s): ${SHED_ORDER[level.current].label} (level ${level.current})`);
      }
    };

    const iv = window.setInterval(tick, CHECK_MS);
    return () => window.clearInterval(iv);
  }, []);

  return null;
}
