-- ============================================================
-- SEED PARTE 3: Biblioteca de Ejercicios — Forge Studio
-- Ampliación hasta 1000+ ejercicios totales
-- ============================================================

DO $$
DECLARE
  eid UUID := '0b908e25-f69f-472c-9972-87bc93d67e65';
BEGIN

-- ============================================================
-- PIERNA — FEMORAL Y ADUCTOR ADICIONALES
-- ============================================================
INSERT INTO ejercicios_biblioteca (entrenador_id, nombre, patron, grupo_muscular, grupo_secundario, tipo, nivel, modalidad, descripcion, consejos_tecnica, youtube_url) VALUES
(eid,'Lying leg curl (curl femoral tumbado)','aislamiento','isquiotibiales','pantorrilla','hipertrofia','principiante','gimnasio','Curl de isquiotibial en máquina en posición tumbada','La cadera pegada al banco evita el enganche de la lumbares',NULL),
(eid,'Seated leg curl (curl femoral sentado)','aislamiento','isquiotibiales','pantorrilla','hipertrofia','principiante','gimnasio','Curl de isquiotibial en máquina en posición sentada','La posición sentada alarga el músculo antes del movimiento',NULL),
(eid,'Standing leg curl (curl femoral de pie)','aislamiento','isquiotibiales','pantorrilla','hipertrofia','principiante','gimnasio','Curl de isquiotibial de pie, unilateral','Exige más estabilidad de core que el tumbado',NULL),
(eid,'Adductor machine (máquina de aductores)','aislamiento','aductores','gluteos','hipertrofia','principiante','gimnasio','Máquina de aductores sentado, junta las piernas contra resistencia','No vayas demasiado al fondo si hay poca movilidad de cadera',NULL),
(eid,'Abductor machine (máquina de abductores)','aislamiento','abductores','gluteos','hipertrofia','principiante','gimnasio','Máquina de abductores sentado, separa las piernas contra resistencia','Mantén la espalda recta, no la curves durante el movimiento',NULL),
(eid,'Cable adduction (aducción en cable)','aislamiento','aductores','gluteos','hipertrofia','principiante','gimnasio','Aducción con tobillera en cable','Sujétate de algo para el equilibrio, trabaja el rango completo',NULL),
(eid,'Cable abduction (abducción en cable)','aislamiento','abductores','gluteos','hipertrofia','principiante','gimnasio','Abducción con tobillera en cable','La pierna de trabajo cruza levemente por delante al inicio',NULL),
(eid,'Hip abduction on floor (abducción en suelo)','aislamiento','abductores','gluteos','fuerza','principiante','casa','Elevación lateral de pierna tumbado de lado','La pierna recta, el tobillo en flexión, el movimiento lento',NULL),
(eid,'Glute-ham raise (extensión glúteo-femoral)','bisagra_cadera','isquiotibiales','gluteos,espalda_baja','fuerza','avanzado','gimnasio','Flexión de rodilla y extensión de cadera en máquina GHD','Muy demandante para la cadena posterior, solo avanzados',NULL),
(eid,'Prone hip extension (extensión cadera en prono)','aislamiento','gluteos','isquiotibiales','fuerza','principiante','casa','Extensión de cadera tumbado boca abajo','Mantén la cadera pegada al suelo, solo mueve la pierna',NULL),
(eid,'Sumo squat with dumbbell (sentadilla sumo con mancuerna)','sentadilla','aductores','gluteos,cuadriceps','fuerza','principiante','casa','Sentadilla sumo sosteniendo una mancuerna con ambas manos','Pies muy abiertos, rodillas alineadas con los pies al bajar',NULL),
(eid,'Lateral lunge with slide (zancada lateral con desliz)','sentadilla','aductores','gluteos,cuadriceps','fuerza','intermedio','casa','Zancada lateral con el pie que desliza en suelo liso','Usa un calcetín en el pie que se desliza para reducir fricción',NULL),

-- ============================================================
-- PANTORRILLA — ADICIONALES
-- ============================================================
(eid,'Seated calf raise (gemelo sentado)','aislamiento','sóleo','pantorrilla','hipertrofia','principiante','gimnasio','Elevación de talones sentado, énfasis en el sóleo','Rodilla a 90°, el sóleo trabaja más que el gemelo en esta posición',NULL),
(eid,'Leg press calf raise (gemelo en prensa)','aislamiento','pantorrilla','sóleo','hipertrofia','principiante','gimnasio','Elevación de talones usando la prensa de piernas','Mayor sobrecarga que el de pie, menos riesgo de balance',NULL),
(eid,'Single leg calf raise weighted (gemelo unilateral con peso)','aislamiento','pantorrilla','sóleo','hipertrofia','intermedio','gimnasio','Gemelo unilateral sosteniendo una mancuerna','Mayor ROM y carga, corrige asimetrías entre piernas',NULL),
(eid,'Tibialis raise (elevación de tibial)','aislamiento','tibial_anterior','pantorrilla','fuerza','principiante','casa','Apoyado en la pared, levanta la punta del pie del suelo','Trabaja el tibial anterior, antagonista del gemelo',NULL),
(eid,'Jump rope (comba)','cardio','pantorrilla','cuadriceps,full_body','cardio','principiante','exterior','Saltar la comba a ritmo constante o variable','Muñecas girando, no los codos; aterriza suave en la punta del pie',NULL),

