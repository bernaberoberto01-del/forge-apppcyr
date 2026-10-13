#!/usr/bin/env bash
# Despliega edge functions en el Supabase de cada centro (centros/<id>.json con supabase.proyecto).
# Lo usa la Action "Desplegar funciones"; también se puede lanzar a mano.
#
#   FUNCIONES="a b" | "todas"   funciones a desplegar (si se omite, las que cambian entre ANTES y DESPUES)
#   ANTES / DESPUES             commits a comparar (por defecto HEAD~1 y HEAD)
#   PRUEBA=1                    solo muestra lo que haría, sin desplegar
#   SUPABASE_ACCESS_TOKEN       token de una cuenta con acceso a todos los proyectos
#
# Garantías:
#   - Solo despliega funciones que existen en el repo (una borrada no se elimina en remoto).
#   - Conserva verify_jwt del despliegue actual; si la función es nueva, usa supabase/config.toml o true.
#   - Respeta supabase.funcionesExcluidas de cada ficha.
#   - Si un despliegue falla, la versión anterior sigue activa; reintenta 3 veces y sigue con el resto.
#   - Tras desplegar comprueba que la función está ACTIVE, con el verify_jwt esperado y que arranca.
#   - Termina con error si algo ha fallado, con el resumen de qué y dónde.
set -uo pipefail

RAIZ=$(cd "$(dirname "$0")/.." && pwd)
cd "$RAIZ"
API=https://api.supabase.com/v1
PRUEBA=${PRUEBA:-0}
RESUMEN=${GITHUB_STEP_SUMMARY:-/dev/null}

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "::error::Falta el secreto SUPABASE_ACCESS_TOKEN"; exit 1
fi

# --- 1. Qué funciones ---
todas() { find supabase/functions -mindepth 2 -maxdepth 2 -name index.ts | cut -d/ -f3 | sort; }
if [ "${FUNCIONES:-}" = "todas" ]; then
  LISTA=$(todas)
elif [ -n "${FUNCIONES:-}" ]; then
  LISTA=$(echo "$FUNCIONES" | tr ' ,' '\n\n' | grep -v '^$' | sort -u)
else
  ANTES=${ANTES:-HEAD~1}; DESPUES=${DESPUES:-HEAD}
  # Primer push de una rama: no hay commit anterior
  if [ -z "$ANTES" ] || [ "$ANTES" = "0000000000000000000000000000000000000000" ] || ! git cat-file -e "$ANTES" 2>/dev/null; then
    ANTES="$DESPUES~1"
  fi
  LISTA=$(git diff --name-only "$ANTES" "$DESPUES" -- supabase/functions | cut -d/ -f3 | sort -u)
fi

DESPLEGAR=""
for f in $LISTA; do
  if [ -f "supabase/functions/$f/index.ts" ]; then DESPLEGAR="$DESPLEGAR $f"
  else echo "::warning::$f no existe en el repo (¿borrada?): no se toca en remoto"; fi
done
DESPLEGAR=$(echo $DESPLEGAR)
if [ -z "$DESPLEGAR" ]; then echo "No hay funciones que desplegar."; echo "Sin funciones que desplegar." >> "$RESUMEN"; exit 0; fi
echo "Funciones: $DESPLEGAR"

# verify_jwt declarado en supabase/config.toml (solo para funciones nuevas)
jwt_config() {
  awk -v f="[functions.$1]" '$0==f{s=1;next} /^\[/{s=0} s && /verify_jwt/{gsub(/ /,""); split($0,a,"="); print a[2]; exit}' supabase/config.toml 2>/dev/null
}

