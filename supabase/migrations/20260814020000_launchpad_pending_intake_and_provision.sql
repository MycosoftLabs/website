-- FUSARIUM Launchpad — richer public-checkout intake + service-role provision.
-- Date: 2026-08-14. No CUI. No secrets. Public business facts only.

alter table public.launchpad_pending_purchases
  add column if not exists contact_name text,
  add column if not exists job_title text,
  add column if not exists company_size text,
  add column if not exists company_website text,
  add column if not exists apply_reason text,
  add column if not exists intended_use text,
  add column if not exists provisioned_user_id uuid references auth.users (id) on delete set null;

comment on column public.launchpad_pending_purchases.apply_reason is
  'Why the buyer is applying/paying. Commercial, non-CUI. Survives webhook.';
comment on column public.launchpad_pending_purchases.provisioned_user_id is
  'Auth user created or matched at provision time (webhook or activate).';

-- Service-role tenant create for a known auth user (webhook / activate).
-- Does NOT use auth.uid() — the buyer is not in a browser session yet.
create or replace function public.launchpad_create_tenant_for_user(
  p_user_id uuid,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_slug text;
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;
  if p_name is null or char_length(btrim(p_name)) < 2 then
    raise exception 'tenant name must be at least 2 characters';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'user does not exist';
  end if;

  v_slug := lower(regexp_replace(btrim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := btrim(v_slug, '-') || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into public.launchpad_tenants (name, slug, created_by)
  values (btrim(p_name), v_slug, p_user_id)
  returning id into v_tenant;

  insert into public.launchpad_memberships (tenant_id, user_id, role, status)
  values (v_tenant, p_user_id, 'owner', 'active');

  insert into public.launchpad_audit_events
    (tenant_id, actor_user_id, actor_type, action, entity, entity_id)
  values
    (v_tenant, p_user_id, 'user', 'tenant.created', 'launchpad_tenants', v_tenant::text);

  return v_tenant;
end;
$$;

revoke execute on function public.launchpad_create_tenant_for_user(uuid, text) from anon, authenticated;
grant execute on function public.launchpad_create_tenant_for_user(uuid, text) to service_role;
