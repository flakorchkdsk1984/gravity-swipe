# Política de Seguridad — Gravity Swipe

**Proyecto**: Gravity Swipe · **Repositorio**: [flakorchkdsk1984/gravity-swipe](https://github.com/flakorchkdsk1984/gravity-swipe)

Gravity Swipe es un juego arcade móvil frontend construido con Angular 17 y Phaser 3.90. Aunque no gestiona datos sensibles de usuarios ni tiene backend propio, tomamos la seguridad en serio porque el proyecto depende de una cadena de suministro de software (dependencias npm) y se ejecuta en el navegador del usuario.

---

## Versiones soportadas

La siguiente tabla indica qué versiones del proyecto reciben correcciones de seguridad activas:

| Versión | Soportada | Notas |
|---------|-----------|-------|
| `0.0.3-beta` | ✅ Activa | Versión actual — recibe todos los parches |
| `0.0.2-beta` | ⚠️ Legado | Sin soporte activo — se recomienda actualizar |
| `0.0.1-beta` | ❌ EOL | No soportada — no recibirá parches |

> **Recomendación**: utiliza siempre la versión más reciente del proyecto. Si detectas una vulnerabilidad en una versión no soportada, repórtala de igual forma — la evaluaremos y, si aplica a la versión actual, la corregiremos allí.

---

## Alcance de seguridad

Aunque se trata de un juego frontend sin autenticación ni datos personales, las siguientes áreas son relevantes desde el punto de vista de seguridad:

### Dentro del alcance ✅

| Área | Descripción | Ejemplo de vulnerabilidad |
|------|-------------|--------------------------|
| **XSS en Angular** | Inyección de scripts a través de templates o bindings inseguros | Uso de `[innerHTML]` sin sanitización sobre datos de `localStorage` |
| **Integridad de localStorage** | Manipulación del leaderboard u otros datos persistidos | Datos malformados que causan excepción no capturada al deserializar |
| **Dependencias npm** | Vulnerabilidades conocidas en librerías de producción | CVE en Phaser, Angular u otras deps de `dependencies` (no `devDependencies`) |
| **Inyección en GitHub Actions** | Workflow injection a través de contextos no sanitizados | `${{ github.event.pull_request.title }}` usado directamente en `run:` |
| **Content Security Policy** | Ausencia de CSP que permita ataques de inyección | Headers de servidor que permitan `unsafe-inline` scripts |
| **Datos sensibles en cliente** | API keys, tokens o URLs privadas hardcodeadas en el código fuente | Credenciales en `GameConfig.ts` o assets del bundle |
| **Prototype pollution** | Manipulación del prototype de objetos a través de entradas JSON | Parsing inseguro de configuración dinámica |

### Fuera del alcance ❌

Las siguientes no son vulnerabilidades en el contexto de este proyecto:

- Puntuaciones falsas o manipuladas en el leaderboard (no existe servidor — el almacenamiento es local e intencional)
- Ataques que requieren acceso físico al dispositivo del usuario
- Bugs de rendimiento o crashes del juego sin impacto de seguridad
- Vulnerabilidades en dependencias de **desarrollo** (`devDependencies`) que no se incluyen en el bundle de producción
- Informes genéricos de herramientas de escaneo sin evidencia de explotabilidad real
- Vulnerabilidades en los propios navegadores o plataformas del sistema operativo

---

## Cómo reportar una vulnerabilidad

**⚠️ Por favor, NO abras un Issue público para reportar vulnerabilidades de seguridad.** Un issue público expone el problema a actores maliciosos antes de que podamos corregirlo.

### Método oficial: reporte privado de GitHub

1. Navega a la pestaña **Security** del repositorio:
   `https://github.com/flakorchkdsk1984/gravity-swipe/security`

2. En la sección **"Vulnerability reports"**, haz clic en **"Report a vulnerability"**.
   > Si no ves esta opción, asegúrate de estar autenticado en GitHub.

3. Completa el formulario con la información más detallada posible:

   **Campos requeridos:**
   - **Título**: descripción breve de la vulnerabilidad (ej. `XSS via unsanitized leaderboard name in MenuScene`)
   - **Descripción**: explicación detallada del problema, su causa raíz y el flujo de ataque
   - **Versión afectada**: una o más versiones donde el problema es reproducible
   - **Severidad estimada**: tu estimación del puntaje CVSS (ver tabla más abajo)

   **Información adicional recomendada:**
   - **Proof of Concept (PoC)**: pasos exactos para reproducir la vulnerabilidad
   - **Impacto**: qué puede conseguir un atacante explotando esta vulnerabilidad
   - **Archivos afectados**: rutas de los archivos o líneas de código implicadas
   - **Sugerencia de solución**: si tienes una propuesta de fix, inclúyela — es muy bienvenida

### Alternativa: email directo

Si el formulario de GitHub no está disponible o prefieres otra vía, puedes contactar directamente a través del perfil de GitHub del mantenedor: [@flakorchkdsk1984](https://github.com/flakorchkdsk1984).

### Qué NO hacer

- ❌ No publiques la vulnerabilidad en Issues públicos
- ❌ No la compartas en redes sociales antes de la divulgación coordinada
- ❌ No la discutas en foros públicos antes de que se publique el parche
- ❌ No utilices la vulnerabilidad para explotar instancias reales del juego

---

## Proceso de respuesta

Una vez recibido tu reporte privado, seguiremos este proceso:

| Etapa | Plazo | Acción |
|-------|-------|--------|
| **Acuse de recibo** | 0–24 horas | Confirmamos que hemos recibido el reporte y abrimos comunicación contigo |
| **Triaje y evaluación** | 1–3 días | Reproducimos el problema, calculamos el CVSS y determinamos la prioridad |
| **Desarrollo del fix** | 3–7 días | Implementamos y revisamos la corrección en rama privada |
| **Publicación del parche** | 7–14 días | Publicamos la versión corregida + CVE si aplica |
| **Divulgación pública** | 30 días | Publicamos los detalles técnicos completos (coordinaremos contigo la fecha) |

> Los plazos pueden variar según la complejidad de la vulnerabilidad. Te mantendremos informado durante todo el proceso.

### Clasificación de severidad (CVSS)

| Puntaje CVSS | Severidad | Tiempo de respuesta al fix |
|--------------|-----------|---------------------------|
| 9.0 – 10.0 | 🔴 **Crítico** | 24 horas |
| 7.0 – 8.9 | 🟠 **Alto** | 72 horas |
| 4.0 – 6.9 | 🟡 **Medio** | 7 días |
| 0.1 – 3.9 | 🟢 **Bajo** | 30 días |

Para calcular el CVSS de tu reporte, puedes usar la [calculadora oficial de CVSS 3.1](https://www.first.org/cvss/calculator/3.1).

---

## Dependencias y auditoría npm

Gravity Swipe depende de librerías de terceros que pueden introducir vulnerabilidades. Mantenemos un proceso de auditoría regular:

### Cómo auditar dependencias

```bash
# Auditar todas las dependencias (producción + desarrollo)
npm audit

# Ver solo vulnerabilidades de dependencias de producción
npm audit --omit=dev

# Intentar aplicar parches automáticos seguros
npm audit fix

# Ver el árbol completo de dependencias vulnerables
npm audit --json | jq '.vulnerabilities'
```

### Política de gestión de vulnerabilidades en deps

- Las vulnerabilidades en **dependencias de producción** (`dependencies`) con severidad **media o superior** deben ser corregidas antes de cualquier release.
- Las vulnerabilidades en **dependencias de desarrollo** (`devDependencies`) se evalúan caso a caso — si no afectan el bundle de producción, pueden tolerarse temporalmente con justificación documentada.
- Las vulnerabilidades marcadas como **"No fix available"** se documentan en este archivo bajo la sección de riesgos conocidos aceptados.

### Riesgos conocidos y aceptados

> Esta sección se actualiza con cada release. Los riesgos listados aquí han sido evaluados y se consideran aceptables para la versión actual.

| Dependencia | CVE / Descripción | Justificación de aceptación |
|-------------|-------------------|-----------------------------|
| *(ninguno actualmente)* | — | — |

---

## Reconocimientos

Agradecemos a todos los investigadores de seguridad que practican la divulgación responsable. Tu trabajo ayuda a mantener el proyecto seguro para todos los jugadores.

### Hall of Fame — Divulgación Responsable

Los investigadores que reporten vulnerabilidades válidas y sigan el proceso de divulgación responsable serán reconocidos aquí (con su permiso):

| Investigador | Vulnerabilidad | Versión afectada | Fecha |
|--------------|----------------|-----------------|-------|
| *(sé el primero en aparecer aquí)* | — | — | — |

> Si no deseas aparecer en esta lista, indícalo en tu reporte y lo respetaremos.

---

*Política de seguridad actualizada para Gravity Swipe v0.0.3-beta · [CONTRIBUTING.md](./CONTRIBUTING.md) · [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)*
