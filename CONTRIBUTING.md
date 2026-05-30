# Guía de Contribución — Gravity Swipe

¡Gracias por tu interés en contribuir a Gravity Swipe! 🎮  
Lee esta guía antes de abrir issues o Pull Requests para que el proceso sea fluido para todos.

---

## 📋 Reportar errores (Bugs)

1. Busca en los [Issues existentes](https://github.com/flakorchkdsk1984/gravity-swipe/issues) para evitar duplicados.
2. Si el bug no existe, abre un **nuevo Issue** usando la plantilla **Bug Report**.
3. Incluye:
   - Descripción clara y concisa del error.
   - Pasos para reproducirlo.
   - Comportamiento esperado vs comportamiento actual.
   - Capturas de pantalla o vídeo si aplica.
   - Entorno: navegador, SO, dispositivo.

---

## 💡 Sugerir nuevas características

1. Abre un **nuevo Issue** usando la plantilla **Feature Request**.
2. Explica el problema que resuelve la nueva funcionalidad.
3. Describe la solución propuesta y posibles alternativas.
4. Argumenta por qué sería útil para el proyecto.

> Las sugerencias se revisarán y discutirán antes de aceptarse.

---

## 🔧 Flujo de trabajo de desarrollo

```
fork → branch → cambios → tests → PR
```

### Pasos detallados

1. **Haz un fork** del repositorio en GitHub.
2. **Clona** tu fork localmente:
   ```bash
   git clone https://github.com/<tu-usuario>/gravity-swipe.git
   cd gravity-swipe
   npm install
   ```
3. **Crea una rama** descriptiva a partir de `main`:
   ```bash
   git checkout -b feat/nombre-de-la-feature
   # o
   git checkout -b fix/nombre-del-bug
   ```
4. **Implementa** tus cambios respetando el estilo de código (ver sección siguiente).
5. **Verifica** que el proyecto compila sin errores:
   ```bash
   npm run build
   ```
6. **Haz commit** siguiendo la convención de mensajes (ver más abajo).
7. **Sube** tu rama y abre un **Pull Request** contra `main`.

---

## 🎨 Estilo de código

- **TypeScript en modo strict** — `strict: true` en `tsconfig.json`. Sin `any` explícitos.
- **Convenciones de Angular** — Sigue la [guía de estilo oficial de Angular](https://angular.dev/style-guide).
- **Nombres descriptivos** — Clases en `PascalCase`, variables/funciones en `camelCase`, constantes en `UPPER_SNAKE_CASE`.
- **Sin código comentado** — Elimina código muerto antes de hacer commit.
- **Componentes pequeños** — Cada clase/componente debe tener una única responsabilidad.
- **Phaser Scenes** — Cada escena en su propio archivo, sistemas en clases separadas.

---

## ✏️ Convención de mensajes de commit

Este proyecto usa **[Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/)**.

### Formato

```
<tipo>(<ámbito opcional>): <descripción corta>

[cuerpo opcional]

[footer(s) opcionales]
```

### Tipos permitidos

| Tipo | Descripción |
|------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de error |
| `docs` | Cambios en documentación |
| `style` | Formato, espaciado (sin cambios lógicos) |
| `refactor` | Refactorización sin cambio de comportamiento |
| `perf` | Mejoras de rendimiento |
| `test` | Añadir o corregir tests |
| `chore` | Tareas de mantenimiento (deps, configs) |
| `ci` | Cambios en pipelines de CI/CD |

### Ejemplos

```
feat(combo): agregar multiplicador x5 por combo perfecto
fix(input): corregir detección de arrastre en iOS 17
docs(readme): actualizar instrucciones de instalación
perf(pool): reducir allocations en ObjectPool
```

---

## ✅ Checklist antes de abrir un PR

- [ ] El código compila sin errores (`npm run build`).
- [ ] Los cambios están cubiertos o explicados.
- [ ] El mensaje de commit sigue Conventional Commits.
- [ ] El PR tiene una descripción clara del cambio y su motivación.
- [ ] No se incluyen archivos generados (`dist/`, `node_modules/`).

---

## 🙏 Código de Conducta

Al participar en este proyecto, aceptas respetar el [Código de Conducta](./CODE_OF_CONDUCT.md).
