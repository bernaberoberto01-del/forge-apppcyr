-- ============================================================
-- SEED PARTE 4: Biblioteca de Ejercicios — Forge Studio
-- Lleva el total a 1000+ ejercicios
-- ============================================================

DO $$
DECLARE
  eid UUID := '0b908e25-f69f-472c-9972-87bc93d67e65';
BEGIN

-- ============================================================
-- CROSSFIT / WOD — MOVIMIENTOS ESPECÍFICOS
-- ============================================================
INSERT INTO ejercicios_biblioteca (entrenador_id, nombre, patron, grupo_muscular, grupo_secundario, tipo, nivel, modalidad, descripcion, consejos_tecnica, youtube_url) VALUES
(eid,'Thruster (sentadilla + press)','full_body','cuadriceps','hombros,triceps,gluteos','potencia','intermedio','gimnasio','Sentadilla frontal que termina en press vertical','El impulso de piernas transfiere la energía a los brazos directamente',NULL),
(eid,'Cluster (clean + thruster)','full_body','full_body','cuadriceps,hombros,espalda','potencia','avanzado','gimnasio','Clean + pausa en rack frontal + thruster encadenados','Movimiento complejo de todo el cuerpo, muy demandante',NULL),
(eid,'Devil press (mancuerna)','full_body','full_body','hombros,cuadriceps,core','potencia','avanzado','gimnasio','Burpee sobre mancuernas + swing + press overhead','El swing usa el impulso del burpee para llevar las pesas arriba',NULL),
(eid,'Dumbbell snatch (arrancada con mancuerna)','olimpico','full_body','hombros,cuadriceps,espalda','potencia','intermedio','gimnasio','Arrancada unilateral con mancuerna desde el suelo','La extensión de cadera + tracción del brazo = mancuerna en alto',NULL),
(eid,'Single arm dumbbell clean (clean unilateral)','olimpico','full_body','cuadriceps,hombros,espalda','potencia','intermedio','gimnasio','Clean unilateral con mancuerna','Más accesible que el clean con barra para comenzar',NULL),
(eid,'Dumbbell hang power clean','olimpico','full_body','cuadriceps,hombros','potencia','intermedio','gimnasio','Power clean con mancuernas desde colgado','Las mancuernas al frente de los muslos, triple extensión explosiva',NULL),
(eid,'Kettlebell clean (clean con kettlebell)','olimpico','full_body','cuadriceps,hombros,espalda','potencia','intermedio','gimnasio','Clean con kettlebell, la campana rueda alrededor de la muñeca','La muñeca NO golpea la campana, rota suavemente al final',NULL),
(eid,'Kettlebell snatch (arrancada con kettlebell)','olimpico','full_body','hombros,cuadriceps,espalda','potencia','intermedio','gimnasio','Arrancada con kettlebell, movimiento continuo al overhead','La campana flota en el arco, no golpea el antebrazo',NULL),
(eid,'Turkish get-up (levantamiento turco)','full_body','hombros','core,cuadriceps,gluteos','fuerza','avanzado','gimnasio','Pasar de tumbado a de pie con la pesa en alto, siempre mirando la mancuerna','7 pasos distintos, la vista en la pesa en todo momento',NULL),
(eid,'Kettlebell windmill (molino)','aislamiento','core','hombros,oblicuos,isquiotibiales','movilidad','avanzado','gimnasio','Con kettlebell overhead, inclinar lateralmente el torso','La kettlebell permanece fija, el torso rota hacia el suelo',NULL),
(eid,'Kettlebell halo (halo)','movilidad','hombros','core,triceps','movilidad','principiante','gimnasio','Círculos alrededor de la cabeza con la kettlebell','El círculo amplio estabiliza el manguito rotador',NULL),
(eid,'Double kettlebell front squat','sentadilla','cuadriceps','gluteos,core,hombros','fuerza','avanzado','gimnasio','Sentadilla frontal con dos kettlebells en rack','La posición de rack de kettlebell difiere de la barra: codos altos',NULL),
(eid,'Kettlebell overhead squat (sentadilla overhead KB)','sentadilla','cuadriceps','gluteos,hombros,core','fuerza','avanzado','gimnasio','Sentadilla con kettlebell sobre la cabeza','Exige movilidad de hombro, tobillo y cadera simultáneamente',NULL),
(eid,'Double kettlebell push press','empuje_vertical','hombros','triceps,cuadriceps','potencia','intermedio','gimnasio','Push press con dos kettlebells en posición de rack','Impulso de piernas + press explosivo de ambos brazos',NULL),
(eid,'Kettlebell gorilla row (remo gorila KB)','traccion_horizontal','espalda','biceps,core','fuerza','intermedio','gimnasio','Remo alternativo con dos kettlebells en suelo','Mismo patrón que el gorila row pero con kettlebells',NULL),
(eid,'Sandbag squat (sentadilla con saco de arena)','sentadilla','cuadriceps','gluteos,core','fuerza','principiante','exterior','Sentadilla con saco de arena sobre los hombros','La inestabilidad del saco activa más el core',NULL),
(eid,'Sandbag carry (caminata con saco)','full_body','core','trapecio,cuadriceps','fuerza','principiante','exterior','Caminata con saco de arena en distintas posiciones','Bear hug, shoulder, overhead: cada posición cambia el estímulo',NULL),
(eid,'Sandbag over shoulder (saco de arena al hombro)','full_body','full_body','cuadriceps,espalda,core','potencia','intermedio','exterior','Levantar el saco del suelo y lanzarlo por encima del hombro','Movimiento de bisagra + rotación explosiva del torso',NULL),
(eid,'Stone carry (arrastre de piedra)','full_body','core','trapecio,cuadriceps,espalda','fuerza','avanzado','exterior','Cargar y transportar una piedra o balón pesado','La piedra de atlas es el ejemplo clásico de strongman',NULL),

