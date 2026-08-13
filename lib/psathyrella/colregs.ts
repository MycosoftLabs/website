/**
 * COLREGs navigation-light ASPECT ENGINE — turn detected coloured lights into "is it coming at us?".
 *
 * WHY this module exists: the buoy's camera stack can tell us WHERE a light is and WHAT COLOUR it is,
 * and nothing else. The thing an operator actually needs at night is the vessel's ASPECT — which way it
 * is pointing relative to us — and that is not something a detector can label. It is a fixed geometric
 * consequence of the light-arc rules, so it belongs in a pure, inspectable, testable module rather than
 * inside a component or a model. Every conclusion here is derived from the rules quoted below; where the
 * light pattern does not determine an aspect we return "ambiguous"/"unknown" instead of the most likely
 * story. A confidently wrong aspect on this screen is a wrong maneuver.
 *
 * AUTHORITATIVE GEOMETRY — COLREGs Rule 21, enacted for US waters at 33 CFR 83.21:
 *   21(a) Masthead light  — WHITE, over the fore-and-aft centreline, unbroken arc of 225°, from right
 *                           ahead to 22.5° abaft the beam on either side.
 *   21(b) Sidelights      — GREEN on the STARBOARD side, RED on the PORT side, each an unbroken arc of
 *                           112.5°, from right ahead to 22.5° abaft the beam on its own side.
 *   21(c) Sternlight      — WHITE, unbroken arc of 135°, aft (67.5° to each side of right aft).
 *   21(d) Towing light    — YELLOW, same characteristics as the sternlight (so, the same 135° aft arc).
 *   21(e) All-round light — unbroken arc of 360°, i.e. carries NO aspect information at all.
 *
 * IMAGE CONVENTION: cx grows to the RIGHT in our view, cy grows DOWNWARD (so a smaller cy is HIGHER).
 * Units are arbitrary and only compared against each other, so callers may pass pixels or normalized
 * 0..1 coordinates without converting.
 *
 * ── SIGN DERIVATION (write it down; a reversed aspect here is a reversed maneuver) ──────────────────
 * Work in a level world frame: we sit at the origin looking along +Y, and image-x increases with world
 * +X (our right). For a hull whose forward unit vector is f = (fx, fy), her STARBOARD unit vector is
 * f rotated 90° clockwise, i.e. starboard = (fy, −fx)  [check: f = north (0,1) ⇒ starboard = (1,0) =
 * east — correct]. Her PORT vector is the negation.
 *
 *   HEAD-ON. She is ahead at (0, D) pointed at us, so f = (0, −1) and starboard = (−1, 0): her
 *   starboard side lies to our LEFT. Green marks starboard (21(b)), therefore a vessel facing us shows
 *   GREEN LEFT, RED RIGHT ⇒ green.cx < red.cx. ✔ (Sanity check against the mariner's mnemonic
 *   "green to green, red to red, perfect safety, go ahead" — two vessels meeting port-to-port each see
 *   the other's green on their own left.)
 *
 *   MIRRORED PAIR (red left of green) is NOT the head-on case reversed — it is unreachable for a single
 *   hull. It requires starboard = (1, 0), hence f = (0, 1): she points the same way we look, i.e. we are
 *   ASTERN of her. From astern we are outside both 112.5° sidelight arcs and see no sidelight at all,
 *   only the 135° sternlight. So the pattern is refused, never inverted.
 *
 *   ONE SIDELIGHT. Seeing only GREEN means her starboard faces us: starboard = (0, −1), hence f = (1, 0)
 *   = +X = toward OUR RIGHT. So GREEN ⇒ she tracks LEFT → RIGHT across our view. Seeing only RED gives
 *   port = (0, −1), hence f = (−1, 0) ⇒ she tracks RIGHT → LEFT. ✔ (Cross-check against Rule 15 as it is
 *   actually taught: "if to starboard red appear, 'tis your duty to keep clear" — a vessel on our
 *   starboard bow showing RED is the classic give-way case, and she is indeed crossing right to left.)
 */