-- ============================================================
-- CORE — ADICIONALES AVANZADOS
-- ============================================================
(eid,'Hollow body rock (balanceo hollow)','estabilizacion','core','flexores_cadera','fuerza','avanzado','calistenia','Posición hollow rígida, balanceo adelante-atrás','El cuerpo debe mantener la forma de plátano durante el balanceo',NULL),
(eid,'Arch body hold (superman estático)','estabilizacion','espalda_baja','gluteos,hombros','fuerza','principiante','calistenia','Posición de arco opuesta al hollow body, isometría','Contrae el cuerpo al máximo, antagonista del hollow body',NULL),
(eid,'Toes to bar (pies a barra)','aislamiento','core','flexores_cadera,espalda','fuerza','avanzado','calistenia','Desde colgado, llevar los pies a tocar la barra','El movimiento empieza desde las caderas, no desde las rodillas',NULL),
(eid,'Knees to elbows (rodillas a codos)','aislamiento','core','flexores_cadera','fuerza','intermedio','calistenia','Desde colgado, llevar las rodillas a tocar los codos','Progresión antes de los toes to bar',NULL),
(eid,'L-sit from floor (L-sit en suelo)','estabilizacion','core','triceps,cuadriceps','fuerza','avanzado','calistenia','Sentado en el suelo, elevar el cuerpo con piernas extendidas horizontales','Manos planas, brazos rectos, todo el peso en las manos',NULL),
(eid,'Tuck L-sit (L-sit con rodillas)','estabilizacion','core','triceps','fuerza','intermedio','calistenia','L-sit con las rodillas pegadas al pecho en lugar de piernas rectas','Progresión hacia el L-sit completo',NULL),
(eid,'Dragon flag (bandera del dragón)','estabilizacion','core','espalda,triceps','fuerza','avanzado','calistenia','Isometría del cuerpo recto inclinado desde los hombros','Solo los hombros y el cuello tocan el banco',NULL),
(eid,'Pallof press isometric (press Pallof isométrico)','estabilizacion','core','oblicuos,hombros','fuerza','principiante','gimnasio','Press de cable hacia adelante desde el pecho, aguantar extendido','Mayor resistencia = más difícil; trabajas la anti-rotación',NULL),
(eid,'Pallof press with rotation (press Pallof + rotación)','rotacion','core','oblicuos,hombros','fuerza','intermedio','gimnasio','Igual que el Pallof pero rotando el torso al extender','La rotación exige control excéntrico del oblicuo',NULL),
(eid,'Copenhagen side plank with abduction','estabilizacion','core','aductores,abductores','fuerza','avanzado','casa','Plancha de Copenhague más elevación de la pierna inferior','Combina aductor, abductor y core lateral',NULL),
(eid,'Side plank clam (plancha lateral + almeja)','estabilizacion','core','abductores,gluteos','fuerza','principiante','casa','Plancha lateral con las rodillas dobladas, abre la rodilla superior','Activa el glúteo medio y el oblicuo simultáneamente',NULL),
(eid,'Bicycle crunch (crunch bicicleta)','rotacion','core','oblicuos','hipertrofia','principiante','casa','Crunch rotacional alternando codo-rodilla contrarios','Rota el torso, no solo el codo',NULL),
(eid,'Reverse crunch on incline (crunch inverso declinado)','aislamiento','core','flexores_cadera','hipertrofia','intermedio','gimnasio','Crunch inverso en banco declinado','El ángulo aumenta el ROM y la dificultad',NULL),
(eid,'Ab roller on knees (rueda abdominal de rodillas)','estabilizacion','core','dorsal,hombros','fuerza','principiante','casa','Rodada abdominal desde las rodillas','Versión de iniciación de la rueda abdominal',NULL),
(eid,'Single arm ab roller','estabilizacion','core','dorsal,oblicuos','fuerza','avanzado','casa','Rueda abdominal con una sola mano','Máxima dificultad de la rueda, exige anti-rotación',NULL),

-- ============================================================
-- ESPALDA BAJA Y CADENA POSTERIOR COMPLETA
-- ============================================================
(eid,'45-degree back extension (hiperextensión 45°)','bisagra_cadera','espalda_baja','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Extensión de espalda en banco a 45 grados','Movimiento controlado, sin hiperestender la espalda baja',NULL),
(eid,'Weighted back extension (extensión con peso)','bisagra_cadera','espalda_baja','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Hiperextensión añadiendo peso adicional en el pecho','El peso aumenta el estímulo sin cambiar la técnica',NULL),
(eid,'Bird-dog with band (perro pájaro con banda)','estabilizacion','espalda_baja','gluteos,core','fuerza','principiante','casa','Bird-dog con una banda en la pierna extendida','La resistencia de la banda aumenta la activación del glúteo',NULL),
(eid,'Reverse hyper machine','bisagra_cadera','espalda_baja','gluteos,isquiotibiales','rehabilitacion','intermedio','gimnasio','Extensión invertida en máquina específica','Excelente para la descompresión lumbar post-entrenamiento pesado',NULL),
(eid,'Back extension on swiss ball','bisagra_cadera','espalda_baja','gluteos','fuerza','principiante','gimnasio','Extensión de espalda con fitball bajo la cadera','La inestabilidad del fitball activa más la musculatura estabilizadora',NULL),
(eid,'Jefferson curl (curl de Jefferson)','bisagra_cadera','espalda_baja','isquiotibiales','movilidad','avanzado','gimnasio','Flexión de columna completa con peso mínimo','Muy controvertido, solo para atletas con técnica perfecta',NULL),
(eid,'Thoracic extension over foam roller (extensión torácica)','movilidad','espalda_alta','pecho','movilidad','principiante','casa','Colocar el foam roller en la zona torácica y dejar caer el pecho','Movimiento segmentado, vértebra a vértebra',NULL),
(eid,'Cat-cow lumbar (gato-vaca)','movilidad','espalda_baja','core','movilidad','principiante','casa','Flexión y extensión alternada de columna en cuatro apoyos','El movimiento lento y coordinado con la respiración',NULL),
(eid,'Prone back extension (cobra)','movilidad','espalda_baja','gluteos','movilidad','principiante','casa','Elevación del torso tumbado boca abajo, estiramiento del psoas','Solo hasta donde sea cómodo, sin forzar la extensión',NULL),
(eid,'Quadruped hip extension (extensión de cadera en cuatro apoyos)','aislamiento','gluteos','espalda_baja','fuerza','principiante','casa','Extensión de cadera con la rodilla a 90° en cuatro apoyos','Activa el glúteo sin cargar la espalda baja',NULL),
(eid,'Dead bug progression (insecto muerto)','estabilizacion','core','flexores_cadera,hombros','fuerza','principiante','casa','Tumbado, baja brazos y piernas opuestos a la vez','La zona lumbar DEBE mantenerse pegada al suelo siempre',NULL),

