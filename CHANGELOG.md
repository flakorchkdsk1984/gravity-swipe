# Registro de Cambios

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/)
y este proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

---

## [Sin publicar]

_Próximos cambios pendientes de lanzamiento._

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
