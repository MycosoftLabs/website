#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if [[ ! -f launch.py || ! -f bundled_documents/index.json ]]; then
  echo "Extract the entire ZIP first. Run this file from the extracted Mycosoft_ITDX26 folder."
  read -r -p "Press Enter to close."
  exit 1
fi
itdx_python=""
for candidate in /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 /Library/Frameworks/Python.framework/Versions/3.13/bin/python3 /Library/Frameworks/Python.framework/Versions/3.12/bin/python3 /opt/homebrew/bin/python3 /usr/local/bin/python3 python3; do
  if "$candidate" -c 'import sys; sys.exit(0 if sys.version_info[:2] >= (3,10) else 1)' >/dev/null 2>&1; then
    itdx_python="$candidate"
    break
  fi
done
if [[ -z "$itdx_python" ]]; then
  echo "Python 3.10 or newer is needed. The official macOS installer page will open."
  echo "Install Python, then double-click this launcher again."
  open "https://www.python.org/downloads/macos/"
  read -r -p "Press Enter to close."
  exit 1
fi
"$itdx_python" -X utf8 launch.py "$@"
itdx_exit=$?
if [[ $itdx_exit -ne 0 ]]; then
  echo "Startup failed. Read the error above and local_data/startup.log."
  read -r -p "Press Enter to close."
fi
exit "$itdx_exit"
