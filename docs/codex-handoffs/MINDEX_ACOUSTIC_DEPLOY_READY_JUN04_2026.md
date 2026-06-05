# MINDEX Acoustic Classifier — Deploy Ready (Jun 4, 2026)

**Status:** Ready for Codex live deploy + latency test after one local pass on port **3010**.

## What is integrated

### Frontend (Codex — WEBSITE, local)

| Area | Files |
|------|--------|
| SINE workbench | `components/sensing/sine-acoustic-player.tsx` |
| MINDEX Library tab | `components/mindex/tabs/library-tab.tsx` |
| Library BFF | `app/api/natureos/mindex/library/route.ts` |
| Classify BFF | `app/api/natureos/mindex/library/classify/route.ts` |
| Wave notes BFF (GET+POST) | `app/api/natureos/mindex/library/wave-annotation/route.ts` |
| Human ID BFF (GET+POST) | `app/api/natureos/mindex/library/human-identification/route.ts` |
| Training tags BFF | `app/api/natureos/mindex/sine/training/human-tags/route.ts` |
| Types | `lib/mindex/library-files.ts` |

**Cursor additions (same pass):** scope persisted in `file_context`, returned as `scope` on reads, scope settings restored when reopening a file.

### Backend (MINDEX VM **189**)

| Capability | Route(s) | Commit |
|------------|----------|--------|
| Library acoustic blobs | `GET /api/mindex/library/blobs` | `92ee960`+ |
| Classify | `POST /api/mindex/library/blobs/{id}/classify` | prior |
| Analyze / visualisation | `POST/GET /api/mindex/sine/blobs/{id}/...` | prior |
| Wave annotations | `POST/GET .../wave-annotation(s)` | `b340465` / `92ee960` |
| Human identifications | `POST/GET .../human-identification(s)` | same |
| Scope on wave save | merged into `file_context.scope` | `8141746` |
| Training human tags | `GET /api/mindex/sine/training/human-tags` | `8141746` |

Deploy MINDEX on 189 before website if VM is behind: `python scripts/_deploy_push_jun04_2026.py` (from MINDEX repo, credentials loaded).

## One local test pass (3010)

1. Open `http://localhost:3010/sensing/sine/player` — expect **200**, ESC-50 list (`q=esc`, limit 100).
2. Select a short ESC-50 row — stream plays, visualisation **200** on small files.
3. **Run full SINE analysis** — detector rows appear (not mock).
4. **Save wave notes** (region + optional markers) — success, not *"Wave notes could not be saved yet."*
5. **Save human identification** — success message.
6. Reload same file — prior wave region / scope / human tags hydrate from GET BFF.
7. MINDEX tab → Acoustic → **Run SINE classification** — ~2s, grouped detectors update.

Optional API smoke (dev PC, token from `WEBSITE/website/.env.local`):

```powershell
$tok = $env:MINDEX_INTERNAL_TOKEN  # or from .env.local
$h = @{ "X-Internal-Token" = $tok }
Invoke-RestMethod "http://192.168.0.189:8000/api/mindex/sine/training/human-tags?limit=5" -Headers $h
```

## Codex deploy sequence (~2h)

1. **Commit/push WEBSITE** — SINE acoustic files above (avoid unrelated `codex/myca-website-security-boundary` noise if possible; cherry-pick or scoped commit).
2. **Ensure MINDEX 189** at `8141746` (deploy script).
3. **Local:** `npm run dev:next-only` on **3010** — run checklist above.
4. **SSH 187:** pull, rebuild `mycosoft-website` Docker, NAS mount, restart.
5. **Cloudflare:** Purge Everything.
6. **Live test:** `sandbox.mycosoft.com/sensing/sine/player` vs localhost — classify latency, stream, wave save, human ID.

## Known limits (not blockers for first live test)

- `sound_transcripts` — not in API yet; UI shows empty honestly.
- `event_family` / `acoustic_domain` — frontend heuristics only.
- Long MBARI files (>75 MB) — no auto visualisation; user-triggered analyze may timeout until chunking ships.
- **Genomes 500** on MINDEX console — separate track; does not block SINE player.

## Env (website `.env.local`)

- `MINDEX_API_URL=http://192.168.0.189:8000`
- `MINDEX_INTERNAL_TOKEN` — must match `MINDEX_INTERNAL_TOKENS` on 189 (first token).

## Related docs

- `MINDEX_ACOUSTIC_CLASSIFIER_FRONTEND_PLAN_JUN04_2026.md` — full Codex history
- `MINDEX/mindex/docs/MINDEX_WAVE_ANNOTATIONS_BACKEND_COMPLETE_JUN04_2026.md`
- `MINDEX/mindex/docs/MINDEX_SINE_ACOUSTIC_VM_DEPLOY_COMPLETE_JUN04_2026.md`
