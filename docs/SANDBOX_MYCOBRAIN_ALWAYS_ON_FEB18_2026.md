# Sandbox MycoBrain Service – Always-On and Redundancy (Feb 18, 2026)

## Why this matters

MycoBrain ingestion from all boards is a **vital company function**. The service must:

- **Always be running** on the sandbox so ingestion is continuous.
- **Survive reboots** (start on boot).
- **Restart on failure** (redundancy and fallbacks).

## How it’s implemented

### 1. Systemd service (always-on, restart on failure)

- **Unit file:** `scripts/sandbox/mycobrain-service.service`
- **Installed to:** `/etc/systemd/system/mycobrain-service.service` on the sandbox
- **Enabled at boot:** `systemctl enable mycobrain-service`
- **Restart policy:** `Restart=always`, `RestartSec=5` so any crash or exit triggers an automatic restart.

The service runs as user `mycosoft`, from the MAS repo at `/opt/mycosoft/mas/mycosoft-mas` (or the first path where the script is found: `/opt/mycosoft/mycosoft-mas`, `/home/mycosoft/...`).

### 2. Watchdog (extra redundancy)

- **Script:** `scripts/sandbox/mycobrain-watchdog.sh`
- **Installed to:** `/opt/mycosoft/scripts/mycobrain-watchdog.sh` on the sandbox
- **Cron:** Root’s crontab, every **2 minutes**: `*/2 * * * * /opt/mycosoft/scripts/mycobrain-watchdog.sh`

The script checks `http://localhost:8003/health`. If the response is not HTTP 200, it runs `systemctl restart mycobrain-service`. This covers cases where the process is hung but has not exited (e.g. serial lock).

### 3. Deploy integration

When you run **`_rebuild_sandbox.py`** (website deploy):

1. The script finds the MAS repo on the sandbox (e.g. `/opt/mycosoft/mas/mycosoft-mas`).
2. It uploads the systemd unit (with the correct `WorkingDirectory`/`ExecStart` path) and installs it.
3. It runs `daemon-reload`, `enable`, and `start` for `mycobrain-service`.
4. It uploads the watchdog script and adds the cron job to root’s crontab.

So every full sandbox rebuild ensures MycoBrain is installed as an always-on systemd service plus the 2‑minute health-check fallback.

## Prerequisites on the sandbox

- **MAS repo** at one of:
  - `/opt/mycosoft/mas/mycosoft-mas`
  - `/opt/mycosoft/mycosoft-mas`
  - `/home/mycosoft/mas/mycosoft-mas`
  - `/home/mycosoft/mycosoft-mas`
- The file **`services/mycobrain/mycobrain_service_standalone.py`** must exist in that repo.
- **Python 3** and deps: `fastapi`, `uvicorn`, `pyserial` (and optionally `httpx`).

If the MAS repo is not present, step 7 of the deploy script will report that and skip installing the service.

## Updating or modifying the MycoBrain service

1. **Code changes (MAS repo)**  
   - Edit `mycosoft-mas/services/mycobrain/mycobrain_service_standalone.py` (or related code).  
   - On the sandbox: pull the MAS repo in the path used by the unit (e.g. `cd /opt/mycosoft/mas/mycosoft-mas && git pull`).  
   - Restart the service:  
     `sudo systemctl restart mycobrain-service`

2. **Changing the systemd unit (e.g. env, user, paths)**  
   - Edit `website/scripts/sandbox/mycobrain-service.service`.  
   - Re-run a full deploy (`_rebuild_sandbox.py`), which reinstalls the unit and restarts the service, **or**  
   - Manually on the sandbox: copy the updated unit to `/etc/systemd/system/mycobrain-service.service`, then  
     `sudo systemctl daemon-reload && sudo systemctl restart mycobrain-service`

3. **Changing the watchdog**  
   - Edit `website/scripts/sandbox/mycobrain-watchdog.sh`.  
   - Re-run deploy so the script and cron are updated, or copy the script to `/opt/mycosoft/scripts/mycobrain-watchdog.sh` on the sandbox and ensure root’s crontab still has  
     `*/2 * * * * /opt/mycosoft/scripts/mycobrain-watchdog.sh`

## Manual install (without full website deploy)

If you have the website repo on the sandbox (or you copy the scripts there):

```bash
# From the website repo root (or copy scripts/sandbox/* to the sandbox)
sudo MAS_ROOT=/opt/mycosoft/mas/mycosoft-mas bash scripts/sandbox/install-mycobrain-service.sh
```

This installs the unit (with optional path substitution), enables/starts the service, and installs the watchdog script and cron.

## Checking status on the sandbox

```bash
# Service status
sudo systemctl status mycobrain-service

# Recent logs
sudo journalctl -u mycobrain-service -n 50 -f

# Health
curl -s http://localhost:8003/health
```

## Summary

| Layer            | Purpose                                      |
|------------------|----------------------------------------------|
| Systemd          | Start on boot; restart on exit/crash (5 s)  |
| Watchdog (cron)  | Every 2 min; restart if /health ≠ 200      |
| Deploy script    | Reinstall unit + watchdog on each rebuild   |

Together, these keep MycoBrain running on the sandbox for continuous board ingestion, with redundancies and fallbacks if it fails.
