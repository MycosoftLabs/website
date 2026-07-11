/**
 * SINE acoustic-detection display taxonomy for the GCS SINE widget.
 *
 * SINE (the full Mycosoft acoustic-ID system) classifies sound against a fixed library.
 * On the buoy the SAME detection can arrive from two sensors, and the operator must see
 * which: the underwater HYDROPHONE (domain "water") or the above-water MEMS MICROPHONES
 * (domain "air"). "ground" = seismic/structure-borne. We map each SINE sound-target to a
 * compact emoji + label so the tiny widget is readable at a glance.
 *
 * Source of truth for the class list: lib/mindex/sine-contract.ts (SINE_SOUND_TARGETS).
 */

export type SineDomain = "water" | "air" | "ground";

export const SINE_DOMAIN_META: Record<SineDomain, { label: string; sensor: string; emoji: string; tone: string }> = {
  water: { label: "Below water", sensor: "Hydrophone", emoji: "🌊", tone: "#22d3ee" },
  air: { label: "Above water", sensor: "MEMS mic", emoji: "🎙️", tone: "#38bdf8" },
  ground: { label: "Seismic", sensor: "Geophone", emoji: "〰️", tone: "#f59e0b" },
};

/** sound_target → operator-facing { label, emoji }. Mirrors SINE_SOUND_TARGETS. */
export const SINE_TARGET_META: Record<string, { label: string; emoji: string }> = {
  whale_vocalization: { label: "Whale", emoji: "🐋" },
  dolphin_clicks_whistles: { label: "Dolphin", emoji: "🐬" },
  fish_chorus: { label: "Fish chorus", emoji: "🐟" },
  bird_call_song: { label: "Bird", emoji: "🐦" },
  mammal_call: { label: "Sea mammal", emoji: "🦭" },
  amphibian_call: { label: "Amphibian", emoji: "🐸" },
  insect_stridulation: { label: "Insect", emoji: "🦗" },
  soil_bioacoustics: { label: "Soil biota", emoji: "🪱" },
  hydrophone_biologic_unknown: { label: "Unknown biologic", emoji: "🐚" },
  uav_quadcopter_rotor: { label: "Quadcopter", emoji: "🛸" },
  helicopter_rotor: { label: "Helicopter", emoji: "🚁" },
  fixed_wing_aircraft: { label: "Aircraft", emoji: "✈️" },
  air_drone_propeller: { label: "Drone prop", emoji: "🛸" },
  boat_propeller: { label: "Boat propeller", emoji: "🛥️" },
  submerged_propeller: { label: "Submerged prop", emoji: "🌀" },
  vessel_engine_hum: { label: "Vessel engine", emoji: "⚙️" },
  submarine_mechanical_hum: { label: "Submarine hum", emoji: "🚢" },
  sonar_ping: { label: "Sonar ping", emoji: "📡" },
  machinery_motor: { label: "Motor", emoji: "⚙️" },
  actuator_servo_stepper: { label: "Actuator", emoji: "🔧" },
  explosion_impulse: { label: "Explosion", emoji: "💥" },
  gunshot_or_blast: { label: "Blast", emoji: "💥" },
  impact_pressure_spike: { label: "Impact spike", emoji: "💢" },
  lightning_thunder: { label: "Thunder", emoji: "⚡" },
  rain_wind_weather: { label: "Weather", emoji: "🌧️" },
  earthquake_seismic: { label: "Earthquake", emoji: "〰️" },
  ground_surface_vibration: { label: "Ground vib", emoji: "〰️" },
  underground_soil_motion: { label: "Subsurface", emoji: "〰️" },
  water_pressure_impulse: { label: "Pressure pulse", emoji: "💢" },
  unknown_out_of_domain: { label: "Out of domain", emoji: "❓" },
  human_contested_label: { label: "Contested", emoji: "⚠️" },
};

export function describeSineTarget(target: string | null | undefined): { label: string; emoji: string } {
  if (!target) return { label: "Unknown", emoji: "❓" };
  return SINE_TARGET_META[target] ?? { label: target.replace(/_/g, " "), emoji: "🔊" };
}

/** Normalize whatever the SINE API reports for sensor/domain into our three domains. */
export function normalizeSineDomain(raw: string | null | undefined): SineDomain {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("hydro") || s.includes("water") || s.includes("subsurface") || s.includes("underwater")) return "water";
  if (s.includes("ground") || s.includes("seismic") || s.includes("geophone")) return "ground";
  return "air"; // MEMS mic / above-water default
}

/** One detection as the widget consumes it (mapped from the SINE API response). */
export interface SineDetection {
  id: string;
  target: string; // a SINE_SOUND_TARGETS value
  family?: string | null;
  domain: SineDomain;
  confidence: number; // 0..1
  count?: number; // multiple of the same thing
  atMsAgo?: number | null;
}
