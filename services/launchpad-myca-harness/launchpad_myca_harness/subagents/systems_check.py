"""Read-only host probes — sanitized counts/status only; never raw logs or PCAPs."""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
from pathlib import Path
from typing import Any

from .base import Proposal

CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def _run(cmd: list[str], timeout: int = 8) -> tuple[int, str]:
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            creationflags=CREATE_NO_WINDOW,
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        return proc.returncode, out[:4000]
    except (OSError, subprocess.TimeoutExpired):
        return 1, ""


def _ps(script: str, timeout: int = 8) -> tuple[int, str]:
    return _run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
        timeout=timeout,
    )


def _indeterminate(check_id: str, summary: str, controls: list[str], detail: dict[str, Any]) -> Proposal:
    return Proposal(
        subagent="systems_check",
        check_id=check_id,
        summary=summary,
        result="indeterminate",
        mapped_controls=controls,
        local_detail=detail,
    )


def run_systems_checks() -> list[Proposal]:
    now_plat = platform.system().lower()
    machine = platform.machine()
    release = platform.release()
    proposals: list[Proposal] = [
        Proposal(
            subagent="systems_check",
            check_id="myca.systems.os_inventory",
            summary=f"Host reports {platform.system()} {release} ({machine}). Inventory is local-only.",
            result="pass",
            mapped_controls=["3.4.1"],
            local_detail={"os": platform.system(), "release": release, "arch": machine},
        )
    ]

    proposals.append(_patch_posture(now_plat))
    proposals.append(_disk_encryption(now_plat))
    proposals.append(_mfa(now_plat))
    proposals.append(_firewall(now_plat))
    proposals.append(_endpoint(now_plat))
    proposals.append(_backup(now_plat))
    proposals.append(_stale_accounts(now_plat))
    proposals.append(_open_services(now_plat))
    proposals.append(_logging(now_plat))
    proposals.append(_wazuh(now_plat))
    proposals.append(_nas_health())
    return proposals


def _patch_posture(plat: str) -> Proposal:
    if plat == "windows":
        code, out = _ps("(Get-HotFix | Measure-Object).Count")
        if code == 0 and out.strip().isdigit():
            n = int(out.strip())
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.patch_posture",
                summary=f"Windows hotfix count observed locally: {n}. Not a currency verdict.",
                result="pass" if n > 0 else "indeterminate",
                mapped_controls=["3.14.1"],
                local_detail={"hotfix_count": n},
            )
    return _indeterminate(
        "myca.systems.patch_posture",
        "Patch currency was not determined by this read-only pack.",
        ["3.14.1"],
        {"probed": True, "determined": False},
    )


def _disk_encryption(plat: str) -> Proposal:
    if plat == "windows":
        code, out = _ps(
            "try { (Get-BitLockerVolume -MountPoint 'C:' -ErrorAction Stop).ProtectionStatus } catch { 'unknown' }"
        )
        status = (out or "").strip().splitlines()[-1] if out.strip() else "unknown"
        if status.lower() in {"on", "1"}:
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.disk_encryption",
                summary="BitLocker protection status on C: reported On. Suggestion only.",
                result="pass",
                mapped_controls=["3.13.16"],
                local_detail={"protection": "on"},
            )
        if status.lower() in {"off", "0"}:
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.disk_encryption",
                summary="BitLocker protection status on C: reported Off. Human must confirm.",
                result="fail",
                mapped_controls=["3.13.16"],
                local_detail={"protection": "off"},
            )
    if plat == "darwin":
        code, out = _run(["fdesetup", "status"])
        if "On" in out:
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.disk_encryption",
                summary="FileVault reports On. Suggestion only — human confirms the control.",
                result="pass",
                mapped_controls=["3.13.16"],
                local_detail={"filevault": "on"},
            )
    return _indeterminate(
        "myca.systems.disk_encryption",
        "Disk encryption status not determined by this read-only pack.",
        ["3.13.16"],
        {"probed": True},
    )


