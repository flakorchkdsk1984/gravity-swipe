# 🌀 Gravity Swipe

[![Versión](https://img.shields.io/badge/versión-0.0.1--beta-blueviolet)](https://github.com/flakorchkdsk1984/gravity-swipe/releases)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-yellow.svg)](./LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://flakorchkdsk1984.github.io/gravity-swipe/)

Juego arcade móvil con estética **neón** desarrollado con **Angular 17** + **Phaser 3**.  
Carga tu energía, lánzate a toda velocidad y destruye obstáculos en una carrera de reflejos frenética.

---

## 📸 Capturas de pantalla

> _Las capturas se agregarán en futuras versiones._

```
[ Screenshot placeholder ]
```

---

## ✨ Características

- 🎮 **Controles táctiles** — Diseñado para móviles (iPhone 14, 390×844)
- ⚡ **Sistema de combo** — Encadena golpes consecutivos para multiplicar tu puntuación
- 🐌 **Efecto slow-motion** — El tiempo se ralentiza al cargar el dash
- 🌈 **Visuales neón** — Partículas, brillos y efectos de cámara estilo arcade retro
- 🎵 **Audio dinámico** — Música y efectos sincronizados con la acción
- ♻️ **Object Pool** — Rendimiento optimizado para 60 fps en móvil

---

## 🕹️ Cómo jugar

1. **Apunta** — Toca y arrastra en la pantalla para definir la dirección del dash.
2. **Carga** — Mantén presionado para acumular energía (activa el slow-motion).
3. **Lánzate** — Suelta el dedo para disparar al jugador en la dirección elegida.
4. **Combos** — Golpea enemigos/obstáculos consecutivos sin tocar el suelo para construir el multiplicador.
5. **Sobrevive** — Evita los obstáculos letales y supera tu récord.

---

## 🛠️ Stack tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Angular | 17 | Framework principal / SPA |
| Phaser | 3 | Motor de juego 2D |
| TypeScript | 5 | Lenguaje (modo strict) |
| GitHub Pages | — | Hosting de la demo |
| GitHub Actions | — | CI/CD automático |

---

## 🚀 Desarrollo local

### Requisitos previos

- **Node.js** ≥ 18
- **npm** ≥ 9

### Instalación

```bash
git clone https://github.com/flakorchkdsk1984/gravity-swipe.git
cd gravity-swipe
npm install
```

### Iniciar el servidor de desarrollo

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200`.

---

## 📦 Build y despliegue

### Build de producción

```bash
npm run build
```

Los archivos compilados se generan en `dist/gravity-swipe/browser/`.

### Despliegue en GitHub Pages

El despliegue se realiza automáticamente al hacer push a la rama `main` mediante el workflow de GitHub Actions (ver [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

Para desplegar manualmente:

```bash
npm run build -- --base-href /gravity-swipe/
# Sube el contenido de dist/ a la rama gh-pages
```

---

## 🔢 Versionado

Este proyecto sigue el estándar **[Semantic Versioning (SemVer)](https://semver.org/lang/es/)**.

- **MAJOR** — Cambios incompatibles con versiones anteriores.
- **MINOR** — Nuevas funcionalidades compatibles con versiones anteriores.
- **PATCH** — Correcciones de errores compatibles con versiones anteriores.
- **-beta** — Versión en desarrollo activo, puede contener cambios sin aviso.

Consulta el [CHANGELOG](./CHANGELOG.md) para el historial completo de cambios.

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Lee la [guía de contribución](./CONTRIBUTING.md) antes de abrir un Pull Request.

---

## 📄 Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.

---

<p align="center">Hecho con ❤️ y ☕ por <a href="https://github.com/flakorchkdsk1984">flakorchkdsk1984</a></p>
