-- ============================================================
-- SEED PARTE 2: Biblioteca de Ejercicios — Forge Studio
-- Ampliación hasta 1000+ ejercicios
-- Aplica en Forge Y en Pablo Rodríguez
-- ============================================================

DO $$
DECLARE
  eid UUID := '0b908e25-f69f-472c-9972-87bc93d67e65';
BEGIN

-- ============================================================
-- PECHO — VARIACIONES ADICIONALES
-- ============================================================
INSERT INTO ejercicios_biblioteca (entrenador_id, nombre, patron, grupo_muscular, grupo_secundario, tipo, nivel, modalidad, descripcion, consejos_tecnica, youtube_url) VALUES
(eid,'Press de pecho en máquina (Hammer Strength)','empuje_horizontal','pecho','triceps,deltoides_anterior','fuerza','principiante','gimnasio','Press en máquina guiada para mayor seguridad','Gran opción para la post-fatiga o al aprender el patrón',NULL),
(eid,'Press de banca con agarre estrecho','empuje_horizontal','pecho','triceps,deltoides_anterior','fuerza','intermedio','gimnasio','Press con énfasis en el pecho interno y los tríceps','Agarre a la anchura de los hombros o menos',NULL),
(eid,'Press de banca con agarre ancho','empuje_horizontal','pecho','pecho_externo,deltoides_anterior','fuerza','intermedio','gimnasio','Mayor activación de la porción externa del pecho','Agarre bien por fuera de los hombros',NULL),
(eid,'Flexiones en anillas','empuje_horizontal','pecho','triceps,core','fuerza','avanzado','gimnasio','Flexiones con manos en anillas para mayor activación estabilizadora','Las anillas son inestables: mayor activación de manguito y core',NULL),
(eid,'Svend press','aislamiento','pecho','deltoides_anterior','hipertrofia','principiante','gimnasio','Press con un disco sostenido entre las palmas para aislar el pecho','Comprime el disco con fuerza durante todo el movimiento',NULL),
(eid,'Flexiones con rotación','empuje_horizontal','pecho','core,hombros','fuerza','intermedio','calistenia','Flexión normal más rotación del torso al subir','La rotación activa el core y el oblicuo',NULL),
(eid,'Push-up with feet on swiss ball','empuje_horizontal','pecho','core,triceps','fuerza','avanzado','gimnasio','Flexión con los pies sobre pelota suiza para mayor inestabilidad','Mantén el cuerpo recto mientras la pelota dificulta el equilibrio',NULL),
(eid,'Decline push-up (flexión declinada)','empuje_horizontal','pecho','triceps','fuerza','principiante','casa','Pies elevados para trabajar la parte superior del pecho','Eleva los pies en una silla o banco, manos en el suelo',NULL),
(eid,'Single-arm push-up (flexión unilateral)','empuje_horizontal','pecho','triceps,core','fuerza','avanzado','calistenia','Flexión con un solo brazo, exige fuerza y anti-rotación extrema','Pies muy abiertos para base ancha, core de acero',NULL),
(eid,'Archer push-up','empuje_horizontal','pecho','triceps,biceps','fuerza','avanzado','calistenia','Flexión asimétrica donde un brazo guía y el otro extiende','Preparación para la flexión unilateral',NULL),

-- ============================================================
-- ESPALDA — VARIACIONES ADICIONALES
-- ============================================================
(eid,'Supinated grip barbell row (Yates row)','traccion_horizontal','espalda','biceps,romboides','fuerza','intermedio','gimnasio','Remo con barra agarre supino estilo Dorian Yates','Torso más erguido que en el remo convencional',NULL),
(eid,'Pendlay row','traccion_horizontal','espalda','biceps,romboides','fuerza','avanzado','gimnasio','Remo explosivo desde el suelo con torso paralelo al suelo','La barra descansa en el suelo entre cada rep',NULL),
(eid,'Meadows row','traccion_horizontal','espalda','biceps,romboides','fuerza','intermedio','gimnasio','Remo unilateral con la barra en landmine','Gran rango de movimiento y contracción del dorsal',NULL),
(eid,'Kroc row','traccion_horizontal','espalda','biceps,romboides','fuerza','avanzado','gimnasio','Remo pesado con mancuerna con un poco de impulso','Mancuerna muy pesada, 1-2 cintas en la mano, tirón explosivo',NULL),
(eid,'Cable row with pause (remo en cable con pausa)','traccion_horizontal','espalda','biceps','hipertrofia','intermedio','gimnasio','Pausa de 2 segundos en la máxima contracción','Maximiza el tiempo bajo tensión y la conexión mente-músculo',NULL),
(eid,'Archer pull-up','traccion_vertical','espalda','biceps','fuerza','avanzado','calistenia','Dominada asimétrica, un brazo guía y el otro extiende','Preparación para la dominada unilateral',NULL),
(eid,'Typewriter pull-up','traccion_vertical','espalda','biceps','fuerza','avanzado','calistenia','Dominada que desliza el pecho de un lado al otro en la parte alta','Requiere mucho control y fuerza lateral',NULL),
(eid,'L-pull-up','traccion_vertical','espalda','core,biceps','fuerza','avanzado','calistenia','Dominada con las piernas extendidas horizontales (L-sit)','Combina fuerza de espalda y core simultáneamente',NULL),
(eid,'Wide grip pull-up','traccion_vertical','espalda','romboides,biceps','fuerza','intermedio','calistenia','Dominada con agarre muy ancho para mayor activación del dorsal','Cuanto más ancho, más corto es el ROM',NULL),
(eid,'Close grip pull-up','traccion_vertical','espalda','biceps','fuerza','intermedio','calistenia','Dominada con agarre estrecho para mayor trabajo del bíceps','Palmas hacia afuera o neutras',NULL),
(eid,'Banded pull-up (dominada asistida con banda)','traccion_vertical','espalda','biceps,romboides','fuerza','principiante','gimnasio','Dominada asistida con banda elástica para principiantes','La banda reduce el peso efectivo que soportas',NULL),
(eid,'Negative pull-up (excéntrica dominada)','traccion_vertical','espalda','biceps','fuerza','principiante','gimnasio','Solo la fase de bajada de la dominada, muy lenta','5-8 segundos de bajada, excelente para ganar fuerza',NULL),
(eid,'Straight arm pulldown (pull-down con brazos rectos)','traccion_vertical','espalda','triceps','fuerza','principiante','gimnasio','Jalón con brazos rectos para el dorsal, sin codos','Mantén los brazos rectos, lleva las manos hacia las caderas',NULL),
(eid,'Decline dumbbell row','traccion_horizontal','espalda','biceps,romboides','fuerza','intermedio','gimnasio','Remo en banco declinado para cambiar el ángulo de tracción','Pecho en banco declinado, mancuernas colgando',NULL),
(eid,'Band pull-apart variations','aislamiento','espalda','romboides,deltoides_posterior','fuerza','principiante','casa','Variaciones de la separación de banda: Y, T, W, I','Cada forma activa diferentes partes de la musculatura escapular',NULL),

