import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { routeCompletion } from '@/lib/launchpad/ai/router';
import { isAiProvider } from '@/lib/launchpad/ai/types';
import { creditBalance, loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { GOVERNANCE, maxPromptChars } from '@/lib/launchpad/ai/governance';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  const balance = await creditBalance(ctx.supabase, ctx.tenantId);
  const { data: ledger } = await ctx.supabase
    .from('launchpad_ai_cost_ledger')
    .select('credits_charged, byo_key, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(50);
  const rows = ledger ?? [];
  return NextResponse.json({
    creditBalance: balance,
    monthlyAllotment: derived.entitlements?.aiCreditsMonthly ?? 0,
    byoAiKey: derived.entitlements?.byoAiKey ?? true,
    recent: rows,
    governance: Object.values(GOVERNANCE).map((g) => ({
      taskType: g.taskType,
      maxCostCredits: g.maxCostCredits,
      humanReviewRequired: g.humanReviewRequired,
      version: g.version,
    })),
    note: 'Managed AI consumes credits. BYO provider calls record byo_key=true and credits_charged=0.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    taskType?: string;
    system?: string;
    user?: string;
    provider?: string;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  const system = typeof parsed.body.system === 'string' ? parsed.body.system : '';
  const user = typeof parsed.body.user === 'string' ? parsed.body.user : '';
  if (!system || !user) return jsonError(400, 'validation_error', 'system and user prompts required');
  const taskType = parsed.body.taskType || 'general';
  const maxChars = maxPromptChars(taskType);
  const submittedChars = system.length + user.length;
  if (submittedChars > maxChars) {
    return jsonError(
      413,
      'prompt_too_large',
      `Prompt is ${submittedChars} characters; max for this task is ${maxChars}. Refusing so the provider is not called and credits are not under-charged.`,
      { maxChars, submittedChars, taskType },
    );
  }
  const provider = parsed.body.provider && isAiProvider(parsed.body.provider) ? parsed.body.provider : undefined;
  const result = await routeCompletion({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    supabase: ctx.supabase,
    taskType,
    system,
    user,
    providerPreference: provider,
  });
  if (!result.ok) {
    return jsonError(result.code === 'insufficient_credits' ? 402 : 400, result.code ?? 'complete_failed', result.error ?? 'complete failed', {
      byoKey: result.byoKey,
      creditsCharged: result.creditsCharged,
    });
  }
  return NextResponse.json({
    ok: true,
    text: result.text,
    byoKey: result.byoKey,
    provider: result.provider,
    model: result.model,
    creditsCharged: result.creditsCharged,
    firewallRedactions: result.firewallRedactions,
    firewallFlags: result.firewallFlags,
  });
}
