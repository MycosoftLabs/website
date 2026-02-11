#!/usr/bin/env python3
"""
SSH Investigation Script - Check VM status and find issues
"""

import os
import paramiko
import sys

# Load credentials from environment variables
VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("SANDBOX_VM_USER", "mycosoft")
VM_PASS = os.environ.get("VM_PASSWORD")

if not VM_PASS:
    print("ERROR: VM_PASSWORD environment variable is not set.")
    print("Please set it with: $env:VM_PASSWORD = 'your-password'")
    sys.exit(1)

def run_cmd(client, cmd, desc=""):
    """Run command and return output"""
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out)
    if err:
        print(f"[stderr] {err}")
    return exit_code, out, err

def main():
    print("=" * 60)
    print("  VM Investigation")
    print("=" * 60)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected!")
    
    # System info
    run_cmd(client, "uname -a", "System Info")
    run_cmd(client, "df -h | head -10", "Disk Space")
    run_cmd(client, "free -h", "Memory")
    
    # Find website directory
    run_cmd(client, "find /home -name 'package.json' -type f 2>/dev/null | head -5", "Finding package.json files")
    run_cmd(client, "find /home -name '.git' -type d 2>/dev/null | head -5", "Finding git repos")
    run_cmd(client, "ls -la /home/mycosoft/", "Home directory contents")
    run_cmd(client, "ls -la /opt/ 2>/dev/null | head -10", "/opt directory")
    
    # GPU investigation
    run_cmd(client, "lspci | grep -i nvidia", "PCI NVIDIA devices")
    run_cmd(client, "lsmod | grep -i nvidia", "NVIDIA kernel modules")
    run_cmd(client, "which nvidia-smi", "nvidia-smi location")
    run_cmd(client, "cat /proc/driver/nvidia/version 2>/dev/null || echo 'No NVIDIA driver'", "NVIDIA driver version")
    run_cmd(client, "dmesg | grep -i nvidia | tail -10 2>/dev/null", "NVIDIA kernel messages")
    run_cmd(client, "dmesg | grep -i iommu | head -5 2>/dev/null", "IOMMU status")
    
    # K8s investigation
    run_cmd(client, "which k3s kubectl", "K3s/kubectl binaries")
    run_cmd(client, "systemctl is-active k3s 2>/dev/null || echo 'K3s not active'", "K3s service status")
    
    # Docker containers
    run_cmd(client, "docker ps -a --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}'", "All Docker containers")
    
    client.close()
    print("\n" + "=" * 60)
    print("  Investigation Complete")
    print("=" * 60)

if __name__ == "__main__":
    main()