-- ============================================================
-- PLIOMETRÍA AVANZADA
-- ============================================================
(eid,'Depth jump (salto desde cajón)','potencia','cuadriceps','gluteos,pantorrilla','potencia','avanzado','gimnasio','Caer desde el cajón y rebotar inmediatamente al siguiente','El tiempo de contacto con el suelo debe ser mínimo (< 0.2s)',NULL),
(eid,'Drop squat (caída a sentadilla)','potencia','cuadriceps','gluteos','potencia','intermedio','gimnasio','Caer desde una posición elevada y absorber el impacto en sentadilla','Desarrolla la capacidad de absorción de impacto',NULL),
(eid,'Broad jump (salto de longitud)','potencia','cuadriceps','gluteos,pantorrilla','potencia','intermedio','exterior','Salto horizontal máximo con ambos pies','El ángulo de 45° maximiza el desplazamiento horizontal',NULL),
(eid,'Standing triple jump (triple salto estático)','potencia','cuadriceps','gluteos,pantorrilla','potencia','avanzado','exterior','Tres saltos consecutivos: hop + step + jump','Secuencia: mismo pie → pie opuesto → ambos pies',NULL),
(eid,'Pogo hops (saltos pogo)','potencia','pantorrilla','cuadriceps','potencia','principiante','exterior','Saltos rápidos y consecutivos con los pies juntos','Solo el tobillo trabaja, las rodillas casi no se doblan',NULL),
(eid,'Single leg hop series (serie de saltos unilaterales)','potencia','cuadriceps','gluteos,pantorrilla','potencia','intermedio','exterior','Serie de saltos en una sola pierna hacia adelante','Cuántos saltos consecutivos con la misma pierna',NULL),
(eid,'Ice skater jumps (saltos patinadora)','potencia','cuadriceps','gluteos,abductores','potencia','principiante','exterior','Saltos laterales alternos imitando el patinaje de velocidad','Aterriza en un pie y mantén el equilibrio un momento',NULL),
(eid,'Star jump (estrella)','potencia','cuadriceps','gluteos,hombros','potencia','principiante','casa','Salto al que abre brazos y piernas en forma de estrella','Variante más intensa del jumping jack',NULL),
(eid,'Tuck jump series (saltos con rodillas al pecho)','potencia','cuadriceps','gluteos,core','potencia','intermedio','exterior','Saltos consecutivos llevando las rodillas al pecho','La rapidez de la recogida de rodillas es clave',NULL),
(eid,'Reactive single leg lateral bound','potencia','cuadriceps','abductores,gluteos','potencia','avanzado','exterior','Saltos laterales reactivos en una sola pierna','Sin tiempo de pausa al aterrizar, rebote inmediato',NULL),

