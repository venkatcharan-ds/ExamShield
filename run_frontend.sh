#!/usr/bin/env bash
# ExamShield frontend — local dev startup
# Usage: bash run_frontend.sh

set -e
cd "$(dirname "$0")/frontend"

echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║      ExamShield Frontend              ║"
echo "  ║      http://localhost:3000            ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""

# Copy env if not present
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "  ✓ Created .env.local from .env.example"
fi

npm install --legacy-peer-deps -q
npm run dev