export type NavLightColor = "red" | "green" | "white" | "yellow";

export interface NavLight {
  color: NavLightColor;
  /** Image x of the light's centre; larger = further right in OUR view. Any consistent unit. */
  cx: number;
  /** Image y of the light's centre; larger = LOWER in the frame. Optional — without it no vertical
   *  ("X over Y") reasoning is possible, so the vessel-type stacks cannot be evaluated. */
  cy?: number;
}

export type VesselAspect =
  | "approaching_head_on"
  | "crossing_right_to_left"
  | "crossing_left_to_right"
  | "departing"
  | "ambiguous"
  | "unknown";

export interface AspectResult {
  aspect: VesselAspect;
  /** Plain-English operator explanation, always populated. */
  rationale: string;
  /** COLREGs rule(s) this conclusion rests on, e.g. "Rule 21(b)". */
  basis: string;
  /** 0..1 — how strongly the light pattern supports it. NEVER overstate: single-light cases are lower. */
  confidence: number;
  /** True when the operator must verify visually (ambiguous/low light count). */
  verifyVisually: boolean;
}

/** Which COLREGs vessel-type configurations the light stack matches (Rules 23-30), best-effort. */
export interface VesselTypeHint {
  label: string;
  rule: string;
  note: string;
}

/**
 * Hard ceiling on any confidence we report. This engine reasons over a DETECTOR's output, not over
 * ground truth: a mis-coloured blob, a shore light, or a reflection all arrive looking like a nav light.
 * Nothing downstream may ever read a value from here as certainty.
 */
const MAX_CONFIDENCE = 0.9;

/** Named so the calibration is reviewable in one place rather than scattered as magic numbers. */
const CONF = {
  /** Matched sidelight pair the right way round, plus a masthead — the strongest pattern we can see. */
  headOnWithMasthead: 0.85,
  /** Matched sidelight pair, no masthead resolved (masthead may be out of the frame or undetected). */
  headOnSidelightsOnly: 0.8,
  /** One sidelight corroborated by a masthead: consistent with a genuine side-on aspect. */
  singleSidelightWithMasthead: 0.68,
  /** One sidelight alone — inherently weaker: the other sidelight may simply not have been detected. */
  singleSidelight: 0.55,
  /** White plus a yellow towing light; the towing light shares the sternlight's aft arc (Rule 21(d)). */
  sternWithTowingLight: 0.55,
  /** Sidelights present but in an order no real vessel can show us. */
  inconsistentPair: 0.25,
  /** Lights present, but of a kind that cannot fix an aspect (all-round stacks, lone white, lone yellow). */
  noAspectInformation: 0.2,
} as const;

/** Sidelights are horizontally separated; a mast stack is vertical. A pair of lights only counts as
 *  "one over the other" when their horizontal offset is small compared with their vertical offset —
 *  ratio, not absolute units, because cx/cy may be pixels or normalized. */
const VERTICAL_ALIGN_RATIO = 0.6;

/**
 * How far out of level a red/green pair may be and still be read as one vessel's two sidelights.
 *
 * Port and starboard sidelights are carried at the same height on opposite sides of the hull, so a
 * genuine pair is separated ACROSS the frame, not up and down it. 0.8 still admits roughly 39° of roll
 * plus detection jitter — far more than a powered vessel will show.
 */
const SIDELIGHT_LEVEL_RATIO = 0.8;

const NAV_LIGHT_COLORS: readonly NavLightColor[] = ["red", "green", "white", "yellow"];

/** A light we can actually reason about: a real cx, and a real cy when the caller supplied one. */
interface PlacedLight {
  color: NavLightColor;
  cx: number;
  /** null when the detector gave no vertical position — such a light can never be part of a stack. */
  cy: number | null;
}

