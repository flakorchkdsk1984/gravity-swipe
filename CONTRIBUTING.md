# Guía de Contribución — Gravity Swipe v0.0.3-beta

---

## Bienvenida 🎮

¡Gracias por querer contribuir a **Gravity Swipe**! Este es un proyecto open-source de arcade móvil construido con Angular 17 y Phaser 3.90, y cada aportación —desde un reporte de bug bien documentado hasta una nueva mecánica de juego— ayuda a hacerlo mejor.

Antes de empezar, dedica unos minutos a leer esta guía completa. Está diseñada para que el proceso sea claro y eficiente tanto para ti como para los mantenedores.

Al participar en este proyecto aceptas respetar nuestro [Código de Conducta](./CODE_OF_CONDUCT.md). Buscamos mantener un espacio seguro, inclusivo y técnicamente riguroso para toda la comunidad.

### ¿Qué tipos de contribuciones son bienvenidas?

| Tipo | Descripción |
|------|-------------|
| 🐛 **Reportes de bugs** | Documentar errores reproducibles con toda la información necesaria |
| 💡 **Feature requests** | Proponer nuevas mecánicas o mejoras de UX bien argumentadas |
| 🔧 **Pull Requests** | Código revisado, probado y que siga las convenciones del proyecto |
| 📖 **Documentación** | Mejoras al README, guías, comentarios JSDoc, diagramas de arquitectura |
| 🌐 **Traducciones** | Localización de textos de UI a otros idiomas |
| 🎨 **Assets** | Sprites, efectos de partículas, sonidos (con licencia libre compatible) |
| 🔍 **Code review** | Revisión constructiva de Pull Requests abiertos |

---

## 📋 Antes de empezar

### Para cualquier contribución

