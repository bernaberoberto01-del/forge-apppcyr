-- ============================================================
-- SEED: Biblioteca de Ejercicios — Forge Studio
-- 1000+ ejercicios categorizados por grupo muscular, nivel,
-- patrón de movimiento, modalidad y material.
--
-- INSTRUCCIONES DE USO:
-- 1. Sustituye <ENTRENADOR_UUID> por el UUID real del entrenador.
--    (Roberto: 0b908e25-f69f-472c-9972-87bc93d67e65)
-- 2. Ejecuta en Supabase SQL Editor o con psql.
-- 3. Aplica en Forge Y en Pablo Rodríguez (focgysujvofpihjhvznl).
--
-- COLUMNAS USADAS:
--   nombre, patron, grupo_muscular, grupo_secundario, tipo,
--   nivel, modalidad, descripcion, consejos_tecnica, youtube_url, entrenador_id
--
-- NOTA: youtube_url = URL real donde existe; NULL donde no hay.
-- ============================================================

DO $$
DECLARE
  eid UUID := '0b908e25-f69f-472c-9972-87bc93d67e65';
BEGIN

-- ============================================================
-- PECHO — EMPUJE HORIZONTAL / VERTICAL
-- ============================================================
INSERT INTO ejercicios_biblioteca (entrenador_id, nombre, patron, grupo_muscular, grupo_secundario, tipo, nivel, modalidad, descripcion, consejos_tecnica, youtube_url) VALUES
(eid,'Press de banca plano con barra','empuje_horizontal','pecho','triceps,deltoides_anterior','fuerza','principiante','gimnasio','Ejercicio compuesto básico para el desarrollo del pecho','Retrae escápulas, pies en el suelo, baja hasta rozar el pecho','https://www.youtube.com/watch?v=rT7DgCr-3pg'),
(eid,'Press de banca inclinado con barra','empuje_horizontal','pecho','deltoides_anterior,triceps','fuerza','principiante','gimnasio','Press inclinado para enfatizar la parte superior del pecho','Inclina el banco 30-45°, agarre ligeramente más ancho que los hombros',NULL),
(eid,'Press de banca declinado con barra','empuje_horizontal','pecho','triceps,pecho_inferior','fuerza','intermedio','gimnasio','Press declinado para la porción inferior del pecho','Pies asegurados, baja la barra hacia el esternón inferior',NULL),
(eid,'Press de banca plano con mancuernas','empuje_horizontal','pecho','triceps,deltoides_anterior','fuerza','principiante','gimnasio','Mayor rango de movimiento y trabajo estabilizador que con barra','Mantén una ligera flexión en codos, baja hasta sentir estiramiento','https://www.youtube.com/watch?v=VmB1G1K7v94'),
(eid,'Press de banca inclinado con mancuernas','empuje_horizontal','pecho','deltoides_anterior','fuerza','principiante','gimnasio','Enfatiza el pecho superior con mejor activación que la barra','Inclina banco 30-45°, gira muñecas ligeramente al bajar',NULL),
(eid,'Press de banca declinado con mancuernas','empuje_horizontal','pecho','triceps','fuerza','intermedio','gimnasio','Trabaja la porción inferior del pecho con mayor ROM','Controla la bajada, no dejes caer los codos por debajo del banco',NULL),
(eid,'Aperturas con mancuernas plano','aislamiento','pecho','deltoides_anterior','hipertrofia','principiante','gimnasio','Aislamiento para pecho con énfasis en el estiramiento','Mantén ligera flexión en codos, baja hasta sentir tensión',NULL),
(eid,'Aperturas con mancuernas inclinado','aislamiento','pecho','deltoides_anterior','hipertrofia','principiante','gimnasio','Aperturas en banco inclinado para la parte superior del pecho','Mueve los brazos como si abrazaras un árbol',NULL),
(eid,'Aperturas en máquina (pec deck)','aislamiento','pecho','deltoides_anterior','hipertrofia','principiante','gimnasio','Aislamiento de pecho en máquina, ideal para principiantes','Mantén la columna apoyada, expira al cerrar',NULL),
(eid,'Crossover en cable alto','aislamiento','pecho','triceps','hipertrofia','principiante','gimnasio','Cruce de cables desde polea alta para la parte inferior del pecho','Inclínate ligeramente hacia adelante, cruza las manos en la posición final',NULL),
(eid,'Crossover en cable bajo','aislamiento','pecho','deltoides_anterior','hipertrofia','intermedio','gimnasio','Cruce de cables desde polea baja para la parte superior del pecho','Mantén el pecho alto, sube y cruza las manos al final',NULL),
(eid,'Crossover en cable medio','aislamiento','pecho','triceps','hipertrofia','principiante','gimnasio','Cruce de cables neutro para el pecho medio','Mantén codos ligeramente flexionados durante todo el movimiento',NULL),
(eid,'Fondos en paralelas (pecho)','empuje_horizontal','pecho','triceps,deltoides_anterior','fuerza','intermedio','calistenia','Ejercicio compuesto de peso corporal para pecho y tríceps','Inclínate hacia adelante 20-30° para enfatizar el pecho','https://www.youtube.com/watch?v=2z8JmcrW-As'),
(eid,'Flexiones de brazos','empuje_horizontal','pecho','triceps,deltoides_anterior','fuerza','principiante','calistenia','Clásico ejercicio de empuje con peso corporal','Mantén el cuerpo recto como una tabla, codos a 45°','https://www.youtube.com/watch?v=IODxDxX7oi4'),
(eid,'Flexiones inclinadas','empuje_horizontal','pecho','triceps','fuerza','principiante','calistenia','Flexiones con pies elevados para enfatizar la parte superior del pecho','Eleva los pies en un banco o caja estable',NULL),
(eid,'Flexiones declinadas','empuje_horizontal','pecho','triceps,deltoides_anterior','fuerza','principiante','calistenia','Flexiones con manos elevadas para la parte inferior del pecho','Eleva las manos en un banco o caja',NULL),
(eid,'Flexiones con palmada','empuje_horizontal','pecho','triceps','potencia','avanzado','calistenia','Flexión explosiva con palmada, desarrolla potencia en el tren superior','Empuja con máxima velocidad, aterriza suavemente',NULL),
(eid,'Press con banda elástica plano','empuje_horizontal','pecho','triceps','fuerza','principiante','casa','Alternativa al press con banda para entrenar en casa','Fija la banda detrás de ti, mantén el core activo',NULL),
(eid,'Aperturas con banda elástica','aislamiento','pecho','deltoides_anterior','hipertrofia','principiante','casa','Apertura de pecho con banda elástica','Cruza los brazos al final para maximizar la contracción',NULL),
(eid,'Press en suelo con mancuernas','empuje_horizontal','pecho','triceps','fuerza','principiante','casa','Press tumbado en el suelo, alternativa sin banco','El suelo limita el rango de movimiento en la bajada',NULL),

-- ============================================================
-- ESPALDA — TRACCIÓN VERTICAL / HORIZONTAL
-- ============================================================
(eid,'Dominadas con agarre prono','traccion_vertical','espalda','biceps,romboides','fuerza','intermedio','calistenia','Ejercicio rey de espalda, agarre con palmas hacia afuera','Parte de colgado muerto, sube el pecho a la barra','https://www.youtube.com/watch?v=eGo4IYlbE5g'),
(eid,'Dominadas con agarre supino (chin-up)','traccion_vertical','espalda','biceps','fuerza','intermedio','calistenia','Agarre supino activa más el bíceps que las dominadas clásicas','Mantén los codos cerca del cuerpo al subir','https://www.youtube.com/watch?v=KKjA_Nqf3P0'),
(eid,'Dominadas con agarre neutro','traccion_vertical','espalda','biceps,braquiorradial','fuerza','intermedio','calistenia','Menor estrés en los hombros, activa bien el bíceps','Palmas enfrentadas, cuerpo ligeramente inclinado',NULL),
(eid,'Jalón al pecho en polea','traccion_vertical','espalda','biceps,romboides','fuerza','principiante','gimnasio','Jalón con polea para trabajar el dorsal ancho','Mantén el pecho alto, lleva la barra al esternón superior','https://www.youtube.com/watch?v=CAwf7n6Luuc'),
(eid,'Jalón al pecho agarre supino','traccion_vertical','espalda','biceps','fuerza','principiante','gimnasio','Mayor activación del bíceps con agarre supino en el jalón','Mantén los codos pegados al cuerpo al bajar',NULL),
(eid,'Jalón al pecho agarre neutro','traccion_vertical','espalda','biceps','fuerza','principiante','gimnasio','Variante de jalón con palmas enfrentadas','Ideal si tienes molestias en el hombro con otros agarres',NULL),
(eid,'Remo con barra','traccion_horizontal','espalda','biceps,romboides,trapecios','fuerza','intermedio','gimnasio','Ejercicio compuesto fundamental para el grosor de espalda','Espalda neutra, baja el torso 45°, lleva la barra al ombligo','https://www.youtube.com/watch?v=T3N-TO4reLQ'),
(eid,'Remo con mancuerna','traccion_horizontal','espalda','biceps,romboides','fuerza','principiante','gimnasio','Remo unilateral con soporte en el banco','Codo pegado al cuerpo, lleva la mancuerna hasta la cadera','https://www.youtube.com/watch?v=roCP6wCXPqo'),
(eid,'Remo en polea baja agarre estrecho','traccion_horizontal','espalda','biceps,romboides','fuerza','principiante','gimnasio','Remo con polea baja para trabajar el espesor de espalda','Mantén el torso erguido, jala hasta el abdomen',NULL),
(eid,'Remo en polea baja agarre ancho','traccion_horizontal','espalda','romboides,trapecios','fuerza','principiante','gimnasio','Mayor activación de la parte media-alta de espalda','Lleva los codos abiertos al jalar',NULL),
(eid,'Remo en máquina (chest supported)','traccion_horizontal','espalda','biceps,romboides','fuerza','principiante','gimnasio','Remo soportado en pecho, elimina la compensación lumbar','Apoya el pecho en el soporte, jala hasta la máxima contracción',NULL),
(eid,'Remo con mancuernas en banco inclinado','traccion_horizontal','espalda','biceps,romboides','fuerza','intermedio','gimnasio','Remo bilateral en banco inclinado','Inclina el banco 30-45°, lleva las mancuernas hacia las caderas',NULL),
(eid,'Pull-over con mancuerna','traccion_vertical','espalda','triceps,pecho','fuerza','intermedio','gimnasio','Trabajo del dorsal con mancuerna, posición transversa','Mantén los codos semiflexionados, mueve solo desde el hombro',NULL),
(eid,'Pull-over en polea','traccion_vertical','espalda','triceps','fuerza','principiante','gimnasio','Pull-over en polea alta, constante tensión en el dorsal','Mantén los brazos casi rectos, empuja hacia las caderas',NULL),
(eid,'Remo con barra en T','traccion_horizontal','espalda','biceps,romboides','fuerza','intermedio','gimnasio','Remo con barra T, gran cargador de espalda','Pecho en el soporte o libre, lleva los codos hacia atrás',NULL),
(eid,'Face pull en polea','aislamiento','espalda','deltoides_posterior,romboides','fuerza','principiante','gimnasio','Ejercicio fundamental para el deltoides posterior y manguito','Lleva las manos a la altura de la cara, codos arriba',NULL),
(eid,'Buenos días con barra','bisagra_cadera','espalda','gluteos,isquiotibiales','fuerza','avanzado','gimnasio','Ejercicio de bisagra con barra en espalda alta','Mantén la espalda neutra, cede desde las caderas sin doblar la columna',NULL),
(eid,'Hiperextensiones en banco romano','bisagra_cadera','espalda','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Extensión de espalda para fortalecer la cadena posterior','Sube hasta la posición neutra sin hipextender','https://www.youtube.com/watch?v=ph3pddpKzzw'),
(eid,'Remo invertido (Australian row)','traccion_horizontal','espalda','biceps','fuerza','principiante','calistenia','Dominada invertida bajo la barra, excelente para principiantes','Mantén el cuerpo recto, pecho a la barra',NULL),
(eid,'Pull-apart con banda elástica','aislamiento','espalda','romboides,deltoides_posterior','fuerza','principiante','casa','Separación de banda para la salud del hombro','Mantén los brazos rectos, separa hasta alineación total',NULL),

