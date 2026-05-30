## 📋 Descripción

<!-- Describe los cambios con suficiente detalle para que el reviewer entienda qué, por qué y cómo -->

**Tipo de cambio:**
- [ ] 🐛 `fix` — corrección de bug
- [ ] ✨ `feat` — nueva funcionalidad
- [ ] 💄 `style` — cambios de estilo/UI sin lógica
- [ ] ♻️ `refactor` — refactorización sin nuevas features
- [ ] ⚡ `perf` — mejora de rendimiento
- [ ] 🧪 `test` — tests (actualmente no hay, futuro)
- [ ] 📖 `docs` — documentación únicamente
- [ ] 🔧 `chore` — tareas de mantenimiento
- [ ] 🚀 `ci` — cambios en CI/CD

**Issues relacionados:**
Closes #<!-- número de issue -->

---

## 🎮 Sistema(s) Afectado(s)

<!-- Marca todos los que aplican -->
- [ ] Player / Física
- [ ] Poderes (PowerManager, PowerObject)
- [ ] Combo / Score
- [ ] Level Generator
- [ ] Partículas / Efectos
- [ ] Cámara
- [ ] Audio
- [ ] HUD / UI (Angular)
- [ ] MenuScene
- [ ] MainGameScene
- [ ] Leaderboard
- [ ] Timer / FinishLine
- [ ] GameLogger / Debug
- [ ] Gobernanza / Documentación
- [ ] CI/CD / Build

---

## ✅ Checklist del autor

**Código:**
- [ ] `npx tsc --noEmit` pasa con 0 errores
- [ ] `npm run build` pasa sin warnings críticos
- [ ] No hay `console.log` en código de producción (usar `GameLogger`)
- [ ] No hay números mágicos (usar `GameConfig.ts`)
- [ ] Métodos públicos tienen tipo de retorno explícito
- [ ] Los objetos de juego frecuentes usan `ObjectPool`
- [ ] Los event listeners se limpian en `destroy()`

**Game design:**
- [ ] Funciona en 390×844px (iPhone 14)
- [ ] Mantiene 60fps en móvil (sin allocations en `update()`)
- [ ] La estética visual es consistente (neon, oscuro)
- [ ] Los nuevos eventos pasan por `EventBus` (no referencias directas entre escenas)

**Documentación:**
- [ ] Actualicé `CHANGELOG.md` si es un cambio notable
- [ ] Actualicé `README.md` si se agregó funcionalidad visible
- [ ] Los comentarios JSDoc están actualizados

---

## 🧪 Pruebas manuales realizadas

<!-- Describe cómo probaste los cambios -->

**Escenarios probados:**
- [ ] Carga inicial (PreloadScene → MenuScene)
- [ ] Flujo completo: Menú → Juego → GameOver → Menú
- [ ] Flujo completo: Menú → Juego → Llegar a la meta → Leaderboard
- [ ] Colisión con poder y cambio de color/propulsión
- [ ] Sistema de combo (× múltiples)
- [ ] GameLogger overlay (tecla backtick)
- [ ] Sin errores en consola durante juego normal

**Dispositivos / browsers probados:**
- [ ] Chrome Desktop
- [ ] Chrome Mobile / DevTools mobile simulator
- [ ] Safari iOS (si aplica)

---

## 📸 Capturas de pantalla

<!-- Si hay cambios visuales, adjunta antes/después -->

| Antes | Después |
|-------|---------|
| | |

---

## ⚠️ Notas para el reviewer

<!-- Áreas de riesgo, decisiones de diseño discutibles, TODOs pendientes -->
