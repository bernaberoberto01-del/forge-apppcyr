


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_mis_centros"("uid" "uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT centro_id FROM public.miembros_centro
  WHERE user_id = auth.uid() AND activo = true
  UNION
  SELECT id FROM public.centros WHERE owner_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_mis_centros"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."actividad_cliente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "descripcion" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."actividad_cliente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alertas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "tipo" "text",
    "mensaje" "text",
    "leida" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "alertas_tipo_check" CHECK (("tipo" = ANY (ARRAY['fatiga_alta'::"text", 'abandono'::"text", 'pago_vencido'::"text", 'rutina_lista'::"text", 'resumen_listo'::"text", 'cancelacion_sesion'::"text", 'sin_checkin'::"text", 'mensaje_nuevo'::"text", 'nuevo_cuestionario'::"text", 'error_ia'::"text", 'pago_recibido'::"text", 'pago_fallido'::"text", 'suscripcion_cancelada'::"text", 'cuestionario_pendiente'::"text"])))
);


ALTER TABLE "public"."alertas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analisis_mensual" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "accion" "text" NOT NULL,
    "checkins_analizados" integer NOT NULL,
    "energia_media" numeric,
    "fatiga_media" numeric,
    "adherencia_pct" integer,
    "resumen" "text" NOT NULL,
    "indicaciones" "text",
    "mensaje_cliente" "text",
    "rutina_generada_id" "uuid",
    "revisado" boolean DEFAULT false,
    "accion_tomada" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "enviado_cliente" boolean DEFAULT false,
    CONSTRAINT "analisis_mensual_accion_check" CHECK (("accion" = ANY (ARRAY['actualizar_rutina'::"text", 'ajustar_cargas'::"text", 'mensaje_motivacional'::"text", 'pausa_recomendada'::"text"])))
);


ALTER TABLE "public"."analisis_mensual" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."centros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "logo_url" "text",
    "color_acento" "text" DEFAULT '#FF5C00'::"text",
    "plan" "text" DEFAULT 'basico'::"text",
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."centros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkin_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "campos" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."checkin_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "fecha" timestamp with time zone DEFAULT "now"(),
    "peso" numeric(5,2),
    "energia" integer,
    "sueno" numeric(4,1),
    "estres" integer,
    "sesiones_semana" integer,
    "adherencia_entreno" integer,
    "adherencia_nutricion" integer,
    "pasos_diarios" integer,
    "comentario" "text",
    "foto_url" "text",
    "respondido" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "fatiga" integer,
    "motivacion" integer,
    "calidad_entreno" integer,
    "centro_id" "uuid",
    "cargas_sensacion" "text",
    "sesiones_planificadas" integer,
    "logro_semana" "text",
    CONSTRAINT "checkins_adherencia_entreno_check" CHECK ((("adherencia_entreno" >= 1) AND ("adherencia_entreno" <= 10))),
    CONSTRAINT "checkins_adherencia_nutricion_check" CHECK ((("adherencia_nutricion" >= 1) AND ("adherencia_nutricion" <= 10))),
    CONSTRAINT "checkins_calidad_entreno_check" CHECK ((("calidad_entreno" >= 1) AND ("calidad_entreno" <= 7))),
    CONSTRAINT "checkins_cargas_sensacion_check" CHECK (("cargas_sensacion" = ANY (ARRAY['muy_facil'::"text", 'bien'::"text", 'duro'::"text", 'muy_duro'::"text"]))),
    CONSTRAINT "checkins_energia_check" CHECK ((("energia" >= 1) AND ("energia" <= 10))),
    CONSTRAINT "checkins_estres_check" CHECK ((("estres" >= 1) AND ("estres" <= 5))),
    CONSTRAINT "checkins_fatiga_check" CHECK ((("fatiga" >= 1) AND ("fatiga" <= 5))),
    CONSTRAINT "checkins_motivacion_check" CHECK ((("motivacion" >= 1) AND ("motivacion" <= 7))),
    CONSTRAINT "checkins_sesiones_semana_check" CHECK ((("sesiones_semana" >= 0) AND ("sesiones_semana" <= 7)))
);


ALTER TABLE "public"."checkins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "centro_id" "uuid",
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "tipo" "text" DEFAULT 'grupo'::"text",
    "color" "text" DEFAULT '#FF5C00'::"text",
    "fecha" "date" NOT NULL,
    "hora" time without time zone NOT NULL,
    "duracion_minutos" integer DEFAULT 60,
    "plazas_max" integer DEFAULT 10,
    "es_recurrente" boolean DEFAULT false,
    "dias_semana" integer[],
    "cancelada" boolean DEFAULT false,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "clases_tipo_check" CHECK (("tipo" = ANY (ARRAY['grupo'::"text", 'pilates'::"text", 'yoga'::"text", 'crossfit'::"text", 'funcional'::"text", 'otra'::"text"])))
);


ALTER TABLE "public"."clases" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."clases_con_plazas" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"uuid" AS "entrenador_id",
    NULL::"uuid" AS "centro_id",
    NULL::"text" AS "nombre",
    NULL::"text" AS "descripcion",
    NULL::"text" AS "tipo",
    NULL::"text" AS "color",
    NULL::"date" AS "fecha",
    NULL::time without time zone AS "hora",
    NULL::integer AS "duracion_minutos",
    NULL::integer AS "plazas_max",
    NULL::boolean AS "es_recurrente",
    NULL::integer[] AS "dias_semana",
    NULL::boolean AS "cancelada",
    NULL::"text" AS "notas",
    NULL::timestamp with time zone AS "created_at",
    NULL::bigint AS "plazas_ocupadas",
    NULL::bigint AS "plazas_libres";


ALTER VIEW "public"."clases_con_plazas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "email" "text",
    "telefono" "text",
    "objetivo" "text",
    "tipo" "text" DEFAULT 'presencial'::"text",
    "estado" "text" DEFAULT 'activo'::"text",
    "peso_actual" numeric(5,2),
    "peso_objetivo" numeric(5,2),
    "nivel" "text",
    "dias_semana" integer DEFAULT 3,
    "material" "text" DEFAULT 'gimnasio'::"text",
    "lesiones" "text",
    "notas" "text",
    "precio_mensual" numeric(8,2) DEFAULT 0,
    "fecha_inicio" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tipo_entrenamiento" "text",
    "nutricion_activa" boolean DEFAULT false,
    "horas_semana" numeric(4,2) DEFAULT 0,
    "centro_id" "uuid",
    "pin_portal" "text",
    "portal_pin" "text",
    "auth_user_id" "uuid",
    "enfermedades" "text",
    "medicacion" "text",
    "formato_entrenamiento" "text",
    "modalidad" "text" DEFAULT 'individual'::"text",
    "grupo_id" "uuid",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "suscripcion_activa" boolean DEFAULT false,
    "proxima_factura" "date",
    "plan_online" "text",
    "plan_activo" boolean DEFAULT false,
    "ia_estado" "text",
    CONSTRAINT "clientes_estado_check" CHECK (("estado" = ANY (ARRAY['activo'::"text", 'pausado'::"text", 'baja'::"text", 'pendiente'::"text", 'rechazado'::"text"]))),
    CONSTRAINT "clientes_ia_estado_check" CHECK (("ia_estado" = ANY (ARRAY['pendiente'::"text", 'generando'::"text", 'listo'::"text", 'error'::"text", 'pendiente_datos'::"text"]))),
    CONSTRAINT "clientes_material_check" CHECK (("material" = ANY (ARRAY['sin_material'::"text", 'material_basico'::"text", 'gimnasio'::"text"]))),
    CONSTRAINT "clientes_modalidad_check" CHECK (("modalidad" = ANY (ARRAY['individual'::"text", 'pareja'::"text", 'grupo'::"text"]))),
    CONSTRAINT "clientes_nivel_check" CHECK (("nivel" = ANY (ARRAY['principiante'::"text", 'intermedio'::"text", 'avanzado'::"text"]))),
    CONSTRAINT "clientes_objetivo_check" CHECK (("objetivo" = ANY (ARRAY['perdida_grasa'::"text", 'ganancia_muscular'::"text", 'tonificacion'::"text", 'fuerza'::"text", 'rendimiento'::"text", 'salud_general'::"text", 'cambio_rapido_30dias'::"text"]))),
    CONSTRAINT "clientes_plan_online_check" CHECK (("plan_online" = ANY (ARRAY['nutricion'::"text", 'entrenamiento'::"text", 'completo'::"text"]))),
    CONSTRAINT "clientes_tipo_check" CHECK (("tipo" = ANY (ARRAY['presencial'::"text", 'online'::"text"])))
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuracion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "nombre_negocio" "text",
    "nombre_entrenador" "text",
    "bio" "text",
    "foto_url" "text",
    "color_acento" "text" DEFAULT '#FF5C00'::"text",
    "modulos" "jsonb" DEFAULT '{"pagos": true, "agenda": true, "rutinas": true, "clientes": true, "mensajes": true, "sesiones": true, "dashboard": true, "seguimiento": true}'::"jsonb",
    "cuestionario_bloques" "jsonb" DEFAULT '{"salud": true, "basico": true, "material": true, "objetivo": true, "historial": true, "motivacion": true, "disponibilidad": true}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "portal_pin_activo" boolean DEFAULT false,
    "slug" "text",
    "descripcion_publica" "text",
    "instagram" "text",
    "perfil_publico_activo" boolean DEFAULT false,
    "slug_publico" "text",
    "especialidades" "text"[],
    "anos_experiencia" integer,
    "web" "text"
);


