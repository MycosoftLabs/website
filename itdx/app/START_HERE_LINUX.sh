#!/usr/bin/env bash
cd -- "$(dirname -- "$0")" || exit 1
if [[ ! -f launch.py || ! -f bundled_documents/index.json ]]; then
  echo "Extract the entire ZIP, then run this file from the extracted folder."
  exit 1
fi
if ! python3 -c 'import sys; sys.exit(0 if sys.version_info[:2] >= (3,10) else 1)' >/dev/null 2>&1; then
  echo "Install Python 3.10 or newer using your distribution's package manager."
  echo "For Debian/Ubuntu: sudo apt install python3 python3-venv python3-pip"
  exit 1
fi
exec python3 -X utf8 launch.py "$@"
