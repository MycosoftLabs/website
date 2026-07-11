// ═══════════════════════════════════════════════════════════════════════════
// Supply-chain BOM check engine — prohibited-source + Buy American Act (BAA)
// ═══════════════════════════════════════════════════════════════════════════
//
// Two compliance dimensions per device BOM:
//   1) Prohibited-source screen — Section 889 / §1260H / §5949 / drone rules
//      (named entities from prohibited-sources.ts).
//   2) Buy American Act / DFARS domestic-content — FAR 25.101 (≥65% domestic
//      component cost through 2028, 75% from 2029) + DFARS 252.225-7009
//      specialty-metals (magnets, stainless steel, titanium).
//
// The Psathyrella BOM below is the ACTUAL current build from the procurement
// runbook (psathyrella_procurement_runbook_2026-06-26.docx, PM-0099..PM-0135) —
// the buoy the Navy (NUWC TAC-O Phase 2, N66604-26-9-A00X) will assess. Not
// legal advice; a real BAA/DFARS determination requires counsel + mill certs.

import {
  PROHIBITED_ENTITIES,
  COVERED_FOREIGN_COUNTRIES,
  COVERED_COMPONENT_KEYWORDS,
  type ProhibitedEntity,
} from '@/lib/security/reference/prohibited-sources';

/** BAA bucket: A = domestic (US-made), B = COTS-exempt (US-distributed foreign),
 *  C = foreign — swap to a US-made alternate before a deliverable. */
export type BaaBucket = 'A' | 'B' | 'C' | 'unknown';

export interface BomLine {
  component: string;
  vendor: string;
  country?: string;
  partNumber?: string; // e.g. PM-0099
  qty?: number;
  extCost?: number; // extended cost for the documented build
  baaBucket?: BaaBucket;
  recommendedSwap?: string; // US-made alternate for foreign items
  specialtyMetal?: boolean; // DFARS 252.225-7009 (NdFeB magnets, 300/400 SS, Ti)
  critical?: boolean;
  note?: string;
}

export type BomPopulation = 'complete' | 'partial' | 'none';

/** Device-level BAA summary (authoritative figures from the source doc). */
export interface BaaSummary {
  floorPct: number; // 65 through 2028
  asOrderedDomesticPct: number | null;
  postSwapDomesticPct: number | null;
  totalCost: number | null;
  swapDeltaCost: number | null;
  source: string;
}

export interface DeviceBom {
  deviceId: string;
  deviceName: string;
  description: string;
  population: BomPopulation;
  note?: string;
  baa?: BaaSummary;
  lines: BomLine[];
}

export type FindingSeverity = 'prohibited' | 'review' | 'ok';

export interface BomFinding {
  line: BomLine;
  severity: FindingSeverity;
  reason: string;
  matchedEntity?: string;
  authority?: string;
}

export interface DeviceBomResult {
  deviceId: string;
  deviceName: string;
  population: BomPopulation;
  findings: BomFinding[];
  counts: { prohibited: number; review: number; ok: number };
  bucketCounts: { A: number; B: number; C: number; unknown: number };
  swapNeeded: BomLine[];
  specialtyMetalRisks: BomLine[];
  baa?: BaaSummary;
  status: 'prohibited-source-found' | 'needs-review' | 'clear' | 'not-populated';
}

function hay(line: BomLine): string {
  return `${line.component} ${line.vendor} ${line.partNumber ?? ''}`.toLowerCase();
}

export function checkBomLine(line: BomLine): BomFinding {
  const h = hay(line);
  const hit: ProhibitedEntity | undefined = PROHIBITED_ENTITIES.find((e) =>
    e.keywords.some((k) => h.includes(k))
  );
  if (hit) {
    return {
      line, severity: 'prohibited',
      reason: `Matches prohibited source "${hit.name}" (${hit.category}). ${hit.note}`,
      matchedEntity: hit.name, authority: hit.authorities.join('; '),
    };
  }
  const country = (line.country ?? '').toLowerCase();
  const isCoveredCountry = COVERED_FOREIGN_COUNTRIES.some((c) => country.includes(c));
  const isCoveredComponent = COVERED_COMPONENT_KEYWORDS.some((k) => h.includes(k));
  if (isCoveredCountry && isCoveredComponent) {
    return {
      line, severity: 'review',
      reason: `Covered-category component (${line.component}) with covered-foreign-country origin (${line.country}). Review against §848/817 covered-component rules and §5949 (if semiconductor); confirm fab source.`,
      authority: 'drone-848-817',
    };
  }
  if (isCoveredCountry) {
    return { line, severity: 'review', reason: `Component from a covered foreign country (${line.country}). Review origin for the target contract.` };
  }
  return { line, severity: 'ok', reason: 'No prohibited-source or covered-origin match.' };
}

