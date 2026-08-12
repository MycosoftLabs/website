/**
 * Contract Radar ingest pipeline — validate → upsert → amendment → fit-match.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type NormalizedOpportunity,
  validateNormalizedOpportunity,
} from '@/lib/launchpad/radar/types';
import { matchTenants } from '@/lib/launchpad/radar/fit-match';

export interface IngestOutcome {
  accepted: number;
  rejected: Array<{ index: number; error: string }>;
  upsertedIds: string[];
  amendments: number;
  matchesWritten: number;
}

function rowFromRecord(rec: NormalizedOpportunity) {
  return {
    source: rec.source,
    source_id: rec.source_id,
    title: rec.title,
    agency: rec.agency ?? null,
    subagency: rec.subagency ?? null,
    instrument: rec.instrument ?? null,
    notice_type: rec.notice_type ?? null,
    posted_at: rec.posted_at ?? null,
    updated_at: rec.updated_at ?? null,
    questions_due_at: rec.questions_due_at ?? null,
    due_at: rec.due_at ?? null,
    timezone: rec.timezone ?? null,
    set_asides: rec.set_asides ?? [],
    naics: rec.naics ?? [],
    psc: rec.psc ?? [],
    official_url: rec.official_url,
    source_hash: rec.source_hash,
    normalized: rec.normalized ?? {},
    ingested_at: new Date().toISOString(),
  };
}

function fieldDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of keys) {
    if (k === 'ingested_at' || k === 'id') continue;
    const a = JSON.stringify(before[k] ?? null);
    const b = JSON.stringify(after[k] ?? null);
    if (a !== b) diff[k] = { from: before[k] ?? null, to: after[k] ?? null };
  }
  return diff;
}

export async function ingestNormalizedOpportunities(
  svc: SupabaseClient,
  records: unknown[],
): Promise<IngestOutcome> {
  const outcome: IngestOutcome = {
    accepted: 0,
    rejected: [],
    upsertedIds: [],
    amendments: 0,
    matchesWritten: 0,
  };

  const valid: NormalizedOpportunity[] = [];
  records.forEach((raw, index) => {
    const v = validateNormalizedOpportunity(raw);
    if (v.ok === false) {
      outcome.rejected.push({ index, error: v.error });
      return;
    }
    valid.push(v.record);
  });

  for (const rec of valid) {
    const { data: existing } = await svc
      .from('launchpad_opportunities')
      .select('*')
      .eq('source', rec.source)
      .eq('source_id', rec.source_id)
      .maybeSingle();

    const payload = rowFromRecord(rec);

    if (!existing) {
      const { data: inserted, error } = await svc
        .from('launchpad_opportunities')
        .insert(payload)
        .select('id')
        .single();
      if (error || !inserted) {
        outcome.rejected.push({ index: -1, error: error?.message ?? 'insert failed' });
        continue;
      }
      outcome.accepted += 1;
      outcome.upsertedIds.push(inserted.id);
      continue;
    }

    if (existing.source_hash === rec.source_hash) {
      // Idempotent no-op for identical payload
      outcome.accepted += 1;
      outcome.upsertedIds.push(existing.id);
      continue;
    }

    const diff = fieldDiff(existing as Record<string, unknown>, payload as Record<string, unknown>);
    const { data: amends } = await svc
      .from('launchpad_opportunity_amendments')
      .select('amendment_no')
      .eq('opportunity_id', existing.id)
      .order('amendment_no', { ascending: false })
      .limit(1);
    const nextNo = (amends?.[0]?.amendment_no ?? 0) + 1;

    const { error: aErr } = await svc.from('launchpad_opportunity_amendments').insert({
      opportunity_id: existing.id,
      amendment_no: nextNo,
      diff,
    });
    if (!aErr) outcome.amendments += 1;

    const { error: uErr } = await svc
      .from('launchpad_opportunities')
      .update(payload)
      .eq('id', existing.id);
    if (uErr) {
      outcome.rejected.push({ index: -1, error: uErr.message });
      continue;
    }
    outcome.accepted += 1;
    outcome.upsertedIds.push(existing.id);
  }

  if (outcome.upsertedIds.length) {
    const matches = await matchTenants(svc, [...new Set(outcome.upsertedIds)]);
    outcome.matchesWritten = matches.length;
  }

  return outcome;
}