def _mfa(plat: str) -> Proposal:
    if plat == "windows":
        code, out = _ps(
            "try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Authentication\\LogonUI' -ErrorAction Stop) | Out-Null; 'present' } catch { 'unknown' }"
        )
        return _indeterminate(
            "myca.systems.mfa",
            "MFA indicators are OS-local and inconclusive without directory policy. Human confirms IA controls.",
            ["3.5.3"],
            {"logon_ui": (out or "").strip()[:40]},
        )
    return _indeterminate(
        "myca.systems.mfa",
        "MFA posture is not fully visible from a local host probe.",
        ["3.5.3"],
        {"probed": True},
    )


def _firewall(plat: str) -> Proposal:
    if plat == "windows":
        code, out = _run(["netsh", "advfirewall", "show", "allprofiles", "state"])
        on = out.lower().count("state                                 on") + out.lower().count("state on")
        if "on" in out.lower():
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.firewall",
                summary="Host firewall profiles include at least one On state. Suggestion only.",
                result="pass" if on > 0 else "indeterminate",
                mapped_controls=["3.13.1"],
                local_detail={"profiles_on_count": on},
            )
    if plat in {"linux", "darwin"}:
        if shutil.which("pfctl") or Path("/usr/sbin/ufw").exists() or shutil.which("firewall-cmd"):
            return _indeterminate(
                "myca.systems.firewall",
                "A host firewall tool is present. Enabled/enforcing must be confirmed by a human.",
                ["3.13.1"],
                {"tool_present": True},
            )
    return _indeterminate(
        "myca.systems.firewall",
        "Host firewall state not determined.",
        ["3.13.1"],
        {"probed": True},
    )


def _endpoint(plat: str) -> Proposal:
    if plat == "windows":
        code, out = _ps(
            "try { $s = Get-MpComputerStatus; if ($s.RealTimeProtectionEnabled) { 'on' } else { 'off' } } catch { 'unknown' }"
        )
        last = (out or "").strip().splitlines()[-1] if out.strip() else "unknown"
        if last == "on":
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.endpoint_protection",
                summary="Microsoft Defender real-time protection reported On. Suggestion only.",
                result="pass",
                mapped_controls=["3.14.2"],
                local_detail={"defender_rtp": "on"},
            )
        if last == "off":
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.endpoint_protection",
                summary="Microsoft Defender real-time protection reported Off. Human confirms SI controls.",
                result="fail",
                mapped_controls=["3.14.2"],
                local_detail={"defender_rtp": "off"},
            )
    return _indeterminate(
        "myca.systems.endpoint_protection",
        "Endpoint protection state not determined by this pack.",
        ["3.14.2"],
        {"probed": True},
    )


def _backup(plat: str) -> Proposal:
    if plat == "windows":
        code, out = _ps("Get-Service VSS, wbengine -ErrorAction SilentlyContinue | Select-Object -Expand Status")
        running = "running" in (out or "").lower()
        return Proposal(
            subagent="systems_check",
            check_id="myca.systems.backup",
            summary=(
                "Windows backup-related services were observed running."
                if running
                else "Backup service presence was inconclusive. Human confirms recovery."
            ),
            result="pass" if running else "indeterminate",
            mapped_controls=["3.8.9"],
            local_detail={"vss_or_wbengine": running},
        )
    return _indeterminate(
        "myca.systems.backup",
        "Backup mechanism not determined. Human confirms MP recovery controls.",
        ["3.8.9"],
        {"probed": True},
    )


def _stale_accounts(plat: str) -> Proposal:
    if plat == "windows":
        code, out = _ps(
            "try { (Get-LocalUser | Where-Object { $_.Enabled -eq $true } | Measure-Object).Count } catch { -1 }"
        )
        try:
            n = int((out or "").strip().splitlines()[-1])
        except ValueError:
            n = -1
        if n >= 0:
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.stale_accounts",
                summary=f"Enabled local user count: {n}. Names are not synced. Human reviews stale accounts.",
                result="indeterminate",
                mapped_controls=["3.1.1"],
                local_detail={"enabled_local_users": n},
            )
    return _indeterminate(
        "myca.systems.stale_accounts",
        "Stale-account review requires a human; this pack does not list usernames to the cloud.",
        ["3.1.1"],
        {"probed": True},
    )


