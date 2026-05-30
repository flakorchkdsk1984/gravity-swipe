# Registro de Cambios

## [0.0.6-beta] — 2026-05-30

### Corregido
- **Botones overlay no funcionaban**: canvas Phaser ya no intercepta clicks cuando el overlay está activo (`pointer-events: none` en canvas al mostrar game-over)
- **Leaderboard iniciales**: campo de texto con `ngModel`, carga inmediata en `ngOnInit`, sanitización uppercase al guardar
- **Double-fire en botones**: eliminados handlers `touchend` duplicados

### Agregado
- **Efecto láser en dash**: haz triple (outer glow + mid + core blanco), segmentos de energía, punta de flecha diamante con glow, anillos concéntricos con crosshair
- **Colores según poder activo**: el laser, la flecha y los anillos cambian de color al recoger un poder (rojo=velocidad, naranja=escudo, amarillo=score, verde=slow, azul=freeze, morado=ghost, blanco=magnet)


Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/)
y este proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

---

## [0.0.5-beta] — 2026-05-30

### Agregado
- **Sistema de historia**: 9 actos narrativos con efecto máquina de escribir (StoryScene)
- **Progresión de etapas**: las etapas se desbloquean en orden al completarlas (StoryManager, localStorage)
- **Tutorial interactivo**: 6 tooltips secuenciales en la primera etapa — enseña carga, dash, obstáculos, combos, poderes y meta
- **game-data.txt**: archivo de texto con definiciones y puntos de todos los objetos — fuente de verdad cargada en cada partida
- **GameDataLoader**: singleton que parsea game-data.txt y expone datos tipados a todos los sistemas
- **Bloqueo de etapas**: StageSelectScene muestra 🔒 en etapas no desbloqueadas
- **Reinicio de progreso**: botón en StageSelectScene para resetear desbloqueos

### Técnico
- `PreloadScene` añade `preload()` para cargar game-data.txt via Phaser loader
- `MainGameScene` llama `StoryManager.unlockNext()` al completar etapa
- `PowerStageScene` y `FinalStageScene` reportan su StageType correcto al completar
- `StoryScene` registrada en Phaser scene array

---

## [0.0.4-beta] — 2026-05-30

### Agregado
- **Sistema de etapas**: menú de selección con 9 etapas disponibles
- **StageSelectScene**: grid 2×5 con tarjetas animadas, scroll táctil y de ratón
- **Etapas de poder × 7**: una etapa por cada tipo de poder (Velocidad, Escudo, Puntos, Fantasma, Hielo, Imán, Cámara Lenta) donde el poder está activo de forma infinita para aprender su mecánica
- **Etapa Final**: dificultad ×1.5, estética dorada, desafío definitivo
- **PowerStageScene**: extiende MainGameScene, aplica poder forzado infinito, HUD con nombre y color del poder
- **FinalStageScene**: extiende MainGameScene, difficulty offset +1.5, HUD "🏆 ETAPA FINAL" dorado
- **Botón "⚡ ETAPAS"** en MenuScene (púrpura eléctrico) para acceder a la selección de etapas

### Técnico
- `MainGameScene.player` y `difficultyOffset` ahora `protected` para extensión por subclases
- `StageType` enum y `IStageConfig` interface agregados a `types.ts`
- `StageConfig.ts` nuevo: `STAGE_CONFIGS` array con configuración de las 9 etapas

---

## [Sin publicar]

_Próximos cambios pendientes de lanzamiento._

---

## [0.0.3-beta] - 2026-05-30

