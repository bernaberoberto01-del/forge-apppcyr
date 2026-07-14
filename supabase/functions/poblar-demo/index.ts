import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET');
const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret'
};
const UID = 'ef91ac06-31f3-4013-a295-16ad6877bcb0';
const rand = (a, b)=>Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr)=>arr[rand(0, arr.length - 1)];
const fechaStr = (d)=>d.toISOString().split('T')[0];
const NOMBRES_M = [
  'Carlos',
  'Miguel',
  'David',
  'Jorge',
  'Pablo',
  'Alejandro',
  'Fernando',
  'Roberto',
  'Manuel',
  'Sergio',
  'Raul',
  'Ivan',
  'Diego',
  'Ruben',
  'Adrian',
  'Guillermo',
  'Oscar',
  'Victor',
  'Alberto',
  'Javier',
  'Antonio',
  'Luis',
  'Jose',
  'Pedro',
  'Enrique',
  'Ramon',
  'Andres',
  'Francisco',
  'Rafael',
  'Eduardo',
  'Mario',
  'Hugo',
  'Nicolas',
  'Gabriel',
  'Mateo'
];
const NOMBRES_F = [
  'Maria',
  'Carmen',
  'Laura',
  'Ana',
  'Isabel',
  'Lucia',
  'Marta',
  'Sara',
  'Elena',
  'Patricia',
  'Cristina',
  'Natalia',
  'Silvia',
  'Rosa',
  'Pilar',
  'Beatriz',
  'Eva',
  'Irene',
  'Nuria',
  'Veronica',
  'Lorena',
  'Susana',
  'Alicia',
  'Rocio',
  'Claudia',
  'Marina',
  'Alba',
  'Sandra',
  'Raquel',
  'Monica',
  'Julia',
  'Paula',
  'Sofia',
  'Andrea',
  'Claudia'
];
const APELLIDOS = [
  'Garcia',
  'Martinez',
  'Lopez',
  'Sanchez',
  'Perez',
  'Gonzalez',
  'Rodriguez',
  'Fernandez',
  'Ramirez',
  'Torres',
  'Flores',
  'Herrera',
  'Jimenez',
  'Ruiz',
  'Moreno',
  'Navarro',
  'Diaz',
  'Romero',
  'Alonso',
  'Gutierrez',
  'Nunez',
  'Pardo',
  'Vega',
  'Reyes',
  'Molina',
  'Castro',
  'Ortega',
  'Delgado',
  'Ramos',
  'Gil',
  'Marquez',
  'Santos',
  'Vargas',
  'Mendez',
  'Aguilar'
];
const OBJETIVOS = [
  'perdida_grasa',
  'perdida_grasa',
  'perdida_grasa',
  'ganancia_muscular',
  'ganancia_muscular',
  'tonificacion',
  'tonificacion',
  'fuerza',
  'rendimiento',
  'salud_general'
];
const TIPOS_E = [
  'perdida_grasa',
  'perdida_grasa',
  'hipertrofia',
  'hipertrofia',
  'wellness',
  'fuerza',
  'resistencia'
];
const NIVELES = [
  'principiante',
  'principiante',
  'intermedio',
  'intermedio',
  'avanzado'
];
const MATERIALES = [
  'gimnasio',
  'gimnasio',
  'gimnasio',
  'casa',
  'sin_material'
];
const LESIONES = [
  null,
  null,
  null,
  null,
  'Dolor lumbar leve',
  'Tendinitis rotuliana',
  'Epicondilitis codo derecho',
  'Esguince tobillo antiguo'
];
const NOTAS = [
  'Muy constante, nunca falta',
  'Le cuesta la dieta',
  'Motivacion muy alta',
  'Trabaja mucho, poco tiempo',
  'Le gustan los ejercicios compuestos',
  'Objetivo estetico claro',
  'Historial deportivo, aprende rapido',
  'Necesita supervision tecnica'
];
const HORAS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '19:30',
  '20:00'
];
const MSGS = [
  'Esta semana vamos a subir la intensidad. Llevas un mes muy constante.',
  'Recuerda hidratarte bien antes de las sesiones.',
  'Buen trabajo la semana pasada. El progreso se nota.',
  'Tienes el plan actualizado en tu portal. Revisalo.',
  'Esta semana quiero que te centres en la tecnica.',
  'Como vas con la dieta? Cuentame en el check-in.',
  'Proxima sesion hacemos test de fuerza para ver la evolucion.',
  'Muy bien la adherencia este mes. Sigue asi.'
];
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: CORS
  });
  if (!ADMIN_SECRET || req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS });
  }
  try {
    const hoy = new Date('2026-07-12');
    // Generar 60 clientes
    const clientes = [];
    for(let i = 0; i < 60; i++){
      const esMujer = i % 3 === 0;
      const nombre = (esMujer ? pick(NOMBRES_F) : pick(NOMBRES_M)) + ' ' + pick(APELLIDOS);
      const obj = pick(OBJETIVOS);
      const pesoBase = esMujer ? rand(55, 82) : rand(67, 98);
      const pesoObj = obj.includes('grasa') || obj === 'tonificacion' ? pesoBase - rand(5, 14) : obj.includes('muscular') ? pesoBase + rand(4, 10) : pesoBase;
      const esOnline = i % 4 === 3;
      const precio = esOnline ? pick([
        99,
        120,
        150
      ]) : pick([
        140,
        160,
        180,
        200,
        220
      ]);
      const dias = pick([
        2,
        3,
        3,
        3,
        4,
        4,
        5
      ]);
      clientes.push({
        entrenador_id: UID,
        nombre,
        email: nombre.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.') + rand(10, 99) + '@gmail.com',
        telefono: '6' + rand(10000000, 99999999),
        objetivo: obj,
        tipo: esOnline ? 'online' : 'presencial',
        estado: i < 50 ? 'activo' : i < 56 ? 'pausado' : 'inactivo',
        peso_actual: pesoBase,
        peso_objetivo: pesoObj,
        nivel: pick(NIVELES),
        dias_semana: dias,
        material: esOnline ? 'sin_material' : pick(MATERIALES),
        lesiones: pick(LESIONES),
        notas: pick(NOTAS),
        precio_mensual: precio,
        tipo_entrenamiento: pick(TIPOS_E),
        nutricion_activa: Math.random() > 0.45,
        horas_semana: dias
      });
    }
    const { data: ci, error: ce } = await sb.from('clientes').insert(clientes).select('id,nombre,objetivo,precio_mensual,peso_actual,nivel,dias_semana,tipo,nutricion_activa');
    if (ce) throw new Error('clientes: ' + ce.message);
    // PAGOS — 3 meses activos
    const pagos = [];
    for (const c of ci.filter((_, i)=>i < 50)){
      for(let m = 2; m >= 0; m--){
        const f = new Date(hoy.getFullYear(), hoy.getMonth() - m, rand(1, 5));
        pagos.push({
          entrenador_id: UID,
          cliente_id: c.id,
          importe: c.precio_mensual,
          concepto: 'Entrenamiento personal',
          fecha_pago: fechaStr(f)
        });
      }
    }
    await sb.from('pagos').insert(pagos);
    // PLANES DE COBRO
    const cobros = ci.filter((_, i)=>i < 50).map((c)=>({
        entrenador_id: UID,
        cliente_id: c.id,
        importe: c.precio_mensual,
        concepto: 'Entrenamiento personal',
        frecuencia: 'mensual',
        dia_cobro: rand(1, 10),
        proximo_cobro: fechaStr(new Date(hoy.getFullYear(), hoy.getMonth() + 1, rand(1, 10)))
      }));
    await sb.from('planes_cobro').insert(cobros).catch(()=>{});
    // CHECKINS — 6-8 semanas para activos
    const checkins = [];
    for (const c of ci.filter((_, i)=>i < 48)){
      let pesoActual = c.peso_actual;
      const bajando = c.objetivo.includes('grasa') || c.objetivo === 'tonificacion';
      const semanas = rand(5, 8);
      for(let s = semanas; s >= 1; s--){
        const f = new Date(hoy);
        f.setDate(f.getDate() - s * 7);
        pesoActual += bajando ? -(Math.random() * 0.45 + 0.05) : Math.random() * 0.35 + 0.05;
        checkins.push({
          entrenador_id: UID,
          cliente_id: c.id,
          fecha: fechaStr(f),
          peso: Math.round(pesoActual * 10) / 10,
          energia: rand(5, 10),
          sueno: rand(5, 10),
          estres: rand(1, 4),
          fatiga: rand(1, 4),
          motivacion: rand(4, 7),
          calidad_entreno: rand(4, 7),
          adherencia_entreno: rand(6, 10),
          adherencia_nutricion: rand(5, 10),
          sesiones_semana: Math.min(c.dias_semana, 7)
        });
      }
    }
    for(let i = 0; i < checkins.length; i += 50)await sb.from('checkins').insert(checkins.slice(i, i + 50));
    // SESIONES — 4 semanas pasadas + 1 próxima
    const sesiones = [];
    for (const c of ci.filter((_, i)=>i < 50)){
      const hora = pick(HORAS);
      const diasSem = c.dias_semana >= 4 ? [
        1,
        2,
        4,
        5
      ].slice(0, 4) : c.dias_semana === 3 ? [
        1,
        3,
        5
      ] : [
        1,
        4
      ];
      for(let s = -3; s <= 1; s++){
        for (const dia of diasSem){
          const f = new Date(hoy);
          const diffDia = dia - (f.getDay() || 7);
          f.setDate(f.getDate() + s * 7 + diffDia);
          if (f < new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)) continue;
          const pasada = f < hoy;
          sesiones.push({
            entrenador_id: UID,
            cliente_id: c.id,
            fecha: fechaStr(f),
            hora,
            tipo: c.tipo === 'online' ? 'online' : 'presencial',
            completada: pasada,
            duracion_minutos: rand(45, 75),
            rpe: pasada ? rand(6, 9) : null,
            fatiga_post: pasada ? rand(1, 4) : null
          });
        }
      }
    }
    for(let i = 0; i < sesiones.length; i += 100)await sb.from('sesiones').insert(sesiones.slice(i, i + 100));
    // RUTINAS — todos los activos
    const rutinas = ci.filter((_, i)=>i < 50).map((c)=>{
      const esGrasa = c.objetivo.includes('grasa') || c.objetivo === 'tonificacion';
      const esFuerza = c.objetivo === 'fuerza';
      const nombre1 = c.nombre.split(' ')[0];
      return {
        entrenador_id: UID,
        cliente_id: c.id,
        nombre: esGrasa ? `Plan ${c.objetivo.replace(/_/g, ' ')} - ${nombre1}` : esFuerza ? `Programa fuerza - ${nombre1}` : `Mesociclo hipertrofia - ${nombre1}`,
        estado: 'publicada',
        contenido: JSON.stringify({
          dias: [
            {
              dia: 'Lunes',
              nombre: esGrasa ? 'Full body A' : 'Empuje + Triceps',
              ejercicios: [
                {
                  ejercicio_nombre: esGrasa ? 'Sentadilla goblet' : esFuerza ? 'Press banca 5x5' : 'Press banca',
                  series: 4,
                  reps: esGrasa ? '15' : esFuerza ? '5' : '8-10',
                  descanso: esFuerza ? '3min' : '90s'
                },
                {
                  ejercicio_nombre: esGrasa ? 'Hip thrust' : 'Press militar',
                  series: 4,
                  reps: esGrasa ? '15' : '10',
                  descanso: '90s'
                },
                {
                  ejercicio_nombre: esGrasa ? 'Remo mancuerna' : 'Extension triceps',
                  series: 3,
                  reps: '12',
                  descanso: '60s'
                }
              ]
            },
            {
              dia: 'Miercoles',
              nombre: esGrasa ? 'Full body B' : 'Jalon + Biceps',
              ejercicios: [
                {
                  ejercicio_nombre: esGrasa ? 'Peso muerto rumano' : esFuerza ? 'Dominada lastre' : 'Dominada',
                  series: 4,
                  reps: esGrasa ? '12' : esFuerza ? '5' : '8',
                  descanso: esFuerza ? '3min' : '90s'
                },
                {
                  ejercicio_nombre: esGrasa ? 'Press mancuernas inclinado' : 'Remo barra',
                  series: 4,
                  reps: '10',
                  descanso: '90s'
                },
                {
                  ejercicio_nombre: esGrasa ? 'Zancada' : 'Curl biceps barra',
                  series: 3,
                  reps: '12',
                  descanso: '60s'
                }
              ]
            },
            ...c.dias_semana >= 3 ? [
              {
                dia: 'Viernes',
                nombre: esGrasa ? 'Cardio + Core' : 'Pierna completa',
                ejercicios: [
                  {
                    ejercicio_nombre: esGrasa ? 'Burpees' : esFuerza ? 'Sentadilla 5x5' : 'Prensa de piernas',
                    series: 4,
                    reps: esGrasa ? '10' : esFuerza ? '5' : '12',
                    descanso: esFuerza ? '3min' : '90s'
                  },
                  {
                    ejercicio_nombre: esGrasa ? 'Plancha abdominal' : 'Curl femoral',
                    series: 3,
                    reps: esGrasa ? '45s' : '12',
                    descanso: '60s'
                  },
                  {
                    ejercicio_nombre: esGrasa ? 'Mountain climbers' : 'Gemelo de pie',
                    series: 3,
                    reps: esGrasa ? '20' : '20',
                    descanso: '45s'
                  }
                ]
              }
            ] : []
          ]
        })
      };
    });
    await sb.from('rutinas').insert(rutinas);
    // NUTRICION — clientes con nutricion_activa
    const conNutri = ci.filter((c, i)=>i < 48 && c.nutricion_activa);
    const planes = conNutri.map((c)=>{
      const esMujer = NOMBRES_F.some((n)=>c.nombre.startsWith(n));
      const peso = c.peso_actual || 70;
      const altura = esMujer ? rand(158, 172) : rand(168, 185);
      const edad = rand(22, 48);
      const TMB = esMujer ? 10 * peso + 6.25 * altura - 5 * edad - 161 : 10 * peso + 6.25 * altura - 5 * edad + 5;
      const TDEE = Math.round(TMB * 1.55);
      const ajuste = c.objetivo.includes('grasa') ? -400 : c.objetivo.includes('muscular') ? 300 : 0;
      const kcal = TDEE + ajuste;
      const prot = Math.round(peso * 1.7);
      const gras = Math.round(kcal * 0.28 / 9);
      const carb = Math.round((kcal - prot * 4 - gras * 9) / 4);
      const hidrat = Math.round(peso * 0.035 * 10) / 10;
      return {
        entrenador_id: UID,
        cliente_id: c.id,
        nombre: `Plan ${c.objetivo.replace(/_/g, ' ')} - ${c.nombre.split(' ')[0]}`,
        objetivo: c.objetivo,
        calorias_dia: kcal,
        proteinas_g: prot,
        carbohidratos_g: carb,
        grasas_g: gras,
        estado: 'publicado',
        contenido: JSON.stringify({
          macros: {
            calorias_dia: kcal,
            proteinas_g: prot,
            carbohidratos_g: carb,
            grasas_g: gras,
            hidratacion_litros: hidrat
          },
          hidratacion: hidrat,
          notas: `${kcal} kcal/dia - ${prot}g proteina - Plan personalizado`,
          recomendaciones: [
            `Bebe ${hidrat}L de agua al dia`,
            c.objetivo.includes('grasa') ? 'Prioriza proteina en cada comida para preservar musculo' : 'Mantén el superavit calorico constante',
            'Come siempre a las mismas horas para regular el metabolismo',
            'Duerme 7-9 horas: el descanso es parte fundamental del proceso',
            'Prioriza alimentos reales sobre suplementos'
          ],
          menu: []
        })
      };
    });
    if (planes.length > 0) await sb.from('planes_nutricion').insert(planes);
    // MENSAJES
    const mensajes = ci.filter((_, i)=>i < 45).map((c)=>({
        entrenador_id: UID,
        cliente_id: c.id,
        contenido: pick(MSGS),
        tipo: 'entrenador',
        leido: true
      }));
    await sb.from('mensajes_cliente').insert(mensajes);
    return new Response(JSON.stringify({
      ok: true,
      clientes: ci.length,
      pagos: pagos.length,
      checkins: checkins.length,
      sesiones: sesiones.length,
      rutinas: rutinas.length,
      planes_nutricion: planes.length,
      mensajes: mensajes.length
    }), {
      headers: CORS
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: CORS
    });
  }
});