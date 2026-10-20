-- ============================================================
-- SEED PARTE 5: Biblioteca de Ejercicios — Forge Studio
-- Cierra el total en 1000+ ejercicios
-- ============================================================

DO $$
DECLARE
  eid UUID := '0b908e25-f69f-472c-9972-87bc93d67e65';
BEGIN

-- ============================================================
-- CORE — ANTIROTACIÓN Y ESTABILIZACIÓN AVANZADA
-- ============================================================
INSERT INTO ejercicios_biblioteca (entrenador_id, nombre, patron, grupo_muscular, grupo_secundario, tipo, nivel, modalidad, descripcion, consejos_tecnica, youtube_url) VALUES
(eid,'Pallof press (press Pallof)','estabilizacion','core','oblicuos,hombros','fuerza','principiante','gimnasio','Press frontal con polea que resiste la rotación del core','Cuanto más alejado de la polea, mayor palanca y dificultad',NULL),
(eid,'Pallof press overhead (Pallof por encima)','estabilizacion','core','oblicuos,hombros','fuerza','intermedio','gimnasio','Variante del Pallof con extensión overhead al finalizar el press','La extensión overhead aumenta el brazo de palanca antirotacional',NULL),
(eid,'Half-kneeling Pallof press (Pallof arrodillado)','estabilizacion','core','oblicuos,gluteos','fuerza','intermedio','gimnasio','Pallof press en posición de zancada arrodillada','Elimina el apoyo de las piernas, el core trabaja más para estabilizar',NULL),
(eid,'Single arm farmer carry (granjero unilateral)','estabilizacion','core','oblicuos,trapecio,cuadrado_lumbar','fuerza','principiante','gimnasio','Caminata con peso solo en un lado del cuerpo','El oblicuo del lado sin peso resiste la inclinación lateral',NULL),
(eid,'Waiter carry (camarero)','estabilizacion','hombros','core,triceps','fuerza','principiante','gimnasio','Caminata con el peso sobre la palma extendida en alto','La muñeca y el codo deben estar bloqueados para estabilizar el hombro',NULL),
(eid,'Suitcase carry (maletín)','estabilizacion','core','oblicuos,cuadrado_lumbar,trapecio','fuerza','principiante','gimnasio','Caminata con mancuerna o pesa al lado como si fuera un maletín','El núcleo resiste la inclinación lateral en cada paso',NULL),
(eid,'Bottoms-up kettlebell press (KB boca abajo)','estabilizacion','hombros','core,triceps,manguito_rotador','fuerza','avanzado','gimnasio','Press con la kettlebell invertida (fondo hacia arriba) sobre la mano','La inestabilidad obliga a máxima tensión en todo el brazo y el hombro',NULL),
(eid,'Overhead single leg balance (equilibrio en un pie con peso)','estabilizacion','tobillo','core,hombros,cuadriceps','fuerza','intermedio','gimnasio','De pie sobre un pie con peso overhead, mantener el equilibrio','El core trabaja doblemente: estabiliza el peso arriba y la postura',NULL),
(eid,'Copenhagen plank (plancha Copenhagen)','estabilizacion','aductores','core,gluteos','fuerza','avanzado','gimnasio','Plancha lateral con el pie superior apoyado en un banco y el inferior en el aire','Activa los aductores de la pierna superior de forma intensa',NULL),
(eid,'Plank with leg lift (plancha con elevación de pierna)','estabilizacion','core','gluteos,isquiotibiales','fuerza','intermedio','casa','Plancha estándar elevando una pierna del suelo de forma alterna','La pelvis debe permanecer horizontal al elevar la pierna',NULL),
(eid,'Bear crawl (gateo de oso)','estabilizacion','core','hombros,cuadriceps','fuerza','principiante','casa','Desplazamiento a cuatro apoyos con las rodillas a 2-3cm del suelo','Mover brazo y pierna contralaterales juntos, espalda plana',NULL),
(eid,'Lateral bear crawl (gateo de oso lateral)','estabilizacion','core','hombros,cuadriceps,oblicuos','fuerza','intermedio','casa','Gateo de oso hacia los lados en lugar de hacia adelante','Mayor demanda antirotacional que el gateo frontal',NULL),