/** A light that has BOTH coordinates, carried with its index back into the usable-light array. */
interface StackCandidate {
  index: number;
  cx: number;
  cy: number;
}

interface VerticalStack {
  /** Colours ordered TOP → BOTTOM (i.e. ascending cy), which is how COLREGs phrases "X over Y". */
  colors: NavLightColor[];
  /** Indices into the usable-light array, same order — used to exclude these from sidelight reasoning. */
  memberIndices: number[];
}

/** Exact top→bottom colour sequences from the rules. Matched WHOLE-stack only: a red-white-red RAM stack
 *  contains a "red over white" pair, and reporting that as a fishing vessel would be a speculative match. */
const STACK_PATTERNS: ReadonlyArray<{ colors: readonly NavLightColor[]; hint: VesselTypeHint }> = [
  {
    colors: ["red", "white", "red"],
    hint: {
      label: "Restricted in ability to manoeuvre (RAM)",
      rule: "Rule 27(b)(i)",
      note: "Three all-round lights in a vertical line, red-white-red. All-round lights show 360°, so this identifies what the vessel is doing but tells us nothing about which way it is pointing.",
    },
  },
  {
    colors: ["red", "red", "red"],
    hint: {
      label: "Constrained by draught (CBD)",
      rule: "Rule 28",
      note: "Three all-round red lights in a vertical line. All-round, so no aspect information. Note this signal is optional and is only shown by power-driven vessels in a narrow channel/fairway.",
    },
  },
  {
    colors: ["red", "red"],
    hint: {
      label: "Not under command (NUC)",
      rule: "Rule 27(a)(i)",
      note: "Two all-round red lights in a vertical line. All-round, so no aspect information. If she is making way she will also show sidelights and a sternlight.",
    },
  },
  {
    colors: ["green", "white"],
    hint: {
      label: "Trawling",
      rule: "Rule 26(b)(i)",
      note: "Two all-round lights in a vertical line, green over white. Gear may extend well clear of the hull.",
    },
  },
  {
    colors: ["red", "white"],
    hint: {
      label: "Fishing (other than trawling)",
      rule: "Rule 26(c)(i)",
      note: "Two all-round lights in a vertical line, red over white. Outlying gear may extend more than 150 m horizontally, marked by a separate all-round white light.",
    },
  },
  {
    colors: ["white", "red"],
    hint: {
      label: "Pilot vessel on duty",
      rule: "Rule 29(a)(i)",
      note: "Two all-round lights at or near the masthead, white over red.",
    },
  },
];

function isPlaceable(light: NavLight | null | undefined): boolean {
  // Runtime data can lie about its own type, so validate rather than trusting the annotation.
  if (!light) return false;
  if (!NAV_LIGHT_COLORS.includes(light.color)) return false;
  return typeof light.cx === "number" && Number.isFinite(light.cx);
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(MAX_CONFIDENCE, value);
}

function meanCx(lights: PlacedLight[]): number {
  let sum = 0;
  for (const l of lights) sum += l.cx;
  return sum / lights.length;
}

/** Mean cy over the lights that actually carry one; null when none do (no vertical reasoning possible). */
function meanCy(lights: PlacedLight[]): number | null {
  let sum = 0;
  let count = 0;
  for (const l of lights) {
    if (l.cy === null) continue;
    sum += l.cy;
    count += 1;
  }
  return count > 0 ? sum / count : null;
}

