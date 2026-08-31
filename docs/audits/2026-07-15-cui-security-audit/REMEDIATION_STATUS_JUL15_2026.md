# CUI Audit Remediation Status — JUL15 2026

**Date:** 2026-07-15  
**Branch:** `fix/cui-audit-remediation-jul15`  
**Source audit:** `docs/audits/2026-07-15-cui-security-audit/`  
**Morgan instructions:** `CODE/docs/CUI_AUDIT_MORGAN_FIX_INSTRUCTIONS_JUL15_2026.md`

## Auto-fixed in repo (this branch)

- **0001:** Scrubbed plaintext Google Maps key (`AIzaSyA9wz…`) from tracked markdown; placeholders only. Dockerfile ARG already had no secret default.
- **Extra:** Scrubbed Firebase applet `apiKey` in `firebase-applet-config.json` → `<FIREBASE_API_KEY>`.
- **0010:** Removed `temp_original_crep.txt`, `tsc_output_utf8.txt`; added `.gitignore` entries.
- **0002–0007:** Added dated Supabase migration drafts under `supabase/migrations/20260715120*.sql` — **not applied to production**.
- **0008:** `npm audit fix` (no `--force`) — undici **high** cleared; 14 remaining (low/moderate, force-only).

## Pending Morgan / org-owner

- GCP Maps key rotation + referrer lock; optional git history purge after rotation.
- GitHub `main` branch protection; org 2FA enforcement.
- Approve/apply Supabase migrations; review paused projects.
- Lane B cloud consoles + Shodan/crt.sh.

## Residual risk (honesty)

Git history still contains the old Maps key until history rewrite **after** rotation. Public repo amplifies residual disclosure of the dead key if not purged.
