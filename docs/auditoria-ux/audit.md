# Auditoría técnica de PACHA (Impeccable `audit`)

- Fecha: 2026-11-14 · rama `rediseno-pacha` · app servida en `http://localhost:8000` (modo `servidor`, `frontend/dist` ya construido).
- Pantallas: Historias (`/?idioma=es`), Observatorio (`/observatorio?idioma=es`), Simulador (`/simulador?idioma=es`), a 1440×900 y 390×844 (más 320×640 para el reflujo).
- Herramientas: Playwright (Chromium 1248 de `CHROME_PATH`), `@axe-core/playwright` del repo con las mismas etiquetas que `frontend/e2e/accesibilidad.spec.ts` (`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`), detector de Impeccable (`impeccable detect --json`, en archivos y en URL a los dos anchos).
- Scripts y datos crudos: `auditar.mjs`, `detalle.mjs`, `fecha.mjs`, `resultados.json`, `detect-*.json` en esta misma carpeta. Capturas en `capturas/`.
- Regla de honestidad: la banda «DATOS DE DEMOSTRACIÓN» y los sellos de origen se dan por fijos. Ninguna recomendación los oculta, los cierra ni les baja el contraste.
- Sustitución declarada: el contexto de Impeccable no encontró DESIGN.md. Esta auditoría toma `docs/diseno.md` como sistema visual (lo que manda PRODUCT.md) y no abre preguntas de dirección visual, porque es solo una auditoría.

## 1. Línea base de axe (no puede empeorar)

Violaciones (todas las severidades, no solo serious/critical) por pantalla y ancho:

| Pantalla | Ancho | Violaciones (reglas) | Nodos | Por regla | «Incompletas» (revisión manual) |
|---|---|---|---|---|---|
| Historias | 1440 | **0** | 0 | — | color-contrast: 3 nodos |
| Historias | 390 | **0** | 0 | — | color-contrast: 3 nodos |
| Observatorio | 1440 | **0** | 0 | — | color-contrast: 28 nodos |
| Observatorio | 390 | **0** | 0 | — | color-contrast: 20 nodos |
| Simulador | 1440 | **0** | 0 | — | color-contrast: 1 nodo |
| Simulador | 390 | **0** | 0 | — | color-contrast: 4 nodos |
| **Total** | | **0** | **0** | | 59 nodos «incompletos» |

Las «incompletas» no son infracciones: axe no puede calcular el fondo porque el texto está encima del mapa o de una imagen
(`.mapa__atribucion`, `.vista-mapa__capa`, pestañas Oscuro/Satélite/Relieve, `.leyenda__categoria`, `.comparador__fecha--antes/--despues`,
`.historia__parrafo` que se solapa con el comparador). Las placas usan `color-mix(var(--surface) 85%)` y en las capturas se leen bien; se
recomienda una comprobación de píxel cuando cambie el mapa base (F-12).

Criterio para no empeorar: 0 reglas y 0 nodos en las seis combinaciones; las «incompletas» no deberían subir de 59.

## 2. Puntuación de salud

| # | Dimensión | Nota | Hallazgo clave |
|---|---|---|---|
| 1 | Accesibilidad | 3 | El lienzo del mapa recibe el foco sin indicador visible (`mapa.css:14`) |
| 2 | Rendimiento | 3 | Entrada de 140 KB gz con los tres catálogos de idioma; MapLibre (260 KB gz) solo en el Observatorio |
| 3 | Tema | 3 | Sistema de tokens completo y sin colores sueltos; solo tema oscuro (decisión de `docs/diseno.md §4`) |
| 4 | Responsive | 3 | Sin desbordes a 320 px; varios objetivos por debajo de 44 px a 390 |
| 5 | Integridad de implementación | 4 | El detector solo da avisos tipográficos; el sistema es coherente y propio |
| **Total** | | **16/20** | **Bueno** |

