/**
 * Maritime class ontology — the honesty layer between the Jetson's detector and the operator.
 *
 * WHY THIS FILE EXISTS
 * The buoy currently runs ultralytics yolo11n.pt, which is trained on COCO-80: an 80-class set of
 * everyday indoor/urban objects with NO maritime prior whatsoever. There is no "buoy", no "channel
 * marker", no "wake", no "swimmer" in COCO. When that model looks at a dock or at the buoy's own
 * tower it still has to emit one of its 80 labels, so it force-maps the scene onto the nearest
 * indoor noun — in the field we have observed it emitting "couch", "tv", "bottle", "toilet" and
 * "clock" from a marine camera.
 *
 * Those strings are not contacts. Painting "TOILET" next to a box on a defense operator console is
 * worse than painting nothing: it either trains the operator to ignore the detector entirely, or it
 * gets read as a real classification. This module converts a raw detector class into what the
 * operator should actually SEE, and DEMOTES anything whose label has no maritime meaning to an
 * honest "Unclassified contact" — while always preserving the raw class for audit and debugging.
 *
 * WHAT THIS MODULE DOES NOT DO
 * It does not invent information. A demoted detection is still a real box drawn on real pixels —
 * something is there. We only refuse to name it. We never upgrade a class into a more specific
 * maritime object than the detector supports (no COCO class honestly means "aid to navigation",
 * so nothing maps there — inventing a navigation mark that is not there could put a hull on rocks).
 *
 * DESIGN RULES
 *  - `group` is the operator's HANDLING LANE (what the UI colours and routes by). Pick the lane
 *    whose mishandling is least dangerous, and never let the lane assert more specificity than the
 *    raw class supports.
 *  - `plausibility` and `reason` carry the uncertainty, not the label.
 *  - "implausible" is a claim about THE LABEL ("a toilet cannot meaningfully be at sea"), never a
 *    claim that nothing is there.
 *  - Nothing is hidden by default. Hiding a real contact is the dangerous failure mode; the
 *    operator opts in to filtering (see `shouldSurface`).
 *
 * Pure module: no React, no fetch, no side effects, deterministic. `rawClass` is the `cls` field of
 * `CameraDetection` in "@/lib/fusarium/gcs/contract" (carried on every `DetectionFrame.detections`
 * entry); this file takes the bare string so it can be unit-tested without a frame.
 */

/**
 * The operator's HANDLING LANE — what the UI colours and routes by. These are internal identifiers.
 *
 * INTEGRATION RULE: never render a group id as operator-visible text. `person_in_water` is the name of
 * the lane a person detection is routed into, NOT a claim that anyone is in the water — the detector
 * cannot tell a swimmer from someone standing on a dock. Printing the raw id next to a box would
 * manufacture a man-overboard report. Render `displayLabel`; use `group` only for colour and routing.
 */
export type MaritimeGroup =
  | "vessel"
  | "person_in_water"
  | "aid_to_navigation"
  | "aerial"
  | "marine_life"
  | "hazard"
  | "environmental"
  | "signal"
  | "unknown";

export type Plausibility = "maritime" | "possible" | "implausible" | "unmapped";

export interface ClassifiedDetection {
  /** The label an operator should SEE. Never a nonsense COCO leaf. */
  displayLabel: string;
  group: MaritimeGroup;
  plausibility: Plausibility;
  /** The detector's raw class, always preserved for audit/debugging. */
  rawClass: string;
  /** True when we demoted the raw label (operator should not trust the raw class). */
  demoted: boolean;
  /** Short operator-facing reason when demoted, else null. */
  reason: string | null;
}

interface OntologyEntry {
  group: MaritimeGroup;
  label: string;
  plausibility: Plausibility;
}

/** What a demoted, meaningless-at-sea label collapses to. One shared frozen entry — see below. */
const UNCLASSIFIED_LABEL = "Unclassified contact";

const IMPLAUSIBLE_ENTRY: OntologyEntry = Object.freeze({
  group: "unknown" as MaritimeGroup,
  label: UNCLASSIFIED_LABEL,
  plausibility: "implausible" as Plausibility,
});