/**
 * Is this cluster genuinely one light above another, all the way down?
 *
 * Every ADJACENT pair (top→bottom) must be strictly separated in cy and displaced less in cx than in cy.
 *
 * WHY pairwise and not the cluster's overall spread: a bow-on vessel shows her two sidelights at the SAME
 * height either side of the hull with the masthead above them on the centreline. That triangle's total
 * horizontal spread is small next to the mast height, so an overall-spread test happily calls it a
 * "stack" — and the caller then treats the sidelights as all-round lights and discards the single most
 * important aspect in the ruleset. The sidelight pair fails the pairwise test at once (Δcy = 0), which is
 * exactly right: neither light is "over" the other.
 *
 * WHY the whole cluster is rejected rather than salvaged: salvaging means choosing which member to drop,
 * and between two lights at equal cy that choice is settled by sort order, not by evidence. An arbitrary
 * choice manufactures a wrong answer — drop the red, keep "white over green", and a vessel bearing down
 * on us bow-on is reported as a crossing contact. Declining to read a stack costs at most a type hint.
 */
function isVerticallyStacked(topDown: StackCandidate[]): boolean {
  for (let i = 1; i < topDown.length; i += 1) {
    const dCy = topDown[i].cy - topDown[i - 1].cy;
    if (!(dCy > 0)) return false; // equal height ⇒ side by side, not "X over Y"
    if (Math.abs(topDown[i].cx - topDown[i - 1].cx) > VERTICAL_ALIGN_RATIO * dCy) return false;
  }
  return true;
}

/**
 * Find groups of lights arranged vertically on one mast.
 *
 * Single-linkage clustering on cx with a tolerance derived from the scene's own vertical extent, so the
 * function is unit-agnostic. A cluster with zero vertical spread is NOT a stack — that is the signature
 * of the two sidelights sitting side by side at the same height.
 */
function findVerticalStacks(usable: PlacedLight[]): VerticalStack[] {
  // Lights with no cy are excluded outright rather than defaulted to a height: a substituted cy would
  // invent a vertical relationship, and inventing an all-round stack would suppress a real sidelight.
  const candidates: StackCandidate[] = [];
  for (let i = 0; i < usable.length; i += 1) {
    const cy = usable[i].cy;
    if (cy === null) continue;
    candidates.push({ index: i, cx: usable[i].cx, cy });
  }
  if (candidates.length < 2) return [];

  let minCy = Infinity;
  let maxCy = -Infinity;
  for (const c of candidates) {
    if (c.cy < minCy) minCy = c.cy;
    if (c.cy > maxCy) maxCy = c.cy;
  }
  const verticalSpread = maxCy - minCy;
  if (!(verticalSpread > 0)) return []; // everything at one height: nothing is "over" anything

  const tolCx = VERTICAL_ALIGN_RATIO * verticalSpread;
  const byCx = [...candidates].sort((a, b) => a.cx - b.cx);

  const clusters: StackCandidate[][] = [];
  let current: StackCandidate[] = [byCx[0]];
  for (let k = 1; k < byCx.length; k += 1) {
    if (byCx[k].cx - byCx[k - 1].cx <= tolCx) {
      current.push(byCx[k]);
    } else {
      clusters.push(current);
      current = [byCx[k]];
    }
  }
  clusters.push(current);

  const stacks: VerticalStack[] = [];
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const topDown = [...cluster].sort((a, b) => a.cy - b.cy);
    // Pairwise verticality, NOT overall spread — see isVerticallyStacked for why the difference is the
    // difference between reading a head-on approach and discarding it.
    if (!isVerticallyStacked(topDown)) continue;
    stacks.push({
      colors: topDown.map((c) => usable[c.index].color),
      memberIndices: topDown.map((c) => c.index),
    });
  }
  return stacks;
}

