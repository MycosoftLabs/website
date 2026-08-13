/**
 * Psathyrella GCS — operator video filter engine.
 * ===============================================
 * Date: 2026-08-01
 *
 * Marine ops means bad light: sun glare off the water, fog, spray on the dome, near-dark. The
 * operator needs to pull detail out of a LIVE feed right now. Everything in this file is
 * DISPLAY-SIDE ONLY — it changes what this screen shows and nothing else. It does not touch the
 * sensor, the Jetson encoder, or anything recorded: a real exposure / gain / IR-cut change is a
 * camera COMMAND, not a filter. Two operators on the same feed can be running different filters.
 *
 * PERFORMANCE — this is the design decision the whole module hangs on: the output is a plain CSS
 * `filter:` string. The compositor applies it on the GPU to whatever element it is set on (an
 * <img> MJPEG frame, a <video>, or a stitched <canvas>) with ZERO per-frame JavaScript — no pixel
 * readback, no drawImage round-trip, no rAF loop. Over four 20 fps ring tiles a JS pixel pass would
 * eat the entire frame budget; this costs nothing per frame and applies uniformly to all three
 * element types. The price is that CSS offers only the primitives used below — where an adjustment
 * has no CSS primitive we approximate it and SAY SO (see gamma, sharpen, edge) rather than
 * shipping something that looks like a capability we do not have.
 */

// ── State ───────────────────────────────────────────────────────────────────

export type VideoFilterPreset = "none" | "lowlight" | "glare" | "fog" | "mono" | "highcontrast" | "thermal" | "edge";

export interface VideoFilterState {
  preset: VideoFilterPreset;
  brightness: number; // 0.2..2.5, 1 = untouched
  contrast: number; // 0.2..2.5, 1 = untouched
  saturation: number; // 0..2.5, 1 = untouched (0 = mono)
  gamma: number; // 0.4..2.2, 1 = untouched — APPROXIMATED, see gammaApprox()
  sharpen: number; // 0..1, 0 = off — APPROXIMATED (micro-contrast), see SHARPEN_CONTRAST
  invert: boolean;
  grid: boolean; // reticle/grid OVERLAY toggle — drawn by the viewer, produces no CSS here
  lowLight: boolean; // display gain for night — NOT sensor gain
}

type NumericKey = "brightness" | "contrast" | "saturation" | "gamma" | "sharpen";

/**
 * The single source of bounds. Presets, operator slider input and the CSS composer all clamp
 * through `clamp()` so a bad persisted value or a stray parseFloat can never blank the video.
 */
const LIMITS: Record<NumericKey, { min: number; max: number; def: number }> = {
  brightness: { min: 0.2, max: 2.5, def: 1 },
  contrast: { min: 0.2, max: 2.5, def: 1 },
  saturation: { min: 0, max: 2.5, def: 1 },
  gamma: { min: 0.4, max: 2.2, def: 1 },
  sharpen: { min: 0, max: 1, def: 0 },
};

function clamp(key: NumericKey, v: number): number {
  const { min, max, def } = LIMITS[key];
  if (typeof v !== "number" || !Number.isFinite(v)) return def;
  return v < min ? min : v > max ? max : v;
}

export const DEFAULT_FILTER_STATE: VideoFilterState = {
  preset: "none",
  brightness: LIMITS.brightness.def,
  contrast: LIMITS.contrast.def,
  saturation: LIMITS.saturation.def,
  gamma: LIMITS.gamma.def,
  sharpen: LIMITS.sharpen.def,
  invert: false,
  grid: false,
  lowLight: false,
};

// ── Presets ─────────────────────────────────────────────────────────────────

/**
 * Operator-facing preset list. `hint` is the tooltip and carries the honesty for the two presets
 * that could otherwise be misread as sensor capabilities we do not have.
 */
export const FILTER_PRESETS: { id: VideoFilterPreset; label: string; hint: string }[] = [
  { id: "none", label: "Off", hint: "Raw feed — no display adjustment" },
  { id: "lowlight", label: "Low Light", hint: "Display gain for dusk/night — brightens and lifts shadows (does NOT change sensor gain)" },
  { id: "glare", label: "Glare", hint: "Sun and water glare — pulls exposure down, adds contrast to recover the highlights" },
  { id: "fog", label: "Fog", hint: "Haze cut — hard contrast plus saturation to separate targets from grey" },
  { id: "mono", label: "Mono", hint: "Desaturated — read shape and motion instead of colour" },
  { id: "highcontrast", label: "Hi Contrast", hint: "Hard contrast for silhouette pickup against sky or water" },
  { id: "thermal", label: "False Colour", hint: "FALSE-COLOUR view of the VISIBLE camera — this is NOT a thermal/IR sensor and shows no heat" },
  { id: "edge", label: "Edge", hint: "Approximate edge emphasis using contrast only — not a true edge detector" },
];

/**
 * Knob values per preset. `grid` is false everywhere because a preset is an image adjustment and
 * the reticle is an overlay — callers that want to keep the operator's reticle across a preset
 * change should spread `{ ...presetState(id), grid: prev.grid }`.
 */
