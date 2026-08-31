// ═══════════════════════════════════════════════════════════════════════════
// MycoForge ↔ supply-chain compliance connector
// ═══════════════════════════════════════════════════════════════════════════
//
// MycoForge (mycoforge.tech619.com) — Mycosoft's inventory/crafting app — is
// backed by the shared production Supabase (project hnevnsxnhfibhbsipqvz). This
// connector lets the compliance app read MycoForge suppliers/components, screen
// every supplier against the defense prohibited-source lists, and add/remove
// suppliers with the screen enforced and every change written to
// `supply_chain_logs` — so the inventory always follows supply-chain compliance.
//
// Tables used (public schema):
//   • components        — inventory parts; carries `supplier_name`
//   • customer_vendors  — suppliers/vendors (name, type, contact, notes, ...)
//   • supply_chain_logs — audit log of supply-chain status changes

import { checkBomLine, type FindingSeverity } from './bom-check';

export interface SupplierScreen {
  severity: FindingSeverity; // 'prohibited' | 'review' | 'ok'
  reason: string;
  matchedEntity?: string;
  authority?: string;
}

export interface ScreenedSupplier {
  id: string | null; // customer_vendors.id (uuid) when present, else null
  name: string;
  type?: string | null;
  contact?: string | null;
  notes?: string | null;
  source: 'customer_vendors' | 'components';
  componentCount: number;
  categories: string[];
  screen: SupplierScreen;
  removable: boolean; // only customer_vendors rows can be removed here
}

export interface SupplyChainLogEntry {
  id: string;
  component_name: string | null;
  from_status: string | null;
  to_status: string | null;
  changed_by: string | null;
  changed_at: string | null;
  note: string | null;
}

/** Screen a supplier/vendor name (and optional country) against the prohibited
 *  source lists. Reuses the BOM-check engine on a synthetic line. */
export function screenSupplier(name: string, country?: string): SupplierScreen {
  const f = checkBomLine({ component: 'supplier', vendor: name, country });
  return { severity: f.severity, reason: f.reason, matchedEntity: f.matchedEntity, authority: f.authority };
}

/** Map a screen severity to a supply_chain_logs status token. */
export function screenToStatus(s: FindingSeverity): string {
  return s === 'prohibited' ? 'compliance_blocked' : s === 'review' ? 'compliance_review' : 'compliant';
}
