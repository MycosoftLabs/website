/**
 * Seed Partner Mesh Pro for morgan@mycosoft.org.
 *
 * Usage (website repo root):
 *   npx tsx scripts/launchpad/seed-morgan-admin.ts
 *   npx tsx scripts/launchpad/seed-morgan-admin.ts --plan=fus_launchpad_core_monthly --new-tenant --name=FeatureGate-Core
 *
 * Default grants Partner Mesh Pro onto Morgan's existing workspace.
 * `--new-tenant` creates a second tenant so a lower plan can be exercised
 * without downgrading the seeded Pro workspace.
 *
 * Reads gitignored .env.local. Never prints secrets.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getProduct } from '../../lib/launchpad/catalog';
import { grantCatalogProductToTenant } from '../../lib/launchpad/billing/grants';
import { ensureUser } from '../../lib/launchpad/billing/provision';

const EMAIL = 'morgan@mycosoft.org';

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

const LOOKUP = argValue('plan') || 'fus_launchpad_partner_monthly';
const TENANT_NAME = argValue('name') || 'Mycosoft';
const FORCE_NEW_TENANT = process.argv.includes('--new-tenant');

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || process.env[k] === '') process.env[k] = v;
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(2);
  }

  const product = getProduct(LOOKUP);
  if (!product) {
    console.error(`Catalog missing ${LOOKUP}`);
    process.exit(2);
  }

  const svc = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const user = await ensureUser(svc, EMAIL, 'Morgan Rockcoons');

  const { data: membership } = await svc
    .from('launchpad_memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let tenantId = FORCE_NEW_TENANT ? undefined : (membership?.tenant_id as string | undefined);
  if (!tenantId) {
    const { data: created, error: rpcError } = await svc.rpc('launchpad_create_tenant_for_user', {
      p_user_id: user.id,
      p_name: TENANT_NAME,
    });
    if (rpcError || !created) {
      console.error(rpcError?.message || 'launchpad_create_tenant_for_user failed');
      process.exit(1);
    }
    tenantId = created as string;
  }

  const granted = await grantCatalogProductToTenant(svc, {
    tenantId,
    product,
    lookupKey: product.lookupKey,
    eventId: `seed-morgan:${new Date().toISOString()}`,
    customerId: null,
    subscriptionId: null,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: EMAIL,
        userCreated: user.created,
        tenantId,
        granted,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
