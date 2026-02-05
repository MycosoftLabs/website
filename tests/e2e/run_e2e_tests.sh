#!/bin/bash
# Run Earth-2 RTX E2E Tests - February 5, 2026

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================="
echo "  Earth-2 RTX End-to-End Tests"
echo "  Date: $(date)"
echo "============================================="

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 not found"
    exit 1
fi

# Install dependencies
echo "Installing test dependencies..."
pip install -q -r "${SCRIPT_DIR}/requirements.txt"

# Run tests
echo "Running E2E tests..."
python3 "${SCRIPT_DIR}/earth2_rtx_e2e_test.py"

echo "Done!"
