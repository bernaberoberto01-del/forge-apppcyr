---
name: forge-session-start
description: Arranque de sesión de trabajo en Forge. Úsala cuando el usuario diga "arrancamos", "empezamos sesión", "vamos a trabajar en Forge", "continuamos", "seguimos", o al inicio de una nueva conversación sobre Forge. Ejecuta el diagnóstico completo automáticamente.
---

# Forge — Arranque de sesión

Ejecuta este diagnóstico al inicio sin preguntar:

```bash
cd /home/claude/forge

echo "=== ESTADO GIT ==="
git log --oneline -3

echo "=== BUNDLE EN PRODUCCIÓN ==="
PROD=$(curl -s "https://forge-studio-os.vercel.app/" | grep -o 'index-[^"]*\.js')
LOCAL=$(ls dist/assets/*.js 2>/dev/null | grep -o 'index-[^.]*\.js' | head -1)
echo "Prod: $PROD | Local: $LOCAL"
[ "$PROD" = "$LOCAL" ] && echo "✅ Sincronizados" || echo "⚠️  Desincronizados"

echo "=== ERRORES JS EN PORTAL ==="
# Test rápido de errores
```

Luego presenta al usuario:

```
🚀 FORGE SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Último commit: [hash] — [mensaje]
Bundle prod:   [hash] [✅ sync / ⚠️ desync]
Portal:        PortalForge.jsx activo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
¿Por dónde empezamos?
```

Si el usuario ya describió lo que quiere hacer, salta directamente a ello sin preguntar.

## Plantilla de estado para pegar en nuevas sesiones

```
FORGE SESSION START
Último cambio: [describir en 1 línea]
Pendiente:     [describir en 1 línea o "nada"]
Error activo:  [sí/no + descripción]
Bundle sync:   [sí/no]
```
