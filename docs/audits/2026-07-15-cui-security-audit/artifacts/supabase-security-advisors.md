# Supabase security advisors — Mycosoft.com Production (hnevnsxnhfibhbsipqvz, pg17) — 2026-07-15
Source: Supabase MCP get_advisors(security). See https://supabase.com/docs/guides/database/database-linter

## WARN — RLS policy always true (unrestricted authenticated write)
- public.audit_logs — INSERT WITH CHECK (true)  [audit integrity]
- public.security_events — INSERT WITH CHECK (true)  [audit integrity]
- public.incidents — INSERT WITH CHECK (true)
- public.incidents — UPDATE USING (true) AND WITH CHECK (true)  [any authed user can alter any incident]
- public.defense_briefing_requests — INSERT WITH CHECK (true)

## WARN — SECURITY DEFINER function executable by `authenticated` via /rest/v1/rpc
- public.handle_super_admin_role()   [privilege-escalation surface]
- public.is_staff()
- public.handle_new_user()
- public.get_user_monthly_usage(uuid,text)
- public.create_chain_entry(...)

## WARN — function search_path mutable
- public.worldview_rate_weight_last_minute
- public.worldview_meter_and_limit

## WARN — public storage bucket allows listing
- storage bucket `avatars`
- storage bucket `species-images`

## INFO — RLS enabled, no policy (access undefined; effectively locked)
- public.tissue_access_grants, tissue_contaminations, tissue_events, tissue_experiment_accessions,
  tissue_interactions, tissue_locations, tissue_scientists, tissue_transfers