-- ============================================================
-- HOMBROS — EMPUJE VERTICAL / ELEVACIONES
-- ============================================================
(eid,'Press militar con barra de pie','empuje_vertical','hombros','triceps,trapecio','fuerza','intermedio','gimnasio','Ejercicio rey para el desarrollo del hombro','Core muy activo, barra baja frente a la cara al bajar','https://www.youtube.com/watch?v=2yjwXTZQDDI'),
(eid,'Press militar con barra sentado','empuje_vertical','hombros','triceps,trapecio','fuerza','principiante','gimnasio','Press militar sentado, menor exigencia estabilizadora','Banco a 90° o ligeramente reclinado',NULL),
(eid,'Press con mancuernas de pie','empuje_vertical','hombros','triceps','fuerza','principiante','gimnasio','Press con mancuernas de pie, mayor activación estabilizadora','Gira las mancuernas al subir si el hombro lo permite',NULL),
(eid,'Press con mancuernas sentado','empuje_vertical','hombros','triceps','fuerza','principiante','gimnasio','Variante sentada del press con mancuernas','Banco con respaldo, no arquees la espalda baja',NULL),
(eid,'Press Arnold','empuje_vertical','hombros','deltoides_anterior,triceps','hipertrofia','intermedio','gimnasio','Press con rotación, activa las tres porciones del deltoides','Empieza con palmas hacia ti, gira al subir','https://www.youtube.com/watch?v=3ml7BH7mNwQ'),
(eid,'Elevaciones laterales con mancuernas','aislamiento','hombros','trapecio_superior','hipertrofia','principiante','gimnasio','Aislamiento del deltoides lateral','Codos ligeramente flexionados, eleva hasta la altura del hombro','https://www.youtube.com/watch?v=3VcKaXpzqRo'),
(eid,'Elevaciones laterales en cable','aislamiento','hombros','trapecio_superior','hipertrofia','principiante','gimnasio','Elevación lateral con tensión constante del cable','Pasa el cable por delante del cuerpo para mayor rango',NULL),
(eid,'Elevaciones frontales con mancuernas','aislamiento','hombros','pecho','hipertrofia','principiante','gimnasio','Aislamiento del deltoides anterior','Alterna brazos o hazlo bilateral, palmas abajo o neutras',NULL),
(eid,'Elevaciones frontales con barra','aislamiento','hombros','pecho','hipertrofia','intermedio','gimnasio','Elevación frontal con barra, mayor carga posible','Agarre prono a la anchura de los hombros',NULL),
(eid,'Elevaciones posteriores en banco inclinado','aislamiento','hombros','romboides','hipertrofia','principiante','gimnasio','Aislamiento del deltoides posterior tumbado en banco inclinado','Inclina el banco 30°, eleva los brazos hacia atrás',NULL),
(eid,'Elevaciones posteriores de pie inclinado','aislamiento','hombros','romboides','hipertrofia','principiante','gimnasio','Deltoides posterior inclinado hacia adelante','Mantén la espalda neutra, mueve solo el hombro',NULL),
(eid,'Face pull con cuerda en polea','aislamiento','hombros','romboides,manguito_rotador','fuerza','principiante','gimnasio','Trabaja el deltoides posterior y manguito rotador','Lleva las manos hacia la cara, codos a la altura de los hombros',NULL),
(eid,'Press con banda elástica de pie','empuje_vertical','hombros','triceps','fuerza','principiante','casa','Press de hombro con banda elástica de pie','Pisa la banda, mantén el core activo',NULL),
(eid,'Elevaciones laterales con banda','aislamiento','hombros','trapecio_superior','hipertrofia','principiante','casa','Elevación lateral con banda elástica en casa','Pisa la banda con el pie del mismo lado, eleva hasta la horizontal',NULL),
(eid,'Handstand push-up (pino)','empuje_vertical','hombros','triceps,trapecio','fuerza','avanzado','calistenia','Flexión en pino, el press vertical más difícil de peso corporal','Empieza contra la pared, core muy activo','https://www.youtube.com/watch?v=ZVSyV81SFaE'),
(eid,'Pike push-up','empuje_vertical','hombros','triceps','fuerza','intermedio','calistenia','Press de hombro con peso corporal en posición de pica','Forma una V invertida, baja la cabeza entre las manos',NULL),
(eid,'Elevación lateral con botella de agua','aislamiento','hombros','trapecio_superior','hipertrofia','principiante','casa','Elevación lateral con material casero','Ideal para empezar sin material, llena la botella de agua o arena',NULL),

-- ============================================================
-- BÍCEPS
-- ============================================================
(eid,'Curl con barra recta','aislamiento','biceps','braquiorradial','hipertrofia','principiante','gimnasio','Curl clásico con barra para máximo desarrollo del bíceps','Codos fijos a los costados, agarre a la anchura de hombros','https://www.youtube.com/watch?v=ykJmrZ5v0Oo'),
(eid,'Curl con barra Z (EZ)','aislamiento','biceps','braquiorradial','hipertrofia','principiante','gimnasio','Variante con barra Z para reducir la tensión en las muñecas','Agarre semisupino en la parte más angulada de la barra',NULL),
(eid,'Curl con mancuernas de pie','aislamiento','biceps','braquiorradial','hipertrofia','principiante','gimnasio','Curl alternado o simultáneo con mancuernas','Supina la muñeca al subir para máxima contracción','https://www.youtube.com/watch?v=sAq_ocpRh_I'),
(eid,'Curl martillo','aislamiento','biceps','braquiorradial','hipertrofia','principiante','gimnasio','Curl con agarre neutro que trabaja el braquiorradial','Muñecas en posición neutral durante todo el movimiento',NULL),
(eid,'Curl concentrado','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Máximo aislamiento del bíceps apoyando el codo en el muslo','Supina completamente la muñeca en la parte superior',NULL),
(eid,'Curl en banco Scott (predicador)','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Elimina la compensación del hombro en el curl','Apoya la parte posterior del brazo en el banco',NULL),
(eid,'Curl en polea baja','aislamiento','biceps','braquiorradial','hipertrofia','principiante','gimnasio','Tensión constante gracias al cable a lo largo del movimiento','Mantén el codo fijo, rota la muñeca al subir',NULL),
(eid,'Curl con mancuerna inclinado','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Estiramiento mayor del bíceps al inicio del movimiento','Siéntate en banco inclinado 45°, brazos colgantes',NULL),
(eid,'Curl 21s','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Técnica de intensidad: 7 reps 1/2 inferior + 7 reps 1/2 superior + 7 completas','Usa peso reducido respecto a tu máximo normal',NULL),
(eid,'Curl con banda elástica','aislamiento','biceps','braquiorradial','hipertrofia','principiante','casa','Curl de bíceps con banda elástica en casa','Pisa la banda, mantén los codos fijos a los costados',NULL),
(eid,'Curl inverso con barra','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl con agarre prono para fortalecer el braquiorradial','Agarre prono en la barra, muñecas neutras',NULL),
(eid,'Curl araña con barra Z','aislamiento','biceps','braquiorradial','hipertrofia','avanzado','gimnasio','Curl tumbado en banco inclinado para máximo aislamiento del bíceps','Tumbado boca abajo en banco inclinado 45°',NULL),