/**
 * COCO-80 classes that CAN correspond to something genuinely present in a coastal / dockside /
 * on-deck maritime scene. Each choice is justified inline, because a wrong label here can cause a
 * wrong maneuver.
 *
 * Keys are NORMALIZED (lower-case, single-spaced) — see `normalizeClass`.
 */
const MAPPED_ENTRIES: Record<string, OntologyEntry> = {
  // ══ NATIVE MARITIME VOCABULARY ═══════════════════════════════════════════════════════════════════
  // The backend is migrating OFF raw COCO. As of Aug 02 the Jetson runs a filtered detector that
  // REMAPS classes before we see them (COCO "boat" is emitted as "vessel"), and the durable plan is an
  // RF-DETR fine-tune with a genuinely maritime vocabulary. Those names are NOT COCO nouns, so without
  // these entries a correctly-detected vessel would fall through to "unmapped" and be shown to the
  // pilot as "Unclassified contact" — a real contact demoted to noise, the exact inverse of this
  // module's job. Keep both vocabularies mapped: the COCO table below remains the safety net for as
  // long as any COCO-derived model is in the loop.
  vessel: { group: "vessel", label: "Vessel", plausibility: "maritime" },
  ship: { group: "vessel", label: "Vessel", plausibility: "maritime" },
  sailboat: { group: "vessel", label: "Sailing vessel", plausibility: "maritime" },
  "fishing vessel": { group: "vessel", label: "Fishing vessel", plausibility: "maritime" },
  "jet ski": { group: "vessel", label: "Personal watercraft", plausibility: "maritime" },
  kayak: { group: "vessel", label: "Kayak / canoe", plausibility: "maritime" },
  "small craft": { group: "vessel", label: "Small craft", plausibility: "maritime" },
  "unknown vessel": { group: "vessel", label: "Unknown vessel", plausibility: "maritime" },
  // Aids to navigation — the class that finally lets the buoy recognise other buoys (and itself)
  // instead of calling them "bottle".
  buoy: { group: "aid_to_navigation", label: "Buoy / navigation mark", plausibility: "maritime" },
  "lateral buoy": { group: "aid_to_navigation", label: "Lateral mark", plausibility: "maritime" },
  "cardinal buoy": { group: "aid_to_navigation", label: "Cardinal mark", plausibility: "maritime" },
  lighthouse: { group: "aid_to_navigation", label: "Lighthouse", plausibility: "maritime" },
  // People in the water. Label stays cautious for the same reason as COCO "person": a detector cannot
  // tell a swimmer from someone on a dock, and "in water" would manufacture a man-overboard report.
  swimmer: { group: "person_in_water", label: "Person (possible in water)", plausibility: "maritime" },
  "person in water": { group: "person_in_water", label: "Person in water", plausibility: "maritime" },
  diver: { group: "person_in_water", label: "Diver", plausibility: "maritime" },
  // Marine life
  whale: { group: "marine_life", label: "Whale", plausibility: "maritime" },
  dolphin: { group: "marine_life", label: "Dolphin", plausibility: "maritime" },
  seal: { group: "marine_life", label: "Seal / pinniped", plausibility: "maritime" },
  shark: { group: "marine_life", label: "Shark", plausibility: "maritime" },
  turtle: { group: "marine_life", label: "Sea turtle", plausibility: "maritime" },
  // Hazards
  debris: { group: "hazard", label: "Debris", plausibility: "maritime" },
  "floating container": { group: "hazard", label: "Floating container", plausibility: "maritime" },
  "oil sheen": { group: "hazard", label: "Oil sheen", plausibility: "maritime" },
  log: { group: "hazard", label: "Log / deadhead", plausibility: "maritime" },
  // Environmental
  fire: { group: "environmental", label: "Fire", plausibility: "maritime" },
  smoke: { group: "environmental", label: "Smoke", plausibility: "maritime" },
  // Signals — these are what feed the COLREGs aspect engine (lib/psathyrella/colregs.ts).
  "nav light red": { group: "signal", label: "Nav light (red / port)", plausibility: "maritime" },
  "nav light green": { group: "signal", label: "Nav light (green / starboard)", plausibility: "maritime" },
  "nav light white": { group: "signal", label: "Nav light (white)", plausibility: "maritime" },
  flare: { group: "signal", label: "Flare", plausibility: "maritime" },
  "day shape": { group: "signal", label: "Day shape", plausibility: "maritime" },
  // Aerial
  "drone uas": { group: "aerial", label: "Drone / UAS", plausibility: "maritime" },
  helicopter: { group: "aerial", label: "Helicopter", plausibility: "maritime" },

  // ── Genuinely maritime: the noun means the same thing at sea as it does in COCO ──
  // The only COCO class that directly names a surface contact. Also fires on buoys and floats,
  // which is acceptable: both are things you must not run into.
  boat: { group: "vessel", label: "Vessel", plausibility: "maritime" },
  // Seabirds are the single most common true positive on a marine camera.
  bird: { group: "aerial", label: "Bird", plausibility: "maritime" },
  // Overflight and seaplanes are real; the noun holds at sea.
  airplane: { group: "aerial", label: "Aircraft", plausibility: "maritime" },
  // Surf/paddle boards are real, low-radar-cross-section, and a genuine collision concern in
  // coastal water. Kept in the vessel lane so it is treated as small craft, not as clutter.
  surfboard: { group: "vessel", label: "Board craft (surf/paddle)", plausibility: "maritime" },

  // ── Person ──
  // NOTE (deliberate wording): the group is the person-in-water handling lane, but the LABEL is
  // just "Person". The detector cannot distinguish someone in the water from someone standing on a
  // dock or on a nearby deck, and stamping "in water" on a bystander would manufacture a
  // man-overboard event. `plausibility: "possible"` is the channel that carries that doubt.
  // Not demoted: "person" is the one COCO class whose meaning survives the domain shift intact.
  person: { group: "person_in_water", label: "Person", plausibility: "possible" },

  // ── Water-surface candidates: put them in a lane where over-caution is the safe error ──
  // COCO "motorcycle" fires on personal watercraft and their riders. A PWC closes fast, so we
  // accept a false vessel over a missed one — but flag it as unconfirmed.
  motorcycle: { group: "vessel", label: "Possible small craft (PWC)", plausibility: "possible" },

  // ── Airborne, but ambiguous ──
  // "kite" is COCO's catch-all for small distant airborne shapes; over open water that is far more
  // often a UAV or a bird than an actual kite. Surfaced as an unidentified airborne object rather
  // than either guess.
  kite: { group: "aerial", label: "Airborne object", plausibility: "possible" },

  // ── Animals: only the silhouettes a pinniped can produce ──
  // Small/medium quadruped classes are what a seal or sea lion hauled out on a float or a dog on a
  // boat look like to COCO. We do NOT name the species. Large exotic quadrupeds (horse, cow,
  // elephant, zebra, giraffe) have no maritime silhouette analogue and stay implausible below.
  cat: { group: "marine_life", label: "Animal (unidentified)", plausibility: "possible" },
  dog: { group: "marine_life", label: "Animal (unidentified)", plausibility: "possible" },
  bear: { group: "marine_life", label: "Animal (unidentified)", plausibility: "possible" },

  // ── Floating-obstruction candidates ──
  // Round/flat floating objects are a real hazard to a small hull and a real thing a camera sees.
  "sports ball": { group: "hazard", label: "Floating object", plausibility: "possible" },
  frisbee: { group: "hazard", label: "Floating object", plausibility: "possible" },
  // Lost containers and cargo genuinely go overboard; also crew gear stowed on deck.
  suitcase: { group: "hazard", label: "Floating debris / container", plausibility: "possible" },

  // ── Lights and signage: could be a real navigation light, could be shore furniture ──
  // Kept in the "signal" lane, NOT aid_to_navigation: a lit marker and a shoreside traffic signal
  // are indistinguishable to COCO, and promoting one to a navigation aid would be a fabrication.
  "traffic light": { group: "signal", label: "Light / signal fixture", plausibility: "possible" },
  "stop sign": { group: "signal", label: "Sign / placard", plausibility: "possible" },

  // ── Dockside / pierside fixtures ──
  "fire hydrant": { group: "unknown", label: "Dockside fixture", plausibility: "possible" },
  bench: { group: "unknown", label: "Dockside fixture", plausibility: "possible" },
  "parking meter": { group: "unknown", label: "Pole-like fixture", plausibility: "possible" },

  // ── Shoreside traffic and large structures ──
  // A road, a parking lot or a working pier is inside the camera's field of view on most of our
  // deployments, so these are real objects — they are just not on the water.
  car: { group: "unknown", label: "Shoreside vehicle", plausibility: "possible" },
  bicycle: { group: "unknown", label: "Shoreside vehicle", plausibility: "possible" },
  // "truck"/"bus" also fire on a large vessel's deckhouse and on stacked containers seen broadside.
  truck: { group: "unknown", label: "Large vehicle / structure", plausibility: "possible" },
  bus: { group: "unknown", label: "Large vehicle / structure", plausibility: "possible" },
  // "train" fires on long low horizontal masses — a loaded barge, a breakwater, a container row.
  train: { group: "unknown", label: "Large low structure", plausibility: "possible" },

  // ── Small objects: mostly OUR OWN HARDWARE ──
  // LIVE FIELD NOTE: "bottle" is the class this buoy fires most often on ITSELF — the vertical
  // cylinders on the tower (antenna whips, sensor housings, the hydrophone body) read as bottles to
  // COCO. It is almost never a contact. It is still surfaced, because floating bottles/containers
  // exist, but it must never reach the operator as a named object.
  bottle: { group: "unknown", label: "Small object (unidentified)", plausibility: "possible" },
  cup: { group: "unknown", label: "Small object (unidentified)", plausibility: "possible" },
  backpack: { group: "unknown", label: "Small object (unidentified)", plausibility: "possible" },
  handbag: { group: "unknown", label: "Small object (unidentified)", plausibility: "possible" },
  // Canopy-shaped: a bimini top on a nearby boat, a beach umbrella ashore, or our own radome.
  umbrella: { group: "unknown", label: "Canopy-like object", plausibility: "possible" },
};

