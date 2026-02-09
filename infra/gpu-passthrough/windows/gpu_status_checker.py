#!/usr/bin/env python3
"""
GPU Status Checker - Quick check of GPU status across all systems
"""

import sys
import os
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    import paramiko
except ImportError:
    os.system("pip install paramiko")
    import paramiko

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Configuration
PROXMOX_HOST = "192.168.0.202"
PROXMOX_API = f"https://{PROXMOX_HOST}:8006/api2/json"
PROXMOX_TOKEN = "root@pam!cursor_agent=bc1c9dc7-6fca-4e89-8a1d-557a9d117a3e"

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "REDACTED_VM_SSH_PASSWORD"

WINDOWS_LOCAL = True  # We're running on Windows


def check_local_gpu():
    """Check GPU on local Windows machine"""
    print("\n>>> Local Windows GPU")
    try:
        import subprocess
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            gpu_info = result.stdout.strip()
            print(f"  [OK] {gpu_info}")
            return True
        else:
            print("  [NO] nvidia-smi failed")
            return False
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False


def check_proxmox_gpu():
    """Check GPU on Proxmox via API"""
    print("\n>>> Proxmox Host (192.168.0.202)")
    try:
        url = f"{PROXMOX_API}/nodes"
        headers = {"Authorization": f"PVEAPIToken={PROXMOX_TOKEN}"}
        resp = requests.get(url, headers=headers, verify=False, timeout=10)
        
        if resp.status_code != 200:
            print(f"  [ERROR] API returned {resp.status_code}")
            return False
        
        nodes = resp.json().get("data", [])
        if not nodes:
            print("  [ERROR] No nodes found")
            return False
        
        node = nodes[0].get('node', 'pve')
        
        # Get PCI devices
        pci_url = f"{PROXMOX_API}/nodes/{node}/hardware/pci"
        pci_resp = requests.get(pci_url, headers=headers, verify=False, timeout=10)
        
        if pci_resp.status_code == 200:
            pci = pci_resp.json().get("data", [])
            nvidia = [d for d in pci if 'nvidia' in str(d.get('vendor_name', '')).lower() 
                      or '10de' in str(d.get('vendor', '')).lower()]
            if nvidia:
                for dev in nvidia:
                    print(f"  [OK] {dev.get('id')}: {dev.get('device_name', 'NVIDIA GPU')}")
                return True
            else:
                print("  [NO] No NVIDIA GPU found on Proxmox host")
                return False
        else:
            print(f"  [ERROR] PCI API returned {pci_resp.status_code}")
            return False
            
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False


def check_vm_gpu():
    """Check GPU on Sandbox VM via SSH"""
    print("\n>>> Sandbox VM (192.168.0.187)")
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=10)
        
        # Check PCI
        stdin, stdout, stderr = client.exec_command("lspci | grep -i nvidia", timeout=10)
        pci_out = stdout.read().decode('utf-8', errors='replace').strip()
        has_pci = bool(pci_out)
        
        # Check nvidia-smi
        stdin, stdout, stderr = client.exec_command(
            "nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader 2>/dev/null || echo 'FAIL'",
            timeout=10
        )
        smi_out = stdout.read().decode('utf-8', errors='replace').strip()
        has_driver = smi_out != 'FAIL' and smi_out != ''
        
        client.close()
        
        if has_pci and has_driver:
            print(f"  [OK] GPU passed through and driver working")
            print(f"       {smi_out}")
            return True
        elif has_pci:
            print(f"  [PARTIAL] GPU visible in PCI but driver not working")
            print(f"            PCI: {pci_out}")
            return False
        else:
            print("  [NO] No NVIDIA GPU in VM (passthrough not configured)")
            return False
            
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False


def main():
    print("=" * 60)
    print("  GPU Status Check - All Systems")
    print("=" * 60)
    
    results = {}
    
    # Check local Windows
    results['windows'] = check_local_gpu()
    
    # Check Proxmox
    results['proxmox'] = check_proxmox_gpu()
    
    # Check VM
    results['vm'] = check_vm_gpu()
    
    # Summary
    print("\n" + "=" * 60)
    print("  Summary")
    print("=" * 60)
    print(f"\n  Windows Dev PC:  {'GPU AVAILABLE' if results['windows'] else 'No GPU / nvidia-smi failed'}")
    print(f"  Proxmox Host:    {'GPU AVAILABLE' if results['proxmox'] else 'No GPU found'}")
    print(f"  Sandbox VM:      {'GPU WORKING' if results['vm'] else 'No GPU / Not configured'}")
    
    if results['windows'] and not results['proxmox']:
        print("\n  [INFO] RTX 5090 is on Windows Dev PC, not Proxmox")
        print("         GPU passthrough requires GPU to be in Proxmox server")
    
    if results['proxmox'] and not results['vm']:
        print("\n  [ACTION] GPU on Proxmox but not in VM")
        print("           Run: python deploy_gpu_passthrough.py --full")


if __name__ == "__main__":
    main()