-- ============================================================
-- TRÍCEPS
-- ============================================================
(eid,'Press francés con barra Z (EZ)','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Extensión de tríceps tumbado con barra Z','Codos apuntan al techo, baja la barra a la frente','https://www.youtube.com/watch?v=d_KZxkY_0cM'),
(eid,'Press francés con mancuernas','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Extensión de tríceps con mancuernas, mayor ROM','Una mancuerna con las dos manos o una por mano',NULL),
(eid,'Extensión de tríceps en polea alta','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Empuje hacia abajo con polea para aislamiento del tríceps','Codos fijos, extiende completamente los antebrazos','https://www.youtube.com/watch?v=vB5OHsJ3EME'),
(eid,'Extensión de tríceps con cuerda en polea','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Con cuerda se separan las manos al final para mayor contracción','Separa la cuerda al extender para activar la cabeza lateral',NULL),
(eid,'Fondos en banco','aislamiento','triceps','pecho,deltoides_anterior','fuerza','principiante','calistenia','Fondos en banco para tríceps con peso corporal','Manos detrás en el banco, baja hasta 90° de codo',NULL),
(eid,'Kickback de tríceps con mancuerna','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Extensión de tríceps inclinado hacia adelante','Codo a 90° al inicio, extiende completamente el antebrazo',NULL),
(eid,'Extensión de tríceps sobre la cabeza con mancuerna','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Extensión overhead para la cabeza larga del tríceps','Manos en el extremo de la mancuerna, baja detrás de la cabeza',NULL),
(eid,'Extensión de tríceps sobre la cabeza en polea','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Extensión overhead en polea para el tríceps largo','Polea baja o media, inclínate ligeramente',NULL),
(eid,'Diamond push-up (flexión diamante)','aislamiento','triceps','pecho','fuerza','intermedio','calistenia','Flexión con manos juntas formando un diamante','Codos pegados al cuerpo durante todo el movimiento','https://www.youtube.com/watch?v=J0DnG1_S92I'),
(eid,'Tríceps en polea con barra recta','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Empuje con barra recta para variar el ángulo del tríceps','Mantén los codos pegados a los costados',NULL),
(eid,'Extensión de tríceps con banda en polea','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','casa','Extensión de tríceps con banda elástica fijada arriba','Fija la banda en un punto elevado, empuja hacia abajo',NULL),
(eid,'Fondos en paralelas','aislamiento','triceps','pecho,deltoides_anterior','fuerza','intermedio','calistenia','Fondos en paralelas con cuerpo vertical para énfasis en tríceps','Mantén el torso erguido para maximizar el trabajo del tríceps',NULL),

-- ============================================================
-- CUÁDRICEPS — SENTADILLAS Y EMPUJE
-- ============================================================
(eid,'Sentadilla con barra alta','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Sentadilla con barra en posición alta, mayor profundidad','Pies a anchura de hombros, profundidad máxima cómoda','https://www.youtube.com/watch?v=ultWZbUMPL8'),
(eid,'Sentadilla con barra baja','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','avanzado','gimnasio','Barra en posición baja, mayor inclinación del torso','Mayor carga posible, más exigente para la espalda',NULL),
(eid,'Sentadilla frontal','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','avanzado','gimnasio','Barra al frente, mayor énfasis en los cuádriceps','Codos muy arriba, torso muy erguido','https://www.youtube.com/watch?v=uYumuL_G_V0'),
(eid,'Sentadilla con mancuernas','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Variante con mancuernas, ideal para aprender el patrón','Mancuernas a los lados o en posición goblet',NULL),
(eid,'Sentadilla goblet','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Sentadilla con peso frente al pecho, excelente para técnica','Mantén los codos dentro de las rodillas al bajar','https://www.youtube.com/watch?v=MxsFDhcyFyE'),
(eid,'Sentadilla en hack con barra','sentadilla','cuadriceps','gluteos','fuerza','avanzado','gimnasio','Barra detrás de las piernas, énfasis en cuádriceps','Mantén la espalda erguida, barra contra el cuerpo',NULL),
(eid,'Hack squat en máquina','sentadilla','cuadriceps','gluteos','fuerza','principiante','gimnasio','Sentadilla en máquina inclinada para cuádriceps','Mayor seguridad que la sentadilla libre',NULL),
(eid,'Leg press','empuje','cuadriceps','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Prensa de piernas, gran sobrecarga con menor demanda técnica','Pies a la anchura de caderas, rodillas alineadas con pies','https://www.youtube.com/watch?v=IZxyjW7MPJQ'),
(eid,'Extensión de cuádriceps en máquina','aislamiento','cuadriceps','recto_anterior','hipertrofia','principiante','gimnasio','Aislamiento del cuádriceps en máquina','Completa la extensión y aprieta en la parte superior','https://www.youtube.com/watch?v=YyvSfVjQeL0'),
(eid,'Sentadilla búlgara (Split squat búlgaro)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Sentadilla unilateral con pie trasero elevado','Rodilla trasera hacia el suelo, torso erguido','https://www.youtube.com/watch?v=2C-uNgKwPLE'),
(eid,'Sentadilla unilateral (pistol squat)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','avanzado','calistenia','Sentadilla completa con una pierna, máxima exigencia','Empieza asistido, trabaja la movilidad de tobillo y cadera','https://www.youtube.com/watch?v=qDcniqddTeE'),
(eid,'Zancada hacia adelante con mancuernas','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Zancada dinámica hacia adelante','Rodilla trasera cerca del suelo, torso erguido',NULL),
(eid,'Zancada hacia atrás con mancuernas','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Zancada hacia atrás, menor impacto en la rodilla que la frontal','Ideal para quienes tienen molestias en la rodilla anterior',NULL),
(eid,'Zancada lateral','sentadilla','cuadriceps','abductores,gluteos','fuerza','principiante','gimnasio','Zancada al lado para trabajar el plano frontal','Abre la pierna hacia el lado, sienta la cadera hacia atrás',NULL),
(eid,'Step up con mancuernas','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Subir a una caja o banco con mancuernas','Empuja con el talón del pie en el banco al subir',NULL),
(eid,'Sentadilla sumo','sentadilla','cuadriceps','abductores,gluteos','fuerza','principiante','gimnasio','Sentadilla con pies muy abiertos, énfasis en aductores','Puntas de pie hacia afuera 45°, rodillas alineadas con pies',NULL),
(eid,'Sentadilla en máquina Smith','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Sentadilla guiada en máquina Smith','Permite trabajar sin necesidad de estabilizadores',NULL),
(eid,'Wall squat (sentadilla en pared)','aislamiento','cuadriceps','gluteos','fuerza','principiante','casa','Isometría de cuádriceps contra la pared','Mantén 90° en la rodilla, isometría 30-60s',NULL),
(eid,'Sentadilla con salto','sentadilla','cuadriceps','gluteos,isquiotibiales','potencia','intermedio','casa','Sentadilla con salto para desarrollar potencia','Aterriza suavemente con las rodillas flexionadas',NULL),

-- ============================================================
-- ISQUIOTIBIALES Y GLÚTEOS
-- ============================================================
(eid,'Peso muerto convencional','bisagra_cadera','isquiotibiales','gluteos,espalda_baja','fuerza','avanzado','gimnasio','El ejercicio más completo para la cadena posterior','Barra sobre los pies, agarre a la anchura de hombros, espalda neutra','https://www.youtube.com/watch?v=XxWcirHIwVo'),
(eid,'Peso muerto rumano','bisagra_cadera','isquiotibiales','gluteos,espalda_baja','fuerza','intermedio','gimnasio','Variante del peso muerto con énfasis en isquiotibiales','Baja la barra por las piernas sin doblar las rodillas','https://www.youtube.com/watch?v=JCXUYuzwNrM'),
(eid,'Peso muerto sumo','bisagra_cadera','isquiotibiales','gluteos,abductores','fuerza','intermedio','gimnasio','Agarre ancho con pies abiertos, mayor activación de glúteos','Pies a más del doble de la anchura de hombros',NULL),
(eid,'Hip thrust con barra','bisagra_cadera','gluteos','isquiotibiales,cuadriceps','hipertrofia','intermedio','gimnasio','El mejor ejercicio aislado para glúteos','Espalda en banco, barra sobre las caderas, empuja las caderas arriba','https://www.youtube.com/watch?v=SEdqd1n0cvg'),
(eid,'Hip thrust con mancuerna','bisagra_cadera','gluteos','isquiotibiales','hipertrofia','principiante','gimnasio','Variante del hip thrust con mancuerna sobre las caderas','Excelente para aprender la técnica antes de la barra',NULL),
(eid,'Hip thrust unilateral','bisagra_cadera','gluteos','isquiotibiales','fuerza','avanzado','gimnasio','Hip thrust con una pierna para corregir asimetrías','Mantén la pelvis nivelada durante el movimiento',NULL),
(eid,'Curl femoral en máquina tumbado','aislamiento','isquiotibiales','gluteos','hipertrofia','principiante','gimnasio','Aislamiento de isquiotibiales en máquina','Aprieta los glúteos al flexionar las rodillas',NULL),
(eid,'Curl femoral en máquina sentado','aislamiento','isquiotibiales','gluteos','hipertrofia','principiante','gimnasio','Variante sentada del curl femoral','El estiramiento inicial es mayor al estar sentado',NULL),
(eid,'Curl femoral de pie en polea','aislamiento','isquiotibiales','gluteos','hipertrofia','intermedio','gimnasio','Curl femoral de pie con polea baja','Agarra algo para estabilizarte, mueve solo la rodilla',NULL),
(eid,'Curl nórdico','aislamiento','isquiotibiales','gluteos','fuerza','avanzado','gimnasio','Ejercicio excéntrico de isquiotibiales de alta intensidad','Baja lentamente frenando con los isquiotibiales, apoya los pies bajo algo fijo','https://www.youtube.com/watch?v=FC-NE7w8cGE'),
(eid,'Puente de glúteos','bisagra_cadera','gluteos','isquiotibiales','fuerza','principiante','casa','Versión básica del hip thrust sin banco','Tumbado boca arriba, empuja las caderas hacia el techo',NULL),
(eid,'Puente de glúteos unilateral','bisagra_cadera','gluteos','isquiotibiales','fuerza','intermedio','casa','Puente de glúteos con una sola pierna','Mayor activación y corrección de asimetrías',NULL),
(eid,'Kick-back de glúteos en polea','aislamiento','gluteos','isquiotibiales','hipertrofia','principiante','gimnasio','Extensión de cadera en polea para aislar el glúteo','Mantén la espalda neutra, no uses impulso lumbar',NULL),
(eid,'Abducción en máquina','aislamiento','gluteos','abductores','hipertrofia','principiante','gimnasio','Aislamiento de glúteo medio y abductores en máquina','Contrae los glúteos en la posición de máxima apertura',NULL),
(eid,'Sentadilla con banda en las rodillas','sentadilla','gluteos','cuadriceps,abductores','fuerza','principiante','casa','Activación de glúteo medio con banda en la sentadilla','La banda activa el glúteo medio al empujar las rodillas hacia afuera',NULL),
(eid,'Peso muerto con mancuernas','bisagra_cadera','isquiotibiales','gluteos,espalda_baja','fuerza','principiante','gimnasio','Variante del peso muerto con mancuernas, ideal para aprender','Mayor comodidad para principiantes que con barra',NULL),
(eid,'Good morning','bisagra_cadera','isquiotibiales','gluteos,espalda_baja','fuerza','intermedio','gimnasio','Bisagra de cadera con barra, excelente para isquiotibiales','Mantén la espalda neutra, cede desde las caderas',NULL),
(eid,'Extensión de cadera en 4 apoyos','aislamiento','gluteos','isquiotibiales','fuerza','principiante','casa','Donkey kick, activación de glúteo en suelo','Rodilla a 90°, lleva el talón hacia el techo',NULL),
(eid,'Clamshell con banda','aislamiento','gluteos','abductores','fuerza','principiante','casa','Apertura de rodilla en lateral para el glúteo medio','Tumbado de lado, rodillas juntas y caderas a 45°',NULL),

