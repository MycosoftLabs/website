# Sandbox MycoBrain (COM7) Gateway Setup – Feb 18, 2026

## How the board on your desk (COM7) shows on the sandbox site

Per **docs/DEVICE_MANAGER_AND_GATEWAY_ARCHITECTURE_FEB10_2026.md** and **docs/TAILSCALE_REMOTE_DEVICE_GUIDE_FEB09_2026.md**:

- Run **MycoBrain service on your dev PC** with the board on **COM7**. The service connects to the board and sends **heartbeat to MAS** (192.168.0.188:8001) with your PC’s host (e.g. LAN IP) and port 8003.
- **MAS Device Registry** stores the device. The sandbox website (and any client) fetches **Network** devices from MAS. So the **board on your desk does show on the sandbox site** — in the merged device list that includes MAS-registered devices (heartbeat from your PC).
- Ensure on your dev PC: **MYCOBRAIN_HEARTBEAT_ENABLED=true**, **MAS_REGISTRY_URL=http://192.168.0.188:8001**, and the MycoBrain service is running so heartbeat runs. Then open sandbox → Device Network; the device should appear (from MAS registry).
- **Local/serial discovery** on the sandbox uses the MycoBrain service URL configured for the sandbox (e.g. 187:8003), so serial ports on the sandbox host appear there. Devices that register via heartbeat from other machines (e.g. your PC) appear from the **MAS registry** in the same view.

## Why the sandbox host also has a MycoBrain service

- The **website** runs **inside Docker** on the sandbox (192.168.0.187). Serial ports are on the **host**; containers cannot open them directly.
- A **MycoBrain service on the sandbox host** (port 8003) lets the sandbox see boards **plugged into the sandbox machine** (e.g. /dev/ttyUSB0). The website container calls that service for local discovery. Boards on your desk still show via MAS heartbeat as above.

## 1. Website container → MycoBrain on host

The rebuild script now passes:

- `MYCOBRAIN_SERVICE_URL=http://192.168.0.187:8003`
- `MYCOBRAIN_API_URL=http://192.168.0.187:8003`

So the **website container** calls the **sandbox host** at `192.168.0.187:8003` for device discovery and commands. No change needed in the app if the service is running on the host.

## 2. Run the MycoBrain service on the sandbox host

On the **sandbox VM** (SSH or console), run the MycoBrain service **on the host** (not in Docker) so it can use the host’s USB serial ports (e.g. /dev/ttyUSB0):

```bash
# If you have the MAS repo on the sandbox (e.g. /opt/mycosoft/mas or clone):
cd /opt/mycosoft/mas/mycosoft-mas   # or your path to MAS repo
python3 services/mycobrain/mycobrain_service_standalone.py
```

- Listens on **0.0.0.0:8003** (reachable from the website container).
- Needs **Python 3**, and: `fastapi`, `uvicorn`, `pyserial` (and optionally `httpx` for heartbeat).
- Install if needed: `pip install fastapi uvicorn pyserial httpx`

**Preferred (always-on):** The deploy script installs a **systemd** service and a **watchdog** so MycoBrain runs continuously and restarts on failure. See **docs/SANDBOX_MYCOBRAIN_ALWAYS_ON_FEB18_2026.md** for details.

Manual one-off (not recommended for production):

```bash
nohup python3 services/mycobrain/mycobrain_service_standalone.py > /tmp/mycobrain.log 2>&1 &
```

## 3. Serial access on Linux (COM7 → /dev/ttyUSB* or /dev/ttyACM*)

On Linux, “COM7” is usually a symlink or udev name. The service uses **pyserial** and typically sees:

- `/dev/ttyUSB0`, `/dev/ttyUSB1`, … (USB‑serial adapters)
- `/dev/ttyACM0`, … (USB CDC ACM, e.g. some ESP32)

If the board is USB and shows up as e.g. `/dev/ttyACM0`, the service will list and use that port; the **website/Device Manager still refer to it by port name** (e.g. “COM7” on Windows, or the Linux device name). No code change needed if the service reports the port name it used.

Ensure the user running the MycoBrain service has permission to open the serial device, e.g.:

```bash
sudo usermod -aG dialout mycosoft
# then log out and back in, or reboot
```

## 4. Quick check

- **On sandbox host:** `curl -s http://localhost:8003/health`
- **From your PC:** `curl -s http://192.168.0.187:8003/health`  
  Both should return JSON with `"status":"ok"` and `"service":"mycobrain"` when the service is running.
- Then use Device Manager / CREP on sandbox.mycosoft.com; discovery and COM7 gateway should work once the service is up on the host.

## Summary

| Component        | Where it runs  | Role |
|-----------------|----------------|------|
| Website (Docker)| Sandbox 187    | Serves UI; calls `http://192.168.0.187:8003` for MycoBrain |
| MycoBrain service | Sandbox 187 **host** | Opens COM7 (or Linux tty), HTTP on 8003 |
| USB serial (on sandbox host) | Sandbox 187 **host** | Physical MycoBrain; on Linux appears as /dev/ttyUSB0 or /dev/ttyACM0 (not COM7) |

After redeploying the website with the updated `_rebuild_sandbox.py`, restart the container so it gets `MYCOBRAIN_SERVICE_URL`/`MYCOBRAIN_API_URL`. Then start the MycoBrain service on the sandbox host as above for boards plugged into the sandbox. For **board on your desk (COM7) showing on sandbox**: run MycoBrain service on your dev PC with heartbeat to MAS; the device appears from the MAS Device Registry (see **docs/DEVICE_MANAGER_AND_GATEWAY_ARCHITECTURE_FEB10_2026.md** and **docs/TAILSCALE_REMOTE_DEVICE_GUIDE_FEB09_2026.md**).