-- ============================================================
-- GLÚTEOS — ESPECIALIZACIÓN
-- ============================================================
(eid,'Frog pump (bomba rana)','aislamiento','gluteos','aductores','hipertrofia','principiante','casa','Con las plantas de los pies juntas y las rodillas abiertas, elevar las caderas','Alta activación del glúteo, mínima de los isquiotibiales',NULL),
(eid,'Single leg hip thrust (empuje de cadera unilateral)','bisagra_cadera','gluteos','isquiotibiales','hipertrofia','intermedio','gimnasio','Hip thrust con una sola pierna, la otra extendida','Duplica la carga sobre el glúteo activo',NULL),
(eid,'Hip thrust with band (hip thrust con banda)','bisagra_cadera','gluteos','isquiotibiales,abductores','hipertrofia','principiante','casa','Hip thrust con una mini banda alrededor de las rodillas','La banda activa también el glúteo medio durante el movimiento',NULL),
(eid,'Quadruped hip extension (extensión de cadera en cuadrupedia)','aislamiento','gluteos','isquiotibiales','hipertrofia','principiante','casa','A cuatro apoyos, elevar una pierna doblada hacia el techo','Contrae el glúteo en el punto más alto y mantén 1-2 segundos',NULL),
(eid,'Fire hydrant (boca de incendio)','aislamiento','abductores','gluteos_medios','hipertrofia','principiante','casa','A cuatro apoyos, elevar la rodilla lateralmente como una boca de incendio','Mantén la rodilla a 90° durante todo el arco',NULL),
(eid,'Glute kickback (patada de glúteo)','aislamiento','gluteos','isquiotibiales','hipertrofia','principiante','casa','A cuatro apoyos, patada hacia atrás y arriba con la pierna','La extensión de cadera maximiza la contracción del glúteo',NULL),
(eid,'Standing glute kickback cable (patada glúteo con cable)','aislamiento','gluteos','isquiotibiales','hipertrofia','principiante','gimnasio','Patada hacia atrás con tobillo enganchado en polea baja','La polea mantiene tensión constante durante todo el movimiento',NULL),
(eid,'Sumo squat (sentadilla sumo)','sentadilla','aductores','gluteos,cuadriceps','hipertrofia','principiante','casa','Sentadilla con pies muy separados y puntas hacia afuera','El stance amplio incrementa la activación de aductores y glúteo mayor',NULL),
(eid,'Cable pull-through (tracción de cable entre piernas)','bisagra_cadera','gluteos','isquiotibiales,espalda_baja','hipertrofia','principiante','gimnasio','Bisagra de cadera sosteniendo la cuerda de la polea baja entre las piernas','Énfasis en la extensión de cadera al final del movimiento',NULL),
(eid,'Back extension with rotation (extensión de espalda con rotación)','bisagra_cadera','espalda_baja','gluteos,oblicuos','fuerza','intermedio','gimnasio','Extensión de espalda en banco romano añadiendo rotación del torso','La rotación activa adicionalmente los oblicuos en el movimiento',NULL),

-- ============================================================
-- TRAPECIOS Y CUELLO — COMPLETO
-- ============================================================
(eid,'Barbell shrug (encogimiento con barra)','aislamiento','trapecio','cuello','hipertrofia','principiante','gimnasio','Encogimiento de hombros con barra frente al cuerpo','Sube verticalmente, no gires los hombros en círculos',NULL),
(eid,'Dumbbell shrug (encogimiento con mancuerna)','aislamiento','trapecio','cuello','hipertrofia','principiante','gimnasio','Encogimiento de hombros con mancuernas a los lados','Mayor rango de movimiento que con la barra',NULL),
(eid,'Behind-the-back barbell shrug (encogimiento a la espalda)','aislamiento','trapecio','cuello','hipertrofia','intermedio','gimnasio','Encogimiento con la barra detrás del cuerpo','Activa la parte media e inferior del trapecio más que el encogimiento frontal',NULL),
(eid,'Neck harness (arnés de cuello)','aislamiento','cuello','trapecio','fuerza','avanzado','gimnasio','Extensión e inclinación del cuello con arnés de peso','Solo para atletas avanzados con supervisión; empezar con muy poco peso',NULL),
(eid,'Isometric neck exercise (isométrico de cuello)','estabilizacion','cuello','trapecio','rehabilitacion','principiante','casa','Resistencia manual contra la mano en las cuatro direcciones del cuello','La forma más segura de fortalecer el cuello para principiantes',NULL),
(eid,'Rack pull high (remo desde rack alto)','traccion_vertical','trapecio','espalda,biceps','fuerza','intermedio','gimnasio','Peso muerto desde el nivel del muslo, énfasis en el encogimiento final','Permite manejar más peso que el peso muerto convencional',NULL),

