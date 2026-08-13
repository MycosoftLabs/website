# Cursor → Claude: Signatures, Cal.com, links — Aug 13, 2026

| Field | Value |
|---|---|
| **Date** | August 13, 2026 |
| **From** | Cursor (Launchpad backend lane) |
| **To** | Claude frontend fleet |
| **Branch / PR** | `feat/launchpad-backend-aug12` · [PR #260](https://github.com/MycosoftLabs/website/pull/260) |
| **Extends** | `CURSOR_TO_CLAUDE_OPERATIONAL_BACKEND_CONTRACT_AUG12_2026.md` |
| **Addendum** | `handoffs/CLAUDE_TO_CURSOR_SIGNATURES_CALCOM_LINKS_ADDENDUM_AUG13_2026.md` |
| **Flag** | `LAUNCHPAD_ENABLED` stays **off** in sandbox/prod. |

Mycosoft is pursuing CMMC Level 2 (Self-Assessment); it is not assessed compliant. Launchpad is a **non-CUI** workspace. No mock data. No secrets in git. SF-86 remains out.

Cursor lane = schema/RLS, BFFs, `lib/launchpad/**`. Claude lane = visual polish on `app/app/launchpad/**`. Thin honest pages exist so OAuth callback and advisory credits are not empty; restyle freely without changing BFF shapes.

---

## 0. Schema applied on prod (`hnevnsxnhfibhbsipqvz`) — 2026-08-13

Migration: `supabase/migrations/20260813220000_launchpad_signatures_calcom.sql` (MCP `launchpad_signatures_calcom`).

| Object | What it stores | Do not |
|---|---|---|
| `launchpad_signer_roles` | Tenant signer registry; `is_authorized_official`, `mfa_confirmed_at` | Store signature images |
| `launchpad_docusign_connections` | Customer OAuth tokens as **bytea envelope** (same custody as BYO AI keys). Authenticated **cannot** SELECT ciphertext. | Treat Mycosoft JWT as the default customer send path |
| `launchpad_signature_envelopes` | Envelope id, status, signers jsonb, `completed_doc_sha256`, `provider_cert_ref`, `completed_doc_uri` | Store signed PDF bytes |
| `launchpad_signature_webhook_events` | Connect idempotency (hash only) | Persist Connect PDF payloads |
| `launchpad_advisory_credits` | Minted on Stripe `checkout.session.completed` for advisory SKUs. Authenticated **SELECT only**. | Invent slots or mint credits from the session client |
| `launchpad_advisory_bookings` | Cal.com metadata (time, sku, status, url) | Store meeting content |
| `launchpad_calcom_webhook_events` | Cal.com idempotency | Session writes |
| `launchpad_authorized_officials.mfa_confirmed_at` | Added | Recreate the officials table |

Mycosoft’s own CMMC signed PDFs stay under MAS `docs/cmmc_evidence/` (or PreVeil if CUI). Tenant product stores **metadata + hashes** only.

---

## 1. DocuSign status (honest)

**Wired in code.** Live send needs env in gitignored `.env.local` (placeholders in `.env.example`):

| Path | Env | Default |
|---|---|---|
| Customer OAuth (product path) | `DOCUSIGN_INTEGRATION_KEY` + `DOCUSIGN_SECRET_KEY` | Required to connect |
| Connect HMAC | `DOCUSIGN_CONNECT_HMAC_KEY` or `DOCUSIGN_CONNECT_SECRET` | Required for webhook |
| Mycosoft JWT dogfood | those + `DOCUSIGN_USER_ID` + `DOCUSIGN_API_ACCOUNT_ID` + RSA PEM | **Off** unless `LAUNCHPAD_DOCUSIGN_PLATFORM_SEND=1` |

Demo/sandbox hosts: `DOCUSIGN_AUTH_SERVER=https://account-d.docusign.com`, `DOCUSIGN_BASE_URL=https://demo.docusign.net`. Production: `account.docusign.com` / `na4.docusign.net` (or the account’s `base_uri` from OAuth userinfo).

`GET /signatures` returns `docusign: { oauthClientConfigured, jwtReady, platformSendEnabled, blockingReason }` so the UI can show **Connect DocuSign** vs **not configured** without inventing a connection.

---

## 2. Routes (base `/api/fusarium/launchpad`)

### Signatures

| Method | Path | Role |
|---|---|---|
| `GET` | `/signatures` | List envelopes + connection + `authorizedOfficialRepresentations` + `officialLinks`. Query `?documentId=` |
| `POST` | `/signatures` | Create+send. Body `{ documentId, signers[{name,email,role?,routingOrder?}], authorizedOfficialAttestation }`. Missing §21.5 → **403 `authorized_official_gate`** |
| `PUT` | `/signatures` | Mint `/tasks` for unsigned > 7 days |
| `GET` | `/signatures/:id` | One envelope |
| `PATCH` | `/signatures/:id` | `{ action: 'void', reason? }` |
| `POST` | `/signatures/:id` and `/signatures/:id/remind` | Resend |
| `GET/POST` | `/signatures/signers` | Signer registry |
| `GET` | `/signatures/oauth` | `{ authorizeUrl }` + httpOnly `lp_docusign_oauth` |
| `GET` | `/signatures/oauth/callback` | Exchange code, store envelope tokens, redirect `/app/launchpad/signatures?docusign=connected` |
| `POST` | `/signatures/webhook` | DocuSign Connect. HMAC `X-DocuSign-Signature-1`. If payload includes PDF bytes: **hash then discard**. May index hash on `launchpad_evidence_index` (`evidence_type: other`, `cui_indicator: no`) |

**§21.5 attestation** (POST send):

```json
{
  "representationsAcknowledged": true,
  "attestationsChecked": true,
  "reauthenticatedAt": "<ISO, within 15 minutes>"
}
```

Display `authorizedOfficialRepresentations` from GET exactly. Launchpad never applies a signature.

### Advisory / Cal.com

| Method | Path | Role |
|---|---|---|
| `GET` | `/advisory` | Catalog SKUs + `booking: 'stripe_then_calcom'` + `calcom` status |
| `GET` | `/advisory/booking` | `{ credits, bookings, calcom, note }` |
| `POST` | `/advisory/booking` | `{ creditId }` → `{ bookingUrl }` or **503 `calcom_unconfigured`**. Never fake availability. |
| `POST` | `/advisory/webhook` | Cal.com `X-Cal-Signature-256`. `BOOKING_CREATED` redeems credit. |

Pay remains Stripe (`fus_launchpad_advisory_15|30|60|90`). After checkout, list unredeemed credits → POST booking → open real Cal.com URL (embed if CSP allows; otherwise link-out).

**Cal.com env:** `CALCOM_BOOKING_BASE_URL` (or `CALCOM_API_KEY`) + `CALCOM_EVENT_TYPE_ADVISORY_{15,30,60,90}` + `CALCOM_WEBHOOK_SECRET`. If missing, show the blocking note — do not invent slots.

---

## 3. Links, logos, Resource Graph

Canonical catalog: `lib/launchpad/resource-catalog.ts` (alias `lib/launchpad/resources-catalog.ts`). **33** disclosed cards; `external_url` is a real public https URL or `null` for a vendor *class*. `relationship_type: 'none'` + `INDEPENDENCE_DISCLOSURE` on every card.

Official links: `lib/launchpad/official-links.ts` → `LINKS_BY_SURFACE`. Surfaces: `training`, `tier1`, `requirements`, `advisory`, `resources`, `documents`, plus score/registrations/enclave.

`GET /training`, `/tier1`, `/resources`, `/advisory` include `officialLinks`.

**Logo rule (GTM §18.1):** render `logo_src` **only** when `logo_license` records a brand-kit / press-page basis. Today every catalog card has `logo_src: null`. **Never render agency seals.** Neutral monogram until Morgan/MYCA records licenses.

Thin UI already mounts `<OfficialLinksPanel surface="…" />` on training, Tier-1, requirements register, documents, Resource Graph, advisory, signatures. Polish those panels; do not scrape random vendor logos.

---

## 4. Empty / pending states (keep honest)

| Situation | Show |
|---|---|
| No envelopes | “No envelopes yet. Generate a DRAFT, then send.” |
| DocuSign env missing | `docusign.blockingReason` — Connect button disabled with that text |
| OAuth required | 503 `docusign_oauth_required` — “Connect the customer DocuSign account” |
| Cal.com env missing | 503 `calcom_unconfigured` — “Availability is not invented.” |
| No unredeemed credits | Hide “Schedule now”; keep Stripe Book |
| Resource Graph | Static catalog + global `launchpad_resource_cards`; POST custom cards is **501** until implemented |

---

## 5. Local evidence hook (Mycosoft dogfood)

```
npx tsx scripts/launchpad/index-signed-pdf-evidence.ts --dir <path-to-pdfs>
```

Writes hash + path + size JSON. Does **not** upload PDF bytes. Mycosoft CMMC artifacts stay in `docs/cmmc_evidence/` (MAS). Paste hash+path into the tenant Evidence index if the file is non-CUI and customer-controlled.

---

## 6. What Claude should build next

1. Documents page: per-DRAFT “Send for signature” using GET signers + POST `/signatures` behind the §21.5 checkboxes.
2. Signature center polish at `/app/launchpad/signatures` (exists, thin).
3. Tier-1 access-agreement / screening rows: same send action.
4. Advisory: Cal.com embed when CSP allows; otherwise keep link-out.
5. Flip `logo_src` only after a recorded `logo_license`.

Do not store CUI. Do not claim CMMC Met. Do not add SF-86.

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment); nothing here claims or implies achieved compliance. Humans sign; DocuSign’s certificate is authoritative.*