-- ============================================================
-- HOMBROS — VARIACIONES ADICIONALES
-- ============================================================
(eid,'Bradford press','empuje_vertical','hombros','triceps,trapecio','hipertrofia','avanzado','gimnasio','Press alternado delante y detrás sin bloquear los codos','La barra pasa por encima de la cabeza de delante a atrás',NULL),
(eid,'Push press (press empujado)','empuje_vertical','hombros','cuadriceps,triceps','potencia','intermedio','gimnasio','Press de hombro con impulso de piernas','Dip + drive + press: usa la cadena cinética completa',NULL),
(eid,'Dumbbell Y raise','aislamiento','hombros','romboides,deltoides_posterior','fuerza','principiante','casa','Elevación en forma de Y para hombros y espalda alta','Brazos en diagonal hacia arriba formando Y',NULL),
(eid,'Dumbbell T raise','aislamiento','hombros','romboides','fuerza','principiante','casa','Elevación en forma de T, brazos al frente y laterales','Brazos perfectamente horizontales',NULL),
(eid,'Dumbbell W raise','aislamiento','hombros','romboides,manguito_rotador','fuerza','principiante','casa','Elevación en W para el manguito rotador externo','Codos a 90°, rota hacia afuera formando W',NULL),
(eid,'Lateral raise with cable (un cable)','aislamiento','hombros','trapecio_superior','hipertrofia','principiante','gimnasio','Elevación lateral con un solo cable','Pasa el cable por detrás del cuerpo para mayor ROM',NULL),
(eid,'Behind-the-neck press (press por detrás)','empuje_vertical','hombros','triceps,trapecio','fuerza','avanzado','gimnasio','Press militar con la barra pasando por detrás de la cabeza','Solo para avanzados con buena movilidad de hombro',NULL),
(eid,'Upward rotation exercises (ejercicios de rotación escapular)','aislamiento','hombros','trapecio,serratos','fuerza','principiante','casa','Ejercicios de rotación upward de la escápula con banda','Fundamental para la salud del hombro a largo plazo',NULL),
(eid,'90/90 shoulder ER (rotación externa 90/90)','aislamiento','hombros','manguito_rotador','fuerza','principiante','casa','Rotación externa de hombro a 90° de abducción y flexión','Movimiento clave para la salud del manguito rotador',NULL),
(eid,'Prone Y raise (elevación Y en prono)','aislamiento','hombros','romboides,trapecio','fuerza','principiante','casa','Elevación en Y tumbado boca abajo','Refuerza la musculatura estabilizadora escapular',NULL),
(eid,'Cable reverse fly','aislamiento','hombros','romboides,deltoides_posterior','hipertrofia','principiante','gimnasio','Apertura posterior con cables cruzados','Polea baja cruzada, lleva las manos hacia afuera y atrás',NULL),
(eid,'Kettlebell press','empuje_vertical','hombros','triceps,core','fuerza','intermedio','gimnasio','Press con kettlebell, mayor demanda estabilizadora que mancuerna','El centro de masa desplazado de la kettlebell activa más el hombro',NULL),
(eid,'Behind the back lateral raise','aislamiento','hombros','trapecio_superior','hipertrofia','intermedio','gimnasio','Elevación lateral con la mancuerna detrás del cuerpo','Cambia el ángulo y el plano de la tracción',NULL),

-- ============================================================
-- BÍCEPS — VARIACIONES ADICIONALES
-- ============================================================
(eid,'Cable curl (curl en cable)','aislamiento','biceps','braquiorradial','hipertrofia','principiante','gimnasio','Curl en cable con tensión constante desde el inicio','La curva del cable mantiene tensión en la posición baja',NULL),
(eid,'Cable hammer curl','aislamiento','biceps','braquiorradial','hipertrofia','principiante','gimnasio','Curl martillo con cable para braquiorradial','Accesorio de cuerda en posición neutra',NULL),
(eid,'Drag curl (curl arrastrado)','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl donde la barra sube pegada al cuerpo por las costillas','Mayor activación de la cabeza larga del bíceps',NULL),
(eid,'Reverse curl with EZ bar (curl inverso con Z)','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl con agarre prono en barra Z para braquiorradial','Reduce la tensión en la muñeca respecto a la barra recta',NULL),
(eid,'Zottman curl','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl supino en la subida, prono en la bajada','Trabaja el bíceps en la subida y el braquiorradial en la bajada',NULL),
(eid,'Single arm preacher curl','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl predicador unilateral para mayor aislamiento','Mayor control de la técnica que en el bilateral',NULL),
(eid,'Incline hammer curl (curl martillo inclinado)','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl martillo en banco inclinado para mayor estiramiento','Banco a 45-60°, brazos colgando para mayor ROM',NULL),
(eid,'TRX curl','aislamiento','biceps','braquiorradial','fuerza','principiante','gimnasio','Curl de bíceps en suspensión TRX','Ajusta la dificultad cambiando el ángulo del cuerpo',NULL),
(eid,'Chin-up hold (aguante de chin-up)','aislamiento','biceps','espalda','fuerza','intermedio','calistenia','Isometría en la posición alta del chin-up','Mantén la barbilla sobre la barra el máximo tiempo posible',NULL),

-- ============================================================
-- TRÍCEPS — VARIACIONES ADICIONALES
-- ============================================================
(eid,'Close grip bench press (press agarre estrecho)','empuje_horizontal','triceps','pecho,deltoides_anterior','fuerza','intermedio','gimnasio','Press de banca con agarre estrecho para tríceps','Agarre a la anchura de los hombros, codos pegados',NULL),
(eid,'Overhead EZ bar extension','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Extensión overhead con barra Z para mayor comodidad','Reduce la tensión en las muñecas respecto a la barra recta',NULL),
(eid,'Tate press','aislamiento','triceps','pecho','hipertrofia','intermedio','gimnasio','Extensión de tríceps en banco con mancuernas hacia el pecho','Codos apuntan hacia afuera, mancuernas en el pecho al bajar',NULL),
(eid,'California press','empuje_horizontal','triceps','pecho','fuerza','intermedio','gimnasio','Combinación de press y extensión para tríceps','Press con toque de hombro como un press francés',NULL),
(eid,'Board press (1-2 boards)','empuje_horizontal','triceps','pecho,deltoides_anterior','fuerza','avanzado','gimnasio','Press limitado por tablones para trabajar el ROM superior','Enfatiza el bloqueo final, el punto fuerte del tríceps',NULL),
(eid,'One-arm triceps pushdown','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Extensión unilateral de tríceps en cable','Permite corregir desequilibrios entre brazos',NULL),
(eid,'Reverse grip pushdown (agarre supino)','aislamiento','triceps','deltoides_posterior','hipertrofia','intermedio','gimnasio','Extensión con agarre supino, activa la cabeza lateral','Gira las palmas hacia arriba, jala hacia abajo',NULL),
(eid,'JM press (press JM)','empuje_horizontal','triceps','pecho','fuerza','avanzado','gimnasio','Híbrido entre press y press francés para powerlifting','Barra baja al cuello con codos muy cerrados',NULL),
(eid,'Skull crusher with dumbbells (press francés con mancuernas)','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Versión con mancuernas del press francés, más ROM','Cada mano trabaja independientemente',NULL),
(eid,'Triceps dip machine','aislamiento','triceps','pecho,deltoides_anterior','fuerza','principiante','gimnasio','Fondos de tríceps en máquina guiada','Menor demanda técnica y de equilibrio',NULL),

