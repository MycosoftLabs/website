// ═══════════════════════════════════════════════════════════════════════════
// Supply Chain / Made-in-America — prohibited sources (authoritative)
// ═══════════════════════════════════════════════════════════════════════════
//
// Source of truth: `supply-chain-prohibitions.json` (Perplexity 2026-07-12).
// Instruments, vendors, BOM advice, and known gaps load from that file; the
// BOM-check keyword list is defined explicitly here for reliable matching.

import scFile from './supply-chain-prohibitions.json';

interface RawInstrument {
  id: string;
  name: string;
  statute?: string;
  far_clause?: string;
  effective_date: string;
  scope: string;
  citation?: string;
}
interface RawVendor {
  vendor: string;
  prohibition_basis: string[];
  category: string;
  bis_entity_list_status?: string;
  verified: boolean;
}
interface RawAdvice {
  platform: string;
  advice: string;
  recommended_bom_fields: string[];
  source_bom_reference: string;
}
interface RawGap { gap: string; verified: boolean; citation: string }

const RAW = scFile as unknown as {
  instruments: RawInstrument[];
  prohibited_vendors_summary: RawVendor[];
  bom_check_advice_for_mycosoft: RawAdvice[];
  known_gaps: RawGap[];
};

export type ProhibitionAuthority =
  | 'section-889'
  | 'fascsa'
  | 'section-5949'
  | 'section-1260h'
  | 'drone-848-817'
  | 'drone-asda'
  | 'fcc-covered-list';

export interface ProhibitedEntity {
  name: string;
  keywords: string[]; // lowercase match keywords
  category: 'telecom' | 'video-surveillance' | 'drone' | 'semiconductor' | 'robotics';
  authorities: string[];
  note: string;
}

// Explicit keyword list for the BOM matcher — informed by the authoritative
// vendor summary, with reliable aliases. Unitree added: it's a China-based
// quadruped maker on the DoD §1260H list — a direct signal for the Mushroom 1
// hardware category.
export const PROHIBITED_ENTITIES: ProhibitedEntity[] = [
  { name: 'Huawei Technologies', keywords: ['huawei'], category: 'telecom', authorities: ['Section 889 Part A', 'BIS Entity List'], note: 'Named in Section 889(a)(1)(A); BIS Entity List.' },
  { name: 'ZTE Corporation', keywords: ['zte'], category: 'telecom', authorities: ['Section 889 Part A'], note: 'Named directly in Section 889; Entity List status not independently confirmed this pass.' },
  { name: 'Hytera Communications', keywords: ['hytera'], category: 'video-surveillance', authorities: ['Section 889 Part B'], note: 'Named in Section 889 Part B (video/public-safety radio).' },
  { name: 'Hangzhou Hikvision', keywords: ['hikvision', 'hik vision'], category: 'video-surveillance', authorities: ['Section 889 Part B', 'DoD §1260H', 'FCC Covered List'], note: 'Section 889 Part B; §1260H Chinese Military Companies; FCC Covered List.' },
  { name: 'Zhejiang Dahua Technology', keywords: ['dahua'], category: 'video-surveillance', authorities: ['Section 889 Part B', 'DoD §1260H', 'FCC Covered List'], note: 'Section 889 Part B; §1260H; FCC Covered List.' },
  { name: 'Da-Jiang Innovations (DJI)', keywords: ['dji', 'da-jiang', 'da jiang', 'sz dji'], category: 'drone', authorities: ['NDAA §817 (2024-10-01)', 'American Security Drone Act', 'FCC Covered List', 'BIS Entity List'], note: 'DJI-specific DoD contracting ban from 2024-10-01; ASDA gov-wide; FCC Covered List; BIS Entity List.' },
  { name: 'Autel Robotics', keywords: ['autel'], category: 'drone', authorities: ['FCC Covered List'], note: 'FCC Covered List (drone components).' },
  { name: 'SMIC (Semiconductor Manufacturing International)', keywords: ['smic', 'semiconductor manufacturing international'], category: 'semiconductor', authorities: ['NDAA §5949 (eff. 2027-12-23)', 'BIS Entity List'], note: '§5949 prohibits SMIC parts in critical/NSS systems from 2027-12-23; BIS Entity List since Dec 2020.' },
  { name: 'ChangXin Memory Technologies (CXMT)', keywords: ['cxmt', 'changxin'], category: 'semiconductor', authorities: ['NDAA §5949 (eff. 2027-12-23)', 'DoD §1260H'], note: '§5949 named; on §1260H (NOT on BIS Entity List). FAR disclosure designation PENDING.' },
  { name: 'Yangtze Memory Technologies (YMTC)', keywords: ['ymtc', 'yangtze memory'], category: 'semiconductor', authorities: ['NDAA §5949 (eff. 2027-12-23)', 'DoD §1260H'], note: '§5949 named; on §1260H (NOT on BIS Entity List). FAR disclosure designation PENDING.' },
  { name: 'Unitree Robotics', keywords: ['unitree'], category: 'robotics', authorities: ['DoD §1260H'], note: 'China-based quadruped maker on the §1260H Chinese Military Companies list — direct category signal for quadruped hardware (Mushroom 1).' },
];

/** Covered foreign countries for drone/UAS component-origin review (§848/817). */
export const COVERED_FOREIGN_COUNTRIES = ['china', 'prc', "people's republic of china", 'russia', 'iran', 'north korea', 'dprk'];

/** Component categories echoing the §848/817 covered-component list. */
export const COVERED_COMPONENT_KEYWORDS = ['camera', 'gimbal', 'radio', 'flight controller', 'data-transmission', 'data transmission', 'transmitter', 'rf module', 'lidar', 'sensor', 'semiconductor', 'chip', 'soc', 'fpga', 'gpu', 'memory', 'dram', 'nand', 'motor controller'];

export const SUPPLY_CHAIN_INSTRUMENTS = RAW.instruments.map((i) => ({
  instrument: i.name,
  citation: i.statute ?? i.far_clause ?? i.citation ?? '',
  effectiveDate: i.effective_date,
  scope: i.scope,
  href: i.citation,
}));

export const PROHIBITED_VENDORS = RAW.prohibited_vendors_summary;
export const BOM_ADVICE = RAW.bom_check_advice_for_mycosoft;
export const SUPPLY_CHAIN_GAPS = RAW.known_gaps;