-- ============================================================
-- EJERCICIOS ESPECÍFICOS PARA RUNNING
-- ============================================================
(eid,'High knees running (rodillas altas corriendo)','cardio','cuadriceps','flexores_cadera,pantorrilla','cardio','principiante','exterior','Correr en el sitio elevando las rodillas al 90°','Los brazos se balancean al ritmo de las piernas',NULL),
(eid,'A-skips (skip A)','agilidad','cuadriceps','flexores_cadera,pantorrilla','agilidad','principiante','exterior','Zancada exagerada con elevación de rodilla, ritmo de marcha rápida','La base para mejorar la mecánica de carrera',NULL),
(eid,'B-skips (skip B)','agilidad','cuadriceps','isquiotibiales,pantorrilla','agilidad','intermedio','exterior','Como el A-skip pero extendiendo la pierna en el punto alto','Trabaja la extensión activa de la pierna en el ciclo de carrera',NULL),
(eid,'Bounding (zancadas exageradas)','potencia','cuadriceps','gluteos,isquiotibiales','potencia','intermedio','exterior','Zancadas de máxima amplitud, saltando entre cada paso','Distancia en lugar de altura, propulsión máxima',NULL),
(eid,'Running drills - carioca (carioca)','agilidad','full_body','cuadriceps,abductores','agilidad','principiante','exterior','Paso lateral cruzado alternando por delante y por detrás','Desarrolla la coordinación de caderas y la agilidad lateral',NULL),
(eid,'Sprint acceleration drill (arranque de sprint)','agilidad','cuadriceps','gluteos,isquiotibiales','agilidad','intermedio','exterior','Posición de arrancada y 10m de aceleración','Los primeros 10m son los más críticos para la velocidad máxima',NULL),
(eid,'Strides (pasadas)','cardio','cuadriceps','gluteos,isquiotibiales','cardio','principiante','exterior','Aceleración progresiva durante 80-100m a 90% del máximo','Sin llegar al sprint máximo, aceleración fluida y controlada',NULL),
(eid,'Fartlek session (entrenamiento fartlek)','cardio','full_body','full_body','cardio','principiante','exterior','Cambios de ritmo durante la carrera por tiempo o señales visuales','Sin estructura fija: el terreno o la sensación dictan el cambio',NULL),
(eid,'Hill tempo run (tempo en cuesta)','cardio','cuadriceps','gluteos,pantorrilla','cardio','intermedio','exterior','Carrera a ritmo de umbral en cuesta ascendente','La cuesta añade resistencia sin incrementar el impacto articular',NULL),
(eid,'Parachute sprint (sprint con paracaídas)','cardio','cuadriceps','gluteos,isquiotibiales','potencia','avanzado','exterior','Sprint con un pequeño paracaídas de resistencia en la espalda','Aumenta la resistencia al avance para desarrollar potencia de sprint',NULL),

-- ============================================================
-- NATACIÓN Y ACUÁTICOS
-- ============================================================
(eid,'Freestyle drill catch-up (natación libre agarre)','cardio','hombros','espalda,core','cardio','principiante','exterior','Crol técnico esperando que un brazo alcance al otro antes de tirar','Mejora el timing del ciclo de brazada en crol',NULL),
(eid,'Backstroke technique (técnica espalda)','cardio','espalda','hombros,core','cardio','principiante','exterior','Natación de espalda con énfasis en la rotación del cuerpo','El cuerpo rota de lado en cada brazada, como un tocadiscos',NULL),
(eid,'Breaststroke pull drill (braza tracción)','traccion_horizontal','pecho','espalda,core','cardio','principiante','exterior','Braza usando solo los brazos con pull buoy entre piernas','Aísla el movimiento de brazos de la braza',NULL),
(eid,'Butterfly kick (patada de mariposa)','cardio','full_body','isquiotibiales,pantorrilla','cardio','avanzado','exterior','Patada de delfín para mariposa y espalda mejorada','El movimiento viene de la cadera en onda, no de las rodillas',NULL),
(eid,'Aqua running (carrera en agua)','cardio','full_body','full_body','cardio','principiante','exterior','Carrera en la piscina con chaleco de flotación','Ideal para recuperación activa post-lesión de impacto',NULL),
(eid,'Water resistance squat (sentadilla en agua)','sentadilla','cuadriceps','gluteos','fuerza','principiante','exterior','Sentadilla en la piscina hasta el pecho en profundidad','El agua ofrece resistencia proporcional a la velocidad',NULL),
(eid,'Pool edge push-up (flexión en borde de piscina)','empuje_horizontal','pecho','triceps,hombros','fuerza','principiante','exterior','Flexiones con manos en el borde de la piscina y cuerpo en el agua','Menor impacto articular que la flexión en tierra',NULL),