-- ============================================================
-- SENTADILLA Y PIERNA — VARIACIONES ADICIONALES
-- ============================================================
(eid,'Box squat (sentadilla al cajón)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Sentadilla hasta sentarse en un cajón y volver a subir','El cajón enseña la postura y el arranque desde cero',NULL),
(eid,'Pause squat (pausa arriba)','sentadilla','cuadriceps','gluteos','fuerza','intermedio','gimnasio','Pausa de 2-3 segundos en la posición más baja','Elimina el rebote del tendón y exige fuerza pura',NULL),
(eid,'Anderson squat (sentadilla desde pines)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','avanzado','gimnasio','Sentadilla arrancando desde la posición baja sin rebote','Coloca la barra en pines a la altura adecuada',NULL),
(eid,'Overhead squat (sentadilla con barra sobre la cabeza)','sentadilla','cuadriceps','gluteos,hombros,core','fuerza','avanzado','gimnasio','Sentadilla con barra sobre la cabeza, exige gran movilidad','La barra debe estar directamente sobre los tobillos',NULL),
(eid,'Zercher squat','sentadilla','cuadriceps','gluteos,biceps','fuerza','avanzado','gimnasio','La barra descansa en el pliegue de los codos','Torso muy erguido, excelente para el core',NULL),
(eid,'Belt squat (sentadilla con cinturón)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Sentadilla con carga en el cinturón de las caderas','Descarga la columna mientras mantiene el estímulo de pierna',NULL),
(eid,'Single leg press','empuje','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Prensa unilateral para corregir asimetrías','Ajusta el peso a aproximadamente el 60% del bilateral',NULL),
(eid,'Leg press feet high (prensa pies altos)','empuje','gluteos','isquiotibiales,cuadriceps','fuerza','principiante','gimnasio','Prensa con los pies altos para enfatizar glúteos','Cuanto más altos los pies, más glúteo e isquio',NULL),
(eid,'Leg press feet narrow (prensa pies estrechos)','empuje','cuadriceps','gluteos','fuerza','principiante','gimnasio','Prensa con pies juntos para mayor énfasis en cuádriceps','Cuanto más estrechos y abajo los pies, más cuádrices',NULL),
(eid,'Sissy squat (sentadilla sissy)','aislamiento','cuadriceps','flexores_cadera','fuerza','avanzado','gimnasio','Sentadilla inclinada hacia atrás para aislar el cuádriceps','Las rodillas van muy adelante de los pies',NULL),
(eid,'Spanish squat (sentadilla española)','sentadilla','cuadriceps','gluteos','rehabilitacion','principiante','gimnasio','Sentadilla con banda detrás de las rodillas y pies alejados','Las rodillas chocan con la banda, excelente para la rodilla',NULL),
(eid,'Wall squat with swiss ball','sentadilla','cuadriceps','gluteos','fuerza','principiante','gimnasio','Sentadilla con fitball entre la espalda y la pared','La pelota permite bajar con la espalda recta',NULL),
(eid,'Jump squat with pause','sentadilla','cuadriceps','gluteos,isquiotibiales','potencia','intermedio','casa','Pausa de 2 segundos en la posición baja antes del salto','Elimina el rebote para mayor explosividad',NULL),
(eid,'Skater squat (patinador)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','avanzado','casa','Sentadilla unilateral sin soporte, pierna trasera suspendida','Progresión hacia la sentadilla pistol',NULL),
(eid,'Rear foot elevated split squat (sin barra)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','principiante','casa','Sentadilla búlgara con solo el peso corporal','Buena progresión antes de añadir carga externa',NULL),
(eid,'Goblet squat with pause','sentadilla','cuadriceps','gluteos','fuerza','principiante','gimnasio','Sentadilla goblet con pausa abajo para movilidad','La pausa abajo mejora la movilidad de cadera',NULL),
(eid,'Curtsy lunge (zancada cruzada)','sentadilla','gluteos','cuadriceps,abductores','fuerza','intermedio','casa','Zancada cruzando el pie trasero detrás del delantero','Mayor activación del glúteo medio',NULL),
(eid,'Reverse lunge with knee drive','sentadilla','cuadriceps','gluteos,core','fuerza','intermedio','casa','Zancada hacia atrás más rodillazo al pecho','Añade el movimiento de rodilla para mayor activación del core',NULL),
(eid,'Side squat (sentadilla lateral)','sentadilla','cuadriceps','abductores,gluteos','fuerza','principiante','casa','Da un paso lateral y realiza una sentadilla sobre esa pierna','Las dos piernas empujan para volver al centro',NULL),

-- ============================================================
-- CADENA POSTERIOR — VARIACIONES ADICIONALES
-- ============================================================
(eid,'Stiff leg deadlift (peso muerto piernas rígidas)','bisagra_cadera','isquiotibiales','gluteos,espalda_baja','fuerza','intermedio','gimnasio','Peso muerto con rodillas completamente bloqueadas','Mayor estiramiento de isquiotibiales que el rumano',NULL),
(eid,'Single leg RDL to row','bisagra_cadera','isquiotibiales','espalda,gluteos','fuerza','avanzado','gimnasio','Peso muerto unilateral más remo en la posición baja','Movimiento compuesto muy funcional',NULL),
(eid,'Barbell hip thrust with pause','bisagra_cadera','gluteos','isquiotibiales','hipertrofia','intermedio','gimnasio','Hip thrust con pausa de 2 segundos en la parte superior','Maximiza la contracción del glúteo',NULL),
(eid,'Banded hip thrust (hip thrust con banda)','bisagra_cadera','gluteos','isquiotibiales','hipertrofia','principiante','casa','Hip thrust con banda elástica, sin banco','Tumbado en el suelo con banda sobre las caderas',NULL),
(eid,'Single leg hip thrust','bisagra_cadera','gluteos','isquiotibiales','fuerza','avanzado','gimnasio','Hip thrust unilateral para corregir asimetrías de glúteo','La pierna elevada no trabaja, solo la del suelo',NULL),
(eid,'Frog pump','bisagra_cadera','gluteos','abductores','fuerza','principiante','casa','Puente de glúteos con pies juntos y rodillas abiertas','Activa el glúteo en rotación externa',NULL),
(eid,'Donkey kick machine','aislamiento','gluteos','isquiotibiales','hipertrofia','principiante','gimnasio','Extensión de cadera en máquina tipo donkey kick','Control en el regreso, no uses impulso',NULL),
(eid,'Cable kickback (extensión de cadera en cable)','aislamiento','gluteos','isquiotibiales','hipertrofia','principiante','gimnasio','Extensión de cadera con tobillera en cable','Mantén el torso fijo, solo mueve la cadera',NULL),
(eid,'Barbell glute bridge (puente de barra)','bisagra_cadera','gluteos','isquiotibiales','fuerza','intermedio','gimnasio','Puente de glúteos con barra sobre las caderas, en suelo','Versión sin banco del hip thrust',NULL),
(eid,'Nordic hamstring curl with sliders','aislamiento','isquiotibiales','gluteos','fuerza','avanzado','casa','Curl nórdico modificado usando sliders en suelo liso','Alternativa casera al curl nórdico con los pies fijos',NULL),
(eid,'Romanian deadlift with pause','bisagra_cadera','isquiotibiales','gluteos,espalda_baja','fuerza','intermedio','gimnasio','RDL con pausa en la posición más baja','Mantén 2 segundos abajo para mayor tiempo bajo tensión',NULL),
(eid,'B-stance deadlift (peso muerto asimétrico)','bisagra_cadera','isquiotibiales','gluteos','fuerza','intermedio','gimnasio','Peso muerto con un pie adelantado, semi-unilateral','El pie trasero solo da equilibrio, el delantero hace el trabajo',NULL),
(eid,'Trap bar shrug (encogimiento con hex bar)','aislamiento','trapecio','espalda_alta','fuerza','principiante','gimnasio','Encogimiento de hombros con barra hexagonal','La posición neutra del agarre puede ser más cómoda',NULL),
(eid,'Behind the back shrug','aislamiento','trapecio','espalda_alta','fuerza','intermedio','gimnasio','Encogimiento con la barra detrás del cuerpo','Diferente línea de fuerza, enfatiza el trapecio medio',NULL),

