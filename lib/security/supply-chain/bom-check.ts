// ═══════════════════════════════════════════════════════════════════════════
// Supply-chain BOM check engine
// ═══════════════════════════════════════════════════════════════════════════
//
// Screens a device bill-of-materials against the prohibited-source lists
// (Section 889 / FASCSA / §5949 / drone rules) and flags origin-sensitive
// components from covered foreign countries for review. Recommended in the
// Perplexity doc §8.8. NOT legal advice — findings are decision-support; a real
// prohibited-source determination requires counsel + the enacted statute text.

import {
  PROHIBITED_ENTITIES,
  COVERED_FOREIGN_COUNTRIES,
  COVERED_COMPONENT_KEYWORDS,
  type ProhibitedEntity,
} from '@/lib/security/reference/prohibited-sources';

export interface BomLine {
  component: string;
  vendor: string;
  country?: string; // country of origin/manufacture, if known
  partNumber?: string;
}

export type BomPopulation = 'complete' | 'partial' | 'none';

export interface DeviceBom {
  deviceId: string;
  deviceName: string;
  description: string;
  population: BomPopulation;
  note?: string;
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
  status: 'prohibited-source-found' | 'needs-review' | 'clear' | 'not-populated';
}

function hay(line: BomLine): string {
  return `${line.component} ${line.vendor} ${line.partNumber ?? ''}`.toLowerCase();
}

export function checkBomLine(line: BomLine): BomFinding {
  const h = hay(line);
  // 1) Direct prohibited-entity match (highest severity).
  const hit: ProhibitedEntity | undefined = PROHIBITED_ENTITIES.find((e) =>
    e.keywords.some((k) => h.includes(k))
  );
  if (hit) {
    return {
      line,
      severity: 'prohibited',
      reason: `Matches prohibited source "${hit.name}" (${hit.category}). ${hit.note}`,
      matchedEntity: hit.name,
      authority: hit.authority,
    };
  }
  // 2) Origin-sensitive: covered component category + covered foreign country.
  const country = (line.country ?? '').toLowerCase();
  const isCoveredCountry = COVERED_FOREIGN_COUNTRIES.some((c) => country.includes(c));
  const isCoveredComponent = COVERED_COMPONENT_KEYWORDS.some((k) => h.includes(k));
  if (isCoveredCountry && isCoveredComponent) {
    return {
      line,
      severity: 'review',
      reason: `Covered-category component (${line.component}) with covered-foreign-country origin (${line.country}). Review against §848/817 covered-component rules and §5949 (if semiconductor); confirm fab source.`,
      authority: 'drone-848-817',
    };
  }
  if (isCoveredCountry) {
    return {
      line,
      severity: 'review',
      reason: `Component from a covered foreign country (${line.country}). Not on a named prohibited list, but review origin for the target contract.`,
    };
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
  let status: DeviceBomResult['status'];
  if (bom.population === 'none') status = 'not-populated';
  else if (counts.prohibited > 0) status = 'prohibited-source-found';
  else if (counts.review > 0) status = 'needs-review';
  else status = 'clear';
  return { deviceId: bom.deviceId, deviceName: bom.deviceName, population: bom.population, findings, counts, status };
}

// ── Mycosoft device BOMs ────────────────────────────────────────────────────
// Seeded from known components (device memory + Psathyrella briefs). Marked
// `partial` where the full production BOM must still be entered — do NOT read a
// `clear` result on a partial BOM as a full prohibited-source clearance.

export const MYCOSOFT_DEVICE_BOMS: DeviceBom[] = [
  {
    deviceId: 'psathyrella-buoy',
    deviceName: 'Psathyrella Autonomous Marine Buoy (TAC-O)',
    description: 'Navy Underwater Warfare Center TAC-O Phase 2 platform.',
    population: 'partial',
    note: 'Known sensor/compute payload only. Enter the full production BOM (fasteners, PCBs, connectors, battery, thrusters) before relying on this for a contract determination.',
    lines: [
      { component: 'Edge compute / AI SoC', vendor: 'NVIDIA', country: 'USA/Taiwan', partNumber: 'Jetson Orin Nano' },
      { component: '30X zoom camera', vendor: 'Sony', country: 'Japan' },
      { component: 'LiDAR sensor', vendor: 'Ouster', country: 'USA' },
      { component: 'Radar module', vendor: 'TBD', country: 'TBD' },
      { component: 'LoRa radio module', vendor: 'Semtech', country: 'USA/France' },
      { component: 'Brushless thruster (x4)', vendor: 'TBD', country: 'TBD' },
    ],
  },
  {
    deviceId: 'mycobrain',
    deviceName: 'MycoBrain edge device',
    description: 'ESP32-S3 + BME688 environmental sensing node.',
    population: 'partial',
    note: 'Core MCU + sensor known. Enter full BOM before a determination.',
    lines: [
      { component: 'Microcontroller SoC', vendor: 'Espressif', country: 'China', partNumber: 'ESP32-S3' },
      { component: 'Gas/environmental sensor', vendor: 'Bosch', country: 'Germany', partNumber: 'BME688' },
    ],
  },
  {
    deviceId: 'mushroom-1',
    deviceName: 'Mushroom 1 quadruped',
    description: 'Autonomous quadruped platform.',
    population: 'none',
    note: 'BOM not yet entered. Add components to run the prohibited-source screen.',
    lines: [],
  },
  {
    deviceId: 'hyphae-1',
    deviceName: 'Hyphae 1 sensor arrays',
    description: 'Distributed sensor array platform.',
    population: 'none',
    note: 'BOM not yet entered. Add components to run the prohibited-source screen.',
    lines: [],
  },
];