ALTER TABLE "public"."configuracion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cuestionarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "cliente_id" "uuid",
    "nombre" "text" NOT NULL,
    "email" "text" NOT NULL,
    "telefono" "text",
    "edad" numeric,
    "sexo" "text",
    "peso_actual" numeric(5,2),
    "altura" numeric,
    "objetivo" "text",
    "objetivo_detalle" "text",
    "plazo" "text",
    "nivel" "text",
    "anos_entrenando" numeric DEFAULT 0,
    "marca_press_banca" "text",
    "marca_sentadilla" "text",
    "marca_peso_muerto" "text",
    "marca_dominadas" "text",
    "marca_flexiones" "text",
    "marca_press_militar" "text",
    "material" "text",
    "dias_semana" integer DEFAULT 3,
    "duracion_sesion" integer DEFAULT 60,
    "horario_preferido" "text",
    "lesiones" "text",
    "enfermedades" "text",
    "medicacion" "text",
    "motivacion" "text",
    "experiencias_anteriores" "text",
    "compromisos" "text",
    "como_nos_conocio" "text",
    "procesado" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tipo" "text" DEFAULT 'presencial'::"text",
    "tipo_entrenamiento" "text",
    "acepta_rgpd" boolean DEFAULT false,
    "precio_mensual" numeric,
    "tipo_cliente" "text",
    "acepta_ia" boolean DEFAULT false,
    "fecha_consentimiento" timestamp with time zone DEFAULT "now"(),
    "formato_entrenamiento" "text",
    "ciudad" "text",
    "entrenas_ahora" "text",
    "donde_entrena" "text",
    "alimentacion_actual" "text",
    "que_no_funciono" "text",
    "expectativas_30dias" "text",
    "tiempo_semanal" "text",
    "tiene_lesion" boolean DEFAULT false,
    "sugerencia_plan" "text",
    "sugerencia_justificacion" "text",
    "sugerencia_revisada" boolean DEFAULT false,
    CONSTRAINT "cuestionarios_material_check" CHECK (("material" = ANY (ARRAY['sin_material'::"text", 'material_basico'::"text", 'gimnasio'::"text"]))),
    CONSTRAINT "cuestionarios_nivel_check" CHECK (("nivel" = ANY (ARRAY['principiante'::"text", 'intermedio'::"text", 'avanzado'::"text"]))),
    CONSTRAINT "cuestionarios_plazo_check" CHECK (("plazo" = ANY (ARRAY['30_dias'::"text", '3_meses'::"text", '6_meses'::"text", '1_ano'::"text", 'sin_prisa'::"text"]))),
    CONSTRAINT "cuestionarios_sexo_check" CHECK (("sexo" = ANY (ARRAY['hombre'::"text", 'mujer'::"text", 'otro'::"text"]))),
    CONSTRAINT "cuestionarios_tipo_check" CHECK (("tipo" = ANY (ARRAY['presencial'::"text", 'online'::"text"])))
);


ALTER TABLE "public"."cuestionarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cuestionarios_nutricion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "cliente_id" "uuid",
    "peso" numeric,
    "altura" integer,
    "edad" integer,
    "sexo" "text",
    "nivel_actividad" "text",
    "objetivo" "text",
    "velocidad_progreso" "text",
    "comidas_dia" integer,
    "horario_comidas" "text",
    "cocina_en_casa" boolean DEFAULT true,
    "tiempo_cocina" "text",
    "tipo_dieta" "text",
    "alergias" "text",
    "intolerancias" "text",
    "alimentos_no_gustan" "text",
    "alimentos_favoritos" "text",
    "trabaja_fuera" boolean DEFAULT false,
    "entrena_cuando" "text",
    "suplementos" "text",
    "notas" "text",
    "procesado" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "acepta_rgpd" boolean DEFAULT false,
    "acepta_ia" boolean DEFAULT false,
    "fecha_consentimiento" timestamp with time zone DEFAULT "now"(),
    "estilo_vida" "text",
    "timing_hidratos" "text",
    "experiencia_ayuno" "text",
    "interes_suplementacion" boolean DEFAULT false,
    "condiciones_salud" "text"[],
    "medicacion" "text",
    "tiene_condicion_salud" boolean DEFAULT false
);


ALTER TABLE "public"."cuestionarios_nutricion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ejercicios_biblioteca" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "nombre" "text" NOT NULL,
    "patron" "text",
    "grupo_muscular" "text",
    "tipo" "text" DEFAULT 'fuerza'::"text",
    "descripcion" "text",
    "usos" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "grupo_muscular_2" "text",
    "nivel" "text" DEFAULT 'principiante'::"text",
    "modalidades" "text",
    "sinonimos" "text",
    "yt_id" "text",
    "grupo_secundario" "text",
    "modalidad" "text",
    "consejos_tecnica" "text",
    "youtube_url" "text"
);


ALTER TABLE "public"."ejercicios_biblioteca" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fotos_progreso" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "cliente_id" "uuid",
    "url" "text" NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "tipo" "text" DEFAULT 'frontal'::"text",
    "peso" numeric(5,2),
    "notas" "text",
    "visible_cliente" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fotos_progreso" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grupo_clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "grupo_id" "uuid",
    "cliente_id" "uuid",
    "activo" boolean DEFAULT true,
    "fecha_alta" "date" DEFAULT CURRENT_DATE
);


ALTER TABLE "public"."grupo_clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grupos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "centro_id" "uuid",
    "nombre" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "dias_semana" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "hora" time without time zone NOT NULL,
    "duracion_minutos" integer DEFAULT 60,
    "precio_por_persona" numeric DEFAULT 0,
    "precio_total" numeric DEFAULT 0,
    "activo" boolean DEFAULT true,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "grupos_tipo_check" CHECK (("tipo" = ANY (ARRAY['pareja'::"text", 'grupo'::"text"])))
);


ALTER TABLE "public"."grupos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."habitos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "emoji" "text" DEFAULT '✅'::"text",
    "frecuencia" "text" DEFAULT 'diario'::"text",
    "activo" boolean DEFAULT true,
    "orden" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "habitos_frecuencia_check" CHECK (("frecuencia" = ANY (ARRAY['diario'::"text", 'semanal'::"text"])))
);


ALTER TABLE "public"."habitos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."habitos_registro" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "habito_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "completado" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."habitos_registro" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."horas_extra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "fecha" "date" NOT NULL,
    "concepto" "text" NOT NULL,
    "horas" numeric(4,2) NOT NULL,
    "tipo" "text" DEFAULT 'extra'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."horas_extra" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitaciones_centro" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "centro_id" "uuid",
    "email" "text" NOT NULL,
    "rol" "text" DEFAULT 'entrenador'::"text",
    "token" "text" DEFAULT ("gen_random_uuid"())::"text",
    "usado" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invitaciones_centro" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesiones_cliente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_id" "uuid",
    "entrenador_id" "uuid",
    "zona" "text" NOT NULL,
    "descripcion" "text",
    "severidad" "text" DEFAULT 'leve'::"text",
    "es_recurrente" boolean DEFAULT false,
    "visito_medico" boolean DEFAULT false,
    "diagnostico_medico" "text",
    "limitaciones" "text",
    "fecha_inicio" "date" DEFAULT CURRENT_DATE,
    "estado" "text" DEFAULT 'activa'::"text",
    "protocolo_ia" "jsonb",
    "protocolo_generado" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sesion_id" "uuid"
);


ALTER TABLE "public"."lesiones_cliente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marcas_cliente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "cliente_id" "uuid",
    "ejercicio" "text" NOT NULL,
    "peso_kg" numeric,
    "reps" integer,
    "notas" "text",
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."marcas_cliente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medidas_cliente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "cliente_id" "uuid",
    "fecha" "date" NOT NULL,
    "pecho" numeric,
    "cintura" numeric,
    "cadera" numeric,
    "bicep" numeric,
    "muslo" numeric,
    "gemelo" numeric,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cuello" numeric
);


ALTER TABLE "public"."medidas_cliente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mensajes_cliente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "contenido" "text" NOT NULL,
    "leido" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tipo" "text" DEFAULT 'mensaje'::"text",
    "leido_entrenador" boolean DEFAULT true
);


