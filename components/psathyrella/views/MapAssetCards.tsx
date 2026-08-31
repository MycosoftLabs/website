"use client";

/**
 * MapAssetCards — Earth-Sim-parity asset info widgets for the isolated Psathyrella map.
 *
 * Two pure presentational cards, both rendered in MapZone OUTSIDE the memoized <MapView> so the
 * map subtree never reconciles on hover/select (freeze-safe):
 *   - MapAssetHoverCard  : a pointer-events-none tooltip that follows the cursor (every asset).
 *   - MapAssetDetailCard : a pinned card with a close button (click-selected non-device assets).
 *
 * Standalone reimplementation of the CREP MapAssetHoverPreview pattern — NO CREP/MYCA coupling.
 */

import { X, MapPin } from "lucide-react";
import type { MapAsset, MapAssetHover } from "@/lib/psathyrella/contract";

function fmtLatLon(lat: number | null, lon: number | null): string | null {
  if (lat == null || lon == null) return null;
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/** Cursor-following hover tooltip (pointer-events-none, viewport-clamped). */
export function MapAssetHoverCard({ hover }: { hover: MapAssetHover | null }) {
  if (!hover) return null;
  // Clamp so the 230px card never spills off the right/bottom edge.
  const left = Math.min(hover.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1920) - 246);
  const top = Math.min(hover.y + 14, (typeof window !== "undefined" ? window.innerHeight : 1080) - 130);
  const ll = fmtLatLon(hover.lat, hover.lon);
  return (
    <div
      className="psa-glass-strong pointer-events-none fixed z-[80] w-[230px] rounded-lg px-2.5 py-2"
      style={{ left, top }}
    >
      <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">{hover.kind}</div>
      <div className="truncate text-[12px] font-semibold text-white">{hover.label}</div>
      {hover.detail.slice(0, 3).map((d, i) => (
        <div key={i} className="truncate text-[10px] text-slate-300">{d}</div>
      ))}
      {ll && <div className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-500"><MapPin className="h-2.5 w-2.5" />{ll}</div>}
    </div>
  );
}

/** Pinned, dismissable detail card for a click-selected asset. */
export function MapAssetDetailCard({ asset, onClose }: { asset: MapAsset | null; onClose: () => void }) {
  if (!asset) return null;
  const ll = fmtLatLon(asset.lat, asset.lon);
  return (
    <div className="psa-glass-strong pointer-events-auto absolute left-1/2 top-3 z-30 w-[260px] -translate-x-1/2 rounded-xl p-3">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-cyan-400/70">{asset.kind}</div>
          <div className="truncate text-[13px] font-bold text-white">{asset.label}</div>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-white/5 hover:text-white" title="Close">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {asset.detail.length > 0 && (
        <div className="space-y-0.5 border-t border-white/5 pt-1.5">
          {asset.detail.map((d, i) => (
            <div key={i} className="text-[11px] text-slate-200">{d}</div>
          ))}
        </div>
      )}
      {ll && (
        <div className="mt-1.5 flex items-center gap-1 border-t border-white/5 pt-1.5 font-mono text-[10px] text-slate-400">
          <MapPin className="h-3 w-3 text-cyan-400/70" /> {ll}
        </div>
      )}
    </div>
  );
}