-- ============================================================
-- ENTRENAMIENTO CON PELOTA MEDICINAL
-- ============================================================
(eid,'Med ball slam (lanzamiento al suelo)','potencia','core','hombros,espalda,cuadriceps','potencia','principiante','gimnasio','Levantar la pelota medicinal y lanzarla al suelo con máxima fuerza','La extensión total del cuerpo al subir, contracción total al bajar',NULL),
(eid,'Med ball rotational throw (lanzamiento rotacional)','rotacion','core','oblicuos,hombros','potencia','intermedio','gimnasio','Lanzar la pelota medicinal contra la pared con rotación','La potencia viene de la rotación de cadera, no solo de los brazos',NULL),
(eid,'Med ball chest pass (pase de pecho)','empuje_horizontal','pecho','triceps,hombros','potencia','principiante','gimnasio','Pase de pelota medicinal desde el pecho a la pared','Simula el movimiento explosivo del pase de pecho en baloncesto',NULL),
(eid,'Med ball overhead throw (lanzamiento sobre la cabeza)','empuje_vertical','hombros','core,triceps,cuadriceps','potencia','intermedio','gimnasio','Lanzar la pelota medicinal sobre la cabeza hacia la pared','El cuerpo completo contribuye al lanzamiento',NULL),
(eid,'Med ball squat to press (sentadilla + press)','full_body','cuadriceps','hombros,gluteos','fuerza','principiante','gimnasio','Sentadilla sosteniendo la pelota y press al subir','Movimiento funcional que integra piernas y brazos',NULL),
(eid,'Med ball Russian twist (giro ruso con pelota)','rotacion','core','oblicuos','hipertrofia','principiante','gimnasio','Giro ruso con pelota medicinal como resistencia adicional','La pelota aumenta la resistencia rotacional',NULL),
(eid,'Med ball lunge and twist (zancada + rotación)','sentadilla','cuadriceps','core,oblicuos,gluteos','fuerza','intermedio','gimnasio','Zancada con rotación del torso hacia la pierna delantera con pelota','El giro activa la cadena cinética de forma funcional',NULL),
(eid,'Med ball wall ball squat (sentadilla a pared)','sentadilla','cuadriceps','hombros,gluteos','fuerza','intermedio','gimnasio','Sentadilla + lanzamiento de pelota medicinal a una marca en la pared','El target en la pared asegura la altura mínima de lanzamiento',NULL),
(eid,'Med ball backward overhead slam','potencia','core','hombros,espalda','potencia','avanzado','gimnasio','Lanzar la pelota hacia atrás y arriba con impulso del cuerpo completo','El movimiento de extensión total maximiza la potencia de lanzamiento',NULL),

-- ============================================================
-- ESTIRAMIENTO Y MOVILIDAD COMPLETA — SECUENCIAS
-- ============================================================
(eid,'Hip flexor stretch kneeling (estiramiento psoas arrodillado)','movilidad','flexores_cadera','cuadriceps','movilidad','principiante','casa','Estiramiento del psoas en posición de zancada arrodillado','La pelvis neutra hace el estiramiento efectivo, no arquees la lumbar',NULL),
(eid,'Piriforme stretch (estiramiento del piriforme)','movilidad','gluteos','piriforme','movilidad','principiante','casa','Estiramiento del piriforme en posición de figura 4','La rodilla de la pierna cruzada baja hacia el suelo',NULL),
(eid,'Calf stretch wall (gemelo en pared)','movilidad','pantorrilla','tendón_aquiles','movilidad','principiante','casa','Estiramiento del gemelo apoyando el pie en la pared','El talón en el suelo, la rodilla extendida para el gemelo',NULL),
(eid,'Soleus stretch bent knee (sóleo con rodilla flexionada)','movilidad','sóleo','pantorrilla','movilidad','principiante','casa','Estiramiento del sóleo con la rodilla ligeramente doblada','La rodilla doblada libera el gemelo y estira específicamente el sóleo',NULL),
(eid,'Thoracic rotation in seated (rotación torácica sentado)','movilidad','espalda_alta','oblicuos','movilidad','principiante','casa','Rotación torácica sentado en silla o suelo','Solo la parte superior de la espalda rota, la lumbar queda fija',NULL),
(eid,'Lat stretch seated (dorsal sentado)','movilidad','espalda','hombros','movilidad','principiante','casa','Extensión lateral del torso sentado para estirar el dorsal','Un brazo extendido mientras inclinas el torso hacia el lado contrario',NULL),
(eid,'Pec minor stretch (estiramiento del pectoral menor)','movilidad','pecho','hombros','movilidad','principiante','casa','Brazo en ángulo de 90° en la pared y rotación del cuerpo','El pectoral menor es clave en la postura del hombro',NULL),
(eid,'Upper trap stretch (trapecio superior)','movilidad','trapecio','hombros','movilidad','principiante','casa','Inclinar la oreja al hombro y dejar caer el peso de la cabeza','No fuerce la cabeza con la mano, el peso propio es suficiente',NULL),
(eid,'Sternocleidomastoid stretch (esternocleidomastoideo)','movilidad','cuello','hombros','movilidad','principiante','casa','Inclinación lateral y rotación contraria del cuello','Músculo que suele tensarse con el trabajo de escritorio',NULL),
(eid,'Suboccipital release (suboccipitales)','movilidad','cuello','cabeza','movilidad','principiante','casa','Pequeños movimientos de "sí" y "no" con la cabeza, muy lentos','Los suboccipitales conectan la base del cráneo con las vértebras C1-C2',NULL),
(eid,'Wrist flexor stretch (flexores de muñeca)','movilidad','antebrazos','muñeca','movilidad','principiante','casa','Extender el brazo, doblar la muñeca hacia abajo y tirar con la otra mano','Esencial para quienes hacen muchas flexiones o ejercicios de barra',NULL),
(eid,'Wrist extensor stretch (extensores de muñeca)','movilidad','antebrazos','muñeca','movilidad','principiante','casa','Doblar la muñeca hacia abajo y tirar con la otra mano hacia el cuerpo','Reduce la tensión en el antebrazo posterior',NULL),