-- ============================================================
-- CORE — VARIACIONES ADICIONALES
-- ============================================================
(eid,'Plancha RKC (plancha tensión total)','estabilizacion','core','gluteos,pecho','fuerza','intermedio','casa','Plancha con máxima tensión en todo el cuerpo (protocolo RKC)','Aprieta todo: puños, glúteos, cuádriceps, core',NULL),
(eid,'Plancha dinámica (up-down plank)','estabilizacion','core','triceps,hombros','fuerza','intermedio','casa','Pasar de plancha de manos a plancha de antebrazos','Alterna qué brazo baja primero para equilibrio',NULL),
(eid,'Side plank with leg raise (plancha lateral + elevación)','estabilizacion','core','abductores,oblicuos','fuerza','intermedio','casa','Plancha lateral más elevación de la pierna superior','La elevación activa el abductor mientras el core estabiliza',NULL),
(eid,'Plank with hip dip (plancha + inclina cadera)','rotacion','core','oblicuos','fuerza','principiante','casa','Desde la plancha, bajar las caderas alternando a cada lado','Rango de movimiento pequeño y controlado',NULL),
(eid,'Copenhagen plank (plancha de Copenhague)','estabilizacion','core','aductores,oblicuos','fuerza','avanzado','casa','Plancha lateral con el pie en un banco y pierna inferior colgante','Exige fuerza de aductor y oblicuo simultáneamente',NULL),
(eid,'Ab wheel with feet elevated','estabilizacion','core','dorsal,hombros','fuerza','avanzado','casa','Rodada abdominal con los pies sobre una superficie elevada','Mayor estiramiento y demanda que la versión en suelo',NULL),
(eid,'Cable woodchop (hacha en cable)','rotacion','core','oblicuos,espalda','fuerza','intermedio','gimnasio','Rotación diagonal de cable desde arriba hacia abajo','Movimiento de toda la cadena, no solo los brazos',NULL),
(eid,'Low to high cable woodchop','rotacion','core','oblicuos,hombros','fuerza','intermedio','gimnasio','Rotación diagonal de cable desde abajo hacia arriba','Empuja desde la cadera contraria',NULL),
(eid,'Landmine rotation (rotación con barra)','rotacion','core','oblicuos,hombros','fuerza','intermedio','gimnasio','Rotación del torso con el extremo de la barra','Mantén los brazos rectos, gira solo el torso',NULL),
(eid,'Stir the pot (batir el caldero)','estabilizacion','core','hombros,gluteos','fuerza','avanzado','gimnasio','Plancha de antebrazos sobre fitball, hacer círculos con los codos','El movimiento del fitball exige máxima estabilización',NULL),
(eid,'Swiss ball jackknife','estabilizacion','core','flexores_cadera,hombros','fuerza','avanzado','gimnasio','Plancha con pies en fitball, encoge las rodillas al pecho','La inestabilidad del fitball aumenta la dificultad',NULL),
(eid,'Swiss ball rollout','estabilizacion','core','dorsal,hombros','fuerza','avanzado','gimnasio','Rodada abdominal sobre fitball desde posición de rodillas','Alternativa más accesible a la rueda abdominal',NULL),
(eid,'Decline crunch (crunch declinado)','aislamiento','core','oblicuos','hipertrofia','intermedio','gimnasio','Crunch en banco declinado con mayor rango de movimiento','El ángulo declinado aumenta el ROM disponible',NULL),
(eid,'Weighted crunch (crunch con peso)','aislamiento','core','oblicuos','hipertrofia','intermedio','gimnasio','Crunch con mancuerna o disco sobre el pecho','Sólo hasta que despegues la espalda baja del suelo',NULL),
(eid,'Oblique crunch (crunch lateral)','aislamiento','core','oblicuos','hipertrofia','principiante','casa','Crunch en el que el codo va hacia la rodilla del mismo lado','Trabaja el oblicuo ipsilateral',NULL),
(eid,'Leg raise to the side','aislamiento','core','oblicuos,abductores','fuerza','principiante','casa','Elevación de pierna lateral desde el suelo','Tumbado de lado, eleva la pierna superior recta',NULL),
(eid,'V-up (elevación en V)','aislamiento','core','flexores_cadera','fuerza','intermedio','casa','Elevación simultánea de piernas y torso en forma de V','Mantén el punto de contacto solo en el glúteo',NULL),
(eid,'Toe touches (toques de puntillas)','aislamiento','core','flexores_cadera','fuerza','principiante','casa','Tumbado con piernas arriba, eleva el torso para tocar los pies','Mantén las piernas perpendiculares al suelo',NULL),
(eid,'Flutter kicks (patadas de agua)','aislamiento','core','flexores_cadera','fuerza','principiante','casa','Piernas levantadas que se alternan arriba y abajo rápidamente','Lumbar en contacto con el suelo durante todo el movimiento',NULL),
(eid,'Scissor kicks (tijeras)','aislamiento','core','flexores_cadera,abductores','fuerza','principiante','casa','Piernas levantadas que se cruzan alternándose','Mantén la zona lumbar pegada al suelo',NULL),
(eid,'Superman pulls','estabilizacion','espalda_baja','gluteos,hombros','fuerza','principiante','casa','Superman con movimiento de remo al mismo tiempo','Simula el movimiento del remo boca abajo',NULL),