const PRESET_KNOBS: Record<VideoFilterPreset, Omit<VideoFilterState, "preset">> = {
  none: { brightness: 1, contrast: 1, saturation: 1, gamma: 1, sharpen: 0, invert: false, grid: false, lowLight: false },
  lowlight: { brightness: 1.1, contrast: 1.05, saturation: 0.85, gamma: 1.35, sharpen: 0.2, invert: false, grid: false, lowLight: true },
  glare: { brightness: 0.78, contrast: 1.3, saturation: 0.95, gamma: 0.8, sharpen: 0.15, invert: false, grid: false, lowLight: false },
  fog: { brightness: 0.95, contrast: 1.55, saturation: 1.35, gamma: 0.85, sharpen: 0.45, invert: false, grid: false, lowLight: false },
  mono: { brightness: 1.05, contrast: 1.15, saturation: 0, gamma: 1, sharpen: 0.2, invert: false, grid: false, lowLight: false },
  highcontrast: { brightness: 1, contrast: 1.7, saturation: 1.1, gamma: 0.9, sharpen: 0.3, invert: false, grid: false, lowLight: false },
  thermal: { brightness: 1.05, contrast: 1.25, saturation: 1, gamma: 1.1, sharpen: 0, invert: false, grid: false, lowLight: false },
  // Contrast is pushed near the ceiling and colour dropped so gradients collapse toward black/white
  // edges; invert makes those edges read as bright lines. See the convolution TODO at the bottom.
  edge: { brightness: 0.95, contrast: 2.2, saturation: 0, gamma: 0.75, sharpen: 1, invert: true, grid: false, lowLight: false },
};

export function presetState(preset: VideoFilterPreset): VideoFilterState {
  // An unknown id (stale persisted state, hand-typed URL) must degrade to the untouched image
  // rather than throwing inside a render path that is sitting over live video.
  const known = Object.prototype.hasOwnProperty.call(PRESET_KNOBS, preset);
  const id: VideoFilterPreset = known ? preset : "none";
  const k = PRESET_KNOBS[id];
  return {
    preset: id,
    brightness: clamp("brightness", k.brightness),
    contrast: clamp("contrast", k.contrast),
    saturation: clamp("saturation", k.saturation),
    gamma: clamp("gamma", k.gamma),
    sharpen: clamp("sharpen", k.sharpen),
    invert: k.invert,
    grid: k.grid,
    lowLight: k.lowLight,
  };
}

// ── Approximations (documented, never silent) ───────────────────────────────

/**
 * CSS has NO gamma primitive — there is no way to express out = in^(1/γ) in a shorthand
 * `filter:` chain. This is an APPROXIMATION, not real gamma: γ>1 (shadow lift) is emulated by
 * raising brightness and softening contrast, γ<1 by the inverse. Mid-tones move roughly the right
 * way; the highlight roll-off of a true gamma curve is NOT reproduced, so a γ=2.2 image here will
 * clip highlights that real gamma would have held. A faithful curve needs an SVG
 * feComponentTransfer (type="gamma") referenced with filter: url(#…) or a canvas/WebGL LUT — both
 * leave the free GPU shorthand path, which is why they are not used over live 20 fps video.
 */
function gammaApprox(gamma: number): { brightness: number; contrast: number } {
  const d = gamma - 1;
  return { brightness: 1 + d * 0.45, contrast: 1 - d * 0.22 };
}

/**
 * CSS has no sharpen primitive either — sharpening is a convolution (unsharp mask). What this
 * knob actually does is raise GLOBAL contrast, which reads as increased acutance on a soft marine
 * image but does not recover any real detail and will not resolve a blurred edge. It is exposed
 * because operators do reach for it and it does help on haze; it is labelled as an approximation
 * in the UI. Real sharpening arrives with the canvas pass in the TODO below.
 */
const SHARPEN_CONTRAST = 0.35;

/**
 * Night gain. This brightens the DECODED FRAME on this screen only — the sensor is still capturing
 * exactly what it was capturing, so this amplifies noise along with signal. Contrast and
 * saturation come down slightly because high-gain marine footage is chroma-noisy and flat.
 * A real low-light change is an exposure / IR-cut camera command, not this.
 */
const LOW_LIGHT_BRIGHTNESS = 1.35;
const LOW_LIGHT_CONTRAST = 0.92;
const LOW_LIGHT_SATURATION = 0.85;

// ── Composition ─────────────────────────────────────────────────────────────

const EPS = 0.005;
const near = (a: number, b: number): boolean => Math.abs(a - b) < EPS;
const num = (v: number): string => String(Math.round(v * 1000) / 1000);

/**
 * Build the CSS `filter:` value. Standard shorthand functions only — brightness / contrast /
 * saturate / sepia / hue-rotate / invert — so the same string is valid on <img>, <video> and
 * <canvas> and costs nothing per frame. Identity terms are dropped to keep the chain short, and a
 * fully-default state returns "none" so the element takes no filter path at all.
 */
