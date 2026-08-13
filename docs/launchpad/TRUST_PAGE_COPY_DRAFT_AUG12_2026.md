# Launchpad trust-page copy draft — Aug 12, 2026

| Field | Value |
|---|---|
| **Date** | August 12, 2026 |
| **Status** | Draft for Claude to polish — **not** silently published |
| **Why** | BYO AI provider keys are recoverable secrets (envelope-encrypted). The published trust page currently tells customers to keep **credentials** out of Launchpad, and `launchpad_platform_secrets_meta` still says it never stores secret **values**. Those statements remain true for **hashed** tenant API keys, agent enroll secrets, and platform Stripe/Supabase secrets. They are **not** true for optional BYO inference keys. |
| **Live page** | `app/fusarium/launchpad/trust/page.tsx` — Cursor did **not** change it in this pass. |

---

## Proposed replacement (hero paragraph)

The standard service stores readiness metadata, drafts, links, hashes, and sanitized results. Keep CUI, classified information, passwords, SSH/private keys, raw logs, packet captures, SF-86 / background-investigation material, and authoritative evidence in your approved systems.

If you choose **Bring Your Own Key**, Launchpad holds the third-party AI provider API key you connect so background and in-app model calls can run on **your** account. Those keys are stored **encrypted** under a customer-scoped data key, are never shown again, are never written to logs or Stripe metadata, and are deleted when you revoke the connection or delete the workspace. Mycosoft staff cannot read them. Managed AI (Mycosoft-billed credits) never requires you to give us a provider key.

---

## Proposed “What Launchpad stores” add-on (only if the customer connects BYO)

- Optional third-party AI provider keys you explicitly connect (Anthropic, OpenAI, Perplexity, xAI), held encrypted, never returned in an API response.

Cursor MCP is **not** a stored inference key. It uses a Launchpad API key you already mint (hash at rest, plaintext once) so your editor can call tenant-scoped tools.

---

## Proposed “What Launchpad never accepts” (keep)

Keep the existing blocked classes, with this clarification so we do not contradict ourselves:

- Passwords, SSH keys, seed phrases, recovery codes, and **unsolicited** API keys pasted into evidence or chat — **blocked**.
- **Exception (opt-in):** a provider key submitted only through Settings → AI connections, envelope-encrypted, customer-revocable.

SF-86 / e-QIP / NBIS remains prohibited with no exception.

---

## Policy version

`data_classification_policy.yaml` needs a **v1.1** carve-out, counsel-reviewed, before the live trust page ships this language:

```yaml
credentials_and_secrets:
  allowed: false
  action: block_redact_rotate_and_initiate_security_workflow
  carve_out:
    byo_ai_provider_keys:
      allowed: true
      storage: envelope_encrypted_customer_scoped_dek
      never: [plaintext_at_rest, api_response, logs, stripe_metadata, staff_read]
```

Do not flip the live page until that file and legal review land.
