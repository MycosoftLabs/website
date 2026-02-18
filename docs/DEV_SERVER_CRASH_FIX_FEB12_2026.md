# Dev Server and Cursor Crash Fix – Feb 12, 2026

## Problem

- **Next.js dev server** (port 3010) can crash on Windows with:
  - **EBUSY** – file lock errors when renaming/writing under `.next` (antivirus, indexing, or IDE holding handles).
  - **OOM** – out-of-memory during compile (large app, many routes).
  - **Turbopack** – in Next 15, using `--turbo` can cause exits; we use webpack by default.
  - **Corrupted `.next`** – bad cache can cause repeated crashes.
- **Cursor IDE** can crash or freeze when:
  - System RAM is low (dev server + Cursor + TypeScript/ESLint all use a lot of memory).
  - Stale GPU processes (PersonaPlex, Earth2, etc.) are left running and consume CPU/RAM.
  - File watchers or indexing on a very large workspace exhaust resources.

## Fixes applied in repo

1. **All dev scripts use 8GB Node heap (default)**  
   - `npm run dev:next-only` and `npm run dev:no-gpu` now run Next with `node --max-old-space-size=8192` to reduce OOM.  
   - `npm run dev:stable` is the same (kept for compatibility). No need to switch scripts when crashes happen.

2. **Windows watchOptions in `next.config.js`**  
   - In dev on Windows, webpack uses:
     - `poll: 2000`, `aggregateTimeout: 300`
     - `ignored: ['**/node_modules', '**/.next', '**/.git', '**/.*']` to reduce EBUSY and watcher load.

3. **Start script options**  
   - `.next` cache is **cleared automatically** every time the dev server is started or restarted (after crash or close).  
   - `.\scripts\start-dev.ps1 -Stable`  
     Uses 8GB heap for extra stability (recommended if it keeps crashing).

## What to do when the dev server keeps crashing

1. Run with stable heap:  
   `.\scripts\start-dev.ps1 -Stable`
2. Exclude the website folder (especially `.next`) from Windows Defender/antivirus real-time scan if possible.
3. If you use WSL2, run the dev server inside WSL to avoid NTFS locking issues.
4. For debugging:  
   `npm run dev:next-only -- --inspect`  
   Then attach Chrome/Edge to the Node process to see stack traces.

## What to do when Cursor keeps crashing or freezing

1. **Free memory (highest impact)**  
   - Run cleanup to kill stale GPU processes:  
     `.\scripts\dev-machine-cleanup.ps1 -KillStaleGPU`  
     (from MAS repo `scripts/` or website repo if script is linked/copied.)  
   - Optionally shut down WSL to free vmmem:  
     `.\scripts\dev-machine-cleanup.ps1 -ShutdownWSL` or `wsl --shutdown`
2. **Use dev:next-only (no GPU)**  
   - Never run `npm run dev` (which starts GPU services in a separate window) unless you need voice/Earth2. Use `npm run dev:next-only` so only Next.js runs.
3. **Reduce Cursor load**  
   - Exclude `node_modules`, `.next`, and `.git` from Cursor search/indexing if possible (e.g. add to `.cursorignore` or workspace exclude).
4. **Restart Cursor** after cleanup so it starts with a clean memory state.

## Commands reference

| Command | Purpose |
|--------|--------|
| `npm run dev:next-only` | Normal dev (port 3010, no GPU). |
| `npm run dev:stable` | Dev with 8GB Node heap (port 3010). |
| `.\scripts\start-dev.ps1` | Free port 3010, then start dev. |
| `.\scripts\start-dev.ps1 -Stable` | Stable start (cache cleared automatically). |
| `.\scripts\ensure-dev-server.ps1` | Start dev only if not already responding on 3010. |

## Related

- Process registry: MAS repo `.cursor/rules/python-process-registry.mdc` (port 3010, no GPU by default).
- Dev pipeline: `docs/DEV_TO_SANDBOX_PIPELINE_FEB06_2026.md`.