**Veredicto de integridad: pasa.** El código expresa un sistema propio: colores, alturas y radios salen de `frontend/src/diseno/tokens.css`
(ningún hex ni `rgba()` suelto en `pantallas/{historias,observatorio,simulador}` ni en `diseno/` fuera de `tokens.css` y `rampas.ts`), los
componentes compartidos (`Boton`, `Campo`, `Deslizador`, `Interruptor`, `Pestanas`, `Termino`, `SelloOrigen`) se reutilizan, y el
detector de Impeccable no encontró antipatrones de diseño: 0 hallazgos en archivos y, en URL, solo 10 avisos «straggler» (palabra suelta al
final del párrafo) y 1 de interlineado ajustado (`p.simulador__nota`, 1,23×).

## 3. Medidas

**Tiempo hasta el primer contenido útil** (h1 visible; «listo» = sin `aria-busy`):

| Pantalla | Ancho | FCP | h1 visible | LCP (elemento) | Listo |
|---|---|---|---|---|---|
| Historias | 1440 | 380 ms | 649 ms | 880 ms (`p.historia__parrafo`) | 1,7 s |
| Historias | 390 | 188 ms | 275 ms | 372 ms | 1,0 s |
| Observatorio | 1440 | 320 ms | 1335 ms | 940 ms (`p.panel-sim__intro`) | 2,5 s |
| Observatorio | 390 | 176 ms | 696 ms | 176 ms (`p.banda-demo__texto`) | 1,6 s |
| Simulador | 1440 | 192 ms | 332 ms | 356 ms (`img.tablero__capa`) | 0,9 s |
| Simulador | 390 | 180 ms | 325 ms | 256 ms | 0,9 s |

Carga en frío limitada (390 px, CPU ×4, 1,6 Mbps, 150 ms de latencia, sin caché): Historias h1 3,7 s / LCP 4,5 s / 344 KB transferidos;
Observatorio h1 4,4 s / listo 6,5 s / 572 KB; Simulador h1 2,5 s / listo 3,9 s / 542 KB. **No se midió el modo Pages (Pyodide)**, que
añade la descarga y el arranque del motor; esa es la carga que verá el jurado desde `jmnss.github.io`.

**JS en `frontend/dist/assets`** (bruto / gzip): `useInstante-*.js` 940 KB / 260 KB (MapLibre; solo lo pide el Observatorio, y la entrada lo
referencia como import dinámico) · `index-*.js` 470 KB / 140 KB (entrada: React, router, React Query y los catálogos es/en/qu) ·
`motor.worker-*.js` 81 KB / 23 KB · `Observatorio` 63 / 21 KB · `Historias` 38 / 12 KB · `Simulador` 25 / 9 KB. CSS: `useInstante-*.css`
67 KB, `index-*.css` 34 KB. Las rutas ya se cargan con `lazy()` (`frontend/src/App.tsx:10-16`).

**Contraste de los tokens de texto** (calculado, WCAG 2.x):

| Token | sobre `--ground` | sobre `--surface` | sobre `--raised` |
|---|---|---|---|
| `--text` #fff | 17,9 | 18,6 | 16,2 |
| `--secondary` #b4b4b8 | 8,7 | 9,0 | 7,8 |
| `--muted` #8a8c92 | 5,3 | 5,6 | 4,8 |
| `--accent` #e5b93c | 9,7 | 10,1 | 8,8 |
| `--positive` #44a282 | 5,7 | 6,0 | 5,2 |
| `--negative` #e5566f | 5,0 | 5,2 | **4,55** |
| `--warning` #e0773a | 5,9 | 6,1 | 5,3 |
| `--control` (borde, 3:1) | 3,4 | 3,6 | **3,10** |

Pastillas: positiva 7,1 · negativa **4,62** · aviso 5,4 · neutra 8,7. Banda: `--demo-ink` sobre `--demo-bg` 8,2; `--muted` sobre `--demo-bg` 4,9.
Todo pasa AA; los márgenes en negrita son estrechos (F-11).

