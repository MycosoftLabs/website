/**
 * Device-agnostic SENSOR CAPABILITY frames — the seam that makes one set of renderers work for
 * EVERY Mycosoft device (Psathyrella buoy, Mushroom 1, Garrick/Agaric drone, MycoNode, SporeBase…).
 *
 * The SENSOR is the unit, not the device. A device advertises capabilities (the existing
 * device-registry `sensors[]`/`capabilities[]` + `HARDWARE_VARIANTS` seam in MAS); each capability
 * emits a typed FRAME here. The edge (MycoBrain MDP → Jetson with ouster-sdk / CSI→DensePose / YOLO)
 * decodes raw sensor data and ships these frames; the browser just renders them (no Ouster/CSI math
 * in the front-end). Point clouds and RF tensors travel as FLAT TYPED ARRAYS for zero-copy GPU upload
 * — never per-point objects.
 *
 * Mirrors the backend stack the research found: MINDEX telemetry.wifisense_* (incl. dense_uv DensePose),
 * MAS bluesight/adapters.py SensorAdapterRegistry, mdp_wifisense_types.h `wifisense_telemetry_v1_t`.
 */

export type SensorCapability =
  | "pointcloud" // 3D LiDAR (Ouster) / imaging-radar cloud
  | "wifisense"  // WiFi CSI → presence + DensePose (through-wall body sensing)
  | "radar"      // marine radar PPI (polar contacts)
  | "camera"     // optical (360° pano / directional optic) + detections
  | "acoustic"   // hydrophone spectrum / sonar
  | "scope"      // legacy 2D polar scope (radar/lidar fallback)
  | "environmental"; // BME688 etc.

export type SensorRefFrame = "BODY" | "ENU" | "NED" | "GEO";

export interface SensorPose {
  lat?: number; lon?: number;
  headingDeg?: number; pitchDeg?: number; rollDeg?: number;
  altM?: number; depthM?: number;
}

export interface SensorFrameBase {
  deviceId: string;
  sensorId: string;
  capability: SensorCapability;
  tMs: number;        // frame timestamp (epoch ms)
  seq: number;        // monotonically increasing per sensor
  active: boolean;    // false → STANDBY (renderers show NoFeed, never fake)
  refFrame: SensorRefFrame;
  pose?: SensorPose;
  quality?: { snrDb?: number; dropPct?: number };
  simulated?: boolean; // true → clearly-badged sim until the real edge feed lands
}

// ── Point cloud (Ouster LiDAR / imaging radar) ───────────────────────────────────────────────
export type PointColorScheme = "reflectivity" | "signal" | "range" | "near_ir" | "height";

export interface PointCloudFrame extends SensorFrameBase {
  capability: "pointcloud";
  count: number;                         // valid points (RANGE>0); drives setDrawRange
  positions: Float32Array | number[];    // [x,y,z,…] meters, sensor/body frame (X fwd, Y left, Z up)
  intensity?: Float32Array | number[];   // 0..1 per point (the chosen color field, normalized)
  colors?: Float32Array | number[];      // optional precomputed [r,g,b,…] 0..1 (edge-colored)
  colorScheme: PointColorScheme;
  maxRangeM: number;
  bounds?: { min: [number, number, number]; max: [number, number, number] };
  voxelM?: number;                       // decimation hint
  sensorModel?: string;                  // e.g. "OS0-128"
}

// ── WiFi-sense: presence (Phase 0) OR DensePose (Phase 2, through-wall body) ──────────────────
export interface WiFiPresenceDevice { id: string; rssiDbm: number; strength: number; vendor?: string; firstMs?: number; }

export interface WiFiKeypoint { part: string; x: number; y: number; conf: number; } // x,y in 0..1 frame

export interface WiFiSubject {
  id: string;
  bbox: [number, number, number, number]; // x,y,w,h in 0..1
  keypoints: WiFiKeypoint[];               // COCO-17 skeleton (DensePose-from-WiFi)
  conf: number;
  motion?: "still" | "moving" | "approaching" | "leaving";
}

export interface WiFiSenseFrame extends SensorFrameBase {
  capability: "wifisense";
  kind: "presence" | "densepose";
  devices?: WiFiPresenceDevice[];          // kind==="presence"
  subjects?: WiFiSubject[];                // kind==="densepose"
  heatmap?: { w: number; h: number; data: Float32Array | number[] }; // occupancy/CSI grid 0..1
  csiShape?: [number, number];             // [subcarriers, antennas] provenance
}

// ── Radar / camera / acoustic / scope / environmental (rounding out the union) ───────────────
export interface RadarContact { id: string; bearingDeg: number; rangeM: number; kind?: string; strength?: number; label?: string; classifiedAs?: string; }

export interface RadarFrame extends SensorFrameBase {
  capability: "radar";
  contacts: RadarContact[];
  sweepDeg?: number;
  maxRangeM: number;
  points?: Float32Array | number[]; // optional imaging-radar cloud
}

export interface CameraDetection { id: string; label: string; bbox: [number, number, number, number]; conf: number; classifiedAs?: string; }

export interface CameraFrame extends SensorFrameBase {
  capability: "camera";
  streamUrl?: string;
  mode: "mjpeg" | "hls" | "webrtc" | "snapshot" | "panorama";
  zoom?: number; bearingDeg?: number; tiltDeg?: number; fovDeg?: number;
  detections?: CameraDetection[]; // YOLO26+SAHI boxes promoted into the contract
}

export interface AcousticFrame extends SensorFrameBase {
  capability: "acoustic";
  levelDb: number;
  peakBearingDeg?: number;
  bandHz: { lo: number; hi: number };
  gainDb?: number;
  spectrum: Float32Array | number[];
  carrierKhz?: number;
  rangeM?: number;
}

export type SensorFrame = PointCloudFrame | WiFiSenseFrame | RadarFrame | CameraFrame | AcousticFrame;

/** Per-device fan-out: what a device advertises + its latest frame per capability. */
export interface DeviceSensorSnapshot {
  deviceId: string;
  deviceClass?: "aquatic" | "land" | "flying" | "edge" | "other";
  capabilities: SensorCapability[];
  frames: Partial<Record<SensorCapability, SensorFrame>>;
}