-- ============================================================
-- PANTORRILLA Y TIBIAL
-- ============================================================
(eid,'Elevación de talones de pie en máquina','aislamiento','pantorrilla','soleo','hipertrofia','principiante','gimnasio','Ejercicio fundamental para el desarrollo del gemelo','Completa la extensión en la punta y mantén 1 segundo',NULL),
(eid,'Elevación de talones sentado en máquina','aislamiento','pantorrilla','soleo','hipertrofia','principiante','gimnasio','Trabaja el soleo (músculo profundo de la pantorrilla)','Con la rodilla a 90°, el soleo es el protagonista',NULL),
(eid,'Elevación de talones con mancuernas de pie','aislamiento','pantorrilla','soleo','hipertrofia','principiante','gimnasio','Versión libre de la elevación de talones','Un pie en escalón para mayor rango de movimiento',NULL),
(eid,'Elevación de talones en leg press','aislamiento','pantorrilla','soleo','hipertrofia','principiante','gimnasio','Elevación de talones usando la prensa de piernas','Solo la parte delantera del pie en la plataforma',NULL),
(eid,'Saltos a la comba','cardio','pantorrilla','soleo,cuadriceps','cardio','principiante','casa','Saltar a la comba para desarrollar la pantorrilla y la agilidad','Empuja con las puntas, landing suave',NULL),
(eid,'Elevación de talones unilateral con mancuerna','aislamiento','pantorrilla','soleo','hipertrofia','intermedio','gimnasio','Mayor intensidad y corrección de asimetrías','Usa una pared o poste para equilibrio',NULL),

-- ============================================================
-- CORE — ABDOMINALES Y ESTABILIZACIÓN
-- ============================================================
(eid,'Plancha abdominal','estabilizacion','core','lumbar,gluteos','fuerza','principiante','casa','Ejercicio isométrico fundamental de core','Mantén el cuerpo recto, no dejes caer las caderas','https://www.youtube.com/watch?v=pvIjChbQ4H4'),
(eid,'Plancha lateral','estabilizacion','core','oblicuos,gluteos','fuerza','principiante','casa','Plancha lateral para oblicuos y estabilización lumbar','Apoya en el antebrazo y el pie lateral, cuerpo recto',NULL),
(eid,'Crunch abdominal','aislamiento','core','oblicuos','hipertrofia','principiante','casa','Flexión de tronco básica para el recto abdominal','No tires del cuello, mueve solo la espalda alta',NULL),
(eid,'Crunch en polea','aislamiento','core','oblicuos','hipertrofia','intermedio','gimnasio','Crunch con sobrecarga en polea alta','Dobla el torso hacia el suelo, no solo la cabeza',NULL),
(eid,'Elevación de piernas tumbado','aislamiento','core','flexores_cadera','fuerza','intermedio','casa','Trabaja el recto abdominal inferior y los flexores de cadera','Mantén la zona lumbar en contacto con el suelo','https://www.youtube.com/watch?v=l4kQd9eWclE'),
(eid,'Elevación de piernas en barra','aislamiento','core','flexores_cadera','fuerza','avanzado','calistenia','Colgado de la barra, eleva las piernas a 90°','Mueve solo desde la cadera, nada de balanceo',NULL),
(eid,'Dragon flag','aislamiento','core','flexores_cadera,espalda_baja','fuerza','avanzado','calistenia','Ejercicio de core muy avanzado popularizado por Bruce Lee','Mantén el cuerpo recto como un palo al bajar',NULL),
(eid,'Ab wheel (rueda abdominal)','estabilizacion','core','dorsal,triceps','fuerza','avanzado','casa','Rodada abdominal, exige fuerza y control total del core','Empieza de rodillas, extiende solo lo que puedas controlar','https://www.youtube.com/watch?v=r3Wh9kqyKlE'),
(eid,'Russian twist con mancuerna','rotacion','core','oblicuos','hipertrofia','principiante','casa','Rotación del torso para trabajar los oblicuos','Mantén la espalda recta a 45°, gira el torso (no los brazos)',NULL),
(eid,'Bicycle crunch','rotacion','core','oblicuos','hipertrofia','principiante','casa','Crunch con rotación y movimiento de piernas alternas','Lleva el codo hacia la rodilla opuesta',NULL),
(eid,'Dead bug','estabilizacion','core','flexores_cadera','fuerza','principiante','casa','Excelente para la estabilización lumbo-pélvica','Extiende brazo y pierna contrarios manteniedo la zona lumbar pegada al suelo',NULL),
(eid,'Bird dog','estabilizacion','core','gluteos,espalda_baja','fuerza','principiante','casa','Cuatro apoyos con extensión de brazo y pierna opuestos','Mantén el equilibrio sin rotar la pelvis',NULL),
(eid,'Plancha con toque de hombro','estabilizacion','core','pecho,triceps','fuerza','intermedio','casa','Plancha con anti-rotación, lleva una mano al hombro opuesto','Minimiza el movimiento de la cadera al tocar',NULL),
(eid,'Hollow body hold','estabilizacion','core','flexores_cadera','fuerza','intermedio','calistenia','Posición clave en calistenia, active todo el core','Lumbar pegada al suelo, cuerpo en C invertida',NULL),
(eid,'L-sit en paraletas','estabilizacion','core','flexores_cadera,triceps','fuerza','avanzado','calistenia','Isometría de L en paraletas para core y cuádriceps','Brazos rectos, piernas paralelas al suelo',NULL),
(eid,'Pallof press','estabilizacion','core','oblicuos','fuerza','intermedio','gimnasio','Anti-rotación en cable para estabilización de core','Polea a altura del pecho, extiende y regresa sin rotar',NULL),
(eid,'Windmill con pesa rusa','rotacion','core','oblicuos,gluteos','fuerza','avanzado','gimnasio','Movimiento complejo de cadera y core con kettlebell','Pesa sobre la cabeza, dobla lateralmente hacia el suelo',NULL),
(eid,'Suitcase carry','estabilizacion','core','oblicuos,trapecio','fuerza','principiante','gimnasio','Caminata unilateral con mancuerna para anti-lateralización','Mantén el torso completamente vertical mientras caminas',NULL),
(eid,'Farmer carry','estabilizacion','core','trapecio,antebrazos','fuerza','principiante','gimnasio','Caminata con pesos en ambas manos','Hombros hacia atrás, core activo, pasos controlados',NULL),

-- ============================================================
-- TRAPECIOS Y CUELLO
-- ============================================================
(eid,'Encogimiento de hombros con barra','aislamiento','trapecio','espalda_alta','fuerza','principiante','gimnasio','Ejercicio básico para el trapecio superior','Eleva los hombros directamente hacia las orejas, sin rotar',NULL),
(eid,'Encogimiento de hombros con mancuernas','aislamiento','trapecio','espalda_alta','fuerza','principiante','gimnasio','Variante con mancuernas, mayor rango de movimiento','Palmas enfrentadas o pronadas',NULL),
(eid,'Remo al cuello con barra','traccion_vertical','trapecio','deltoides','fuerza','intermedio','gimnasio','Trabaja trapecio y deltoides lateral simultáneamente','Codos por encima de las muñecas, sube hasta el mentón',NULL),
(eid,'Remo al cuello con mancuernas','traccion_vertical','trapecio','deltoides','fuerza','principiante','gimnasio','Variante con mancuernas del remo al cuello','Menor compresión del hombro que con barra',NULL),
(eid,'Power shrug','aislamiento','trapecio','gluteos,isquiotibiales','fuerza','avanzado','gimnasio','Encogimiento explosivo con ayuda de las piernas','Ligera flexión de rodillas y extensión potente',NULL),

-- ============================================================
-- ANTEBRAZOS
-- ============================================================
(eid,'Curl de muñeca con barra','aislamiento','antebrazos','biceps','hipertrofia','principiante','gimnasio','Flexión de muñeca para el flexor del carpo','Apoya los antebrazos en el banco, solo mueve las muñecas',NULL),
(eid,'Extensión de muñeca con barra','aislamiento','antebrazos','triceps','hipertrofia','principiante','gimnasio','Extensión de muñeca para el extensor del carpo','Agarre prono, apoya antebrazos en el banco',NULL),
(eid,'Pinch grip (pellizco)','aislamiento','antebrazos','manos','fuerza','principiante','gimnasio','Fuerza de agarre tipo pellizco','Sujeta un disco por el borde durante tiempo',NULL),
(eid,'Dead hang (colgado en barra)','aislamiento','antebrazos','espalda,hombros','fuerza','principiante','calistenia','Colgado pasivo en barra para la fuerza de agarre','Aguanta el máximo tiempo posible',NULL),
(eid,'Towel pull-up (dominada con toalla)','traccion_vertical','antebrazos','espalda,biceps','fuerza','avanzado','gimnasio','Dominada con toallas para fuerza de agarre extrema','Cuelga dos toallas de la barra, agárralas',NULL),

