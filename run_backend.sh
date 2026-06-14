#!/usr/bin/env bash
# ExamShield backend — local dev startup
# Usage: bash run_backend.sh

set -e
cd "$(dirname "$0")/backend"

echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║      ExamShield Backend               ║"
echo "  ║      http://localhost:8000            ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""

# Install deps if needed
pip install -r requirements.txt -q

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