-- ============================================================
-- FUNCIONAL Y REHABILITACIÓN — ADICIONALES
-- ============================================================
(eid,'Half-kneeling press (press en rodilla)','empuje_vertical','hombros','core,gluteos','fuerza','intermedio','gimnasio','Press unilateral en posición de rodilla para activar el core','La rodilla en el suelo exige estabilización lumbo-pélvica',NULL),
(eid,'Half-kneeling row (remo en rodilla)','traccion_horizontal','espalda','core,biceps','fuerza','intermedio','gimnasio','Remo en posición de rodilla con cable o banda','Trabaja la anti-rotación del core simultáneamente',NULL),
(eid,'Step-up to balance (step-up con equilibrio)','sentadilla','cuadriceps','gluteos,core','fuerza','intermedio','casa','Step-up normal más equilibrio en la punta del pie arriba','El momento de equilibrio activa los estabilizadores',NULL),
(eid,'Lateral step-up (step lateral)','sentadilla','gluteos','cuadriceps,abductores','fuerza','intermedio','gimnasio','Subir al banco lateralmente, énfasis en el glúteo medio','El pie lateral al banco sube de forma diagonal',NULL),
(eid,'Crossover step-up','sentadilla','gluteos','cuadriceps','fuerza','intermedio','gimnasio','Step-up cruzando el pie por delante del banco','Activa el glúteo en un plano diferente',NULL),
(eid,'Reverse step-up (step hacia atrás)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Subir al banco con el pie que está por detrás','El movimiento es opuesto al step-up convencional',NULL),
(eid,'Mini-band walk forward/backward','aislamiento','gluteos','abductores,cuadriceps','fuerza','principiante','casa','Caminata con mini banda en las rodillas o tobillos','Activa el glúteo medio en el plano frontal',NULL),
(eid,'3-way hip circles','movilidad','gluteos','flexores_cadera','movilidad','principiante','casa','Círculos de cadera hacia adelante, atrás y lateral','Mantén el equilibrio en la pierna de apoyo',NULL),
(eid,'Adductor side lunge stretch','movilidad','aductores','gluteos','movilidad','principiante','casa','Zancada lateral con el pie del lado opuesto al suelo','Aguanta 20-30 segundos, empuja la cadera hacia abajo',NULL),
(eid,'Thoracic rotation (rotación torácica)','movilidad','espalda_alta','oblicuos','movilidad','principiante','casa','Rotación de columna torácica en cuatro apoyos','La mano detrás de la cabeza, abre el codo hacia el techo',NULL),
(eid,'90/90 hip mobility (movilidad 90/90)','movilidad','gluteos','flexores_cadera','movilidad','principiante','casa','Rotación interna y externa de cadera en 90/90','Progresa a inclinaciones hacia adelante sobre la pierna delantera',NULL),
(eid,'Single leg balance with reach','estabilizacion','cuadriceps','gluteos,tobillo','fuerza','principiante','casa','Equilibrio unilateral con alcance de brazos en varias direcciones','La estrella de alcance activa diferentes estabilizadores',NULL),
(eid,'Y balance test exercise (ejercicio star)','estabilizacion','cuadriceps','gluteos,tobillo','fuerza','intermedio','casa','Alcanza con un pie en 3 direcciones mientras te equilibras','Evalúa y entrena la estabilidad dinámca del tobillo',NULL),
(eid,'Hip airplane (avión de cadera)','movilidad','gluteos','isquiotibiales','movilidad','intermedio','casa','Rotación pélvica sobre una sola pierna como un avión','Controla la rotación sin mover los hombros',NULL),
(eid,'Supine hip IR/ER stretch (rotación cadera tumbado)','movilidad','gluteos','flexores_cadera','movilidad','principiante','casa','Rotación interna y externa de cadera tumbado boca arriba','Rodilla a 90°, rota el pie hacia dentro y hacia afuera',NULL),
(eid,'Seated piriformis stretch','movilidad','gluteos','piriforme','movilidad','principiante','casa','Estiramiento del piriforme sentado con la pierna cruzada','Cruza el tobillo sobre la rodilla opuesta y empuja la rodilla abajo',NULL),
(eid,'Tennis ball foot massage','movilidad','pantorrilla','tobillo','movilidad','principiante','casa','Masaje de la planta del pie con pelota de tenis','Rueda la pelota por toda la planta, detente en puntos de tensión',NULL),
(eid,'Ankle circles (círculos de tobillo)','movilidad','pantorrilla','tobillo','movilidad','principiante','casa','Círculos completos de tobillo para mejorar la movilidad','Realiza series en ambas direcciones',NULL),
(eid,'Wrist circles (círculos de muñeca)','movilidad','antebrazos','muñeca','movilidad','principiante','casa','Círculos completos de muñeca para mejorar la movilidad','Esencial como calentamiento antes de press o planchas',NULL),
(eid,'Neck circles (círculos de cuello)','movilidad','cuello','espalda_alta','movilidad','principiante','casa','Movimiento circular suave del cuello','Solo hacia un lado, nunca hacia atrás en círculo completo',NULL),

-- ============================================================
-- CARDIO FUNCIONAL ADICIONAL
-- ============================================================
(eid,'Jumping jacks (polichinelas)','cardio','full_body','hombros,cuadriceps','cardio','principiante','casa','Cardio básico de bajo impacto con salto','Sincroniza la apertura de brazos y piernas',NULL),
(eid,'High knees (rodillas altas en sitio)','cardio','full_body','cuadriceps,flexores_cadera','cardio','principiante','casa','Correr en el sitio levantando las rodillas al pecho','Usa los brazos en sincronía con las piernas',NULL),
(eid,'Butt kicks (talones a glúteos)','cardio','full_body','isquiotibiales,pantorrilla','cardio','principiante','casa','Correr en el sitio llevando los talones al glúteo','Mantén el torso erguido y los codos a 90°',NULL),
(eid,'Bear crawl forward/backward','estabilizacion','full_body','hombros,core,cuadriceps','fuerza','principiante','casa','Gato hacia adelante y hacia atrás','Rodillas a 2 cm del suelo, movimiento contralateral',NULL),
(eid,'Lateral bear crawl','estabilizacion','full_body','hombros,core,abductores','fuerza','principiante','casa','Gato desplazándose lateralmente','El pie y la mano del mismo lado se mueven juntos',NULL),
(eid,'Inchworm (gusano)','movilidad','full_body','isquiotibiales,hombros,core','movilidad','principiante','casa','Camina con las manos hasta plancha y vuelve de pie','Excelente para el calentamiento completo',NULL),
(eid,'Walkout to push-up','empuje_horizontal','full_body','pecho,isquiotibiales,hombros','fuerza','intermedio','casa','Inclinación desde de pie, camina a plancha, flexión y regresa','Movimiento de calentamiento o ejercicio completo',NULL),
(eid,'Squat jumps to box (sentadilla con salto a caja)','potencia','full_body','cuadriceps,gluteos','potencia','intermedio','gimnasio','Sentadilla y salto al cajón en un movimiento','El aterrizaje suave es tan importante como el salto',NULL),
(eid,'Tuck jump (salto con rodillas al pecho)','potencia','full_body','cuadriceps,flexores_cadera','potencia','intermedio','casa','Salto vertical llevando las rodillas al pecho','Eleva las rodillas lo más alto posible',NULL),
(eid,'Split jump (salto con piernas en tijera)','potencia','full_body','cuadriceps,gluteos,isquiotibiales','potencia','intermedio','casa','Salto desde la posición de zancada cambiando las piernas en el aire','Aterriza suave en la posición de zancada contraria',NULL),
(eid,'Lateral hop (salto lateral)','potencia','full_body','cuadriceps,gluteos,abductores','potencia','principiante','casa','Salto lateral de un lado a otro','Aterriza en equilibrio sobre el pie de apoyo',NULL),
(eid,'Pogo jumps (saltos pogo)','potencia','full_body','pantorrilla,cuadriceps','potencia','principiante','casa','Saltos rápidos continuos con mínimo tiempo en el suelo','El impulso viene solo de los tobillos',NULL),
(eid,'Agility ladder run (escalera de agilidad)','agilidad','full_body','cuadriceps,pantorrilla','agilidad','intermedio','exterior','Carrera a través de la escalera de agilidad','Empieza lento, prioriza la técnica sobre la velocidad',NULL),
(eid,'Sprint acceleration drills','agilidad','full_body','cuadriceps,gluteos,isquiotibiales','agilidad','intermedio','exterior','Ejercicios de aceleración para mejorar la salida en sprint','A-skip, B-skip, C-skip progresivamente',NULL),

-- ============================================================
-- EJERCICIOS CON PESO CORPORAL AVANZADOS
-- ============================================================
(eid,'Tuck planche (planche tucked)','estabilizacion','pecho','core,hombros,triceps','fuerza','avanzado','calistenia','Primera progresión hacia la planche completa','Rodillas al pecho, cuerpo elevado con brazos rectos',NULL),
(eid,'One arm pull-up (dominada unilateral)','traccion_vertical','espalda','biceps,core','fuerza','avanzado','calistenia','La dominada más difícil: todo el peso con un brazo','Años de entrenamiento son necesarios',NULL),
(eid,'Maltese (calistenia avanzada)','estabilizacion','pecho','hombros,core','fuerza','avanzado','calistenia','Posición en paralelas con cuerpo extendido y brazos a los lados','Solo para atletas de élite en calistenia',NULL),
(eid,'Ring muscle-up','full_body','espalda','pecho,triceps,biceps','fuerza','avanzado','gimnasio','Muscle-up en anillas, mayor dificultad que en barra','Las anillas rotan hacia afuera en la transición',NULL),
(eid,'Box pistol squat (sentadilla pistol en cajón)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','calistenia','Pistol squat usando un cajón para el nivel de profundidad','Permite la progresión de la sentadilla pistol',NULL),
(eid,'Shrimp squat (sentadilla camarón)','sentadilla','cuadriceps','gluteos,flexores_cadera','fuerza','avanzado','calistenia','Sentadilla unilateral agarrando el tobillo trasero','Alternativa a la pistol squat con mayor trabajo del cuádrices',NULL),
(eid,'Cossack squat (sentadilla cosaca)','sentadilla','cuadriceps','abductores,aductores','movilidad','intermedio','casa','Sentadilla lateral donde el cuerpo va hacia un lado','Trabaja fuerza y movilidad lateral simultáneamente',NULL),
(eid,'Plyometric chin-up (chin-up pliométrico)','traccion_vertical','espalda','biceps','potencia','avanzado','calistenia','Chin-up explosivo que despega las manos de la barra','Máxima explosividad en la subida',NULL),
(eid,'Clapping pull-up (dominada con palmada)','traccion_vertical','espalda','biceps','potencia','avanzado','calistenia','Dominada explosiva con palmada en la parte alta','Requiere máxima explosividad de espalda y brazos',NULL),