-- ============================================================
-- HOMBROS — ESTABILIZACIÓN Y PREVENCIÓN
-- ============================================================
(eid,'Face pull with external rotation','aislamiento','hombros','romboides,manguito_rotador','fuerza','principiante','gimnasio','Face pull con rotación externa al final del movimiento','Lleva los pulgares hacia atrás en la posición final',NULL),
(eid,'Prone I-Y-T-W raises (elevaciones IYTW)','aislamiento','hombros','romboides,trapecio','fuerza','principiante','casa','Serie de elevaciones en prono para la musculatura escapular','I: brazos al frente; Y: diagonal; T: lateral; W: rotación externa',NULL),
(eid,'Lying external rotation (ER tumbado)','aislamiento','hombros','manguito_rotador','rehabilitacion','principiante','casa','Rotación externa de hombro tumbado de lado con mancuerna ligera','La gravedad da la resistencia: comienza sin peso',NULL),
(eid,'Side-lying reach (alcance lateral en decúbito)','movilidad','hombros','pecho,dorsal','movilidad','principiante','casa','Tumbado de lado, alcanza con el brazo superior hacia el techo y atrás','Abre el pecho con cada repetición',NULL),
(eid,'Doorway chest stretch (estiramiento de pecho en puerta)','movilidad','pecho','hombros','movilidad','principiante','casa','Apoya el antebrazo en el marco de la puerta y gira el torso','Trabaja la cápsula anterior del hombro y el pectoral',NULL),
(eid,'Bear hug stretch (abrazo de oso)','movilidad','espalda_alta','romboides','movilidad','principiante','casa','Cruza los brazos abrazándote, lleva los hombros adelante','Estira el romboides y el trapecio medio',NULL),
(eid,'Posterior capsule stretch (estiramiento cápsula posterior)','movilidad','hombros','deltoides_posterior','movilidad','principiante','casa','Lleva el brazo cruzado con la mano contraria mientras empujas la escápula adelante','Estira la cápsula posterior, diferente al cross-body stretch',NULL),
(eid,'Lat stretch with band (estiramiento dorsal con banda)','movilidad','espalda','hombros','movilidad','principiante','casa','Cuelga de una barra con agarre y deja caer el peso para estirar el dorsal','Solo tu peso, sin tirar. El lat cede gradualmente',NULL),

-- ============================================================
-- TRABAJO CON BANDAS ELÁSTICAS — COMPLETO
-- ============================================================
(eid,'Band pull-apart (separación de banda)','aislamiento','hombros','romboides','fuerza','principiante','casa','Sostén la banda con ambas manos y separa los brazos al frente','El movimiento de apertura activa el deltoides posterior y los romboides',NULL),
(eid,'Band overhead press (press con banda)','empuje_vertical','hombros','triceps','fuerza','principiante','casa','Press vertical con banda elástica','La resistencia aumenta conforme subes, máximo esfuerzo arriba',NULL),
(eid,'Band squat (sentadilla con banda)','sentadilla','cuadriceps','gluteos','fuerza','principiante','casa','Sentadilla con la banda anclada debajo de los pies y sobre los hombros','La tensión de la banda aumenta en la posición alta',NULL),
(eid,'Band deadlift (peso muerto con banda)','bisagra_cadera','isquiotibiales','gluteos,espalda_baja','fuerza','principiante','casa','Peso muerto con banda elástica bajo los pies','Mayor resistencia al extenderse, ideal cuando no hay barra',NULL),
(eid,'Band row (remo con banda)','traccion_horizontal','espalda','biceps','fuerza','principiante','casa','Remo con banda anclada a algo sólido a nivel del pecho','Simula el remo en cable cuando no hay máquinas',NULL),
(eid,'Band bicep curl (curl con banda)','aislamiento','biceps','braquiorradial','hipertrofia','principiante','casa','Curl de bíceps con banda elástica','Pisa la banda con ambos pies, sube sin soltar los codos',NULL),
(eid,'Band tricep extension (extensión con banda)','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','casa','Extensión de tríceps con banda anclada arriba','Idéntico al cable, pero con banda',NULL),
(eid,'Band lateral walk (caminata lateral con mini-banda)','aislamiento','abductores','gluteos_medios','fuerza','principiante','casa','Caminata lateral con mini banda en los tobillos o rodillas','Pasos cortos y controlados, la pelvis neutra siempre',NULL),
(eid,'Band monster walk','aislamiento','abductores','gluteos','fuerza','principiante','casa','Caminata diagonal hacia adelante con banda en tobillos','Abre y cierra alternando pies en diagonal',NULL),
(eid,'Band hip thrust (puente de glúteos con banda)','bisagra_cadera','gluteos','isquiotibiales','fuerza','principiante','casa','Puente de glúteos con banda sobre las caderas','La banda da resistencia sin necesitar barra ni pesas',NULL),
(eid,'Band hamstring curl (curl femoral con banda)','aislamiento','isquiotibiales','gluteos','fuerza','principiante','casa','Curl femoral boca abajo con banda en el tobillo','La banda anclada debajo o al frente da la resistencia',NULL),
(eid,'Band face pull (face pull con banda)','aislamiento','hombros','romboides','fuerza','principiante','casa','Face pull usando una banda elástica en lugar de cable','La banda da tensión creciente igual que el cable',NULL),
(eid,'Band chest fly (apertura con banda)','aislamiento','pecho','deltoides_anterior','hipertrofia','principiante','casa','Apertura de pecho con banda a la espalda','Junta las manos frente al pecho, mantén los codos semi-flexionados',NULL),
(eid,'Band good morning','bisagra_cadera','espalda_baja','isquiotibiales,gluteos','fuerza','principiante','casa','Good morning con la banda sobre los hombros','Peso mínimo, enfoca en la técnica de la bisagra de cadera',NULL),
(eid,'Band pallof press (press anti-rotacional con banda)','estabilizacion','core','oblicuos,hombros','fuerza','principiante','casa','Press Pallof usando una banda anclada a un lado','Perfecto cuando no hay máquina de cable',NULL),
(eid,'Crab walk with band (cangrejo con banda)','aislamiento','abductores','gluteos,cuadriceps','fuerza','principiante','casa','Cuclillas y andar en cuclillas lateralmente con banda','Mantén las caderas bajas durante todo el desplazamiento',NULL),
(eid,'Band resisted push-up (flexión con banda)','empuje_horizontal','pecho','triceps,hombros','fuerza','intermedio','casa','Flexión normal con una banda cruzada por la espalda','La banda añade resistencia en la parte alta del movimiento',NULL),