-- ============================================================
-- PREVENCIÓN DE LESIONES RODILLA
-- ============================================================
(eid,'Terminal knee extension TKE (extensión terminal de rodilla)','aislamiento','cuadriceps','rodilla','rehabilitacion','principiante','casa','Con banda en la corva, extiende completamente la rodilla','Activa el vasto medial oblicuo (VMO) sin impacto',NULL),
(eid,'Reverse Nordic curl (curl nórdico inverso)','aislamiento','cuadriceps','flexores_cadera','fuerza','avanzado','gimnasio','Hincado de rodillas, inclinarse hacia atrás controlando la bajada con cuádriceps','Excentrico de cuádriceps muy demandante para la salud de rodilla',NULL),
(eid,'Sissy squat (sentadilla sissy)','aislamiento','cuadriceps','flexores_cadera','fuerza','avanzado','gimnasio','Sentadilla con los talones elevados y las rodillas hacia adelante','Máximo ROM del cuádriceps; solo para avanzados con rodillas sanas',NULL),
(eid,'Step-down eccentric (bajada excéntrica de escalón)','aislamiento','cuadriceps','gluteos','rehabilitacion','principiante','casa','Bajar lentamente desde un escalón sobre una pierna (excéntrico)','El cuádriceps frena la bajada de 3-5 segundos; excelente para tendinitis rotuliana',NULL),
(eid,'Clamshell with band (almeja con banda)','aislamiento','abductores','gluteos_medios','rehabilitacion','principiante','casa','Abrir la rodilla en posición de costado con mini banda','Activa el glúteo medio y el rotador externo de cadera',NULL),
(eid,'Lateral band walk advanced (caminata lateral avanzada)','aislamiento','abductores','gluteos','fuerza','intermedio','casa','Caminata lateral con banda más resistente y rango más amplio','Mayor resistencia y amplitud de paso que la básica',NULL),

-- ============================================================
-- ENTRENAMIENTO FUNCIONAL PARA MAYORES
-- ============================================================
(eid,'Chair squat (sentadilla desde silla)','sentadilla','cuadriceps','gluteos','fuerza','principiante','casa','Levantarse y sentarse en una silla con control','Uno de los movimientos más funcionales para la vida diaria',NULL),
(eid,'Toe stand from chair (gemelo desde silla)','aislamiento','pantorrilla','tobillo','fuerza','principiante','casa','Elevar los talones sentado en una silla','Variación de bajo impacto para fortalecer el gemelo',NULL),
(eid,'Seated march (marcha sentado)','cardio','flexores_cadera','cuadriceps','cardio','principiante','casa','Elevar las rodillas alternamente sentado en una silla','Excelente para personas con limitaciones de pie',NULL),
(eid,'Seated overhead press (press sentado sin peso)','empuje_vertical','hombros','triceps','fuerza','principiante','casa','Press de hombros sentado sin peso o con pesos muy ligeros','Mejora el rango de movimiento del hombro en personas mayores',NULL),
(eid,'Wall push-up (flexión en pared)','empuje_horizontal','pecho','triceps,hombros','fuerza','principiante','casa','Flexión de brazos contra la pared, de pie','La flexión más accesible, ideal para personas mayores o en rehabilitación',NULL),
(eid,'Seated leg extension no machine (extensión sin máquina)','aislamiento','cuadriceps','rodilla','fuerza','principiante','casa','Extensión de pierna sentado en una silla, sin máquina','Se puede añadir un peso suave en el tobillo si se quiere más resistencia',NULL),
(eid,'Water bottle bicep curl (curl con botella)','aislamiento','biceps','braquiorradial','fuerza','principiante','casa','Curl de bíceps usando una botella de agua llena como peso','Para personas mayores o en rehabilitación sin acceso a mancuernas',NULL),
(eid,'Heel-to-toe walk (caminar talón-punta)','agilidad','pantorrilla','tobillo,core','fuerza','principiante','casa','Caminar en línea recta colocando el talón justo delante del pie opuesto','Mejora el equilibrio y la propiocepción del tobillo',NULL),
(eid,'Single leg stance (equilibrio unilateral)','estabilizacion','tobillo','core,cuadriceps','fuerza','principiante','casa','Mantenerse de pie sobre una pierna el mayor tiempo posible','Empieza con los ojos abiertos, progresas a ojos cerrados',NULL),
(eid,'Stair climbing (subir escaleras)','cardio','cuadriceps','gluteos,pantorrilla','cardio','principiante','exterior','Subir y bajar escaleras a ritmo constante como ejercicio cardio','Bajo impacto y altamente funcional para la vida cotidiana',NULL),

