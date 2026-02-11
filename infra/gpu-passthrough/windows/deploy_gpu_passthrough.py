#!/usr/bin/env python3
"""
GPU Passthrough Deployment Tool
Remotely configure GPU passthrough from Windows Dev PC

Usage:
    python deploy_gpu_passthrough.py --check      # Check current status
    python deploy_gpu_passthrough.py --proxmox    # Configure Proxmox only
    python deploy_gpu_passthrough.py --vm         # Configure VM only
    python deploy_gpu_passthrough.py --full       # Full deployment
"""

import argparse
import sys
import os
import time
import requests
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Try to import paramiko
try:
    import paramiko
except ImportError:
    print("Installing paramiko...")
    os.system("pip install paramiko")
    import paramiko

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Load credentials from environment variables
VM_PASS = os.environ.get("VM_PASSWORD")

if not VM_PASS:
    print("ERROR: VM_PASSWORD environment variable is not set.")
    print("Please set it with: $env:VM_PASSWORD = 'your-password'")
    sys.exit(1)

# Configuration
PROXMOX_HOST = os.environ.get("PROXMOX_HOST", "192.168.0.202")
PROXMOX_API = f"https://{PROXMOX_HOST}:8006/api2/json"
PROXMOX_TOKEN = os.environ.get("PROXMOX_TOKEN", "root@pam!cursor_agent=bc1c9dc7-6fca-4e89-8a1d-557a9d117a3e")
PROXMOX_USER = os.environ.get("PROXMOX_USER", "root")
PROXMOX_PASS = VM_PASS  # Use same password

VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("SANDBOX_VM_USER", "mycosoft")
VMID = os.environ.get("SANDBOX_VMID", "103")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROXMOX_SCRIPTS = os.path.join(SCRIPT_DIR, "..", "proxmox")
VM_SCRIPTS = os.path.join(SCRIPT_DIR, "..", "vm")


def print_header(text):
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)


