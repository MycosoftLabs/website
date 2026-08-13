# Launchpad trust-page copy draft — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **Status** | Draft for Claude + counsel — **not** silently published |
| **Owner** | Claude owns marketing copy on the live trust page. Cursor drafts policy language only. |
| **Live page** | `app/fusarium/launchpad/trust/page.tsx` — Cursor did **not** change it in this pass. |
| **Why** | BYO AI provider keys are recoverable secrets (envelope-encrypted). The published trust page currently tells customers to keep **credentials** out of Launchpad. That remains true for hashed tenant API keys, agent enroll secrets, and platform Stripe/Supabase secrets. It is **not** true for optional BYO inference keys once that setting ships. |

---

## Policy v1.1 — counsel carve-out (do not ship copy until reviewed)

Proposed addition to `data_classification_policy.yaml` (or successor). This is a **working paper**, not a control Met claim and not CUI.

```yaml
# policy-v1.1 — BYO AI provider key carve-out (DRAFT — counsel review)
version: "1.1"
credentials_and_secrets:
  default:
    allowed: false
    action: block_redact_rotate_and_initiate_security_workflow
    classes:
      - passwords
      - ssh_private_keys
      - seed_phrases
      - recovery_codes
      - unsolicited_api_keys_in_evidence_or_chat
      - cui_marked_material
      - sf86_eqip_nbis
  carve_out:
    byo_ai_provider_keys:
      allowed: true
      opt_in: settings_ai_connections_only
      providers: [anthropic, openai, perplexity, xai]
      storage: envelope_encrypted_random_dek_per_secret
      wrap: env_master_aes256_gcm   # honest name until AWS KMS is provisioned
      wrap_env: LAUNCHPAD_KMS_MASTER_KEY   # 64 hex chars; gitignored
      wrap_id_env: LAUNCHPAD_KMS_MASTER_KEY_ID
      aws_kms: not_provisioned        # LAUNCHPAD_KMS_ARN must remain unset or encrypt fails closed
      never:
        - plaintext_at_rest
        - api_response_after_create
        - application_logs
        - stripe_metadata
        - staff_read_path
      destroy_on: [connection_revoke, tenant_delete]
      credits: byo_key_true_credits_charged_zero
      not_in_carve_out:
        - cursor_mcp          # uses hashed Launchpad API keys, not a stored inference key
        - managed_ai          # Mycosoft-billed credits; customer does not give a provider key
```

**Counsel questions to resolve before the live page ships this language**

1. Is “Mycosoft staff cannot read them” accurate given that operators with `SUPABASE_SERVICE_ROLE_KEY` plus the env master key *could* decrypt in an incident? Prefer: “Launchpad application paths never return or display the key after create; recovery requires privileged break-glass not offered in product.”
2. Confirm the carve-out is limited to **customer-opt-in provider API keys** submitted only through Settings → AI connections.
3. Confirm hashed tenant API keys and Local Agent enroll secrets stay **out** of the carve-out (hash-at-rest, plaintext once).
4. Confirm SF-86 / e-QIP / NBIS / CUI remain prohibited with **no** exception.
5. Confirm marketing must not say “AWS KMS” until `LAUNCHPAD_KMS_ARN` is provisioned. Current wrap is **application envelope** (`LAUNCHPAD_KMS_MASTER_KEY`).

---

## Proposed replacement (hero paragraph) — Claude polish

The standard service stores readiness metadata, drafts, links, hashes, and sanitized results. Keep CUI, classified information, passwords, SSH/private keys, raw logs, packet captures, SF-86 / background-investigation material, and authoritative evidence in your approved systems.

If you choose **Bring Your Own Key**, Launchpad holds the third-party AI provider API key you connect so background and in-app model calls can run on **your** account. Those keys are stored **encrypted** (random data-encryption key per secret, wrapped with a platform master key). They are never shown again, are never written to logs or Stripe metadata, and are deleted when you revoke the connection or delete the workspace. Managed AI (Mycosoft-billed credits) never requires you to give us a provider key.

---

## Proposed “What Launchpad stores” add-on (only if the customer connects BYO)

- Optional third-party AI provider keys you explicitly connect (Anthropic, OpenAI, Perplexity, xAI), held encrypted, never returned in an API response after create.

Cursor MCP is **not** a stored inference key. It uses a Launchpad API key you already mint (hash at rest, plaintext once) so your editor can call tenant-scoped tools.

---

## Proposed “What Launchpad never accepts” (keep)

- Passwords, SSH keys, seed phrases, recovery codes, and **unsolicited** API keys pasted into evidence or chat — **blocked**.
- **Exception (opt-in):** a provider key submitted only through Settings → AI connections, envelope-encrypted, customer-revocable.

SF-86 / e-QIP / NBIS remains prohibited with no exception.

---

Do not flip the live trust page until this file and legal review land. Claude owns the published wording.