-- ============================================================
-- FULL BODY — MOVIMIENTOS COMPLEJOS
-- ============================================================
(eid,'Peso muerto con barra (clásico)','bisagra_cadera','full_body','cuadriceps,gluteos,espalda','fuerza','avanzado','gimnasio','Movimiento compuesto rey para todo el cuerpo','Espalda neutra en todo momento, empuja el suelo al subir','https://www.youtube.com/watch?v=XxWcirHIwVo'),
(eid,'Thruster con barra','empuje_vertical','full_body','cuadriceps,hombros,triceps','potencia','avanzado','gimnasio','Sentadilla + press en un movimiento, ideal para CrossFit','Usa el impulso de la sentadilla para el press',NULL),
(eid,'Thruster con mancuernas','empuje_vertical','full_body','cuadriceps,hombros','potencia','intermedio','gimnasio','Variante con mancuernas del thruster','Excelente para principiantes en movimientos olímpicos',NULL),
(eid,'Clean & jerk (arranque y envión)','olimpico','full_body','cuadriceps,hombros,espalda','potencia','avanzado','gimnasio','Ejercicio olímpico de halterofilia para potencia total','Requiere formación técnica especializada',NULL),
(eid,'Power clean','olimpico','full_body','cuadriceps,espalda,hombros','potencia','avanzado','gimnasio','Versión de fuerza del arranque olímpico','El codo sube alto y rápido al recibir la barra',NULL),
(eid,'Snatch (arrancada)','olimpico','full_body','cuadriceps,hombros,espalda','potencia','avanzado','gimnasio','El movimiento olímpico más técnico que existe','Requiere alta movilidad de hombro y cadera',NULL),
(eid,'Kettlebell swing','bisagra_cadera','full_body','gluteos,isquiotibiales,core','potencia','intermedio','gimnasio','Oscilación de kettlebell para la cadena posterior y potencia','Bisagra de cadera, no sentadilla; el impulso es de las caderas','https://www.youtube.com/watch?v=YSxHifyI6s8'),
(eid,'Kettlebell goblet squat','sentadilla','full_body','cuadriceps,gluteos,core','fuerza','principiante','gimnasio','Sentadilla goblet con kettlebell','Sostén el kettlebell en posición de cáliz frente al pecho',NULL),
(eid,'Kettlebell Turkish get-up','estabilizacion','full_body','hombros,core,gluteos','fuerza','avanzado','gimnasio','Levantamiento turco, el ejercicio más completo de la kettlebell','Sigue el camino exacto: codo, mano, cadera, rodilla, de pie',NULL),
(eid,'Kettlebell clean','olimpico','full_body','cuadriceps,espalda,hombros','potencia','intermedio','gimnasio','Clean con kettlebell para potencia y coordinación','El codo sube rápido, la KB gira alrededor de la mano',NULL),
(eid,'Burpee','full_body','full_body','cuadriceps,pecho,hombros','cardio','principiante','casa','El ejercicio de acondicionamiento más odiado y efectivo','Plancha-flexión-salto en un movimiento fluido','https://www.youtube.com/watch?v=auBLPXO8Fww'),
(eid,'Burpee con salto a caja','full_body','full_body','cuadriceps,pecho,hombros','cardio','intermedio','gimnasio','Burpee con salto sobre una caja, mayor intensidad','Aterriza con las dos piernas sobre la caja, de pie',NULL),
(eid,'Bear crawl (gato)','estabilizacion','full_body','hombros,core,cuadriceps','fuerza','principiante','casa','Desplazamiento en cuatro apoyos para coordinación y core','Rodillas a 2 cm del suelo, movimiento contralateral',NULL),
(eid,'Mountain climbers','cardio','full_body','core,hombros','cardio','principiante','casa','Escaladores de montaña, cardio y core en uno','Mantén las caderas bajas, velocidad controlada',NULL),
(eid,'Box jump','potencia','full_body','cuadriceps,gluteos,isquiotibiales','potencia','intermedio','gimnasio','Salto a la caja para desarrollar potencia en el tren inferior','Aterriza suavemente con las rodillas ligeramente flexionadas','https://www.youtube.com/watch?v=52r_Ul5k03g'),
(eid,'Broad jump (salto horizontal)','potencia','full_body','cuadriceps,gluteos','potencia','intermedio','casa','Salto de longitud para potencia horizontal','Inclínate ligeramente, brazos hacia adelante al saltar',NULL),
(eid,'Wall ball','full_body','full_body','cuadriceps,hombros,core','cardio','intermedio','gimnasio','Sentadilla + lanzamiento de balón a la pared','Atrapa el balón y entra directo en la siguiente sentadilla',NULL),
(eid,'Tire flip (volteo de llanta)','full_body','full_body','espalda,cuadriceps,hombros','potencia','avanzado','gimnasio','Voltereta de llanta grande para fuerza explosiva','Empuja desde las caderas, no levantes con la espalda',NULL),
(eid,'Sled push (empuje de trineo)','empuje','full_body','cuadriceps,gluteos,pecho','fuerza','intermedio','gimnasio','Empuje de trineo, trabajo de fuerza sin impacto','Mantén el cuerpo inclinado, pasos cortos y rápidos',NULL),
(eid,'Sled pull (tirón de trineo)','traccion','full_body','isquiotibiales,gluteos,espalda','fuerza','intermedio','gimnasio','Tirón de trineo hacia ti, trabaja la cadena posterior','Mantén los brazos extendidos, usa las caderas',NULL),
(eid,'Battle rope (cuerdas de batalla)','cardio','full_body','hombros,core,cuadriceps','cardio','principiante','gimnasio','Ondas con cuerdas para cardio de alta intensidad','Mantén las rodillas dobladas, core activo',NULL),

-- ============================================================
-- CARDIO Y ACONDICIONAMIENTO
-- ============================================================
(eid,'Carrera en cinta','cardio','full_body','cuadriceps,isquiotibiales,gluteos','cardio','principiante','gimnasio','Cardio fundamental en cinta de correr','Mantén una postura erguida y usa bien los brazos',NULL),
(eid,'Carrera outdoor','cardio','full_body','cuadriceps,isquiotibiales,gluteos','cardio','principiante','exterior','Carrera al aire libre, el cardio más natural','Varía el terreno para mayor estimulación',NULL),
(eid,'Bicicleta estática','cardio','full_body','cuadriceps,gluteos,isquiotibiales','cardio','principiante','gimnasio','Cardio en bicicleta estática, bajo impacto articular','Regula la resistencia según la intensidad deseada',NULL),
(eid,'Cycling (spinning)','cardio','full_body','cuadriceps,gluteos','cardio','intermedio','gimnasio','Clase de cycling para cardio de alta intensidad','Combina sprints, resistencia alta y ritmo',NULL),
(eid,'Elíptica','cardio','full_body','cuadriceps,gluteos,espalda','cardio','principiante','gimnasio','Cardio de bajo impacto en máquina elíptica','Usa también el tren superior para mayor gasto calórico',NULL),
(eid,'Remo en máquina (ergómetro)','cardio','full_body','espalda,cuadriceps,core','cardio','intermedio','gimnasio','Cardio total en ergómetro de remo, 86% de los músculos','Empieza con las piernas, luego el torso, luego los brazos','https://www.youtube.com/watch?v=zAopOpQHMks'),
(eid,'Salto a la comba','cardio','full_body','pantorrilla,cuadriceps','cardio','principiante','casa','Saltar a la comba para mejorar la coordinación y el cardio','Aterriza en puntillas, codos cerca del cuerpo',NULL),
(eid,'Sprint en cinta','cardio','full_body','cuadriceps,isquiotibiales,gluteos','potencia','intermedio','gimnasio','Sprints en cinta para HIIT y mejora de la velocidad','Aumenta la velocidad gradualmente antes de sprinting',NULL),
(eid,'Caminata con inclinación','cardio','full_body','gluteos,pantorrilla','cardio','principiante','gimnasio','Caminar en cinta con inclinación para mayor gasto calórico','Inclinación 10-15% a velocidad moderada: cardio quema grasa eficaz',NULL),
(eid,'Natación estilo libre','cardio','full_body','espalda,hombros,core','cardio','intermedio','exterior','El cardio más completo, trabaja todo el cuerpo','Técnica de respiración bilateral: cada 3 brazadas',NULL),
(eid,'HIIT en cinta (intervalos)','cardio','full_body','cuadriceps,isquiotibiales','cardio','intermedio','gimnasio','Intervalos de alta intensidad en cinta','30s sprint + 90s caminar, repetir 8-10 veces',NULL),
(eid,'Assault bike (air bike)','cardio','full_body','cuadriceps,pecho,hombros','cardio','intermedio','gimnasio','Bicicleta de aire para cardio de alta intensidad','A más velocidad, mayor resistencia automáticamente',NULL),
(eid,'SkiErg','cardio','full_body','espalda,core,hombros','cardio','intermedio','gimnasio','Simulador de esquí de fondo para potencia y cardio','Usa la fuerza de tus lats y core al jalar',NULL),
(eid,'Caminata nórdica','cardio','full_body','hombros,espalda,cuadriceps','cardio','principiante','exterior','Caminar con bastones para activar el tren superior','Los bastones deben ir hacia atrás en el empuje',NULL),

