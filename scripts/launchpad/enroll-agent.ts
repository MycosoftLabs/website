/**
 * CLI: enroll a Local Assurance Agent credential row for a tenant.
 *
 * Usage:
 *   npx tsx scripts/launchpad/enroll-agent.ts --tenant <uuid-or-slug> --name "Lab PC" --platform windows
 *
 * Prints enrollment_token (and hmac_key if LAUNCHPAD_AGENT_ROOT_SECRET set) once.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  deriveAgentHmacKey,
  getAgentRootSecret,
  mintEnrollmentToken,
  sha256Hex,
} from '../../lib/launchpad/agent/hmac';

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
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || process.env[k] === '') process.env[k] = v;
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(2);
  }

  const tenantArg = arg('tenant');
  const name = arg('name') ?? 'Local Assurance Agent';
  const platformRaw = arg('platform');
  if (!tenantArg) {
    console.error('Required: --tenant <uuid-or-slug>');
    process.exit(2);
  }
  const platform =
    platformRaw === 'windows' || platformRaw === 'linux' || platformRaw === 'macos'
      ? platformRaw
      : null;

  const svc = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let tenantId = tenantArg;
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(tenantArg)) {
    const { data, error } = await svc
      .from('launchpad_tenants')
      .select('id, slug, name')
      .eq('slug', tenantArg)
      .maybeSingle();
    if (error || !data) {
      console.error(`Tenant slug not found: ${tenantArg}`, error?.message ?? '');
      process.exit(1);
    }
    tenantId = data.id as string;
    console.error(`Resolved slug ${tenantArg} → ${tenantId} (${data.name})`);
  }

  const enrollmentToken = mintEnrollmentToken();
  const enrollmentTokenHash = sha256Hex(enrollmentToken);
  const root = getAgentRootSecret();

  const { data: row, error } = await svc
    .from('launchpad_local_agents')
    .insert({
      tenant_id: tenantId,
      name,
      platform,
      enrollment_token_hash: enrollmentTokenHash,
      hmac_key_hash: root ? 'pending' : sha256Hex(`enroll-only:${enrollmentToken}`),
      status: 'enrolled',
    })
    .select('id, name, platform, status, created_at')
    .single();

  if (error || !row) {
    console.error(error?.message ?? 'enroll failed');
    process.exit(1);
  }

  let hmacKey: string | null = null;
  if (root) {
    hmacKey = deriveAgentHmacKey(root, row.id as string);
    await svc
      .from('launchpad_local_agents')
      .update({ hmac_key_hash: sha256Hex(hmacKey) })
      .eq('id', row.id);
  }

  await svc.from('launchpad_agent_credentials').upsert(
    {
      tenant_id: tenantId,
      agent_id: row.id,
      enroll_secret_hash: enrollmentTokenHash,
      status: 'active',
    },
    { onConflict: 'agent_id' },
  );

  await svc.from('launchpad_audit_events').insert({
    tenant_id: tenantId,
    actor_user_id: null,
    actor_type: 'service',
    action: 'local_agent.enrolled',
    entity: 'launchpad_local_agents',
    entity_id: row.id,
    payload_hash: sha256Hex(JSON.stringify({ name, platform, via: 'cli' })),
    prev_hash: 'PENDING',
    hash: 'PENDING',
  });

  console.error('Enrolled. Copy secrets now — they will not be shown again.');
  console.log(
    JSON.stringify(
      {
        agent: row,
        enrollment_token: enrollmentToken,
        hmac_key: hmacKey,
        results_auth: hmacKey
          ? 'HMAC with root OR Bearer lp_ (scope=agent)'
          : 'Create API key with scope=agent; Authorization: Bearer lp_… + X-LP-Agent-Id',
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
