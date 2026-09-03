# OEI Narrative contract notes

The OEI Narrative route composes evidence-linked environmental intelligence packages without creating operational facts, confidence, approval, or publication state.

## Truth modes and deep links

Mode parsing is deterministic and preserves shared Fusarium links:

| URL input | OEI mode | Behavior |
| --- | --- | --- |
| `mode=live` | LIVE | Reads only operational, non-simulated v1 records after a ready health boundary. |
| `mode=replay` or `dataMode=replay` | REPLAY | Reads only operational append-only replay activity. |
| `mode=forecast` or `dataMode=forecast` | FORECAST | Fails closed because no forecast provider is bound; current records are never substituted. |
| `mode=simulated`, `dataMode=simulated`, or `dataMode=demo` | SIMULATED | Uses the opt-in deterministic sanitized fixture, visibly separate from operational state. |

A valid direct `mode` parameter takes precedence over the shared `dataMode` parameter. Self-links and handoffs emit both parameters; FORECAST links emit both `mode=forecast` and `dataMode=forecast` so shared-link round trips cannot silently become LIVE.

## Trust and persistence boundaries

- URL role and operator values are display context only. Versioned API reads always use the fixed least-privileged development viewer identity.
- Claims cannot clear evidence check without existing supporting objects, resolving evidence, source references, lineage, and non-failed verification/integrity state.
- Review gates require an assigned or accepted environmental-judgment review that covers every claim object and evidence reference.
- Drafts and versions are mutable, context-and-time-window-scoped browser storage. They are never publication history.
- Export, external delivery, durable approval, and operational publication remain unavailable.

## Verification

`oei-narrative.test.mjs` covers deep-link round trips, truth-mode isolation, identity, evidence and review gates, catalog filtering, replay filtering, and local-draft validation. `browser-qa.mjs` exercises desktop, narrow, reduced-motion, keyboard/focus, simulated selection handoffs, local-only save, preview boundaries, and LIVE-unavailable truth.