-- ============================================================
-- PROGRAMAS DE CALENTAMIENTO ESPECÍFICOS
-- ============================================================
(eid,'Leg swing sagittal (balanceo frontal de pierna)','movilidad','flexores_cadera','isquiotibiales','movilidad','principiante','casa','Balanceo de pierna hacia adelante y atrás','Activa la movilidad de cadera y calienta la cadena posterior',NULL),
(eid,'Leg swing lateral (balanceo lateral de pierna)','movilidad','abductores','aductores','movilidad','principiante','casa','Balanceo de pierna de lado a lado','Calienta los aductores y abductores para el entrenamiento de pierna',NULL),
(eid,'Arm circle forward and back (círculos de brazo)','movilidad','hombros','manguito_rotador','movilidad','principiante','casa','Círculos amplios de brazo hacia adelante y hacia atrás','Calienta toda la articulación del hombro',NULL),
(eid,'Neck half circles (semicírculos de cuello)','movilidad','cuello','trapecio','movilidad','principiante','casa','Semicírculos lentos de cuello de oreja a oreja','Nunca hagas círculos completos de cuello, solo semicírculos frontales',NULL),
(eid,'Ankle circles (círculos de tobillo)','movilidad','tobillo','pantorrilla','movilidad','principiante','casa','Círculos lentos del tobillo en ambas direcciones','Fundamental antes de correr, saltar o levantar peso',NULL),
(eid,'Wrist circles (círculos de muñeca)','movilidad','muñeca','antebrazos','movilidad','principiante','casa','Círculos de muñeca en ambas direcciones','Antes de ejercicios de empuje o de barra',NULL),
(eid,'Hip circles standing (círculos de cadera de pie)','movilidad','cadera','flexores_cadera,abductores','movilidad','principiante','casa','Círculos amplios de cadera de pie, como el hula hoop','Calienta toda la articulación coxofemoral',NULL),
(eid,'Thoracic spine rotation seated (rotación torácica)','movilidad','espalda_alta','oblicuos','movilidad','principiante','casa','Rotación lenta del torso sentado, sujetando la rodilla opuesta','Excelente antes de ejercicios que requieran rotación torácica',NULL),
(eid,'World greatest stretch (el estiramiento más grande del mundo)','movilidad','full_body','full_body','movilidad','principiante','casa','Secuencia de estiramiento que combina lunge + rotación + apertura','Incluye cadera, espalda, hombro y piernas en una sola posición',NULL),
(eid,'90-90 hip stretch (estiramiento 90-90)','movilidad','cadera','piriforme,aductores','movilidad','principiante','casa','Ambas rodillas a 90° en suelo, trabajando la rotación interna y externa','Trabaja tanto el rotador externo como el interno de cadera',NULL),
(eid,'Deep squat hold (cuclilla profunda isométrica)','sentadilla','cuadriceps','aductores,tobillo,cadera','movilidad','principiante','casa','Mantener la cuclilla profunda durante 30-60 segundos','Progresa la profundidad gradualmente cada sesión',NULL),