-- ============================================================
-- HOMBROS — MANGUITO ROTADOR Y PREVENCIÓN
-- ============================================================
(eid,'External rotation side lying (rotación externa tumbado)','aislamiento','manguito_rotador','deltoides_posterior','rehabilitacion','principiante','casa','Tumbado de lado, rotación externa del hombro con mancuerna ligera','El codo plegado a 90° permanece pegado al costado',NULL),
(eid,'Internal rotation cable (rotación interna con cable)','aislamiento','manguito_rotador','pecho','rehabilitacion','principiante','gimnasio','Rotación interna del hombro con polea a la altura del codo','Codo a 90° junto al cuerpo, solo rota el antebrazo hacia el ombligo',NULL),
(eid,'Sleeper stretch (estiramiento del durmiente)','movilidad','manguito_rotador','hombros','movilidad','principiante','casa','Tumbado de lado con el hombro bajo, llevar el antebrazo al suelo','El hombro necesita movilidad de rotación interna para prevenir lesiones',NULL),
(eid,'Prone Y-T-W (Y-T-W en prono)','aislamiento','manguito_rotador','deltoides_posterior,trapecio','rehabilitacion','principiante','casa','Tumbado boca abajo, dibujar Y, T y W con los brazos elevados','Activa los rotadores externos y estabilizadores de la escápula',NULL),
(eid,'Scapular push-up (flexión escapular)','estabilizacion','escapula','serrato','rehabilitacion','principiante','casa','En posición de plancha, hundir y elevar la escápula sin doblar los codos','Activa el serrato anterior, clave para la estabilidad de la escápula',NULL),
(eid,'Band pull-apart (separación de banda)','traccion_horizontal','deltoides_posterior','trapecio_medio,manguito_rotador','rehabilitacion','principiante','casa','Estirar la banda horizontalmente separando los brazos a los lados','Fundamental para el equilibrio muscular del hombro en las personas de oficina',NULL),
(eid,'Shoulder CARs (rotaciones de control articular)','movilidad','hombros','manguito_rotador','movilidad','principiante','casa','Rotaciones lentas y completas del hombro en todo su rango','CAR = Controlled Articular Rotation; máxima tensión durante todo el arco',NULL),

-- ============================================================
-- PIERNA COMPLETA — VARIACIONES MÁQUINA
-- ============================================================
(eid,'Leg press wide stance (prensa pies abiertos)','sentadilla','aductores','gluteos,cuadriceps','hipertrofia','principiante','gimnasio','Prensa de pierna con los pies en posición ancha','El stance más ancho activa más los aductores y el glúteo mayor',NULL),
(eid,'Leg press high feet (prensa pies altos)','sentadilla','isquiotibiales','gluteos','hipertrofia','principiante','gimnasio','Prensa con los pies en la parte alta de la plataforma','Mayor activación de isquiotibiales y glúteo, menor de cuádriceps',NULL),
(eid,'Leg press calf raise (gemelo en prensa)','aislamiento','pantorrilla','soleo','hipertrofia','principiante','gimnasio','Elevación de talones en la prensa de piernas','Permite más peso que el gemelo de pie convencional',NULL),
(eid,'Hack squat machine (hack squat)','sentadilla','cuadriceps','gluteos,isquiotibiales','hipertrofia','principiante','gimnasio','Sentadilla en la máquina de hack squat con espalda apoyada','La inclinación de la espalda reduce el estrés lumbar',NULL),
(eid,'Smith machine squat (sentadilla en Smith)','sentadilla','cuadriceps','gluteos','fuerza','principiante','gimnasio','Sentadilla con barra guiada en el multipower','La guía permite más comodidad para principiantes',NULL),
(eid,'Leg extension drop set (extensión con caída)','aislamiento','cuadriceps','rodilla','hipertrofia','intermedio','gimnasio','Serie decreciente en la máquina de extensión de cuádriceps','Al fallar, reduce el peso 20-30% y continúa inmediatamente',NULL),
(eid,'Seated leg curl (curl femoral sentado)','aislamiento','isquiotibiales','pantorrilla','hipertrofia','principiante','gimnasio','Curl de isquiotibial en máquina sentado','La posición de la cadera en 90° cambia el énfasis respecto al curl tumbado',NULL),
(eid,'Abductor machine (máquina de abductores)','aislamiento','abductores','gluteos_medios','hipertrofia','principiante','gimnasio','Apertura lateral de piernas en la máquina de abductores','Bajo la tensión de la máquina, el glúteo medio trabaja en todo el rango',NULL),
(eid,'Adductor machine (máquina de aductores)','aislamiento','aductores','puboisquiotibial','hipertrofia','principiante','gimnasio','Cierre lateral de piernas en la máquina de aductores','Trabaja la musculatura interna del muslo, frecuentemente descuidada',NULL),