-- ============================================================
-- CARDIO FUNCIONAL ADICIONAL
-- ============================================================
(eid,'Sled push (empuje de trineo)','cardio','full_body','cuadriceps,gluteos,hombros','cardio','intermedio','exterior','Empujar el trineo de alta intensidad','La inclinación del torso da potencia, empuja con piernas',NULL),
(eid,'Sled pull (arrastre de trineo)','cardio','full_body','isquiotibiales,espalda,biceps','cardio','intermedio','exterior','Tirar del trineo caminando hacia atrás','Mantén la espalda recta, no redondees los hombros',NULL),
(eid,'Battle ropes alternating (cuerdas alternadas)','cardio','full_body','hombros,core','cardio','principiante','gimnasio','Ondas alternas en cuerdas de batalla','Caderas ligeramente dobladas, movimiento desde los hombros',NULL),
(eid,'Battle ropes double wave (cuerdas dobles)','cardio','full_body','hombros,core','cardio','intermedio','gimnasio','Ondas dobles simultáneas en cuerdas de batalla','Las dos manos bajan y suben al mismo tiempo',NULL),
(eid,'Battle ropes slams (golpes de cuerda)','cardio','full_body','hombros,core,espalda','cardio','intermedio','gimnasio','Lanzar las cuerdas al suelo con máxima fuerza','La potencia viene de todo el cuerpo, no solo los brazos',NULL),
(eid,'Battle ropes circles (círculos con cuerdas)','cardio','full_body','hombros,core','cardio','intermedio','gimnasio','Hacer círculos horizontales con las cuerdas','Hacia adelante y hacia atrás en series iguales',NULL),
(eid,'Farmer carry (granjero)','full_body','antebrazos','core,trapecio,cuadriceps','fuerza','principiante','gimnasio','Caminata sosteniendo peso pesado en ambas manos','Hombros atrás y abajo, core activado, pasos cortos',NULL),
(eid,'Single arm farmer carry (granjero unilateral)','full_body','antebrazos','core,oblicuos,trapecio','fuerza','principiante','gimnasio','Caminata con peso en un solo lado, mayor anti-lateralización','El peso de un lado obliga al core a estabilizar más',NULL),
(eid,'Waiter carry (camarero)','full_body','hombros','core,trapecio','fuerza','intermedio','gimnasio','Caminata con peso sobre la cabeza en una mano como camarero','El hombro debe estar estable en rotación externa',NULL),
(eid,'Front rack carry (caminata con rack frontal)','full_body','hombros','core,cuadriceps','fuerza','intermedio','gimnasio','Caminata con las pesas en posición de rack frontal','Las muñecas neutras, los codos altos, el torso recto',NULL),
(eid,'Zercher carry (caminata Zercher)','full_body','biceps','core,cuadriceps,trapecio','fuerza','avanzado','gimnasio','Caminata con la barra en el pliegue de los codos','Posición idéntica a la sentadilla Zercher pero caminando',NULL),
(eid,'Yoke carry (yugo)','full_body','trapecio','core,cuadriceps','fuerza','avanzado','gimnasio','Caminata con estructura de yugo sobre los hombros','Pasos cortos y rápidos, la barra no debe oscilar',NULL),
(eid,'Sprint intervals (sprints intervalados)','cardio','full_body','cuadriceps,gluteos,isquiotibiales','cardio','intermedio','exterior','Sprint al 90-100% alternando con recuperación activa','Calentamiento completo antes, no arrancar en frío',NULL),
(eid,'Hill sprint (sprint en cuesta)','cardio','full_body','cuadriceps,gluteos','cardio','intermedio','exterior','Sprint cuesta arriba para mayor carga muscular','La cuesta reduce el impacto articular vs. suelo plano',NULL),
(eid,'Box step-overs (pasos sobre caja)','cardio','full_body','cuadriceps,gluteos','cardio','principiante','gimnasio','Pasar de un lado al otro del cajón alternando el pie','Ritmo constante, mantén la vista al frente',NULL),
(eid,'Wall ball shots (lanzamiento de balón a pared)','cardio','full_body','cuadriceps,hombros','cardio','principiante','gimnasio','Sentadilla + lanzamiento de balón medicinal a la pared','Agarra el balón justo encima de la cabeza, baja directo a la sentadilla',NULL),
(eid,'Assault bike (bici de asalto)','cardio','full_body','hombros,cuadriceps','cardio','principiante','gimnasio','Bicicleta con manillar móvil para brazos y piernas','Sprints en bici de asalto son devastadores para el cardio',NULL),
(eid,'Rowing machine (remo indoor)','cardio','full_body','espalda,piernas','cardio','principiante','gimnasio','Remo en máquina ergométrica indoor','La secuencia: piernas primero, luego inclinación del torso, luego brazos',NULL),
(eid,'Ski erg (ergómetro de esquí)','cardio','full_body','espalda,hombros,core','cardio','principiante','gimnasio','Máquina de esquí nórdico, tirar de las cuerdas hacia abajo','Bisagra de cadera + jalón de brazos de forma coordinada',NULL),

-- ============================================================
-- PIERNAS — SPLIT SQUAT Y LUNGES ADICIONALES
-- ============================================================
(eid,'Walking lunge with twist (zancada + rotación)','sentadilla','cuadriceps','gluteos,core,oblicuos','fuerza','intermedio','casa','Zancada hacia adelante con rotación del torso hacia la pierna delantera','La rotación activa el oblicuo y el core rotacional',NULL),
(eid,'Plyometric lunge (zancada pliométrica)','potencia','cuadriceps','gluteos,isquiotibiales','potencia','intermedio','casa','Zancada que termina en salto cambiando las piernas en el aire','Aterriza en posición de zancada opuesta, control del impacto',NULL),
(eid,'Static lunge (zancada estática)','sentadilla','cuadriceps','gluteos','fuerza','principiante','casa','Zancada sin moverse, la posición se mantiene fija','Permite mayor concentración en la técnica que la zancada dinámica',NULL),
(eid,'Lunge with kick (zancada con patada)','sentadilla','cuadriceps','gluteos,flexores_cadera','fuerza','intermedio','casa','Zancada hacia atrás y al subir da una patada frontal con la pierna trasera','La patada activa el flexor de cadera y el equilibrio',NULL),
(eid,'Single leg deadlift to lunge (peso muerto + zancada)','bisagra_cadera','isquiotibiales','gluteos,cuadriceps','fuerza','avanzado','casa','Peso muerto unilateral que termina en zancada hacia atrás con esa pierna','Movimiento complejo que desarrolla coordinación y fuerza',NULL),
(eid,'Box step-up with dumbbells (step con mancuernas)','sentadilla','cuadriceps','gluteos','fuerza','intermedio','gimnasio','Step-up sosteniendo mancuernas a los lados','Mantén el torso erguido, no te ayudes de la pierna que cuelga',NULL),
(eid,'Deficit reverse lunge (zancada inversa en déficit)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','avanzado','gimnasio','Zancada hacia atrás desde una plataforma elevada','El déficit aumenta el ROM del cuádriceps y el glúteo',NULL),