**Teclado:** orden real desde la carga: «Saltar al contenido» → riel (6 destinos + idioma) → «Qué significa» de la banda → contenido en orden
de lectura. Sin trampas de foco en 35 tabulaciones por pantalla. Indicador global `:focus-visible` de 2 px blanco con 2 px de separación
(`componentes.css:10`). Excepciones en F-01 y F-05. El divisor del comparador marcaba «sin anillo», pero es un falso positivo: el anillo va en
el tirador (`comparador/comparador.css:39`).

**Reflujo:** a 320×640 ninguna de las tres pantallas desborda en horizontal (`scrollWidth` = 320). Con texto al 200 % a 390 px tampoco
(`scrollWidth` = 390). Solo las pestañas del Simulador desbordan dentro de su fila, que es lo previsto (F-08).

**Movimiento reducido:** con `reducedMotion: 'reduce'` no queda ninguna animación ni transición > 50 ms en las tres pantallas; sin la
preferencia tampoco hay animaciones de entrada. El reproductor no arranca solo (`tiempo/usePlayback.ts:16,23`), el mapa quita el fundido
(`mapa/MapaBase.tsx:64`) y `fitBounds` usa `duration: 0` (`MapaBase.tsx:102`). Cumple `docs/diseno.md §9`.

## 4. Hallazgos