-- ============================================================
-- EJERCICIOS DE COORDINACIÓN Y DESTREZA
-- ============================================================
(eid,'Ladder speed drills (escalera de agilidad)','agilidad','full_body','cuadriceps,pantorrilla,coordinacion','agilidad','principiante','exterior','Distintos patrones de pies en escalera de coordinación','Empieza lento para el patrón, luego añade velocidad',NULL),
(eid,'Cone drills T-run (T de conos)','agilidad','cuadriceps','gluteos,pantorrilla','agilidad','intermedio','exterior','Carrera en forma de T entre conos, cambios de dirección 90°','Prueba estándar en el combines de fútbol americano',NULL),
(eid,'5-10-5 shuttle run (shuttle run 5-10-5)','agilidad','cuadriceps','gluteos,pantorrilla','agilidad','intermedio','exterior','Sprint 5m a la derecha, 10m a la izquierda, 5m al punto de inicio','Prueba de cambio de dirección muy usada en selección deportiva',NULL),
(eid,'Pro agility drill (drill de agilidad profesional)','agilidad','cuadriceps','gluteos,pantorrilla','agilidad','avanzado','exterior','Variante de shuttle run con cambios de dirección explosivos','Los primeros pasos de aceleración son el factor diferencial',NULL),
(eid,'Ball drop reaction drill (drill de reacción)','agilidad','full_body','cuadriceps,pantorrilla','agilidad','intermedio','exterior','Un compañero suelta la pelota desde arriba, el atleta la recoge antes que bote','Entrena el tiempo de reacción y la velocidad de arranque',NULL),
(eid,'Juggling basic (malabarismo básico)','agilidad','full_body','hombros,coordinacion','agilidad','principiante','casa','Malabarismo con 2-3 pelotas','Desarrolla la coordinación ojo-mano y la concentración',NULL),
(eid,'Reaction ball drill (pelota de reacción)','agilidad','full_body','cuadriceps,hombros','agilidad','principiante','exterior','Lanzar la pelota de reacción (hexagonal) contra la pared y recogerla','El bote impredecible entrena reflejos y tiempo de reacción',NULL),

-- ============================================================
-- COMBATE Y BOXEO ADICIONAL
-- ============================================================
(eid,'Jab-cross-hook-uppercut combo (combo de boxeo)','potencia','hombros','core,biceps,oblicuos','potencia','intermedio','exterior','Combinación básica de 4 golpes de boxeo','La rotación de cadera da potencia a cada golpe',NULL),
(eid,'Slip and counter (esquivar y contraatacar)','agilidad','core','cuadriceps,hombros','agilidad','intermedio','exterior','Esquivar un golpe imaginario lateralmente y contraatacar','Desarrolla la movilidad defensiva y la coordinación del boxeo',NULL),
(eid,'Muay thai teep (patada de frente)','agilidad','cuadriceps','gluteos,flexores_cadera','agilidad','intermedio','exterior','Patada de empuje frontal de Muay Thai','La cadera se proyecta hacia adelante al ejecutar la patada',NULL),
(eid,'Brazilian jiu-jitsu guard position','estabilizacion','core','cuadriceps,aductores','fuerza','intermedio','exterior','Mantener la guardia de BJJ tumbado con las piernas alrededor del oponente','El control de caderas es más importante que la fuerza bruta',NULL),
(eid,'Shadow boxing freestyle (boxeo de sombra libre)','cardio','hombros','core,cuadriceps,full_body','cardio','principiante','exterior','Boxeo imaginario integrando todos los movimientos aprendidos','La guardia siempre alta, el movimiento de pies constante',NULL),
(eid,'Jump rope double unders (comba doble)','cardio','pantorrilla','cuadriceps,hombros','cardio','avanzado','exterior','La comba pasa dos veces bajo los pies en cada salto','El salto es más alto y la rotación de muñecas más rápida que el simple',NULL),