/**
 * COCO-80 classes with NO maritime meaning: indoor furniture, kitchen/office objects, food, land
 * sports equipment, and land-only animals. These are the force-mapped nonsense the operator must
 * never be shown. All collapse to "Unclassified contact" / group "unknown" / implausible.
 *
 * Listed explicitly (not derived) so this set is auditable at a glance.
 */
const IMPLAUSIBLE_CLASSES: readonly string[] = [
  // Furniture and household — includes the "couch"/"tv"/"toilet" the buoy is emitting today.
  "chair",
  "couch",
  "bed",
  "dining table",
  "toilet",
  "tv",
  "potted plant",
  "vase",
  "clock",
  "book",
  "teddy bear",
  "scissors",
  // Kitchen and appliances.
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "wine glass",
  "hair drier",
  "toothbrush",
  // Consumer electronics.
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  // Food.
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  // Land-only sports equipment.
  "skis",
  "snowboard",
  "skateboard",
  "baseball bat",
  "baseball glove",
  "tennis racket",
  // Apparel.
  "tie",
  // Land-only animals (no maritime silhouette analogue — see the pinniped note above).
  "horse",
  "sheep",
  "cow",
  "elephant",
  "zebra",
  "giraffe",
];

/**
 * Optional per-class context appended to the demotion reason.
 *
 * WHY: telling the operator "this label is meaningless" is only half useful; telling them what the
 * pixels are most likely to be is what stops them chasing it. These are stated as possibilities,
 * never as identifications. Kept internal (not exported) so `MARITIME_ONTOLOGY` keeps exactly the
 * shape callers wire against.
 */
