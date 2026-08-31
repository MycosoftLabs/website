import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { featureGate } from '@/lib/launchpad/entitlements';
import { WORKBOOK_STEPS } from '@/lib/launchpad/workbook/steps';
import { EDUCATION_TOPICS } from '@/lib/launchpad/education/definitions';
import { ENCLAVE_PLAYBOOKS } from '@/lib/launchpad/enclave/playbooks';
import { REPORT_TYPES } from '@/lib/launchpad/reports/tenant-reports';

export const dynamic = 'force-dynamic';

/** Machine map of every Launchpad module BFF so Claude can wire the full UI. */
export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  return NextResponse.json({
    planKey: derived.planKey,
    entitlements: derived.entitlements,
    featureGate: featureGate(derived),
    lockedVisible: true,
    lockdownNote:
      'FeatureGate is derived from billing. Demo tenant is Partner Mesh Pro via launchpad_subscriptions. Public launch locks writes by entitlement; nav stays visible.',
    modules: [
      { id: 'asa', routes: ['/readiness/controls', '/readiness/score', '/readiness/poam', '/readiness/scope', '/readiness/ssp', '/asa/indicators', '/training', '/evidence'] },
      { id: 'contractor_ops', routes: ['/company', '/company/registrations', '/company/capabilities', '/contractor/calendar', '/contractor/roles'] },
      { id: 'contract_radar', routes: ['/radar/opportunities', '/radar/opportunities/:id', '/radar/rank', '/radar/alerts'] },
      { id: 'proposals', routes: ['/proposals', '/proposals/:id'] },
      { id: 'origin_graph', routes: ['/origin-graph', '/origin-graph/replacements'] },
      { id: 'resource_graph', routes: ['/resources'] },
      { id: 'signatures', routes: ['/signatures', '/signatures/signers', '/signatures/oauth', '/signatures/:id', '/signatures/:id/remind'] },
      { id: 'advisory', routes: ['/advisory', '/advisory/booking'] },
      { id: 'enclave_bridge', routes: ['/enclave', '/enclave/playbooks'] },
      { id: 'local_agent', routes: ['/local-agent', '/local-agent/enroll', '/local-agent/results', '/local-agent/findings'] },
      { id: 'evidence_index', routes: ['/evidence'] },
      { id: 'partner_mesh', routes: ['/partner-mesh'] },
      { id: 'workbook', routes: ['/workbook'] },
      { id: 'education', routes: ['/education/definitions'] },
      { id: 'closure', routes: ['/closure'] },
      { id: 'reports', routes: ['/reports'], types: REPORT_TYPES },
      { id: 'ai', routes: ['/ai/connections', '/ai/complete', '/ai/ledger'] },
      { id: 'entitlements', routes: ['/entitlements', '/billing/state'] },
    ],
    workbookSteps: WORKBOOK_STEPS.length,
    educationTopics: EDUCATION_TOPICS.length,
    enclavePlaybooks: ENCLAVE_PLAYBOOKS.length,
  });
}
