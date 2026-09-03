"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw, Video, Sliders, ScanSearch, Crosshair, Plus, Minus, Maximize2, Sun, Moon, CircleDot,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Dot, Target as TargetIcon, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuoyCommand, BuoyTelemetry, CameraFeed, IrCutMode } from "@/lib/fusarium/gcs/contract";
import { cssFilter, DEFAULT_FILTER_STATE, isFilterActive, filterSummary, type VideoFilterState } from "@/lib/fusarium/gcs/videoFilters";
import FilterControls from "@/components/fusarium/gcs/camera/FilterControls";
import DetectionOverlay from "@/components/fusarium/gcs/camera/DetectionOverlay";
import { useCameraDetections } from "@/lib/fusarium/gcs/useCameraDetections";
import { detectionBearing, planFollow, reacquire, type LockedTrack, type FollowMode } from "@/lib/fusarium/gcs/targetTracking";
import { classifyDetection, shouldSurface, groupColor } from "@/lib/fusarium/gcs/maritimeOntology";
import { useStableDetections } from "@/lib/fusarium/gcs/useStableDetections";
import { pointFromEvent, designateAt } from "@/lib/fusarium/gcs/designate";
import SensorStatsPanel, { type SensorStats } from "@/components/fusarium/gcs/camera/SensorStatsPanel";
import MaritimeHud, { type HudContact } from "@/components/fusarium/gcs/camera/MaritimeHud";
import VisorHud, { type VisorContact } from "@/components/fusarium/gcs/camera/VisorHud";
import RelabelPopover from "@/components/fusarium/gcs/camera/RelabelPopover";
import { Tag } from "lucide-react";

/**
 * TARGET camera — the discrete IMX477 HQ forward optic (the Sony 30x stand-in), with object
 * recognition and target-following.
 *
 * Three layers, in increasing consequence:
 *   1. VIEW      — live MJPEG + image adjustment + digital PTZ + IR-cut day/night.
 *   2. RECOGNISE — YOLO boxes from the Jetson, each resolved to a TRUE BEARING (bearing math and its
 *                  tests live in lib/psathyrella/targetTracking.ts).
 *   3. FOLLOW    — lock a track and slew to it. Two modes, deliberately separated:
 *                    "camera" slews the OPTIC only (no propulsion, always available)
 *                    "vessel" turns the BOAT (propulsion — requires ARMED, and stops the moment the
 *                     lock is lost, the buoy disarms, or the operator leaves the tab)
 *
 * The vessel-follow path is the only place in the GCS where a machine-vision result can reach the
 * thrusters. It is off by default, gated on ARMED, rate-capped in planFollow(), and drops to a hold
 * on ANY loss of confidence. A missed detection must never become a turn the operator didn't ask for.
 */
