/**
 * CLI: create a Launchpad tenant API key (service role).
 *
 * Usage:
 *   npx tsx scripts/launchpad/create-tenant-api-key.ts --tenant <uuid-or-slug> --name "SAM collector" --scopes ingest,read
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env/.env.local.
 * Prints plaintext once to stdout. Never commit the output.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  createApiKeyServiceRole,
  parseScopes,
  type ApiKeyScope,
} from '../../lib/launchpad/api-keys';

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
  const name = arg('name') ?? 'CLI key';
  const scopesRaw = arg('scopes') ?? 'ingest';
  if (!tenantArg) {
    console.error('Required: --tenant <uuid-or-slug>');
    process.exit(2);
  }

  const scopes = parseScopes(scopesRaw.split(',').map((s) => s.trim()));
  if (scopes.length === 0) {
    console.error('Invalid --scopes (use ingest,agent,read,admin)');
    process.exit(2);
  }

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

  const created = await createApiKeyServiceRole(svc, {
    tenantId,
    name,
    scopes: scopes as ApiKeyScope[],
  });
  if (!created.ok) {
    console.error(created.error);
    process.exit(1);
  }

  console.error('Created. Copy plaintext now — it will not be shown again.');
  console.log(
    JSON.stringify(
      {
        id: created.id,
        keyPrefix: created.keyPrefix,
        scopes: created.scopes,
        createdAt: created.createdAt,
        plaintextKey: created.plaintextKey,
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