-- ============================================================
-- PECHO — VARIACIONES CON CABLE Y MÁQUINA
-- ============================================================
(eid,'Cable crossover high to low (cruce de poleas de arriba)','aislamiento','pecho_inferior','deltoides_anterior','hipertrofia','principiante','gimnasio','Cruce de poleas desde posición alta hacia abajo y al centro','El arco de cierre activa la parte inferior del pecho',NULL),
(eid,'Cable crossover low to high (cruce de poleas de abajo)','aislamiento','pecho_superior','deltoides_anterior','hipertrofia','principiante','gimnasio','Cruce de poleas desde posición baja hacia arriba y al centro','Activa la porción clavicular del pecho mejor que el press inclinado',NULL),
(eid,'Single arm cable fly (apertura con un brazo)','aislamiento','pecho','deltoides_anterior','hipertrofia','intermedio','gimnasio','Apertura de pecho unilateral con cable','Permite una mayor rotación y un ROM completo, diferente al bilateral',NULL),
(eid,'Pec deck fly (mariposa en máquina)','aislamiento','pecho','deltoides_anterior','hipertrofia','principiante','gimnasio','Apertura de pecho en la máquina pec deck o mariposa','La máquina guía el movimiento y facilita el aislamiento del pecho',NULL),
(eid,'Chest press machine (press de pecho en máquina)','empuje_horizontal','pecho','triceps,hombros','hipertrofia','principiante','gimnasio','Press de pecho en máquina guiada','Ideal para principiantes o para la última serie hasta el fallo sin riesgo',NULL),
(eid,'Incline cable press (press inclinado en cable)','empuje_horizontal','pecho_superior','triceps,deltoides_anterior','hipertrofia','intermedio','gimnasio','Press en banco inclinado usando las poleas en lugar de barra o mancuernas','Las poleas mantienen tensión constante en todo el recorrido',NULL),

-- ============================================================
-- ESPALDA — REMOS ADICIONALES
-- ============================================================
(eid,'Pendlay row (remo Pendlay)','traccion_horizontal','espalda','biceps,trapecio','fuerza','intermedio','gimnasio','Remo con barra con pausa completa en el suelo entre repeticiones','La barra toca el suelo y la espalda permanece horizontal',NULL),
(eid,'T-bar row (remo T)','traccion_horizontal','espalda','biceps,trapecio','fuerza','intermedio','gimnasio','Remo con barra anclada en el extremo, similar al remo con barra pero en ángulo','El agarre neutro reduce el estrés en el bíceps comparado con el supino',NULL),
(eid,'Seal row (remo foca)','traccion_horizontal','espalda','biceps','hipertrofia','intermedio','gimnasio','Remo con pecho apoyado en banco elevado, totalmente libre de balance','El apoyo del pecho elimina completamente el impulso de la espalda baja',NULL),
(eid,'Chest supported dumbbell row (remo en banco inclinado)','traccion_horizontal','espalda','biceps,trapecio','hipertrofia','principiante','gimnasio','Remo con mancuernas con pecho apoyado en banco inclinado a 45°','Elimina la compensación lumbar sin necesidad de banco especial',NULL),
(eid,'High cable row (remo de polea alta)','traccion_horizontal','espalda_alta','trapecio,deltoides_posterior','hipertrofia','principiante','gimnasio','Remo con la polea por encima de la cabeza, tirando hacia la cara','Activa la parte superior de la espalda y los romboides',NULL),
(eid,'Cable pull-over (pullover en polea)','traccion_vertical','espalda','pecho,core','hipertrofia','intermedio','gimnasio','Pullover usando la polea alta con cuerda o barra recta','La polea mantiene tensión en todo el rango, a diferencia del disco',NULL),

-- ============================================================
-- BRAZOS — BÍCEPS VARIACIONES
-- ============================================================
(eid,'Spider curl (curl araña)','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl de bíceps en banco inclinado con el pecho hacia abajo','El ángulo aisla el pico del bíceps',NULL),
(eid,'Concentration curl (curl de concentración)','aislamiento','biceps','braquiorradial','hipertrofia','principiante','gimnasio','Curl de bíceps apoyando el codo en el muslo interno','Alta activación del pico del bíceps por el ángulo de trabajo',NULL),
(eid,'Machine curl (curl en máquina)','aislamiento','biceps','braquiorradial','hipertrofia','principiante','gimnasio','Curl de bíceps en la máquina con asiento y apoyo de codos','Permite llevar el bíceps al fallo de forma segura',NULL),
(eid,'Cable curl EZ bar (curl con barra EZ en cable)','aislamiento','biceps','braquiorradial','hipertrofia','principiante','gimnasio','Curl con barra EZ en la polea baja, tensión constante','La barra EZ reduce el estrés en la muñeca respecto a la recta',NULL),
(eid,'Reverse grip curl (curl de agarre invertido)','aislamiento','braquiorradial','biceps','hipertrofia','principiante','gimnasio','Curl con agarre en pronación (palmas hacia abajo)','Énfasis en el braquiorradial y el braquial anterior',NULL),
(eid,'Hammer curl to press (curl martillo a press)','full_body','biceps','hombros,triceps','fuerza','intermedio','gimnasio','Curl martillo que se convierte en press overhead al subir','Ejercicio compuesto que integra bíceps y hombros en una serie',NULL),