| id | gravedad | categoría | pantalla | ancho | evidencia | recomendación |
|---|---|---|---|---|---|---|
| F-01 | Alta | a11y | Observatorio | 1440 y 390 | `frontend/src/mapa/mapa.css:14` (`.maplibregl-canvas { outline: none; }`); el lienzo (`role="region"`, `aria-label="Map"`) entra en el orden de tabulación y no muestra ningún indicador, ni él ni `.mapa`. Captura `capturas/foco-mapa-1440.png`. Incumple WCAG 2.4.7. | Quitar ese `outline: none` o cambiarlo por `.maplibregl-canvas:focus-visible { outline: var(--focus-ring); outline-offset: calc(-1 * var(--focus-offset)); }` (anillo hacia dentro para que no lo recorte el `overflow: hidden` de `.mapa`). De paso, traducir la etiqueta «Map» de MapLibre al idioma activo (`locale` del mapa). |
| F-02 | Media | responsive | Las tres | 390 | `resultados.json` → `objetivos`. Por debajo de 44 px (regla del producto y de `docs/diseno.md §10`): «Qué significa» de la banda 73×24 (`componentes.css:79`); botones de `Termino` 24 px de alto (`componentes.css:20`); «Mostrar leyenda» 90×24 (`observatorio.css:58`); pestañas cortas de ancho (HV 24×44, Mapa 36×44, Serie 34×44); botones del reproductor 34×44 («Ir al inicio», etc., `.boton--terciario`, `componentes.css:175`); `summary.ayuda-radar__resumen` 324×20 (`observatorio.css:111`); cinta de pasadas 316×34 (`tiempo/tiempo.css:5`, usa `--h-control`). Todos pasan el mínimo WCAG 2.5.8 de 24 px salvo el `summary` (20 px, se salva por espaciado). | En la media consulta `max-width: 699px` dar `min-height: var(--h-touch)` y `min-width: var(--h-touch)` a `.banda-demo__enlace`, `.vista-mapa__plegar`, `.boton--terciario` con icono y `.pestanas__pestana`; para la cinta y el `summary`, `min-height: var(--h-touch)`. Para `Termino` (texto en línea) basta un área táctil invisible (`::after` con `inset` negativo, como ya hace `button.mapa__marcador::after` en `mapa.css:8`) sin cambiar la caja visible. La banda conserva su tamaño visual y su texto; solo crece el área del enlace. |
| F-03 | Media | a11y | Observatorio, Simulador | 1440 y 390 | Interruptor de 28×16 px (`componentes.css:201`, tokens `--w-switch`/`--h-switch` en `tokens.css:101`). Tiene `role="switch"` y una `<label>` asociada de 118×20, así que el clic en el texto funciona, pero el control en sí queda por debajo de 24 px de alto (2.5.8 depende de la excepción del control equivalente) y de 44 px en móvil. | Dar a `.interruptor-fila` (`componentes.css:200`) `min-height: var(--h-touch)` en móvil y hacer que toda la fila sea el objetivo (el `label` ya existe), o añadir un `::after` de 24/44 px alrededor del interruptor. No hace falta agrandar el dibujo. |
| F-04 | Media | responsive | Observatorio | 390 | `capturas/observatorio-390.png`: en la primera pantalla se ven la cabecera, los dos selectores, las pestañas y el comienzo del mapa; la cinta de pasadas queda por debajo del pliegue. `docs/diseno.md §10` pide «una altura que deja ver la cinta de pasadas sin desplazarse». `--h-mapa-movil: clamp(360px, 62vh, 540px)` (`tokens.css`). | Revisar con `/impeccable adapt`: bajar `--h-mapa-movil` o compactar la cabecera móvil (selectores en una fila o en la hoja inferior) para que la cinta entre en 844 px de alto. La banda de demostración se queda donde está. |
| F-05 | Media | a11y | Simulador | 1440 y 390 | Campo «Fecha (fija la temporada)», `input[type=date]` (`fecha.mjs`): tras los tres segmentos de la fecha, el Tab llega al botón interno del calendario de Chromium, que tiene `:focus-visible` falso y `outline: none`. El foco queda invisible en esa parada. | Añadir `.campo__control::-webkit-calendar-picker-indicator:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }` o, si no se puede estilizar, `.campo__control:focus-within { outline: var(--focus-ring); }` para que el campo entero marque el foco. |
| F-06 | Media | rendimiento | Todas | todos | `dist/assets/index-30eLyXLu.js` 470 KB / 140 KB gz: la entrada lleva los tres catálogos (`src/idioma/catalogos/{es,en,qu}`, 404 KB de fuente; «Saltar al contenido» y «Skip to content» aparecen en el mismo bloque). Historias tarda 3,7 s hasta el h1 en carga limitada. | Cargar con `import()` solo el catálogo del idioma activo (dejar el español en la entrada como respaldo). Medir de nuevo el modo Pages, que además arranca Pyodide, con `/impeccable optimize`. |
| F-07 | Media | rendimiento | Observatorio | 1440 | El h1 aparece a 1,3 s en local (6,5 s hasta «listo» en carga limitada) porque la cabecera definitiva espera a la API; MapLibre añade 260 KB gz. | Pintar la cabecera con su texto estático antes de que llegue la API (el hallazgo con cifras puede entrar después) y precargar el chunk del mapa con `<link rel="modulepreload">` solo cuando el usuario apunte al Observatorio (hover o foco en el riel). |
| F-08 | Baja | responsive | Simulador | 320 | `capturas/simulador-320-pestanas.png`: las pestañas de evento (`.pestanas`, `overflow-x: auto`, `componentes.css:216`) se cortan a mitad de palabra («Desborde / r…») y no hay señal de que la fila se desplace. | Añadir una pista de desplazamiento (máscara de degradado en el borde con tokens o un `scroll-padding` que deje media pestaña visible), o envolver en dos filas por debajo de 360 px. |
| F-09 | Baja | a11y | Las tres | 390 | Orden de foco frente al orden visual: en móvil el riel se dibuja abajo, pero en el DOM va antes de la banda y del contenido (`diseno/Estructura.tsx:55,85`), así que tras «Saltar al contenido» el teclado recorre primero la barra inferior. | Aceptable gracias al enlace de salto. Si se quiere afinar, poner el riel después de `#contenido` en el DOM solo cuando sea barra inferior. No mover la banda: debe seguir siendo lo primero que se lee. |
| F-10 | Baja | a11y | Simulador | 390 | Detector: `p.simulador__nota` con interlineado 1,23× (`simulador/simulador.css:10`, `font-size: var(--fs-13); line-height: var(--lh-16)`; en móvil el texto pasa a 14 px con la misma línea). | Usar `--lh-20`. |
| F-11 | Baja | tema | Todas | todos | Márgenes estrechos de contraste: `--negative` sobre `--raised` 4,55:1, pastilla negativa 4,62:1, `--control` sobre `--raised` 3,10:1 (`tokens.css:8,21`). Pasan AA pero cualquier ajuste de paleta los rompe. | Subir un punto la luminosidad de `--negative`/`--pill-negative-ink` (≈ #ea6a80) y de `--control`, y añadir esos pares a `diseno/contraste.test.ts` si no están. |
| F-12 | Baja | a11y | Observatorio, Historias | todos | 59 nodos «incompletos» de color-contrast sobre mapa e imagen (tabla §1). | Mantener las placas con fondo sólido de token y añadir una prueba de píxel (captura + muestreo) para los textos sobre el mapa con el mapa base satelital, que es el caso más claro. |
| F-13 | Baja | rendimiento | Historias | 1440 | En la primera pasada la consola mostró 2 respuestas 404; en la segunda pasada no se repitieron (`detalle.mjs` no capturó ninguna). | Vigilar; si reaparece, registrar la URL en el e2e de accesibilidad con `page.on('response')`. |
| F-14 | Baja | responsive | Historias, Observatorio | ambos | Detector: 10 párrafos con una palabra sola en la última línea (`detect-*.json`). | `text-wrap: pretty` en `.historia__parrafo`, `.cabecera__hallazgo` y textos de ayuda. |

Recuento por gravedad: Crítica 0 · Alta 1 · Media 6 · Baja 7.

## 5. Patrones y problemas de sistema

- **El mínimo de 44 px en móvil se aplica a medias.** `--h-touch` existe y ya se usa en `.boton`, `.campo__control`, `.deslizador` y
  `.pestanas__pestana` (alto), pero no en anchos ni en controles de texto (`banda-demo__enlace`, `vista-mapa__plegar`, `Termino`, `summary`,
  interruptor, cinta). Lo resuelve una sola regla de sistema en `componentes.css` mejor que arreglos por pantalla.
- **`outline: none` sin sustituto.** Aparece en `mapa.css:14`, `componentes.css:309,324`, `recorrido.css:2` y `comparador.css:38`; solo el del
  comparador tiene reemplazo. Los de `componentes.css:324` (`.lienzo__contenido`, foco programático del h1/lienzo) y `recorrido.css:2` no se
  auditaron en estas tres pantallas y conviene revisarlos.

## 6. Lo que funciona

- 0 infracciones de axe WCAG 2.2 AA en las seis combinaciones, y el e2e `accesibilidad.spec.ts` ya lo vigila en tres idiomas.
- Enlace de salto, `h1` enfocado al navegar, regiones con nombre, `role="switch"` con etiqueta, orden de foco sin trampas.
- Reflujo limpio a 320 px y con texto al 200 %.
- `prefers-reduced-motion` tratado de verdad: el reproductor no arranca solo y el mapa no se anima, sin depender solo del corte global.
- Tokens completos y aplicados; ningún color suelto en las pantallas auditadas.
- Rutas con `lazy()`; MapLibre fuera de Historias y del Simulador.
- La banda de demostración y los sellos tienen contraste holgado (8,2:1) y se mantienen visibles a todos los anchos.

## 7. Acciones recomendadas

1. **[P1] `/impeccable harden`**: anillo de foco del lienzo del mapa (F-01) y del selector de fecha (F-05).
2. **[P2] `/impeccable adapt`**: regla de sistema de 44 px en móvil (F-02, F-03), cinta visible sin desplazar en el Observatorio a 390 (F-04) y pista de desplazamiento en las pestañas a 320 (F-08).
3. **[P2] `/impeccable optimize`**: catálogos de idioma bajo demanda, cabecera del Observatorio sin esperar a la API y medida del modo Pages (F-06, F-07).
4. **[P3] `/impeccable typeset`**: interlineado de `simulador__nota` y `text-wrap: pretty` (F-10, F-14).
5. **[P3] `/impeccable polish`**: márgenes de contraste y prueba de píxel sobre el mapa (F-11, F-12), y repaso final.

Después de los arreglos, volver a pasar `auditar.mjs` y `npx playwright test e2e/accesibilidad.spec.ts`: las seis combinaciones deben seguir en 0.