api() { curl -s -o /tmp/api.json -w "%{http_code}" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" "$API$1"; }

# Carpeta de trabajo sin config.toml: el verify_jwt lo fijamos nosotros, explícito
TRABAJO=$(mktemp -d)
mkdir -p "$TRABAJO/supabase/functions"
for f in $DESPLEGAR; do cp -R "supabase/functions/$f" "$TRABAJO/supabase/functions/"; done

FALLOS=0
echo "| Centro | Función | verify_jwt | Resultado |" >> "$RESUMEN"
echo "|---|---|---|---|" >> "$RESUMEN"

for ficha in centros/*.json; do
  ID=$(jq -r '.id' "$ficha")
  REF=$(jq -r '.supabase.proyecto // empty' "$ficha")
  [ -z "$REF" ] && continue
  EXCLUIDAS=$(jq -r '(.supabase.funcionesExcluidas // [])[]' "$ficha")
  echo "::group::$ID ($REF)"

  # El token debe ver el proyecto; si no, se avisa y se sigue con los demás
  if [ "$(api "/projects/$REF")" != "200" ]; then
    echo "::error::$ID: el token no tiene acceso al proyecto $REF"
    echo "| $ID | (todas) | – | ❌ sin acceso al proyecto |" >> "$RESUMEN"
    FALLOS=$((FALLOS+1)); echo "::endgroup::"; continue
  fi

  for f in $DESPLEGAR; do
    if echo "$EXCLUIDAS" | grep -qx "$f"; then
      echo "$f: excluida en $ID"; echo "| $ID | $f | – | excluida |" >> "$RESUMEN"; continue
    fi
    codigo=$(api "/projects/$REF/functions/$f")
    if [ "$codigo" = "200" ]; then JWT=$(jq -r '.verify_jwt' /tmp/api.json)
    elif [ "$codigo" = "404" ]; then JWT=$(jwt_config "$f"); JWT=${JWT:-true}
    else
      echo "::error::$ID/$f: no se pudo leer su configuración (HTTP $codigo)"
      echo "| $ID | $f | ? | ❌ HTTP $codigo al leerla |" >> "$RESUMEN"; FALLOS=$((FALLOS+1)); continue
    fi
    FLAG=""; [ "$JWT" = "false" ] && FLAG="--no-verify-jwt"

    if [ "$PRUEBA" = "1" ]; then
      echo "[prueba] desplegaría $f en $ID (verify_jwt=$JWT)"
      echo "| $ID | $f | $JWT | prueba: se desplegaría |" >> "$RESUMEN"; continue
    fi

    ok=0
    for intento in 1 2 3; do
      if supabase --workdir "$TRABAJO" functions deploy "$f" --project-ref "$REF" --use-api $FLAG; then ok=1; break; fi
      echo "::warning::$ID/$f: intento $intento fallido"; sleep $((intento*10))
    done
    if [ $ok = 0 ]; then
      echo "::error::$ID/$f: no se pudo desplegar (sigue activa la versión anterior)"
      echo "| $ID | $f | $JWT | ❌ falló el despliegue (sigue la versión anterior) |" >> "$RESUMEN"; FALLOS=$((FALLOS+1)); continue
    fi

    # Verificación: activa, con el verify_jwt esperado y arrancando (OPTIONS no ejecuta lógica)
    sleep 3
    api "/projects/$REF/functions/$f" > /dev/null
    ESTADO=$(jq -r '.status' /tmp/api.json); JWT_REAL=$(jq -r '.verify_jwt' /tmp/api.json)
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "https://$REF.supabase.co/functions/v1/$f" \
      -H "Origin: https://example.com" -H "Access-Control-Request-Method: POST")
    # 2xx: arranca. 401/403: la función arranca y exige clave (crons). 5xx/404: no arranca.
    if [ "$ESTADO" = "ACTIVE" ] && [ "$JWT_REAL" = "$JWT" ] && [[ "$HTTP" =~ ^(2..|401|403)$ ]]; then
      echo "| $ID | $f | $JWT | ✅ desplegada |" >> "$RESUMEN"
    else
      echo "::error::$ID/$f: verificación fallida (estado=$ESTADO verify_jwt=$JWT_REAL esperado=$JWT OPTIONS=$HTTP)"
      echo "| $ID | $f | $JWT_REAL | ❌ verificación: estado=$ESTADO OPTIONS=$HTTP |" >> "$RESUMEN"; FALLOS=$((FALLOS+1))
    fi
  done
  echo "::endgroup::"
done

if [ $FALLOS -gt 0 ]; then echo "::error::$FALLOS problema(s) al desplegar funciones. Ver resumen."; exit 1; fi
echo "Todo desplegado y verificado."