ALTER TABLE "public"."mensajes_cliente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mensajes_programados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "cliente_id" "uuid",
    "contenido" "text" NOT NULL,
    "enviar_en" timestamp with time zone NOT NULL,
    "enviado" boolean DEFAULT false,
    "enviado_en" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mensajes_programados" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."miembros_centro" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "centro_id" "uuid",
    "user_id" "uuid",
    "rol" "text" DEFAULT 'entrenador'::"text",
    "nombre" "text",
    "email" "text",
    "color" "text" DEFAULT '#FF5C00'::"text",
    "activo" boolean DEFAULT true,
    "fecha_alta" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."miembros_centro" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notificaciones_admin" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "cliente_id" "uuid",
    "tipo" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "descripcion" "text",
    "leida" boolean DEFAULT false,
    "url_destino" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notificaciones_admin" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nutricion_registros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_id" "uuid",
    "entrenador_id" "uuid",
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "dia_nombre" "text",
    "adherencia" integer DEFAULT 10,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nutricion_registros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_progreso" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "paso" "text" NOT NULL,
    "completado_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."onboarding_progreso" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pagos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "importe" numeric(8,2) NOT NULL,
    "concepto" "text",
    "fecha_pago" "date" DEFAULT CURRENT_DATE,
    "valido_hasta" "date",
    "estado" "text" DEFAULT 'pagado'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "centro_id" "uuid",
    CONSTRAINT "pagos_estado_check" CHECK (("estado" = ANY (ARRAY['pagado'::"text", 'pendiente'::"text", 'vencido'::"text"])))
);


ALTER TABLE "public"."pagos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."planes_cobro" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "cliente_id" "uuid",
    "importe" numeric(8,2) NOT NULL,
    "concepto" "text" DEFAULT 'Entrenamiento personal'::"text",
    "frecuencia" "text" DEFAULT 'mensual'::"text",
    "dia_cobro" integer DEFAULT 1,
    "activo" boolean DEFAULT true,
    "proximo_cobro" "date",
    "ultimo_cobro" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tarifa_id" "uuid",
    "stripe_subscription_id" "text",
    "stripe_customer_id" "text",
    "estado" "text" DEFAULT 'activo'::"text",
    "plan" "text"
);


ALTER TABLE "public"."planes_cobro" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."planes_nutricion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "cliente_id" "uuid",
    "nombre" "text",
    "objetivo" "text",
    "calorias_dia" integer,
    "proteinas_g" integer,
    "carbohidratos_g" integer,
    "grasas_g" integer,
    "contenido" "jsonb",
    "borrador" "jsonb",
    "estado" "text" DEFAULT 'borrador'::"text",
    "notas_entrenador" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "centro_id" "uuid",
    "estilo_vida" "text"
);


ALTER TABLE "public"."planes_nutricion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plantillas_nutricion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "centro_id" "uuid",
    "nombre" "text" NOT NULL,
    "objetivo" "text",
    "nivel" "text" DEFAULT 'principiante'::"text",
    "descripcion" "text",
    "calorias_dia" integer,
    "proteinas_g" integer,
    "carbohidratos_g" integer,
    "grasas_g" integer,
    "contenido" "jsonb" NOT NULL,
    "es_publica" boolean DEFAULT false,
    "usos" integer DEFAULT 0,
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."plantillas_nutricion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plantillas_rutina" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "nombre" "text" NOT NULL,
    "objetivo" "text",
    "tipo_entrenamiento" "text",
    "dias_semana" integer DEFAULT 3,
    "descripcion" "text",
    "contenido" "jsonb" NOT NULL,
    "usos" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "centro_id" "uuid",
    "es_publica" boolean DEFAULT false,
    "nivel" "text" DEFAULT 'principiante'::"text",
    "semanas" integer DEFAULT 4,
    "tags" "text"[]
);


ALTER TABLE "public"."plantillas_rutina" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."progresion_fuerza" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE,
    "press_banca_kg" numeric(6,2),
    "press_banca_reps" integer,
    "sentadilla_kg" numeric(6,2),
    "sentadilla_reps" integer,
    "peso_muerto_kg" numeric(6,2),
    "peso_muerto_reps" integer,
    "dominadas_reps" integer,
    "dominadas_kg" numeric(6,2),
    "press_militar_kg" numeric(6,2),
    "press_militar_reps" integer,
    "flexiones_reps" integer,
    "progreso_percibido" integer,
    "comentario" "text",
    "semana_numero" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "progresion_fuerza_progreso_percibido_check" CHECK ((("progreso_percibido" >= 1) AND ("progreso_percibido" <= 5)))
);


ALTER TABLE "public"."progresion_fuerza" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservas_clase" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clase_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "estado" "text" DEFAULT 'confirmada'::"text",
    "asistio" boolean,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reservas_clase_estado_check" CHECK (("estado" = ANY (ARRAY['confirmada'::"text", 'cancelada'::"text", 'lista_espera'::"text"])))
);


ALTER TABLE "public"."reservas_clase" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rutinas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "nombre" "text" DEFAULT 'Rutina activa'::"text" NOT NULL,
    "objetivo" "text",
    "semanas" integer DEFAULT 4,
    "dias_semana" integer DEFAULT 3,
    "contenido" "jsonb",
    "borrador" "jsonb",
    "estado" "text" DEFAULT 'borrador'::"text",
    "notas_entrenador" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "centro_id" "uuid",
    "tipo" "text" DEFAULT 'normal'::"text",
    CONSTRAINT "rutinas_estado_check" CHECK (("estado" = ANY (ARRAY['borrador'::"text", 'publicada'::"text", 'archivada'::"text"])))
);


ALTER TABLE "public"."rutinas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sesion_ejercicios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sesion_id" "uuid",
    "cliente_id" "uuid",
    "entrenador_id" "uuid",
    "ejercicio_nombre" "text",
    "patron" "text",
    "orden" integer,
    "sets" "jsonb",
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sesion_ejercicios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sesiones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE,
    "tipo" "text" DEFAULT 'presencial'::"text",
    "completada" boolean DEFAULT true,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rpe" integer,
    "fatiga_post" integer,
    "sensaciones" "text",
    "duracion_minutos" integer,
    "dia_rutina" integer,
    "ejercicios" "jsonb",
    "hora" "text" DEFAULT '09:00'::"text",
    "recurrente_id" "uuid",
    "es_recurrente" boolean DEFAULT false,
    "centro_id" "uuid",
    "cancelada" boolean DEFAULT false,
    "cancelada_por" "text",
    "motivo_cancelacion" "text",
    "cancelada_at" timestamp with time zone,
    "grupo_id" "uuid",
    "fecha_original" "date",
    "asistencia_confirmada" boolean DEFAULT false,
    "asistencia_confirmada_at" timestamp with time zone,
    "notas_cliente" "text",
    "valoracion_pendiente" boolean DEFAULT false,
    CONSTRAINT "sesiones_fatiga_post_check" CHECK ((("fatiga_post" >= 1) AND ("fatiga_post" <= 5))),
    CONSTRAINT "sesiones_rpe_check" CHECK ((("rpe" >= 1) AND ("rpe" <= 10))),
    CONSTRAINT "sesiones_tipo_check" CHECK (("tipo" = ANY (ARRAY['presencial'::"text", 'pareja_grupo'::"text", 'clase_grupal'::"text", 'online'::"text"])))
);


ALTER TABLE "public"."sesiones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sesiones_excepcion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "grupo_id" "uuid",
    "entrenador_id" "uuid",
    "fecha_original" "date" NOT NULL,
    "nueva_fecha" "date" NOT NULL,
    "nueva_hora" time without time zone NOT NULL,
    "duracion_minutos" integer DEFAULT 60,
    "completada" boolean DEFAULT false,
    "cancelada" boolean DEFAULT false,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sesiones_excepcion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sesiones_excepcion_individual" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recurrente_id" "uuid",
    "entrenador_id" "uuid",
    "fecha_original" "date" NOT NULL,
    "nueva_fecha" "date" NOT NULL,
    "nueva_hora" time without time zone NOT NULL,
    "duracion_minutos" integer DEFAULT 60,
    "completada" boolean DEFAULT false,
    "cancelada" boolean DEFAULT false,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sesiones_excepcion_individual" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sesiones_recurrentes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "cliente_id" "uuid",
    "tipo" "text" DEFAULT 'presencial'::"text",
    "hora" "text" NOT NULL,
    "duracion_minutos" integer DEFAULT 60,
    "dias_semana" integer[] NOT NULL,
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date",
    "notas" "text",
    "activa" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "centro_id" "uuid",
    "grupo_id" "uuid"
);


ALTER TABLE "public"."sesiones_recurrentes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."solicitudes_cambio_plan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_id" "uuid",
    "entrenador_id" "uuid",
    "plan_actual" "text",
    "plan_solicitado" "text",
    "estado" "text" DEFAULT 'pendiente'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."solicitudes_cambio_plan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suplementacion_cliente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_id" "uuid",
    "entrenador_id" "uuid",
    "recomendaciones" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "generado_en" timestamp with time zone DEFAULT "now"(),
    "actualizado_en" timestamp with time zone DEFAULT "now"(),
    "basado_en" "jsonb"
);