-- ============================================================
-- BRAZOS — TRÍCEPS VARIACIONES
-- ============================================================
(eid,'Overhead cable tricep extension (extensión de tríceps overhead)','aislamiento','triceps','hombros','hipertrofia','principiante','gimnasio','Extensión de tríceps con polea alta pasando el cable por encima de la cabeza','La posición overhead estira la cabeza larga del tríceps',NULL),
(eid,'Single arm overhead dumbbell extension','aislamiento','triceps','hombros','hipertrofia','principiante','gimnasio','Extensión de tríceps sobre la cabeza con una sola mancuerna','Unilateral para corregir desequilibrios entre brazos',NULL),
(eid,'Close grip push-up (flexión agarre estrecho)','empuje_horizontal','triceps','pecho','fuerza','principiante','casa','Flexión con las manos juntas bajo el pecho, codos hacia atrás','Mayor activación del tríceps que la flexión convencional',NULL),
(eid,'Tate press (press Tate)','aislamiento','triceps','pecho','hipertrofia','intermedio','gimnasio','Mancuernas en press de banca, llevar el extremo al pecho doblando los codos hacia afuera','Movimiento poco común que aisla el tríceps de forma diferente',NULL),
(eid,'Tricep cable pushdown with bar (press de tríceps en cable con barra)','aislamiento','triceps','antebrazos','hipertrofia','principiante','gimnasio','Press hacia abajo con polea alta usando barra recta','La barra recta pone en supinación la muñeca, diferente a la EZ',NULL),

-- ============================================================
-- ENTRENAMIENTO EN CASA — COMPLETO
-- ============================================================
(eid,'Chair dip (fondos en silla)','empuje_vertical','triceps','pecho,hombros','fuerza','principiante','casa','Fondos con las manos en el borde de una silla y los pies en el suelo','Las piernas dobladas a 90° = más fácil; extendidas = más difícil',NULL),
(eid,'Towel row (remo con toalla)','traccion_horizontal','espalda','biceps','fuerza','principiante','casa','Remo con una toalla enrollada en una puerta o escalera','Sin material de gym, un sustituto efectivo del remo en polea',NULL),
(eid,'Door frame row (remo en marco de puerta)','traccion_horizontal','espalda','biceps','fuerza','principiante','casa','Remo agarrando el marco de la puerta y recostándote hacia atrás','El ángulo del cuerpo controla la dificultad',NULL),
(eid,'Couch push-up variation (flexión sobre sofá)','empuje_horizontal','pecho','triceps,hombros','fuerza','principiante','casa','Flexión con las manos o los pies apoyados en el sofá','Manos elevadas = más fácil (pecho inferior); pies elevados = más difícil (pecho superior)',NULL),
(eid,'Bodyweight good morning (buenos días con peso corporal)','bisagra_cadera','isquiotibiales','espalda_baja,gluteos','fuerza','principiante','casa','Bisagra de cadera con las manos detrás de la cabeza','Introduce el patrón de bisagra sin necesidad de barra',NULL),
(eid,'Step-up with knee drive (subida al escalón con rodilla)','sentadilla','cuadriceps','gluteos','fuerza','principiante','casa','Subir a un escalón o escalera y elevar la rodilla contraria al pecho','El drive de rodilla activa el core y el flexor de cadera',NULL),
(eid,'Tricep extension on floor (extensión de tríceps en suelo)','aislamiento','triceps','hombros','fuerza','principiante','casa','Extender los brazos desde la posición de codos doblados en el suelo','Similar a la extensión de cráneo pero en el suelo',NULL),
(eid,'Lying leg raise scissor (tijera tumbado)','aislamiento','core','flexores_cadera','hipertrofia','principiante','casa','Movimiento de tijera con las piernas elevadas tumbado boca arriba','La lumbar pegada al suelo previene compensaciones',NULL),
(eid,'Reverse crunch weighted (crunch inverso con peso)','aislamiento','core','flexores_cadera','hipertrofia','intermedio','casa','Crunch inverso sosteniendo una mancuerna entre los pies','El peso añadido intensifica el trabajo del core inferior',NULL),
(eid,'Explosive push-up one arm touch (flexión explosiva con toque)','potencia','pecho','triceps,hombros','potencia','avanzado','casa','Flexión explosiva con despegue y tocar el hombro opuesto en el aire','Combina la potencia de la flexión explosiva con la inestabilidad del control unilateral',NULL),

-- ============================================================
-- CICLISMO Y DEPORTES DE EQUIPO
-- ============================================================
(eid,'Stationary bike sprint (sprint en bici estática)','cardio','cuadriceps','gluteos,pantorrilla','cardio','principiante','gimnasio','Sprint de alta intensidad en la bicicleta estática','10-30 segundos de esfuerzo máximo, seguidos de recuperación',NULL),
(eid,'Rowing machine intervals (remo ergómetro por intervalos)','cardio','full_body','espalda,cuadriceps,core','cardio','principiante','gimnasio','Intervalos en el ergómetro de remo','El remo es uno de los pocos cardios que integra todo el cuerpo',NULL),
(eid,'Elliptical cross-trainer (elíptica)','cardio','full_body','cuadriceps,gluteos,hombros','cardio','principiante','gimnasio','Cardio de bajo impacto en la máquina elíptica','Sin impacto articular, ideal para personas con problemas de rodilla',NULL),
(eid,'Ski erg (ski erg)','cardio','hombros','core,espalda,cuadriceps','cardio','intermedio','gimnasio','Movimiento de doble palada de esquí nórdico en el ergómetro','El movimiento es de arriba a abajo con ambos brazos simultáneamente',NULL),
(eid,'Air bike (bici de aire assault)','cardio','full_body','cuadriceps,hombros,core','cardio','principiante','gimnasio','Bicicleta con brazos móviles que aumenta resistencia con la velocidad','Cuanto más rápido pedaleas, más resistencia ofrece la máquina',NULL),
(eid,'Stair climber machine (escaladora)','cardio','cuadriceps','gluteos,pantorrilla','cardio','principiante','gimnasio','Máquina de escalones para cardio de baja velocidad y alta intensidad','La cadencia lenta permite trabajar más el glúteo y el cuádriceps',NULL),