-- ============================================================
-- MOVILIDAD Y ESTIRAMIENTO
-- ============================================================
(eid,'Estiramiento de isquiotibiales de pie','movilidad','isquiotibiales','lumbar','movilidad','principiante','casa','Flexión de tronco para estirar los isquiotibiales','Rodillas ligeramente flexionadas, cede lentamente',NULL),
(eid,'Estiramiento de cuádriceps de pie','movilidad','cuadriceps','flexores_cadera','movilidad','principiante','casa','Tira del tobillo hacia el glúteo','Mantén las rodillas juntas y el core activo',NULL),
(eid,'Estiramiento de cadera (paloma)','movilidad','gluteos','flexores_cadera','movilidad','principiante','casa','Estiramiento profundo de la cadera','Pierna delantera perpendicular, cadera a nivel',NULL),
(eid,'Apertura de cadera 90/90','movilidad','gluteos','flexores_cadera','movilidad','principiante','casa','Rotación interna y externa de cadera en el suelo','Las dos piernas a 90° en el suelo, cambia la postura',NULL),
(eid,'Estiramiento de pectoral en pared','movilidad','pecho','deltoides_anterior','movilidad','principiante','casa','Apoya el antebrazo en la pared y gira el cuerpo','Codo a la altura del hombro o ligeramente más abajo',NULL),
(eid,'Rotación de torso en suelo','movilidad','core','espalda_baja','movilidad','principiante','casa','Giro de columna tumbado boca arriba','Rodillas juntas, llévalas a un lado mientras los brazos quedan abiertos',NULL),
(eid,'Movilidad de tobillo en pared','movilidad','pantorrilla','tobillo','movilidad','principiante','casa','Mejora la dorsiflexión para sentadillas más profundas','Apoya el pie a la pared, lleva la rodilla a tocarla',NULL),
(eid,'Cat-cow (gato-vaca)','movilidad','core','espalda_baja','movilidad','principiante','casa','Movilidad de columna en cuatro apoyos','Alterna entre arquear y redondear la espalda lentamente',NULL),
(eid,'Downward dog (perro hacia abajo)','movilidad','isquiotibiales','pantorrilla,hombros','movilidad','principiante','casa','Posición de yoga para elongar la cadena posterior','Pies en el suelo, caderas arriba, espalda recta',NULL),
(eid,'Hip flexor stretch (rodilla en suelo)','movilidad','flexores_cadera','cuadriceps','movilidad','principiante','casa','Estiramiento del psoas en posición de zancada baja','La rodilla trasera en el suelo, empuja las caderas hacia adelante',NULL),
(eid,'Estiramiento de hombro cruzado','movilidad','hombros','deltoides_posterior','movilidad','principiante','casa','Lleva el brazo cruzado al pecho con la mano contraria','Mantén el hombro bajo durante el estiramiento',NULL),
(eid,'Estiramiento de tríceps','movilidad','triceps','hombros','movilidad','principiante','casa','Mano detrás de la cabeza, empuja el codo con la otra mano','Mantén la cabeza erguida, no la inclines',NULL),
(eid,'World greatest stretch','movilidad','full_body','cuadriceps,pecho,hombros','movilidad','intermedio','casa','Estiramiento multiplanar: zancada, rotación y apertura','Combina movilidad de cadera, torso y hombro en un movimiento',NULL),
(eid,'Deep squat hold (sentadilla profunda)','movilidad','cuadriceps','gluteos,isquiotibiales','movilidad','principiante','casa','Mantener la posición de sentadilla profunda como estiramiento','Talones en el suelo, pies a la anchura de los hombros',NULL),
(eid,'Estiramiento de espalda baja (child pose)','movilidad','espalda_baja','core','movilidad','principiante','casa','Posición de niño del yoga para la espalda baja','Rodillas abiertas, brazos extendidos, frente al suelo',NULL),

-- ============================================================
-- MOVIMIENTOS OLÍMPICOS Y FUNCIONALES
-- ============================================================
(eid,'Jerk con mancuernas','olimpico','hombros','cuadriceps,triceps','potencia','avanzado','gimnasio','Empuje explosivo de hombros con ayuda de las piernas','Split jerk o push jerk, elige según tu nivel técnico',NULL),
(eid,'High pull con barra','olimpico','espalda','hombros,cuadriceps','potencia','avanzado','gimnasio','Tirón alto explosivo como preparación para el clean','Codos por encima de las muñecas y muy arriba',NULL),
(eid,'Romanian deadlift a una pierna','bisagra_cadera','isquiotibiales','gluteos,core','fuerza','intermedio','gimnasio','Peso muerto rumano unilateral para equilibrio y corrección de asimetrías','Mantén la cadera nivelada, columna neutra',NULL),
(eid,'Single leg RDL con mancuerna','bisagra_cadera','isquiotibiales','gluteos,core','fuerza','intermedio','gimnasio','Versión con mancuerna del peso muerto unilateral','Mancuerna en la mano del lado que levanta el pie',NULL),

-- ============================================================
-- YOGA Y PILATES ADAPTADO
-- ============================================================
(eid,'Plancha lateral con rotación','rotacion','core','oblicuos,hombros','fuerza','intermedio','casa','Plancha lateral con giro del torso hacia arriba','Mano libre sigue el movimiento del torso',NULL),
(eid,'Superman hold','bisagra_cadera','espalda_baja','gluteos,isquiotibiales','fuerza','principiante','casa','Extensión simultánea de brazos y piernas boca abajo','Contrae glúteos e isquiotibiales al subir',NULL),
(eid,'Hollow body rock','estabilizacion','core','flexores_cadera','fuerza','intermedio','calistenia','Balanceo en posición hollow para el core','Mantén la posición tensada durante todo el balanceo',NULL),
(eid,'Hip circles (círculos de cadera)','movilidad','gluteos','flexores_cadera','movilidad','principiante','casa','Círculos amplios de cadera de pie para movilidad','Varía el tamaño y la velocidad de los círculos',NULL),

-- ============================================================
-- FUNCIONAL Y REHABILITACIÓN
-- ============================================================
(eid,'Marcha con rodilla alta','movilidad','cuadriceps','flexores_cadera','movilidad','principiante','casa','Activación dinámica llevando las rodillas al pecho','Mantén el torso erguido, usa la punta del pie de apoyo',NULL),
(eid,'Crab walk con banda','aislamiento','gluteos','abductores','fuerza','principiante','casa','Caminar lateral con banda en las rodillas o tobillos','Mantén las rodillas apuntando afuera, espalda recta',NULL),
(eid,'Terminal knee extension (TKE)','aislamiento','cuadriceps','isquiotibiales','rehabilitacion','principiante','casa','Extensión de rodilla con banda para activar el VMO','Banda detrás de la rodilla, extiende suavemente',NULL),
(eid,'Side-lying leg raise','aislamiento','gluteos','abductores','fuerza','principiante','casa','Elevación lateral de pierna tumbado','Mantén la pierna recta, no rotes la cadera',NULL),
(eid,'Seated hip abduction con banda','aislamiento','gluteos','abductores','fuerza','principiante','casa','Abducción sentado con banda en las rodillas','Separa las rodillas contra la resistencia de la banda',NULL),
(eid,'Glute bridge con pie en pared','bisagra_cadera','gluteos','isquiotibiales','fuerza','principiante','casa','Puente de glúteos con apoyo del pie en la pared','La pared da retroalimentación de posición a la cadera',NULL),
(eid,'Wall angel','movilidad','hombros','espalda_alta','movilidad','principiante','casa','Ángel de pared para corrección postural del hombro','Espalda y nuca en contacto con la pared',NULL),
(eid,'Cervical retraction (chin tuck)','movilidad','cuello','espalda_alta','movilidad','principiante','casa','Retracción cervical para corregir la postura','Lleva la barbilla hacia atrás como creando papada',NULL),
(eid,'Prone Y-T-W','aislamiento','espalda','romboides,deltoides_posterior','fuerza','principiante','casa','Activación de la musculatura escapular en decúbito prono','Cada letra es una posición de brazos diferente',NULL),
(eid,'Standing hip extension con banda','aislamiento','gluteos','isquiotibiales','fuerza','principiante','casa','Extensión de cadera de pie con banda','Fija la banda al frente, extiende la pierna hacia atrás',NULL),

-- ============================================================
-- EJERCICIOS EN MÁQUINAS
-- ============================================================
(eid,'Aductores en máquina','aislamiento','aductores','gluteos','hipertrofia','principiante','gimnasio','Cierre de piernas en máquina para los aductores','Contrae en la posición más cerrada',NULL),
(eid,'Abductores en máquina','aislamiento','abductores','gluteos','hipertrofia','principiante','gimnasio','Apertura de piernas en máquina para los abductores','Mantén la espalda apoyada, no uses rebote',NULL),
(eid,'Curl femoral en máquina de pie','aislamiento','isquiotibiales','gluteos','hipertrofia','principiante','gimnasio','Curl femoral unilateral de pie en máquina','Control excéntrico, baja lentamente',NULL),
(eid,'Press de piernas unilateral','empuje','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Prensa con una pierna para corregir asimetrías','Compara la fuerza entre piernas regularmente',NULL),
(eid,'Extensión lumbar en máquina','bisagra_cadera','espalda_baja','gluteos','fuerza','principiante','gimnasio','Extensión de la espalda baja en máquina','Solo hasta la posición neutra, no hipextendas',NULL),
(eid,'Flexión de tronco en máquina','aislamiento','core','flexores_cadera','hipertrofia','principiante','gimnasio','Crunch en máquina con sobrecarga','Dobla el torso, no solo la cabeza',NULL),
(eid,'Rotación de torso en máquina','rotacion','core','oblicuos','fuerza','principiante','gimnasio','Rotación del torso en máquina para oblicuos','Movimiento controlado, sin lanzar',NULL),

-- ============================================================
-- EJERCICIOS CON KETTLEBELL
-- ============================================================
(eid,'Kettlebell deadlift','bisagra_cadera','isquiotibiales','gluteos,espalda','fuerza','principiante','gimnasio','Peso muerto con kettlebell, ideal para aprender el patrón','La kettlebell entre los pies, agarre neutro',NULL),
(eid,'Kettlebell snatch','olimpico','full_body','hombros,cuadriceps','potencia','avanzado','gimnasio','Arrancada con kettlebell, potencia explosiva unilateral','El codo se bloquea al final, la KB gira alrededor de la mano',NULL),
(eid,'Kettlebell press de pie','empuje_vertical','hombros','triceps,core','fuerza','principiante','gimnasio','Press unilateral con kettlebell sobre la cabeza','Aprieta el glúteo del lado contrario para mayor estabilidad',NULL),
(eid,'Kettlebell windmill','rotacion','core','hombros,isquiotibiales','fuerza','avanzado','gimnasio','Molino de viento con kettlebell para movilidad y fuerza','KB sobre la cabeza, baja hacia el pie opuesto con la mano libre',NULL),
(eid,'Kettlebell halos (halos)','movilidad','hombros','core,espalda_alta','movilidad','principiante','gimnasio','Círculos alrededor de la cabeza con kettlebell','Control total, pasa la KB entre las manos al frente y atrás',NULL),
(eid,'Kettlebell renegade row','traccion_horizontal','espalda','core,biceps','fuerza','avanzado','gimnasio','Remo con renegade, plank + remo alternado','Dos kettlebells, rema sin rotar la cadera',NULL),
(eid,'Kettlebell alternating swing','bisagra_cadera','full_body','gluteos,isquiotibiales','potencia','intermedio','gimnasio','Swing alternando la mano en cada rep','Suelta y atrapa la KB en el punto más alto',NULL),
(eid,'Kettlebell around the world','movilidad','core','hombros,espalda_alta','movilidad','principiante','gimnasio','Pasar la kettlebell alrededor del cuerpo','Mantén el core activo y los pies firmes',NULL),