ALTER TABLE "public"."suplementacion_cliente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tareas_extra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "entrenador_id" "uuid" NOT NULL,
    "texto" "text" NOT NULL,
    "frecuencia" "text",
    "activa" boolean DEFAULT true NOT NULL,
    "orden" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tareas_extra" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarifas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenador_id" "uuid",
    "nombre" "text" NOT NULL,
    "modalidad" "text" NOT NULL,
    "dias_semana" integer NOT NULL,
    "precio" numeric NOT NULL,
    "activa" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tipo" "text" DEFAULT 'presencial'::"text",
    "stripe_price_id" "text",
    "stripe_product_id" "text",
    CONSTRAINT "tarifas_dias_semana_check" CHECK ((("dias_semana" >= 0) AND ("dias_semana" <= 7))),
    CONSTRAINT "tarifas_modalidad_check" CHECK (("modalidad" = ANY (ARRAY['individual'::"text", 'pareja'::"text", 'grupo'::"text"]))),
    CONSTRAINT "tarifas_tipo_check" CHECK (("tipo" = ANY (ARRAY['presencial'::"text", 'online'::"text"])))
);


ALTER TABLE "public"."tarifas" OWNER TO "postgres";


ALTER TABLE ONLY "public"."actividad_cliente"
    ADD CONSTRAINT "actividad_cliente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analisis_mensual"
    ADD CONSTRAINT "analisis_mensual_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."centros"
    ADD CONSTRAINT "centros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkin_config"
    ADD CONSTRAINT "checkin_config_entrenador_id_key" UNIQUE ("entrenador_id");



ALTER TABLE ONLY "public"."checkin_config"
    ADD CONSTRAINT "checkin_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkins"
    ADD CONSTRAINT "checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clases"
    ADD CONSTRAINT "clases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuracion"
    ADD CONSTRAINT "configuracion_entrenador_id_key" UNIQUE ("entrenador_id");



ALTER TABLE ONLY "public"."configuracion"
    ADD CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuracion"
    ADD CONSTRAINT "configuracion_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."configuracion"
    ADD CONSTRAINT "configuracion_slug_publico_key" UNIQUE ("slug_publico");



ALTER TABLE ONLY "public"."cuestionarios_nutricion"
    ADD CONSTRAINT "cuestionarios_nutricion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cuestionarios"
    ADD CONSTRAINT "cuestionarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ejercicios_biblioteca"
    ADD CONSTRAINT "ejercicios_biblioteca_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fotos_progreso"
    ADD CONSTRAINT "fotos_progreso_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grupo_clientes"
    ADD CONSTRAINT "grupo_clientes_grupo_id_cliente_id_key" UNIQUE ("grupo_id", "cliente_id");



ALTER TABLE ONLY "public"."grupo_clientes"
    ADD CONSTRAINT "grupo_clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grupos"
    ADD CONSTRAINT "grupos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."habitos"
    ADD CONSTRAINT "habitos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."habitos_registro"
    ADD CONSTRAINT "habitos_registro_habito_id_fecha_key" UNIQUE ("habito_id", "fecha");



ALTER TABLE ONLY "public"."habitos_registro"
    ADD CONSTRAINT "habitos_registro_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."horas_extra"
    ADD CONSTRAINT "horas_extra_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitaciones_centro"
    ADD CONSTRAINT "invitaciones_centro_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitaciones_centro"
    ADD CONSTRAINT "invitaciones_centro_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."lesiones_cliente"
    ADD CONSTRAINT "lesiones_cliente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marcas_cliente"
    ADD CONSTRAINT "marcas_cliente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medidas_cliente"
    ADD CONSTRAINT "medidas_cliente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mensajes_cliente"
    ADD CONSTRAINT "mensajes_cliente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mensajes_programados"
    ADD CONSTRAINT "mensajes_programados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."miembros_centro"
    ADD CONSTRAINT "miembros_centro_centro_id_user_id_key" UNIQUE ("centro_id", "user_id");



ALTER TABLE ONLY "public"."miembros_centro"
    ADD CONSTRAINT "miembros_centro_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notificaciones_admin"
    ADD CONSTRAINT "notificaciones_admin_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nutricion_registros"
    ADD CONSTRAINT "nutricion_registros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_progreso"
    ADD CONSTRAINT "onboarding_progreso_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_progreso"
    ADD CONSTRAINT "onboarding_progreso_user_id_paso_key" UNIQUE ("user_id", "paso");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."planes_cobro"
    ADD CONSTRAINT "planes_cobro_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."planes_nutricion"
    ADD CONSTRAINT "planes_nutricion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plantillas_nutricion"
    ADD CONSTRAINT "plantillas_nutricion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plantillas_rutina"
    ADD CONSTRAINT "plantillas_rutina_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."progresion_fuerza"
    ADD CONSTRAINT "progresion_fuerza_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservas_clase"
    ADD CONSTRAINT "reservas_clase_clase_id_cliente_id_key" UNIQUE ("clase_id", "cliente_id");



ALTER TABLE ONLY "public"."reservas_clase"
    ADD CONSTRAINT "reservas_clase_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rutinas"
    ADD CONSTRAINT "rutinas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesion_ejercicios"
    ADD CONSTRAINT "sesion_ejercicios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesiones_excepcion"
    ADD CONSTRAINT "sesiones_excepcion_grupo_id_fecha_original_key" UNIQUE ("grupo_id", "fecha_original");



ALTER TABLE ONLY "public"."sesiones_excepcion_individual"
    ADD CONSTRAINT "sesiones_excepcion_individual_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesiones_excepcion_individual"
    ADD CONSTRAINT "sesiones_excepcion_individual_recurrente_id_fecha_original_key" UNIQUE ("recurrente_id", "fecha_original");



ALTER TABLE ONLY "public"."sesiones_excepcion"
    ADD CONSTRAINT "sesiones_excepcion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesiones_recurrentes"
    ADD CONSTRAINT "sesiones_recurrentes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solicitudes_cambio_plan"
    ADD CONSTRAINT "solicitudes_cambio_plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suplementacion_cliente"
    ADD CONSTRAINT "suplementacion_cliente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tareas_extra"
    ADD CONSTRAINT "tareas_extra_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tarifas"
    ADD CONSTRAINT "tarifas_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_actividad_cliente" ON "public"."actividad_cliente" USING "btree" ("cliente_id", "created_at" DESC);



CREATE INDEX "idx_actividad_entrenador" ON "public"."actividad_cliente" USING "btree" ("entrenador_id", "created_at" DESC);



CREATE INDEX "idx_analisis_cliente" ON "public"."analisis_mensual" USING "btree" ("cliente_id", "created_at" DESC);



CREATE INDEX "idx_clientes_auth_user_id" ON "public"."clientes" USING "btree" ("auth_user_id");



CREATE INDEX "idx_clientes_stripe_customer" ON "public"."clientes" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_habitos_cliente" ON "public"."habitos" USING "btree" ("cliente_id");



CREATE INDEX "idx_habitos_registro_fecha" ON "public"."habitos_registro" USING "btree" ("cliente_id", "fecha" DESC);



CREATE INDEX "idx_lesiones_cliente" ON "public"."lesiones_cliente" USING "btree" ("cliente_id", "estado");



CREATE INDEX "idx_lesiones_entrenador" ON "public"."lesiones_cliente" USING "btree" ("entrenador_id", "estado");



CREATE INDEX "idx_mensajes_cliente_id" ON "public"."mensajes_cliente" USING "btree" ("cliente_id");



CREATE INDEX "idx_mensajes_entrenador_id" ON "public"."mensajes_cliente" USING "btree" ("entrenador_id");



CREATE INDEX "idx_msg_prog_enviar" ON "public"."mensajes_programados" USING "btree" ("enviar_en", "enviado");



CREATE INDEX "idx_notif_entrenador_leida" ON "public"."notificaciones_admin" USING "btree" ("entrenador_id", "leida");



CREATE INDEX "idx_planes_cobro_stripe_sub" ON "public"."planes_cobro" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_sesiones_fecha_original" ON "public"."sesiones" USING "btree" ("fecha_original", "cliente_id") WHERE ("fecha_original" IS NOT NULL);



CREATE INDEX "nutricion_registros_cliente_fecha" ON "public"."nutricion_registros" USING "btree" ("cliente_id", "fecha");



CREATE OR REPLACE VIEW "public"."clases_con_plazas" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."entrenador_id",
    "c"."centro_id",
    "c"."nombre",
    "c"."descripcion",
    "c"."tipo",
    "c"."color",
    "c"."fecha",
    "c"."hora",
    "c"."duracion_minutos",
    "c"."plazas_max",
    "c"."es_recurrente",
    "c"."dias_semana",
    "c"."cancelada",
    "c"."notas",
    "c"."created_at",
    "count"("r"."id") FILTER (WHERE ("r"."estado" = 'confirmada'::"text")) AS "plazas_ocupadas",
    ("c"."plazas_max" - "count"("r"."id") FILTER (WHERE ("r"."estado" = 'confirmada'::"text"))) AS "plazas_libres"
   FROM ("public"."clases" "c"
     LEFT JOIN "public"."reservas_clase" "r" ON (("r"."clase_id" = "c"."id")))
  GROUP BY "c"."id";