### Añadido
- **Menú de inicio animado** — título neon con pulso, botón ▶ PLAY, botón 🏆 BEST TIMES con overlay de leaderboard, estrellas flotantes y badge de versión
- **Sistema de color del personaje** — al recoger un power object el jugador toma ese color (cuerpo, glow y trail)
- **7 tipos de propulsión** — cada poder cambia la mecánica de movimiento:
  - 🔴 ROCKET: dash 1.8× más rápido
  - 🟠 BOUNCER: rebotes amplificados ×3 en paredes
  - 🟡 LIGHTNING: teletransporte de 200px en dirección del aim
  - 🟢 GRAVITY DRIFT: fuerza continua en la dirección apuntada por 1.5s
  - 🔵 ICE GLIDE: dirección snapped a 45°, rozamiento casi nulo
  - 🟣 PHASE: jugador semi-transparente con trail fantasma
  - ⚪ ORBIT SHOT: trayectoria curva en arco durante el vuelo
- Al expirar el poder, el jugador recupera color y propulsión por defecto

---

## [0.0.2-beta] - 2026-05-30

### Añadido
- **Línea de meta** — franja arcoíris al final del nivel (18 chunks / Y=-10800) con texto "FINISH" animado
- **Cronómetro** — contador `MM:SS.cc` en el HUD que mide el tiempo hasta la meta
- **Mini-mapa** — panel superior derecho con posición del jugador, distancia al final y % completado
- **Sistema de 7 poderes de color** — objetos flotantes con efecto pulsante:
  - 🔴 Rojo: ⚡ SPEED — dash 1.5× más rápido (5s)
  - 🟠 Naranja: 🛡 SHIELD — absorbe el próximo golpe mortal
  - 🟡 Amarillo: ✨ ×2 SCORE — doble puntaje (10s)
  - 🟢 Verde: 🌀 SLOW-MO — cámara lenta extendida (4s)
  - 🔵 Azul: ❄️ FREEZE — congela obstáculos (3s)
  - 🟣 Morado: 👻 GHOST — atraviesa obstáculos (4s)
  - ⚪ Blanco: 🧲 MAGNET — atrae power objects al centro (6s)
- **Leaderboard de mejores tiempos** — top 10 guardado en localStorage con medallas 🥇🥈🥉
- **Selector de avatar emoji** — elige tu marca al completar una etapa (😀😎🦊🐉🚀🌟💎⚡🔥👾🤖🏆)
- **Badges de poderes activos** — indicadores de color en el HUD durante la partida
- **GameLogger** — sistema de debug con overlay (tecla `` ` ``), niveles DEBUG/INFO/WARN/ERROR y captura global de errores

### Corregido
- Error `TypeError: Cannot read properties of undefined (reading 'contains')` al activar slow-motion (Phaser 3.90 `deathZone: undefined` en ParticleEmitter)

---

## [0.0.1-beta] - 2026-05-29

### Agregado

- **Lanzamiento inicial** del juego Gravity Swipe.
- `Player` — Sistema de movimiento con carga de dash y dirección por arrastre táctil.
- `ObstacleManager` — Generación y gestión de obstáculos dinámicos en pantalla.
- `EnemyManager` — Enemigos con IA básica y comportamiento reactivo al jugador.
- `ComboSystem` — Multiplicador de puntuación por golpes consecutivos.
- `ScoreManager` — Registro de puntuación actual, récord local y visualización en HUD.
- `AudioManager` — Música de fondo y efectos de sonido sincronizados con la acción.
- `ParticleManager` — Sistema de partículas para explosiones, rastros y efectos neón.
- `CameraManager` — Efectos de cámara: shake, zoom y transiciones de slow-motion.
- `InputManager` — Manejo unificado de entradas táctiles y de ratón (drag & release).
- `LevelGenerator` — Generación procedural de niveles con dificultad progresiva.
- `ObjectPool` — Pool de objetos reutilizables para optimizar el rendimiento en móvil.
- Soporte para resolución 390×844 (iPhone 14, orientación vertical).
- Despliegue automático a GitHub Pages mediante GitHub Actions.

---

[Sin publicar]: https://github.com/flakorchkdsk1984/gravity-swipe/compare/v0.0.1-beta...HEAD
[0.0.1-beta]: https://github.com/flakorchkdsk1984/gravity-swipe/releases/tag/v0.0.1-beta