-- ============================================================
-- EJERCICIOS DEPORTIVOS Y DE COORDINACIÓN
-- ============================================================
(eid,'Medicine ball chest pass (pase de pecho con balón)','potencia','pecho','triceps,hombros','potencia','principiante','gimnasio','Lanzamiento de balón medicinal a la pared con pase de pecho','Máxima explosividad, recibe y lanza inmediatamente',NULL),
(eid,'Medicine ball overhead throw (lanzamiento overhead)','potencia','hombros','core,espalda','potencia','principiante','gimnasio','Lanzamiento de balón medicinal hacia arriba o contra la pared','La potencia viene de la extensión completa del cuerpo',NULL),
(eid,'Medicine ball scoop throw','potencia','core','cuadriceps,hombros','potencia','intermedio','gimnasio','Lanzamiento de balón medicinal hacia adelante desde las piernas','Movimiento de bisagra + lanzamiento hacia adelante',NULL),
(eid,'Medicine ball side throw (lanzamiento lateral)','potencia','core','oblicuos,hombros','potencia','intermedio','gimnasio','Lanzamiento lateral de balón medicinal contra la pared','La fuerza viene de la rotación del torso y las caderas',NULL),
(eid,'Cone drills (ejercicios con conos)','agilidad','full_body','cuadriceps,gluteos','agilidad','intermedio','exterior','Ejercicios de agilidad con conos para cambios de dirección','Incluye zigzag, 5-10-5, L-drill',NULL),
(eid,'Reactive agility drill','agilidad','full_body','cuadriceps,gluteos','agilidad','avanzado','exterior','Agilidad reactiva respondiendo a señales del entrenador','Desarrolla el tiempo de reacción junto con la agilidad',NULL),
(eid,'Broad jump for distance','potencia','full_body','cuadriceps,gluteos','potencia','intermedio','exterior','Salto horizontal máximo como test de potencia','Impulso con brazos y extensión completa del cuerpo',NULL),
(eid,'Triple jump drill (triple salto)','potencia','full_body','cuadriceps,isquiotibiales,pantorrilla','potencia','avanzado','exterior','Tres saltos consecutivos: hop, step, jump','Desarrolla la coordinación y la potencia en cadena',NULL),

-- ============================================================
-- EJERCICIOS PARA PERSONAS MAYORES Y BAJA INTENSIDAD
-- ============================================================
(eid,'Chair squat (sentadilla en silla)','sentadilla','cuadriceps','gluteos','fuerza','principiante','casa','Levantarse y sentarse en la silla como ejercicio','Perfecto para principiantes o personas mayores',NULL),
(eid,'Wall push-up (flexión en pared)','empuje_horizontal','pecho','triceps,hombros','fuerza','principiante','casa','Flexión contra la pared, el nivel más básico','La inclinación reduce el peso a mover',NULL),
(eid,'Step tap (toque de escalón)','cardio','cuadriceps','gluteos','cardio','principiante','casa','Subir y bajar un escalón alternando los pies','Bajo impacto, excelente para empezar',NULL),
(eid,'Seated marching (marcha sentado)','cardio','cuadriceps','flexores_cadera','cardio','principiante','casa','Marcha con rodillas altas estando sentado en la silla','Sin impacto, ideal para personas con movilidad reducida',NULL),
(eid,'Ankle pumps (bombas de tobillo)','movilidad','pantorrilla','tobillo','movilidad','principiante','casa','Flexión y extensión del tobillo, puede hacerse tumbado','Activa la circulación en los miembros inferiores',NULL),
(eid,'Supine leg slide','aislamiento','cuadriceps','core','fuerza','principiante','casa','Deslizar el talón por el suelo, doblando y estirando la rodilla','Activación suave del cuádriceps sin carga articular',NULL),
(eid,'Seated shoulder rolls (rotaciones de hombro)','movilidad','hombros','trapecio','movilidad','principiante','casa','Rotación de hombros hacia adelante y hacia atrás sentado','Moviliza la articulación glenohumeral y la articulación acromioclavicular',NULL),
(eid,'Isometric quad set (contracción isométrica de cuádrices)','aislamiento','cuadriceps','isquiotibiales','rehabilitacion','principiante','casa','Tumbado, aprieta el cuádrices sin mover la rodilla','El primer ejercicio de rehabilitación de rodilla',NULL),
(eid,'Short arc quad (arco corto de cuádrices)','aislamiento','cuadriceps','isquiotibiales','rehabilitacion','principiante','casa','Extensión de rodilla desde 30° hasta completa, con una toalla','Rehabilitación de cuádrices sin estrés articular completo',NULL),
(eid,'Standing balance with support (equilibrio con apoyo)','estabilizacion','cuadriceps','tobillo','fuerza','principiante','casa','Equilibrio unilateral con una mano en la pared','Progresión desde apoyo total hasta sin apoyo',NULL),

-- ============================================================
-- DEPORTES DE COMBATE Y ARTES MARCIALES
-- ============================================================
(eid,'Shadow boxing (boxeo sombra)','cardio','hombros','core,cuadriceps','cardio','principiante','casa','Boxeo en el aire para cardio y coordinación','Mantén las guardias altas, muévete constantemente',NULL),
(eid,'Jab-cross combo','potencia','hombros','core,pecho','potencia','principiante','casa','Combinación básica de boxeo: jab + cross','El cross lleva la rotación del torso completa',NULL),
(eid,'Hip flexor kick','potencia','cuadriceps','flexores_cadera','potencia','intermedio','casa','Patada frontal potente activando el flexor de cadera','La rodilla sube primero, luego extiende el pie',NULL),
(eid,'Rotational hip kick (patada lateral)','potencia','gluteos','abductores,core','potencia','intermedio','casa','Patada lateral con rotación de cadera','La rotación del torso amplifica la potencia',NULL),