ALTER TABLE ONLY "public"."actividad_cliente"
    ADD CONSTRAINT "actividad_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."actividad_cliente"
    ADD CONSTRAINT "actividad_cliente_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analisis_mensual"
    ADD CONSTRAINT "analisis_mensual_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analisis_mensual"
    ADD CONSTRAINT "analisis_mensual_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analisis_mensual"
    ADD CONSTRAINT "analisis_mensual_rutina_generada_id_fkey" FOREIGN KEY ("rutina_generada_id") REFERENCES "public"."rutinas"("id");



ALTER TABLE ONLY "public"."centros"
    ADD CONSTRAINT "centros_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkin_config"
    ADD CONSTRAINT "checkin_config_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkins"
    ADD CONSTRAINT "checkins_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id");



ALTER TABLE ONLY "public"."checkins"
    ADD CONSTRAINT "checkins_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkins"
    ADD CONSTRAINT "checkins_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clases"
    ADD CONSTRAINT "clases_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clases"
    ADD CONSTRAINT "clases_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."configuracion"
    ADD CONSTRAINT "configuracion_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cuestionarios"
    ADD CONSTRAINT "cuestionarios_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cuestionarios"
    ADD CONSTRAINT "cuestionarios_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cuestionarios_nutricion"
    ADD CONSTRAINT "cuestionarios_nutricion_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cuestionarios_nutricion"
    ADD CONSTRAINT "cuestionarios_nutricion_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ejercicios_biblioteca"
    ADD CONSTRAINT "ejercicios_biblioteca_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fotos_progreso"
    ADD CONSTRAINT "fotos_progreso_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fotos_progreso"
    ADD CONSTRAINT "fotos_progreso_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grupo_clientes"
    ADD CONSTRAINT "grupo_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grupo_clientes"
    ADD CONSTRAINT "grupo_clientes_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grupos"
    ADD CONSTRAINT "grupos_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habitos"
    ADD CONSTRAINT "habitos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habitos"
    ADD CONSTRAINT "habitos_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habitos_registro"
    ADD CONSTRAINT "habitos_registro_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habitos_registro"
    ADD CONSTRAINT "habitos_registro_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "public"."habitos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."horas_extra"
    ADD CONSTRAINT "horas_extra_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitaciones_centro"
    ADD CONSTRAINT "invitaciones_centro_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesiones_cliente"
    ADD CONSTRAINT "lesiones_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesiones_cliente"
    ADD CONSTRAINT "lesiones_cliente_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lesiones_cliente"
    ADD CONSTRAINT "lesiones_cliente_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marcas_cliente"
    ADD CONSTRAINT "marcas_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marcas_cliente"
    ADD CONSTRAINT "marcas_cliente_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."medidas_cliente"
    ADD CONSTRAINT "medidas_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medidas_cliente"
    ADD CONSTRAINT "medidas_cliente_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."mensajes_cliente"
    ADD CONSTRAINT "mensajes_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mensajes_cliente"
    ADD CONSTRAINT "mensajes_cliente_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mensajes_programados"
    ADD CONSTRAINT "mensajes_programados_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mensajes_programados"
    ADD CONSTRAINT "mensajes_programados_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."miembros_centro"
    ADD CONSTRAINT "miembros_centro_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."miembros_centro"
    ADD CONSTRAINT "miembros_centro_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificaciones_admin"
    ADD CONSTRAINT "notificaciones_admin_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."notificaciones_admin"
    ADD CONSTRAINT "notificaciones_admin_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nutricion_registros"
    ADD CONSTRAINT "nutricion_registros_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutricion_registros"
    ADD CONSTRAINT "nutricion_registros_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."onboarding_progreso"
    ADD CONSTRAINT "onboarding_progreso_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planes_cobro"
    ADD CONSTRAINT "planes_cobro_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planes_cobro"
    ADD CONSTRAINT "planes_cobro_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planes_cobro"
    ADD CONSTRAINT "planes_cobro_tarifa_id_fkey" FOREIGN KEY ("tarifa_id") REFERENCES "public"."tarifas"("id");



ALTER TABLE ONLY "public"."planes_nutricion"
    ADD CONSTRAINT "planes_nutricion_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id");



ALTER TABLE ONLY "public"."planes_nutricion"
    ADD CONSTRAINT "planes_nutricion_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planes_nutricion"
    ADD CONSTRAINT "planes_nutricion_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plantillas_nutricion"
    ADD CONSTRAINT "plantillas_nutricion_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id");



ALTER TABLE ONLY "public"."plantillas_nutricion"
    ADD CONSTRAINT "plantillas_nutricion_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plantillas_rutina"
    ADD CONSTRAINT "plantillas_rutina_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id");



ALTER TABLE ONLY "public"."plantillas_rutina"
    ADD CONSTRAINT "plantillas_rutina_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progresion_fuerza"
    ADD CONSTRAINT "progresion_fuerza_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progresion_fuerza"
    ADD CONSTRAINT "progresion_fuerza_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservas_clase"
    ADD CONSTRAINT "reservas_clase_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "public"."clases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservas_clase"
    ADD CONSTRAINT "reservas_clase_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservas_clase"
    ADD CONSTRAINT "reservas_clase_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."rutinas"
    ADD CONSTRAINT "rutinas_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id");



ALTER TABLE ONLY "public"."rutinas"
    ADD CONSTRAINT "rutinas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rutinas"
    ADD CONSTRAINT "rutinas_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesion_ejercicios"
    ADD CONSTRAINT "sesion_ejercicios_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesion_ejercicios"
    ADD CONSTRAINT "sesion_ejercicios_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id");



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesiones_excepcion"
    ADD CONSTRAINT "sesiones_excepcion_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sesiones_excepcion"
    ADD CONSTRAINT "sesiones_excepcion_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesiones_excepcion_individual"
    ADD CONSTRAINT "sesiones_excepcion_individual_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sesiones_excepcion_individual"
    ADD CONSTRAINT "sesiones_excepcion_individual_recurrente_id_fkey" FOREIGN KEY ("recurrente_id") REFERENCES "public"."sesiones_recurrentes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sesiones_recurrentes"
    ADD CONSTRAINT "sesiones_recurrentes_centro_id_fkey" FOREIGN KEY ("centro_id") REFERENCES "public"."centros"("id");



ALTER TABLE ONLY "public"."sesiones_recurrentes"
    ADD CONSTRAINT "sesiones_recurrentes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesiones_recurrentes"
    ADD CONSTRAINT "sesiones_recurrentes_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesiones_recurrentes"
    ADD CONSTRAINT "sesiones_recurrentes_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."solicitudes_cambio_plan"
    ADD CONSTRAINT "solicitudes_cambio_plan_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."solicitudes_cambio_plan"
    ADD CONSTRAINT "solicitudes_cambio_plan_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."suplementacion_cliente"
    ADD CONSTRAINT "suplementacion_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suplementacion_cliente"
    ADD CONSTRAINT "suplementacion_cliente_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tareas_extra"
    ADD CONSTRAINT "tareas_extra_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarifas"
    ADD CONSTRAINT "tarifas_entrenador_id_fkey" FOREIGN KEY ("entrenador_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."actividad_cliente" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alertas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alertas_entrenador" ON "public"."alertas" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."analisis_mensual" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "biblioteca_entrenador" ON "public"."ejercicios_biblioteca" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."centros" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "centros_delete" ON "public"."centros" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "centros_insert" ON "public"."centros" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "centros_select" ON "public"."centros" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR ("id" IN ( SELECT "public"."get_mis_centros"("auth"."uid"()) AS "get_mis_centros"))));



CREATE POLICY "centros_update" ON "public"."centros" FOR UPDATE USING (("owner_id" = "auth"."uid"()));



ALTER TABLE "public"."checkin_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkin_config_entrenador" ON "public"."checkin_config" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."checkins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkins_cliente_insert" ON "public"."checkins" FOR INSERT TO "authenticated" WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "checkins_cliente_select" ON "public"."checkins" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."clases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cliente inserta sus lesiones" ON "public"."lesiones_cliente" FOR INSERT WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "cliente inserta sus solicitudes" ON "public"."solicitudes_cambio_plan" FOR INSERT WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "cliente puede insertar sus registros" ON "public"."nutricion_registros" FOR INSERT WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "cliente puede ver sus registros" ON "public"."nutricion_registros" FOR SELECT USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "cliente ve su suplementación" ON "public"."suplementacion_cliente" FOR SELECT USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "cliente ve sus lesiones" ON "public"."lesiones_cliente" FOR SELECT USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "cliente ve sus solicitudes" ON "public"."solicitudes_cambio_plan" FOR SELECT USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "cliente_inserta_medidas" ON "public"."medidas_cliente" FOR INSERT WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clientes_self_select" ON "public"."clientes" FOR SELECT TO "authenticated" USING (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "config_entrenador" ON "public"."configuracion" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."configuracion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "configuracion_cliente_centro_select" ON "public"."configuracion" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."clientes" "c"
     JOIN "public"."miembros_centro" "mc_cliente" ON ((("mc_cliente"."centro_id" = "c"."centro_id") AND ("mc_cliente"."user_id" = "c"."entrenador_id"))))
     JOIN "public"."miembros_centro" "mc_target" ON ((("mc_target"."centro_id" = "c"."centro_id") AND ("mc_target"."user_id" = "configuracion"."entrenador_id"))))
  WHERE ("c"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "configuracion_cliente_select" ON "public"."configuracion" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clientes" "c"
  WHERE (("c"."auth_user_id" = "auth"."uid"()) AND ("c"."entrenador_id" = "configuracion"."entrenador_id")))));