export function checkDeviceBom(bom: DeviceBom): DeviceBomResult {
  const findings = bom.lines.map(checkBomLine);
  const counts = {
    prohibited: findings.filter((f) => f.severity === 'prohibited').length,
    review: findings.filter((f) => f.severity === 'review').length,
    ok: findings.filter((f) => f.severity === 'ok').length,
  };
  const bucketCounts = {
    A: bom.lines.filter((l) => l.baaBucket === 'A').length,
    B: bom.lines.filter((l) => l.baaBucket === 'B').length,
    C: bom.lines.filter((l) => l.baaBucket === 'C').length,
    unknown: bom.lines.filter((l) => !l.baaBucket || l.baaBucket === 'unknown').length,
  };
  const swapNeeded = bom.lines.filter((l) => l.baaBucket === 'C');
  const specialtyMetalRisks = bom.lines.filter((l) => l.specialtyMetal);

  let status: DeviceBomResult['status'];
  if (bom.population === 'none') status = 'not-populated';
  else if (counts.prohibited > 0) status = 'prohibited-source-found';
  else if (counts.review > 0 || bucketCounts.C > 0) status = 'needs-review';
  else status = 'clear';

  return {
    deviceId: bom.deviceId, deviceName: bom.deviceName, population: bom.population,
    findings, counts, bucketCounts, swapNeeded, specialtyMetalRisks, baa: bom.baa, status,
  };
}

// ── Mycosoft device BOMs ────────────────────────────────────────────────────

// Helper for compact Psathyrella line entry.
function pm(
  partNumber: string, component: string, vendor: string, country: string, qty: number,
  extCost: number, baaBucket: BaaBucket, recommendedSwap?: string,
  opts: { specialtyMetal?: boolean; critical?: boolean; note?: string } = {}
): BomLine {
  return { partNumber, component, vendor, country, qty, extCost, baaBucket, recommendedSwap, ...opts };
}

