/**
 * FUSARIUM Launchpad — service-role Supabase client.
 *
 * Differs from lib/supabase/server.ts createAdminClient() on purpose: that
 * helper silently falls back to the anon client when the service key is
 * missing, which turns privileged writes into confusing RLS failures. Here a
 * missing key THROWS, loudly, at the call site.
 *
 * RULES for every caller (the document-storage.ts mistake is banned):
 *  - Service-role bypasses RLS, so every query MUST carry an explicit
 *    `.eq('tenant_id', …)` derived from a TRUSTED source (verified Stripe
 *    webhook metadata, an enrolled agent row) — never from a request body.
 *  - Only billing webhooks, opportunity ingestion, agent result intake, rule
 *    packs, waitlist ops, and BYO-key *decrypt* (ciphertext columns are not
 *    granted to authenticated) may use this client. Decrypt queries MUST
 *    `.eq('tenant_id', trustedTenantId)` from requireTenant(). User-facing
 *    routes otherwise use the session-scoped client so RLS enforces access.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createLaunchpadServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Launchpad service client unavailable: NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY must both be set. Refusing to fall back to ' +
        'the anon client.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
