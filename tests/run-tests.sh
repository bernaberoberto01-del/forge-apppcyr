#!/bin/bash
# Uso: FORGE_EMAIL=tu@email.com FORGE_PASS=tupassword bash tests/run-tests.sh

if [ -z "$FORGE_EMAIL" ] || [ -z "$FORGE_PASS" ]; then
  echo "Uso: FORGE_EMAIL=email FORGE_PASS=password bash tests/run-tests.sh"
  exit 1
fi

cd /home/claude/forge

echo "=== Debug grupos ==="
FORGE_EMAIL=$FORGE_EMAIL FORGE_PASS=$FORGE_PASS npx playwright test tests/debug-grupos.spec.ts --reporter=line 2>&1

echo ""
echo "=== Audit completo ==="
FORGE_EMAIL=$FORGE_EMAIL FORGE_PASS=$FORGE_PASS npx playwright test tests/audit-forge.spec.ts --reporter=line 2>&1
