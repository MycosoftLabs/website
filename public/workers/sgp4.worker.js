/**
 * SGP4 Propagation Web Worker — Apr 18, 2026
 *
 * Offloads satellite position math from the main thread. Main thread stays
 * at 60 FPS even with 15k+ satellites propagating at 1 Hz.
 *
 * Protocol (via postMessage):
 *   Main → Worker
 *     { op: "load", satellites: [{noradId, line1, line2, id}] }
 *         Initialize satrec cache from TLE data.
 *     { op: "propagate", atIso: "<ISO timestamp>" }
 *         Propagate all loaded satellites to the given time. Returns
 *         { op: "positions", positions: [{id, noradId, lat, lng, altitude_km, velocity_km_s}] }
 *     { op: "clear" }
 *         Drop all loaded satrecs.
 *
 *   Worker → Main
 *     { op: "ready" }                    ← once satellite.js has loaded
 *     { op: "loaded", count: N }          ← after op=load
 *     { op: "positions", positions: [] }  ← after op=propagate
 *     { op: "error", message: "..." }     ← on any failure
 */

/* global importScripts, self, satellite */

try {
  importScripts("/workers/satellite.min.js");
} catch (e) {
  self.postMessage({ op: "error", message: "Failed to load satellite.js: " + (e && e.message) });
  // If we can't even load the lib, disable further handling
  self.onmessage = function () {};
  throw e;
}

// Keyed by id (noradId as string) → SatRec
const satrecs = new Map();

function buildSatrec(line1, line2) {
  try {
    return self.satellite.twoline2satrec(line1, line2);
  } catch (_) {
    return null;
  }
}

function propagate(atDate) {
  const results = [];
  const gmst = self.satellite.gstime(atDate);
  for (const [id, entry] of satrecs) {
    try {
      const pv = self.satellite.propagate(entry.rec, atDate);
      if (!pv || !pv.position || pv.position === false) continue;
      const geo = self.satellite.eciToGeodetic(pv.position, gmst);
      const lat = (geo.latitude * 180) / Math.PI;
      const lng = (geo.longitude * 180) / Math.PI;
      const altitude_km = geo.height;
      // Velocity magnitude in km/s from ECI velocity vector
      let velocity_km_s = 0;
      if (pv.velocity && typeof pv.velocity.x === "number") {
        const { x, y, z } = pv.velocity;
        velocity_km_s = Math.sqrt(x * x + y * y + z * z);
      }
      // Sanity checks — SGP4 can emit Infinity for decaying objects
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(altitude_km)) continue;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
      results.push({
        id,
        noradId: entry.noradId,
        lat,
        lng: ((lng + 540) % 360) - 180,
        altitude_km,
        velocity_km_s,
      });
    } catch (_) {
      // skip unpropagatable object
    }
  }
  return results;
}

self.onmessage = function (e) {
  const msg = e.data || {};
  try {
    if (msg.op === "load") {
      satrecs.clear();
      let count = 0;
      for (const sat of msg.satellites || []) {
        if (!sat || !sat.line1 || !sat.line2) continue;
        const rec = buildSatrec(sat.line1, sat.line2);
        if (!rec || rec.error) continue;
        satrecs.set(String(sat.id ?? sat.noradId), { rec, noradId: sat.noradId });
        count++;
      }
      self.postMessage({ op: "loaded", count });
      return;
    }
    if (msg.op === "propagate") {
      const at = msg.atIso ? new Date(msg.atIso) : new Date();
      const positions = propagate(at);
      self.postMessage({ op: "positions", positions, at: at.toISOString() });
      return;
    }
    if (msg.op === "clear") {
      satrecs.clear();
      self.postMessage({ op: "loaded", count: 0 });
      return;
    }
  } catch (err) {
    self.postMessage({ op: "error", message: (err && err.message) || String(err) });
  }
};

self.postMessage({ op: "ready" });