CREATE POLICY "cuest_nutricion_entrenador" ON "public"."cuestionarios_nutricion" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "cuestionario_entrenador" ON "public"."cuestionarios" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."cuestionarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cuestionarios_cliente_select" ON "public"."cuestionarios" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "cuestionarios_insert_publico" ON "public"."cuestionarios" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."cuestionarios_nutricion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cuestionarios_select_por_cliente_id" ON "public"."cuestionarios" FOR SELECT USING ((("auth"."uid"() = "entrenador_id") OR (("auth"."uid"() IS NOT NULL) AND ("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "cuestn_cliente_select" ON "public"."cuestionarios_nutricion" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "cuestn_insert_publico" ON "public"."cuestionarios_nutricion" FOR INSERT WITH CHECK (true);



CREATE POLICY "cuestn_select_autenticado" ON "public"."cuestionarios_nutricion" FOR SELECT USING ((("auth"."uid"() = "entrenador_id") OR (("auth"."uid"() IS NOT NULL) AND ("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "ejbib_cliente_select" ON "public"."ejercicios_biblioteca" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clientes" "c"
  WHERE (("c"."auth_user_id" = "auth"."uid"()) AND ("c"."entrenador_id" = "ejercicios_biblioteca"."entrenador_id")))));



ALTER TABLE "public"."ejercicios_biblioteca" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entrenador gestiona lesiones" ON "public"."lesiones_cliente" USING (("entrenador_id" = "auth"."uid"()));



CREATE POLICY "entrenador gestiona mensajes programados" ON "public"."mensajes_programados" USING (("entrenador_id" = "auth"."uid"()));



CREATE POLICY "entrenador gestiona reservas" ON "public"."reservas_clase" USING ((("auth"."uid"() = "entrenador_id") OR (EXISTS ( SELECT 1
   FROM "public"."clientes"
  WHERE (("clientes"."auth_user_id" = "auth"."uid"()) AND ("clientes"."id" = "reservas_clase"."cliente_id"))))));



CREATE POLICY "entrenador gestiona solicitudes" ON "public"."solicitudes_cambio_plan" USING (("entrenador_id" = "auth"."uid"()));



CREATE POLICY "entrenador gestiona suplementación" ON "public"."suplementacion_cliente" USING (("entrenador_id" = "auth"."uid"()));



CREATE POLICY "entrenador gestiona sus clases" ON "public"."clases" USING ((("auth"."uid"() = "entrenador_id") OR (EXISTS ( SELECT 1
   FROM "public"."clientes"
  WHERE (("clientes"."auth_user_id" = "auth"."uid"()) AND ("clientes"."entrenador_id" = "clases"."entrenador_id"))))));



CREATE POLICY "entrenador gestiona sus planes" ON "public"."planes_cobro" USING (("entrenador_id" = "auth"."uid"()));



CREATE POLICY "entrenador gestiona sus planes de cobro" ON "public"."planes_cobro" USING (("entrenador_id" = "auth"."uid"()));



CREATE POLICY "entrenador puede ver registros de sus clientes" ON "public"."nutricion_registros" USING (("entrenador_id" = "auth"."uid"()));



CREATE POLICY "entrenador ve actividad de sus clientes" ON "public"."actividad_cliente" USING ((("auth"."uid"() = "entrenador_id") OR (EXISTS ( SELECT 1
   FROM "public"."clientes"
  WHERE (("clientes"."auth_user_id" = "auth"."uid"()) AND ("clientes"."id" = "actividad_cliente"."cliente_id"))))));



CREATE POLICY "entrenador ve sus notificaciones" ON "public"."notificaciones_admin" USING (("entrenador_id" = "auth"."uid"()));



CREATE POLICY "entrenador_analisis" ON "public"."analisis_mensual" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "entrenador_checkins" ON "public"."checkins" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "entrenador_clientes" ON "public"."clientes" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "entrenador_excepciones" ON "public"."sesiones_excepcion" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "entrenador_excepciones_ind" ON "public"."sesiones_excepcion_individual" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "entrenador_grupo_clientes" ON "public"."grupo_clientes" USING ((EXISTS ( SELECT 1
   FROM "public"."grupos" "g"
  WHERE (("g"."id" = "grupo_clientes"."grupo_id") AND (("g"."entrenador_id" = "auth"."uid"()) OR ("g"."centro_id" IN ( SELECT "miembros_centro"."centro_id"
           FROM "public"."miembros_centro"
          WHERE (("miembros_centro"."user_id" = "auth"."uid"()) AND ("miembros_centro"."activo" = true)))))))));



CREATE POLICY "entrenador_grupos" ON "public"."grupos" USING ((("auth"."uid"() = "entrenador_id") OR ("centro_id" IN ( SELECT "miembros_centro"."centro_id"
   FROM "public"."miembros_centro"
  WHERE (("miembros_centro"."user_id" = "auth"."uid"()) AND ("miembros_centro"."activo" = true))))));



CREATE POLICY "entrenador_habitos" ON "public"."habitos" USING ((("auth"."uid"() = "entrenador_id") OR (EXISTS ( SELECT 1
   FROM "public"."clientes"
  WHERE (("clientes"."auth_user_id" = "auth"."uid"()) AND ("clientes"."id" = "habitos"."cliente_id"))))));



CREATE POLICY "entrenador_pagos" ON "public"."pagos" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "entrenador_planes_cobro" ON "public"."planes_cobro" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "entrenador_sesiones" ON "public"."sesiones" TO "authenticated" USING (("auth"."uid"() = "entrenador_id")) WITH CHECK (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "entrenador_tarifas" ON "public"."tarifas" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "fotos_cliente_insert" ON "public"."fotos_progreso" FOR INSERT TO "authenticated" WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "fotos_cliente_select" ON "public"."fotos_progreso" FOR SELECT TO "authenticated" USING ((("visible_cliente" = true) AND ("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "fotos_entrenador" ON "public"."fotos_progreso" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."fotos_progreso" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grupo_clientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grupos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."habitos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "habitos_entrenador" ON "public"."habitos" USING ((("auth"."uid"() = "entrenador_id") OR (EXISTS ( SELECT 1
   FROM "public"."clientes"
  WHERE (("clientes"."auth_user_id" = "auth"."uid"()) AND ("clientes"."id" = "habitos"."cliente_id"))))));



ALTER TABLE "public"."habitos_registro" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "habitos_registro_cliente" ON "public"."habitos_registro" USING (((EXISTS ( SELECT 1
   FROM "public"."clientes"
  WHERE (("clientes"."auth_user_id" = "auth"."uid"()) AND ("clientes"."id" = "habitos_registro"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."habitos" "h"
  WHERE (("h"."id" = "habitos_registro"."habito_id") AND ("h"."entrenador_id" = "auth"."uid"()))))));



ALTER TABLE "public"."horas_extra" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "horas_extra_entrenador" ON "public"."horas_extra" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."invitaciones_centro" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitaciones_insert" ON "public"."invitaciones_centro" FOR INSERT WITH CHECK ((("centro_id" IN ( SELECT "centros"."id"
   FROM "public"."centros"
  WHERE ("centros"."owner_id" = "auth"."uid"()))) OR ("centro_id" IN ( SELECT "miembros_centro"."centro_id"
   FROM "public"."miembros_centro"
  WHERE (("miembros_centro"."user_id" = "auth"."uid"()) AND ("miembros_centro"."rol" = 'admin'::"text") AND ("miembros_centro"."activo" = true))))));



CREATE POLICY "invitaciones_select" ON "public"."invitaciones_centro" FOR SELECT TO "authenticated" USING ((("centro_id" IN ( SELECT "centros"."id"
   FROM "public"."centros"
  WHERE ("centros"."owner_id" = "auth"."uid"()))) OR ("centro_id" IN ( SELECT "miembros_centro"."centro_id"
   FROM "public"."miembros_centro"
  WHERE (("miembros_centro"."user_id" = "auth"."uid"()) AND ("miembros_centro"."rol" = 'admin'::"text"))))));



ALTER TABLE "public"."lesiones_cliente" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marcas_cliente" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marcas_cliente_insert" ON "public"."marcas_cliente" FOR INSERT WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "marcas_cliente_select" ON "public"."marcas_cliente" FOR SELECT USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "marcas_entrenador" ON "public"."marcas_cliente" USING (("entrenador_id" = "auth"."uid"()));



ALTER TABLE "public"."medidas_cliente" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "medidas_cliente_insert" ON "public"."medidas_cliente" FOR INSERT TO "authenticated" WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "medidas_cliente_select" ON "public"."medidas_cliente" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "medidas_entrenador" ON "public"."medidas_cliente" USING (("entrenador_id" = "auth"."uid"()));



CREATE POLICY "mensajes_cli_insert" ON "public"."mensajes_cliente" FOR INSERT TO "authenticated" WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "mensajes_cli_select" ON "public"."mensajes_cliente" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "mensajes_cli_update" ON "public"."mensajes_cliente" FOR UPDATE TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"())))) WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."mensajes_cliente" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mensajes_entrenador" ON "public"."mensajes_cliente" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."mensajes_programados" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."miembros_centro" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "miembros_insert" ON "public"."miembros_centro" FOR INSERT WITH CHECK (((("user_id" = "auth"."uid"()) AND ("centro_id" IN ( SELECT "centros"."id"
   FROM "public"."centros"
  WHERE ("centros"."owner_id" = "auth"."uid"())))) OR (("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."invitaciones_centro"
  WHERE (("invitaciones_centro"."centro_id" = "miembros_centro"."centro_id") AND ("invitaciones_centro"."email" = (( SELECT "users"."email"
           FROM "auth"."users"
          WHERE ("users"."id" = "auth"."uid"())))::"text") AND ("invitaciones_centro"."usado" = false)))))));



CREATE POLICY "miembros_select" ON "public"."miembros_centro" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("centro_id" IN ( SELECT "public"."get_mis_centros"("auth"."uid"()) AS "get_mis_centros"))));



CREATE POLICY "miembros_update" ON "public"."miembros_centro" FOR UPDATE USING (("centro_id" IN ( SELECT "centros"."id"
   FROM "public"."centros"
  WHERE ("centros"."owner_id" = "auth"."uid"()))));



ALTER TABLE "public"."notificaciones_admin" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nutricion_registros" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_progreso" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pagos_cliente_select" ON "public"."pagos" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "pf_entrenador" ON "public"."progresion_fuerza" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "planes_cliente_select" ON "public"."planes_nutricion" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."planes_cobro" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planes_nutricion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "planes_nutricion_write" ON "public"."planes_nutricion" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "plantillas_entrenador" ON "public"."plantillas_rutina" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."plantillas_nutricion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plantillas_nutricion_centro_select" ON "public"."plantillas_nutricion" FOR SELECT USING ((("es_publica" = true) OR ("auth"."uid"() = "entrenador_id") OR ("centro_id" IN ( SELECT "miembros_centro"."centro_id"
   FROM "public"."miembros_centro"
  WHERE (("miembros_centro"."user_id" = "auth"."uid"()) AND ("miembros_centro"."activo" = true))))));



