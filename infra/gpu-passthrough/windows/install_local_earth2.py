#!/usr/bin/env python3
"""
Install and run Earth2Studio locally on Windows with RTX 5090
This is for when GPU passthrough is not available
"""

import subprocess
import sys
import os

def run_cmd(cmd, desc=""):
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.returncode != 0 and result.stderr:
        print(f"[stderr] {result.stderr}")
    return result.returncode == 0


def main():
    print("=" * 60)
    print("  Earth2Studio Local Installation (Windows + RTX 5090)")
    print("=" * 60)
    
    # Check nvidia-smi
    print("\n>>> Checking GPU...")
    if not run_cmd("nvidia-smi --query-gpu=name,memory.total --format=csv", "GPU check"):
        print("[ERROR] No NVIDIA GPU available")
        return
    
    # Check Python
    print("\n>>> Checking Python...")
    run_cmd("python --version")
    
    # Create virtual environment
    print("\n>>> Setting up virtual environment...")
    venv_path = os.path.expanduser("~/.earth2studio-venv")
    if not os.path.exists(venv_path):
        run_cmd(f"python -m venv {venv_path}")
    
    # Activate and install
    pip_cmd = f"{venv_path}\\Scripts\\pip.exe" if sys.platform == "win32" else f"{venv_path}/bin/pip"
    python_cmd = f"{venv_path}\\Scripts\\python.exe" if sys.platform == "win32" else f"{venv_path}/bin/python"
    
    print("\n>>> Installing Earth2Studio dependencies...")
    run_cmd(f"{pip_cmd} install --upgrade pip")
    run_cmd(f"{pip_cmd} install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128")
    run_cmd(f"{pip_cmd} install earth2studio")
    run_cmd(f"{pip_cmd} install fastapi uvicorn xarray zarr netcdf4")
    
    # Verify installation
    print("\n>>> Verifying installation...")
    run_cmd(f"{python_cmd} -c \"import torch; print(f'PyTorch: {{torch.__version__}}'); print(f'CUDA: {{torch.cuda.is_available()}}')\"")
    run_cmd(f"{python_cmd} -c \"import earth2studio; print(f'Earth2Studio: {{earth2studio.__version__}}')\"")
    
    print("\n" + "=" * 60)
    print("  Installation Complete")
    print("=" * 60)
    print(f"""
Earth2Studio is now installed.

To activate the environment:
  {venv_path}\\Scripts\\activate.bat  (Windows)
  source {venv_path}/bin/activate     (Linux/Mac)

To run the inference server:
  cd website\\services\\earth2-inference
  python inference_server.py --port 8310

The server will be available at http://localhost:8310
""")


if __name__ == "__main__":
    main()