1. **Busca antes de crear** — Revisa los [Issues abiertos](https://github.com/flakorchkdsk1984/gravity-swipe/issues) y [Pull Requests](https://github.com/flakorchkdsk1984/gravity-swipe/pulls) para evitar trabajo duplicado.
2. **Lee el estado actual** — Consulta el [CHANGELOG.md](./CHANGELOG.md) para entender qué ya está hecho y qué está en curso.

### Para features o cambios grandes

- **Abre un Issue de discusión primero** antes de escribir código. Describe la idea, el problema que resuelve y cómo encaja con la visión del juego. Espera al menos una señal de los mantenedores antes de invertir tiempo significativo.
- Los cambios que rompen la API pública o modifican el sistema de físicas requieren consenso explícito.

### Para bugs

- Busca en los issues existentes incluyendo los **cerrados** — puede que el bug ya haya sido corregido o descartado con justificación.
- Si encuentras un issue antiguo y el bug sigue presente en la versión actual, **comenta en ese issue** en lugar de crear uno nuevo.

---

## 🐛 Reportar Bugs

Un buen reporte de bug es aquel que permite a un mantenedor **reproducir el problema en menos de 5 minutos** sin hacerte preguntas adicionales. La calidad de la información que aportas determina directamente la velocidad con que se corrige el problema.

### Qué hace un buen reporte de bug

- **Es específico**: describe el comportamiento exacto, no "el juego falla" sino "el jugador atraviesa el obstáculo tipo `PlatformGroup` cuando la velocidad de dash supera ~1800 px/s".
- **Es reproducible**: incluye los pasos exactos para llegar al estado problemático.
- **Tiene contexto técnico**: browser, versión, SO y cualquier mensaje de error de consola.
- **Es objetivo**: describe lo que ocurre y lo que debería ocurrir, sin especulaciones.

### Información requerida (checklist)

Antes de publicar tu reporte, asegúrate de incluir:

- [ ] **Versión del juego**: visible en el footer de MenuScene (ej. `v0.0.3-beta`)
- [ ] **Navegador y versión**: ej. Chrome 125.0.6422.113, Safari 17.4.1, Firefox 126.0
- [ ] **Sistema operativo**: ej. Android 14 / iOS 17.4 / Windows 11 / macOS Sonoma 14.4
- [ ] **Dispositivo**: ej. Samsung Galaxy S23, iPhone 15 Pro, escritorio con ratón
- [ ] **Descripción del bug**: qué ocurrió vs. qué esperabas que ocurriera
- [ ] **Pasos para reproducir**: numerados, concisos y completos
- [ ] **Frecuencia**: ¿ocurre siempre? ¿de forma intermitente? ¿solo en ciertos niveles?
- [ ] **Errores de consola**: copia el stack trace completo (ver sección GameLogger más abajo)
- [ ] **Capturas de pantalla o vídeo** (si aplica): muy útil para bugs visuales

### Formato de pasos para reproducir

```
1. Abrir el juego en [navegador/dispositivo]
2. Pulsar PLAY en el menú principal
3. Recoger el power-up BOOST (aparece en el primer chunk tras 500m)
4. Cargar el dash al máximo (mantener toque ~1.5 s)
5. Lanzar en dirección diagonal hacia el obstáculo tipo muro estrecho
6. Observar: el jugador traspasa el muro en lugar de colisionar
```

### Cómo usar GameLogger para capturar errores

Gravity Swipe incluye un **overlay de debug** accesible en tiempo de ejecución que muestra logs internos del motor de juego, errores de física y estado del sistema:

1. **Abre el overlay**: Pulsa la tecla **backtick** (`` ` ``) mientras el juego está activo. En móvil, se puede activar con un toque largo de 3 segundos en la esquina superior izquierda (si está habilitado en la build).
2. El overlay muestra: FPS actual, entidades activas en el pool, últimos 20 mensajes de `GameLogger`, y errores capturados.
3. Para añadir logs de debug en desarrollo:
   ```typescript
   GameLogger.debug('MiSistema', 'Valor de velocidad:', this._speed);
   GameLogger.warn('Colisión', 'Cuerpo sin masa detectado en:', body.label);
   GameLogger.error('Pool', 'Intento de release de objeto ya libre');
   ```
4. **Exportar logs**: En el overlay, usa el botón "Copy Logs" para copiar todos los mensajes al portapapeles y pégalos directamente en el issue.
5. **Consola del navegador**: Abre DevTools (F12 → Console) y copia los errores en rojo. Incluye el **stack trace completo**, no solo la primera línea.

> ⚠️ **Importante**: El overlay de GameLogger solo está disponible cuando `GameConfig.DEBUG_MODE` es `true`. En builds de producción, usa la consola del navegador.

### Dónde pegar los errores de consola

Dentro del issue, encierra los errores en un bloque de código para mejor legibilidad:

````
```
TypeError: Cannot read properties of undefined (reading 'body')
    at PlayerSystem._applyDash (player-system.ts:142:18)
    at MainGameScene.update (main-game-scene.ts:87:24)
```
````

---

## 💡 Proponer Features

Las propuestas de features son bienvenidas, pero deben estar bien argumentadas. El objetivo es construir el juego más divertido y fluido posible respetando las restricciones técnicas del proyecto.

### Formato de feature request

Abre un Issue con la etiqueta `enhancement` e incluye:

```markdown
## 🎯 Problema / necesidad
Describe la situación actual que quieres mejorar.
Ej: "Actualmente no hay forma de saber cuántos power-ups quedan activos..."

## 💡 Solución propuesta
Describe la funcionalidad que propones, con suficiente detalle técnico.

## 🎮 Valor para el jugador
¿Qué mejora en la experiencia de juego? ¿Qué problema del jugador resuelve?

## 🔄 Alternativas consideradas
¿Qué otras soluciones valoraste y por qué las descartaste?

## 📐 Consideraciones técnicas
¿Afecta al rendimiento? ¿Requiere cambios en la arquitectura?
```

### Cómo describir el valor para el jugador

No propongas features técnicas en abstracto — describe **la experiencia del jugador**:

- ❌ "Añadir un sistema de partículas al trail del jugador"
- ✅ "Cuando el jugador activa BOOST, el rastro debería intensificarse visualmente para reforzar la sensación de velocidad y dar feedback inmediato de que el power-up está activo"

### Consideraciones de diseño del juego

Cualquier feature propuesta debe ser compatible con los principios de diseño de Gravity Swipe:

- **Mobile-first**: toda interacción debe funcionar con un solo dedo en pantallas de 360–430px de ancho. Sin controles que requieran múltiple toque simultáneo.
- **60fps constante**: ninguna feature que introduzca allocations de memoria en el bucle `update()` o que requiera más de 2ms de CPU por frame.
- **Estética neon oscuro**: los elementos visuales deben ser coherentes con la paleta de colores existente (fondos oscuros, trazos de color neón saturado, partículas de luz).
- **Curva de dificultad progresiva**: las features relacionadas con mecánicas de juego deben encajar en el sistema de generación de niveles procedural.
- **Sesiones cortas**: las partidas duran entre 30 segundos y 5 minutos. Las features que impliquen menús complejos o interrupciones largas no encajan en el diseño.

### Qué features están fuera del alcance

Las siguientes categorías de features **no serán aceptadas** en esta etapa del proyecto:

- Multijugador online o en tiempo real
- Sistemas de monetización, publicidad o compras dentro del juego
- Backend propio o autenticación de usuarios (los scores se guardan en `localStorage`)
- Cambios de motor (no se migrará a otro framework de juego)
- Rediseño visual completo de la paleta de colores o UI
- Features que requieran permisos del dispositivo (cámara, micrófono, GPS)

---

## 🔧 Configurar el entorno de desarrollo

### Prerrequisitos

Asegúrate de tener instaladas las versiones mínimas requeridas:

```bash
node --version   # debe ser >= 18.0.0
npm --version    # debe ser >= 9.0.0
git --version    # cualquier versión reciente
```

Si necesitas gestionar múltiples versiones de Node, se recomienda [nvm](https://github.com/nvm-sh/nvm) o [fnm](https://github.com/Schniz/fnm).

### Fork y clonado

```bash
# 1. Haz un fork desde GitHub: https://github.com/flakorchkdsk1984/gravity-swipe/fork

# 2. Clona TU fork (reemplaza <tu-usuario> por tu nombre de usuario de GitHub)
git clone https://github.com/<tu-usuario>/gravity-swipe.git
cd gravity-swipe

# 3. Añade el repositorio original como remote "upstream" para poder sincronizar
git remote add upstream https://github.com/flakorchkdsk1984/gravity-swipe.git

# 4. Verifica los remotes
git remote -v
# origin    https://github.com/<tu-usuario>/gravity-swipe.git (fetch)
# origin    https://github.com/<tu-usuario>/gravity-swipe.git (push)
# upstream  https://github.com/flakorchkdsk1984/gravity-swipe.git (fetch)
# upstream  https://github.com/flakorchkdsk1984/gravity-swipe.git (push)
```

### Instalación de dependencias

```bash
npm install
```

> Si ves advertencias de `peer dependencies`, son esperadas por la combinación de Angular 17 y Phaser 3.90. No ejecutes `npm install --legacy-peer-deps` a menos que se indique explícitamente.

### Iniciar el servidor de desarrollo

```bash
npm start
# → Compilando con Angular CLI + Webpack
# → Servidor disponible en: http://localhost:4200
# → Hot Module Replacement activo: los cambios en código se reflejan sin recargar
```

El juego debería abrir en el navegador automáticamente. Si no, navega a `http://localhost:4200`.

### Comandos útiles

```bash
# Verificación de tipos TypeScript (sin compilar)
npx tsc --noEmit
# Debe terminar sin ningún error antes de hacer commit

# Build de producción
npm run build
# Genera los artefactos en dist/gravity-swipe/
# Debe completarse sin errores y sin warnings críticos

# Linting
npm run lint
# Ejecuta ESLint sobre todo el código TypeScript del proyecto
```

### Consejos para el entorno de desarrollo

**Chrome DevTools para debug de Phaser:**
- Abre DevTools (F12) y ve a la pestaña **Performance** para analizar frame drops.
- En la pestaña **Application → Local Storage**, puedes inspeccionar y editar los datos del leaderboard en tiempo real.
- Usa la extensión [Phaser Editor 2D](https://phasereditor2d.com/) o el inspector de canvas en DevTools para visualizar el scene graph de Phaser.

**GameLogger durante el desarrollo:**
- Pulsa `` ` `` (backtick) en el juego en ejecución para abrir el overlay de debug.
- Añade logs en tu código de desarrollo usando:
  ```typescript
  GameLogger.debug('MiClase', 'Mensaje descriptivo', valorOpcional);
  GameLogger.warn('MiClase', 'Advertencia sobre estado inesperado');
  GameLogger.error('MiClase', 'Error crítico:', error);
  ```
- **Nunca dejes `GameLogger.debug()` en código de producción** — el linter lo detectará como warning, pero los revisores lo rechazarán en PR.

**Sincronizar con upstream antes de trabajar:**
```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main   # actualiza tu fork
```

---

## 🌿 Flujo de ramas (Git Flow simplificado)

```
main ─────────────────────────────────────────── producción estable
  │
  ├── feat/orbit-shot-trajectory ── commits ── PR → merge ──┤
  │                                                          │
  ├── fix/player-clip-thin-wall ──── commits ── PR → merge ──┤
  │                                                          │
  └── docs/architecture-diagram ─── commits ── PR → merge ──┘
```

### Nomenclatura de ramas

| Prefijo | Uso | Ejemplo |
|---------|-----|---------|
| `feat/` | Nueva funcionalidad | `feat/orbit-shot-power` |
| `fix/` | Corrección de bug | `fix/player-clip-obstacle` |
| `docs/` | Documentación | `docs/architecture-diagram` |
| `perf/` | Optimización de rendimiento | `perf/object-pool-release` |
| `refactor/` | Refactorización sin cambio de comportamiento | `refactor/level-chunk-classes` |
| `style/` | Cambios de formato/estilo de código | `style/player-trail-spacing` |
| `chore/` | Mantenimiento (deps, configs, CI) | `chore/phaser-3.90-update` |

### Reglas de ramas

1. **Siempre ramifica desde `main`** — nunca desde otra rama de feature.
2. **Una rama por feature o fix** — no mezcles cambios no relacionados en la misma rama.
3. **Vida corta** — una rama no debería durar más de 1-2 semanas. Si el trabajo lleva más tiempo, divide en PRs más pequeños.
4. **Rebase antes de abrir PR** — sincroniza con `main` justo antes de abrir el Pull Request:
   ```bash
   git fetch upstream
   git rebase upstream/main
   # Resuelve conflictos si los hay
   git push origin feat/mi-feature --force-with-lease
   ```
5. **Elimina la rama tras el merge** — el repositorio no debe acumular ramas huérfanas.

---

## ✏️ Convención de commits (Conventional Commits)

Este proyecto sigue el estándar **[Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/)**, que permite generar el CHANGELOG automáticamente y comunicar el impacto de cada cambio con claridad.

### Formato completo

```
<tipo>(<ámbito>): <descripción corta en imperativo>

[cuerpo opcional: explica el QUÉ y el POR QUÉ, no el CÓMO]
[máximo 72 caracteres por línea]

[footer(s) opcionales]
[BREAKING CHANGE: descripción del breaking change]
[Closes #123]
```

### Tipos permitidos

| Tipo | Cuándo usarlo |
|------|---------------|
| `feat` | Se añade una nueva funcionalidad visible para el usuario |
| `fix` | Se corrige un bug |
| `docs` | Solo cambia documentación (README, JSDoc, guías) |
| `style` | Cambios de formato, espaciado, comas (sin cambios de lógica) |
| `refactor` | Reorganización de código sin cambio de comportamiento ni bug fix |
| `perf` | Cambio que mejora el rendimiento medible |
| `test` | Añadir o corregir tests |
| `chore` | Tareas de mantenimiento que no afectan el código de producción |
| `ci` | Cambios en la configuración de CI/CD (GitHub Actions, etc.) |
| `build` | Cambios en el sistema de build (webpack, angular.json, tsconfig) |
| `revert` | Revierte un commit anterior |

### Ámbitos del proyecto

Los ámbitos deben corresponder a módulos o sistemas reales del juego:

| Ámbito | Área de código |
|--------|----------------|
| `player` | `systems/PlayerSystem`, `objects/Player` |
| `scene` | Cualquier Phaser Scene (`MainGameScene`, `MenuScene`, etc.) |
| `ui` | Componentes Angular de UI (`ui/` folder) |
| `physics` | Sistema de colisiones y cuerpos de Phaser Matter |
| `audio` | Gestión de audio y efectos de sonido |
| `particles` | Sistemas de partículas y efectos visuales |
| `level` | `LevelGenerator`, chunks, patrones de obstáculos |
| `combo` | Sistema de combos y multiplicadores |
| `score` | Cálculo y almacenamiento de puntuaciones |
| `power` | Power-ups, efectos y propulsiones especiales |
| `config` | `GameConfig.ts`, constantes globales |
| `ci` | Workflows de GitHub Actions |
| `deps` | Actualización de dependencias |

### Ejemplos específicos del proyecto

```bash
# Nueva funcionalidad de power-up con trayectoria curva
feat(power): add ORBIT_SHOT curved trajectory propulsion

# Corrección de bug de física a alta velocidad
fix(physics): prevent player clipping through thin obstacles at high speed

# Optimización de gestión de memoria en el object pool
perf(pool): reduce GC pressure in ObjectPool.releaseAll()

# Documentación con diagrama de arquitectura
docs(readme): add architecture diagram and system reference

# Estilo de código sin cambios de lógica
style(player): fix inconsistent spacing in _drawTrail method

# Refactorización del generador de niveles
refactor(level): extract chunk pattern logic to separate classes

# Actualización de dependencia mayor
chore(deps): update Phaser from 3.88 to 3.90

# Mejora del pipeline de CI
ci(deploy): add build cache to GitHub Actions workflow

# Corrección crítica de seguridad en una dependencia
fix(deps)!: patch XSS vulnerability in angular-sanitize

BREAKING CHANGE: Requires Angular 17.3.0 or higher due to security patch.
Closes #42
```

### Reglas del mensaje de commit

- **Descripción corta**: máximo 72 caracteres, en inglés, en imperativo presente ("add", "fix", "update", no "added", "fixed", "updated")
- **Cuerpo**: explica el *por qué* del cambio, no el *cómo*. El código ya dice el cómo.
- **Breaking changes**: usa `feat!:` o `fix!:` y añade siempre el footer `BREAKING CHANGE:` con una descripción del impacto.
- **Referencias a issues**: añade `Closes #123` o `Refs #123` en el footer.
- **Un commit, un propósito**: no mezcles feat + fix en el mismo commit.

---

## 📐 Estilo de código

### TypeScript

- **`strict: true`** está activo en `tsconfig.json`. No se admiten `any` implícitos ni retornos implícitos.
- **Tipos de retorno explícitos** en todos los métodos públicos:
  ```typescript
  // ✅ Correcto
  public getDashVelocity(): Phaser.Math.Vector2 { ... }

  // ❌ Incorrecto
  public getDashVelocity() { ... }
  ```
- **Interfaces sobre type aliases** para formas de objetos:
  ```typescript
  // ✅ Preferido
  interface IPlayerConfig { speed: number; dashForce: number; }

  // ❌ Evitar para objetos
  type PlayerConfig = { speed: number; dashForce: number; };
  ```
- **`readonly`** para constantes de configuración:
  ```typescript
  readonly MAX_DASH_CHARGE: number = 2000;
  ```
- **Sin números mágicos**: usa constantes nombradas de `GameConfig.ts`. Un número mágico es cualquier literal numérico sin un nombre que explique su significado.
  ```typescript
  // ❌ Incorrecto
  if (this._speed > 1800) { ... }

  // ✅ Correcto
  if (this._speed > GameConfig.PLAYER.MAX_SAFE_SPEED) { ... }
  ```
- **Longitud máxima de archivo**: ~400 líneas. Si un archivo supera ese límite, evalúa dividirlo en clases o módulos más pequeños.

### Angular

- **`OnPush` change detection** en todos los componentes donde sea posible:
  ```typescript
  @Component({ changeDetection: ChangeDetectionStrategy.OnPush })
  ```
- **Desuscribirse en `ngOnDestroy`** usando `takeUntil(this._destroy$)` o `Subscription.unsubscribe()`:
  ```typescript
  private readonly _destroy$ = new Subject<void>();

  ngOnInit(): void {
    this._gameState.score$
      .pipe(takeUntil(this._destroy$))
      .subscribe(score => this.score = score);
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
  ```
- **`NgZone.runOutsideAngular`** para todo el código de Phaser, ya que el bucle de juego no debe disparar la detección de cambios de Angular en cada frame:
  ```typescript
  constructor(private _ngZone: NgZone) {}

  public startGame(): void {
    this._ngZone.runOutsideAngular(() => {
      this._phaserGame = new Phaser.Game(config);
    });
  }
  ```

### Phaser

- **Destruir emitters de partículas** tras efectos de un solo uso:
  ```typescript
  // Al terminar la explosión, destruir el emitter para liberar memoria
  emitter.on('complete', () => emitter.destroy());
  ```
- **Usar `ObjectPool`** para todos los objetos creados y destruidos frecuentemente (proyectiles, partículas de trail, chunks de nivel). Nunca usar `new` dentro del bucle `update()`.
- **`EventBus` en lugar de referencias directas a escenas**: las escenas no deben tener referencias directas entre sí. Usa el `EventBus` global para comunicación entre sistemas:
  ```typescript
  // ✅ Correcto
  EventBus.emit(GameEvent.SCORE_UPDATED, { score: newScore });

  // ❌ Incorrecto
  (this.scene.get('MainGameScene') as MainGameScene).updateScore(newScore);
  ```
- **`setDepth()` en todos los game objects**: define la profundidad explícitamente para control predecible del orden de renderizado. Consulta la tabla de capas en `GameConfig.ts`:

  | Capa | Profundidad | Uso |
  |------|-------------|-----|
  | Background | 0 | Fondo y efectos de parallax |
  | Obstacles | 10 | Obstáculos del nivel |
  | Player | 20 | Sprite del jugador |
  | Particles | 25 | Efectos de partículas del trail |
  | UI | 30 | HUD (timer, combo, score) |
  | Overlay | 40 | Pantallas de pausa/game over |
  | Debug | 50 | Overlay de GameLogger (solo debug) |

### Convenciones de nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Phaser Scenes | `PascalCase` + sufijo `Scene` | `MainGameScene`, `PreloadScene` |
| Sistemas de juego | `PascalCase` + sufijo `Manager` o `System` | `PlayerSystem`, `LevelManager` |
| Componentes Angular | `PascalCase` + sufijo `Component` | `ScoreDisplayComponent` |
| Servicios Angular | `PascalCase` + sufijo `Service` | `GameStateService` |
| Eventos | `GameEvent.CATEGORIA_ACCION` (enum UPPER_SNAKE) | `GameEvent.PLAYER_DASH_START` |
| Métodos privados | `_camelCase` con prefijo guión bajo | `_calculateTrajectory()` |
| Constantes de módulo | `UPPER_SNAKE_CASE` | `MAX_OBSTACLES_PER_CHUNK` |
| Interfaces | Prefijo `I` + `PascalCase` | `IGameConfig`, `IPlayerState` |

---

## 🔍 Code Review

Todos los Pull Requests pasan por revisión de código antes de ser mergeados. El objetivo de la revisión no es buscar errores triviales de estilo (eso lo hace el linter), sino garantizar la calidad, mantenibilidad y rendimiento del código.

### Qué verifican los revisores

**Corrección técnica:**
- Verificar que `npx tsc --noEmit` pasa con 0 errores en la rama del PR.
- Que la lógica implementada hace lo que el PR describe.
- Que los edge cases están cubiertos o documentados.

**Calidad de código:**
- Sin `console.log` ni `console.error` directos — usa siempre `GameLogger`.
- Sin valores hardcodeados — todos los números y strings de configuración deben estar en `GameConfig.ts`.
- Nombres de variables y métodos descriptivos y en el idioma correcto (inglés técnico).

**Rendimiento:**
- Sin allocations de objetos en el bucle `update()` (nada de `new Vector2()`, array spreads, etc.).
- Uso correcto del `ObjectPool` para objetos de corta vida.
- Sin listeners de eventos que no se limpien en `destroy()`.

**Memoria y ciclo de vida:**
- Todos los event listeners añadidos en `create()` o `init()` son eliminados en `destroy()`.
- Los emitters de partículas de un solo uso se destruyen tras completarse.
- Las suscripciones de RxJS están gestionadas con `takeUntil` o `Subscription`.

**Compatibilidad mobile:**
- Los cambios de UI mantienen compatibilidad con pantallas de 360px de ancho mínimo.
- No hay interacciones que requieran hover state (los móviles no tienen hover).

### Como autor de un PR

- Responde a todos los comentarios de revisión, aunque sea para decir "Entendido, cambiaré X en el próximo commit".
- No hagas fuerza bruta de merges sin resolver los comentarios — los revisores aprueban cuando están satisfechos.
- Agrupa los commits de revisión con `git commit --fixup` + `git rebase --autosquash` antes del merge final.

---

## 🧪 Verificación pre-PR

Antes de abrir un Pull Request, completa la siguiente verificación obligatoria:

### Verificación automática

```bash
# 1. Verificación de tipos — debe pasar con CERO errores
npx tsc --noEmit

# 2. Build de producción — debe completarse sin errores
npm run build

# 3. Linting — debe pasar sin errores (warnings son aceptables si son justificados)
npm run lint
```

### Test manual funcional

Ejecuta el juego con `npm start` y verifica punto por punto:

- [ ] El juego carga completamente y `PreloadScene` completa sin errores en consola
- [ ] `MenuScene` muestra correctamente los botones **PLAY** y **BEST TIMES**
- [ ] El juego inicia desde el menú al pulsar PLAY
- [ ] El jugador puede cargar energía (mantener toque/click) — el indicador visual de carga funciona
- [ ] El jugador puede apuntar con el dedo/ratón y el indicador de dirección responde
- [ ] El jugador ejecuta el dash al soltar — la física es correcta
- [ ] Los power objects aparecen en el nivel y tienen colisión activa
- [ ] El jugador puede recoger un power object (colisión + efecto visual)
- [ ] El color del jugador cambia al recoger el power-up
- [ ] La propulsión cambia según el tipo de power-up recogido
- [ ] La línea de meta es visible y tiene colisión activa
- [ ] Cruzar la línea de meta detiene el timer y activa la pantalla de resultado
- [ ] El timer arranca al inicio del nivel y se detiene al llegar a la meta
- [ ] El leaderboard guarda el tiempo correctamente en `localStorage`
- [ ] El leaderboard se muestra correctamente en `MenuScene` al pulsar BEST TIMES
- [ ] La pantalla de Game Over aparece al colisionar con un obstáculo mortal
- [ ] El botón de Restart en Game Over reinicia el nivel correctamente
- [ ] No hay errores en rojo en la consola del navegador durante una partida normal completa
- [ ] El rendimiento es fluido (≥ 55fps constante) en el dispositivo/navegador objetivo

### Descripción del PR

El cuerpo del Pull Request debe incluir:

```markdown
## ¿Qué hace este PR?
Descripción clara y concisa del cambio.

## ¿Por qué es necesario?
Contexto del problema que resuelve.

## Cómo probarlo
Instrucciones específicas para verificar el cambio manualmente.

## Checklist
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] `npm run build` completa sin errores
- [ ] Test manual funcional completado
- [ ] No hay `console.log` ni valores hardcodeados
- [ ] El PR no incluye archivos de `dist/` ni `node_modules/`
```

---

## 🏗️ Guía de arquitectura rápida

Si eres nuevo en la base de código, esta referencia te ayudará a saber exactamente dónde añadir cada tipo de cambio.

### ¿Dónde añado...?

| Qué quieres añadir | Dónde va | Notas |
|---|---|---|
| Nueva mecánica de juego | `src/app/game/systems/` + cablear en `MainGameScene` | Crea una clase `*System` o `*Manager` |
| Nuevo tipo de obstáculo | `src/app/game/objects/Obstacle.ts` + `LevelGenerator.ts` | Registra en el pool en `MainGameScene.create()` |
| Nuevo elemento de UI | Componente Angular en `src/app/ui/` + `GameStateService` | Usa `OnPush` y RxJS para reactividad |
| Nuevo evento de juego | `src/app/game/types.ts` enum `GameEvent` + uso en `EventBus` | Documenta el payload del evento con un tipo |
| Nuevo valor de configuración | `src/app/game/GameConfig.ts` + interfaz `IGameConfig` | Sigue la estructura de objetos anidados existente |
| Nuevo power-up | `src/app/game/systems/PowerSystem.ts` + enum `PowerType` | Implementa el efecto de propulsión y el color |
| Nueva escena de Phaser | `src/app/game/scenes/` + registrar en `GameConfig` | Hereda de `Phaser.Scene`, usa `EventBus` para comunicación |
| Nueva pantalla de UI Angular | `src/app/ui/` + ruta en `AppRoutingModule` si aplica | Inyecta `GameStateService` para leer el estado |

### Sistemas principales del juego

```
src/app/game/
├── scenes/
│   ├── PreloadScene.ts       ← Carga de assets, Progress bar
│   ├── MenuScene.ts          ← Menú principal, leaderboard
│   └── MainGameScene.ts      ← Escena principal del juego
├── systems/
│   ├── PlayerSystem.ts       ← Física del jugador, dash, trail
│   ├── LevelGenerator.ts     ← Generación procedural de chunks
│   ├── PowerSystem.ts        ← Power-ups y efectos
│   └── ...
├── objects/
│   ├── Player.ts             ← Sprite y cuerpo físico del jugador
│   ├── Obstacle.ts           ← Tipos de obstáculos
│   └── ...
├── utils/
│   ├── ObjectPool.ts         ← Pool de objetos reutilizables
│   ├── EventBus.ts           ← Bus de eventos global
│   └── GameLogger.ts         ← Sistema de logging con overlay
├── GameConfig.ts             ← Todas las constantes de configuración
└── types.ts                  ← Interfaces, enums, tipos compartidos
```

---

## 📞 Comunicación

- **[GitHub Issues](https://github.com/flakorchkdsk1984/gravity-swipe/issues)**: para bugs concretos y feature requests formales.
- **[GitHub Discussions](https://github.com/flakorchkdsk1984/gravity-swipe/discussions)**: para preguntas sobre la arquitectura, ideas en fase temprana, o dudas generales del proyecto.
- **Pull Request comments**: para discusiones técnicas sobre código específico.

Al comunicarte, sé específico, constructivo y respetuoso. Recuerda que los mantenedores trabajan en este proyecto en su tiempo libre.

Para cualquier preocupación sobre la comunidad o el código de conducta, usa el [sistema de reporte privado de GitHub](https://github.com/flakorchkdsk1984/gravity-swipe/security/advisories/new).

---

*Guía actualizada para Gravity Swipe v0.0.3-beta · [Código de Conducta](./CODE_OF_CONDUCT.md) · [Política de Seguridad](./SECURITY.md)*