-- ============================================================
-- EJERCICIOS PARA MUJER — FOCO ESPECÍFICO
-- ============================================================
(eid,'Sumo deadlift con mancuerna (inner thigh focus)','bisagra_cadera','aductores','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Peso muerto sumo con mancuerna entre las piernas','Pies muy abiertos, rodillas alineadas con los pies',NULL),
(eid,'Jane fonda (elevación lateral tumbado)','aislamiento','abductores','gluteos','fuerza','principiante','casa','Elevación lateral de pierna clásico de los 80s','Trabaja el abductor en posición tumbada de lado',NULL),
(eid,'Glute squeeze isometric (isometría de glúteo)','aislamiento','gluteos','isquiotibiales','fuerza','principiante','casa','Contracción isométrica del glúteo de pie o tumbado','Contrae maximal 5 segundos, relaja, repite',NULL),
(eid,'Inner thigh squeeze with ball','aislamiento','aductores','core','fuerza','principiante','casa','Compresión de balón entre los muslos tumbado','Bola pequeña entre los muslos, aprieta 20-30 segundos',NULL),
(eid,'Reverse donkey kick (extensión inversa)','aislamiento','gluteos','isquiotibiales','fuerza','principiante','casa','Extensión de cadera hacia atrás y arriba en cuatro apoyos','Enfatiza el glúteo máximo en extensión',NULL),
(eid,'Fire hydrant (hidrante de fuego)','aislamiento','gluteos','abductores','fuerza','principiante','casa','Elevación lateral de rodilla en cuatro apoyos','Trabaja el glúteo medio y el piriforme',NULL),

-- ============================================================
-- BODYWEIGHT PROGRESSIONS — SISTEMA DE PROGRESIONES
-- ============================================================
(eid,'Incline push-up (flexión elevada)','empuje_horizontal','pecho','triceps,hombros','fuerza','principiante','casa','Flexión con manos elevadas, la versión más fácil','Cuanto más elevadas las manos, más fácil',NULL),
(eid,'Knee push-up (flexión de rodillas)','empuje_horizontal','pecho','triceps,hombros','fuerza','principiante','casa','Flexión de rodillas como progresión hacia la estándar','La carga es solo el 70% del peso corporal',NULL),
(eid,'Band-assisted squat (sentadilla asistida)','sentadilla','cuadriceps','gluteos','fuerza','principiante','casa','Sentadilla con la banda que te ayuda a subir','La banda debajo de los brazos en un punto fijo',NULL),
(eid,'Negative squat (excéntrica sentadilla)','sentadilla','cuadriceps','gluteos','fuerza','principiante','casa','Solo la bajada de la sentadilla, muy lenta','5-8 segundos de bajada, súbete ayudándote de algo',NULL),
(eid,'Ring push-up (flexión en anillas)','empuje_horizontal','pecho','triceps,core','fuerza','avanzado','gimnasio','Flexión en anillas, mayor inestabilidad','Gira las anillas hacia afuera en la posición superior',NULL),
(eid,'Pull-up hang with scapular retraction','traccion_vertical','espalda','romboides','fuerza','principiante','calistenia','Colgado con retracción escapular activa','Activa los dorsales sin doblar los codos',NULL),
(eid,'Scapular pull-up (dominada escapular)','traccion_vertical','espalda','romboides,serratos','fuerza','principiante','calistenia','Subida de la escápula sin doblar los codos','El primer movimiento hacia la dominada',NULL),

-- ============================================================
-- TRABAJO EN SUSPENSIÓN Y ANILLAS ADICIONALES
-- ============================================================
(eid,'Ring face pull','aislamiento','hombros','romboides,deltoides_posterior','fuerza','principiante','gimnasio','Face pull en anillas de suspensión','Lleva las manos a la cara con los codos altos',NULL),
(eid,'Ring inverted row','traccion_horizontal','espalda','biceps','fuerza','principiante','gimnasio','Remo invertido en anillas de suspensión','Ajusta el ángulo del cuerpo para la dificultad',NULL),
(eid,'TRX Y deltoid fly','aislamiento','hombros','romboides','fuerza','principiante','gimnasio','Elevación en Y usando TRX para los deltoides','Brazos hacia arriba en diagonal formando Y',NULL),
(eid,'TRX W deltoid fly','aislamiento','hombros','romboides,manguito_rotador','fuerza','principiante','gimnasio','Rotación externa de hombro en TRX formando W','El TRX permite trabajar la rotación en descarga',NULL),
(eid,'TRX atomic push-up','empuje_horizontal','pecho','core,triceps','fuerza','avanzado','gimnasio','Flexión en TRX más piernas al pecho','Combina la flexión con el jackknife',NULL),
(eid,'TRX chest stretch (estiramiento de pecho en TRX)','movilidad','pecho','hombros','movilidad','principiante','gimnasio','Apertura del pecho usando las correas del TRX','Inclínate hacia adelante con brazos en T',NULL),

-- ============================================================
-- ENTRENAMIENTO EN PISCINA Y ACUÁTICO
-- ============================================================
(eid,'Water walking (caminata en agua)','cardio','full_body','cuadriceps,gluteos','cardio','principiante','exterior','Caminar en el agua en la zona media de la piscina','El agua ofrece resistencia en todas las direcciones',NULL),
(eid,'Pool noodle squats (sentadilla con flotador)','sentadilla','cuadriceps','gluteos','fuerza','principiante','exterior','Sentadilla en el agua usando el flotador como resistencia','El flotador empuja hacia arriba, trabaja la bajada',NULL),
(eid,'Aqua aerobics jumps (saltos acuáticos)','cardio','full_body','cuadriceps,gluteos','cardio','principiante','exterior','Jumping jacks y saltos dentro del agua','El agua amortigua el impacto completamente',NULL),

-- ============================================================
-- TRABAJO ESPECÍFICO DE MANGUITO ROTADOR
-- ============================================================
(eid,'External rotation with band (ER con banda)','aislamiento','hombros','manguito_rotador','rehabilitacion','principiante','casa','Rotación externa de hombro con banda elástica','Codo a 90°, gira el antebrazo hacia afuera',NULL),
(eid,'Internal rotation with band (IR con banda)','aislamiento','hombros','manguito_rotador','rehabilitacion','principiante','casa','Rotación interna de hombro con banda elástica','Codo a 90°, gira el antebrazo hacia el abdomen',NULL),
(eid,'Empty can (lata vacía)','aislamiento','hombros','manguito_rotador','rehabilitacion','principiante','casa','Elevación a 30° en el plano escapular, pulgar hacia abajo','Trabaja el supraespinoso, cuidado si hay lesión',NULL),
(eid,'Full can (lata llena)','aislamiento','hombros','manguito_rotador','rehabilitacion','principiante','casa','Elevación a 30° en el plano escapular, pulgar hacia arriba','Alternativa más segura a la lata vacía',NULL),
(eid,'Side-lying ER (ER en lateral)','aislamiento','hombros','manguito_rotador','rehabilitacion','principiante','casa','Rotación externa de hombro tumbado de lado','La gravedad es la resistencia, sin pesos al inicio',NULL),
(eid,'Prone IR (RI en prono)','aislamiento','hombros','manguito_rotador','rehabilitacion','principiante','casa','Rotación interna de hombro boca abajo','Codo doblado, rota el antebrazo hacia el suelo',NULL),
(eid,'Sleeper stretch (estiramiento durmiente)','movilidad','hombros','manguito_rotador','movilidad','principiante','casa','Rotación interna pasiva del hombro tumbado de lado','Tumbado sobre el hombro, la otra mano empuja el antebrazo',NULL),
(eid,'Cross body stretch (estiramiento cruzado de hombro)','movilidad','hombros','deltoides_posterior','movilidad','principiante','casa','Lleva el brazo cruzado con el otro brazo o la pared','Trabaja la cápsula posterior del hombro',NULL),

