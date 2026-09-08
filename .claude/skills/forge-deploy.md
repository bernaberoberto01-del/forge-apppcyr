---
name: forge-deploy
description: Flujo de deploy de Forge a Vercel. Úsala cuando el usuario quiera hacer push, deploy, subir cambios, publicar, o cuando pregunte por el estado del deploy en producción.
---

# Forge — Flujo de deploy

## Secuencia siempre en este orden

```bash
# 1. Build — si falla, PARAR
npm run build

# 2. Verificar bundle local
ls dist/assets/*.js

# 3. Commit descriptivo
git add .
git commit -m "descripción: qué cambió y por qué"

# 4. Push limpio (nunca --force)
git push

# 5. Esperar 60-90s y verificar
sleep 90 && curl -s "https://forge-studio-os.vercel.app/" | grep -o 'index-[^"]*\.js'
```

## Si Vercel no actualiza el bundle

Diagnóstico:
```bash
# Ver deploys recientes vía API de Vercel (si disponible)
# O comparar hashes
LOCAL=$(ls dist/assets/*.js | grep -o 'index-[^.]*')
PROD=$(curl -s "https://forge-studio-os.vercel.app/" | grep -o 'index-[^"]*\.js' | grep -o 'index-[^.]*')
echo "Local: $LOCAL | Prod: $PROD"
```

Si son iguales → deploy OK
Si son distintos → Vercel no ha desplegado aún, esperar o revisar en vercel.com

## Verificación final siempre con Playwright

```bash
npx playwright test tests/capturas-tabs.spec.ts --reporter=line --timeout=60000
```
