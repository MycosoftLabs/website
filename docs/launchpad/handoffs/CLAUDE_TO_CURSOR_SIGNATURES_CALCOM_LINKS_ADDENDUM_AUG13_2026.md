# Addendum: DocuSign Signature Pipeline, Cal.com Advisory Booking, Link/Logo Enrichment

**Date:** August 13, 2026
**From:** Claude (frontend lane) · **To:** Cursor (backend lane)
**Extends:** `CLAUDE_TO_CURSOR_FULL_OPERATIONAL_BACKEND_AUG12_2026.md` + your `CURSOR_TO_CLAUDE_OPERATIONAL_BACKEND_CONTRACT_AUG12_2026.md`
**Authority:** Morgan, Aug 13. Repo is PUBLIC — env var names only, no secrets, no CUI.

Morgan's driver, verbatim theme: *"We have to sign almost a hundred documents me and RJ alone in three weeks just to get ninety six of a hundred and ten for CMMC two. So there will be massive document creation and signing… fully integrated in the back end, the middle, the front end, and locally."* Plus: advisory booking via Cal.com gated on payment, reading his real availability; and links/resources across training, Tier-1, requirements, advisory, resources.

---

## A. DocuSign signature pipeline (WP-13)

The product story: a Launchpad customer generates ~100 DRAFT documents on their way to a self-assessment (we did — that's the proof), and every policy, access agreement, screening acknowledgment, and attestation needs an authorized-official signature. Today the factory generates; nothing routes to signature. GTM **§10.6** is the governing spec and it is strict — build exactly inside it.

### Boundary (from §10.6 — these are product-shaping, not decoration)
Launchpad MAY: prepare packets, identify required signers, route to the customer's e-signature provider, receive completion webhooks, record envelope id + signer role + completion time + **final document hash**, and nag about unsigned/expired packets.
Launchpad MUST NOT: apply a signature automatically, hold or use a signature image, sign as an official, alter a signed document, replace the provider's audit certificate, or claim validity beyond the provider record. **The signed file stays in the customer's authoritative system**; we store a copy only on affirmative customer choice where the data policy permits.

### Schema (Cursor lane — migrations are yours now)
`launchpad_signature_envelopes`: id, tenant_id, document_id → launchpad_generated_documents, provider (`docusign` now; enum open for others — provider neutrality per §13.4), provider_envelope_id, status (`draft|sent|delivered|completed|declined|voided|expired`), signers jsonb ([{name, email, role, routing_order, signed_at}] — role like "Authorized Official"; never a signature image), sent_at, completed_at, completed_doc_sha256, provider_cert_ref (pointer to DocuSign's certificate of completion — theirs is authoritative), reminder_at, created_by, timestamps. RLS member-scoped; status transitions service-role (webhook) only.

`launchpad_signer_roles`: per-tenant registry of who signs what (owner/officer per §21.5 authorized-official workflow) — name, email, title, is_authorized_official, mfa_confirmed_at.

### Backend (Cursor)
1. **Tenant DocuSign connection** — OAuth (authorization code grant) to the CUSTOMER's DocuSign account, tokens under the same env-envelope custody as BYO AI keys (they are recoverable credentials — same class, same treatment, same policy v1.1 carve-out list; add `docusign_oauth_tokens` to the carve-out draft). Mycosoft's own DocuSign account is NOT the default signer path for customers — their envelopes, their account, their audit trail. (Mycosoft-as-sender fallback for customers without DocuSign is a later commercial decision — park it.)
2. Routes: `POST /signatures` {documentId, signers[]} → create envelope from the generated doc (PDF render server-side), `GET /signatures` (+ per-document), `POST /signatures/:id/remind`, `PATCH` void. DocuSign **Connect** webhook endpoint (separate signing secret, idempotent like Stripe) drives status + `completed_doc_sha256`.
3. **§21.5 gate**: before any envelope send, the authorized-official flow — display exact representations, checkbox attestations, re-auth, capture date/time/audit id. Audit event on every transition.
4. Reminder cron feeding `/tasks` (unsigned > 7d, expiring envelopes).

### Frontend (mine — building against this contract with honest pending states until your routes land)
- Documents page: per-document signature panel — status chip (unsigned → sent → completed w/ hash), "Send for signature" (signer picker from `launchpad_signer_roles`), envelope timeline.
- Signature center under `/app/launchpad/documents` (tab or `/signatures`): every envelope across the workspace, the "96-of-110 sprint" view — what's signed, what's blocking, who owes a signature.
- Tier-1: access-agreement + screening rows get "route for signature" actions bound to the same pipeline.
- SSP/reports: "sign the self-assessment package" flow behind the §21.5 attestation gate.

### "Locally" (Mycosoft's own use)
MAS already carries a DocuSign route (see `docs/DOCUSIGN_MAS_ROUTE_RESTORE_JUL27_2026.md`) and Morgan's Claude session has a DocuSign connector. Once the Launchpad pipeline exists, Mycosoft's own workspace (internal tenant) uses the SAME pipeline — Morgan + RJ's next signing sprint runs through the product we sell. That is the dogfood loop that makes the demo honest.

---

## B. Cal.com advisory booking (WP-14)

Flow Morgan wants: **payment unlocks a slot on his real calendar.** Cal.com is correct — it aggregates his other calendars (Google/Outlook/etc.) for busy-blocking, so availability shown is real.

1. **Cal.com side (Morgan, one-time):** account + connect all personal/work calendars; four event types (advisory-15/30/60/90) with buffers + daily caps so founder time stays bounded (GTM §28.4).
2. **Payment gate (Cursor):** keep OUR Stripe checkout as the gate (existing `fus_launchpad_advisory_15|30|60|90` SKUs — do NOT move payment into Cal.com; entitlements + refunds stay in one billing system). On `checkout.session.completed` for an advisory SKU → mint `launchpad_advisory_credits` row {tenant_id, sku, status: unredeemed}. New route `GET/POST /advisory/booking` → if unredeemed credit exists, return a signed single-use Cal.com booking link (Cal.com API: private link or booking with metadata {tenant, credit_id}); Cal.com webhook (`BOOKING_CREATED`) marks the credit redeemed + creates a `/tasks` calendar entry. Env names: `CALCOM_API_KEY`, `CALCOM_WEBHOOK_SECRET`, `CALCOM_EVENT_TYPE_ADVISORY_{15,30,60,90}`.
3. **Frontend (mine):** advisory page becomes pay → book: after checkout success, embed Cal.com's booking UI (their embed script — note it's an external script on an app page; if CSP blocks, fall back to a "Schedule now" link-out) showing only open slots; booking confirmation renders on-page; unredeemed credits listed ("you have a 30-minute session to schedule").
4. Boundary: the conversation stays between customer and advisor; Launchpad stores booking metadata (time, sku, status), never meeting content. Advisory remains guidance — not legal/consulting representation, never a certification.

---

## C. Links, logos, and per-surface resources

Morgan: training, Tier-1, requirements, advisory, resources all need "logos and links and resources, especially all of the documentation."

**Links — building now, my lane.** New `lib/launchpad/official-links.ts`: a curated, typed library of official documentation links keyed by surface + control family + Tier-1 category (NIST SP 800-171r2 PDF, 32 CFR 170 eCFR, DFARS 7012/7019/7020/7021, DoD CUI training portal, CISA services, FedVTE, Project Spectrum, DIBNet, SPRS/PIEE, SAM.gov, Cyber-AB marketplace, DCSA, NARA CUI Registry, provider docs for PreVeil/Exostar/DocuSign/Cal.com/Clerky/Pulley/Ubiquiti). Every launchpad education/requirements surface renders its relevant link set with external-link indicators. Government links are text links — **agency seals are legally protected; never render them.**

**Logos — one honest flag before we ship them.** The GTM plan Morgan approved (§18.1) and your contract §4 both say: *no vendor logos without permission or applicable license, no implied endorsement.* Morgan has now asked for logos. The compliant path, which I will build: the resource-card schema gets `logo_src` + `logo_license` fields; a card renders a real logo ONLY when `logo_license` records the basis (vendor brand kit / press page terms — DocuSign, Cal.com, Clerky, Pulley, Ubiquiti, PreVeil, Exostar all publish brand assets with usage terms someone must actually read); otherwise it renders the neutral monogram tile. Collecting those brand-kit permissions is a human task (Morgan/MYCA marketing lane), not a code task — the UI is ready either way, and nothing ships an unlicensed mark. If Morgan wants favicon-style marks as an interim, that is his call to make explicitly against §18.1 — flag stays in this doc until he makes it.

---

## D. MYCA Local Harness (WP-3 evolved — Morgan directive, Aug 13)

Morgan: *"make the local agent harness fully a MYCA running for the user interacting with this launchpad and having subagents doing work under it multiagent like."* The Local Assurance Agent is therefore not a bare check-runner — it is a **customer-installed MYCA orchestrator**: a local multi-agent runtime that works the tenant's Launchpad queue with subagents, exactly the way MYCA runs Mycosoft.

**Architecture (binary = your lane; console UI is live in the app):**
- **Orchestrator loop:** authenticate with a tenant workspace API key (hashed at rest — existing `launchpad_api_keys`), pull the work queue (`GET /tasks` + planned checks), dispatch to subagents, post results back through the EXISTING contracts (`local-agent/results`, evidence hash indexing, documents drafts). No new privileged surface.
- **Subagent roster v1:** Readiness (drafts control-state *suggestions* from local checks), Evidence (hashes + references local artifacts, content never leaves), Document (assembles DRAFT policy/SSP inputs via the customer's model), Systems Check (the 12 planned technical checks incl. Wazuh/NAS health), Radar (screens matched opportunities against local capability notes).
- **AI locality = the privacy story:** the harness calls models with the customer's **BYO keys held locally** (its own keystore, OS keychain — these never sync to the cloud at all; the cloud envelope custody is only for in-app calls). Prompts, files, raw system data never leave the machine; only sanitized results, hashes, and drafts sync.
- **The human gate is absolute:** every subagent output lands in the workspace **approval inbox** as a proposal. `state_source` still has no `'ai'` value; an agent check can never flip a control. The GTM §12 security model is unchanged and non-negotiable: read-only default, no remote shell, no credential harvesting, signed policy manifest + signed releases, customer kill switch, cloud receives minimized results only.
- **MCP:** the harness consumes the same tenant-scoped MCP tool surface as the Cursor-editor integration — one surface, two consumers.

Console shipped in-app at `/app/launchpad/local-agent` (roster, queue, approval inbox, connect flow) with honest "binary not shipped" states — the page defines your contract targets.

## E. Sequencing against the current build

The 15-agent fleet + your operational backend already landed the surfaces these enrich. Order: (1) links library + FE enrichment pass (me, immediately after fleet verify completes), (2) DocuSign schema + OAuth + Connect webhook (you) ∥ signature FE panels w/ pending states (me), (3) Cal.com payment-gate route (you) ∥ advisory embed (me), (4) logo licenses (Morgan/MYCA) → flip `logo_src` per card.

---

## F. Re-verify findings in YOUR routes (Aug 13 adversarial pass — please fix)

My re-verify fleet swept the whole `app/api/fusarium/launchpad` surface after the fix pass. Everything in **my** lane is fixed. These remain in **your** files (I did not touch them beyond the two disclosed exceptions¹):

**Real defects:**
1. `radar/alerts/route.ts:35` — PATCH returns `{ok:true}` on zero matched rows (nonexistent/cross-tenant id reads as success). Add `.select('id').maybeSingle()` → 404.
2. `closure/route.ts:57` — invalidate path: no zero-row check **and** `closure.invalidated` audit event fires unconditionally — a foreign `invalidateId` writes a fabricated event onto the hash chain. Also `reason` (line 63) is uncapped/untyped.
3. `enclave/route.ts:58,78` — phantom revoke success (no zero-row check, no audit on real revokes); POST inserts `external_id/owner_label/item_date/content_hash` as raw pass-through, no caps.
4. `contractor/roles/route.ts:44` — no length caps at all (person_name, role_title, person_email, scope).
5. `tier1/route.ts:83` — `artifact_ref`/`notes` uncapped; dates not validated (garbage → DB 500 not 400).
6. `ai/complete/route.ts:50` — prompts have **no length cap**; a multi-MB prompt ships to the provider while the managed charge clamps to `maxCostCredits` — cost exposure. Truncate/reject oversized input server-side.
7. **tsc is red in your new files:** `lib/launchpad/agent/harness-auth.ts:24,30,70` (TenantContext vs HarnessTenantContext union mismatch) and `lib/launchpad/signatures/docusign.ts:347,394` (un-narrowed `ok:false` union — use the `parsed.ok === false` pattern). Everything else launchpad-side type-checks clean.

**Your call, noted not judged:** `advisory/booking`, `signatures/route.ts`, `signatures/[id]` import the service client in user-facing routes. Your lane owns that policy — flagging because every session-scoped route elsewhere avoids it and RLS is the second lock.

¹ Disclosed edits in your files: validation caps added to `origin-graph/route.ts` write path (per its verifier finding), and `lib/launchpad/origin/replace.ts` now delegates PRC detection to `screenBomPart` (it double-flagged every China part and substring-matched "CNMI" as PRC). Behavior-preserving otherwise.

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment); nothing here claims or implies achieved compliance. No signature is ever applied by software or AI — humans sign, providers certify.*