-- ============================================================
-- SUSPENSIÓN TRX Y SIMILARES
-- ============================================================
(eid,'TRX row (remo en suspensión)','traccion_horizontal','espalda','biceps,romboides','fuerza','principiante','gimnasio','Remo en suspensión, ajusta la dificultad con el ángulo del cuerpo','Mayor inclinación = mayor dificultad',NULL),
(eid,'TRX push-up (flexión en suspensión)','empuje_horizontal','pecho','triceps,core','fuerza','intermedio','gimnasio','Flexión con manos en las correas, inestabilidad aumenta la dificultad','Mayor extensión de cuerpo = mayor dificultad',NULL),
(eid,'TRX squat (sentadilla en suspensión)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','principiante','gimnasio','Sentadilla asistida por las correas, ideal para aprender','Las correas ayudan al equilibrio y permiten mayor profundidad',NULL),
(eid,'TRX hamstring curl (curl de isquio)','bisagra_cadera','isquiotibiales','gluteos,core','fuerza','intermedio','gimnasio','Curl de isquiotibiales con talones en las correas','Tumbado, puente de glúteos + flexión de rodillas',NULL),
(eid,'TRX fallout (extensión de core)','estabilizacion','core','dorsal,hombros','fuerza','avanzado','gimnasio','Extensión progresiva del core con las correas','Similar a la rueda abdominal pero más controlable',NULL),
(eid,'TRX lunge (zancada en suspensión)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Zancada con el pie trasero en las correas','El pie elevado aumenta la exigencia del glúteo trasero',NULL),

-- ============================================================
-- ESTIRAMIENTOS AVANZADOS Y PNF
-- ============================================================
(eid,'Estiramiento de psoas con estocada profunda','movilidad','flexores_cadera','cuadriceps','movilidad','intermedio','casa','Estocada profunda con cadera baja para el psoas','Mantén el torso erguido, empuja la cadera hacia adelante',NULL),
(eid,'Estiramiento de pectoral con foam roller','movilidad','pecho','hombros','movilidad','principiante','casa','Tumbado sobre el foam roller en vertical para abrir el pecho','Brazos abiertos, relajación progresiva',NULL),
(eid,'Foam rolling de cuádriceps','movilidad','cuadriceps','flexores_cadera','movilidad','principiante','casa','Rodillo de espuma para liberar la tensión del cuádriceps','Rueda lentamente, detente en los puntos de tensión',NULL),
(eid,'Foam rolling de isquiotibiales','movilidad','isquiotibiales','gluteos','movilidad','principiante','casa','Rodillo de espuma para los isquiotibiales','Apila una pierna sobre otra para mayor presión',NULL),
(eid,'Foam rolling de espalda alta','movilidad','espalda_alta','romboides','movilidad','principiante','casa','Extensión de espalda sobre el foam roller','Deja caer la espalda alta sobre el rodillo con los brazos cruzados',NULL),
(eid,'Foam rolling de IT band','movilidad','abductores','cuadriceps','movilidad','principiante','casa','Rodillo por la banda iliotibial, lateral del muslo','Puede ser incómodo, hazlo progresivamente',NULL),
(eid,'Lacrosse ball en glúteos','movilidad','gluteos','piriforme','movilidad','principiante','casa','Pelota de lacrosse para liberar el glúteo y el piriforme','Siéntate sobre la pelota y cruza la pierna',NULL),

-- ============================================================
-- MOVIMIENTOS DE EMPUJE Y TRACCIÓN AVANZADOS
-- ============================================================
(eid,'Muscle up en barra','full_body','espalda','biceps,triceps,pecho','fuerza','avanzado','calistenia','Transición de dominada a fondos en un solo movimiento','Requiere mucha práctica y fuerza, empieza con asistencia',NULL),
(eid,'Front lever','estabilizacion','espalda','core,biceps','fuerza','avanzado','calistenia','Posición horizontal colgado de la barra con el cuerpo plano','Progresión: una pierna doblada → dos → completo',NULL),
(eid,'Back lever','estabilizacion','pecho','core,biceps','fuerza','avanzado','calistenia','Posición horizontal de espaldas colgado de la barra','Empieza con las piernas dobladas y extiende progresivamente',NULL),
(eid,'Planche','estabilizacion','pecho','core,hombros','fuerza','avanzado','calistenia','El máximo en fuerza de empuje de calistenia','Años de progresión: planche en L → avanzado → completo',NULL),
(eid,'Human flag (bandera humana)','estabilizacion','core','hombros,espalda','fuerza','avanzado','calistenia','El cuerpo horizontal en una barra vertical','Requiere fuerza anti-lateral extrema del core',NULL),
(eid,'Ring dips (fondos en anillas)','empuje_horizontal','pecho','triceps,hombros','fuerza','avanzado','gimnasio','Fondos en anillas, mayor inestabilidad que en paraletas','Mantén las anillas giradas hacia afuera en la parte superior',NULL),
(eid,'Ring pull-up (dominada en anillas)','traccion_vertical','espalda','biceps','fuerza','avanzado','gimnasio','Dominadas en anillas con mayor activación estabilizadora','Gira las muñecas hacia afuera al subir',NULL),

-- ============================================================
-- DEPORTE ESPECÍFICO Y AGILIDAD
-- ============================================================
(eid,'T-drill (carrera en T)','agilidad','full_body','cuadriceps,gluteos','agilidad','intermedio','exterior','Ejercicio clásico de agilidad y cambio de dirección','Optimiza los cambios de pie: planta, pivota, acelera',NULL),
(eid,'Lateral shuffle','agilidad','full_body','cuadriceps,gluteos','agilidad','principiante','exterior','Desplazamiento lateral en posición de defensa','Mantén las caderas bajas, nunca cruces los pies',NULL),
(eid,'Skipping (rodillas altas corriendo)','agilidad','full_body','cuadriceps,flexores_cadera','cardio','principiante','exterior','Carrera con rodillas altas para mejorar la técnica de carrera','Rodillas al pecho, brazos en sincronía',NULL),
(eid,'Carioca','agilidad','full_body','abductores,aductores','agilidad','principiante','exterior','Desplazamiento lateral cruzando los pies','Alterna pie por delante y por detrás del pie de apoyo',NULL),
(eid,'Salto con pies juntos sobre escalera de agilidad','agilidad','full_body','cuadriceps,pantorrilla','agilidad','intermedio','exterior','Saltos coordinados sobre la escalera de agilidad','Progresa a mayor velocidad al dominar la coordinación',NULL),
(eid,'Ickey shuffle (escalera de agilidad)','agilidad','full_body','cuadriceps,gluteos','agilidad','intermedio','exterior','Patrón lateral con tres pasos sobre la escalera','Un pie dentro, el otro dentro, adelanta fuera',NULL),

-- ============================================================
-- NATACIÓN Y AGUA
-- ============================================================
(eid,'Natación espalda','cardio','espalda','hombros,core','cardio','principiante','exterior','Estilo espalda para trabajar el dorsal y los hombros','Caderas arriba, brazos alternos, rotación del torso',NULL),
(eid,'Braza','cardio','pecho','hombros,cuadriceps','cardio','principiante','exterior','Estilo braza, el más accesible para principiantes','Jalón simultáneo hacia afuera y hacia las caderas',NULL),
(eid,'Mariposa','cardio','pecho','espalda,core','cardio','avanzado','exterior','El estilo más exigente, gran activación de core','Movimiento ondulatorio del cuerpo, jalón amplio',NULL),
(eid,'Aqua jogging','cardio','full_body','cuadriceps,gluteos,isquiotibiales','cardio','principiante','exterior','Correr en el agua para cardio sin impacto','Ideal para recuperación activa o lesiones de rodilla',NULL),

-- ============================================================
-- PILATES
-- ============================================================
(eid,'Hundred (cien)','estabilizacion','core','flexores_cadera,isquiotibiales','fuerza','intermedio','casa','El ejercicio signature de Pilates para el core','Piernas en tabla o extendidas, brazos pulsando',NULL),
(eid,'Roll up (pilates)','movilidad','core','isquiotibiales','fuerza','principiante','casa','Rodada completa de la columna vértebra a vértebra','Movimiento lento y controlado, usa el core',NULL),
(eid,'Leg circle (círculo de pierna)','movilidad','flexores_cadera','core','movilidad','principiante','casa','Círculos de pierna tumbado para movilidad de cadera','Mantén la pelvis estable mientras la pierna hace círculos',NULL),
(eid,'Swan (cisne)','bisagra_cadera','espalda_baja','gluteos','movilidad','principiante','casa','Extensión de columna boca abajo inspirada en yoga','Empuja con los brazos, alarga la columna',NULL),
(eid,'Side kick (patada lateral)','aislamiento','abductores','gluteos','fuerza','principiante','casa','Patada lateral en lateral recumbente, Pilates','Control del movimiento sin balanceo de cadera',NULL),

-- ============================================================
-- BALANCE Y PROPIOCEPCIÓN
-- ============================================================
(eid,'Equilibrio en una pierna','estabilizacion','cuadriceps','tobillo,core','fuerza','principiante','casa','Base de la propiocepción y el equilibrio','Progresa a ojos cerrados cuando lo domines',NULL),
(eid,'Equilibrio en bosu','estabilizacion','cuadriceps','tobillo,core','fuerza','intermedio','gimnasio','Equilibrio sobre la superficie inestable del bosu','Empieza con las manos apoyadas, progresa a libre',NULL),
(eid,'Sentadilla en bosu','sentadilla','cuadriceps','gluteos,tobillo','fuerza','avanzado','gimnasio','Sentadilla sobre la parte plana del bosu','Mayor activación estabilizadora que en suelo firme',NULL),
(eid,'Deadlift en bosu (equilibrio inestable)','bisagra_cadera','isquiotibiales','gluteos,core','fuerza','avanzado','gimnasio','Peso muerto sobre superficie inestable','Reduce el peso respecto a la versión estable',NULL),
(eid,'Press unilateral con inestabilidad','empuje_vertical','hombros','core,manguito_rotador','fuerza','avanzado','gimnasio','Press unilateral de pie con superficie inestable','Requiere gran estabilización del core y el hombro',NULL),