-- ============================================================
-- FUNCIONAL Y DEPORTIVO ADICIONAL
-- ============================================================
(eid,'Box step-up explosive (subida al cajón explosiva)','potencia','cuadriceps','gluteos,pantorrilla','potencia','intermedio','gimnasio','Subir al cajón de forma explosiva empujando con la pierna del cajón','El impulso de la pierna en el cajón sin apoyo de la pierna en el suelo',NULL),
(eid,'Kettlebell swing one arm (swing unilateral KB)','bisagra_cadera','gluteos','isquiotibiales,core,espalda','potencia','intermedio','gimnasio','Swing de kettlebell con un solo brazo','Mayor rotación antirotacional del core que el swing bilateral',NULL),
(eid,'Double kettlebell swing (swing doble KB)','bisagra_cadera','gluteos','isquiotibiales,core','potencia','intermedio','gimnasio','Swing de kettlebell con dos campanas simultáneas','Requiere mayor fuerza pero elimina el componente antirotacional',NULL),
(eid,'Kettlebell high pull (tracción alta KB)','olimpico','full_body','hombros,espalda,cuadriceps','potencia','intermedio','gimnasio','Swing que se convierte en tracción hasta los hombros','Precursor del clean, desarrolla la potencia de la cadena posterior',NULL),
(eid,'Alternating lunge jumps (zancadas con salto alternas)','potencia','cuadriceps','gluteos,pantorrilla','potencia','intermedio','exterior','Zancada estática que explota en un salto cambiando las piernas en el aire','Mayor demanda cardiovascular y pliométrica que el split squat jump',NULL),
(eid,'Lateral shuffle (paso lateral)','agilidad','cuadriceps','abductores,gluteos','agilidad','principiante','exterior','Desplazamiento lateral rápido con los pies sin cruzarse','Fundamental para el juego defensivo en deportes de equipo',NULL),
(eid,'Defensive slide drill (drill de deslizamiento defensivo)','agilidad','cuadriceps','abductores,gluteos','agilidad','principiante','exterior','Posición de defensa y deslizamientos laterales seguidos de sprints','Posición baja de cadera todo el tiempo, pies nunca juntos del todo',NULL),
(eid,'Hip hinge with wall touch (bisagra con toque de pared)','bisagra_cadera','isquiotibiales','espalda_baja,gluteos','movilidad','principiante','casa','Bisagra de cadera con los glúteos tocando la pared, enseña el patrón','La pared da retroalimentación propioceptiva inmediata',NULL),
(eid,'Good morning squat (buenos días + sentadilla)','full_body','isquiotibiales','cuadriceps,espalda_baja','fuerza','intermedio','gimnasio','Buenos días que se convierte en sentadilla al llegar al paralelo','Entrenamiento del patrón de bisagra a sentadilla de forma continua',NULL),
(eid,'Zercher squat (sentadilla Zercher)','sentadilla','cuadriceps','espalda_alta,core,biceps','fuerza','avanzado','gimnasio','Sentadilla con la barra en el pliegue del codo, no en los hombros','Exige mucha fuerza del core y del upper back; posición inusual',NULL),
(eid,'Safety bar squat (sentadilla barra de seguridad)','sentadilla','cuadriceps','gluteos,espalda_alta','fuerza','intermedio','gimnasio','Sentadilla con barra de seguridad con apoyos de hombro','Menor estrés en hombros y muñecas que la sentadilla frontal con barra estándar',NULL),
(eid,'Cambered bar bench press (press con barra camber)','empuje_horizontal','pecho','triceps,hombros','fuerza','avanzado','gimnasio','Press de banca con barra curva que permite mayor descenso','El arco de la barra extiende el ROM por debajo del pecho',NULL),
(eid,'Trap bar deadlift (peso muerto con trampa hex)','bisagra_cadera','isquiotibiales','cuadriceps,gluteos,espalda_baja','fuerza','principiante','gimnasio','Peso muerto con la barra hexagonal, de pie en el interior','El centro de gravedad más cercano al cuerpo reduce el estrés lumbar',NULL),
(eid,'Axle bar deadlift (peso muerto con barra ejes)','bisagra_cadera','isquiotibiales','gluteos,espalda_baja,antebrazos','fuerza','avanzado','gimnasio','Peso muerto con barra de mayor diámetro que entrena el agarre','El agarre es el factor limitante; desarrolla la fuerza de mano',NULL),
(eid,'Farmer walk with Fat Gripz (granjero con agarre grueso)','full_body','antebrazos','trapecio,core','fuerza','intermedio','gimnasio','Caminata de granjero con adaptadores de agarre grueso en las mancuernas','Multiplica la dificultad para el agarre',NULL);

