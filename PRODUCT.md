# Product

<!-- impeccable:product-schema 1 -->

Registro de producto de PACHA para Impeccable (`/impeccable teach`, 2026-11-14). Manda sobre lo visual
`docs/diseno.md`; sobre todo lo demás, `CLAUDE.md` y `docs/challenge.md`. Este archivo no decide estética.

## Platform

web

## Users

- **Principal: jurado y mentores del NASA Space Apps** («Dancing with the SARs»). Tienen de 3 a 5 minutos,
  casi siempre en un portátil durante la demo y a veces en el móvil, para entender qué es PACHA, que usa
  radar NISAR de verdad donde lo dice y qué se puede hacer con ella. Se optimizan el primer minuto y la historia guiada.
- Secundarios (confirmados por el challenge): educadores y estudiantes, gestores de recursos (energía, riesgo,
  ambiente) y público general que llega desde un enlace compartido en el teléfono.

## Product Purpose

PACHA lee con radar las marcas que el clima, el cambio climático y los fenómenos naturales dejan en la tierra
del Ecuador (la Pacha Mama). Traduce las observaciones del radar NISAR (banda L, NASA–ISRO) en información que
se entiende y sobre la que se puede actuar. Si funciona, quien la abre por primera vez sabe en segundos qué es,
sigue una historia sin perderse y puede simular un evento por su cuenta.

## Positioning

Dos historias reales del Ecuador, contadas con datos del equipo y con honestidad visible en cada capa:
- **Embalses y lluvia:** Mazar (Sierra, río Paute) y Daule-Peripa (Costa), cómo cambian con la lluvia y la
  sequía y qué significa eso para la energía.
- **Incendios:** Casitagua (Quito, 17 sep 2026), con la superficie quemada y sus impactos estimados.
- Cada capa, serie y exportación dice de dónde sale (`nisar`, `otro_sensor`, `sintetico` o
  `complementario`). Es una app **mixta**: real donde hay procedencia completa, demostración donde no.

## Operating Context

- Se presenta en la demo del hackathon, con pantalla compartida, y la revisa un mentor (que ya marcó errores
  graves de UX: muros de texto, simulador que empieza por los parámetros, navegación sin rumbo).
- Sitio estático en GitHub Pages (`https://jmnss.github.io/PACHA/`). La API de Python corre en el navegador con
  Pyodide; en local corre en un servidor.
- Tres idiomas: español (principal), inglés y kichwa (borrador en revisión por hablantes).

## Capabilities and Constraints

- Destinos previstos: Inicio, Explorar (Historias y Observatorio), Simular (simulador de eventos sobre relieve
  real) y Aprender (Fundamentos, Laboratorio y Recorrido).
- El estado vive en la URL; no hay cuentas.
- La ciencia está en Python (`datos/`, `modelo/`). El frontend no lleva lógica científica.
- Términos técnicos (σ⁰, dB, HH, HV, banda L, ENL, coherencia) siempre explicados la primera vez (`Termino`).

## Brand Commitments

- Nombre: **PACHA**, igual en los tres idiomas.
- Voz: **divulgador cercano**. Tutea y usa frases cortas con verbos de acción («Mira cómo baja el embalse»),
  sin perder el rigor ni las marcas de honestidad.
- Prohibido usar símbolos andinos sagrados (chakana, iconografía ritual) o patrones textiles como decoración.

## Evidence on Hand

- Derivados del equipo en `data/embalses/` y `data/incendios/` (Mazar, Daule-Peripa, Casitagua). Hoy ninguna
  fecha tiene procedencia completa, así que se muestran sustitutos sintéticos etiquetados como tales.
- Lo verificado de NISAR está en `docs/nisar-verificado.md`; lo demás se marca «pendiente de confirmar».
- Datos complementarios reales: NASA POWER, geoBoundaries, relieve SRTM y Copernicus.
- **No hay** testimonios, usuarios ni resultados validados. No se inventan.

## Product Principles

1. La honestidad va primero: la banda «DATOS DE DEMOSTRACIÓN» y los sellos de origen siempre están visibles y
   no se pueden cerrar, en las tres lenguas. Ningún diseño los esconde.
2. Primero la respuesta en palabras llanas, luego la cifra y al final el detalle técnico (divulgación progresiva).
3. Una acción principal por pantalla, y cada flujo encapsulado en pasos para que nadie se pierda.
4. El mapa y el dato son protagonistas; la interfaz se aparta.
5. Toda decisión se evalúa contra `docs/challenge.md`.

## Accessibility & Inclusion

- WCAG 2.2 AA; no puede empeorar lo que ya mide axe (teclado, foco, reflujo a 320 px).
- Rampas de datos perceptualmente uniformes y aptas para daltonismo, sin arcoíris.
- `prefers-reduced-motion` respetado; objetivos táctiles de 44 px en móvil.
