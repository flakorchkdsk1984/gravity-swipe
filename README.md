# 🌀 Gravity Swipe

[![Versión](https://img.shields.io/badge/versión-0.0.3--beta-blueviolet)](https://github.com/flakorchkdsk1984/gravity-swipe/releases)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-yellow.svg)](./LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-en%20vivo-brightgreen?logo=github)](https://flakorchkdsk1984.github.io/gravity-swipe/)
[![Angular](https://img.shields.io/badge/Angular-17-red?logo=angular)](https://angular.dev)
[![Phaser](https://img.shields.io/badge/Phaser-3.90-orange?logo=phaser)](https://phaser.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)](https://www.typescriptlang.org)

**Gravity Swipe** es un juego arcade móvil de carrera contrarreloj con estética **neón** desarrollado con **Angular 17** y **Phaser 3.90**. El jugador carga energía con el dedo, apunta y se lanza a través de un escenario vertical lleno de obstáculos, enemigos y power-ups de 7 colores. Cada golpe encadenado activa un multiplicador de combo, y el objetivo final es llegar a la línea de meta (Y = −10 800 px) con el mejor tiempo posible. La arquitectura está completamente desacoplada mediante un EventBus centralizado y más de 14 sistemas independientes.

---

## 📑 Tabla de contenidos

1. [Demo](#-demo)
2. [Características principales](#-características-principales)
3. [Cómo jugar](#️-cómo-jugar)
4. [Arquitectura del proyecto](#️-arquitectura-del-proyecto)
5. [Stack tecnológico](#️-stack-tecnológico)
6. [Instalación y desarrollo local](#-instalación-y-desarrollo-local)
7. [Build y despliegue](#-build-y-despliegue)
8. [Sistemas de juego — Referencia técnica](#-sistemas-de-juego--referencia-técnica)
9. [Historial de versiones](#-historial-de-versiones)
10. [Contribuir](#-contribuir)
11. [Licencia](#-licencia)

---

## 🎮 Demo

🔗 **Demo en vivo:** <https://flakorchkdsk1984.github.io/gravity-swipe/>

> 🎬 *Demo GIF — próximamente*

> 📱 *Escanea el QR para abrir la demo directamente en tu móvil:*
> `https://flakorchkdsk1984.github.io/gravity-swipe/`
> _(genera el QR con cualquier servicio como [qr-code-generator.com](https://www.qr-code-generator.com))_

---

## ✨ Características principales

### 📱 Mobile-first (390 × 844 px, optimizado para iPhone 14)
- Resolución lógica fija de **390 × 844** px (píxeles lógicos del iPhone 14).
- Motor Phaser configurado con `Scale.FIT` + `CENTER_BOTH`: se adapta a cualquier pantalla sin distorsión.
- Todos los controles son táctiles (pointer down / move / up); no requiere teclado.
- Target de **60 fps** en móvil gracias a Object Pool y despawn automático de chunks.

### 🎮 Mecánica Charge & Dash
- **Mantén presionado** en cualquier punto de la pantalla para iniciar la carga.
  - La carga dura un máximo de **1 200 ms** (`maxChargeTime`).
  - Durante la carga se activa el slow-motion (`slowMotionScale: 0.25`), dando tiempo para apuntar.
  - Un arco de apuntado y un indicador visual de nivel de carga (`chargeLevel: 0–1`) guían al jugador.
- **Arrastra** para ajustar la dirección del dash (vector normalizado `aimDirection`).
- **Suelta** para lanzar al jugador:
  - Velocidad mínima: **600 px/s** (`dashBaseSpeed`) con carga 0.
  - Velocidad máxima: **1 800 px/s** (`dashMaxSpeed`) con carga completa.
  - La velocidad se interpola linealmente según el nivel de carga.
- El rebote contra paredes conserva **85 %** de la energía cinética (`bounceRestitution: 0.85`).

### ⚡ Sistema de Combo
- Cada golpe a un obstáculo o enemigo reinicia una ventana de **2 000 ms** (`combo.window`).
  - Si el siguiente golpe llega antes de que expire la ventana, el combo se incrementa.
  - Un near-miss (pasar a menos de **35 px** de un objeto) cuenta como **0.5 créditos** de combo.
- Tabla de multiplicadores según los umbrales `multiplierThresholds: [0, 3, 6, 12, 20]`:

  | Golpes en cadena | Multiplicador |
  |-----------------|--------------|
  | 0 – 2           | ×1           |
  | 3 – 5           | ×2           |
  | 6 – 11          | ×3           |
  | 12 – 19         | ×4           |
  | 20 +            | ×5           |

- El combo se rompe (`COMBO_BREAK`) si expira la ventana sin golpe.
- El HUD muestra el combo y el multiplicador en tiempo real con animaciones de texto flotante.

### 🌈 7 Power-ups de Color
Recoge objetos brillantes que aparecen en el nivel para activar propulsiones y habilidades especiales:

| Power-up | Color | Hex | Duración | Propulsión | Mecánica |
|----------|-------|-----|----------|------------|----------|
| ⚡ SPEED | 🔴 Rojo | `#ff2244` | 5 000 ms | `ROCKET` | Velocidad de dash ×1.5 |
| 🛡 SHIELD | 🟠 Naranja | `#ff8800` | Un golpe | `BOUNCER` | Absorbe un impacto letal |
| ✨ ×2 SCORE | 🟡 Amarillo | `#ffff00` | 10 000 ms | `LIGHTNING` | Duplica todos los puntos obtenidos |
| 🌀 SLOW-MO | 🟢 Verde | `#00ff44` | 4 000 ms | `GRAVITY_DRIFT` | Extiende el efecto slow-motion |
| ❄️ FREEZE | 🔵 Azul | `#00aaff` | 3 000 ms | `ICE_GLIDE` | Congela obstáculos móviles |
| 👻 GHOST | 🟣 Morado | `#aa44ff` | 4 000 ms | `PHASE` | Atraviesa obstáculos sin colisión |
| 🧲 MAGNET | ⚪ Blanco | `#ffffff` | 6 000 ms | `ORBIT_SHOT` | Atrae power-ups cercanos |

### 🏁 Línea de Meta y Sistema de Stages
- La línea de meta se encuentra en **Y = −10 800 px** del mundo (`FINISH_Y`).
- El nivel se divide en **18 chunks** de **600 px** de altura cada uno (`FINISH_CHUNKS`, `chunkHeight`).
- La línea de meta se renderiza con franjas de colores animadas y texto pulsante "FINISH!".
- Al cruzarla se emite `STAGE_FINISH` con el tiempo final, puntuación y combo máximo.

### ⏱ Cronómetro de Carrera
- El `TimerManager` mide el tiempo desde el inicio hasta cruzar la meta.
- Formato de visualización: **MM:SS.cc** (minutos, segundos, centésimas).
- Las actualizaciones de UI se emiten cada **100 ms** para no saturar el render.
- El tiempo final se guarda en el `LeaderboardService` junto a la puntuación.

### 🗺 Mini-mapa
- Barra lateral que muestra la posición del jugador como porcentaje del progreso total.
- El indicador se calcula como `(posY / FINISH_Y) * 100` y se muestra con texto `%`.
- Se actualiza en cada frame con el evento `LEVEL_PROGRESS`.

### 🏆 Tabla de clasificación (Leaderboard)
- Almacena el **top 10** de mejores resultados en `localStorage` (clave `gs_highscore`).
- Cada entrada guarda: nombre, puntuación, tiempo de carrera, combo máximo y avatar emoji.
- La pantalla de Game Over permite al jugador registrar su nombre si entra en el top 10.
- Los registros se ordenan por puntuación de mayor a menor.

### 🐌 Efecto Slow-Motion
- Se activa durante la carga del dash: el `timeScale` de Phaser baja a **0.25** (`slowMotionScale`).
- Duración máxima: **800 ms** (`slowMotionDuration`).
- El power-up SLOW-MO extiende este efecto otros **4 000 ms**.
- Los eventos `SLOW_MOTION_START` / `SLOW_MOTION_END` se emiten en el EventBus.

### 🎆 Sistema de Partículas (5 tipos de efecto)
- Todas las texturas se generan proceduralmente (sin archivos de assets).
- Tipos de efecto disponibles:
  1. **Burst de impacto** — explosión radial al golpear un obstáculo.
  2. **Trail del jugador** — estela de 12 partículas detrás del jugador en movimiento.
  3. **Shockwave** — onda expansiva circular al hacer dash con carga máxima.
  4. **Hit Flash** — destello blanco al recibir daño.
  5. **Combo sparks** — destellos amarillos al alcanzar un nuevo multiplicador.

### 🔊 Audio Procedural
- **Sin archivos de audio**: todos los sonidos se sintetizan en tiempo real con la **Web Audio API**.
- El `AudioManager` crea osciladores, filtros y nodos de ganancia según el evento.
- Efectos incluidos: dash, rebote, golpe, destrucción de obstáculo, incremento de combo, game over.
- El oscilador de carga aumenta su frecuencia progresivamente mientras el jugador mantiene presionado.

### 🐛 Overlay de Debug (GameLogger)
- Presiona la tecla **backtick (`)** para activar/desactivar el overlay de depuración.
- Muestra en pantalla: FPS, velocidad del jugador, nivel de carga, combo activo, chunks cargados y últimos logs.
- Niveles de log: `DEBUG`, `INFO`, `WARN`, `ERROR`.
- Los logs también se emiten a la consola del navegador con timestamp y tag del sistema.

---

## 🕹️ Cómo jugar

### Controles básicos

1. **Toca y mantén presionado** — Pon el dedo en cualquier lugar de la pantalla. El juego entra en modo de carga: el tiempo se ralentiza (slow-motion ×0.25) y aparece un indicador circular de nivel de carga.
2. **Arrastra** — Sin soltar, mueve el dedo en la dirección a la que quieres lanzarte. Una línea de apuntado muestra la trayectoria.
3. **Suelta** — El jugador sale disparado en esa dirección. Cuanto más tiempo hayas mantenido presionado (hasta 1 200 ms), mayor será la velocidad del dash (hasta 1 800 px/s).
4. **Rebota** — Al chocar con una pared el jugador rebota conservando el 85 % de su velocidad. Puedes encadenar rebotes para llegar a zonas difíciles.

### Power-ups

- Los power-ups aparecen como esferas brillantes de colores flotando en el nivel.
- **Recógelos** pasando por encima con el jugador; se activan automáticamente.
- Consulta la tabla de la sección [7 Power-ups de Color](#-7-power-ups-de-color) para ver duraciones y efectos.
- Algunos power-ups (SHIELD) son de un solo uso; otros duran varios segundos con temporizador visible en el HUD.

### Sistema de Combo

1. Golpea un obstáculo o enemigo → el combo se inicia (contador = 1, ×1).
2. Golpea otro objetivo **antes de que expiren los 2 000 ms** → combo sube a 2.
3. Al llegar a 3 golpes en cadena → multiplicador sube a ×2.
4. A 6 golpes → ×3; a 12 → ×4; a 20 → ×5.
5. Pasar muy cerca de un objeto sin golpearlo (near-miss, < 35 px) cuenta como **medio golpe** y mantiene el combo vivo.
6. Si la cadena se rompe (timeout), el multiplicador vuelve a ×1.

### Llegar a la línea de meta

- El mundo se desplaza hacia arriba; tu objetivo es avanzar los **18 chunks** (10 800 px) hasta la línea de meta.
- La dificultad aumenta un **4 %** por chunk (`difficultyScalePerChunk: 0.04`): más obstáculos, enemigos más rápidos y patrones más complejos.
- El mini-mapa de la derecha muestra tu progreso en porcentaje.
- Al cruzar la meta, el cronómetro se detiene y aparece la pantalla de resultados.

### Registro en el Leaderboard

1. Al finalizar (game over o cruzar la meta) aparece la pantalla de resultados con tu puntuación, tiempo y combo máximo.
2. Si tu puntuación entra en el top 10, se te pide que escribas tu nombre (hasta 12 caracteres).
3. Elige un **avatar emoji** de la lista disponible.
4. Tu registro se guarda localmente y puedes consultarlo desde el menú principal.

---

## 🏗️ Arquitectura del proyecto

```
src/app/game/
├── config/
│   ├── GameConfig.ts       # Constantes numéricas, paleta de colores, configs de Phaser
│   └── types.ts            # Interfaces, enums y payloads compartidos por todos los sistemas
├── objects/
│   ├── Player.ts           # Sprite del jugador, trail, estado físico
│   ├── Obstacle.ts         # Obstáculos (wall, bumper, spinner, platform, shield)
│   ├── Enemy.ts            # Enemigos (static, drifter, orbiter)
│   └── PowerObject.ts      # Esfera de power-up con animación glow
├── scenes/
│   ├── PreloadScene.ts     # Carga de assets y texturas procedurales
│   ├── MenuScene.ts        # Menú de inicio, selector de modo y leaderboard
│   └── MainGameScene.ts    # Escena principal: orquesta todos los sistemas
├── services/
│   ├── GameStateService.ts # Estado Angular ↔ Phaser (RxJS subjects)
│   └── LeaderboardService.ts # CRUD del top 10 en localStorage
├── systems/
│   ├── InputManager.ts     # Pointer events → TouchInputState → EventBus
│   ├── PhysicsManager.ts   # Colisiones Arcade, near-miss detection
│   ├── LevelGenerator.ts   # Generación procedural de chunks (patrones A-E)
│   ├── ObjectPool.ts       # Pool genérico para GameObjects de Phaser
│   ├── ComboSystem.ts      # Cadenas de golpes, ventana 2 s, multiplicadores
│   ├── ScoreManager.ts     # Puntuación, highscore en LS, floating text
│   ├── AudioManager.ts     # Síntesis de sonido vía Web Audio API
│   ├── ParticleManager.ts  # 5 efectos de partículas, texturas procedurales
│   ├── CameraManager.ts    # Lerp follow, screen shake, zoom, flash
│   ├── EventBus.ts         # Singleton EventEmitter; puente Phaser ↔ Angular
│   ├── PowerManager.ts     # Estado activo de los 7 poderes, timers de expiración
│   ├── FinishLine.ts       # Línea de meta en Y=-10800 con efectos visuales
│   ├── TimerManager.ts     # Cronómetro MM:SS.cc, emite TIMER_UPDATE c/100ms
│   └── GameLogger.ts       # Overlay debug (backtick), niveles DEBUG/INFO/WARN/ERROR
└── ui/
    ├── game-ui.component.ts/.html/.scss   # HUD Angular: puntuación, combo, timer, mini-mapa
    ├── game-over.component.ts/.html/.scss # Pantalla de resultados y leaderboard
    └── tutorial.component.ts              # Overlay de tutorial en el primer inicio
```

### Descripción de cada sistema

| Sistema | Archivo | Responsabilidad |
|---------|---------|-----------------|
| **InputManager** | `InputManager.ts` | Captura eventos pointer (down/move/up), calcula `chargeLevel` (0-1) y `aimDirection`, emite `CHARGE_START`, `CHARGE_UPDATE`, `CHARGE_RELEASE` al EventBus. Renderiza el arco de apuntado. |
| **PhysicsManager** | `PhysicsManager.ts` | Registra grupos de colisión Arcade entre el jugador y obstáculos/enemigos. Detecta near-misses (distancia < 35 px). Emite `OBSTACLE_HIT`, `ENEMY_HIT`, `PLAYER_NEAR_MISS`. |
| **LevelGenerator** | `LevelGenerator.ts` | Genera chunks procedurales con 5 patrones (A-E). Hace spawn de chunks por delante (`spawnAheadChunks: 3`) y despawn por detrás (`despawnBehindChunks: 2`). Escala dificultad 4 % por chunk. |
| **ObjectPool** | `ObjectPool.ts` | Pool genérico tipado `ObjectPool<T extends GameObject>`. Evita la creación/destrucción continua de objetos Phaser; clave para mantener 60 fps en móvil. |
| **ComboSystem** | `ComboSystem.ts` | Rastrea la cadena de hits con ventana de 2 000 ms. Acumula hits fraccionarios para near-misses. Emite `COMBO_INCREMENT`, `COMBO_BREAK`, `MULTIPLIER_CHANGE`. |
| **ScoreManager** | `ScoreManager.ts` | Suma puntos ponderados por multiplicador. Gestiona el highscore en `localStorage`. Muestra texto flotante animado sobre el punto de impacto. |
| **AudioManager** | `AudioManager.ts` | Sintetiza todos los sonidos en tiempo real con Web Audio API (sin assets). Oscilador de carga variable, hits, combos, game over. |
| **ParticleManager** | `ParticleManager.ts` | Cinco efectos de partículas usando el API de Phaser 3.60+. Texturas (dot, shard, spark, glow) generadas programáticamente en `PreloadScene`. |
| **CameraManager** | `CameraManager.ts` | Sigue al jugador con lerp (`followLerp: 0.08`). Screen shake configurable (`shakeDecay: 0.85`). Zoom dinámico durante el dash (`zoomDash: 0.92`). Flash de pantalla en impactos. |
| **EventBus** | `EventBus.ts` | Singleton que extiende `Phaser.Events.EventEmitter`. Actúa de bus central entre todos los sistemas y expone `window.GS_EVENTS` para que Angular pueda escuchar eventos de Phaser. |
| **PowerManager** | `PowerManager.ts` | Gestiona el estado activo de los 7 poderes mediante un `Map<PowerType, ActivePowerEntry>`. Expone flags (`hasShield`, `isGhost`, `isFreezeActive`, etc.) que `MainGameScene` consulta en cada frame. |
| **FinishLine** | `FinishLine.ts` | Dibuja la línea de meta en `Y = -10 800` con franjas de colores animadas y texto pulsante. Emite partículas ambientales. |
| **TimerManager** | `TimerManager.ts` | Cronómetro de alta resolución (`performance.now()`). Emite `TIMER_UPDATE` cada 100 ms con el tiempo en ms. Formatea en MM:SS.cc para el HUD. |
| **GameLogger** | `GameLogger.ts` | Sistema de debug en pantalla activado con la tecla backtick. Cola circular de entradas con nivel, tag, mensaje y timestamp. Renderizado sobre el canvas con `Phaser.GameObjects.Text`. |

---

## 🛠️ Stack tecnológico

| Tecnología | Versión | Propósito | Decisión de diseño |
|------------|---------|-----------|-------------------|
| **Angular** | 17 | Framework SPA: routing, DI, componentes de UI (HUD, Game Over, Leaderboard) | Separación limpia entre lógica de UI (Angular) y lógica de juego (Phaser). La comunicación se realiza exclusivamente por EventBus. |
| **Phaser** | 3.90 | Motor de juego 2D: física Arcade, render WebGL/Canvas, partículas, tweens, cámara | Elegido por su madurez, documentación extensa y rendimiento en móvil. v3.90 incluye la nueva API de ParticleEmitter usada por `ParticleManager`. |
| **TypeScript** | 5.2 | Lenguaje (modo `strict` activado) | Strict mode elimina toda una categoría de bugs en runtime. Todos los sistemas y payloads del EventBus están completamente tipados. |
| **Web Audio API** | nativa | Síntesis de sonido procedural | Elimina la necesidad de archivos de audio, reduce el tamaño del bundle y permite sonidos reactivos al estado del juego en tiempo real. |
| **localStorage** | nativa | Persistencia del leaderboard y highscore | Sin backend; la demo funciona completamente offline y en GitHub Pages sin servidor. |
| **GitHub Pages** | — | Hosting de la demo en vivo | CI/CD gratuito integrado con GitHub Actions; zero-config para proyectos Angular con `--base-href`. |
| **GitHub Actions** | — | Pipeline de build y despliegue automático | Push a `main` → build de producción → despliegue automático en `gh-pages`. |

---

## 🚀 Instalación y desarrollo local

### Requisitos previos

| Herramienta | Versión mínima | Verificar |
|-------------|---------------|-----------|
| **Node.js** | 18.x LTS | `node --version` |
| **npm** | 9.x | `npm --version` |
| **Angular CLI** | 17.x | `ng version` |

> 💡 Si usas **WSL2** en Windows, asegúrate de tener el proyecto en el sistema de archivos Linux (`~/`) para evitar problemas de rendimiento con el watcher de archivos.

### Clonar e instalar dependencias

```bash
git clone https://github.com/flakorchkdsk1984/gravity-swipe.git
cd gravity-swipe
npm install
```

### Iniciar el servidor de desarrollo

```bash
npm start
```

Abre tu navegador en **http://localhost:4200**. El servidor recarga automáticamente al guardar cualquier archivo (`--watch`).

> 📱 Para probar en móvil real desde la misma red local, usa:
> ```bash
> ng serve --host 0.0.0.0
> ```
> Y abre `http://<tu-IP-local>:4200` desde el móvil.

### Scripts npm disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| `start` | `ng serve` | Servidor de desarrollo en localhost:4200 con live-reload |
| `build` | `ng build` | Build de producción optimizado en `dist/gravity-swipe/browser/` |
| `serve` | `npx http-server dist/gravity-swipe/browser` | Sirve el build de producción localmente |

### Consejo: Overlay de Debug

Durante el desarrollo, presiona la tecla **` (backtick/acento grave)** en el juego para activar el overlay de `GameLogger`. Muestra en pantalla FPS, velocidad, nivel de carga, combo y los últimos eventos del sistema.

Para filtrar logs en Chrome DevTools, filtra por los tags del sistema: `[InputManager]`, `[PhysicsManager]`, `[LevelGenerator]`, etc.

---

## 📦 Build y despliegue

### Build de producción

```bash
npm run build
```

Angular CLI genera los archivos optimizados en `dist/gravity-swipe/browser/`. El build incluye tree-shaking, minificación y optimización de chunks.

### Despliegue manual en GitHub Pages

```bash
# 1. Build con la base-href correcta
ng build --base-href /gravity-swipe/

# 2. Instala gh-pages si no lo tienes
npm install -g gh-pages

# 3. Despliega el contenido del build en la rama gh-pages
gh-pages -d dist/gravity-swipe/browser
```

### CI/CD con GitHub Actions

El despliegue se realiza automáticamente en cada push a `main` mediante el workflow definido en [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

Pasos del pipeline:
1. `actions/checkout` — clona el repositorio.
2. `actions/setup-node@v4` — configura Node.js 18.
3. `npm ci` — instalación limpia y reproducible.
4. `ng build --base-href /gravity-swipe/` — build de producción.
5. `peaceiris/actions-gh-pages` — publica en la rama `gh-pages`.

### Estrategia de versionado

Este proyecto sigue **[Semantic Versioning](https://semver.org/lang/es/)** con sufijo `-beta` mientras esté en desarrollo activo:

- `MAJOR.MINOR.PATCH-beta`
- El sufijo `-beta` indica que la API de juego puede cambiar entre versiones sin aviso.
- Las versiones estables (sin `-beta`) se etiquetan como releases en GitHub.

---

## 🔬 Sistemas de juego — Referencia técnica

Esta sección es una referencia detallada para colaboradores y desarrolladores.

### ⚙️ Física

Todos los valores se definen en `src/app/game/config/GameConfig.ts`:

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `playerRadius` | 18 px | Radio del círculo de colisión del jugador |
| `dashBaseSpeed` | 600 px/s | Velocidad mínima del dash (carga 0) |
| `dashMaxSpeed` | 1 800 px/s | Velocidad máxima del dash (carga completa) |
| `maxChargeTime` | 1 200 ms | Tiempo máximo de carga |
| `bounceRestitution` | 0.85 | Factor de conservación de energía en rebote (85 %) |
| `friction` | 0.98 | Factor de rozamiento aplicado cada frame |
| `gravity` | 0 | Sin gravedad global (el jugador solo se mueve al hacer dash) |

La velocidad real del dash se calcula como:
```
speed = dashBaseSpeed + chargeLevel * (dashMaxSpeed - dashBaseSpeed)
      = 600 + chargeLevel * 1200
```

### 🗺 Generación de niveles

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `chunkHeight` | 600 px | Altura de cada chunk del nivel |
| `spawnAheadChunks` | 3 | Chunks generados por delante del jugador |
| `despawnBehindChunks` | 2 | Chunks eliminados por detrás del jugador |
| `difficultyScalePerChunk` | 0.04 | Incremento de dificultad por chunk (4 %) |
| Total chunks | 18 | Chunks necesarios para llegar a la meta |
| Distancia total | 10 800 px | `18 × 600 = 10 800` |

**Patrones de chunk (A–E):**

| Patrón | Nombre | Descripción |
|--------|--------|-------------|
| **A** | Two Walls | Dos paredes laterales con hueco central de paso variable |
| **B** | Bumper Cluster | Grupo de bumpers circulares con rebote activo |
| **C** | Platforms | Plataformas horizontales escalonadas con huecos |
| **D** | Enemy Gauntlet | Pasillo con enemigos `DRIFTER` u `ORBITER` |
| **E** | Spinner Maze | Laberinto de obstáculos tipo `SPINNER` en rotación continua |

El `LevelGenerator` selecciona el patrón de forma pseudo-aleatoria ponderada según el número de chunk (dificultad creciente).

### 🌈 Sistema de Poderes — Referencia completa

| PowerType | Color | Hex | Duración | PropulsionType | Mecánica detallada |
|-----------|-------|-----|----------|----------------|-------------------|
| `SPEED_BOOST` | 🔴 Rojo | `#ff2244` | 5 000 ms | `ROCKET` | `speedMultiplier = 1.5`; el dash alcanza 2 700 px/s máx. |
| `SHIELD` | 🟠 Naranja | `#ff8800` | Un golpe | `BOUNCER` | `hasShield = true`; absorbe un impacto letal sin morir |
| `SCORE_X2` | 🟡 Amarillo | `#ffff00` | 10 000 ms | `LIGHTNING` | `scoreMultiplierBonus = 2`; se multiplica sobre el combo |
| `SLOW_EXTEND` | 🟢 Verde | `#00ff44` | 4 000 ms | `GRAVITY_DRIFT` | Extiende el slow-motion fuera de la fase de carga |
| `FREEZE` | 🔵 Azul | `#00aaff` | 3 000 ms | `ICE_GLIDE` | `isFreezeActive = true`; obstáculos con `speed` se detienen |
| `GHOST` | 🟣 Morado | `#aa44ff` | 4 000 ms | `PHASE` | `isGhost = true`; se omiten las colisiones con obstáculos |
| `MAGNET` | ⚪ Blanco | `#ffffff` | 6 000 ms | `ORBIT_SHOT` | Atrae power-ups a un radio de 150 px automáticamente |

> El `SHIELD` tiene `POWER_DURATIONS.shield = 0` (sin temporizador), se desactiva con el primer impacto.

### ⚡ Sistema de Combo — Referencia

```
Umbrales:  [  0,  3,  6, 12, 20 ]
Multiplic: [ ×1, ×2, ×3, ×4, ×5 ]

Near-miss: +0.5 créditos de combo (fractionalHits)
Ventana:   2 000 ms desde el último golpe válido
```

El `ComboSystem` usa un acumulador fraccionario (`fractionalHits`) que permite que dos near-misses consecutivos cuenten como un golpe completo, haciendo que los combos sean más accesibles en móvil.

### 📡 EventBus — Eventos del sistema

Todos los eventos se definen en el enum `GameEvent` (`src/app/game/config/types.ts`):

| Evento | Valor de string | Descripción |
|--------|----------------|-------------|
| `CHARGE_START` | `charge:start` | El jugador inicia la carga (pointer down) |
| `CHARGE_UPDATE` | `charge:update` | Actualización del nivel de carga (cada frame) |
| `CHARGE_RELEASE` | `charge:release` | El jugador suelta y se ejecuta el dash |
| `PLAYER_DASH` | `player:dash` | Payload: `DashPayload` con posición, dirección, velocidad |
| `PLAYER_BOUNCE` | `player:bounce` | Rebote contra una pared o obstáculo |
| `PLAYER_DIED` | `player:died` | El jugador ha muerto (sin shield) |
| `PLAYER_NEAR_MISS` | `player:nearMiss` | Paso a < 35 px de un objeto sin colisionar |
| `OBSTACLE_HIT` | `obstacle:hit` | Impacto con un obstáculo (payload: `HitPayload`) |
| `OBSTACLE_DESTROY` | `obstacle:destroy` | Obstáculo destruido (HP = 0) |
| `ENEMY_HIT` | `enemy:hit` | Impacto con un enemigo |
| `ENEMY_DESTROY` | `enemy:destroy` | Enemigo destruido |
| `COMBO_INCREMENT` | `combo:increment` | Combo subió (payload: `ComboPayload`) |
| `COMBO_BREAK` | `combo:break` | Cadena de combo rota por timeout |
| `SCORE_UPDATED` | `score:updated` | Puntuación actualizada (payload: `ScorePayload`) |
| `MULTIPLIER_CHANGE` | `multiplier:change` | El multiplicador cambió de nivel |
| `SLOW_MOTION_START` | `fx:slowMotionStart` | Inicio del efecto slow-motion |
| `SLOW_MOTION_END` | `fx:slowMotionEnd` | Fin del efecto slow-motion |
| `SCREEN_SHAKE` | `fx:screenShake` | Solicitud de screen shake (payload: `ShakePayload`) |
| `HIT_FLASH` | `fx:hitFlash` | Destello de pantalla por daño |
| `GAME_START` | `game:start` | La partida comienza |
| `GAME_OVER` | `game:over` | Game over (payload: `GameOverPayload`) |
| `GAME_RESTART` | `game:restart` | El jugador reinicia la partida |
| `LEVEL_PROGRESS` | `level:progress` | Progreso del nivel actualizado (para mini-mapa) |
| `POWER_COLLECTED` | `power:collected` | El jugador recogió un power-up |
| `POWER_ACTIVATED` | `power:activated` | El power-up está activo (payload: `PowerPayload`) |
| `POWER_EXPIRED` | `power:expired` | El power-up ha expirado |
| `PLAYER_COLOR_CHANGE` | `player:colorChange` | El color del jugador cambia al recoger un poder |
| `STAGE_FINISH` | `stage:finish` | El jugador cruzó la línea de meta (payload: `StageFinishPayload`) |
| `TIMER_UPDATE` | `timer:update` | Actualización del cronómetro (cada 100 ms) |

### 📷 Cámara

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `followLerp` | 0.08 | Factor de interpolación del seguimiento (suavizado) |
| `shakeDecay` | 0.85 | Factor de decaimiento del screen shake por frame |
| `zoomDefault` | 1.0 | Zoom normal |
| `zoomDash` | 0.92 | Zoom al hacer dash (efecto de velocidad) |

---

## 📋 Historial de versiones

Consulta el [CHANGELOG completo](./CHANGELOG.md) para detalles de cada release.

| Versión | Fecha | Highlights |
|---------|-------|-----------|
| **0.0.3-beta** | 2026-05-30 | Menú de inicio (`MenuScene`), 7 tipos de propulsión (`PropulsionType`), power-up MAGNET, mejoras de UI en HUD |
| **0.0.2-beta** | 2026-05-30 | Sistema de powers (7 colores), `TimerManager` MM:SS.cc, `LeaderboardService` top 10, `FinishLine` en Y=-10800 |
| **0.0.1-beta** | 2026-05-29 | Release inicial: mecánica Charge & Dash, ComboSystem ×5, PhysicsManager, LevelGenerator 5 patrones, AudioManager procedural |

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor, lee la [guía de contribución](./CONTRIBUTING.md) antes de abrir un Pull Request.

### Quick start para colaboradores

```bash
# 1. Haz fork del repositorio en GitHub
# 2. Clona tu fork
git clone https://github.com/<tu-usuario>/gravity-swipe.git
cd gravity-swipe
npm install

# 3. Crea una rama con el prefijo adecuado
git checkout -b feat/nombre-de-la-feature
# o
git checkout -b fix/descripcion-del-bug

# 4. Haz tus cambios, commitea con mensajes descriptivos
git commit -m "feat: descripción breve de la funcionalidad"

# 5. Push y abre un Pull Request hacia main
git push origin feat/nombre-de-la-feature
```

### Convenciones del proyecto

- **TypeScript strict** activado; el build fallará con errores de tipo.
- Toda comunicación entre sistemas debe pasar por el **EventBus** — nunca referencias directas entre managers.
- Los nuevos sistemas van en `src/app/game/systems/` y deben tener un tag de log identificativo.
- Los nuevos tipos/interfaces van en `src/app/game/config/types.ts`.

### "Good first issues" — Por dónde empezar

- 🐣 Añadir un nuevo patrón de chunk (patrón F) en `LevelGenerator.ts`
- 🐣 Implementar vibración háptica en móvil con la [Vibration API](https://developer.mozilla.org/es/docs/Web/API/Vibration_API) en `AudioManager`
- 🐣 Añadir un 8.º power-up con su `PowerType`, color y mecánica en `types.ts` + `GameConfig.ts`
- 🐣 Mejorar el tutorial (`tutorial.component.ts`) con animaciones paso a paso
- 🌱 Internacionalizar la UI (inglés/español) con `@ngx-translate`

---

## 📄 Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.

```
MIT License — Copyright (c) 2026 flakorchkdsk1984
```

---

<p align="center">
  Hecho con ❤️ y ☕ por <a href="https://github.com/flakorchkdsk1984">flakorchkdsk1984</a><br>
  <sub>🌀 Gravity Swipe v0.0.3-beta — Angular 17 + Phaser 3.90 + TypeScript 5.2</sub>
</p>