-- ============================================================
-- CALISTENIA — HABILIDADES Y SKILLS
-- ============================================================
(eid,'Handstand wall hold (pino contra la pared)','estabilizacion','hombros','core,triceps','fuerza','intermedio','casa','Posición invertida contra la pared','Mantén el cuerpo completamente recto, no arquees la espalda',NULL),
(eid,'Handstand push-up (flexión en pino)','empuje_vertical','hombros','triceps,core','fuerza','avanzado','calistenia','Flexión en posición invertida, el movimiento más difícil de hombro','Primero el pino estático perfecto, luego la flexión',NULL),
(eid,'Pike push-up (flexión en pico)','empuje_vertical','hombros','triceps','fuerza','intermedio','calistenia','Flexión en posición de pico invertido, progresión hacia el pino','Las caderas en alto, los codos hacia afuera',NULL),
(eid,'Tuck front lever (palanca delantera tucked)','estabilizacion','espalda','core,biceps','fuerza','avanzado','calistenia','Primera progresión hacia la palanca delantera completa','Rodillas al pecho, cuerpo elevado con brazos rectos en barra',NULL),
(eid,'Front lever tuck hold','estabilizacion','espalda','core,biceps','fuerza','avanzado','calistenia','Isometría de la palanca delantera con rodillas recogidas','La espalda debe estar horizontal al suelo',NULL),
(eid,'Back lever tuck (palanca trasera tucked)','estabilizacion','pecho','core,hombros','fuerza','avanzado','calistenia','Primera progresión hacia la palanca trasera','El cuerpo boca abajo en horizontal, rodillas recogidas',NULL),
(eid,'Human flag progression (bandera humana)','estabilizacion','core','hombros,dorsal,oblicuos','fuerza','avanzado','calistenia','El cuerpo horizontal sujeto a un poste vertical','Requiere años de entrenamiento específico',NULL),
(eid,'Muscle-up bar (muscle-up en barra)','full_body','espalda','pecho,triceps,biceps','fuerza','avanzado','calistenia','Tirón + transición + fondos en una sola secuencia en barra','El tirón es explosivo, la transición rápida y controlada',NULL),
(eid,'Bar dip (fondo en barra paralela)','empuje_horizontal','triceps','pecho,hombros','fuerza','intermedio','calistenia','Fondos en barras paralelas','Inclínate hacia adelante para mayor pecho, recto para más tríceps',NULL),
(eid,'Ring dip (fondo en anillas)','empuje_horizontal','triceps','pecho,hombros,core','fuerza','avanzado','calistenia','Fondos en anillas, mucho más inestable que en barras','Las anillas rotan hacia afuera en la posición superior',NULL),
(eid,'Tuck jump to bar (salto al agarre)','traccion_vertical','espalda','cuadriceps,biceps','potencia','avanzado','calistenia','Saltar para agarrar la barra y terminar en dominada o muscle-up','La explosividad del salto ayuda al movimiento de tracción',NULL),
(eid,'Lache (balanceo + vuelo en barra)','potencia','espalda','hombros,core','potencia','avanzado','calistenia','Balanceo en la barra, soltar y volver a agarrar','La progresión hacia gestos de acrobacia en barra',NULL),

-- ============================================================
-- DEPORTES Y ACTIVIDADES
-- ============================================================
(eid,'Volleyball spike jump (salto de remate voley)','potencia','cuadriceps','hombros,gluteos','potencia','avanzado','exterior','Salto con approach de voley + brazo de remate','Pasos: izquierda-derecha-izquierda (para diestros), luego salto',NULL),
(eid,'Basketball layup (bandeja baloncesto)','agilidad','cuadriceps','gluteos,hombros','agilidad','intermedio','exterior','Zancada + salto + elevación del brazo de bandeja','Coordination del pie derecho-mano derecha (diestros)',NULL),
(eid,'Tennis forehand rotation (rotación de derecha tenis)','potencia','core','hombros,oblicuos','potencia','principiante','exterior','Rotación de cadera y torso del golpe de derecha en tenis','La potencia viene de la rotación desde el pie de atrás',NULL),
(eid,'Swimming pull drill (tracción de natación)','traccion_horizontal','espalda','hombros,core','cardio','principiante','exterior','Tracción del brazo en natación usando pull buoy entre las piernas','Enfoca toda la energía en el movimiento del brazo',NULL),
(eid,'Soccer kick prep (preparación de chute fútbol)','potencia','cuadriceps','isquiotibiales,gluteos','potencia','principiante','exterior','Sentadilla + extensión de rodilla para el movimiento de chute','La rodilla de apoyo ligeramente doblada mejora la precisión',NULL),
(eid,'Rugby tackle position (posición de placaje rugby)','estabilizacion','cuadriceps','core,espalda','fuerza','intermedio','exterior','Posición baja de placaje con caderas bajas y espalda recta','Cadera más baja que el oponente da ventaja mecánica',NULL),
(eid,'Martial arts guard (guardia de artes marciales)','estabilizacion','cuadriceps','core,hombros','fuerza','principiante','exterior','Mantener la posición de guardia con el peso en la punta de los pies','Los pesos distribuidos: 60% pierna trasera, 40% delantera',NULL),