const CLASS_NOTES: Record<string, string> = {
  bottle: "On this buoy it fires on the vehicle's own tower hardware; may also be floating debris.",
  cup: "Consistent with deck clutter or the buoy's own sensor housings.",
  bowl: "Round dish shapes also fire on radomes and dome nav lights — possibly our own hardware.",
  donut: "Torus shapes also fire on life rings and fenders — worth a look before dismissing.",
  clock: "Round bright discs also fire on gauges, port lights and the sun's glare disc.",
  tv: "Flat bright rectangles also fire on solar panels and hatch covers — possibly our own hardware.",
  couch: "Large soft rectangular masses fire on dock fenders, tarps and coiled line.",
  toilet: "White curved fixtures fire on hull sections, bollards and deck hardware.",
  "cell phone": "Small flat rectangles also fire on handheld radios and instrument faces.",
  keyboard: "Flat ridged rectangles also fire on deck gratings and solar panels.",
  "baseball bat": "Elongated rods also fire on boat hooks, antenna whips and oars.",
  skis: "Long paired shapes also fire on oars, paddles and pontoon hulls.",
  snowboard: "Flat board shapes also fire on hatch covers and paddleboards.",
  kite: "Distant airborne shapes are frequently UAVs or birds, not kites.",
  motorcycle: "May be a personal watercraft; treat as a closing small craft until resolved.",
  truck: "May be a large vessel's deckhouse or a stack of containers seen broadside.",
  bus: "May be a large vessel's deckhouse or a stack of containers seen broadside.",
  train: "May be a barge, a breakwater or a container row.",
  "traffic light": "May be a lit navigation marker, a shore signal, or the buoy's own nav light.",
  "stop sign": "May be a regulatory marker board or shore signage.",
  "fire hydrant": "Consistent with pierside hardware or a mooring bollard seen from the water.",
  "parking meter": "Consistent with a piling, davit or pole-mounted fixture.",
  bench: "Consistent with pier furniture or dock structure.",
  umbrella: "May be a vessel's bimini top, a shore canopy, or our own radome.",
  suitcase: "Lost containers and cargo are a real obstruction; may also be stowed deck gear.",
  "sports ball": "May be a mooring float, a fender, or debris.",
  frisbee: "May be a flat floating object or a distant bird.",
  cat: "Small quadruped silhouettes at sea are usually pinnipeds or a dog aboard a vessel.",
  dog: "Small quadruped silhouettes at sea are usually pinnipeds or a dog aboard a vessel.",
  bear: "Large quadruped silhouettes at sea are usually pinnipeds hauled out on a float.",
  car: "Consistent with shoreline road traffic inside the camera's field of view.",
  bicycle: "Consistent with shoreline traffic inside the camera's field of view.",
  backpack: "May be stowed deck gear or floating debris.",
  handbag: "May be stowed deck gear or floating debris.",
};