def ssh_connect(host, user, password, timeout=30):
    """Create SSH connection"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, timeout=timeout)
    return client


def ssh_run(client, cmd, desc="", timeout=300, sudo=False):
    """Run command via SSH"""
    if desc:
        print(f"\n>>> {desc}")
    
    if sudo:
        # Use echo to pipe password for sudo
        full_cmd = f"echo '{VM_PASS}' | sudo -S bash -c '{cmd}'"
    else:
        full_cmd = cmd
    
    print(f"$ {cmd[:80]}..." if len(cmd) > 80 else f"$ {cmd}")
    
    stdin, stdout, stderr = client.exec_command(full_cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    
    if out:
        for line in out.split('\n')[:30]:
            print(line.encode('ascii', 'replace').decode('ascii'))
    
    if exit_code != 0 and err:
        # Filter out sudo password prompt
        err_clean = '\n'.join(l for l in err.split('\n') if 'password for' not in l.lower())
        if err_clean:
            print(f"[stderr] {err_clean[:200]}")
    
    return exit_code, out, err


def upload_script(sftp, local_path, remote_path):
    """Upload a script via SFTP"""
    print(f"  Uploading: {os.path.basename(local_path)} -> {remote_path}")
    sftp.put(local_path, remote_path)
    # Make executable
    sftp.chmod(remote_path, 0o755)


def proxmox_api_get(endpoint):
    """GET request to Proxmox API"""
    url = f"{PROXMOX_API}{endpoint}"
    headers = {"Authorization": f"PVEAPIToken={PROXMOX_TOKEN}"}
    try:
        resp = requests.get(url, headers=headers, verify=False, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("data")
        print(f"API Error: {resp.status_code}")
        return None
    except Exception as e:
        print(f"API Exception: {e}")
        return None


def check_proxmox_gpu():
    """Check GPU status on Proxmox via API"""
    print_header("Checking Proxmox GPU Status")
    
    # Get nodes
    nodes = proxmox_api_get("/nodes")
    if not nodes:
        print("[ERROR] Cannot connect to Proxmox API")
        return False
    
    node = nodes[0].get('node', 'pve')
    print(f"Node: {node}")
    
    # Get PCI devices
    pci = proxmox_api_get(f"/nodes/{node}/hardware/pci")
    if pci:
        nvidia = [d for d in pci if 'nvidia' in d.get('vendor_name', '').lower() or '10de' in d.get('vendor', '').lower()]
        if nvidia:
            print(f"\n[OK] Found {len(nvidia)} NVIDIA device(s):")
            for dev in nvidia:
                print(f"  {dev.get('id')}: {dev.get('device_name', 'Unknown')}")
            return True
        else:
            print("\n[WARNING] No NVIDIA GPU found on Proxmox host")
            print("The GPU may be on a different physical machine")
            return False
    return False


def check_vm_gpu():
    """Check GPU status on VM via SSH"""
    print_header("Checking VM GPU Status")
    
    try:
        client = ssh_connect(VM_HOST, VM_USER, VM_PASS)
        
        # Check PCI
        code, out, _ = ssh_run(client, "lspci | grep -i nvidia", "Checking PCI devices")
        has_pci = bool(out.strip())
        
        # Check nvidia-smi
        code, out, _ = ssh_run(client, "nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv 2>/dev/null || echo 'NOT AVAILABLE'", "Checking nvidia-smi")
        has_driver = "NOT AVAILABLE" not in out
        
        # Check Docker GPU
        code, out, _ = ssh_run(client, "docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu24.04 nvidia-smi 2>/dev/null && echo 'DOCKER_GPU_OK' || echo 'DOCKER_GPU_FAIL'", "Checking Docker GPU")
        has_docker_gpu = "DOCKER_GPU_OK" in out
        
        client.close()
        
        print("\nVM GPU Status:")
        print(f"  PCI Device:    {'YES' if has_pci else 'NO'}")
        print(f"  NVIDIA Driver: {'YES' if has_driver else 'NO'}")
        print(f"  Docker GPU:    {'YES' if has_docker_gpu else 'NO'}")
        
        return has_pci and has_driver
        
    except Exception as e:
        print(f"[ERROR] {e}")
        return False


def configure_proxmox():
    """Configure GPU passthrough on Proxmox host"""
    print_header("Configuring Proxmox for GPU Passthrough")
    
    try:
        client = ssh_connect(PROXMOX_HOST, PROXMOX_USER, PROXMOX_PASS)
        sftp = client.open_sftp()
        
        # Create temp directory
        ssh_run(client, "mkdir -p /tmp/gpu-passthrough")
        
        # Upload scripts
        print("\n>>> Uploading scripts...")
        for script in ["01_check_iommu.sh", "02_configure_vfio.sh", "03_attach_gpu_to_vm.sh"]:
            local = os.path.join(PROXMOX_SCRIPTS, script)
            if os.path.exists(local):
                upload_script(sftp, local, f"/tmp/gpu-passthrough/{script}")
        
        sftp.close()
        
        # Run check script
        ssh_run(client, "/tmp/gpu-passthrough/01_check_iommu.sh", "Running IOMMU check")
        
        # Ask user before continuing
        print("\n[QUESTION] Do you want to configure VFIO? This requires a Proxmox reboot.")
        print("Type 'yes' to continue, anything else to skip:")
        response = input("> ").strip().lower()
        
        if response == 'yes':
            ssh_run(client, "/tmp/gpu-passthrough/02_configure_vfio.sh", "Configuring VFIO")
            print("\n[IMPORTANT] Proxmox host needs to be rebooted!")
            print("After reboot, run: python deploy_gpu_passthrough.py --attach")
        else:
            print("Skipping VFIO configuration")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"[ERROR] {e}")
        return False


def attach_gpu_to_vm():
    """Attach GPU to VM (after Proxmox reboot)"""
    print_header(f"Attaching GPU to VM {VMID}")
    
    try:
        client = ssh_connect(PROXMOX_HOST, PROXMOX_USER, PROXMOX_PASS)
        
        ssh_run(client, f"/tmp/gpu-passthrough/03_attach_gpu_to_vm.sh {VMID}", f"Attaching GPU to VM {VMID}")
        
        # Start VM
        print("\n>>> Starting VM...")
        ssh_run(client, f"qm start {VMID}", "Starting VM")
        
        client.close()
        
        print("\n[OK] GPU attached and VM started")
        print("Wait 1-2 minutes for VM to boot, then run:")
        print("  python deploy_gpu_passthrough.py --vm")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] {e}")
        return False


def configure_vm():
    """Install NVIDIA drivers and tools on VM"""
    print_header("Installing NVIDIA Drivers on VM")
    
    try:
        client = ssh_connect(VM_HOST, VM_USER, VM_PASS)
        sftp = client.open_sftp()
        
        # Create temp directory
        ssh_run(client, "mkdir -p /tmp/gpu-setup", sudo=True)
        ssh_run(client, "chmod 777 /tmp/gpu-setup", sudo=True)
        
        # Upload scripts
        print("\n>>> Uploading scripts...")
        for script in ["01_install_nvidia_driver.sh", "02_install_cuda.sh", 
                       "03_install_container_toolkit.sh", "04_verify_gpu.sh"]:
            local = os.path.join(VM_SCRIPTS, script)
            if os.path.exists(local):
                upload_script(sftp, local, f"/tmp/gpu-setup/{script}")
        
        sftp.close()
        
        # Check if GPU is visible
        code, out, _ = ssh_run(client, "lspci | grep -i nvidia", "Checking for GPU")
        if not out.strip():
            print("\n[ERROR] No NVIDIA GPU visible in VM")
            print("GPU passthrough may not be configured on Proxmox")
            client.close()
            return False
        
        # Run driver installation
        print("\n>>> Installing NVIDIA driver (this takes several minutes)...")
        ssh_run(client, "/tmp/gpu-setup/01_install_nvidia_driver.sh", 
                "Installing NVIDIA driver", timeout=600, sudo=True)
        
        # Reboot required
        print("\n[IMPORTANT] VM needs to reboot for driver to load")
        print("Rebooting VM...")
        ssh_run(client, "reboot", sudo=True)
        client.close()
        
        # Wait for VM to come back
        print("\nWaiting for VM to reboot (60 seconds)...")
        time.sleep(60)
        
        # Reconnect
        print("Reconnecting...")
        for attempt in range(5):
            try:
                client = ssh_connect(VM_HOST, VM_USER, VM_PASS)
                break
            except:
                print(f"  Attempt {attempt+1}/5 - VM not ready, waiting...")
                time.sleep(15)
        else:
            print("[ERROR] Could not reconnect to VM after reboot")
            return False
        
        # Verify driver
        code, out, _ = ssh_run(client, "nvidia-smi", "Verifying driver")
        if code != 0:
            print("[ERROR] nvidia-smi failed after reboot")
            client.close()
            return False
        
        # Install CUDA
        ssh_run(client, "/tmp/gpu-setup/02_install_cuda.sh", 
                "Installing CUDA", timeout=600, sudo=True)
        
        # Install container toolkit
        ssh_run(client, "/tmp/gpu-setup/03_install_container_toolkit.sh",
                "Installing Container Toolkit", timeout=300, sudo=True)
        
        # Run verification
        ssh_run(client, "/tmp/gpu-setup/04_verify_gpu.sh", "Running verification")
        
        client.close()
        
        print("\n" + "=" * 60)
        print("  GPU SETUP COMPLETE")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description="GPU Passthrough Deployment Tool")
    parser.add_argument("--check", action="store_true", help="Check current GPU status")
    parser.add_argument("--proxmox", action="store_true", help="Configure Proxmox host")
    parser.add_argument("--attach", action="store_true", help="Attach GPU to VM (after Proxmox reboot)")
    parser.add_argument("--vm", action="store_true", help="Install drivers on VM")
    parser.add_argument("--full", action="store_true", help="Full deployment (interactive)")
    args = parser.parse_args()
    
    print("=" * 60)
    print("  GPU Passthrough Deployment Tool")
    print("=" * 60)
    print(f"\nProxmox Host: {PROXMOX_HOST}")
    print(f"Sandbox VM:   {VM_HOST} (VMID {VMID})")
    
    if args.check or not any([args.proxmox, args.attach, args.vm, args.full]):
        check_proxmox_gpu()
        check_vm_gpu()
        return
    
    if args.proxmox:
        configure_proxmox()
        return
    
    if args.attach:
        attach_gpu_to_vm()
        return
    
    if args.vm:
        configure_vm()
        return
    
    if args.full:
        print("\n[FULL DEPLOYMENT MODE]")
        print("This will configure GPU passthrough step by step.")
        
        # Step 1: Check Proxmox
        has_gpu = check_proxmox_gpu()
        if not has_gpu:
            print("\n[STOP] No NVIDIA GPU found on Proxmox host")
            print("GPU passthrough requires a GPU physically installed in the Proxmox server")
            return
        
        # Step 2: Configure Proxmox
        configure_proxmox()
        
        print("\n[NEXT STEPS]")
        print("1. Reboot Proxmox host: ssh root@192.168.0.202 'reboot'")
        print("2. After reboot: python deploy_gpu_passthrough.py --attach")
        print("3. After VM starts: python deploy_gpu_passthrough.py --vm")


if __name__ == "__main__":
    main()