-- ============================================================
-- ENTRENAMIENTO FUNCIONAL PARA DEPORTISTAS
-- ============================================================
(eid,'Rotational medicine ball throw (deportivo)','potencia','core','hombros,oblicuos','potencia','intermedio','gimnasio','Lanzamiento rotacional para deportes de raqueta o pelota','Iniciar desde el pie opuesto, girar y lanzar con toda la cadena',NULL),
(eid,'Split jerk practice (práctica de jerk en split)','olimpico','hombros','cuadriceps,core','potencia','avanzado','gimnasio','Práctica del jerk en split para la técnica de halterofilia','Caída controlada en posición de zancada bajo la barra',NULL),
(eid,'Clean pull (tirón de clean)','olimpico','full_body','cuadriceps,espalda,hombros','potencia','avanzado','gimnasio','Tirón del clean sin la recepción de la barra','Trabaja la velocidad y potencia del tirón',NULL),
(eid,'Hang clean (clean desde colgado)','olimpico','full_body','cuadriceps,espalda','potencia','avanzado','gimnasio','Power clean desde la posición colgante','Más accesible técnicamente que el clean desde el suelo',NULL),
(eid,'Hang power snatch','olimpico','full_body','hombros,cuadriceps','potencia','avanzado','gimnasio','Arrancada de potencia desde colgado','La versión más técnica exige movilidad extrema del hombro',NULL),
(eid,'Box jump step down (salto a caja + bajada)','potencia','full_body','cuadriceps,gluteos','potencia','principiante','gimnasio','Salto al cajón con bajada caminando (no saltar a bajo)','Bajar siempre caminando para proteger las rodillas',NULL),
(eid,'Resisted sprint with sled harness','agilidad','full_body','cuadriceps,gluteos,isquiotibiales','potencia','avanzado','exterior','Sprint con resistencia del trineo para potencia de aceleración','La resistencia no debe reducir la velocidad más del 10%',NULL),

-- ============================================================
-- TRABAJO UNILATERAL ADICIONAL
-- ============================================================
(eid,'Single arm dumbbell press (press unilateral)','empuje_horizontal','pecho','triceps,core','fuerza','intermedio','gimnasio','Press unilateral en banco, mayor demanda del core','El desequilibrio activa el oblicuo del lado contrario',NULL),
(eid,'Single arm dumbbell fly (apertura unilateral)','aislamiento','pecho','deltoides_anterior','hipertrofia','intermedio','gimnasio','Apertura con una sola mancuerna, la otra mano en cadera','Mayor demanda estabilizadora del core',NULL),
(eid,'Contralateral deadlift','bisagra_cadera','isquiotibiales','gluteos,core','fuerza','intermedio','gimnasio','Peso muerto con peso en el lado contrario al pie de apoyo','El desequilibrio exige mayor activación del core',NULL),
(eid,'Suitcase deadlift (peso muerto maletín)','bisagra_cadera','isquiotibiales','core,oblicuos','fuerza','intermedio','gimnasio','Peso muerto con la carga a un solo lado del cuerpo','Exige anti-lateralización del core',NULL),
(eid,'Offset goblet squat','sentadilla','cuadriceps','gluteos,core','fuerza','intermedio','gimnasio','Sentadilla goblet sosteniendo el peso con una sola mano','El offset activa los oblicuos y el cuadrado lumbar',NULL),
(eid,'Single leg romanian deadlift (mancuerna ipsilateral)','bisagra_cadera','isquiotibiales','gluteos,core','fuerza','intermedio','gimnasio','RDL unilateral con la mancuerna en el lado de la pierna de apoyo','Facilita el equilibrio respecto a la mancuerna contralateral',NULL),
(eid,'Step mill (escaladora)','cardio','full_body','cuadriceps,gluteos,pantorrilla','cardio','principiante','gimnasio','Máquina de escaleras para cardio de baja intensidad alta','No te apoyes en los pasamanos, deja que las piernas hagan el trabajo',NULL),

-- ============================================================
-- COMBINACIONES Y SUPERSETS
-- ============================================================
(eid,'Push-pull superset (empuje-tracción)','full_body','full_body','full_body','fuerza','intermedio','gimnasio','Combina un empuje con una tracción sin descanso entre ellos','Ej: press + remo, sin tiempo de descanso entre ambos',NULL),
(eid,'Squat to press (sentadilla + press)','full_body','cuadriceps','hombros,gluteos','fuerza','principiante','casa','Sentadilla goblet que termina en press vertical','El impulso de la sentadilla ayuda al press',NULL),
(eid,'Curl to press (curl + press)','full_body','biceps','hombros,triceps','fuerza','principiante','casa','Curl de bíceps que termina en press Arnold','Movimiento continuo de bíceps a hombro',NULL),
(eid,'Romanian deadlift to bent over row','bisagra_cadera','isquiotibiales','espalda,biceps','fuerza','intermedio','gimnasio','RDL + remo en la posición baja del peso muerto','Máximo tiempo bajo tensión con un solo movimiento',NULL),
(eid,'Lunge to curl (zancada + curl)','full_body','cuadriceps','biceps,gluteos','fuerza','principiante','casa','Zancada hacia adelante mientras haces curl de bíceps','Mejora la coordinación y el trabajo funcional',NULL),
(eid,'Clean and press (clean + press)','olimpico','full_body','cuadriceps,hombros','potencia','avanzado','gimnasio','Power clean de barra o mancuernas seguido de press','Encadena los dos movimientos sin pausa',NULL),

-- ============================================================
-- EJERCICIOS CON DISCO
-- ============================================================
(eid,'Plate raise (elevación con disco)','aislamiento','hombros','deltoides_anterior','hipertrofia','principiante','gimnasio','Elevación frontal con un disco','Brazo casi recto, sube hasta la horizontal',NULL),
(eid,'Plate press (press con disco)','empuje_horizontal','pecho','triceps,hombros','fuerza','principiante','gimnasio','Press con disco sostenido entre las palmas','Exige presión constante para sostener el disco',NULL),
(eid,'Plate overhead carry','estabilizacion','hombros','core,trapecio','fuerza','principiante','gimnasio','Caminata sosteniendo el disco sobre la cabeza','Brazos completamente extendidos, core muy activo',NULL),
(eid,'Plate around the world','movilidad','hombros','core','movilidad','principiante','gimnasio','Pasar el disco alrededor del cuerpo alternando dirección','Mantén los brazos rectos, el núcleo activo',NULL),
(eid,'Plate squat (sentadilla con disco elevado)','sentadilla','cuadriceps','gluteos,hombros','fuerza','principiante','gimnasio','Sentadilla sosteniendo el disco frente a ti con brazos rectos','El disco eleva el centro de gravedad y exige más core',NULL),

-- ============================================================
-- EJERCICIOS DE VELOCIDAD Y REACTIVIDAD
-- ============================================================
(eid,'Reactive box jump (salto reactivo)','potencia','full_body','cuadriceps,gluteos','potencia','avanzado','gimnasio','Caída de un cajón + salto inmediato a otro','El tiempo de contacto en suelo debe ser mínimo',NULL),
(eid,'Multiple hurdle jumps (saltos en vallas)','potencia','full_body','cuadriceps,pantorrilla','potencia','intermedio','exterior','Saltos consecutivos sobre vallas bajas','Mantén el impulso entre cada valla',NULL),
(eid,'Sprint with direction change (cambio de dirección)','agilidad','full_body','cuadriceps,gluteos','agilidad','intermedio','exterior','Sprint + parada brusca + arrancada en otra dirección','El frenado exige tanta fuerza como el sprint',NULL),
(eid,'Deceleration drill (frenada)','agilidad','full_body','cuadriceps,isquiotibiales','agilidad','intermedio','exterior','Práctica de frenadas bruscas desde sprint máximo','Exige enorme estrés excéntrico en los isquiotibiales',NULL);

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
RAISE NOTICE 'Parte 2 insertada correctamente.';

END $$;
