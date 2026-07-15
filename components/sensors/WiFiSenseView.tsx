"use client";

/**
 * WiFiSenseView — WiFi-sense, device-agnostic. Two modes off one WiFiSenseFrame:
 *   • DENSEPOSE — through-wall body sensing: a CSI/occupancy HEATMAP backdrop + a WIREFRAME
 *     skeleton (COCO-17) per subject, the camera-validated outline look (DensePose-from-WiFi).
 *   • PRESENCE  — Phase-0: RF-presence strength bars per detected device.
 *
 * Matches the existing Mycosoft stack: firmware mdp_wifisense_types.h (CSI amp+phase), MINDEX
 * telemetry.wifisense_pose.dense_uv + keypoints, MAS WiFiSenseAnalysisAgent. Canvas-2D (no WebGL —
 * keypoints are cheap and we avoid a 2nd GL context beside the point cloud + map). Freeze-safe:
 * data via ref, single rAF gated on document.hidden + active, no per-frame React setState.
 *
 * Until the CSI→DensePose edge ships real subjects, a badged SIM (a walking figure sensed through a
 * wall) renders so the capability is operable; a live densepose frame replaces it with no change.
 */

import { useEffect, useRef, useState } from "react";
import { Wifi, PersonStanding } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WiFiSenseFrame, WiFiSubject } from "@/lib/sensors/frames";
import { NoFeed, ViewBadge } from "@/components/psathyrella/ui";

type Mode = "DENSEPOSE" | "PRESENCE";