CREATE POLICY "plantillas_nutricion_entrenador" ON "public"."plantillas_nutricion" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."plantillas_rutina" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "progresion_cliente_select" ON "public"."progresion_fuerza" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "progresion_entrenador" ON "public"."progresion_fuerza" USING (("auth"."uid"() = "entrenador_id"));



ALTER TABLE "public"."progresion_fuerza" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recurrentes_entrenador" ON "public"."sesiones_recurrentes" USING (("auth"."uid"() = "entrenador_id"));



CREATE POLICY "registro_habitos" ON "public"."habitos_registro" USING ((EXISTS ( SELECT 1
   FROM "public"."habitos" "h"
  WHERE (("h"."id" = "habitos_registro"."habito_id") AND (("h"."entrenador_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."clientes"
          WHERE (("clientes"."auth_user_id" = "auth"."uid"()) AND ("clientes"."id" = "h"."cliente_id")))))))));



ALTER TABLE "public"."reservas_clase" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rutinas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rutinas_cliente_select" ON "public"."rutinas" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "rutinas_propias" ON "public"."rutinas" USING (("entrenador_id" = "auth"."uid"()));



CREATE POLICY "sesion_ej_cliente_insert" ON "public"."sesion_ejercicios" FOR INSERT TO "authenticated" WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "sesion_ej_cliente_select" ON "public"."sesion_ejercicios" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "sesion_ej_entrenador" ON "public"."sesion_ejercicios" USING (("entrenador_id" = "auth"."uid"()));



ALTER TABLE "public"."sesion_ejercicios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sesiones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sesiones_centro_admin" ON "public"."sesiones" TO "authenticated" USING ((("centro_id" IN ( SELECT "centros"."id"
   FROM "public"."centros"
  WHERE ("centros"."owner_id" = "auth"."uid"()))) OR ("centro_id" IN ( SELECT "miembros_centro"."centro_id"
   FROM "public"."miembros_centro"
  WHERE (("miembros_centro"."user_id" = "auth"."uid"()) AND ("miembros_centro"."rol" = 'admin'::"text")))))) WITH CHECK ((("centro_id" IN ( SELECT "centros"."id"
   FROM "public"."centros"
  WHERE ("centros"."owner_id" = "auth"."uid"()))) OR ("centro_id" IN ( SELECT "miembros_centro"."centro_id"
   FROM "public"."miembros_centro"
  WHERE (("miembros_centro"."user_id" = "auth"."uid"()) AND ("miembros_centro"."rol" = 'admin'::"text"))))));



CREATE POLICY "sesiones_cliente_cancelar" ON "public"."sesiones" FOR UPDATE USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"())))) WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "sesiones_cliente_insert" ON "public"."sesiones" FOR INSERT TO "authenticated" WITH CHECK (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "sesiones_cliente_select" ON "public"."sesiones" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."sesiones_excepcion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sesiones_excepcion_individual" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sesiones_recurrentes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sesiones_recurrentes_centro_admin" ON "public"."sesiones_recurrentes" TO "authenticated" USING ((("entrenador_id" = "auth"."uid"()) OR ("centro_id" IN ( SELECT "centros"."id"
   FROM "public"."centros"
  WHERE ("centros"."owner_id" = "auth"."uid"()))) OR ("centro_id" IN ( SELECT "miembros_centro"."centro_id"
   FROM "public"."miembros_centro"
  WHERE (("miembros_centro"."user_id" = "auth"."uid"()) AND ("miembros_centro"."rol" = 'admin'::"text")))))) WITH CHECK ((("centro_id" IN ( SELECT "centros"."id"
   FROM "public"."centros"
  WHERE ("centros"."owner_id" = "auth"."uid"()))) OR ("centro_id" IN ( SELECT "miembros_centro"."centro_id"
   FROM "public"."miembros_centro"
  WHERE (("miembros_centro"."user_id" = "auth"."uid"()) AND ("miembros_centro"."rol" = 'admin'::"text"))))));