-- ============================================================
-- PILATES Y YOGA — ADICIONALES
-- ============================================================
(eid,'Pilates roll-up (incorporación pilates)','aislamiento','core','flexores_cadera','movilidad','principiante','casa','Tumbado, llevar los brazos por encima e incorporarse articulando la columna','La columna se pliega vértebra a vértebra, muy lento',NULL),
(eid,'Pilates teaser (teaser pilates)','estabilizacion','core','flexores_cadera','fuerza','avanzado','casa','Elevar simultáneamente piernas y torso hasta los 45° y bajar','El equilibrio se mantiene solo con los isquiones',NULL),
(eid,'Pilates swan (cisne pilates)','movilidad','espalda_baja','pecho','movilidad','principiante','casa','Extensión controlada del torso en posición prona','Las manos empujan el suelo para facilitar la extensión',NULL),
(eid,'Pilates side kick series (patadas laterales)','aislamiento','abductores','gluteos,core','fuerza','principiante','casa','Serie de movimientos de pierna lateral tumbado de lado','La pelvis no se mueve, solo la pierna trabaja',NULL),
(eid,'Yoga warrior I (guerrero I)','movilidad','cuadriceps','gluteos,hombros','movilidad','principiante','casa','Postura de guerrero con los brazos elevados','La cadera del lado trasero apunta hacia adelante',NULL),
(eid,'Yoga warrior II (guerrero II)','movilidad','cuadriceps','abductores,hombros','movilidad','principiante','casa','Postura de guerrero con los brazos extendidos lateralmente','La cadera del lado trasero apunta hacia el lado',NULL),
(eid,'Yoga warrior III (guerrero III)','estabilizacion','cuadriceps','gluteos,core,hombros','fuerza','intermedio','casa','Postura de guerrero con el torso horizontal y una pierna elevada','El equilibrio sobre una pierna, el cuerpo en T',NULL),
(eid,'Yoga chair pose (silla)','sentadilla','cuadriceps','gluteos,espalda','movilidad','principiante','casa','Sentadilla con los brazos elevados y el torso inclinado','Las rodillas juntas, el peso en los talones',NULL),
(eid,'Yoga boat pose (barca)','estabilizacion','core','flexores_cadera','fuerza','intermedio','casa','Posición de V con el torso y las piernas elevadas','Mantén la columna alargada, no te redondees',NULL),
(eid,'Yoga bridge pose (puente)','bisagra_cadera','gluteos','isquiotibiales,pecho','movilidad','principiante','casa','Puente de glúteos en yoga, énfasis en la apertura del pecho','Los hombros en el suelo, las caderas en alto',NULL),
(eid,'Yoga pigeon pose (paloma)','movilidad','gluteos','flexores_cadera','movilidad','principiante','casa','Estiramiento profundo del piriforme y flexor de cadera','Mantén 30-60 segundos, respira profundo',NULL),
(eid,'Yoga downward dog (perro hacia abajo)','movilidad','isquiotibiales','hombros,pantorrilla','movilidad','principiante','casa','Posición invertida en V, estira toda la cadena posterior','Talones al suelo, caderas al cielo, brazos rectos',NULL),
(eid,'Yoga upward dog (perro hacia arriba)','movilidad','espalda_baja','pecho,hombros','movilidad','principiante','casa','Extensión completa de la columna en posición de cobra elevada','Solo las manos y los pies tocan el suelo',NULL),
(eid,'Yoga triangle pose (triángulo)','movilidad','aductores','isquiotibiales,hombros','movilidad','principiante','casa','Estiramiento lateral con las piernas abiertas','La cadera del lado elevado apunta hacia el techo',NULL),
(eid,'Yoga half moon (media luna)','estabilizacion','gluteos','hombros,isquiotibiales','movilidad','intermedio','casa','Equilibrio sobre una pierna con el torso lateral','La mano en el suelo es solo un punto de referencia',NULL),
(eid,'Sun salutation A (saludo al sol A)','full_body','full_body','full_body','movilidad','principiante','casa','Secuencia dinámica de posturas de yoga enlazadas','Sincroniza cada movimiento con la inspiración o espiración',NULL),

-- ============================================================
-- ENTRENAMIENTO MULTIPLANAR
-- ============================================================
(eid,'Lateral squat with reach (sentadilla lateral + alcance)','sentadilla','cuadriceps','abductores,core','fuerza','intermedio','casa','Sentadilla lateral con extensión del brazo opuesto hacia el suelo','El brazo que se extiende añade un componente de rotación',NULL),
(eid,'Transverse lunge (zancada transversal)','sentadilla','gluteos','cuadriceps,abductores','fuerza','intermedio','casa','Zancada en el plano transversal, a 45° hacia atrás','El pie gira hacia afuera en el aterrizaje',NULL),
(eid,'360 degree lunge matrix (matriz de zancadas 360°)','sentadilla','cuadriceps','gluteos,abductores','fuerza','intermedio','casa','Zancada en 8 direcciones diferentes','Desarrolla la fuerza multiplanar de la pierna',NULL),
(eid,'Multi-directional hip reach','movilidad','gluteos','isquiotibiales,abductores','movilidad','principiante','casa','Equilibrio unilateral con alcance de la pierna libre en varias direcciones','Activa los estabilizadores de cadera y tobillo',NULL),
(eid,'Chop and lift (hacha y elevación)','rotacion','core','hombros,oblicuos','fuerza','intermedio','gimnasio','Diagonal de cable de arriba abajo (chop) y de abajo arriba (lift)','La fuerza viene de la rotación de cadera y torso',NULL),

-- ============================================================
-- FUNCIONAL PARA NIÑOS Y ADOLESCENTES
-- ============================================================
(eid,'Animal movement medley (movimientos de animales)','full_body','full_body','core,hombros,cuadriceps','fuerza','principiante','casa','Serie de movimientos: cangrejo, oso, lagarto, conejo','Excelente coordinación y fuerza relativa para jóvenes',NULL),
(eid,'Crab walk (cangrejo)','full_body','triceps','core,hombros,cuadriceps','fuerza','principiante','casa','Caminata en cuatro apoyos hacia atrás boca arriba','Caderas altas, brazos y piernas coordinados',NULL),
(eid,'Frog jumps (saltos de rana)','potencia','cuadriceps','gluteos,core','potencia','principiante','casa','Cuclillas profundas seguidas de salto vertical máximo','Manos al suelo entre saltos, movimiento de rana',NULL),
(eid,'Seal crawl (foca)','estabilizacion','hombros','core,pecho','fuerza','principiante','casa','Plancha de manos que se arrastra sin doblar las rodillas','Fortalece hombros y core de forma divertida',NULL),
(eid,'Bunny hops (saltos de conejo)','potencia','cuadriceps','pantorrilla,gluteos','potencia','principiante','casa','Saltos hacia adelante con los pies juntos','El movimiento viene del tobillo y la rodilla',NULL),

-- ============================================================
-- MINDFULNESS Y TÉCNICAS DE RESPIRACIÓN
-- ============================================================
(eid,'Box breathing (respiración cuadrada)','movilidad','full_body','core','movilidad','principiante','casa','4 segundos inhala, 4 sostén, 4 exhala, 4 sostén','Activa el sistema parasimpático, reduce el cortisol',NULL),
(eid,'Diaphragmatic breathing (respiración diafragmática)','movilidad','core','full_body','movilidad','principiante','casa','Respiración que expande el abdomen, no el pecho','Mano en el abdomen para verificar la expansión correcta',NULL),
(eid,'Wim Hof breathing adaptation (respiración hiperventilación)','cardio','full_body','core','movilidad','avanzado','casa','Respiraciones rápidas seguidas de apnea controlada','Solo en posición segura, nunca en agua, siempre con guía',NULL),