export const MYCOSOFT_DEVICE_BOMS: DeviceBom[] = [
  {
    deviceId: 'psathyrella-buoy',
    deviceName: 'Psathyrella Autonomous Marine Buoy (TAC-O)',
    description: 'NUWC TAC-O Phase 2 (N66604-26-9-A00X). Live BOM from procurement runbook 2026-06-26, 2-unit build (PM-0099..0135).',
    population: 'complete',
    note: 'As-ordered domestic content 58.6% — BELOW the 65% FAR 25.101 floor. The 14 "C" items must be swapped to US-made alternates before Unit 1 ships to NUWC (raises to ~78%). Specialty-metal items (NdFeB magnets, 316 SS) need DFARS 252.225-7009 mill certs. As-ordered BOM is acceptable for pool/bay engineering-prototype testing only.',
    baa: { floorPct: 65, asOrderedDomesticPct: 58.6, postSwapDomesticPct: 78, totalCost: 10079.86, swapDeltaCost: 1449, source: 'psathyrella_procurement_runbook_2026-06-26.docx' },
    lines: [
      // A — Propulsion & power
      pm('PM-0099', 'Underwater brushless thruster', 'Amazon (B0Dxxx)', 'China', 8, 535.92, 'C', 'Blue Robotics T200 (Torrance, CA)', { note: 'Already shipped 6/24; use for pool test only.' }),
      pm('PM-0100', 'Waveshare Solar Power Manager D', 'Amazon (Waveshare)', 'China', 2, 34.24, 'C', 'Adafruit / SparkFun Sunny Buddy'),
      pm('PM-0113', '4S LiPo 14.8V 5000mAh', 'Amazon (Zeee/Ovonic)', 'China', 4, 319.96, 'C', 'Bioenno LFP (Santa Ana, CA)', { note: 'LFP is non-flammable / Navy-friendly.' }),
      pm('PM-0114', 'BMS 4S 40A', 'Amazon (generic)', 'China', 4, 99.96, 'C', 'Bundled with Bioenno LFP'),
      pm('PM-0117', 'Buck-boost regulator 12V→5V/3.3V 5A', 'Amazon (generic)', 'China', 8, 159.92, 'C', 'Pololu D24V50F5 (Las Vegas, NV)', { note: 'US swap is CHEAPER.' }),
      pm('PM-0118', '30W marine flexible solar panel', 'Renogy', 'China', 4, 316.0, 'C', 'PowerFilm M-Series (Ames, IA)'),
      pm('PM-0119', 'MPPT 10A solar charge controller', 'Renogy Wanderer', 'China', 4, 196.0, 'C', 'Morningstar SunSaver (Newtown, PA)'),
      // B — Acoustic & sonar
      pm('PM-0103', 'Aquarian S1iM10 hydrophone', 'Aquarian Audio', 'USA (Anacortes, WA)', 4, 1300.0, 'A', undefined, { critical: true, note: 'CRITICAL PATH — fully domestic.' }),
      pm('PM-0104', 'Garmin GT54UHD-TM CHIRP transducer', 'Garmin', 'Taiwan (qualifying)', 2, 1400.0, 'B', 'Airmar B175C-PM (Milford, NH)'),
      pm('PM-0106', 'Blue Robotics Ping1D echo sounder 30m', 'Blue Robotics', 'USA (Torrance, CA)', 2, 860.0, 'A'),
      pm('PM-0111', 'Behringer UCA222 USB audio interface', 'Amazon (Behringer)', 'Germany/China', 4, 159.96, 'B', 'MOTU M2 (Cambridge, MA)'),
      // C — Sensor stack
      pm('PM-0105', 'Blue Robotics Bar30 depth/pressure sensor', 'Blue Robotics', 'USA (Torrance, CA)', 4, 320.0, 'A'),
      pm('PM-0107', 'Adafruit BNO055 9-axis IMU', 'Adafruit', 'USA assembly (Bosch, DE)', 4, 139.8, 'A'),
      pm('PM-0108', 'PNI RM3100 geomagnetic 3-axis', 'PNI Sensor', 'USA (Windsor, CA)', 4, 356.0, 'A'),
      pm('PM-0109', 'u-blox NEO-M9N GPS + antenna', 'SparkFun', 'USA assembly (u-blox, CH)', 4, 199.8, 'A'),
      pm('PM-0110', 'Atlas Scientific EC + Temp (CTD substitute)', 'Atlas Scientific', 'USA (Long Island City, NY)', 2, 238.0, 'A'),
      pm('PM-0112', 'Slamtec RPLIDAR S2L (IP65)', 'Robotshop (Slamtec)', 'China', 2, 798.0, 'C', 'DEFER to Unit 3 (not on Phase 2 SOW)', { note: 'Recommend delete for pool/bay test — saves $798.' }),
      // D — Comms
      pm('PM-0115', 'LoRa SX1276 915MHz module + breakout', 'Adafruit', 'USA assembly (Semtech, US)', 8, 159.6, 'A'),
      pm('PM-0116', '915MHz marine omni SMA antenna (8dBi)', 'Amazon (Bingfu)', 'China', 8, 279.92, 'C', 'L-com HG908U-PRO (North Andover, MA)'),
      // E — Mechanical / structural
      pm('PM-0101', 'N52 magnets + 22 AWG magnet wire', 'Amazon (AplysiaTech)', 'China', 2, 165.92, 'C', 'K&J Magnetics (Pipersville, PA)', { specialtyMetal: true, critical: true, note: 'DFARS 252.225-7009 high-perf magnet rule — NO COTS exemption. Biggest compliance risk. DO NOT install in a deliverable unit.' }),
      pm('PM-0102', 'PGN R4-2RS bearings (30 pk)', 'Amazon', 'China', 2, 45.38, 'B', 'Boca Bearing (Boynton Beach, FL)'),
      pm('PM-0122', 'West System 105 resin + 206 hardener', 'West Marine (West System)', 'USA (Bay City, MI)', 2, 89.9, 'A'),
      pm('PM-0123', 'Cable glands PG7/9/11 IP68 set', 'Amazon (generic)', 'China', 2, 37.98, 'C', 'Heyco / Sealcon (NJ / CO)', { note: 'Most common saltwater failure point — order 4× qty.' }),
      pm('PM-0126', 'Stainless 316 hardware kit M5/M6', 'Home Depot', 'Taiwan/India', 2, 69.98, 'C', 'Brighton-Best DFARS-cert 316 SS', { specialtyMetal: true }),
      pm('PM-0127', 'Buna-N O-ring assortment', 'McMaster-Carr', 'USA', 2, 39.98, 'A'),
      // F — Sealing & coatings (all US-made)
      pm('PM-0120', '3M 5200 Marine Adhesive Sealant', 'West Marine (3M)', 'USA (Maplewood, MN)', 8, 199.92, 'A'),
      pm('PM-0121', '3M 4200 Fast Cure', 'West Marine (3M)', 'USA', 4, 79.96, 'A'),
      pm('PM-0124', 'Pettit Trinidad Pro anti-fouling paint', 'West Marine (Pettit)', 'USA (Rockaway, NJ)', 4, 356.0, 'A', undefined, { note: 'Required for bay test 7/3; deferrable for pool-only.' }),
      pm('PM-0125', 'Pettit EZ-Prime 6455 primer', 'West Marine (Pettit)', 'USA', 2, 79.98, 'A'),
      // G — Wiring
      pm('PM-0128', 'Marine wire 16 AWG tinned', 'West Marine (Ancor)', 'USA (Tampa, FL)', 2, 59.98, 'A'),
      pm('PM-0129', 'Heat shrink marine adhesive-lined (200 pc)', 'Amazon (TYUMEN)', 'China', 2, 29.98, 'C', '3M EPS-300 (Maplewood, MN)'),
      pm('PM-0130', 'Dielectric grease + corrosion inhibitor', 'Home Depot (Permatex)', 'USA (Solon, OH)', 2, 19.98, 'A'),
      // H — Mooring & flotation
      pm('PM-0131', 'Stainless 316 chain 5/16" (20 ft)', 'West Marine', 'Varies (request cert)', 4, 316.0, 'C', 'Suncor Stainless US-melt (North Kingstown, RI)', { specialtyMetal: true }),
      pm('PM-0132', '3/4" polypropylene mooring line (50 ft)', 'Home Depot', 'USA/Mexico (USMCA)', 4, 159.96, 'B', 'Samson Rope (Ferndale, WA)'),
      pm('PM-0133', 'Mushroom anchor 25 lb (galvanized)', 'West Marine (Greenfield)', 'USA', 4, 196.0, 'A', undefined, { specialtyMetal: true, note: 'Galvanized steel — request US-melt cert.' }),
      pm('PM-0134', 'Marine swivel + 1/2" shackle (316 SS)', 'West Marine (Crosby)', 'USA (Tulsa, OK) w/ cert', 4, 139.96, 'A', undefined, { specialtyMetal: true }),
      pm('PM-0135', 'Foam float collar (high-density EPE)', 'West Marine (Taylor Made)', 'USA (Gloversville, NY)', 8, 119.92, 'A'),
    ],
  },
  {
    deviceId: 'mycobrain',
    deviceName: 'MycoBrain controller (dual ESP32-S3 + LoRa)',
    description: 'Shared controller board across the fleet. Reference BOM from Hardware Portfolio v3 (§2.1.2).',
    population: 'partial',
    note: 'Portfolio-reference BOM (not a live procurement sheet). Core silicon is Espressif ESP32-S3 (China-origin SoC) — flagged for review; not a §889/§1260H named entity, but note origin for a defense deliverable.',
    lines: [
      { component: 'Microcontroller SoC ×2 (Side-A + Side-B)', vendor: 'Espressif', country: 'China', partNumber: 'ESP32-S3-WROOM-1', baaBucket: 'C' },
      { component: 'LoRa transceiver', vendor: 'Semtech', country: 'USA (designed)', partNumber: 'SX1262', baaBucket: 'A' },
      { component: 'Onboard gas/environmental sensor ×2', vendor: 'Bosch', country: 'Germany (qualifying)', partNumber: 'BME688', baaBucket: 'B' },
      { component: '4-layer PCB', vendor: 'JLCPCB / PCBWay', country: 'China', baaBucket: 'C', recommendedSwap: 'US PCB fab (e.g. OSH Park, Advanced Circuits)' },
    ],
  },
  {
    deviceId: 'mushroom-1',
    deviceName: 'Mushroom 1 quadruped',
    description: 'Walking ground droid. Reference BOM from Hardware Portfolio v3 (§3.1.3).',
    population: 'partial',
    note: 'Portfolio-reference only — no live procurement sheet yet. Unitree (China-based quadruped maker) is on the DoD §1260H list: a category risk signal, though Mushroom 1 uses its own components. Enter the real BOM to screen. Compute SoC/camera/LiDAR fab origin before any defense claim.',
    lines: [
      { component: 'Edge AI module', vendor: 'NVIDIA', country: 'USA', partNumber: 'Jetson Orin Nano 8GB', baaBucket: 'A' },
      { component: 'MycoBrain controller', vendor: 'Mycosoft', country: 'mixed (see MycoBrain BOM)', baaBucket: 'C' },
      { component: 'LiDAR (proposed)', vendor: 'Ouster REV8', country: 'USA', baaBucket: 'A' },
    ],
  },
  {
    deviceId: 'hyphae-1',
    deviceName: 'Hyphae 1 industrial I/O',
    description: 'Modular industrial edge node. Reference from Hardware Portfolio v3 (§5.2).',
    population: 'none',
    note: 'No live BOM entered. Dense-semiconductor variants carry the highest §5949 exposure (SMIC/CXMT/YMTC, eff. 2027-12-23). Note: primary enclosure is a Namunanee IP65 steel box (Amazon, China-origin) — steel enclosure = specialty-metal review for a deliverable.',
    lines: [],
  },
];