/**
 * Raw detector class → maritime meaning. Keys are normalized (lower-case, single-spaced).
 *
 * Grounded in the COCO-80 label set that yolo11n.pt emits. Classes absent from this table are
 * treated as "unmapped" by `classifyDetection` — never as a guess.
 */
export const MARITIME_ONTOLOGY: Readonly<Record<string, Readonly<OntologyEntry>>> = Object.freeze(
  Object.fromEntries(
    // Entries are frozen individually as well as the table: this object decides the words an operator
    // reads, so it must not be mutable from anywhere downstream. The `Readonly<OntologyEntry>` value
    // type makes an attempted write a compile error rather than a runtime throw mid-mission.
    [
      ...Object.entries(MAPPED_ENTRIES).map(([cls, entry]): [string, OntologyEntry] => [cls, Object.freeze(entry)]),
      ...IMPLAUSIBLE_CLASSES.map((cls): [string, OntologyEntry] => [cls, IMPLAUSIBLE_ENTRY]),
    ],
  ),
);

/**
 * Normalize a raw class for lookup.
 *
 * WHY the separator collapse: the same COCO class reaches us as "traffic light", "traffic_light" or
 * "Traffic-Light" depending on which side of the Jetson pipeline serialized it. A lookup miss would
 * silently demote a mapped class to "unmapped", so we fold case, trim, and treat "_" and "-" as
 * spaces before matching.
 */
