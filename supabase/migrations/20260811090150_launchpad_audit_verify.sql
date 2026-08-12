-- FUSARIUM Launchpad — audit chain verifier.
-- The chain hash includes created_at::text exactly as Postgres rendered it, so
-- verification must recompute inside the database. SECURITY INVOKER + RLS keeps
-- it tenant-scoped; membership is asserted explicitly for a clear error.

create or replace function public.launchpad_verify_audit_chain(t uuid)
returns jsonb
language plpgsql stable
set search_path = public, extensions
as $$
declare
  rec record;
  expected_prev text := 'GENESIS';
  expected_seq bigint := 1;
  recomputed text;
  checked bigint := 0;
begin
  if not public.launchpad_is_member(t) then
    raise exception 'not a member of this tenant';
  end if;

  for rec in
    select * from public.launchpad_audit_events
    where tenant_id = t
    order by seq asc
  loop
    if rec.seq <> expected_seq or rec.prev_hash <> expected_prev then
      return jsonb_build_object('valid', false, 'checked', checked, 'first_bad_seq', rec.seq,
        'reason', 'sequence or prev-hash linkage broken');
    end if;
    recomputed := encode(extensions.digest(
      rec.prev_hash || '|' || rec.tenant_id::text || '|' || rec.seq::text || '|'
        || rec.action || '|' || coalesce(rec.entity, '') || '|'
        || coalesce(rec.entity_id, '') || '|' || coalesce(rec.payload_hash, '')
        || '|' || rec.created_at::text,
      'sha256'), 'hex');
    if recomputed <> rec.hash then
      return jsonb_build_object('valid', false, 'checked', checked, 'first_bad_seq', rec.seq,
        'reason', 'hash mismatch — event content differs from what was chained');
    end if;
    expected_prev := rec.hash;
    expected_seq := rec.seq + 1;
    checked := checked + 1;
  end loop;

  return jsonb_build_object('valid', true, 'checked', checked);
end;
$$;

revoke execute on function public.launchpad_verify_audit_chain(uuid) from anon;
grant execute on function public.launchpad_verify_audit_chain(uuid) to authenticated;
