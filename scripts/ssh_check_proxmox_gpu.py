#!/usr/bin/env python3
"""
Check Proxmox GPU status and configure passthrough
"""
import paramiko
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Proxmox host credentials
PROXMOX_HOST = "192.168.0.100"  # Adjust if different
PROXMOX_USER = "root"
PROXMOX_PASS = "Mushroom1!Mushroom1!"  # Same password assumption

# Alternative: Try the VM's sudo to see if it's actually Proxmox
VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "Mushroom1!Mushroom1!"

def run_cmd(client, cmd, desc=""):
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n')[:20]:
            print(line.encode('ascii', 'replace').decode('ascii'))
    if err and exit_code != 0:
        print(f"[err] {err[:200]}")
    return exit_code, out, err

def run_sudo(client, cmd, desc=""):
    return run_cmd(client, f"echo '{VM_PASS}' | sudo -S {cmd}", desc)

def main():
    print("=" * 60)
    print("  GPU Passthrough Investigation")
    print("=" * 60)
    
    # First, check VM for any GPU-related info
    print("\n[1] Checking Sandbox VM for GPU information...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected to VM!")
    
    # Check VM ID from hostname or other info
    run_cmd(client, "cat /etc/machine-id", "Machine ID")
    run_cmd(client, "hostnamectl", "Host info")
    run_sudo(client, "dmidecode -t system | head -15", "System info")
    
    # Check if this is a VM
    run_cmd(client, "systemd-detect-virt", "Virtualization type")
    
    # Check PCI devices for any passthrough candidates
    run_sudo(client, "lspci -nn | head -20", "PCI devices")
    
    # Check kernel messages for IOMMU
    run_sudo(client, "journalctl -k | grep -i 'iommu\\|vfio' | head -10", "IOMMU/VFIO in kernel log")
    
    # Check if VFIO modules are loaded
    run_cmd(client, "lsmod | grep vfio", "VFIO modules")
    
    # Check grub for IOMMU
    run_sudo(client, "grep -i iommu /etc/default/grub 2>/dev/null || echo 'No IOMMU in grub'", "GRUB IOMMU config")
    
    client.close()
    
    # Try connecting to Proxmox
    print("\n" + "=" * 60)
    print("[2] Attempting Proxmox host connection...")
    print("=" * 60)
    
    proxmox_hosts = [
        ("192.168.0.100", "root"),  # Common Proxmox IP
        ("192.168.0.1", "root"),    # Gateway
        ("mindex.mycosoft.io", "root"),  # If DNS exists
    ]
    
    for host, user in proxmox_hosts[:1]:  # Just try first one
        print(f"\nTrying {user}@{host}...")
        try:
            pclient = paramiko.SSHClient()
            pclient.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            pclient.connect(host, username=user, password=PROXMOX_PASS, timeout=10)
            print("Connected to Proxmox!")
            
            run_cmd(pclient, "pveversion", "Proxmox version")
            run_cmd(pclient, "qm list", "VMs list")
            run_cmd(pclient, "lspci | grep -i nvidia", "NVIDIA GPUs on host")
            run_cmd(pclient, "cat /etc/pve/qemu-server/*.conf | grep hostpci", "Hostpci configs")
            
            pclient.close()
            break
        except Exception as e:
            print(f"Could not connect: {e}")
    
    print("\n" + "=" * 60)
    print("  GPU PASSTHROUGH STATUS SUMMARY")
    print("=" * 60)
    print("""
To enable RTX 5090 passthrough:

1. On Proxmox host, find the GPU:
   lspci -nn | grep NVIDIA
   
2. Add GPU to VM config:
   qm set <vmid> -hostpci0 <pci-address>,pcie=1
   
3. Enable IOMMU in Proxmox GRUB:
   GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"
   update-grub
   
4. Blacklist GPU drivers on host:
   echo "blacklist nouveau" >> /etc/modprobe.d/blacklist.conf
   echo "blacklist nvidia" >> /etc/modprobe.d/blacklist.conf
   update-initramfs -u
   
5. Reboot Proxmox host and VM

6. Verify in VM:
   lspci | grep NVIDIA
   nvidia-smi
""")

if __name__ == "__main__":
    main()
