"""
Replace hardcoded secrets in all working-tree Python/PS files.
Replaces literal values with os.environ.get() calls or env var references.
Safe to run multiple times (idempotent).
"""
import os
import re
from pathlib import Path

ROOT = Path(__file__).parent

REPLACEMENTS = [
    # DB password
    (r"""password\s*=\s*['"]REDACTED_DB_PASSWORD['"]""",
     "password=os.environ.get('MINDEX_DB_PASSWORD', '')"),
    (r"""DB_PASSWORD\s*=\s*['"]REDACTED_DB_PASSWORD['"]""",
     "DB_PASSWORD = os.environ.get('MINDEX_DB_PASSWORD', '')"),
    (r""""password":\s*['"]REDACTED_DB_PASSWORD['"]""",
     '"password": os.environ.get("MINDEX_DB_PASSWORD", "")'),
    (r"""PGPASSWORD='$MINDEX_DB_PASSWORD'""",
     "PGPASSWORD='$MINDEX_DB_PASSWORD'"),

    # SSH / VM password - paramiko connect calls
    (r"""password\s*=\s*['"]REDACTED_VM_SSH_PASSWORD['"]""",
     "password=os.environ.get('VM_PASSWORD', '')"),
    (r"""PASSWORD\s*=\s*['"]REDACTED_VM_SSH_PASSWORD['"]""",
     "PASSWORD = os.environ.get('VM_PASSWORD', '')"),
    (r"""VM_PASSWORD\s*=\s*['"]REDACTED_VM_SSH_PASSWORD['"]""",
     "VM_PASSWORD = os.environ.get('VM_PASSWORD', '')"),
    # PowerShell env assignments (literal string match)
    (r"""env:VM_PASSWORD = "REDACTED_VM_SSH_PASSWORD" """,
     'env:VM_PASSWORD = $env:VM_PASSWORD '),

    # NCBI key
    (r"""NCBI_API_KEY\s*=\s*['"]REDACTED_NCBI_KEY['"]""",
     "NCBI_API_KEY = os.environ.get('NCBI_API_KEY', '')"),
    (r"""api_key\s*=\s*['"]REDACTED_NCBI_KEY['"]""",
     "api_key = os.environ.get('NCBI_API_KEY', '')"),

    # NGC key
    (r"""NGC_API_KEY\s*=\s*['"]nvapi-[A-Za-z0-9_\-]+['"]""",
     "NGC_API_KEY = os.environ.get('NGC_API_KEY', '')"),
    (r"""***REDACTED_NGC_API_KEY***""",
     "***REDACTED_NGC_API_KEY***"),
]

extensions = {'.py', '.ps1', '.sh', '.md', '.txt', '.env', '.example'}
skip_dirs = {'.git', '__pycache__', 'node_modules', '.venv', 'venv', 'venv311', '.mypy_cache'}

fixed_files = []
fixed_count = 0

for path in ROOT.rglob('*'):
    if any(p in path.parts for p in skip_dirs):
        continue
    if path.suffix.lower() not in extensions and path.name not in {'.env', '.env.example', '.env.local'}:
        continue
    if not path.is_file():
        continue
    try:
        text = path.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        continue

    new_text = text
    for pattern, replacement in REPLACEMENTS:
        new_text = re.sub(pattern, replacement, new_text)

    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        count = sum(1 for p, _ in REPLACEMENTS if re.search(p, text))
        fixed_files.append(str(path.relative_to(ROOT)))
        fixed_count += count

print(f"Fixed {len(fixed_files)} files ({fixed_count} replacements):")
for f in sorted(fixed_files)[:50]:
    print(f"  {f}")
if len(fixed_files) > 50:
    print(f"  ... and {len(fixed_files) - 50} more")
