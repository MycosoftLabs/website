-- ============================================================================
-- FUSARIUM Launchpad — RLS self-test
-- ============================================================================
-- Proves cross-tenant isolation without needing a second real login session:
-- seeds two tenants owned by two different existing auth users, impersonates
-- user 1 via `set local role authenticated` + `request.jwt.claims`, and asserts
-- that tenant 2's rows are invisible. Everything rolls back.
--
-- Run after EVERY launchpad migration (Supabase SQL editor or MCP execute_sql):
--   1. Substitute :USER_A and :USER_B with two real auth.users ids.
--   2. Run the whole file as one batch. Expected: every row of the final
--      SELECT says PASS, and the transaction rolls back leaving no residue.
-- ============================================================================

begin;

-- ---- seed (as privileged role; bypasses RLS) -------------------------------
insert into public.launchpad_tenants (id, name, slug, created_by, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'RLS Test Tenant A', 'rls-test-a', :'USER_A', 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'RLS Test Tenant B', 'rls-test-b', :'USER_B', 'active');

insert into public.launchpad_memberships (tenant_id, user_id, role, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', :'USER_A', 'owner', 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000002', :'USER_B', 'owner', 'active');

insert into public.launchpad_audit_events (tenant_id, actor_user_id, action, entity) values
  ('aaaaaaaa-0000-0000-0000-000000000001', :'USER_A', 'test.event', 'selftest'),
  ('bbbbbbbb-0000-0000-0000-000000000002', :'USER_B', 'test.event', 'selftest');

-- ---- impersonate USER_A ----------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'USER_A', 'role', 'authenticated')::text, true);

-- ---- assertions ------------------------------------------------------------
select 'tenant visibility' as test,
  case when (select count(*) from public.launchpad_tenants
             where id in ('aaaaaaaa-0000-0000-0000-000000000001',
                          'bbbbbbbb-0000-0000-0000-000000000002')) = 1
       and exists (select 1 from public.launchpad_tenants
                   where id = 'aaaaaaaa-0000-0000-0000-000000000001')
    then 'PASS' else 'FAIL' end as result
union all
select 'cross-tenant tenant read',
  case when not exists (select 1 from public.launchpad_tenants
                        where id = 'bbbbbbbb-0000-0000-0000-000000000002')
    then 'PASS' else 'FAIL' end
union all
select 'cross-tenant membership read',
  case when not exists (select 1 from public.launchpad_memberships
                        where tenant_id = 'bbbbbbbb-0000-0000-0000-000000000002')
    then 'PASS' else 'FAIL' end
union all
select 'cross-tenant audit read',
  case when not exists (select 1 from public.launchpad_audit_events
                        where tenant_id = 'bbbbbbbb-0000-0000-0000-000000000002')
    then 'PASS' else 'FAIL' end
union all
select 'own audit chain visible',
  case when exists (select 1 from public.launchpad_audit_events
                    where tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
                      and prev_hash = 'GENESIS' and seq = 1 and hash is not null)
    then 'PASS' else 'FAIL' end
union all
select 'helper denies foreign tenant',
  case when public.launchpad_is_member('bbbbbbbb-0000-0000-0000-000000000002') = false
        and public.launchpad_is_member('aaaaaaaa-0000-0000-0000-000000000001') = true
    then 'PASS' else 'FAIL' end;

rollback;