def _open_services(plat: str) -> Proposal:
    if plat == "windows":
        code, out = _ps(
            "(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand LocalPort -Unique | Measure-Object).Count"
        )
        try:
            n = int((out or "").strip().splitlines()[-1])
        except ValueError:
            n = -1
        if n >= 0:
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.open_services",
                summary=f"Unique listening TCP ports (count only): {n}. No banners synced.",
                result="indeterminate",
                mapped_controls=["3.4.7"],
                local_detail={"listen_port_count": n},
            )
    return _indeterminate(
        "myca.systems.open_services",
        "Listening-service inventory was not completed. No banners or PCAPs are collected.",
        ["3.4.7"],
        {"probed": True},
    )


def _logging(plat: str) -> Proposal:
    if plat == "windows":
        code, out = _run(["wevtutil", "gli", "Security"])
        if code == 0 and "enabled:" in out.lower():
            enabled = "true" in out.lower()
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.logging",
                summary="Security event log channel metadata present (no events dumped).",
                result="pass" if enabled else "indeterminate",
                mapped_controls=["3.3.1"],
                local_detail={"security_log_probed": True, "enabled_token_present": enabled},
            )
    syslog = Path("/var/log/syslog")
    if syslog.exists():
        return Proposal(
            subagent="systems_check",
            check_id="myca.systems.logging",
            summary="Host syslog path exists. Contents were not read or synced.",
            result="pass",
            mapped_controls=["3.3.1"],
            local_detail={"syslog_exists": True},
        )
    return _indeterminate(
        "myca.systems.logging",
        "Audit-log availability not determined. Raw logs stay on-device.",
        ["3.3.1"],
        {"probed": True},
    )


def _wazuh(plat: str) -> Proposal:
    names = ("WazuhSvc", "wazuh-agent", "wazuh-manager")
    if plat == "windows":
        code, out = _ps(
            "Get-Service WazuhSvc, wazuh-agent -ErrorAction SilentlyContinue | Select-Object -Expand Status"
        )
        running = "running" in (out or "").lower()
        present = bool((out or "").strip())
        return Proposal(
            subagent="systems_check",
            check_id="myca.systems.wazuh",
            summary=(
                "Wazuh-related service is running. Health is a sanitized flag only — no SIEM dump."
                if running
                else "Wazuh agent/manager not observed running. No raw alerts synced."
            ),
            result="pass" if running else ("not_applicable" if not present else "fail"),
            mapped_controls=["3.3.1", "3.14.6"],
            local_detail={"service_running": running, "service_present": present},
        )
    running = any(shutil.which(n) for n in names)
    return Proposal(
        subagent="systems_check",
        check_id="myca.systems.wazuh",
        summary="Wazuh binary presence checked locally. No manager dumps or PCAPs leave this host.",
        result="pass" if running else "not_applicable",
        mapped_controls=["3.3.1", "3.14.6"],
        local_detail={"binary_present": running},
    )


def _nas_health() -> Proposal:
    # Customer NAS — count mapped/network drives only. Never Mycosoft-lab IPs.
    if os.name == "nt":
        code, out = _ps(
            "(Get-PSDrive -PSProvider FileSystem | Where-Object { $_.DisplayRoot -like '\\\\*' } | Measure-Object).Count"
        )
        try:
            n = int((out or "").strip().splitlines()[-1])
        except ValueError:
            n = -1
        if n >= 0:
            return Proposal(
                subagent="systems_check",
                check_id="myca.systems.nas",
                summary=f"Mapped network filesystem count: {n}. Paths are not synced.",
                result="pass" if n > 0 else "indeterminate",
                mapped_controls=["3.8.1"],
                local_detail={"mapped_unc_count": n},
            )
    return _indeterminate(
        "myca.systems.nas",
        "Network storage reachability not determined. No share paths synced.",
        ["3.8.1"],
        {"probed": True},
    )