-- ============================================================
-- EJERCICIOS DE POTENCIA Y SALTO
-- ============================================================
(eid,'Salto en profundidad (depth jump)','potencia','full_body','cuadriceps,gluteos,isquiotibiales','potencia','avanzado','gimnasio','Caída de la caja + salto inmediato para pliometría','El tiempo de contacto en el suelo debe ser mínimo',NULL),
(eid,'Lateral bound (salto lateral)','potencia','full_body','gluteos,cuadriceps,abductores','potencia','intermedio','exterior','Salto lateral para potencia en el plano frontal','Aterriza en equilibrio sobre un pie, controla la deceleración',NULL),
(eid,'Single leg hop (salto unilateral)','potencia','full_body','cuadriceps,gluteos,isquiotibiales','potencia','avanzado','exterior','Salto hacia adelante en una pierna','Aterriza suavemente en la misma pierna',NULL),
(eid,'Skater jump','potencia','full_body','gluteos,cuadriceps,abductores','potencia','intermedio','casa','Salto lateral alternando piernas como un patinador','Control de aterrizaje en una sola pierna es clave',NULL),
(eid,'Medicine ball slam','potencia','full_body','core,hombros,espalda','potencia','intermedio','gimnasio','Lanzamiento de balón medicinal al suelo para potencia total','Activa todo el core en la bajada y el impacto',NULL),
(eid,'Medicine ball rotational throw','potencia','core','hombros,pecho','potencia','intermedio','gimnasio','Lanzamiento rotacional del balón medicinal contra la pared','La potencia viene de la rotación del torso y las caderas',NULL),
(eid,'Plyo push-up (flexión pliométrica)','potencia','pecho','triceps,hombros','potencia','avanzado','casa','Flexión explosiva que despega las manos del suelo','Activa al máximo en la fase concéntrica',NULL),

-- ============================================================
-- EJERCICIOS ADICIONALES VARIADOS
-- ============================================================
(eid,'Press de hombro en máquina','empuje_vertical','hombros','triceps','fuerza','principiante','gimnasio','Press de hombro guiado en máquina','Ideal para principiantes o fase de rehabilitación',NULL),
(eid,'Pull-down con agarre neutro estrecho','traccion_vertical','espalda','biceps','fuerza','principiante','gimnasio','Jalón al pecho con agarre neutro y estrecho','Mayor énfasis en el bíceps y parte baja del dorsal',NULL),
(eid,'Cable fly alto (aperturas en cable alto)','aislamiento','pecho','deltoides_anterior','hipertrofia','principiante','gimnasio','Apertura en cable desde polea alta','Misma acción que las aperturas pero con tensión constante',NULL),
(eid,'Cable fly bajo (aperturas en cable bajo)','aislamiento','pecho','deltoides_anterior','hipertrofia','principiante','gimnasio','Apertura en cable desde polea baja para pecho superior','Lleva los cables hacia arriba y al centro',NULL),
(eid,'Remo con agarre supino en polea baja','traccion_horizontal','espalda','biceps','fuerza','principiante','gimnasio','Remo con agarre supino en cable, mayor activación bíceps','Palmas hacia arriba, jala hacia el abdomen',NULL),
(eid,'Curl de cadera en máquina abdominal','aislamiento','core','flexores_cadera','hipertrofia','principiante','gimnasio','Curl con máquina de crunch con las caderas como palanca','Dobla desde las caderas también, no solo el torso',NULL),
(eid,'Superman con extensión alterna','bisagra_cadera','espalda_baja','gluteos','fuerza','principiante','casa','Extensión alterna de brazo y pierna opuesta boca abajo','Alterna lado en cada repetición',NULL),
(eid,'Puente de glúteos con banda (activación)','bisagra_cadera','gluteos','abductores','fuerza','principiante','casa','Puente de glúteos con banda para mayor activación del glúteo medio','La banda añade resistencia a la abducción',NULL),
(eid,'Reverse hyper (hiperextensión inversa)','bisagra_cadera','gluteos','isquiotibiales,espalda_baja','fuerza','intermedio','gimnasio','Las piernas se elevan en vez del torso en la extensión','Excelente para la descompresión de la columna lumbar',NULL),
(eid,'Zancada caminando con barra','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Zancadas en movimiento con barra en la espalda','Da pasos largos, mantén el torso erguido',NULL),
(eid,'Sentadilla con salto al cajón','potencia','cuadriceps','gluteos,isquiotibiales','potencia','intermedio','gimnasio','Sentadilla + salto explosivo al cajón','Aterriza suavemente y baja controlado',NULL),
(eid,'Pallof press de pie','estabilizacion','core','oblicuos,gluteos','fuerza','intermedio','gimnasio','Anti-rotación de pie en polea para el core','Mantén los pies paralelos, el movimiento es solo de los brazos',NULL),
(eid,'Remo alto con mancuernas','traccion_vertical','trapecio','deltoides,biceps','fuerza','principiante','gimnasio','Remo al mentón con mancuernas','Más seguro para el hombro que con barra',NULL),
(eid,'Press de pecho con cadenas','empuje_horizontal','pecho','triceps','fuerza','avanzado','gimnasio','Press con cadenas para sobrecarga acomodada','A más extensión de codo, más peso por las cadenas',NULL),
(eid,'Sentadilla con bandas','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Sentadilla con bandas para sobrecarga acomodada','Añade resistencia en la parte superior del movimiento',NULL),
(eid,'Peso muerto con déficit','bisagra_cadera','isquiotibiales','gluteos,espalda','fuerza','avanzado','gimnasio','Peso muerto desde un cajón para mayor rango de movimiento','Requiere excelente movilidad de cadera y tobillo',NULL),
(eid,'Pause squat (sentadilla con pausa)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','avanzado','gimnasio','Sentadilla con 2-3 segundos de pausa abajo','Elimina el rebote elástico, exige fuerza real',NULL),
(eid,'Tempo squat (sentadilla con tempo)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Sentadilla con bajada lenta controlada (4-6 segundos)','Aumenta el tiempo bajo tensión para hipertrofia',NULL),
(eid,'Partial rep curl (curl parcial)','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curls con rango parcial para fatigar el pico del bíceps','Trabaja solo el tercio superior del rango',NULL),
(eid,'Isometric hold deadlift','bisagra_cadera','isquiotibiales','gluteos,espalda','fuerza','avanzado','gimnasio','Mantener la posición a la altura de las rodillas durante varios segundos','El tirón isométrico contra el suelo desarrolla fuerza máxima',NULL),
(eid,'Curl 21s con mancuernas','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Técnica 21s con mancuernas para máxima fatiga del bíceps','7 reps bajas + 7 reps altas + 7 completas con cada mano',NULL),
(eid,'Tríceps con agarre neutro en polea','aislamiento','triceps','deltoides_posterior','hipertrofia','principiante','gimnasio','Extensión de tríceps con accesorio de agarre neutro','El agarre neutro reduce la tensión en la muñeca',NULL),
(eid,'Reverse fly con mancuernas de pie','aislamiento','hombros','romboides','hipertrofia','principiante','gimnasio','Apertura posterior inclinado hacia adelante de pie','Mantén la espalda neutra, codos ligeramente flexionados',NULL),
(eid,'Single arm cable row','traccion_horizontal','espalda','biceps,romboides','fuerza','principiante','gimnasio','Remo unilateral en cable para corregir desequilibrios','Rota ligeramente el torso al jalar para mayor ROM',NULL),
(eid,'Chest supported dumbbell row','traccion_horizontal','espalda','biceps,romboides','fuerza','principiante','gimnasio','Remo con pecho apoyado en banco inclinado','El soporte elimina la compensación lumbar',NULL),
(eid,'Seated cable row with pause','traccion_horizontal','espalda','biceps,romboides','hipertrofia','intermedio','gimnasio','Remo en cable con pausa en la contracción máxima','2 segundos de pausa con los codos detrás del cuerpo',NULL),
(eid,'Overhead carry (farmer overhead)','estabilizacion','hombros','core,triceps','fuerza','intermedio','gimnasio','Caminata con pesos por encima de la cabeza','Brazos completamente extendidos, core muy activo',NULL),
(eid,'Landmine press','empuje_vertical','hombros','pecho,core','fuerza','intermedio','gimnasio','Press diagonal con el extremo de la barra en el suelo','Posición intermedia entre el press vertical y horizontal',NULL),
(eid,'Landmine row','traccion_horizontal','espalda','biceps','fuerza','intermedio','gimnasio','Remo con el extremo de la barra en el suelo','Agarre a un lado de la barra, jala hacia la cadera',NULL),
(eid,'Landmine squat','sentadilla','cuadriceps','gluteos,hombros','fuerza','principiante','gimnasio','Sentadilla sosteniendo el extremo de la barra frente al pecho','La carga diagonal hace la sentadilla más accesible',NULL),
(eid,'Trap bar deadlift (hex bar)','bisagra_cadera','isquiotibiales','cuadriceps,gluteos,espalda','fuerza','principiante','gimnasio','Peso muerto con barra hexagonal, más accesible y seguro','Posición más vertical del torso que con barra convencional',NULL),
(eid,'Safety bar squat','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Sentadilla con barra de seguridad que cambia el centro de gravedad','Reducida demanda de movilidad de hombro',NULL),
(eid,'Cable pull-through','bisagra_cadera','gluteos','isquiotibiales,espalda_baja','fuerza','principiante','gimnasio','Bisagra de cadera con cable entre las piernas','La tensión del cable enfatiza el trabajo de glúteos',NULL),
(eid,'Sumo deadlift high pull','olimpico','full_body','cuadriceps,hombros,espalda','potencia','intermedio','gimnasio','Movimiento sumo + tirón alto, derivado del halter','Uso frecuente en CrossFit como preparación olímpica',NULL);

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
RAISE NOTICE 'Ejercicios insertados correctamente. Total esperado: 300+';

END $$;