export default function TargetView({
  feed,
  telemetry,
  active,
  sendCommand,
  onReconnect,
}: {
  feed: CameraFeed;
  telemetry: BuoyTelemetry;
  active: boolean;
  sendCommand: (cmd: BuoyCommand) => Promise<boolean> | void;
  onReconnect?: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [filter, setFilter] = useState<VideoFilterState>({ ...DEFAULT_FILTER_STATE });
  const [showPanel, setShowPanel] = useState<"fx" | "none">("none");
  const [showAi, setShowAi] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotateDeg, setRotateDeg] = useState(0);
  const [followMode, setFollowMode] = useState<FollowMode>("off");
  const [lock, setLock] = useState<LockedTrack | null>(null);
  const [hideImplausible, setHideImplausible] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [relabelId, setRelabelId] = useState<string | null>(null);

  /*
   * IR-cut day/night — posts to the owner-gated proxy at /api/fusarium/gcs/camera/ircut.
   *
   * These buttons previously fired `sendCommand({ domain: "camera", action: "irCut" })` into the
   * generic command bus, which has no handler for it — so pressing DAY/AUTO/NIGHT did nothing at all
   * while the Jetson's own control endpoint was live the whole time (verified Aug 03: POST
   * {"mode":"night"} → applied:true, method "i2c:9/0xc").
   *
   * `irCutMode` is an OPTIMISTIC local echo so the chip responds immediately, but it is only kept
   * when the device reports `applied`. If the device accepts the mode without driving the filter, or
   * is unreachable, we revert and surface the failure — a filter that did not move must not be shown
   * as moved.
   */
  const [irCutMode, setIrCutMode] = useState<IrCutMode | null>(null);
  const [irCutBusy, setIrCutBusy] = useState<IrCutMode | null>(null);
  const [irCutErr, setIrCutErr] = useState<string | null>(null);
  const setIrCut = async (mode: IrCutMode) => {
    setIrCutBusy(mode);
    setIrCutErr(null);
    const prev = irCutMode;
    setIrCutMode(mode);
    try {
      const res = await fetch("/api/fusarium/gcs/camera/ircut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
        cache: "no-store",
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; applied?: boolean; mode?: string; lastError?: string; error?: string } | null;
      if (!res.ok || !j?.ok) {
        setIrCutMode(prev);
        setIrCutErr(j?.error ?? j?.lastError ?? `HTTP ${res.status}`);
      } else if (j.applied === false) {
        // Accepted but not physically applied. "auto" legitimately reports applied:true (it hands the
        // filter to the module's CDS), so a false here on any mode means the filter did not move.
        setIrCutMode(prev);
        setIrCutErr(j.lastError ?? "device accepted the mode but did not drive the filter");
      } else {
        onReconnect?.(); // re-poll the rig so feed.irCut / nightActive reflect the device
      }
    } catch (err) {
      setIrCutMode(prev);
      setIrCutErr((err as Error).message);
    } finally {
      setIrCutBusy(null);
    }
  };
  /*
   * Glass joystick for camera pan. Replaces the five-button cross.
   *
   * Pointer capture is what makes it usable: the drag continues if your finger leaves the pad, which
   * matters on a boat. Deflection is normalised to the unit circle and clamped, so a diagonal can
   * never exceed the same magnitude as a cardinal push. Releasing springs it back to centre and
   * stops the pan — a camera control that keeps slewing after you let go is a hazard.
   */
  const joyRef = useRef<HTMLDivElement>(null);
  const [joy, setJoy] = useState({ x: 0, y: 0 });
  const joyActive = useRef(false);
  const joyTimer = useRef<number | null>(null);

  const joyVector = useCallback((e: React.PointerEvent) => {
    const el = joyRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y };
  }, []);

  const joyDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    joyActive.current = true;
    setJoy(joyVector(e));
    if (joyTimer.current) window.clearInterval(joyTimer.current);
    joyTimer.current = window.setInterval(() => {
      setJoy((v) => { if (v.x || v.y) nudgePan(v.x * 0.06, v.y * 0.06); return v; });
    }, 90);
  };
  const joyMove = (e: React.PointerEvent) => { if (joyActive.current) setJoy(joyVector(e)); };
  const joyUp = (e: React.PointerEvent) => {
    joyActive.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (joyTimer.current) { window.clearInterval(joyTimer.current); joyTimer.current = null; }
    setJoy({ x: 0, y: 0 });
  };
  const joyKey = (e: React.KeyboardEvent) => {
    const step = 0.18;
    if (e.key === "ArrowUp") nudgePan(0, -step);
    else if (e.key === "ArrowDown") nudgePan(0, step);
    else if (e.key === "ArrowLeft") nudgePan(-step, 0);
    else if (e.key === "ArrowRight") nudgePan(step, 0);
    else if (e.key === "Home" || e.key === " ") resetPtz();
    else return;
    e.preventDefault();
  };
  useEffect(() => () => { if (joyTimer.current) window.clearInterval(joyTimer.current); }, []);

  const frameRef = useRef<HTMLImageElement>(null);

  const heading = telemetry.pose.headingDeg ?? null;
  const armed = telemetry.autonomy?.armed === true;
  const optical = feed.ptz === "optical";
  const zoomMax = Math.max(2, feed.zoomMax && feed.zoomMax > 1 ? feed.zoomMax : 8);

  // Gated on `active`: CenterViewport keeps hidden views MOUNTED with `invisible`, and
  // `visibility: hidden` does not stop an MJPEG stream — so this held a socket open for the whole
  // session while the operator was elsewhere. See the fuller note in Quad360View. Gating on operator
  // navigation is distinct from the anti-flap rule below, which forbids a flaky STATUS POLL from
  // tearing down live video.
  const src = active && feed.streamUrl ? `${feed.streamUrl}?n=${nonce}` : null;
  const online = feed.online && !imgErr;

  // ── Anti-flap: same discipline as the ring — a flaky status poll must not tear down live video ──
  const OFFLINE_GRACE_MS = 20000;
  const CONNECT_GRACE_MS = 9000;
  const [hardOffline, setHardOffline] = useState(false);
  const [everLive, setEverLive] = useState(false);
  const lastFrameAtRef = useRef(0);
  const mountedAtRef = useRef(0);
  if (mountedAtRef.current === 0) mountedAtRef.current = Date.now();

  useEffect(() => {
    if (online) { setHardOffline(false); return; }
    if (!everLive) {
      const waited = Date.now() - mountedAtRef.current;
      if (waited >= CONNECT_GRACE_MS) { setHardOffline(true); return; }
      const t = window.setTimeout(() => setHardOffline(true), CONNECT_GRACE_MS - waited);
      return () => clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setHardOffline(Date.now() - lastFrameAtRef.current >= OFFLINE_GRACE_MS);
    }, OFFLINE_GRACE_MS);
    return () => clearTimeout(t);
  }, [online, everLive]);

  useEffect(() => {
    if (!imgErr || !active) return;
    const t = window.setTimeout(() => { setImgErr(false); setNonce((n) => n + 1); }, 2000);
    return () => clearTimeout(t);
  }, [imgErr, active]);

  // Only fields the rig genuinely reports. Everything else stays null so the panel renders
  // "not reported" rather than a plausible-looking default.
  const sensorStats: SensorStats = useMemo(() => ({
    sensor: feed.sensor ?? null,
    device: null,
    width: feed.width ?? null,
    height: feed.height ?? null,
    fps: feed.fps ?? null,
    captureMode: null,
    discrete: feed.online ? true : null,
    argusIds: null,
    irCut: feed.irCut ?? null,
    nightActive: feed.nightActive ?? null,
    fovDeg: feed.fovDeg ?? null,
    lastFrameMs: null,
    persistent: null,
  }), [feed.sensor, feed.width, feed.height, feed.fps, feed.online, feed.irCut, feed.nightActive, feed.fovDeg]);

  const streamMounted = !hardOffline;
  const reconnecting = streamMounted && everLive && !online;
  const connecting = !everLive && !hardOffline;

  // ── Detections for THIS feed, resolved to bearings ──
  const frameW = feed.width ?? 1920;
  const frameH = feed.height ?? 1080;
  const ai = useCameraDetections("front", { enabled: showAi && active, frameW, frameH });

  const geometry = useMemo(() => ({
    frameW, frameH,
    mountBearingsDeg: feed.mountBearingsDeg ?? [0],
    fovDeg: feed.fovDeg,
    headingDeg: heading,
  }), [frameW, frameH, feed.mountBearingsDeg, feed.fovDeg, heading]);

  // Classify through the maritime ontology BEFORE anything reaches the operator. The detector is
  // COCO-80 today and force-maps unfamiliar shapes onto indoor classes — it has called buoy hardware
  // "bottle" and dock scenery "toilet"/"couch". Those must never be presented as identified contacts;
  // the ontology demotes them to "Unclassified contact" while preserving the raw class for audit.
  // Boxes blinked because each ~1 Hz poll is independent and there is no tracker. Hold a detection
  // for a short window after it stops being reported so the overlay is readable — held boxes are
  // frozen in place and flagged `stale`, NEVER moved or extrapolated (that would invent motion).
  const stable = useStableDetections(ai.frame?.detections ?? []);

  const contacts = useMemo(() => {
    const list = stable;
    return list
      .map((det) => {
        const cls = classifyDetection(det.cls);
        return { det, cls, source: "front" as const, bearing: detectionBearing(det, "front", geometry) };
      })
      .filter((c) => c.bearing !== null && shouldSurface(c.cls, { hideImplausible }))
      .map((c) => ({ ...c, bearing: c.bearing as NonNullable<typeof c.bearing> }));
  }, [stable, geometry, hideImplausible]);

  /**
   * Contacts projected for the maritime conning HUD.
   *
   * `bearingTrueDeg` is passed through EXACTLY as the bearing engine resolved it — null when there is
   * no heading fix. The tape refuses to place a contact it cannot geo-reference rather than falling
   * back to the relative angle, because a relative angle drawn on a TRUE-bearing tape is a wrong
   * bearing that looks like a right one.
   */
  const hudContacts = useMemo<HudContact[]>(
    () =>
      contacts.map((c) => ({
        id: c.det.id ?? `${c.cls.displayLabel}-${Math.round(c.bearing.relativeDeg)}`,
        label: c.cls.displayLabel,
        bearingTrueDeg: c.bearing.trueDeg,
        bearingRelDeg: c.bearing.relativeDeg,
        group: c.cls.group,
        conf: c.det.conf ?? null,
        // Nav-light detection is not wired on this feed yet: the detector reports object classes, not
        // light blobs. Left empty so the COLREGs card says "no nav lights resolved" rather than
        // inventing an aspect — it lights up the day the backend tags light detections.
        lights: [],
      })),
    [contacts],
  );
  /**
   * Built FROM the lock, not looked up by id.
   *
   * `LockedTrack.key` is the backend trackId when tracking is available and the detection id when it
   * is not, so matching it against a detection id silently stops working the moment the tracker
   * engages — the card would go blank on exactly the contacts being tracked best. The lock already
   * carries its own class, bearing and confidence, so it is the authoritative source here.
   */
  /** Same contacts, shaped for the visor. Bow-relative is what the tracker plots. */
  const visorContacts = useMemo<VisorContact[]>(
    () =>
      hudContacts.map((c) => ({
        id: c.id,
        label: c.label,
        bearingRelDeg: c.bearingRelDeg ?? 0,
        bearingTrueDeg: c.bearingTrueDeg,
        group: c.group,
        conf: c.conf,
      })),
    [hudContacts],
  );

  const hudSelected = useMemo<HudContact | null>(
    () =>
      lock
        ? {
            id: lock.key,
            label: classifyDetection(lock.cls).displayLabel,
            bearingTrueDeg: lock.bearing.trueDeg,
            bearingRelDeg: lock.bearing.relativeDeg,
            conf: lock.conf,
            lights: [],
          }
        : null,
    [lock],
  );

  // `stable` takes a new identity ONLY when useStableDetections processes a detector report (or ages
  // one out); `contacts` re-derives on every heading tick as well. `ageMs` is measured against the
  // instant `stable` was projected, so this is the anchor that turns an age back into the wall-clock
  // moment the DETECTOR actually spoke. (A render that React discards can stamp this a few ms early;
  // that reads the lock as slightly OLDER than it is, which is the safe direction.)
  const reportAtRef = useRef({ src: stable, atMs: Date.now() });
  if (reportAtRef.current.src !== stable) reportAtRef.current = { src: stable, atMs: Date.now() };
  const reportAtMs = reportAtRef.current.atMs;
  /** When the DETECTOR last reported this contact — never "when this code happened to run". */
  const seenAtMs = useCallback((ageMs: number) => reportAtMs - ageMs, [reportAtMs]);

  // The hold in useStableDetections is for the EYES. A held box is frozen in PIXELS, so its true
  // bearing is recomputed against the live heading every tick — re-acquiring the lock off one while
  // the boat turns would rotate the target with the hull, hold the bearing error constant, and turn
  // forever. The control loop therefore reads only what the detector is reporting NOW; held boxes
  // stay on screen (dimmed, "held") but can neither refresh a lock nor steer.
  const followable = useMemo(() => contacts.filter((c) => !c.det.stale), [contacts]);

  // Keep the lock attached to the live object as new frames arrive.
  //
  // This has to be a FIXED POINT. `reacquire` always re-matches the very candidate the lock was
  // minted from (same class, bearing drift 0), so the previous version — a fresh object literal
  // written into the same state the effect depended on — re-fired on its own output at render rate
  // until React threw "Maximum update depth exceeded", and in FOLLOW mode every spin pushed another
  // command down the actuator path. Two things close it: the functional updater reads the lock
  // without putting it in the deps, and `lastSeenMs` is derived from the detector's report instead
  // of `Date.now()`, so an unchanged report yields an equal object and the update bails out. Using
  // the report clock also means an unrelated telemetry tick can no longer refresh the freshness
  // clock — which is what made `lockStale` below unable to ever fire.
  useEffect(() => {
    if (followable.length === 0) return;
    setLock((prev) => {
      if (!prev) return prev;
      const found = reacquire(prev, followable);
      if (!found) return prev;
      // `reacquire` hands back one of the candidates but widens `det` to CameraDetection; re-find it
      // to recover the detector-reported age.
      const hit = followable.find((c) => c.det.id === found.det.id);
      if (!hit) return prev;
      const next: LockedTrack = {
        key: hit.det.trackId || hit.det.id,
        cls: hit.det.cls,
        source: "front",
        bearing: hit.bearing,
        conf: hit.det.conf,
        lastSeenMs: seenAtMs(hit.det.ageMs),
      };
      const unchanged =
        prev.key === next.key && prev.cls === next.cls && prev.conf === next.conf &&
        prev.lastSeenMs === next.lastSeenMs &&
        prev.bearing.trueDeg === next.bearing.trueDeg &&
        prev.bearing.relativeDeg === next.bearing.relativeDeg;
      return unchanged ? prev : next;
    });
  }, [followable, seenAtMs]);

  const lockAgeMs = lock ? Date.now() - lock.lastSeenMs : null;
  const lockStale = lockAgeMs !== null && lockAgeMs > 4000;

  const follow = useMemo(() => {
    if (!lock || heading === null || lock.bearing.trueDeg === null) return null;
    return planFollow(lock.bearing.trueDeg, heading);
  }, [lock, heading]);

  // ── The one place vision reaches the actuators. Every guard here is deliberate. ──
  const sendRef = useRef(sendCommand);
  sendRef.current = sendCommand;

  // Key the effect below on the VALUES that end up on the wire, not on the `lock`/`follow` OBJECT
  // identities. Those are rebuilt on every detector report and every heading tick, so depending on
  // them re-sent a byte-identical command each time — and it was the amplifier that turned the
  // re-stamp loop above into a flood of thruster commands. Rounding here rather than at the call
  // site means the dep IS the commanded number: sub-degree jitter no longer reaches the actuators.
  const lockKey = lock?.key ?? null;
  const lockedBearingDeg = lock?.bearing.trueDeg ?? null;
  const commandBearingDeg = lockedBearingDeg === null ? null : Math.round(lockedBearingDeg);
  const planOnTarget = follow?.onTarget ?? null;
  // Null exactly when `follow` is null, i.e. no lock, no heading, or no true bearing — the same
  // "cannot aim at this" gate the old `!follow` guard carried.
  const commandYawRateDegS = follow === null ? null : Math.round(follow.yawRateDegS);

  useEffect(() => {
    if (followMode === "off" || !active) return;
    if (lockKey === null || commandBearingDeg === null || commandYawRateDegS === null) return;
    // A stale lock must never keep steering — hold instead.
    if (lockStale) {
      if (followMode === "vessel") sendRef.current({ domain: "thruster", action: "setVector", headingDeg: 0, magnitudePct: 0, yawRateDegS: 0 });
      return;
    }

    if (followMode === "camera") {
      sendRef.current({ domain: "camera", action: "point", bearingDeg: commandBearingDeg, tiltDeg: 0 });
      return;
    }
    // vessel: propulsion. Disarm at any moment ⇒ stop commanding and fall back to camera-only.
    if (!armed) { setFollowMode("camera"); return; }
    if (planOnTarget) {
      sendRef.current({ domain: "thruster", action: "setVector", headingDeg: 0, magnitudePct: 0, yawRateDegS: 0 });
    } else {
      sendRef.current({ domain: "thruster", action: "setVector", headingDeg: 0, magnitudePct: 0, yawRateDegS: commandYawRateDegS });
    }
  }, [followMode, active, armed, lockStale, lockKey, commandBearingDeg, planOnTarget, commandYawRateDegS]);

  // Leaving the tab, losing the lock, or unmounting must not leave the boat turning.
  const stopVessel = useCallback(() => {
    sendRef.current({ domain: "thruster", action: "setVector", headingDeg: 0, magnitudePct: 0, yawRateDegS: 0 });
  }, []);
  useEffect(() => {
    if (followMode === "vessel" && !active) { setFollowMode("camera"); stopVessel(); }
  }, [active, followMode, stopVessel]);
  useEffect(() => () => { if (followMode === "vessel") stopVessel(); }, [followMode, stopVessel]);
  useEffect(() => { if (!lock && followMode === "vessel") { setFollowMode("off"); stopVessel(); } }, [lock, followMode, stopVessel]);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const applyZoom = (z: number) => {
    const nz = clamp(Math.round(z * 10) / 10, 1, optical ? (feed.zoomMax ?? 30) : zoomMax);
    setZoom(nz);
    if (optical) sendCommand({ domain: "camera", action: "setZoom", zoom: Math.round(nz) });
  };
  const nudgePan = (dx: number, dy: number) => setPan((p) => ({ x: clamp(p.x + dx, -1, 1), y: clamp(p.y + dy, -1, 1) }));
  const resetPtz = () => { setZoom(1); setPan({ x: 0, y: 0 }); setRotateDeg(0); };
  const reconnect = () => { setImgErr(false); setNonce((n) => n + 1); onReconnect?.(); };

  const chip = "flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors";
  const chipOn = "border-cyan-500/50 bg-cyan-500/20 text-cyan-100";
  const chipOff = "border-white/10 bg-black/40 text-slate-400 hover:text-slate-200";

  if (hardOffline) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#0a1626] to-[#05080e] text-center">
        <Video className="h-7 w-7 text-amber-300/80" />
        <div className="text-sm font-bold uppercase tracking-[0.15em] text-amber-300">No Target Feed</div>
        <div className="max-w-md px-4 text-[12px] leading-relaxed text-slate-300">
          {feed.error ?? <>Serve the IMX477 on the Jetson and set <span className="font-mono text-cyan-200">PSATHYRELLA_CAM_FRONT_URL</span>, then reconnect.</>}
        </div>
        <button onClick={reconnect} className="mt-1 flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase text-cyan-100 hover:bg-cyan-500/20">
          <RefreshCw className="h-3.5 w-3.5" /> Reconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-black" onClick={() => setShowPanel("none")}>
      {/* ── TOOLBAR (in-flow — never hides behind the tab group) ── */}
      <div className="relative z-[60] flex flex-wrap items-center gap-1.5 border-b border-cyan-500/40 bg-[#070d18] px-2 py-1.5 pr-28">
        <span className="mr-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400/60">Target · IMX477</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); setShowAi((v) => !v); }}
          className={cn(chip, showAi && ai.enabled ? chipOn : chipOff)}
          title={ai.enabled ? "Object recognition overlay" : "Set NEXT_PUBLIC_FUSARIUM_GCS_CAM_AI=1 to enable"}>
          <ScanSearch className="h-3 w-3" />AI{!ai.enabled && " off"}
        </button>
        {ai.enabled && showAi && (
          <span className="font-mono text-[9px] text-slate-500">
            {ai.connected ? `${contacts.length} contact${contacts.length === 1 ? "" : "s"}` : "detector unreachable"}
          </span>
        )}
        {ai.enabled && showAi && ai.license && !/validated|production/i.test(ai.license) && (
          // Fail-safe: warn unless the backend affirmatively declares the model validated. The live
          // checkpoint is seeded from 36 auto-labelled same-scene frames and emits maritime classes
          // indoors at high confidence — and because those classes ARE valid maritime vocabulary, the
          // ontology cannot demote them. This is the only thing marking them as unproven.
          <span className="rounded border border-amber-400/50 bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold uppercase text-amber-200"
            title={`${ai.license}

Model: ${ai.frame?.model ?? "unknown"}
Unvalidated R&D weights — treat every classification as a hypothesis, not an identification.`}>
            R&D model
          </span>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); setShowPanel(showPanel === "fx" ? "none" : "fx"); }}
          className={cn(chip, showPanel === "fx" ? chipOn : chipOff)}><Sliders className="h-3 w-3" />FX</button>
        {isFilterActive(filter) && <span className="rounded border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber-200">{filterSummary(filter)}</span>}

        {feed.irCut != null && (
          <>
            <span className="mx-1 h-3 w-px bg-white/10" />
            {([["day", Sun], ["auto", CircleDot], ["night", Moon]] as [IrCutMode, typeof Sun][]).map(([m, Icon]) => (
              <button key={m} type="button" onClick={(e) => { e.stopPropagation(); void setIrCut(m); }}
                disabled={irCutBusy !== null}
                title={irCutErr && irCutBusy === null ? `IR-cut ${m} — last attempt failed: ${irCutErr}` : `IR-cut: ${m}`}
                className={cn(chip, (irCutMode ?? feed.irCut) === m ? chipOn : chipOff, irCutBusy === m && "animate-pulse")}>
                <Icon className="h-3 w-3" />{m}</button>
            ))}
            {feed.nightActive === true && <span className="rounded border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-200">IR</span>}
            {/* A control that silently fails is worse than a disabled one — it reads as a capability
                the vehicle has. If the device refused or was unreachable, say so on screen. */}
            {irCutErr && irCutBusy === null && (
              <span className="rounded border border-red-500/40 bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-200" title={irCutErr}>
                IR-cut failed
              </span>
            )}
          </>
        )}

        <span className="mx-1 h-3 w-px bg-white/10" />
        <button type="button" onClick={(e) => { e.stopPropagation(); setRotateDeg((r) => (r + 90) % 360); }}
          className={cn(chip, rotateDeg ? chipOn : chipOff)} title="Rotate the image if the optic is mounted turned">
          ROT {rotateDeg}°
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); setShowStats((v) => !v); }}
          className={cn(chip, showStats ? chipOn : chipOff)} title="IMX477 sensor detail">
          Stats
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); resetPtz(); }} className={cn(chip, chipOff)}><Maximize2 className="h-3 w-3" />Reset</button>
        {rotateDeg !== 0 && (
          <span className="rounded border border-amber-400/40 bg-amber-500/15 px-1 py-0.5 text-[8px] font-bold uppercase text-amber-200"
            title="Tap-to-designate inverts the zoom/pan transform but not rotation. Rather than designate the wrong object, it is disabled while the image is rotated. Set ROT back to 0 to designate.">
            tap-select off (rotated)
          </span>
        )}

        {(reconnecting || connecting) && (
          <span className="ml-auto flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-200">
            <RefreshCw className="h-3 w-3 animate-spin" />{connecting ? "Connecting" : "Reconnecting"}
          </span>
        )}
      </div>

      {showStats && (
        <div className="absolute right-2 top-11 z-[80] max-h-[75%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <SensorStatsPanel stats={sensorStats} feedLabel="Target · IMX477" />
        </div>
      )}

      {showPanel === "fx" && (
        <div className="absolute left-2 top-11 z-[80]" onClick={(e) => e.stopPropagation()}>
          <FilterControls state={filter} onChange={setFilter} onReset={() => setFilter({ ...DEFAULT_FILTER_STATE })} />
        </div>
      )}

      {/* The standalone MaritimeHud strip was removed: it rendered a 34 px heading tape ABOVE the
          optic while the visor drew its own frame over it — two HUDs stacked, and the tape stole
          height from the picture to say what the visor now says inside its own top band. The tape
          itself lives on, folded into VisorFrame's letterbox band. */}
      {/*
        ══ VISOR FRAME ═══════════════════════════════════════════════════════════════════════════
        The HUD is a FRAME, not bands. Content is anchored at the four corners plus top-centre and
        bottom-centre, with the whole middle of the picture left clear — the operator conns by what
        is in the centre of frame, so that is the one region nothing may cover.

        Morgan, Aug 03: "the only way it should overlap over the video is slightly in the bottom and
        top corners, as well as the center targeting information at the top, the middle, and the
        bottom, just like the Halo HUD I gave you shows."

        An earlier pass replaced this with two solid instrument bands. That was wrong twice over: it
        deleted the targeting HUD instead of repositioning it, and a band is a wall where a visor is
        a frame. Restored.
      */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {/* ── LIVE OPTIC — clean picture, nothing over it but registered marks ── */}
        <div className="relative aspect-video max-h-full w-full min-w-0 overflow-hidden bg-black"
          onClick={(e) => {
            // Tap the picture to designate what is under your finger. pointFromEvent inverts the exact
            // render transform (contain letterbox + scale/origin). It does NOT invert `rotate`, so while
            // the image is rotated a tap would resolve to the un-rotated position and could designate the
            // WRONG object — designation is therefore disabled at any rotation rather than approximated.
            if (rotateDeg !== 0) return;
            const el = e.currentTarget.getBoundingClientRect();
            const pt = pointFromEvent({ width: el.width, height: el.height }, e.clientX, e.clientY, el.left, el.top, "contain", frameW, frameH, zoom, pan.x, pan.y);
            if (!pt) return; // tap landed in the letterbox bars, not on the image
            const picked = designateAt(pt, contacts.map((c) => c.det));
            if (!picked.detection) return;
            const hit = contacts.find((c) => c.det.id === picked.detection!.id);
            // Held boxes stay tappable — they are drawn on screen, and a tap that silently does
            // nothing is its own lie — but the lock is stamped with the DETECTOR's report time, so
            // designating one starts the stale clock already part-spent instead of claiming the
            // object was seen just now. It also cannot be refreshed afterwards (see `followable`),
            // so it goes to "Lock stale — holding" on schedule and steering stops.
            if (hit) setLock({ key: hit.det.trackId || hit.det.id, cls: hit.det.cls, source: "front", bearing: hit.bearing, conf: hit.det.conf, lastSeenMs: seenAtMs(hit.det.ageMs) });
          }}>
          {src && (
            <div className="absolute inset-0" style={{ transform: `scale(${zoom}) rotate(${rotateDeg}deg)`, transformOrigin: `${50 + pan.x * 45}% ${50 + pan.y * 45}%`, transition: "transform 0.18s ease-out" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={frameRef} key={src} src={src} alt="Global vehicle target camera" className="h-full w-full object-contain"
                style={{ filter: cssFilter(filter) }}
                onError={() => setImgErr(true)}
                onLoad={() => { lastFrameAtRef.current = Date.now(); if (!everLive) setEverLive(true); }} />
            </div>
          )}

          {/* AI boxes — front frame space; overlay is a sibling of the transformed element, so pass
              zoom/pan rather than nesting it inside (nesting would double-apply the transform). */}
          {showAi && ai.enabled && contacts.length > 0 && (
            <>
              <DetectionOverlay detections={contacts.filter((c) => !c.det.stale).map((c) => ({ ...c.det, cls: c.cls.displayLabel }))}
                srcW={frameW} srcH={frameH} fit="contain" zoom={zoom} panX={pan.x} panY={pan.y} />
              {/* HELD (stale) boxes render dimmed and separately — the detector is not currently
                  reporting them, so they must never look identical to a live contact. */}
              <div className="pointer-events-none absolute inset-0 opacity-40">
                <DetectionOverlay detections={contacts.filter((c) => c.det.stale).map((c) => ({ ...c.det, cls: `${c.cls.displayLabel} (held)` }))}
                  srcW={frameW} srcH={frameH} fit="contain" zoom={zoom} panX={pan.x} panY={pan.y} />
              </div>
            </>
          )}

          {filter.grid && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(34,211,238,0.18)" strokeWidth="1" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(34,211,238,0.18)" strokeWidth="1" />
            </svg>
          )}


          </div>
          {/* PTZ — anchored in the BOTTOM-RIGHT CORNER. Corner overlap is precisely what the visor
              reference does; the middle of frame stays clear so the operator can see what is ahead. */}
          <div className="pointer-events-auto absolute bottom-[20px] right-[15px] z-[60] flex w-[83px] flex-col items-end gap-[46px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex w-[62px] flex-col items-center gap-0.5 px-0.5 py-1" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(15,23,42,0.46) 48%, rgba(255,255,255,0.08)), radial-gradient(circle at 24% 18%, rgba(255,255,255,0.18), transparent 32%)", backdropFilter: "blur(14px) saturate(1.2)", WebkitBackdropFilter: "blur(14px) saturate(1.2)", border: "1px solid rgba(255,255,255,0.42)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 10px 30px rgba(15,23,42,0.25)", clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}>
              <button type="button" aria-label="Zoom out" onClick={() => applyZoom(zoom - 1)} className="psa-liquid-btn flex h-8 w-8 items-center justify-center"><Minus className="h-4 w-4" /></button>
              <span className="min-w-[34px] text-center font-mono text-[11px] font-bold text-cyan-100">{zoom.toFixed(1)}×</span>
              <button type="button" aria-label="Zoom in" onClick={() => applyZoom(zoom + 1)} className="psa-liquid-btn flex h-8 w-8 items-center justify-center"><Plus className="h-4 w-4" /></button>
              <span className="ml-0.5 text-[8px] uppercase text-slate-500">{optical ? "opt" : "dig"}</span>
            </div>
            <div
              ref={joyRef}
              role="application"
              aria-label="Camera pan joystick"
              tabIndex={0}
              onPointerDown={joyDown}
              onPointerMove={joyMove}
              onPointerUp={joyUp}
              onPointerCancel={joyUp}
              onKeyDown={joyKey}
              className="psa-joy relative h-[92px] w-[92px] touch-none select-none rounded-full"
            >
              {/* travel rings — purely a scale for the eye, no data */}
              <div className="pointer-events-none absolute inset-[14px] rounded-full border border-white/10" />
              <div className="pointer-events-none absolute inset-[30px] rounded-full border border-white/[0.07]" />
              {/* knob */}
              <div
                className="psa-joy-knob pointer-events-none absolute left-1/2 top-1/2 h-[34px] w-[34px] rounded-full"
                style={{ transform: `translate(calc(-50% + ${joy.x * 26}px), calc(-50% + ${joy.y * 26}px))` }}
              />
            </div>
          </div>

        {/* VISOR HUD — mounted on the ROW, not the video box, so it spans the full pane height:
            the top assembly holds its place and the bottom assembly reaches the very bottom of the
            window, while the 16:9 picture stays centred between them. */}
        <div className="pointer-events-none absolute inset-0 z-50">
            <VisorHud
              telemetry={telemetry}
              feed={feed}
              contacts={visorContacts}
              zoom={zoom}
              detectorConnected={ai.connected}
              detectorModel={ai.frame?.model ?? null}
              detectorLatencyMs={ai.frame?.latencyMs ?? null}
              lockedLabel={lock ? classifyDetection(lock.cls).displayLabel : null}
            />
        </div>
      </div>
    </div>
  );
}
