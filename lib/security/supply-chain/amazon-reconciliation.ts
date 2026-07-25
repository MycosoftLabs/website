// ═══════════════════════════════════════════════════════════════════════════
// Amazon Business → Supply Chain reconciliation snapshot
// ═══════════════════════════════════════════════════════════════════════════
//
// Source of truth: the Procurement Master + Finance Command Center tabs of
//   Mycosoft_Master_Sheet_TEMPLATE_RESTORED_2026-05-21v3
//   (spreadsheet 1XGS4rW6_NaiQZ_3pB0jT-W1zW6zpgEw5L5cJqCgZUvc)
// reconciled by Perplexity, Phase 1 (ASIN-anchored ledger) + Phase 2
// (device-first per-item mapping), handoff dated 2026-07-24.
//
// This is a POINT-IN-TIME snapshot of a Google Sheet, not a live read — the
// sheet remains authoritative. It exists so the compliance UI can show the
// device-vs-facilities procurement split without re-deriving it.
//
// HONESTY NOTE (carried verbatim from the Perplexity handoff, section 4):
// the accessible Amazon report is ORDER-LEVEL (order totals), not a true
// line-item report. So each item below is anchored on its ASIN, NOT on a
// specific order ID — that link is deliberately NOT asserted to avoid a
// fabricated order-to-item mapping. The order IDs are captured at the block
// level only. To finish: export Amazon's item-level report and backfill the
// per-item order ID (see `itemLevelBackfillPending`).

export type AmazonItemClass =
  | 'device-bom'   // maps to a real PM-#### BOM part → carries the purchase anchor
  | 'lab-rnd'      // lab / R&D equipment
  | 'reference'    // teardown / reference unit
  | 'facilities'   // facilities / infrastructure
  | 'misc';        // office / miscellaneous

export interface AmazonReconItem {
  item: string;
  asin: string;
  classification: AmazonItemClass;
  /** PM-#### BOM row this maps to, when device-bom; null for non-device spend. */
  pmRef: string | null;
  /** Where the spend is tracked. Non-device items stay in Finance Block N only. */
  destination: string;
  note?: string;
}

export interface AmazonReconciliation {
  /** Finance Command Center block that holds the reconciled Amazon ledger. */
  block: string;
  workbook: string;
  spreadsheetId: string;
  reconciledBy: string;
  /** ISO date of the reconciliation handoff. */
  asOf: string;
  orderCount: number;
  totalUsd: number;
  /** Order-level IDs only — NOT tied to individual items (see honesty note). */
  orderIds: string[];
  items: AmazonReconItem[];
  /** True while per-item order IDs await an Amazon item-level report export. */
  itemLevelBackfillPending: boolean;
  limitation: string;
}

export const AMAZON_RECONCILIATION: AmazonReconciliation = {
  block: 'Finance Command Center — Block N',
  workbook: 'Mycosoft_Master_Sheet_TEMPLATE_RESTORED_2026-05-21v3',
  spreadsheetId: '1XGS4rW6_NaiQZ_3pB0jT-W1zW6zpgEw5L5cJqCgZUvc',
  reconciledBy: 'Perplexity (Phase 1 ASIN ledger + Phase 2 device mapping)',
  asOf: '2026-07-24',
  orderCount: 15,
  totalUsd: 5654.78,
  orderIds: [
    '114-9973327-2127461', '114-0576035-1312266', '114-3385600-1623464',
    '114-0199913-8019450', '114-0775185-7744223', '114-1121753-8285004',
    '114-1685912-7041000', '114-4289099-5461067', '111-1906564-8037010',
    '111-5308940-9835457', '112-0358469-9325004', '112-8946216-2919415',
    '112-1838432-1893004', '112-2805358-9981830', '112-4173187-4910658',
  ],
  items: [
    {
      item: 'MyoWare 2.0 Wireless Shield', asin: 'B0CZPN3D9K', classification: 'device-bom',
      pmRef: 'PM-0014', destination: 'Procurement Master PM-0014 (Sensors/FCI) — AA/AB/AC set',
      note: 'The only Amazon line that maps to a real BOM part; electrode-probe candidate.',
    },
    {
      item: 'Shrooly Indoor Mushroom Growing', asin: 'B0F195XM47', classification: 'lab-rnd',
      pmRef: null, destination: 'Finance Block N only',
    },
    {
      item: 'X-Sense Mini Smoke Alarm', asin: 'B088KL1WTX', classification: 'reference',
      pmRef: null, destination: 'Finance Block N only', note: 'Teardown / reference unit.',
    },
    {
      item: 'Wall Mount 3D Printer Filament Storage', asin: 'B0DKJMF353', classification: 'facilities',
      pmRef: null, destination: 'Finance Block N only',
    },
    {
      item: 'HBTower Telescoping Ladder', asin: 'B0F4KJW6D2', classification: 'facilities',
      pmRef: null, destination: 'Finance Block N only',
    },
    {
      item: 'HCNT Levitating Plant Pot', asin: 'B097SFZ3R6', classification: 'misc',
      pmRef: null, destination: 'Finance Block N only',
    },
  ],
  itemLevelBackfillPending: true,
  limitation:
    'Amazon report available is order-level (order totals), not line-item. Each item is anchored on its ASIN, ' +
    'not a specific order ID, to avoid fabricating an order-to-item link. Backfill exact order IDs once the ' +
    'Amazon items report (Reports → items report) is exported.',
};

export const AMAZON_CLASS_META: Record<AmazonItemClass, { label: string; device: boolean; cls: string }> = {
  'device-bom': { label: 'Device BOM', device: true, cls: 'border-emerald-500/40 text-emerald-300' },
  'lab-rnd':    { label: 'Lab / R&D',  device: false, cls: 'border-blue-500/40 text-blue-300' },
  reference:    { label: 'Reference',  device: false, cls: 'border-slate-500/40 text-slate-300' },
  facilities:   { label: 'Facilities', device: false, cls: 'border-amber-500/40 text-amber-300' },
  misc:         { label: 'Misc',       device: false, cls: 'border-slate-500/40 text-slate-400' },
};

export const DEVICE_ITEM_COUNT = AMAZON_RECONCILIATION.items.filter((i) => i.pmRef).length;
export const NON_DEVICE_ITEM_COUNT = AMAZON_RECONCILIATION.items.length - DEVICE_ITEM_COUNT;