function normalizeClass(raw: string): string {
  return raw.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/** Build the operator-facing demotion reason. Quotes the raw class verbatim so it stays auditable. */
function buildReason(raw: string, plausibility: Plausibility, note: string | undefined): string {
  const head =
    plausibility === "implausible"
      ? `detector reported "${raw}" — an indoor/land class with no maritime meaning; likely a mis-mapped object`
      : plausibility === "unmapped"
        ? `detector reported "${raw}" — not in the maritime ontology; class meaning unverified`
        : `detector reported "${raw}" — not a confirmed maritime contact; may be buoy hardware or dockside clutter`;
  return note ? `${head}. ${note}` : `${head}.`;
}

/**
 * Map a raw detector class to what the operator should see.
 *
 * Never throws, never returns a fabricated identification, and always preserves `rawClass`.
 */
export function classifyDetection(rawClass: string): ClassifiedDetection {
  // Defensive: `cls` is typed string on the contract, but it arrives over the wire from the Jetson
  // and a malformed frame must degrade to "unknown", not crash an operator console mid-mission.
  // Aliased through `unknown` so the runtime checks below are not narrowed away by the declared type.
  const incoming: unknown = rawClass;
  // Numbers and booleans have a faithful textual form, so keep it: `rawClass` is the audit field, and
  // collapsing a malformed value to "" would erase the evidence of what the detector actually sent.
  const raw =
    typeof incoming === "string"
      ? incoming
      : typeof incoming === "number" || typeof incoming === "boolean"
        ? String(incoming)
        : "";
  const key = normalizeClass(raw);

  if (key.length === 0) {
    return {
      displayLabel: UNCLASSIFIED_LABEL,
      group: "unknown",
      plausibility: "unmapped",
      rawClass: raw,
      demoted: true,
      // Objects/arrays/symbols have no honest textual form, so we record the TYPE rather than invent a
      // value — an operator reviewing the log must be able to tell a malformed frame from a blank label.
      reason:
        typeof incoming === "string"
          ? "detector reported an empty class string — nothing to classify."
          : `detector reported a non-string class value (${typeof incoming}) — malformed detection frame; nothing to classify.`,
    };
  }

  const entry = MARITIME_ONTOLOGY[key];
  if (!entry) {
    return {
      displayLabel: UNCLASSIFIED_LABEL,
      group: "unknown",
      plausibility: "unmapped",
      rawClass: raw,
      demoted: true,
      reason: buildReason(raw, "unmapped", undefined),
    };
  }

  // Demoted whenever the operator should not take the raw class at face value. Only the four
  // genuinely maritime classes survive undemoted, plus "person" (see the note on that entry).
  const demoted = entry.plausibility !== "maritime" && !(key === "person");

  return {
    displayLabel: entry.label,
    group: entry.group,
    plausibility: entry.plausibility,
    rawClass: raw,
    demoted,
    reason: demoted ? buildReason(raw, entry.plausibility, CLASS_NOTES[key]) : null,
  };
}

/**
 * Overlay stroke colour per handling lane.
 *
 * Warm ramp for things you can hit or must rescue (yellow → orange → red), cool/distinct hues for
 * everything else, and a deliberately DESATURATED slate for "unknown" so an unclassified contact
 * never reads as an identified one at a glance.
 */
const GROUP_COLORS: Record<MaritimeGroup, string> = {
  person_in_water: "#ef4444", // red-500 — life safety, highest visual priority
  hazard: "#f97316", // orange-500 — obstruction / something you can hit
  vessel: "#facc15", // yellow-400 — traffic
  aerial: "#38bdf8", // sky-400
  marine_life: "#34d399", // emerald-400
  aid_to_navigation: "#a78bfa", // violet-400
  signal: "#e879f9", // fuchsia-400
  environmental: "#a3e635", // lime-400
  unknown: "#94a3b8", // slate-400 — muted on purpose
};

/** Tailwind-palette hex for a group's overlay stroke. Falls back to the muted unknown colour. */
export function groupColor(group: MaritimeGroup): string {
  return GROUP_COLORS[group] ?? GROUP_COLORS.unknown;
}

/**
 * Whether the UI should draw a box for this detection at all.
 *
 * Default is to surface EVERYTHING: hiding a real contact is the dangerous failure mode, and a
 * demoted box still marks real pixels. `hideImplausible` is an operator-driven declutter for the
 * indoor-nonsense classes only.
 *
 * "unmapped" is intentionally NOT hidden by that flag — an unrecognised string is how a genuinely
 * new maritime class (from a maritime-trained model) would first arrive, and suppressing it would
 * hide exactly the detections we are trying to move toward.
 */
export function shouldSurface(c: ClassifiedDetection, opts?: { hideImplausible?: boolean }): boolean {
  if (!c) return false;
  if (opts?.hideImplausible && c.plausibility === "implausible") return false;
  return true;
}