function sameSequence(a: readonly NavLightColor[], b: readonly NavLightColor[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Match the well-known vertical light stacks. HINTS ONLY — a matching pattern is a candidate reading of
 * the light picture, never an identification. Returns [] when nothing matches exactly.
 *
 * Requires cy on the lights that form the stack: "over" is a vertical relationship and cannot be
 * recovered from cx alone, so lights without cy are dropped and an all-cy-missing input returns [].
 */
export function inferVesselType(lights: NavLight[]): VesselTypeHint[] {
  if (!Array.isArray(lights) || lights.length < 2) return [];

  const usable: PlacedLight[] = [];
  for (const light of lights) {
    if (!isPlaceable(light)) continue;
    const cy = light.cy;
    if (typeof cy !== "number" || !Number.isFinite(cy)) continue; // no cy ⇒ cannot say what is "over" what
    usable.push({ color: light.color, cx: light.cx, cy });
  }
  // Fewer than two lights carrying a vertical position: no stack can exist, so no hint is honest here.
  if (usable.length < 2) return [];

  const hints: VesselTypeHint[] = [];
  const seen = new Set<string>();
  for (const stack of findVerticalStacks(usable)) {
    for (const pattern of STACK_PATTERNS) {
      if (!sameSequence(stack.colors, pattern.colors)) continue;
      if (seen.has(pattern.hint.label)) break;
      seen.add(pattern.hint.label);
      hints.push(pattern.hint);
      break; // patterns are mutually exclusive as whole sequences
    }
  }
  return hints;
}

/**
 * Determine the vessel's aspect from its navigation lights.
 *
 * THE KEY INFERENCE: green marks the vessel's OWN starboard side and red its OWN port side (Rule 21(b)),
 * and each sidelight only shows forward of 22.5° abaft its own beam. Seeing BOTH at once therefore means
 * we are inside both forward arcs — we are looking at her BOW, and she is pointed at us. A vessel facing
 * us has her starboard on OUR LEFT, so the pattern is green-left / red-right: green.cx < red.cx.
 *
 * The mirrored pattern (red left of green) is NOT the same situation reversed — it is geometrically
 * impossible for one vessel. It would require us to be aft of both sidelight arcs, and from there no
 * sidelight is visible at all (only the 135° sternlight). So we refuse to convert it into an aspect and
 * return "ambiguous": in practice it means mis-coloured detections, two different vessels' lights read as
 * one, or a shore light/reflection in the frame. Guessing here is exactly the failure this module exists
 * to prevent.
 */
export function inferAspect(lights: NavLight[]): AspectResult {
  const rule21 = "Rule 21 (33 CFR 83.21)";

  if (!Array.isArray(lights) || lights.length === 0) {
    return {
      aspect: "unknown",
      rationale:
        "No navigation lights were reported, so there is nothing to reason from. This is not a statement that the water is clear — an unlit or undetected vessel produces exactly this result.",
      basis: rule21,
      confidence: 0,
      verifyVisually: true,
    };
  }

  const usable: PlacedLight[] = [];
  for (const light of lights) {
    if (!isPlaceable(light)) continue;
    // cy stays null when absent — see findVerticalStacks: a light with no vertical position is simply
    // never treated as part of a mast stack, instead of being pinned to an invented height.
    const cy = typeof light.cy === "number" && Number.isFinite(light.cy) ? light.cy : null;
    usable.push({ color: light.color, cx: light.cx, cy });
  }

  if (usable.length === 0) {
    return {
      aspect: "unknown",
      rationale:
        "Lights were reported but none carried a usable colour and image position, so no bearing-order comparison is possible.",
      basis: rule21,
      confidence: 0,
      verifyVisually: true,
    };
  }

  // Lights in a vertical stack are all-round signal lights (Rules 26-28), NOT sidelights: they show 360°
  // and so are useless for aspect. Excluding them stops a RAM/NUC/fishing stack being read as a sidelight.
  const stacks = findVerticalStacks(usable);
  const stacked = new Set<number>();
  for (const stack of stacks) for (const i of stack.memberIndices) stacked.add(i);

  const freeLights = usable.filter((_l, i) => !stacked.has(i));
  const greens = freeLights.filter((l) => l.color === "green");
  const reds = freeLights.filter((l) => l.color === "red");
  const whites = freeLights.filter((l) => l.color === "white");
  const yellows = freeLights.filter((l) => l.color === "yellow");
  const hasMasthead = whites.length > 0;
  const duplicateSidelights = greens.length > 1 || reds.length > 1;

  const mastheadNote = hasMasthead
    ? " A white light is also visible, consistent with the 225° masthead light (Rule 21(a))."
    : " No white masthead light was resolved; it may be out of frame, undetected, or the vessel may be under 12 m (Rule 23(d)).";

  let result: AspectResult;

  if (greens.length > 0 && reds.length > 0) {
    const g = meanCx(greens);
    const r = meanCx(reds);
    // A real sidelight pair is LEVEL: same height, opposite sides of the hull. A coloured ALL-ROUND light
    // high on a mast (Rules 26-28) sitting to the right of a sidelight low on the hull reproduces the
    // green-left/red-right signature exactly, and without this test we would call a crossing vessel a
    // head-on approach. null = the detector gave no heights, so the test cannot be run at all.
    const gy = meanCy(greens);
    const ry = meanCy(reds);
    const isLevel = gy !== null && ry !== null ? Math.abs(gy - ry) <= SIDELIGHT_LEVEL_RATIO * Math.abs(g - r) : null;
    const levelNote =
      isLevel === null
        ? " The detector reported no vertical positions, so we could not confirm the two lights are level as a real sidelight pair must be; a coloured all-round light on a mast can imitate this pattern."
        : "";

    if (g < r && isLevel !== false) {
      result = {
        aspect: "approaching_head_on",
        rationale:
          "Both sidelights are visible with GREEN to the left of RED in our view. Green is on the vessel's starboard side and red on her port side (Rule 21(b)), so a vessel facing us shows green on our left and red on our right: we are looking at her bow and she is pointed at us." +
          mastheadNote +
          levelNote,
        basis: hasMasthead ? "Rule 21(a)-(b); Rule 14 (head-on situation)" : "Rule 21(b); Rule 14 (head-on situation)",
        confidence: hasMasthead ? CONF.headOnWithMasthead : CONF.headOnSidelightsOnly,
        // Only the fully corroborated picture — masthead resolved AND the pair confirmed level — is left
        // without a verify flag. Head-on is the aspect that triggers a mandatory turn (Rule 14), so it is
        // the last place to imply the light picture speaks for itself.
        verifyVisually: !(hasMasthead && isLevel === true),
      };
    } else if (g < r) {
      result = {
        aspect: "ambiguous",
        rationale:
          "Green appears left of red, but the two lights are separated far more vertically than horizontally, so they cannot be one vessel's sidelights — those are carried at the same height on opposite sides of the hull. This is the signature of an all-round signal light (Rules 26-28) above a sidelight, or of two different vessels. No aspect is being reported.",
        basis: "Rule 21(b); Rules 26-28",
        confidence: CONF.inconsistentPair,
        verifyVisually: true,
      };
    } else if (r < g) {
      result = {
        aspect: "ambiguous",
        rationale:
          "RED appears to the left of GREEN, which no single vessel can present. Each sidelight only shows forward of 22.5° abaft its own beam (Rule 21(b)); the only viewpoint from which the colours would swap is astern of her, and from there no sidelight is visible at all. Most likely a mis-coloured detection, two separate vessels read as one, or a shore light/reflection. No aspect is being reported.",
        basis: "Rule 21(b)-(c)",
        confidence: CONF.inconsistentPair,
        verifyVisually: true,
      };
    } else {
      result = {
        aspect: "ambiguous",
        rationale:
          "Red and green resolve to the same horizontal position, so left/right order — the entire basis for a bow aspect under Rule 21(b) — cannot be established. Likely overlapping or merged detections.",
        basis: "Rule 21(b)",
        confidence: CONF.noAspectInformation,
        verifyVisually: true,
      };
    }
  } else if (greens.length > 0) {
    result = {
      aspect: "crossing_left_to_right",
      rationale:
        "Only the GREEN sidelight is visible, so we are inside her starboard 112.5° arc and looking at her starboard side (Rule 21(b)). Her starboard faces us, so her bow points to OUR RIGHT: she is crossing from our left to our right." +
        mastheadNote +
        " Single-sidelight evidence is weak — a red sidelight that simply was not detected would change this reading entirely. Who gives way under Rule 15 also depends on her BEARING from us, which is not an input to this function.",
      basis: hasMasthead ? "Rule 21(a)-(b); Rule 15 (crossing situation)" : "Rule 21(b); Rule 15 (crossing situation)",
      confidence: hasMasthead ? CONF.singleSidelightWithMasthead : CONF.singleSidelight,
      verifyVisually: true,
    };
  } else if (reds.length > 0) {
    result = {
      aspect: "crossing_right_to_left",
      rationale:
        "Only the RED sidelight is visible, so we are inside her port 112.5° arc and looking at her port side (Rule 21(b)). Her port faces us, so her bow points to OUR LEFT: she is crossing from our right to our left." +
        mastheadNote +
        " Single-sidelight evidence is weak — a green sidelight that simply was not detected would change this reading entirely. Who gives way under Rule 15 also depends on her BEARING from us, which is not an input to this function.",
      basis: hasMasthead ? "Rule 21(a)-(b); Rule 15 (crossing situation)" : "Rule 21(b); Rule 15 (crossing situation)",
      confidence: hasMasthead ? CONF.singleSidelightWithMasthead : CONF.singleSidelight,
      verifyVisually: true,
    };
  } else if (stacks.length > 0) {
    // Coloured lights exist but every one of them is in a vertical stack, i.e. all-round signal lights.
    result = {
      aspect: "ambiguous",
      rationale:
        "The coloured lights form a vertical stack, the signature of all-round signal lights (Rules 26-28). All-round lights show 360° (Rule 21(e)), so they say what the vessel is doing but nothing about which way she is pointing, and no sidelight was resolved. Check inferVesselType() for a stack reading — it returns nothing if the sequence matches no rule.",
      basis: "Rule 21(e); Rules 26-28",
      confidence: CONF.noAspectInformation,
      verifyVisually: true,
    };
  } else if (whites.length > 0 && yellows.length > 0) {
    // Only corroborated by a light that can ONLY be seen from aft. The towing light shares the
    // sternlight's 135° arc (Rule 21(d)), so its presence is genuine aspect evidence in a way that a
    // lone white is not.
    result = {
      aspect: "departing",
      rationale:
        "White light with no sidelight, plus a yellow light. Sidelights cover 112.5° each from right ahead to 22.5° abaft the beam (Rule 21(b)); the towing light shares the sternlight's 135° aft arc (Rule 21(d), Rule 24(a)(iv)), so a yellow light is only visible from abaft her beam. Together these indicate we are astern of her and she is going away, possibly towing. Caveat: an air-cushion vessel's flashing yellow is all-round (Rule 23(b)) and would carry no aspect at all.",
      basis: "Rule 21(b)-(d); Rule 24(a)(iv)",
      confidence: CONF.sternWithTowingLight,
      verifyVisually: true,
    };
  } else if (whites.length > 0) {
    // DELIBERATELY NOT "departing". Under Annex I(22) masthead lights carry 6/5/3 nm by vessel length
    // while sidelights carry only 3/2/1 nm, so a vessel approaching bow-on routinely shows her white
    // masthead light long before either sidelight resolves. "No sidelight" is therefore just as much the
    // signature of a distant closing vessel as of a departing one, and "departing" would be laundered by
    // isClosing() into a hard `false` — an all-clear derived from a coin flip.
    result = {
      aspect: "ambiguous",
      rationale:
        "A single white light with no sidelight. This does NOT establish that she is going away. A stern aspect (the 135° sternlight, Rule 21(c)) is one reading, but a masthead light is visible up to 6 nm while sidelights carry only 1-3 nm (Annex I(22)), so a vessel approaching bow-on shows exactly this picture until she closes. It may equally be an anchor light (Rule 30), a small craft's all-round white (Rule 23(d)), or a shore light. No aspect is being reported.",
      basis: "Rule 21(b)-(c); Rule 23(d); Rule 30; Annex I(22)",
      confidence: CONF.noAspectInformation,
      verifyVisually: true,
    };
  } else if (yellows.length > 0) {
    result = {
      aspect: "ambiguous",
      rationale:
        "Only yellow light is visible. Yellow is used two ways with opposite meanings for aspect: the towing light shows aft over the sternlight's 135° arc (Rule 21(d)), while an air-cushion vessel's flashing yellow is all-round (Rule 23(b)) and carries no aspect at all. Cannot be resolved from the light picture.",
      basis: "Rule 21(d)-(e); Rule 23(b)",
      confidence: CONF.noAspectInformation,
      verifyVisually: true,
    };
  } else {
    result = {
      aspect: "unknown",
      rationale:
        "The reported lights do not correspond to any navigation-light configuration this engine can reason about, so no aspect is claimed.",
      basis: rule21,
      confidence: 0,
      verifyVisually: true,
    };
  }

  if (duplicateSidelights && result.aspect !== "unknown") {
    // More than one light of a sidelight colour outside a stack means we are probably looking at more
    // than one vessel — averaging their positions would fabricate a single contact out of two.
    return {
      ...result,
      rationale:
        result.rationale +
        " NOTE: more than one light of the same sidelight colour was detected, so this may be two or more vessels rather than one; confidence reduced accordingly.",
      confidence: clampConfidence(result.confidence * 0.7),
      verifyVisually: true,
    };
  }

  return { ...result, confidence: clampConfidence(result.confidence) };
}

/**
 * Is the range closing?
 *
 * Pure geometry over what the aspect actually establishes. The aspect tells us where the CONTACT's bow
 * points relative to us; own-ship SPEED is not an input here, so this only answers the cases the geometry
 * settles on its own and returns null for every case that genuinely needs a range rate / CPA solution.
 * Null means "not determined" and must never be rendered as "not closing".
 *
 * A `false` is only ever as good as the aspect it was handed: this function cannot see the aspect's
 * confidence, so the UI must render `false` alongside that confidence and never as a standalone
 * all-clear. (This is why a lone white light no longer yields "departing" — see inferAspect.)
 *
 * @param ownHeadingDeg   our heading, degrees true.
 * @param contactBearingDeg  true bearing to the contact, degrees.
 */
export function isClosing(ownHeadingDeg: number, contactBearingDeg: number, aspect: VesselAspect): boolean | null {
  if (!Number.isFinite(ownHeadingDeg) || !Number.isFinite(contactBearingDeg)) return null;

  // Signed relative bearing, −180..180: positive = the contact lies to starboard of our bow.
  const relativeDeg = ((contactBearingDeg - ownHeadingDeg + 540) % 360) - 180;
  const forwardOfBeam = Math.abs(relativeDeg) <= 90;

  switch (aspect) {
    case "approaching_head_on":
      // We see her bow, so her own velocity vector points at us. True whether she is ahead of us
      // (Rule 14 head-on) or coming up from astern pointed at us (Rule 13 overtaking).
      return true;
    case "departing":
      // Only definitive when she is ABAFT our beam: she is behind us showing her stern, so she is moving
      // away while our heading takes us away from her — the range opens on both accounts.
      if (!forwardOfBeam) return false;
      // Forward of our beam showing us her stern means WE are overtaking her; whether the range closes
      // depends on the speed difference, which is not supplied.
      return null;
    case "crossing_right_to_left":
    case "crossing_left_to_right":
      // A crossing contact may pass ahead or astern; that is a CPA question needing relative motion
      // (a steady bearing with decreasing range), not a single-frame aspect.
      return null;
    case "ambiguous":
    case "unknown":
    default:
      return null;
  }
}