ALTER TABLE "public"."solicitudes_cambio_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suplementacion_cliente" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tareas_extra" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tareas_extra_cliente_select" ON "public"."tareas_extra" FOR SELECT TO "authenticated" USING (("cliente_id" IN ( SELECT "clientes"."id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "tareas_extra_entrenador" ON "public"."tareas_extra" TO "authenticated" USING (("entrenador_id" = "auth"."uid"())) WITH CHECK (("entrenador_id" = "auth"."uid"()));



ALTER TABLE "public"."tarifas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuario ve su propio progreso" ON "public"."onboarding_progreso" USING (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































REVOKE ALL ON FUNCTION "public"."get_mis_centros"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_mis_centros"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_mis_centros"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";
























GRANT ALL ON TABLE "public"."actividad_cliente" TO "anon";
GRANT ALL ON TABLE "public"."actividad_cliente" TO "authenticated";
GRANT ALL ON TABLE "public"."actividad_cliente" TO "service_role";



GRANT ALL ON TABLE "public"."alertas" TO "anon";
GRANT ALL ON TABLE "public"."alertas" TO "authenticated";
GRANT ALL ON TABLE "public"."alertas" TO "service_role";



GRANT ALL ON TABLE "public"."analisis_mensual" TO "anon";
GRANT ALL ON TABLE "public"."analisis_mensual" TO "authenticated";
GRANT ALL ON TABLE "public"."analisis_mensual" TO "service_role";



GRANT ALL ON TABLE "public"."centros" TO "anon";
GRANT ALL ON TABLE "public"."centros" TO "authenticated";
GRANT ALL ON TABLE "public"."centros" TO "service_role";



GRANT ALL ON TABLE "public"."checkin_config" TO "anon";
GRANT ALL ON TABLE "public"."checkin_config" TO "authenticated";
GRANT ALL ON TABLE "public"."checkin_config" TO "service_role";



GRANT ALL ON TABLE "public"."checkins" TO "anon";
GRANT ALL ON TABLE "public"."checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."checkins" TO "service_role";



GRANT ALL ON TABLE "public"."clases" TO "anon";
GRANT ALL ON TABLE "public"."clases" TO "authenticated";
GRANT ALL ON TABLE "public"."clases" TO "service_role";



GRANT ALL ON TABLE "public"."clases_con_plazas" TO "anon";
GRANT ALL ON TABLE "public"."clases_con_plazas" TO "authenticated";
GRANT ALL ON TABLE "public"."clases_con_plazas" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."configuracion" TO "anon";
GRANT ALL ON TABLE "public"."configuracion" TO "authenticated";
GRANT ALL ON TABLE "public"."configuracion" TO "service_role";



GRANT ALL ON TABLE "public"."cuestionarios" TO "anon";
GRANT ALL ON TABLE "public"."cuestionarios" TO "authenticated";
GRANT ALL ON TABLE "public"."cuestionarios" TO "service_role";



GRANT ALL ON TABLE "public"."cuestionarios_nutricion" TO "anon";
GRANT ALL ON TABLE "public"."cuestionarios_nutricion" TO "authenticated";
GRANT ALL ON TABLE "public"."cuestionarios_nutricion" TO "service_role";



GRANT ALL ON TABLE "public"."ejercicios_biblioteca" TO "anon";
GRANT ALL ON TABLE "public"."ejercicios_biblioteca" TO "authenticated";
GRANT ALL ON TABLE "public"."ejercicios_biblioteca" TO "service_role";



GRANT ALL ON TABLE "public"."fotos_progreso" TO "anon";
GRANT ALL ON TABLE "public"."fotos_progreso" TO "authenticated";
GRANT ALL ON TABLE "public"."fotos_progreso" TO "service_role";



GRANT ALL ON TABLE "public"."grupo_clientes" TO "anon";
GRANT ALL ON TABLE "public"."grupo_clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."grupo_clientes" TO "service_role";



GRANT ALL ON TABLE "public"."grupos" TO "anon";
GRANT ALL ON TABLE "public"."grupos" TO "authenticated";
GRANT ALL ON TABLE "public"."grupos" TO "service_role";



GRANT ALL ON TABLE "public"."habitos" TO "anon";
GRANT ALL ON TABLE "public"."habitos" TO "authenticated";
GRANT ALL ON TABLE "public"."habitos" TO "service_role";



GRANT ALL ON TABLE "public"."habitos_registro" TO "anon";
GRANT ALL ON TABLE "public"."habitos_registro" TO "authenticated";
GRANT ALL ON TABLE "public"."habitos_registro" TO "service_role";



GRANT ALL ON TABLE "public"."horas_extra" TO "anon";
GRANT ALL ON TABLE "public"."horas_extra" TO "authenticated";
GRANT ALL ON TABLE "public"."horas_extra" TO "service_role";



GRANT ALL ON TABLE "public"."invitaciones_centro" TO "anon";
GRANT ALL ON TABLE "public"."invitaciones_centro" TO "authenticated";
GRANT ALL ON TABLE "public"."invitaciones_centro" TO "service_role";



GRANT ALL ON TABLE "public"."lesiones_cliente" TO "anon";
GRANT ALL ON TABLE "public"."lesiones_cliente" TO "authenticated";
GRANT ALL ON TABLE "public"."lesiones_cliente" TO "service_role";



GRANT ALL ON TABLE "public"."marcas_cliente" TO "anon";
GRANT ALL ON TABLE "public"."marcas_cliente" TO "authenticated";
GRANT ALL ON TABLE "public"."marcas_cliente" TO "service_role";



GRANT ALL ON TABLE "public"."medidas_cliente" TO "anon";
GRANT ALL ON TABLE "public"."medidas_cliente" TO "authenticated";
GRANT ALL ON TABLE "public"."medidas_cliente" TO "service_role";



GRANT ALL ON TABLE "public"."mensajes_cliente" TO "anon";
GRANT ALL ON TABLE "public"."mensajes_cliente" TO "authenticated";
GRANT ALL ON TABLE "public"."mensajes_cliente" TO "service_role";



GRANT ALL ON TABLE "public"."mensajes_programados" TO "anon";
GRANT ALL ON TABLE "public"."mensajes_programados" TO "authenticated";
GRANT ALL ON TABLE "public"."mensajes_programados" TO "service_role";



GRANT ALL ON TABLE "public"."miembros_centro" TO "anon";
GRANT ALL ON TABLE "public"."miembros_centro" TO "authenticated";
GRANT ALL ON TABLE "public"."miembros_centro" TO "service_role";



GRANT ALL ON TABLE "public"."notificaciones_admin" TO "anon";
GRANT ALL ON TABLE "public"."notificaciones_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."notificaciones_admin" TO "service_role";



GRANT ALL ON TABLE "public"."nutricion_registros" TO "anon";
GRANT ALL ON TABLE "public"."nutricion_registros" TO "authenticated";
GRANT ALL ON TABLE "public"."nutricion_registros" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_progreso" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_progreso" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_progreso" TO "service_role";



GRANT ALL ON TABLE "public"."pagos" TO "anon";
GRANT ALL ON TABLE "public"."pagos" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos" TO "service_role";



GRANT ALL ON TABLE "public"."planes_cobro" TO "anon";
GRANT ALL ON TABLE "public"."planes_cobro" TO "authenticated";
GRANT ALL ON TABLE "public"."planes_cobro" TO "service_role";



GRANT ALL ON TABLE "public"."planes_nutricion" TO "anon";
GRANT ALL ON TABLE "public"."planes_nutricion" TO "authenticated";
GRANT ALL ON TABLE "public"."planes_nutricion" TO "service_role";



GRANT ALL ON TABLE "public"."plantillas_nutricion" TO "anon";
GRANT ALL ON TABLE "public"."plantillas_nutricion" TO "authenticated";
GRANT ALL ON TABLE "public"."plantillas_nutricion" TO "service_role";



GRANT ALL ON TABLE "public"."plantillas_rutina" TO "anon";
GRANT ALL ON TABLE "public"."plantillas_rutina" TO "authenticated";
GRANT ALL ON TABLE "public"."plantillas_rutina" TO "service_role";



GRANT ALL ON TABLE "public"."progresion_fuerza" TO "anon";
GRANT ALL ON TABLE "public"."progresion_fuerza" TO "authenticated";
GRANT ALL ON TABLE "public"."progresion_fuerza" TO "service_role";



GRANT ALL ON TABLE "public"."reservas_clase" TO "anon";
GRANT ALL ON TABLE "public"."reservas_clase" TO "authenticated";
GRANT ALL ON TABLE "public"."reservas_clase" TO "service_role";



GRANT ALL ON TABLE "public"."rutinas" TO "anon";
GRANT ALL ON TABLE "public"."rutinas" TO "authenticated";
GRANT ALL ON TABLE "public"."rutinas" TO "service_role";



GRANT ALL ON TABLE "public"."sesion_ejercicios" TO "anon";
GRANT ALL ON TABLE "public"."sesion_ejercicios" TO "authenticated";
GRANT ALL ON TABLE "public"."sesion_ejercicios" TO "service_role";



GRANT ALL ON TABLE "public"."sesiones" TO "anon";
GRANT ALL ON TABLE "public"."sesiones" TO "authenticated";
GRANT ALL ON TABLE "public"."sesiones" TO "service_role";



GRANT ALL ON TABLE "public"."sesiones_excepcion" TO "anon";
GRANT ALL ON TABLE "public"."sesiones_excepcion" TO "authenticated";
GRANT ALL ON TABLE "public"."sesiones_excepcion" TO "service_role";



GRANT ALL ON TABLE "public"."sesiones_excepcion_individual" TO "anon";
GRANT ALL ON TABLE "public"."sesiones_excepcion_individual" TO "authenticated";
GRANT ALL ON TABLE "public"."sesiones_excepcion_individual" TO "service_role";



GRANT ALL ON TABLE "public"."sesiones_recurrentes" TO "anon";
GRANT ALL ON TABLE "public"."sesiones_recurrentes" TO "authenticated";
GRANT ALL ON TABLE "public"."sesiones_recurrentes" TO "service_role";



GRANT ALL ON TABLE "public"."solicitudes_cambio_plan" TO "anon";
GRANT ALL ON TABLE "public"."solicitudes_cambio_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."solicitudes_cambio_plan" TO "service_role";



GRANT ALL ON TABLE "public"."suplementacion_cliente" TO "anon";
GRANT ALL ON TABLE "public"."suplementacion_cliente" TO "authenticated";
GRANT ALL ON TABLE "public"."suplementacion_cliente" TO "service_role";



GRANT ALL ON TABLE "public"."tareas_extra" TO "anon";
GRANT ALL ON TABLE "public"."tareas_extra" TO "authenticated";
GRANT ALL ON TABLE "public"."tareas_extra" TO "service_role";



GRANT ALL ON TABLE "public"."tarifas" TO "anon";
GRANT ALL ON TABLE "public"."tarifas" TO "authenticated";
GRANT ALL ON TABLE "public"."tarifas" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