-- ============================================================
-- EJERCICIOS DE POTENCIA CON BARRA
-- ============================================================
(eid,'Power clean from hang (clean desde colgado)','olimpico','full_body','cuadriceps,hombros,espalda','potencia','avanzado','gimnasio','Power clean arrancando desde la posición de muslo','La extensión de triple articulación es la clave',NULL),
(eid,'Power snatch from hang (arrancada de potencia)','olimpico','full_body','hombros,cuadriceps,espalda','potencia','avanzado','gimnasio','Power snatch desde colgado para mayor accesibilidad técnica','La movilidad de hombro es el mayor limitante',NULL),
(eid,'Barbell push press (press con impulso)','empuje_vertical','hombros','cuadriceps,triceps','potencia','intermedio','gimnasio','Press de hombro con impulso de piernas para mayor carga','El impulso de piernas permite mover más peso que el press estricto',NULL),
(eid,'Behind the neck push press (press detrás con impulso)','empuje_vertical','hombros','cuadriceps,triceps','potencia','avanzado','gimnasio','Push press con la barra pasando por detrás','Solo para atletas con movilidad excepcional de hombro',NULL),
(eid,'Barbell complex (complejo de barra)','full_body','full_body','cuadriceps,espalda,hombros','cardio','avanzado','gimnasio','Serie de movimientos encadenados con la barra sin soltarla','Ej: remo + power clean + front squat + push press x5 sin soltar',NULL),
(eid,'Snatch grip deadlift (peso muerto agarre arrancada)','bisagra_cadera','isquiotibiales','espalda,gluteos','fuerza','avanzado','gimnasio','Peso muerto con el agarre muy abierto de la arrancada','El agarre ancho obliga a comenzar más bajo y activa más la espalda',NULL),
(eid,'Clean grip deadlift (peso muerto agarre clean)','bisagra_cadera','isquiotibiales','espalda,gluteos','fuerza','avanzado','gimnasio','Peso muerto con el agarre del clean, más estrecho que el convencional','Desarrolla la posición de inicio del clean',NULL),

-- ============================================================
-- EJERCICIOS DE ALTA FRECUENCIA Y RECUPERACIÓN
-- ============================================================
(eid,'Contrast bath (baño de contraste)','movilidad','full_body','full_body','movilidad','principiante','exterior','Alternancia de frío y calor para la recuperación muscular','2-3 minutos caliente, 1 minuto frío, repite 3-4 veces',NULL),
(eid,'Active recovery walk (caminata de recuperación)','cardio','full_body','full_body','movilidad','principiante','exterior','Caminata suave de 20-30 minutos al día siguiente de entreno duro','La FC debe mantenerse por debajo del 50% del máximo',NULL),
(eid,'Compression exercises (compresión-descompresión)','movilidad','full_body','core','movilidad','principiante','casa','Movimientos de compresión articular para la movilización sinovial','Ej: rocking de rodillas, chin to chest, hip scoops',NULL),
(eid,'Joint circles warm-up (círculos articulares)','movilidad','full_body','full_body','movilidad','principiante','casa','Calentamiento progresivo de todas las articulaciones','Tobillos, rodillas, caderas, columna, hombros, muñecas',NULL),
(eid,'Passive recovery stretching (estiramiento pasivo)','movilidad','full_body','full_body','movilidad','principiante','casa','Estiramiento pasivo de 30-60 segundos por músculo','Después del entreno cuando el músculo está caliente',NULL),

-- ============================================================
-- EJERCICIOS CON BOSU
-- ============================================================
(eid,'Bosu squat (sentadilla en bosu)','sentadilla','cuadriceps','gluteos,tobillo','fuerza','intermedio','gimnasio','Sentadilla sobre la parte plana del BOSU hacia arriba','La inestabilidad activa los estabilizadores del tobillo',NULL),
(eid,'Bosu push-up (flexión en bosu)','empuje_horizontal','pecho','triceps,core','fuerza','intermedio','gimnasio','Flexión con manos en el domo del BOSU (parte redondeada)','Mayor activación del core que la flexión estándar',NULL),
(eid,'Bosu plank (plancha en bosu)','estabilizacion','core','hombros','fuerza','intermedio','gimnasio','Plancha con los antebrazos sobre el domo del BOSU','El BOSU aumenta la demanda de estabilización del core',NULL),
(eid,'Bosu balance (equilibrio en bosu)','estabilizacion','tobillo','cuadriceps,core','fuerza','principiante','gimnasio','Equilibrio estático sobre el domo del BOSU','Empieza con dos pies, progresa a una sola pierna',NULL),
(eid,'Bosu single leg squat (sentadilla unilateral en bosu)','sentadilla','cuadriceps','gluteos,tobillo,core','fuerza','avanzado','gimnasio','Sentadilla unilateral sobre el BOSU','Combina la dificultad del BOSU con la demanda unilateral',NULL),

-- ============================================================
-- REMO EN MÁQUINA ADICIONALES
-- ============================================================
(eid,'Wide grip lat pulldown (jalón agarre ancho)','traccion_vertical','espalda','biceps,romboides','hipertrofia','principiante','gimnasio','Jalón al pecho con agarre muy ancho','Mayor activación del dorsal en la porción externa',NULL),
(eid,'Reverse grip lat pulldown (jalón agarre supino)','traccion_vertical','espalda','biceps','hipertrofia','principiante','gimnasio','Jalón con agarre supino, mayor activación del bíceps','El agarre supino también activa más la porción inferior del dorsal',NULL),
(eid,'Single arm cable row (remo unilateral en cable)','traccion_horizontal','espalda','biceps,oblicuos','fuerza','intermedio','gimnasio','Remo con un solo brazo en cable con rotación del torso','La rotación del torso al remar activa el core de forma adicional',NULL),
(eid,'High cable row (remo de cable alto)','traccion_horizontal','espalda','deltoides_posterior,romboides','hipertrofia','intermedio','gimnasio','Remo desde la polea alta, tirando hacia la cara','Similar al face pull pero con diferente accesorio',NULL),
(eid,'Low to mid cable row (remo bajo a medio)','traccion_horizontal','espalda','biceps,romboides','hipertrofia','principiante','gimnasio','Remo desde la polea baja tirando hacia el abdomen','La posición baja trabaja más la porción inferior del dorsal',NULL),