export function cssFilter(s: VideoFilterState): string {
  const g = gammaApprox(clamp("gamma", s.gamma));
  const sharpen = clamp("sharpen", s.sharpen);

  const brightness = clamp("brightness", s.brightness) * g.brightness * (s.lowLight ? LOW_LIGHT_BRIGHTNESS : 1);
  const contrast = clamp("contrast", s.contrast) * g.contrast * (1 + sharpen * SHARPEN_CONTRAST) * (s.lowLight ? LOW_LIGHT_CONTRAST : 1);
  const saturation = clamp("saturation", s.saturation) * (s.lowLight ? LOW_LIGHT_SATURATION : 1);

  const chain: string[] = [];
  if (!near(brightness, 1)) chain.push(`brightness(${num(brightness)})`);
  if (!near(contrast, 1)) chain.push(`contrast(${num(contrast)})`);
  if (!near(saturation, 1)) chain.push(`saturate(${num(saturation)})`);

  if (s.preset === "thermal") {
    // FALSE COLOUR of the VISIBLE-LIGHT sensor. sepia() flattens to one hue, hue-rotate() moves
    // that hue into the blue/cyan band and saturate() pushes it; luminance still comes from the
    // ordinary RGB image. It carries NO temperature information — a hot object is not brighter
    // here, only a bright object is. The UI must keep saying so; an operator must never read this
    // as thermal imagery or call a contact off it.
    chain.push("sepia(1)", "saturate(3.2)", "hue-rotate(178deg)", "contrast(1.15)");
  }

  if (s.invert) chain.push("invert(1)");

  return chain.length ? chain.join(" ") : "none";
}

/** True when anything differs from the untouched default — drives the "FX" badge on the tile. */
export function isFilterActive(s: VideoFilterState): boolean {
  const d = DEFAULT_FILTER_STATE;
  return (
    s.preset !== d.preset ||
    !near(clamp("brightness", s.brightness), d.brightness) ||
    !near(clamp("contrast", s.contrast), d.contrast) ||
    !near(clamp("saturation", s.saturation), d.saturation) ||
    !near(clamp("gamma", s.gamma), d.gamma) ||
    !near(clamp("sharpen", s.sharpen), d.sharpen) ||
    s.invert !== d.invert ||
    s.grid !== d.grid ||
    s.lowLight !== d.lowLight
  );
}

/**
 * Short tag per preset. Deliberately NOT the operator label for `thermal` — a summary line reading
 * "THERMAL" is exactly the misread this module is trying to prevent — and `edge` keeps a "~" so
 * the approximation travels with the string into logs and screenshots.
 */
const SUMMARY_TAG: Record<VideoFilterPreset, string> = {
  none: "MANUAL",
  lowlight: "LOWLIGHT",
  glare: "GLARE",
  fog: "FOG",
  mono: "MONO",
  highcontrast: "HICON",
  thermal: "FALSECOLOR",
  edge: "EDGE~",
};

/**
 * Compact operator readout — "OFF", "LOWLIGHT", "LOWLIGHT · B1.4 C1.1 GAIN".
 *
 * Numbers are shown only where the operator has moved a knob AWAY from the selected preset, so a
 * fresh preset stays one word and a hand-tuned one shows exactly what was changed — that delta is
 * the part worth reading back over the radio or reading off a screenshot. Gain/invert/grid always
 * appear when on: high-gain noise and an inverted image change how the picture must be read, so
 * they are stated whether or not they came from the preset.
 */
export function filterSummary(s: VideoFilterState): string {
  if (!isFilterActive(s)) return "OFF";
  const base = presetState(s.preset);
  const short = (v: number): string => String(Math.round(v * 100) / 100);
  const parts: string[] = [];
  const brightness = clamp("brightness", s.brightness);
  const contrast = clamp("contrast", s.contrast);
  const saturation = clamp("saturation", s.saturation);
  const gamma = clamp("gamma", s.gamma);
  const sharpen = clamp("sharpen", s.sharpen);
  if (!near(brightness, base.brightness)) parts.push(`B${short(brightness)}`);
  if (!near(contrast, base.contrast)) parts.push(`C${short(contrast)}`);
  if (!near(saturation, base.saturation)) parts.push(`S${short(saturation)}`);
  if (!near(gamma, base.gamma)) parts.push(`G${short(gamma)}`);
  if (!near(sharpen, base.sharpen)) parts.push(`SH${short(sharpen)}`);
  if (s.lowLight) parts.push("GAIN");
  if (s.invert) parts.push("INV");
  if (s.grid) parts.push("GRID");
  const tag = SUMMARY_TAG[s.preset] ?? SUMMARY_TAG.none;
  return parts.length ? `${tag} · ${parts.join(" ")}` : tag;
}

/**
 * TODO (canvas/WebGL pass — deliberately NOT implemented here): true unsharp-mask sharpening and a
 * real Sobel/Canny edge pass are convolutions, and CSS cannot express a convolution at any
 * quality. When a canvas compositor exists for the ring tiles, add an optional convolution stage
 * there and drive it from `sharpen` and `preset === "edge"`, then drop the approximations above.
 * Until that lands these two controls stay explicit approximations and must remain labelled as
 * such in the UI — we do not ship something that presents as an edge detector and is not one.
 */