-- ============================================================
-- COMPLEMENTO FINAL — LLEGA A 1000+
-- ============================================================
INSERT INTO ejercicios_biblioteca (entrenador_id, nombre, patron, grupo_muscular, grupo_secundario, tipo, nivel, modalidad, descripcion, consejos_tecnica, youtube_url) VALUES
(eid,'Arnold press (press Arnold)','empuje_vertical','hombros','triceps,deltoides_anterior','hipertrofia','intermedio','gimnasio','Press de hombros con rotación de muñecas, creado por Arnold Schwarzenegger','Empieza con palmas hacia ti, gira a palmas hacia fuera al subir',NULL),
(eid,'Bayesian curl (curl Bayesiano)','aislamiento','biceps','braquiorradial','hipertrofia','intermedio','gimnasio','Curl de bíceps con polea desde atrás, codo detrás del cuerpo','El ángulo único de la polea trabaja el bíceps en posición extendida',NULL),
(eid,'Cable lateral raise (elevación lateral con cable)','aislamiento','deltoides_lateral','trapecio','hipertrofia','principiante','gimnasio','Elevación lateral de hombros con cable en lugar de mancuerna','El cable mantiene tensión al principio del movimiento, donde la mancuerna no',NULL),
(eid,'Lateral raise machine (máquina de elevaciones laterales)','aislamiento','deltoides_lateral','trapecio','hipertrofia','principiante','gimnasio','Elevación lateral de hombros en máquina','La máquina permite hacer drop sets con facilidad',NULL),
(eid,'Dumbbell pullover (pullover con mancuerna)','traccion_vertical','espalda','pecho,core','hipertrofia','principiante','gimnasio','Tumbado en banco, mancuerna desde el pecho hacia atrás de la cabeza','¿Pecho o espalda? Depende del ángulo: codos flexionados = pecho; extendidos = dorsal',NULL),
(eid,'Hip abduction standing band (abducción de pie con banda)','aislamiento','abductores','gluteos_medios','hipertrofia','principiante','casa','Abducción lateral de cadera de pie con mini banda en los tobillos','Mantén el tronco recto, el movimiento solo viene de la cadera',NULL),
(eid,'Donkey kick with band (patada de burro con banda)','aislamiento','gluteos','isquiotibiales','hipertrofia','principiante','casa','Patada de glúteo a cuatro apoyos con mini banda en los tobillos','La banda añade resistencia en el punto de máxima contracción',NULL),
(eid,'Step-up to reverse lunge (subida + zancada inversa)','sentadilla','cuadriceps','gluteos,isquiotibiales','fuerza','intermedio','gimnasio','Subir al escalón con una pierna, bajar al otro lado en zancada inversa','Combina el patrón de subida y la zancada inversa en un movimiento fluido',NULL),
(eid,'Decline sit-up (abdominal en banco declinado)','aislamiento','core','flexores_cadera','hipertrofia','principiante','gimnasio','Abdominal clásico en banco declinado, más rango de movimiento','El ROM extra en posición declinada activa más el recto abdominal',NULL),
(eid,'Cable crunch kneeling (crunch en cable arrodillado)','aislamiento','core','oblicuos','hipertrofia','principiante','gimnasio','Crunch arrodillado sosteniendo la cuerda de la polea alta en la nuca','El cable permite ajustar la resistencia para llevar el core al fallo',NULL),
(eid,'Landmine press single arm (landmine unilateral)','empuje_horizontal','pecho','deltoides_anterior,triceps','fuerza','principiante','gimnasio','Press unilateral con landmine, de pie o arrodillado','Muy amigable para el hombro gracias al arco natural de la barra',NULL),
(eid,'Copenhagen side plank hip abduction','estabilizacion','aductores','core,abductores','fuerza','avanzado','gimnasio','Plancha lateral Copenhagen con abducción de la cadera libre','Combina la estabilidad de la Copenhagen con el trabajo de abductores',NULL),
(eid,'Swiss ball hamstring curl (curl de isquio en fitball)','aislamiento','isquiotibiales','gluteos,pantorrilla','hipertrofia','intermedio','casa','Tumbado, pies en el fitball, curlar los isquiotibiales llevando los talones al glúteo','Difícil de estabilizar, trabaja también la cadena posterior global',NULL),
(eid,'Swiss ball pike (pike en fitball)','estabilizacion','core','hombros,isquiotibiales','fuerza','avanzado','casa','Pies en fitball, llevar las caderas arriba formando un ángulo agudo','Exige gran fuerza de core y estabilidad de hombros simultáneamente',NULL),
(eid,'Dead bug with resistance band (dead bug con banda)','estabilizacion','core','hombros,flexores_cadera','fuerza','intermedio','casa','Dead bug sosteniendo una banda entre manos y la rodilla contraria','La banda añade resistencia y da retroalimentación propioceptiva',NULL),
(eid,'Running man (hombre corriendo)','cardio','full_body','cuadriceps,core,hombros','cardio','principiante','casa','Simulación de carrera en el sitio con movimiento exagerado de brazos y rodillas','Excelente para el calentamiento o como ejercicio de cardio de bajo impacto',NULL),
(eid,'Broad jump with landing (salto horizontal con aterrizaje)','potencia','cuadriceps','gluteos,pantorrilla,isquiotibiales','potencia','intermedio','exterior','Salto horizontal máximo con aterrizaje controlado y amortiguado','El aterrizaje es tan importante como el salto: rodillas dobladas, suave',NULL),
(eid,'Lateral squat (sentadilla lateral)','sentadilla','aductores','cuadriceps,gluteos','movilidad','principiante','casa','Sentadilla lateral desplazando el peso a una pierna extendida y la otra doblada','Trabaja el plano frontal, frecuentemente ignorado en el entrenamiento de pierna',NULL),
(eid,'Jefferson deadlift (peso muerto Jefferson)','bisagra_cadera','isquiotibiales','cuadriceps,espalda_baja,core','fuerza','avanzado','gimnasio','Peso muerto con la barra entre las piernas y perpendicular al cuerpo','Movimiento asimétrico único que trabaja la cadena posterior en rotación',NULL),
(eid,'Offset dumbbell squat (sentadilla con peso asimétrico)','sentadilla','cuadriceps','core,oblicuos,gluteos','fuerza','intermedio','gimnasio','Sentadilla sosteniendo una mancuerna solo en un hombro','El desequilibrio activa el core para mantener la postura vertical',NULL),
(eid,'Plate pinch (presión del disco)','aislamiento','antebrazos','manos','fuerza','principiante','gimnasio','Sostener un disco de cada lado solo con los dedos','Desarrolla la fuerza de pellizco, diferente a la fuerza de agarre convencional',NULL),
(eid,'Dead hang (colgado en barra)','aislamiento','antebrazos','hombros,espalda','fuerza','principiante','gimnasio','Colgar de la barra con ambas manos el mayor tiempo posible','Descomprime la columna y trabaja el agarre y los hombros a la vez',NULL),
(eid,'Active hang (colgado activo)','estabilizacion','escapula','hombros,antebrazos','fuerza','principiante','gimnasio','Como el dead hang pero con las escápulas deprimidas y activadas','La diferencia es que el serrato y el trapecio inferior están activos',NULL),
(eid,'Neck nod (afirmación de cuello)','movilidad','cuello','suboccipitales','movilidad','principiante','casa','Pequeño movimiento de afirmación con la cabeza, como decir "sí"','Activa los flexores profundos del cuello, clave para la postura',NULL),
(eid,'Chin tuck (retracción de mentón)','movilidad','cuello','suboccipitales','rehabilitacion','principiante','casa','Empujar el mentón hacia atrás creando una papada, sin bajar la cabeza','Corrige la postura de cabeza hacia adelante (texto neck)',NULL),
(eid,'Wall angel (ángel en pared)','movilidad','hombros','espalda_alta,trapecio','movilidad','principiante','casa','De pie contra la pared, subir y bajar los brazos manteniendo contacto','Si los brazos se separan de la pared, la movilidad de hombro es limitada',NULL),
(eid,'Floor angel (ángel en suelo)','movilidad','hombros','espalda_alta,core','movilidad','principiante','casa','Lo mismo que el wall angel pero tumbado boca arriba en el suelo','El suelo da más retroalimentación que la pared',NULL),
(eid,'Hip shift squat (sentadilla con cambio de cadera)','movilidad','cadera','cuadriceps,aductores','movilidad','principiante','casa','Sentadilla profunda con oscilaciones laterales de la cadera en el punto bajo','Moviliza la articulación coxofemoral en el rango de movimiento más profundo',NULL),
(eid,'Cossack squat (sentadilla cosaca)','movilidad','aductores','cadera,cuadriceps,isquiotibiales','movilidad','intermedio','casa','Sentadilla lateral alternando el peso de lado a lado en posición muy abierta','Excelente para la movilidad de cadera y la fuerza de aductores simultáneamente',NULL);

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
RAISE NOTICE 'Parte 5 insertada correctamente.';

END $$;