-- ============================================================
-- EXERCICIOS MENOS COMUNES — COMPLEMENTARIOS
-- ============================================================
(eid,'Kneeling anti-lateral flexion (anti-flexión lateral de rodillas)','estabilizacion','core','oblicuos,cuadrado_lumbar','fuerza','principiante','casa','Hincado de rodillas sosteniendo un peso en un brazo', 'El oblicuo del lado opuesto resiste la caída lateral',NULL),
(eid,'Staggered stance deadlift (peso muerto con pies asimétricos)','bisagra_cadera','isquiotibiales','gluteos,espalda_baja','fuerza','intermedio','gimnasio','Peso muerto con un pie adelantado al otro (sin llegar a unilateral)','Trabajas una asimetría leve antes de pasar al unilateral completo',NULL),
(eid,'Suitcase deadlift (peso muerto maletín)','bisagra_cadera','isquiotibiales','oblicuos,cuadrado_lumbar','fuerza','intermedio','gimnasio','Peso muerto con una sola mancuerna al lado del cuerpo','El core resiste la flexión lateral mientras la espalda sube el peso',NULL),
(eid,'Landmine squat (sentadilla con landmine)','sentadilla','cuadriceps','gluteos,hombros','fuerza','principiante','gimnasio','Sentadilla sujetando el extremo libre de la barra anclada en el suelo','La trayectoria de la barra asiste el movimiento, menos tensión en la espalda',NULL),
(eid,'Landmine press (press con landmine)','empuje_horizontal','pecho','deltoides_anterior,triceps','fuerza','principiante','gimnasio','Press unilateral con la barra anclada en el suelo en ángulo','El ángulo de la barra combina press frontal y lateral a la vez',NULL),
(eid,'Landmine row (remo con landmine)','traccion_horizontal','espalda','biceps','fuerza','principiante','gimnasio','Remo sujetando el extremo libre de la barra anclada en el suelo','El movimiento curvo de la barra da un rango diferente al remo estándar',NULL),
(eid,'Landmine rotation (rotación con landmine)','rotacion','core','oblicuos,hombros','fuerza','intermedio','gimnasio','Rotar lateralmente sosteniendo la barra con brazos extendidos','Uno de los mejores ejercicios de fuerza rotacional',NULL),
(eid,'Single leg press (prensa unilateral)','sentadilla','cuadriceps','gluteos','fuerza','principiante','gimnasio','Prensa de piernas usando una sola pierna','Identifica y corrige desequilibrios entre la pierna dominante y no dominante',NULL),
(eid,'Decline push-up (flexión declinada)','empuje_horizontal','pecho','pecho_superior,triceps','fuerza','intermedio','casa','Flexión con los pies elevados, énfasis en la parte alta del pecho','Cuanto más elevados los pies, mayor énfasis en el pecho superior',NULL),
(eid,'Close stance squat (sentadilla pies juntos)','sentadilla','cuadriceps','gluteos','hipertrofia','principiante','gimnasio','Sentadilla con los pies juntos o muy próximos','Mayor énfasis en el vasto lateral del cuádriceps',NULL),
(eid,'Wide stance squat (sentadilla pies muy abiertos)','sentadilla','aductores','gluteos,cuadriceps','hipertrofia','principiante','gimnasio','Sentadilla con los pies más abiertos de lo normal','Mayor activación de aductores y glúteo mayor',NULL),
(eid,'Paused bench press (press de banca con pausa)','empuje_horizontal','pecho','triceps,hombros','fuerza','intermedio','gimnasio','Press de banca con pausa de 1-3 segundos en el pecho','Elimina el rebote y obliga a una contracción muscular pura',NULL),
(eid,'Paused squat (sentadilla con pausa)','sentadilla','cuadriceps','gluteos','fuerza','intermedio','gimnasio','Sentadilla con pausa de 2-3 segundos en la posición baja','Sin rebote de tendón, máxima activación muscular en el punto más bajo',NULL),
(eid,'Cluster set training (entrenamiento en cluster)','full_body','full_body','full_body','fuerza','avanzado','gimnasio','Mini-descansos (10-30s) dentro de una serie para mantener la calidad','Permite más rep de calidad con pesos más altos que una serie continua',NULL),
(eid,'Rest-pause set (serie con pausa)','full_body','full_body','full_body','hipertrofia','avanzado','gimnasio','Al fallar, descansa 10-15s y continúa con el mismo peso','Intensifica la serie sin cambiar el peso ni el ejercicio',NULL),
(eid,'Drop set (serie decreciente)','full_body','full_body','full_body','hipertrofia','intermedio','gimnasio','Al fallar, reduce el peso 20-30% y continúa sin descanso','Lleva el músculo más allá del fallo momentáneo',NULL),
(eid,'Mechanical drop set (serie de cambio mecánico)','full_body','full_body','full_body','hipertrofia','avanzado','gimnasio','Al fallar, cambia a una variante más fácil del mismo ejercicio','Ej: flexiones declinadas → planas → inclinadas en la misma serie',NULL),
(eid,'AMRAP set (máximas reps con peso submáximo)','full_body','full_body','full_body','hipertrofia','principiante','gimnasio','Máximo número de repeticiones con un peso dado','Útil para determinar el 1RM estimado o el progreso',NULL),
(eid,'EMOM training (una cada minuto en el minuto)','full_body','full_body','full_body','cardio','intermedio','gimnasio','Ejecutar un número fijo de reps al inicio de cada minuto','El tiempo sobrante de cada minuto es tu descanso',NULL),
(eid,'Tabata protocol (protocolo Tabata)','cardio','full_body','full_body','cardio','intermedio','casa','20s de trabajo + 10s de descanso × 8 rondas = 4 minutos','Cualquier ejercicio puede usarse; el esfuerzo debe ser máximo',NULL),
(eid,'HIIT intervals general (HIIT general)','cardio','full_body','full_body','cardio','intermedio','casa','Alternancia de alta y baja intensidad en proporciones variables','La relación trabajo:descanso decide la intensidad del estímulo',NULL),
(eid,'Concurrent training session (sesión concurrente)','full_body','full_body','full_body','cardio','avanzado','gimnasio','Combinar fuerza y cardio en la misma sesión de forma óptima','Cardio post-fuerza minimiza la interferencia con las adaptaciones de fuerza',NULL);

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
RAISE NOTICE 'Parte 4 insertada correctamente.';

END $$;