-- ============================================================
-- SENTADILLA — VARIACIONES OLIMPICAS Y POWERLIFTING
-- ============================================================
(eid,'Hatfield squat (sentadilla Hatfield)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','avanzado','gimnasio','Sentadilla con los brazos apoyados en un soporte para mayor fuerza de piernas','Los brazos en el soporte permiten mayor carga y profundidad',NULL),
(eid,'Tempo squat 3-1-1 (sentadilla con tempo)','sentadilla','cuadriceps','gluteos','hipertrofia','intermedio','gimnasio','Sentadilla con 3 segundos en la bajada, 1 pausa abajo, 1 arriba','El tempo aumenta el TUT (tiempo bajo tensión)',NULL),
(eid,'1.5 rep squat (sentadilla 1.5 rep)','sentadilla','cuadriceps','gluteos','hipertrofia','avanzado','gimnasio','Baja, sube a la mitad, vuelve abajo, sube completo = 1 rep','El doble trabajo en la posición baja es muy demandante',NULL),
(eid,'Hatfield 1.5 rep squat','sentadilla','cuadriceps','gluteos','hipertrofia','avanzado','gimnasio','Combinación de la técnica Hatfield con el 1.5 rep','Máxima intensidad de cuádriceps y glúteo',NULL),
(eid,'Pre-exhaust squat (sentadilla con pre-fatiga)','sentadilla','cuadriceps','gluteos','hipertrofia','avanzado','gimnasio','Extensión de cuádriceps seguida inmediatamente de sentadilla','La pre-fatiga fuerza al músculo a trabajar más en la sentadilla',NULL),

-- ============================================================
-- TRABAJO DE ESTABILIDAD ESCAPULAR
-- ============================================================
(eid,'Serratus wall slides (deslizamiento en pared)','aislamiento','hombros','serratos','fuerza','principiante','casa','Deslizar los antebrazos por la pared hacia arriba activando el serrato','El serrato anterior es crucial para la salud del hombro',NULL),
(eid,'Push-up plus (flexión + protraccción)','empuje_horizontal','pecho','serratos,triceps','fuerza','principiante','casa','Al final de la flexión, empuja más separando los hombros','La protracción final activa el serrato anterior',NULL),
(eid,'Scapular wall angels (ángeles en pared)','movilidad','hombros','trapecio,romboides','movilidad','principiante','casa','Deslizar los brazos hacia arriba pegados a la pared en posición de ángel','La zona lumbar y la cabeza pegadas a la pared en todo momento',NULL),
(eid,'Thoracic mobility drill with stick (movilidad torácica con palo)','movilidad','espalda_alta','hombros','movilidad','principiante','casa','Rotaciones torácicas con un palo sujeto detrás de los hombros','El palo te dice si estás compensando con la lumbar',NULL),
(eid,'Wall slide with band (deslizamiento con banda)','aislamiento','hombros','serratos,romboides','fuerza','principiante','gimnasio','Deslizamiento en pared con banda de resistencia entre las manos','La banda exige mantener la tensión durante todo el movimiento',NULL),

-- ============================================================
-- EJERCICIOS ADICIONALES VARIOS
-- ============================================================
(eid,'Bent over lateral raise (pájaro inclinado)','aislamiento','hombros','romboides,trapecio','hipertrofia','principiante','gimnasio','Elevación lateral con el torso inclinado para el deltoides posterior','El torso a 45°, los codos ligeramente flexionados',NULL),
(eid,'Lying cable curl (curl en cable tumbado)','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl de bíceps tumbado en banco bajo una polea baja','La posición tumbada alarga el bíceps en la posición inicial',NULL),
(eid,'Kneeling cable curl (curl en cable arrodillado)','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl de bíceps arrodillado frente a la polea alta','Diferente ángulo de tensión que el curl de pie',NULL),
(eid,'Behind the back cable curl (curl cable detrás)','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl con el cable anclado detrás del cuerpo','Mayor tensión en la posición final del curl',NULL),
(eid,'Pushdown with straight bar (extensión barra recta)','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Extensión de tríceps con la barra recta en cable','Permite mayor peso que la cuerda o la barra V',NULL),
(eid,'Triceps overhead cable extension (extensión overhead en cable)','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Extensión de tríceps sobre la cabeza en cable con cuerda','La posición overhead alarga el tríceps para mayor ROM',NULL),
(eid,'Cable crossover low to high (apertura baja a alta)','aislamiento','pecho','deltoides_anterior','hipertrofia','intermedio','gimnasio','Apertura en cable desde abajo hacia arriba','Activa la porción superior del pectoral',NULL),
(eid,'Cable crossover high to low (apertura alta a baja)','aislamiento','pecho','pecho_inferior','hipertrofia','intermedio','gimnasio','Apertura en cable desde arriba hacia abajo','Activa la porción inferior del pectoral',NULL),
(eid,'Incline cable fly (apertura inclinada en cable)','aislamiento','pecho','deltoides_anterior','hipertrofia','intermedio','gimnasio','Apertura de pecho en banco inclinado con cables bajos','El ángulo del banco determina la porción del pecho activada',NULL),
(eid,'Pec deck (máquina de pecho)','aislamiento','pecho','deltoides_anterior','hipertrofia','principiante','gimnasio','Apertura de pecho en máquina pec deck','No vayas tan atrás que sientas tracción en el bíceps',NULL),
(eid,'Chest supported row machine (remo en máquina con apoyo)','traccion_horizontal','espalda','biceps,romboides','hipertrofia','principiante','gimnasio','Remo en máquina con el pecho apoyado, elimina el impulso del cuerpo','El apoyo del pecho aísla completamente la espalda',NULL),
(eid,'Seated cable shoulder press (press en cable sentado)','empuje_vertical','hombros','triceps','fuerza','intermedio','gimnasio','Press de hombros sentado con dos cables','Mayor rango de movimiento que las mancuernas',NULL),
(eid,'Arnold press alternate (Arnold alterno)','empuje_vertical','hombros','triceps,romboides','hipertrofia','intermedio','gimnasio','Arnold press alternando un brazo de cada vez','Permite mayor rotación y range of motion',NULL),
(eid,'Hammer to press (martillo a press)','full_body','biceps','hombros,triceps','fuerza','principiante','gimnasio','Curl martillo que sube hasta press overhead','Trabaja el bíceps en la subida y el hombro en el press',NULL),
(eid,'Renegade row (remo renegado)','traccion_horizontal','espalda','core,triceps','fuerza','avanzado','gimnasio','Plancha con mancuernas, remar alternando cada brazo','El cuerpo no debe rotar durante el remo, anti-rotación pura',NULL),
(eid,'Gorilla row (remo gorila)','traccion_horizontal','espalda','biceps,core','fuerza','intermedio','gimnasio','Remo con mancuernas en posición de bisagra profunda, alternando brazos','El brazo libre descansa en el suelo entre reps',NULL),
(eid,'Single leg Romanian deadlift with row','bisagra_cadera','isquiotibiales','espalda,gluteos,biceps','fuerza','avanzado','gimnasio','RDL unilateral + remo de mancuerna en la posición baja','Movimiento combinado de alta demanda técnica y funcional',NULL);

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
RAISE NOTICE 'Parte 3 insertada correctamente.';

END $$;