// COCO-17 skeleton edges by keypoint part name.
const EDGES: [string, string][] = [
  ["left_shoulder", "right_shoulder"], ["left_hip", "right_hip"],
  ["left_shoulder", "left_hip"], ["right_shoulder", "right_hip"],
  ["left_shoulder", "left_elbow"], ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"], ["right_elbow", "right_wrist"],
  ["left_hip", "left_knee"], ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"], ["right_knee", "right_ankle"],
  ["nose", "left_shoulder"], ["nose", "right_shoulder"],
];
const PARTS = ["nose", "left_eye", "right_eye", "left_ear", "right_ear", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"];

// Build a sim walking figure (normalized 0..1) sensed "through a wall" — for demo until real CSI→pose.
function simSubject(t: number, cx: number): WiFiSubject {
  const sway = Math.sin(t * 2) * 0.015;
  const stride = Math.sin(t * 3);
  const y = (p: number) => p;
  const kp = (part: string, x: number, yy: number) => ({ part, x: cx + x + sway, y: y(yy), conf: 0.55 + 0.35 * Math.abs(Math.cos(t + x * 4)) });
  const k: Record<string, { part: string; x: number; y: number; conf: number }> = {
    nose: kp("nose", 0, 0.16), left_eye: kp("left_eye", -0.012, 0.15), right_eye: kp("right_eye", 0.012, 0.15),
    left_ear: kp("left_ear", -0.02, 0.155), right_ear: kp("right_ear", 0.02, 0.155),
    left_shoulder: kp("left_shoulder", -0.05, 0.26), right_shoulder: kp("right_shoulder", 0.05, 0.26),
    left_elbow: kp("left_elbow", -0.075 + stride * 0.02, 0.38), right_elbow: kp("right_elbow", 0.075 - stride * 0.02, 0.38),
    left_wrist: kp("left_wrist", -0.085 + stride * 0.04, 0.5), right_wrist: kp("right_wrist", 0.085 - stride * 0.04, 0.5),
    left_hip: kp("left_hip", -0.035, 0.55), right_hip: kp("right_hip", 0.035, 0.55),
    left_knee: kp("left_knee", -0.04 + stride * 0.05, 0.72), right_knee: kp("right_knee", 0.04 - stride * 0.05, 0.72),
    left_ankle: kp("left_ankle", -0.04 + stride * 0.07, 0.9), right_ankle: kp("right_ankle", 0.04 - stride * 0.07, 0.9),
  };
  const xs = PARTS.map((p) => k[p].x), ys = PARTS.map((p) => k[p].y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { id: "sim-1", bbox: [minX - 0.03, minY - 0.03, maxX - minX + 0.06, maxY - minY + 0.06], keypoints: PARTS.map((p) => k[p]), conf: 0.78, motion: "moving" };
}

export default function WiFiSenseView({ frame, active = true, className }: { frame: WiFiSenseFrame | null; active?: boolean; className?: string }) {
  const [mode, setMode] = useState<Mode>("DENSEPOSE");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<WiFiSenseFrame | null>(frame); dataRef.current = frame;
  const activeRef = useRef(active); activeRef.current = active;
  const modeRef = useRef<Mode>(mode); modeRef.current = mode;
  const [hud, setHud] = useState<{ subjects: number; sim: boolean }>({ subjects: 0, sim: true });

  // ── densepose canvas rAF ──
  useEffect(() => {
    let raf = 0, lastHud = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || !activeRef.current || modeRef.current !== "DENSEPOSE") return;
      const c = canvasRef.current; if (!c) return;
      const ctx = c.getContext("2d"); if (!ctx) return;
      const w = c.width, h = c.height; if (w < 2 || h < 2) return;

      const f = dataRef.current;
      const live = f && f.active && f.kind === "densepose" && Array.isArray(f.subjects);
      const subjects: WiFiSubject[] = live ? f!.subjects! : [simSubject(now / 1000, 0.5), simSubject(now / 1000 + 1.4, 0.78)];

      ctx.fillStyle = "#040a12"; ctx.fillRect(0, 0, w, h);
      // heatmap backdrop (occupancy blobs around each subject) — the "through-wall" RF field
      const grid = live && f!.heatmap ? f!.heatmap : null;
      if (grid) {
        const gw = grid.w, gh = grid.h, data = grid.data as ArrayLike<number>;
        const cw = w / gw, ch = h / gh;
        for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
          const v = Math.max(0, Math.min(1, data[gy * gw + gx] ?? 0));
          if (v < 0.04) continue;
          ctx.fillStyle = `rgba(${Math.round(30 + 200 * v)},${Math.round(60 + 80 * v)},${Math.round(180 - 120 * v)},${0.12 + v * 0.4})`;
          ctx.fillRect(gx * cw, gy * ch, cw + 1, ch + 1);
        }
      } else {
        for (const s of subjects) {
          const [bx, by, bw, bh] = s.bbox; const cx = (bx + bw / 2) * w, cy = (by + bh / 2) * h;
          const rg = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(bw * w, bh * h) * 0.9);
          rg.addColorStop(0, "rgba(56,189,248,0.30)"); rg.addColorStop(0.5, "rgba(34,140,200,0.12)"); rg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
        }
      }

      // skeleton + bbox per subject
      for (const s of subjects) {
        const kpm: Record<string, { x: number; y: number; conf: number }> = {};
        for (const k of s.keypoints) kpm[k.part] = { x: k.x * w, y: k.y * h, conf: k.conf };
        // bbox
        const [bx, by, bw, bh] = s.bbox;
        ctx.strokeStyle = "rgba(34,211,238,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
        ctx.strokeRect(bx * w, by * h, bw * w, bh * h); ctx.setLineDash([]);
        // edges
        ctx.lineWidth = 2.5;
        for (const [a, b] of EDGES) {
          const ka = kpm[a], kb = kpm[b]; if (!ka || !kb) continue;
          const conf = Math.min(ka.conf, kb.conf);
          ctx.strokeStyle = `rgba(${Math.round(120 - conf * 60)},${Math.round(200 + conf * 40)},255,${0.35 + conf * 0.5})`;
          ctx.beginPath(); ctx.moveTo(ka.x, ka.y); ctx.lineTo(kb.x, kb.y); ctx.stroke();
        }
        // joints
        for (const k of s.keypoints) { ctx.fillStyle = `rgba(167,243,255,${0.4 + k.conf * 0.6})`; ctx.beginPath(); ctx.arc(k.x * w, k.y * h, 2.4, 0, Math.PI * 2); ctx.fill(); }
        // label
        ctx.fillStyle = "rgba(34,211,238,0.9)"; ctx.font = "9px monospace";
        ctx.fillText(`${s.id} ${Math.round(s.conf * 100)}%${s.motion ? " · " + s.motion : ""}`, bx * w, by * h - 4);
      }

      if (now - lastHud > 320) { lastHud = now; setHud({ subjects: subjects.length, sim: !live }); }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // size canvas
  useEffect(() => {
    const c = canvasRef.current;
    const size = () => { if (!c) return; const r = c.getBoundingClientRect(); const w = Math.max(1, Math.floor(r.width)), h = Math.max(1, Math.floor(r.height)); if (c.width !== w) c.width = w; if (c.height !== h) c.height = h; };
    size(); const ro = new ResizeObserver(size); if (c) ro.observe(c); return () => ro.disconnect();
  }, []);

  const presenceDevices = frame?.kind === "presence" ? (frame.devices ?? []) : [];

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#040a12]", className)}>
      <ViewBadge>WiFi-sense · {mode === "DENSEPOSE" ? "DensePose (through-wall)" : "RF presence"}{hud.sim && mode === "DENSEPOSE" ? " · SIM" : ""}</ViewBadge>
      <div className="absolute right-2 top-2 z-20 flex overflow-hidden rounded-md border border-cyan-500/25 text-[9px] font-bold uppercase tracking-wide">
        {(["DENSEPOSE", "PRESENCE"] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={cn("flex items-center gap-1 px-2 py-0.5", mode === m ? "bg-cyan-500/20 text-cyan-100" : "bg-black/45 text-slate-400 hover:text-slate-200")}>
            {m === "DENSEPOSE" ? <PersonStanding className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}{m === "DENSEPOSE" ? "Pose" : "Presence"}
          </button>
        ))}
      </div>

      {mode === "DENSEPOSE" ? (
        <>
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded border border-cyan-500/20 bg-black/55 px-2 py-1 font-mono text-[9px] text-cyan-200/85">
            {hud.subjects} subject{hud.subjects === 1 ? "" : "s"} · CSI→DensePose{hud.sim ? " · sim · awaiting edge" : ""}
          </div>
        </>
      ) : presenceDevices.length ? (
        <div className="absolute inset-0 flex flex-col gap-1 overflow-y-auto p-3 pt-10">
          {presenceDevices.slice(0, 12).map((d, i) => (
            <div key={d.id || i} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate font-mono text-[10px] text-slate-300">{d.vendor || d.id}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-cyan-300" style={{ width: `${Math.max(4, Math.min(100, d.strength * 100))}%` }} /></div>
              <span className="w-12 shrink-0 text-right font-mono text-[9px] text-slate-400">{d.rssiDbm} dBm</span>
            </div>
          ))}
        </div>
      ) : (
        <NoFeed label="WiFi-sense" sub="RF presence — awaiting backend" />
      )}
    </div>
  );
}
