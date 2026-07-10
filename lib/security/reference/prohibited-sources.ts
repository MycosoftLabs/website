// ═══════════════════════════════════════════════════════════════════════════
// Supply Chain / Made-in-America — prohibited sources (2026)
// ═══════════════════════════════════════════════════════════════════════════
//
// Source: Perplexity primary-source doc (2026-07-10), §6. REFERENCE ONLY.
// Named entities + keywords are for the BOM-check engine (see lib/security/
// supply-chain/bom-check.ts). Effective dates/citations are the doc's primaries.
//
// ⚠ VERIFY (per doc §6): the exact NDAA fiscal year / Public Law for "Section
// 817" differs across sources; the Section 5949 semiconductor prohibition takes
// effect 2027-12-23 (FAR proposed rule 2026-02-17). Confirm against enacted
// statute text before treating as authoritative.

export type ProhibitionAuthority =
  | 'section-889'
  | 'fascsa'
  | 'section-5949'
  | 'drone-848-817'
  | 'drone-asda';

export interface ProhibitedEntity {
  name: string;
  /** Lowercase match keywords (name variants, brands). */
  keywords: string[];
  category: 'telecom' | 'video-surveillance' | 'drone' | 'semiconductor';
  authority: ProhibitionAuthority;
  effectiveDate: string;
  note: string;
}

export const PROHIBITED_ENTITIES: ProhibitedEntity[] = [
  // Section 889 — telecom
  { name: 'Huawei Technologies', keywords: ['huawei'], category: 'telecom', authority: 'section-889', effectiveDate: '2019-08-13', note: 'Section 889(a)(1)(A) covered telecom equipment.' },
  { name: 'ZTE Corporation', keywords: ['zte'], category: 'telecom', authority: 'section-889', effectiveDate: '2019-08-13', note: 'Section 889(a)(1)(A) covered telecom equipment.' },
  // Section 889 — video surveillance
  { name: 'Hytera Communications', keywords: ['hytera'], category: 'video-surveillance', authority: 'section-889', effectiveDate: '2020-08-13', note: 'Section 889 covered video surveillance / public-safety radio.' },
  { name: 'Hangzhou Hikvision', keywords: ['hikvision', 'hik vision'], category: 'video-surveillance', authority: 'section-889', effectiveDate: '2020-08-13', note: 'Section 889 covered video-surveillance equipment.' },
  { name: 'Dahua Technology', keywords: ['dahua'], category: 'video-surveillance', authority: 'section-889', effectiveDate: '2020-08-13', note: 'Section 889 covered video-surveillance equipment.' },
  // Drones — Section 848/817 + American Security Drone Act
  { name: 'DJI (Da-Jiang Innovations)', keywords: ['dji', 'da-jiang', 'da jiang'], category: 'drone', authority: 'drone-848-817', effectiveDate: '2024-10-01', note: 'DJI-specific DoD contracting prohibition effective 2024-10-01; ASDA gov-wide operation ban from 2025-12-22.' },
  { name: 'Autel Robotics', keywords: ['autel'], category: 'drone', authority: 'drone-asda', effectiveDate: '2025-12-22', note: 'Covered foreign UAS entity under American Security Drone Act (verify current CSL status).' },
  // Section 5949 — semiconductors (effective 2027-12-23)
  { name: 'SMIC (Semiconductor Manufacturing International)', keywords: ['smic', 'semiconductor manufacturing international'], category: 'semiconductor', authority: 'section-5949', effectiveDate: '2027-12-23', note: 'NDAA §5949 prohibits SMIC parts in critical/NSS systems from 2027-12-23.' },
  { name: 'ChangXin Memory Technologies (CXMT)', keywords: ['cxmt', 'changxin'], category: 'semiconductor', authority: 'section-5949', effectiveDate: '2027-12-23', note: 'NDAA §5949 covered memory manufacturer.' },
  { name: 'Yangtze Memory Technologies (YMTC)', keywords: ['ymtc', 'yangtze memory'], category: 'semiconductor', authority: 'section-5949', effectiveDate: '2027-12-23', note: 'NDAA §5949 covered memory manufacturer.' },
];

/** Covered foreign countries for drone/UAS component-origin review (§848/817). */
export const COVERED_FOREIGN_COUNTRIES = ['china', 'prc', "people's republic of china", 'russia', 'iran', 'north korea', 'dprk'];

/** Component categories that echo the covered-component list under §848/817 (flight
 * controllers, radios, data-transmission, cameras, gimbals) — origin-sensitive. */
export const COVERED_COMPONENT_KEYWORDS = ['camera', 'gimbal', 'radio', 'flight controller', 'data-transmission', 'data transmission', 'transmitter', 'rf module', 'lidar', 'sensor', 'semiconductor', 'chip', 'soc', 'fpga', 'gpu'];

export const SUPPLY_CHAIN_INSTRUMENTS = [
  { instrument: 'Section 889 (Part A/B)', citation: 'FY19 NDAA / FAR 52.204-25', effectiveDate: '2019-08-13 / 2020-08-13', scope: 'Covered telecom & video-surveillance equipment (Huawei, ZTE, Hytera, Hikvision, Dahua).' },
  { instrument: 'FASCSA', citation: '41 U.S.C. §1323 / FAR 52.204-30', effectiveDate: 'In force (order-by-order)', scope: 'FASC exclusion/removal orders against covered articles/sources; DoD & DHS orders; flows to subcontracts.' },
  { instrument: 'Buy American Act', citation: '41 U.S.C. §§8301-8305 / FAR Part 25', effectiveDate: 'In force', scope: 'Preference for U.S.-manufactured end products; waivers & trade-agreement exceptions.' },
  { instrument: 'Trade Agreements Act', citation: '19 U.S.C. §2501 et seq.', effectiveDate: 'In force', scope: 'Restricts covered procurement to U.S./designated-country end products.' },
  { instrument: 'Berry Amendment', citation: '10 U.S.C. §4862', effectiveDate: 'In force', scope: 'DoD must procure specified items (food, clothing, fabrics, specialty metals, tools) from domestic sources.' },
  { instrument: 'NDAA Section 5949', citation: 'FY23 NDAA', effectiveDate: 'Effective 2027-12-23 (proposed rule 2026-02-17)', scope: 'Prohibits SMIC/CXMT/YMTC semiconductors in critical systems (NSS).' },
  { instrument: 'NDAA Section 848 / 817 (drones)', citation: 'FY20 NDAA / amending statute (VERIFY FY)', effectiveDate: '2019-12-20 / DJI ban 2024-10-01', scope: 'Covered-foreign-country UAS + covered components (flight controllers, radios, cameras, gimbals); adds Russia/Iran/NK; DJI-specific ban.' },
  { instrument: 'American Security Drone Act', citation: 'FY24 NDAA / Pub. L. 118-31', effectiveDate: 'Enacted 2023-12-22; operation ban 2025-12-22', scope: 'Gov-wide ban on procuring/operating UAS from covered foreign entities; federal-funds ban for contractors/grantees.' },
  { instrument: 'ITAR / EAR', citation: '22 CFR 120-130 / 15 CFR 730-774', effectiveDate: 'In force', scope: 'Export controls on defense articles (USML) and dual-use items; relevant to undersea sensor / autonomous-platform work.' },
];
