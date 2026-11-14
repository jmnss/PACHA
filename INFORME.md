# INFORME — Migración a React

Estado: **migración completa (bloques 0 a 5) más Simulador, Laboratorio, Recorrido, Fundamentos e Impacto,
e idioma (es/en/kichwa) y accesibilidad implementados** (ver «Idioma y accesibilidad (2026-11-05)»). Kichwa:
borrador sin validar (0 de 923 claves). Prueba con lector de pantalla: pendiente.
Verificación (corrida el 2026-11-06 tras la revisión final del despliegue): pytest 291 (+2 omitidas por diseño), unittest 13 OK,
vitest 573 (58 archivos), lint OK, build OK, Playwright 83/83 (con una intermitencia conocida, ver «Despliegue en
GitHub Pages»), Playwright de Pages 11/11.
Última actualización: 2026-11-06

Este archivo lo mantiene Claude durante la ejecución. Se actualiza al cerrar cada tarea. Las secciones
fechadas más abajo son históricas; **la lista vigente de pendientes es «Pendientes vigentes»**.

## Fase de datos reales (2026-11-14, rama `datos-reales`)

**Estado del repositorio al empezar:** el repo local no tenía historia (un `git init` con todo en el índice y `main`
sin commits) y el remoto `origin/main` solo tenía un «Initial commit» con `LICENSE`. No existía la rama
`migracion-react`, así que los hashes citados en este informe (`13e7c08`, `ea651d9`…) ya no existen en este repo.
Para trabajar en ramas sin tocar `main` se creó **localmente** un commit de base con el contenido del índice
(padre `origin/main`): `migracion-react` y `datos-reales` salen de él. `main` no se tocó y no se hizo push.
**Pendiente del equipo:** confirmar si la historia anterior se perdió o vive en otro lugar.

**Tarea 0 · Reglas** (`docs: reglas para la fase de datos reales`): reglas 5, 6 y 7 de `CLAUDE.md` reescritas;
`docs/nisar-verificado.md` nuevo (fuentes, fecha de consulta y cita; §5 revisa el código y los textos heredados);
recursos oficiales del challenge en `docs/challenge.md`; `data/nisar/crudo/`, `*.h5` y `*.netrc` en `.gitignore`.
Hallazgos que cambian supuestos:
- **Ya hay datos VALIDATED** (publicados el 6 nov 2026, adquisiciones desde el 21 oct 2026), además de
  PROVISIONAL (17 jun – 23 oct 2026) y BETA. La madurez del contrato tiene tres valores, no dos.
- **GCOV es γ⁰, no σ⁰.** El lector heredado (`modelo/nisar.py:1662`, `1756`) rotula σ⁰; se corrige en el lector nuevo.
- `nisar.MISION` da λ ≈ 23,8 cm y 9,4 cm; la guía oficial dice 24 cm y 9,3 cm.
- Hay un **hueco permanente de datos** del 27 jul al 10 ago 2026.
- Un GCOV sobre Ecuador pesa ~7,4 GB: la preparación tiene que leer por partes o en streaming.

## Publicación de los bloques A, B y C (2026-11-08)

Publicado en Pages con `13e7c08` (corrida 42519336402, 225 respuestas precalculadas). La corrida anterior falló en el
precálculo (`ec_loja`: 29 de 30 capas): `networkidle` vuelve en el acto si la página ya estaba quieta y en CI un clic de
«Reproducir» se saltó una pasada. `frontend/scripts/precalcular.mts` ahora espera la capa de cada pasada y recorre otra
vez el reproductor (hasta dos) si falta alguna.

## Rendimiento del simulador (2026-11-08)

Con permiso del usuario para tocar `modelo/` (CLAUDE.md lo restringe a correcciones), se optimizó
`modelo.desastres.aguas_someras` sin cambiar la física ni el orden de las operaciones:
- la fricción (con la potencia 7/3, ~75 % del paso) solo se evalúa en las caras mojadas y activas, que son las únicas
  que la usan; lo que no cambia entre pasos se calcula antes del bucle; `np.pad` y varios `np.where` se reemplazan
  por búferes y máscaras equivalentes; `hypot` solo donde hay caudal;
- `tormenta` reutiliza la escorrentía SCS del final del paso anterior (es la del inicio del siguiente);
- `datos/simulador_render.png_b64` sin `optimize=True` (mismo tamaño en los cuadros, ~6× más rápido).

**Resultados idénticos:** `tests/modelo/test_aguas_someras_equivalencia.py` compara con una copia congelada de la versión
original (`tests/modelo/_referencia_aguas_someras.py`) en lluvia, marejada, océano activo y cuenca cerrada; además,
tormenta (dos celdas), inundación y terremoto completos dieron diferencia 0 en cuadros, paneles, métricas y resumen
contra el commit anterior.

| Pyodide 314.0.7 (Python 3.14.2, Node 22), escenario por defecto 128×128 | Antes | Ahora |
|---|---|---|
| Tormenta | 15,6 s | 9,1 s |
| Inundación | 49,6 s | 22,3 s |

(Sin contar los PNG. En Python nativo: tormenta 9,2 → 5,1 s; inundación 26,5 → 8,8 s; los tiempos de esta máquina
varían ±30 % entre corridas.)

## Despliegue en GitHub Pages (2026-11-06)

La API corre en el navegador (Pyodide en un Web Worker, `frontend/src/motor/`) y la app se publica como sitio estático
en `https://jmnss.github.io/NISAR-Ecuador/` con `.github/workflows/pages.yml` (verificar → construir → publicar en cada
push a `main`). Diseño: `docs/superpowers/specs/2026-11-06-despliegue-design.md`; plan:
`docs/superpowers/plans/2026-11-06-despliegue-pages-pyodide.md`.

**Prueba mínima (Tarea 3, punto de control): superada.** El motor responde `salud` y `cambio` en Chromium real.

**Cifras del spike (Node 22, Pyodide 314.0.7, Python 3.14.2, FastAPI 0.136.1; 18 rutas, todas 200):**

| Medida | Valor |
|---|---|
| Arranque en frío (librerías en caché local) | ~14 s (Pyodide 3–4 s; numpy/pandas/Pillow/pydantic/shapely 3 s; FastAPI 2–3 s; import + lifespan 5–6 s) |
| Descarga de la primera visita | ~25 MB (núcleo ~12 MB + librerías ~12 MB) |
| `salud` (primera) / `cambio` La Segua / `impacto` | 2,6 s / 0,24 s / 3,0 s |
| Simulador: mundo / incendio / terremoto / erupción | 1,3 / 0,1 / 1,0 / 1,9 s |
| `tormenta` / `inundacion` | 18,9 s / 33,2 s (nativo: 11,4 s / 14,3 s) |
| Memoria máxima | ~600 MB rss (incluye el motor JS) |

**Cifras finales:** `frontend/dist-pages` pesa 45 MB; 225 respuestas precalculadas (226 archivos con el índice; incluye la capa de cada pasada del mapa).
**Relieve real (Tarea 5):** comprobado en Chromium con `/simulador?lat=-0.68&lon=-78.44&ext=40` (Cotopaxi): la ficha del
mundo dice «Relieve: SRTM (teselas Terrarium, AWS Open Data)» y «Relieve real (SRTM)», no terreno sintético.

**Decisiones de ejecución:**
- Las claves `estructura.motor.*` (en vez de `api.error.*`), los scripts de Node en `frontend/scripts/` y la
  configuración `playwright.pages.config.ts` siguen el plan.
- `tsconfig.node.json` incluye `types: ["vite/client", "node"]` porque `e2e/exportar.spec.ts` importa código de `src/` que
  usa `import.meta.env`.
- Vite solo empaqueta el worker si `new URL('./motor.worker.ts', import.meta.url)` va escrito dentro de la llamada a
  `new Worker`/`new SharedWorker`.
- Playwright no intercepta las peticiones de un `SharedWorker`: las e2e que fuerzan fallos del motor usan el `Worker`
  dedicado (quitan `SharedWorker`), el mismo camino que Chrome Android.
- El precálculo incluye `/recorrido?paso=1..6` (el spec §2.3 lo pedía).

**Pendientes:**
- ~~Activar Pages con fuente GitHub Actions y autorizar el push a `main`~~: hecho. **Publicado el 2026-11-08**
  (corrida 42464866619, verificar → construir → publicar en verde; el sitio responde 200). Antes fallaron dos corridas:
  lint (`_e` sin usar en `motor/errores.ts`) y la prueba dorada `ec_loja` (redondeo de `nansum` distinto en CI, 3·10⁻⁷;
  se añadió `rel=1e-6`).
- Avisos de CI corregidos (2026-11-08): acciones en versiones con Node 24 (`checkout@v7`, `setup-python@v7`,
  `setup-node@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5`) y máquina fijada en `ubuntu-24.04` en vez de
  `ubuntu-latest`, para que el cambio a Ubuntu 26 no altere el flujo sin aviso.
- Memoria en móvil (~600 MB): los móviles de gama baja pueden no cargar el motor; lo precalculado sigue funcionando.
- Chrome Android sin `SharedWorker`: un motor por documento; casi todo el Recorrido está precalculado.
- Textos kichwa nuevos (`estructura.motor.*`) sin validar por hablantes.
- Despertar y tiempos del motor no medidos en un navegador lento (solo Chromium de escritorio).
- Intermitencia anterior a esta rama: `flujos.spec.ts` «Observatorio · mapa: un clic fuera de Ecuador avisa y no simula»
  falla a veces en una corrida completa (el clic de reintento puede caer dentro de Ecuador mientras el mapa encuadra) y
  pasa aislado y repetido; el código del mapa no se tocó.
- A 390 px, las pestañas del Simulador se solapan mientras carga el esqueleto «Creando el mundo» (visto en la captura
  del aviso; ya ocurría antes).

## Estado actual de un vistazo

| Pantalla | Ruta | Qué hace |
|---|---|---|
| Historias | `/` | Inundación (Costa baja) e incendio (Sierra) en cinco partes, con comparador y conmutador de polarización |
| Observatorio | `/observatorio` | Mapa, comparar, serie, simulación e impacto (solo inundación e incendio) para los seis tipos de cambio |
| Simulador de Eventos | `/simulador` | Antes «Modo Dios»: tablero, animación, gemelo del radar, espera del radar, bitácora y PNG |
| Laboratorio | `/laboratorio` | «La nube no lo detiene» y «Polarización y banda» |
| Recorrido | `/recorrido` | Guion de 6 pasos (≤ 2 min) con pantallas reales incrustadas |
| Fundamentos | `/fundamentos` | Física general; lo específico de NISAR, «pendiente de confirmar» |
| Sistema de diseño | `/_sistema` | Galería interna (decisión pendiente: ¿se publica?) |

Datos: todo es sintético (proveedor `demo`); el proveedor `real` es un esqueleto. La banda «DATOS DE
DEMOSTRACIÓN» es permanente.

## Bloque B · Funcionales (2026-11-08)

Rama `migracion-react`, plan `docs/superpowers/plans/2026-11-08-pendientes-visual-funcional-texto.md` (B1 a B7).

- **B1** `GET /api/escenarios/{id}/serie-seleccion?punto=x,y&cuadrante=x0,y0,x1,y1`: valida con `PeticionSerieSeleccion`; los errores de formato y rango usan claves nuevas `api.error.serie_sel_*` (en es/en/qu); sin `serie_seleccion` en el proveedor responde 409. Una selección en agua devuelve la serie con `puntos: []` (200).
- **B2** La vista Serie muestra primero «En la selección» (gráfica, tabla, CSV `serie_<escenario>_seleccion.csv` y aviso de polarización). `Mediciones` enlaza «Ver su evolución en Serie» (conserva `p`/`c`).
- **B3** `Escenario.instante_evento` y parámetro simulable `fecha_evento` (2024-01-01 a 2030-12-31, ilustrativo). Solo entra en la huella cuando difiere de la fecha del sitio (con punto del mapa se compara con la del sitio del mapa, que es la del sitio de referencia del tipo), así que los ids existentes no cambian (prueba con el id literal).
- **B4** Campo de fecha activo en el panel; marca «Evento» y cursor del instante (`Linea cursor`) en Serie; la cinta del mapa dibuja el evento. El acotado de `t` ya existía en `useInstante`: se añadió la prueba de regresión.
- **B5** `TipoCambio.observable` en la cabecera («Qué observa el radar en esta demostración: σ⁰ …», con σ⁰ explicado). `producto` de NISAR no se expone (prueba). El valor sigue sin verificar con la documentación oficial.
- **B6** Provincia y región bajo el puntero (`queryRenderedFeatures` sobre `provincias`) y marcadores del catálogo en la vista país (el mapa ignora clics sobre `.mapa__marcador`).
- **Decisiones fuera del plan:** el aria-label de los marcadores se fija después de `addTo` (MapLibre lo sobrescribe con «Map marker»); claves de región `piezas.mapa.region.{costa,sierra,amazonia,insular}` (el GeoJSON dice «Insular», no «Galápagos»); `obs.estructura.observable` es solo la etiqueta y el valor viene de `api.tipo.<id>.observable`; el kichwa nuevo es borrador sin validar (CSV: 949 claves, 0 validadas).
- **Revisión del bloque (2026-11-08):** en MapLibre 4.7.1 un clic en un marcador no llega al evento `click` del mapa (comprobado con un `console.log` temporal), así que la guarda `esClicEnMarcador` es defensa para otras versiones; el e2e cuenta los POST a `/api/simulacion/escenario` (0) pero no puede fallar al quitarla, y la guarda tiene su prueba unitaria.
- **Pendientes:** la serie del punto en Pages la calcula el motor (no se precalcula); (los nombres de serie de la selección ya se traducen: bloque C); la capa `provincias-hit` no hizo falta con el mapa local (no se verificó con el mapa remoto, sin red).

## Bloque C · Texto que sigue en español (2026-11-08)

Rama `migracion-react`, plan `docs/superpowers/plans/2026-11-08-pendientes-visual-funcional-texto.md` (C1 a C6). Estrategia: el texto que escribe `modelo/` se reconoce en `datos/` contra plantillas registradas (`datos/claves_demo.py`) y viaja en campos paralelos opcionales (`TextoClave`: `clave_texto`, `valores_texto`, `decimales_texto`); lo que no encaja queda en español con `lang="es"`.

- **C1** `reconocer_con_decimales`, `buscar_texto` y `TextoClave`. Marcadores: `{x}` número con coma, `{fecha…}` dd/mm/aaaa (valor ISO), `{…_punto}` número con punto; `{…_signo_punto}` además se escribe siempre con signo. En el frontend `textoApi(texto, clave, valores, decimales)` y `textoClave()`; los decimales de la API ganan a la tabla fija `DECIMALES`.
- **C2** Notas (`notas_texto`) y celdas (`tabla.celdas_texto`) del simulador: 26 plantillas de nota (una por variante de CN y de mecanismo) y 23 de celdas.
- **C3** Observatorio: título, columnas y celdas de la tabla por parcela, nombres de las líneas de las series (`nombres_texto`), medición (`textos` por fila; etiquetas con fecha como `Media · Velocidad · {fecha}`), nota 1 de Pedernales con el vector LOS y títulos «… en la selección».
- **C4** Bitácora (título con `reconocerTitulo` para entradas antiguas, región, temporada y cifra de detección), informe PNG y CSV de la bitácora y de la medición en el idioma elegido. Regiones `api.contexto.region.*` (también en el panel de contexto).
- **C5** Borrador kichwa (Opus) de las 134 claves nuevas, sin validar; dudas C11–C15 y términos nuevos en `docs/guia-traduccion-kichwa.md`; CSV al día (prueba nueva).
- **Decisiones fuera del plan:** la región «Insular» (no «Galápagos») es el valor real del GeoJSON; la clave de la nota con cifras es `api.plantilla.nota.pedernales_los` (el prefijo `api.nota.` está reservado a las claves derivadas, que exigen español idéntico); `_punto` acepta también enteros (`{v:g}` de Python); las plantillas copian los nombres de `modelo/` (coberturas, cultivos, rotaciones) y una prueba comprueba que siguen coincidiendo; el test de `selector.test.tsx` usaba el total de claves sin separador de miles (con más de 1 000 claves fallaba); el umbral del e2e `panel.spec.ts` «el mapa empieza a la vista» pasó de 500 a 550 px: ya fallaba en `ea651d9` (526 px por la línea del observable del bloque B), no por el bloque C.
- **Texto que sigue en español (declarado):** ayudas (`ayuda`) de las métricas del simulador con cifras; referencias bibliográficas (`modelos`); rótulos de los paneles del radar simulado; el CSV de la tabla por parcela del Observatorio (columnas y celdas en español); textos del modelo que no encajen con ninguna plantilla (p. ej. con parámetros no previstos), que se ven en español con `lang="es"`; en las claves del simulador no se probó el caso marejada/tsunami con un mundo con mar (no se logró un mundo de prueba con mar; las plantillas se prueban con el texto que arma `modelo/`).
- **Aviso de la regla 6 de CLAUDE.md:** las notas y nombres de serie ya existentes mencionan los productos GCOV, GUNW y GOFF; no están verificados con la documentación oficial. Se tradujeron tal cual, sin darlos por buenos; **pendiente de confirmar con la documentación oficial**.
- **Cifras (2026-11-08):** `python -m pytest tests -q` 361 passed, 2 skipped; `python -m unittest modelo.clima modelo.desastres` 13 OK; vitest 622 passed (63 archivos); `npm run lint` y `npm run build` sin errores; `npx playwright test` 91 passed (tras ajustar el umbral); e2e de Pages 11 passed; revisión visual en `en` y `qu` de `/observatorio`, `?vista=comparar`, `?vista=serie` y `/simulador`: 0 FAIL (capturas en `docs/capturas-nuevas/bloque-c-*`, sin versionar).
- **Claves nuevas:** 134 (kichwa: 0 de 1 083 validadas).

## Pendientes vigentes (lista única, 2026-11-05)

Sustituye a «Pendientes tras la primera noche» y a los pendientes sueltos de cada sección fechada. Ya
resueltos y retirados de la lista: localizador de Ecuador, fotogramas continuos, solape de `Barras`,
Estación y temporada (cubierta por `PanelContexto`), Fundamentos, Modo Dios.

**Equipo / externos**
- Recursos oficiales de datos y requisitos de entrega del challenge (formato, plazo, vídeo, licencia).
- Confirmar la licencia (MIT provisional).
- Decidir si se conserva Validación (N2.5) y qué hacer con `/_sistema` en producción.
- Integración de datos reales (lista de `docs/plan-migracion.md`, sección final).

**Funcionales** (serie del punto, fecha del evento, provincia y marcadores del catálogo y observable: hechos en el bloque B, 2026-11-08; ver «Bloque B · Funcionales»)
- Impacto: no cubre cultivos, glaciares, terremotos ni subsidencia; la evolución usa hasta 12 pasadas.
- Simulador fase 2: decisión A/B (cortafuegos, dique, evacuación), cascadas, retos educativos.

**Visuales / móvil**
- Avisos del inspector que se defienden (bloque A, 2026-11-08): `ragged-row` del simulador a 1440 px y de «Antes y después» (columna principal y lateral con contenido de distinta altura; el hueco ya no se estira con `flex: 1`, así que no hay tarjetas con vacío artificial) (el `panel-void` del Observatorio desapareció al corregir el alto del mapa). `below-fold` en las pantallas con columna lateral es esperable.
- A 390 px la cinta de pasadas sigue por debajo del primer viewport en el Observatorio (la medición previa a A3 daba y=1300 con la placa desplegada; la placa plegada la acerca, no se midió de nuevo por separado). El mapa sí empieza a la vista (y=478).

**Idioma y accesibilidad (nuevos)**
- Kichwa: 0 de 923 claves validadas; hacen falta hablantes (`docs/guia-traduccion-kichwa.md`, `docs/traduccion-kichwa.csv`). Dudas abiertas de honestidad y ortografía («chiqan»/«chikan», etc.) en la guía.
- Prueba con lector de pantalla (Orca/NVDA) en Historias y Observatorio en los tres idiomas: **pendiente, requiere persona con lector de pantalla**.
- Prueba con zoom real del navegador y teclado físico en un dispositivo real: pendiente (aquí solo se emuló).
- **Texto del demo que sigue en español (`lang="es"`) con `en` y `qu`** (resuelto casi todo en el bloque C; ver su sección): quedan las ayudas de las métricas del simulador, las referencias bibliográficas, los rótulos de los paneles del radar simulado, el CSV de la tabla por parcela y cualquier texto del modelo que no encaje en una plantilla.
- Código de idioma `qu-EC`, plurales con cifra, nombres de meses y días en kichwa: dudas abiertas D1–D3 de la guía.

**Técnicos**
- ~~Bundle ~1,17 MB sin `React.lazy` por ruta~~: ya resuelto (cada pantalla es un `lazy`); la portada baja ~140 KB
  comprimidos y MapLibre (~260 KB comprimidos) solo se carga en pantallas con mapa (medido el 2026-11-08).
- `/api/tipos` mezcla unidades (el panel multiplica por `escala`).
- `/cambio` pesado y `/medicion` recalcula el cambio con datos reales; `RLock` global del proveedor demo.
- `tormenta`/`inundacion` del simulador: optimizados el 2026-11-08 (ver «Rendimiento del simulador»); en Pyodide
  siguen tardando ~9 s y ~22 s con los valores por defecto.
- `revision_visual.sh` deja `frontend/dist` compilado con `VITE_MAPA_REMOTO=0`: recompilar con
  `npm run build` antes de una demo con mapa base.
- Sin prueba automática del mapa con red. (El aviso «Unexpected }» de minificación de CSS ya no aparece: se quitó una llave sobrante en `historias.css`.)

## Próxima actualización: accesibilidad e idioma (preparación)

Objetivo frente a `docs/challenge.md`: «que los datos de NISAR sean accesibles a un público amplio».
Esta sección es el punto de partida; el diseño detallado (spec y plan) se escribe antes de tocar código.

### Línea base comprobada (2026-11-05)

**Idioma**
- La interfaz está solo en español; `frontend/index.html` declara `lang="es"`.
- No hay biblioteca de internacionalización (dependencias: React, React Router, TanStack Query,
  MapLibre, Public Sans).
- El texto vive en tres sitios:
  1. componentes `.tsx` (cadenas en línea);
  2. contenido largo en `pantallas/historias/contenido/*.ts` y `pantallas/fundamentos/contenido.ts`
     (el guion del recorrido y las ayudas están en sus pantallas);
  3. **la API**: etiquetas, títulos, descripciones y errores 422/404 salen en español de `datos/`
     (`contrato.py`, `proveedores/demo.py`, `laboratorio.py`, `simulador.py`, `impacto.py`) y de
     `api/schemas_*.py`. Traducir solo el frontend dejaría textos mezclados.
- 23 usos de `toLocale*`/`Intl` en el frontend (fechas y números): revisar que tomen el idioma activo.
- Exportaciones (CSV con `# origen: sintético`, PNG con franja): sus marcas son texto y deben traducirse
  sin perder la marca de origen (regla de honestidad 2).
- README ya existe en español e inglés; `docs/historia-datos.md` solo en español.

**Accesibilidad**
- 126 atributos `aria-*` en los `.tsx`; navegación por teclado en comparador, cinta, tablero del
  simulador y recorrido; nombres accesibles en el riel (diseno.md).
- «Menos movimiento» se respeta en `tiempo/usePlayback.ts`, `pantallas/observatorio/VistaMapa.tsx`,
  `estado/useMovil.ts` y `diseno/componentes.css`; **falta comprobarlo** en el resto de animaciones
  (simulador, recorrido, laboratorio).
- Rampas de color elegidas para ser distinguibles con daltonismo (diseno.md §4; Severidad alta `#9a3412`).
- `Termino` explica cada término técnico en el sitio.
- **Sin auditoría automática** (no hay axe ni equivalente en `package.json`) y sin revisión con lector
  de pantalla.
- Huecos conocidos: tabla móvil sin semántica de tabla; mapa y lienzos sin alternativa textual
  comprobada; banda móvil con margen de 12 px.

### Preguntas para decidir antes del spec

1. Idiomas: ¿solo español + inglés? ¿Algún idioma originario de Ecuador (kichwa)? Si se añade, ¿quién
   revisa la traducción?
2. ¿La API devuelve el texto según el idioma (`Accept-Language` o `?idioma=`) o devuelve claves y el
   frontend traduce? Afecta al contrato de datos y a la conformidad del proveedor real.
3. ¿El idioma viaja en la URL (como el resto del estado) para compartir enlaces?
4. Nivel objetivo de accesibilidad (p. ej. WCAG 2.2 AA) y cómo se prueba (axe en Playwright, teclado,
   lector de pantalla).
5. ¿Opciones de lectura (tamaño de letra, alto contraste) o solo cumplir lo que ya define diseno.md?

### Reglas que se mantienen

- La banda «DATOS DE DEMOSTRACIÓN» y los sellos de origen existen en todos los idiomas y no se pueden
  ocultar; lo «pendiente de confirmar» sigue marcado igual en cada idioma.
- Toda pantalla tocada pasa `revision_visual.sh` a 1440/768/390 (los textos en inglés suelen ser más
  cortos; otros idiomas pueden ser más largos y desbordar).
- Un commit por tarea; pruebas y build en verde antes de seguir.

## Tareas completadas

| Tarea / corrección | Commit | Verificación |
|---|---|---|
| chore: entorno reproducible y dependencias de la API | `fb1abf1` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| test: caracterización del núcleo científico | `35256c7` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix: textos honestos en el núcleo y licencia MIT provisional | `5dc9540` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| chore: dejar de versionar __pycache__ | `6d3f97f` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(datos): contrato de datos genérico | `dc49606` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(datos): endurecer el contrato (fechas con zona, tabla nula, solo lectura, rangos) | `eeccdca` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(datos): generador sintético reproducible | `5b90655` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(datos): proveedor de demostración | `d11a611` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(datos): escenarios simulados consultables, caché acotada y resultados completos | `cc6fa5d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(datos): proveedor demo seguro entre hilos y huella de 12 hex | `dfae01b` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(datos): esqueleto del proveedor real y selección | `66eb201` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| test(datos): conformidad del contrato con dos proveedores | `ee10ae5` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| test(datos): fortalece la suite de conformidad (origen, medir, rutas deterministas) | `16bf072` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): esqueleto y arranque único | `ea07e6d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api): hay_sinteticos en salud, errores HTTP en español y rutas de archivo | `2d3bdcc` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): rejillas cuantizadas y reducidas | `2effd83` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): tipos y escenarios | `9fa768d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): capas, cambio y medición | `b6f6d01` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api): conversión 0–1 a píxel, malla de medición y errores en español | `99f164d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): simulación y fotogramas | `ca5247e` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api): simulación sin caché de escenarios, fechas y entradas acotadas, geografía en datos | `f554a30` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): contexto climático | `90788d6` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): contrato OpenAPI | `d8efd3f` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): proyecto, tokens y tipografía | `4405282` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): cliente de la API y estado | `2f43fbd` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| chore: script de revisión visual | `1b2a75a` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): sistema de diseño, banda de demostración y estructura | `c9c9642` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): línea de selección visible, tokens tipográficos y mejoras de accesibilidad del sistema de diseño | `5a67d59` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): rampas de color verificadas y leyendas | `8ee354e` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api): las capas categóricas viajan como códigos enteros y se reducen por moda | `6392e9c` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): colores de categorías por variable, extremos en palabras y pruebas con las leyendas reales | `b6fd0a6` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): gráficos | `0ba20f7` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): escala con decimales, etiquetas de marcas sin solape y gráficos más honestos | `4e61d8d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): mapa local con capa de lienzo | `b61658f` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): cinta de pasadas y reproductor | `7c32dc2` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): useInstante, sin pisar el arrastre de la cinta y más pruebas del reproductor | `b289239` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): comparador deslizante | `22939f0` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): fechas del comparador, sellos de origen y gesto primario | `9e287fe` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): exportaciones con metadatos de origen | `7571b2a` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): exportaciones fail-safe, franja en lienzos estrechos y e2e de tinta | `031481c` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): observatorio, mapa y tiempo | `ea3787d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): observatorio, pareja de pasadas, escenario caducado y pasada activa | `52d7df0` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): antes/después con comparador y medición | `8fb0f3e` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): notas del modelo con aviso, serie del punto pendiente y polarización | `e0586e0` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): historias de inundación e incendio | `0f0802e` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): historias con medida de lectura, comparador visible y pareja de mayor cambio | `c29f3e5` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): series temporales | `a67a54d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(datos): el demo no atribuye detecciones a NISAR | `55b8ac6` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): panel de simulación | `4d8c6cc` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| test(e2e): flujos principales | `701749e` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| docs: README bilingüe, créditos y guion | `e063478` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(datos): fecha neutra para el escenario de Pedernales | `77418bb` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api): valida max_lado y vmin/vmax; pruebas de orden de filas | `65afd99` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): celdaCsv neutraliza espacios previos; pruebas de honestidad; fija requirements-api | `e894f30` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api,docs): sello fijo del contexto climático y matiz en los README | `3d091f6` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): reintenta una vez los enlaces de escenarios simulados caducados | `4d7ee67` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): el reproductor solo ofrece el paso de pasada en pasada en el mapa | `77dddeb` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): ayuda «Cómo ve el radar» y origen del escenario simulado en la banda | `155d693` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| refactor(api): EntradaNoValida (422) y NoEncontrado (404); lo inesperado es 500 genérico | `dd7a779` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |

### Trabajo posterior a la primera noche (2026-11-05)

| Bloque | Commits | Detalle |
|---|---|---|
| Cierre de la primera noche | `3c97a55`, `c2b1e27`, `200229e`, `f30a0d7` | Informe; fechas invertidas → 422 |
| Mapa tipo carta | `6bab738`, `f0d0335`, `7e8018a` | Esri (oscuro, satélite, relieve), respaldo sin red |
| Fotogramas continuos | `809daa0` | Modelo en el tiempo |
| Simulador de Eventos | `8dd91dc` … `087c117` (10 commits) | Ver sección «Segunda noche» |
| Laboratorio, Recorrido, Fundamentos | `8abd1cb` … `45627d7` (7 commits) | Ver su sección |
| Impacto | `297f544`, `7e5d056` | API y pestaña con PNG |
| Preparación de la demo | `c842c1c` | README/guion, barras negativas, localizador |
| Revisión de código `high` | `abaea3d` | Hallazgos corregidos |

## Decisiones tomadas sin supervisión

- Bloque A, corrección sobre el plan: quitar `flex: 1` del mapa (A3) dejaba `.mapa` (alto 100 %) en 0 px; `.vista-mapa__mapa` lleva ahora `height` igual a su `min-height` (`--h-mapa` / `--h-mapa-movil`). Lo detectó el e2e «clic fuera de Ecuador» (que además se adaptó al menú móvil) y lo cubre una prueba nueva de alto del mapa.
- Bloque A (2026-11-08): `MenuAcciones` (tres puntos) en la fila de vistas del Observatorio móvil con «Parámetros del modelo» y, en la vista mapa, «Ver todo Ecuador»; el estado `pais` vive en `Observatorio`. En móvil la placa del mapa es una sola, plegada, con «rótulo · Capa · 85 %». En escritorio las dos columnas se alinean arriba (`align-items: start`) y el mapa mide `--h-mapa`. En Relieve se aplicó el plan A: Esri `World_Terrain_Base` (tesela verificada con HTTP 200 `image/jpeg`, `maxzoom` 13, atribución «Sources: Esri, USGS, NOAA») con las etiquetas de lugares encima de los datos. En el simulador móvil «Mundo» va antes que el tablero, las pestañas no se encogen (`flex: none`, se desplazan en horizontal) y el último KPI impar ocupa la fila entera.
- `__pycache__` dejó de versionarse (`git rm --cached`) para tener árbol limpio.
- No se tocó `fecha_evento` de `ec_pedernales` en `data/nisar_sample.csv` (2026-04-16 coincide con el aniversario de un sismo real); **pendiente del equipo** decidir si se cambia.
- El contrato de datos creció de forma aditiva: `ResultadoCambio.tablas/vectores/capas_extra`, `CapaRaster.instante`, `Control/TipoCambio` (necesarios para campo de flujo, tabla por parcela y controles de simulación).
- La API no importa `modelo/` salvo `/api/contexto`; los tipos y controles llegan por `ProveedorDatos.tipos()`.
- `/api/salud` devuelve `hay_sinteticos`; **la banda de demostración del frontend debe usar ese campo**, no `origen_tipo`.
- La validación «dentro de Ecuador» de la simulación es una caja aproximada en `datos/geografia.py`.
- `/api/simulacion/escenario` no se cachea en la API; `/fotogramas` sí (12 entradas).
- Las fechas del contexto climático: `fecha_generacion` es la hora de la petición, no la fecha del dato.

## Riesgos para la integración con datos reales

- `/cambio` puede ser pesado con rejillas reales (hasta 6 capas por respuesta): pedir capas extra a demanda.
- `/medicion` recalcula el cambio solo para conocer la malla: añadir caché.
- `instante_evento` es la hora nominal del escenario tratada como UTC (misma convención que los fotogramas). Con datos reales habrá que convertir desde la hora local del evento; la convención no se cambia ahora.
- `serie-seleccion` calcula la forma de la malla con `prov.capa(...)`: trabajo extra en Pyodide, y el contrato no garantiza que esa malla sea la de análisis (pendiente técnico; hoy coinciden en el demo).

## Pendientes menores diferidos (de las revisiones)

Ver `.superpowers/sdd/plan-migracion/progress.md` (no versionado): validar `max_lado`/`vmin` NaN en `api/encoding.py`; ids únicos de adquisición en `Escenario`; escena cacheada mutable.

## Revisión final y decisiones adicionales (sin supervisión)

- Revisión final de toda la rama (0 Critical, 6 Important): se corrigieron en una ronda única: fecha neutra para `ec_pedernales`, re-simulación de enlaces caducados, pasos cortos del reproductor deshabilitados con motivo (el reproductor por fotogramas continuos queda **pendiente**), ayuda «Cómo ve el radar» con la frase de centímetros marcada «pendiente de confirmar», excepciones `EntradaNoValida`/`NoEncontrado`, versiones fijadas en `requirements-api.txt`, fecha fija del sello del contexto.
- Las tareas 4.3, 4.4 y 5.1 no tuvieron revisor independiente (presupuesto); la revisión final cubrió su honestidad.
- Notas del modelo heredado (`modelo/nisar.py`) se muestran con el aviso «pendiente de confirmar con la documentación oficial»; no se modificó `modelo/`.
- Categorías: se transportan como códigos enteros y se colorean por variable con hex de `docs/diseno.md` §4 (Severidad alta usa `#9a3412`, parada de `fuego`, por distinguibilidad con daltonismo).
- `--allow palette-terracotta` en `revision_visual.sh` (el color `--demo-ink` lo fija diseno.md §4), con un guard de hex fuera de tokens.

## Cambio posterior: mapa tipo carta geográfica (a petición del usuario)

- El mapa ahora puede usar mapas base de Esri con internet (Oscuro, Satélite, Relieve, con etiquetas), ciudades locales de respaldo sin red y control de opacidad de la capa de datos; capturas en `docs/capturas-nuevas/mapa-carta/`. Sin red o con `VITE_MAPA_REMOTO=0` se dibuja solo con las provincias locales (las pruebas y la revisión visual usan ese modo).
- Pendientes: en Relieve el radar puede tapar etiquetas (vienen dentro de la tesela); hueco bajo la cinta en escritorio; en móvil las placas flotantes ocupan ~130 px; el aviso «Unexpected }» de minificación de CSS; sin prueba automática del mapa con red.
- Importante: para ver el mapa con Esri hay que compilar sin `VITE_MAPA_REMOTO=0` (`cd frontend && npm run build`).

## Segunda noche: Simulador de Eventos (antes «Modo Dios»), 2026-11-05

A petición del equipo se conserva el Modo Dios de la app heredada, renombrado **Simulador de Eventos**, y se amplía. Spec: `docs/superpowers/specs/2026-11-05-simulador-de-eventos-design.md`; plan: `docs/superpowers/plans/2026-11-05-simulador-de-eventos.md`.

- **Hecho:** `datos/simulador.py` + `datos/simulador_render.py` (puente sin estado sobre `modelo/desastres.py`, que no se modificó), `api/rutas/simulador.py` (`/api/simulador/{catalogo,mundo,evento,ciudad}`), pantalla `/simulador` (tablero con teclado, animación, parámetros desde el catálogo, KPI, tabla, bitácora en el navegador con CSV marcado, PNG de informe con franja).
- **Ideas diferenciadoras:** (1) *Gemelo del radar*: comparador deslizante antes/después con la polarización nombrada (HV incendio; HH agua) y rejilla de paneles si no son comparables (terremoto, erupción); (2) *¿Cuándo lo vería el radar?*: espera 0–12 días con el ciclo **supuesto, pendiente de confirmar**, determinista (sustituye el sorteo aleatorio del código heredado); (6) *Compartir*: el escenario viaja en la URL (valores inválidos se ignoran) y se exporta como informe PNG.
- **Rulings:** malla de 128 celdas (el solver de aguas someras escala ~n³: 160 tardaba hasta 85 s en 20 km); las capas animadas se colorean en el servidor (PNG) por sus estilos físicos propios, no por las rampas del sistema de diseño; el simulador es sintético por naturaleza y no depende de `NISAR_PROVEEDOR`.
- **Verificación:** pytest 206 (+2 omitidas), unittest 13, vitest 321, lint OK, Playwright 28/28, revisión visual `/simulador` 0 FAIL.
- **Pendientes del simulador:** `tormenta`/`inundacion` tardan ~10–30 s (ver «Simulando…»); en el demo sintético un incendio en una celda aislada puede quemar ~1 celda; avisos visuales `ragged-row` y `below-fold`; sin captura en móvil con resultados completos; **fase 2:** decisión A/B (cortafuegos, dique, evacuación), cascadas, retos educativos; falta Estación y temporada, Fundamentos y Validación (noche 2).

## Pendientes tras la primera noche (histórico; ver «Pendientes vigentes»)

- **Funcionales (paridad N1 incompleta):** serie temporal del punto/cuadrante (la API no expone `serie_seleccion`), fecha del evento (el servidor no la acepta), tooltip de provincia y marcadores del catálogo en el mapa, marcas de evento y cursor en la vista Serie, observable del tipo en la cabecera.
- **Visuales:** mapa gris sin contexto a escala de escenario (falta localizador/escala), menú de tres puntos en móvil, tabla móvil en tres líneas y sin semántica de tabla, margen de la banda móvil (12 px), sin captura con punto/cuadrante seleccionado.
- **Datos reales:** `/api/tipos` mezcla unidades (el panel multiplica por `escala`); `/cambio` pesado con rejillas reales (capas extra a demanda); `/medicion` recalcula el cambio; `RLock` global en el proveedor demo; `/api/salud` depende de `escenarios()`; el proveedor real es un esqueleto.
- **Equipo:** confirmar licencia (MIT provisional), requisitos de entrega, si Validación se conserva, y qué hacer con `/_sistema` (galería publicada en producción).
- **Noche 2:** Estación y temporada, Fundamentos, Validación (N2.1, N2.4, N2.5); el Modo Dios ya está hecho como Simulador de Eventos.

## Avance del plan

Primera noche (0.1–5.3): **hecha**. Noche 2: N2.1 cubierta por `PanelContexto`, N2.2–N2.3 hechas como
Simulador de Eventos, N2.4 hecha; **N2.5 (Validación) pendiente de decisión**; N2.6 (auditoría final)
pendiente — conviene hacerla junto con la actualización de accesibilidad. Con datos reales: sección
«Integración de datos reales», sin empezar.

## Decisiones tomadas

- Historia principal: inundaciones y humedales (Costa baja). Segunda historia: incendios forestales (Sierra).
- Zona: Ecuador entero, con dos zonas de demostración (La Segua, Manabí; Loja, Sierra) y clic libre en el país.
- Capa de datos intercambiable (`datos/`): proveedor de demostración sintético hoy; proveedor real
  como esqueleto. La API solo habla con el contrato.
- Honestidad: banda permanente de demostración, sello de origen en cada capa y gráfico, exportaciones marcadas.
- FastAPI; React + Vite + TypeScript; MapLibre con estilo local; sin cuentas ni estado en el servidor.
- Dirección de arte A «Sala de control», acento amarillo cenit `#e5b93c`, Public Sans.
- Licencia MIT **provisional, pendiente de confirmar por el equipo**.

## Decisiones pendientes del equipo

- Confirmar la licencia (MIT provisional).
- Requisitos oficiales de entrega del hackathon.
- Si la pestaña Validación (partición espacial) se conserva.
- Qué hacer con `/_sistema` en producción.
- Idiomas y nivel de accesibilidad de la próxima actualización (ver sus «Preguntas para decidir»).

## Problemas encontrados

| Fecha | Tarea | Problema | Qué se probó | Estado |
|---|---|---|---|---|
| 2026-11-04 | Paso 0 | Node 12 y sin navegador | nvm + Playwright | Resuelto |
| 2026-11-04 | Revisión | La app presentaba sintético como NISAR («Datos de radar NISAR…», «Producto: NISAR L2 GCOV», «Área quemada real») | — | Se corrige en Tareas 0.3, 3.4, 3.10 |
| 2026-11-04 | Revisión | Código de lectura HDF5 y búsqueda ASF con detalles de NISAR no verificados | — | Marcado en `docs/challenge.md`; se revisa en la integración de datos reales |
| 2026-11-06 | Idioma · Tarea 3 | `frontend/src/pantallas/historias/historias.css:24` tiene una `}` sobrante (ya en HEAD): el minificador avisa «Unexpected "}"» y el navegador descarta la regla siguiente (`.historia__cabecera`). | Se confirmó que es anterior a la tarea | Resuelto en la Tarea 8 (idioma): `}` sobrante eliminada en `historias.css` |

## Pendientes visuales por pantalla

| Pantalla | Rondas usadas | 1440 | 768 | 390 | Pendientes |
|---|---|---|---|---|---|
| Sistema de diseño (`/_sistema`) | 3 de 3 + 1 de corrección del revisor | 0 FAIL | 0 FAIL | 0 FAIL (1 WARN `edge-text`) | WARN `edge-text` a 390 px: la banda de demostración usa margen de 12 px (diseno.md §10 pide 16) para que su texto obligatorio quepa; tabla móvil en 3 líneas por fila y sin semántica de tabla (display:block); `--allow palette-terracotta` en `revision_visual.sh` por `--demo-ink` fijado en §4 (con guard de hex fuera de tokens) |
| Historias (`/`) | 3 de 3 (2 de implementación + 1 de revisor) | 0 FAIL | 0 FAIL | 0 FAIL | En móvil el comparador queda tras el texto de las partes 1–2 (se respeta el orden de lectura); la tarjeta del comparador a 1440×900 termina a 10 px del borde inferior (depende del viewport); la pareja de pasadas se elige por el mayor cambio de la serie (criterio de la demo); sin e2e propio |
| Observatorio · mapa | 3 de 3 + 1 (bloque B: provincia, marcadores) | 0 FAIL | 0 FAIL | 0 FAIL | Con OpenFreeMap apagado el mapa a escala de escenario (~8 km) es un fondo gris con la capa: falta un localizador de Ecuador o escala gráfica; hoja inferior de parámetros en móvil y menú de tres puntos (§10) pendientes; sin prueba e2e propia |
| Observatorio · comparar | 3 de 3 + 1 de revisor | 0 FAIL | 0 FAIL | 0 FAIL | Enlace «Ver su evolución en Serie» con e2e propio; sin captura con punto/cuadrante seleccionado; medición y cambio usan las polarizaciones del análisis, no el selector (avisado en pantalla); notas del modelo heredado mostradas con aviso «pendiente de confirmar» |
| Observatorio · serie | 2 de 3 (bloque B) | 0 FAIL | 0 FAIL | 0 FAIL (WARN `below-fold` por la columna lateral) | Con marca del evento, cursor del instante y bloque «En la selección» (captura `serie-evento`); tabla intercalada de 60 filas en La Segua; sin revisión independiente de esta tarea |
| Selector de idioma y aviso del kichwa (riel, `/`, captura `historias-selector`) | 2 de 3 | 0 FAIL | 0 FAIL | 0 FAIL (1 WARN `edge-text`) | WARN `edge-text` a 390 px: con siete celdas iguales en la barra inferior, «Inicio» queda a 13 px del borde (defendido: celdas iguales, el texto centrado en su celda). Ronda 2 corrigió: las flechas en el grupo de radios cerraban el panel (ahora cambian el idioma sin cerrar; clic o Intro cierran) e Intro reabría el panel; aire entre el anillo de foco y el texto. El inspector no puede abrir el panel ni fijar `qu`: el panel y el aviso se revisaron con capturas de Playwright a 1440, 768 y 390 px |

Para cada pantalla cerrada se pega aquí la crítica de las siete preguntas de `app-screens.md §2.7`.

## Paridad funcional

Leyenda: `[~]` = parcial; `[ ]` = no hecho (noche 2 / datos reales).

Copia de la lista de `docs/plan-migracion.md` (N1 primera noche, N2 segunda, R con datos reales).

- [x] N1 · Parámetros (con fecha del evento editable, 2026-11-08) (tipo, lugar, clic en mapa, estacionalidad, radar, intervalo, controles con hora, fecha, restablecer, resumen)
- [x] N1 · Cabecera y contexto (con «observable», 2026-11-08)
- [x] N1 · Mapa (con provincia bajo el puntero y marcadores del catálogo, 2026-11-08; fotogramas continuos 2026-11-05) (capas, reproductor completo, deslizador, reloj, métricas, provincias, catálogo, aviso fuera de Ecuador)
- [x] N1 · Antes / después (con serie del punto en Serie, 2026-11-08) (paneles, punto y cuadrante, medición y CSV, punto y serie, borrar, flujo, notas, PNG, parcelas) + comparador
- [x] N1 · Serie temporal (con marca del evento y cursor, 2026-11-08) (gráficos, tabla y CSV)
- [~] N1 · Física por tipo (inundación e incendio en Historias; los otros cuatro con la ayuda «Cómo ve el radar»)
- [x] N2 · Estación y temporada (cubierta por `PanelContexto` del Observatorio: estación astronómica, próximo hito, temporada y clima mensual; no se duplica en pantalla propia)
- [x] N2 · Modo Dios → Simulador de Eventos (herramientas, parámetros, animación, efectos, vista radar, bitácora, PNG; fase 2 pendiente)
- [x] N2 · Fundamentos (`/fundamentos`: misión marcada pendiente, fenómenos, polarización y bandas)
- [ ] N2 · Validación (si se confirma)
- [ ] R · HDF5 reales, catálogo ASF, explorador geográfico

## Laboratorio del radar, recorrido y fundamentos (2026-11-05)

Spec: `docs/superpowers/specs/2026-11-05-laboratorio-recorrido-design.md`.

- **Laboratorio** (`/laboratorio`): «La nube no lo detiene» (cobertura de nubes sobre un óptico simulado; el radar no cambia) y «Polarización y banda» (qué polarización resalta cada cambio, calculado en `datos/laboratorio.py`). API `GET /api/laboratorio/nubes` y `/respuesta`. Escena genérica, coeficientes **ilustrativos**; la banda S va marcada «pendiente de confirmar con la documentación oficial».
- **Recorrido** (`/recorrido`): guion de 6 pasos (≤ 2 min) que incrusta pantallas reales (`?incrustado=1` oculta el riel; la banda de demostración se queda). Teclado, pausa y respeto a «menos movimiento».
- **Fundamentos** (`/fundamentos`): física general; todo lo específico de NISAR queda «pendiente de confirmar».
- Riel con seis destinos; etiqueta móvil de Historias acortada a «Inicio» (el inspector marcaba `edge-text`).
- Revisión visual: 0 FAIL a 1440/768/390 en laboratorio (ambas vistas), recorrido y fundamentos. Capturas en `docs/capturas-nuevas/{laboratorio-nubes,laboratorio-pol,recorrido,fundamentos}/`.
- Pendiente: Validación sigue sin decidir (el solape de `Barras` y el localizador se resolvieron en «Preparación de la demo»).
- Nota de proceso: se detuvo un `servidor.py` obsoleto en el puerto 8000 que hacía que `revision_visual.sh` revisara el build viejo (el script reutiliza el servidor que encuentre).

## Resumen de impacto (2026-11-05)

- Pestaña **Impacto** del Observatorio, solo en los escenarios con historia (inundación e incendio): hectáreas afectadas, parte de la escena, hectáreas por categoría, evolución frente a la pasada «antes», lectura en lenguaje llano, acciones **condicionales** («si esto fuera un evento real…») e **informe de una página en PNG** con aviso de ejemplo ilustrativo y franja de origen.
- API `GET /api/escenarios/{id}/impacto` (`datos/impacto.py`): solo usa `ProveedorDatos.cambio`, así que sirve igual con el proveedor real. 422 en español para escenarios sin historia o fechas iguales.
- Las acciones son orientativas, no operativas. Superficies medidas sobre la malla de análisis (celda ~50–100 m según el escenario).
- Pendiente: el resumen no cubre cultivos, glaciares, terremotos ni subsidencia (sus cambios no son categorías de superficie afectada); la evolución usa hasta 12 pasadas espaciadas, no las 30.

## Preparación de la demo (2026-11-05)

- README (es/en) y guion (`docs/historia-datos.md`) actualizados con Laboratorio, Impacto, Recorrido y Fundamentos; el guion gana una versión corta (el recorrido de 90 s) y un «Plan B si no hay internet».
- Barras con valores negativos: el rótulo del valor va sobre la línea de cero (antes chocaba con el eje).
- Localizador de Ecuador en el mapa del Observatorio (`mapa/Localizador.tsx`): silueta continental con el punto del escenario; resuelve el fondo gris a escala de escenario sin mapa base. Se oculta con «Ver todo Ecuador».
- Pendiente: hoja inferior de parámetros del Observatorio en móvil.

## Revisión de código (`/code-review high`, 2026-11-05)

Corregido: el recorrido se saltaba pasos al avanzar solo (ahora un temporizador por paso, con prueba de avance de uno en uno); la evolución del impacto cubría pasadas posteriores a «después» (ahora solo el intervalo, con «después» incluida y error 422 si el orden es inverso); las categorías de impacto se resuelven por etiqueta y fallan si no coinciden; el impacto tiene caché acotada (la evolución llama hasta 13 veces a `cambio`; con el proveedor real sería lo más caro de medir); etiquetas distintas en las barras de severidad; el modo incrustado también se activa dentro de un iframe; el laboratorio muestra y cuenta las **falsas alarmas** del radar por moteado (antes exageraba su ventaja sobre el óptico); localizador sin spread gigante y sin punto engañoso fuera de la silueta; `mensajeDeError` compartido y franja de métricas sin orden posicional.

## Cumplimiento de `docs/challenge.md` (con evidencia)

| Requisito | Estado | Evidencia |
|---|---|---|
| Mapa interactivo de cambio | Cumple | `frontend/src/pantallas/observatorio/VistaMapa.tsx` (capa de cambio, clic para simular, aviso fuera de Ecuador); e2e `flujos.spec.ts` |
| Animación de series temporales | Cumple | Reproductor por pasadas y, con paso menor de 12 días, fotogramas continuos del modelo (`observatorio/fotogramas.ts`, `useTiempoObservatorio.ts`, `VistaMapa.tsx`); e2e «anima los fotogramas» |
| Comparador deslizante antes/después | Cumple | `comparador/Comparador.tsx`; Historias y Observatorio; e2e con teclado |
| Dashboards y métricas | Cumple (más resumen de impacto accionable para gestores) | `PanelMetricas.tsx`, `Mediciones.tsx`, `TablaResultados.tsx`, vista Serie |
| Público amplio | Cumple (kichwa en revisión; prueba con lector de pantalla pendiente) | Términos explicados (`Termino`); español, English y kichwa con selector (`frontend/src/idioma/`); axe WCAG 2.2 AA sin infracciones graves en 36 combinaciones (`e2e/accesibilidad.spec.ts`); teclado y reflujo a 320 px comprobados (ver «Idioma y accesibilidad»). El kichwa es un borrador sin validar (0 de 923) y no se hizo prueba con lector de pantalla |
| Qué polarización resalta el cambio | Cumple | Historias (conmutador) y Laboratorio (calculado por cambio y banda) |
| Hipótesis de impulsores (físicos y humanos) | Cumple (ejemplos ilustrativos) | `pantallas/historias/contenido/*.ts` |
| Aplicaciones futuras de NISAR | Cumple (condicionales, «pendiente de confirmar») | contenido de Historias, parte 5 |
| Series con varias fechas | Cumple | Cinta de pasadas (30 adquisiciones) y vista Serie |
| Distintas frecuencias | Parcial (ilustrativo) | Laboratorio: banda S como ejemplo, marcada «pendiente de confirmar»; el demo de escenarios sigue en banda L |
| Conceptos clave (activo, dieléctrica, polarización, centímetros) | Cumple | Historias parte 2 y ayuda «Cómo ve el radar» (centímetros marcado «pendiente de confirmar») |
| Datos NISAR reales | No cumple (por diseño) | Proveedor real = esqueleto; sin recursos oficiales |
| Honestidad (reglas 1–5) | Cumple | Banda permanente (`hay_sinteticos`, fail-safe), sellos de origen, exportaciones con marca (CSV/PNG, e2e), `esReal` único criterio, notas heredadas con aviso |
| Código abierto | Parcial | MIT provisional, pendiente de confirmar por el equipo |

## Cómo verificar manualmente el resultado

1. `source scripts/entorno.sh`
2. (Opcional) `python scripts/generar_datos_demo.py` publica la instantánea del conjunto sintético en `data/demo/`; la app no la necesita para funcionar.
3. `cd frontend && npm install && npm run build && cd .. && python servidor.py`, y abre http://localhost:8000 (Node 22 vía `source scripts/entorno.sh`; `python -m pip install -r requirements.txt -r requirements-api.txt` la primera vez).
4. Comprueba que la banda «DATOS DE DEMOSTRACIÓN» se ve en todas las pantallas y no se puede cerrar.
5. Historias: mueve el comparador con el ratón y con las flechas; lee las cinco partes de cada historia.
6. Observatorio: elige La Segua, pulsa Play y comprueba que el mapa, la cinta y las métricas cambian a la
   vez; dibuja un cuadrante en «Comparar» y descarga el CSV (debe empezar con `# origen: sintético`).
7. Haz clic fuera de Ecuador: debe avisar.
8. Reduce la ventana a 390 px: el riel pasa a barra inferior y nada se desborda.
9. Pruebas completas: `python -m pytest tests -q`, `python -m unittest modelo.clima modelo.desastres`, y en `frontend/`: `VITE_MAPA_REMOTO=0 npm run build && npm test && npm run lint && npx playwright test` (ver también la tabla de `CLAUDE.md`).

## Idioma · Tarea 9 (Observatorio: estructura, parámetros, contexto y ayuda)

- Área `observatorio` creada en los tres catálogos (secciones `obs.estructura|hallazgo|parametros|contexto|ayuda`).
- `derivados.hallazgo()` ahora arma la frase con claves (`obs.hallazgo.*`), cifras y fechas del idioma; `Historia.tsx` la usa igual. El título y la etiqueta de la serie vienen de la API y siguen en español dentro de la frase hasta la Tarea 19 (mezcla de idiomas visible en `en`/`qu`).
- Textos de la API sin clave todavía (nombres de tipos y escenarios, etiquetas y ayudas de controles del simulador, estación astronómica, hito, nombre local de temporada) se muestran en español; los de contexto y ayuda van con `TextoApi`.
- Revisión visual `/observatorio`: el inspector corre con navegador en inglés. «Home» (riel móvil, `en`) quedó a 11 px del borde (FAIL); se cambió a «Start» y queda WARN `edge-text` (14 px), defendido como las celdas iguales de la barra inferior. WARN `below-fold` (2 de 6 bloques) preexistente.
- El mes del contexto en `qu` usa los nombres de `fecha.mes.N` (en español hasta decidir los kichwa).

## Accesibilidad: línea base

Auditoría axe (`frontend/e2e/accesibilidad.spec.ts`, etiquetas wcag2a/2aa/21a/21aa/22aa) en 6 rutas × 3 idiomas × 2 anchos (1440, 390), con `PENDIENTES = []`. Solo se cuentan infracciones `serious`/`critical`. Resultado: 18 de 36 combinaciones fallan (todas a 390 px); a 1440 px no hay infracciones graves.

| Regla | Impacto | Rutas | Nodos por ruta |
|---|---|---|---|
| `label-content-name-mismatch` | serious | las 6 (`/`, `/observatorio`, `/simulador`, `/laboratorio`, `/recorrido`, `/fundamentos`), solo a 390 px, en `es`, `en` y `qu` | 6 en `es`, 4 en `en` y `qu` (enlaces del riel/barra inferior: `aria-label` largo distinto del texto corto visible) |

`PENDIENTES = ['label-content-name-mismatch']`. Nota: `bypass`, `document-title`, `page-has-heading-one`, etc. no aparecen como serious/critical (son moderate); se resuelven igualmente en la Tarea 21.

## Tarea 26: e2e de idioma y revisión visual en tres idiomas

- `frontend/e2e/idioma.spec.ts`: cambio de idioma con el escenario cargado sin peticiones nuevas a `/api/` (Review Focus 2), persistencia tras recargar, clic de ratón sobre la etiqueta del selector, aviso «en revisión» y banda en `qu`, y el recorrido incrustado siguiendo al idioma de la página (evento `storage`) sin peticiones.
- `scripts/revision_visual.sh` acepta un tercer argumento `es|en|qu`.
- Revisión visual en `en` y `qu` de las seis rutas: en `qu` a 390 px había un FAIL `edge-text` común a todas («Kallari» a 10 px del borde izquierdo y «Ima niyta munan» a 5 px del derecho). Corregido en la primera ronda: padding izquierdo del riel móvil (`--space-2`) y el enlace de la banda puede partirse en dos líneas. Quedan WARN preexistentes (`below-fold` en observatorio; «Start» a 14 px en `en`, defendido arriba). Sin pendientes.

## Ronda de arreglos de la revisión final (2026-11-06)

Hallazgos de la revisión general del plan de idioma y accesibilidad, verificados en navegador y arreglados:

- **Foco al navegar:** la marca ya no se consume al primer intento; se intenta tras pintar y en cada cabecera que se monta mientras el foco siga libre, y un clic en el destino actual también lo mueve. E2E con dos visitas a la misma ruta y desde el Observatorio (que monta una cabecera provisional).
- **Riel (WCAG 2.5.3):** el nombre de cada destino empieza por la etiqueta corta visible («Inicio · Historias»). axe sigue en 0 infracciones graves en las 36 combinaciones.
- **Regla 7:** el simulador ya no dice «… detectado por NISAR»: dice «… · detección del modelo (simulación)» (texto español de la API cambiado por decisión del controlador; claves `api.sim.metrica.*_deteccion_del_modelo_simulacion`).
- **`textoApi`:** en español devuelve el texto de la API; una clave derivada del id o del texto solo traduce si el español del catálogo coincide. Se restauraron los fixtures que la Tarea 19 había cambiado.
- **Texto del demo con clave:** métricas del cambio y de la medición (`api.obs.metrica.*`), órbita, unidades con palabras, títulos de series (también en el hallazgo de la cabecera), notas del modelo por escenario (`api.nota.<id>.<n>`, el puente en `datos/` sin tocar `modelo/`), títulos de panel y encabezados de tabla del simulador; la bitácora guarda clave y valores del título. Lo que sigue en español está en «Pendientes vigentes».
- Aviso del kichwa también en español (`lang="es"`); el aviso de la ayuda del radar ya no queda marcado como «sin traducir»; errores sin traducir con `lang="es"`; `--control` a `#6c6c70` (≥ 3:1 también sobre `--raised`); hora del último dato centralizada (`formatoHora`, kichwa como es-EC); fecha del pico de impacto en ISO; «Mw 7,0»/«MMI 7,4» con su número; prueba de claves repetidas entre áreas; extremos de la leyenda de desplazamiento con borrador kichwa anotado en la guía; pruebas de almacenamiento bloqueado con navegador en inglés, `?idioma=` no válido y e2e de cambio de idioma con una erupción reproduciéndose.

## Idioma y accesibilidad (2026-11-05)

### Qué se hizo (Tareas 1 a 28)

- **Idioma:** tres idiomas (`es` fuente de verdad, `en`, `qu` kichwa unificado, `lang="qu-EC"`) sin biblioteca de i18n: catálogos por área en `frontend/src/idioma/catalogos/`, `useT()`, selector en el riel (al pie en escritorio; séptimo elemento de la barra inferior en móvil), elección inicial (`?idioma=` → `localStorage` → `navigator.languages` → `es`), todo en `try/catch`. Las claves de TanStack Query no incluyen el idioma: cambiar de idioma no repite peticiones (e2e `idioma.spec.ts`).
- **API:** los textos y errores de la API llevan `clave_texto` y `valores_texto`, o una clave que el frontend deriva del id o del texto y que solo traduce si el español coincide (`api/claves.json`, 417 claves); lo que el catálogo no conoce se muestra en español con `lang="es"`, nunca la clave. No todo el texto del demo se traduce: lo que queda en español está en «Pendientes vigentes».
- **Honestidad:** la banda «DATOS DE DEMOSTRACIÓN», los sellos de origen y «pendiente de confirmar con la documentación oficial» existen en los tres idiomas; el CSV exportado conserva `# origen: sintético` y añade `# idioma:`.
- **Accesibilidad:** auditoría axe en CI de pruebas (6 rutas × 3 idiomas × 2 anchos), saltar al contenido, puntos de referencia y encabezados, foco visible sin tapar, trampa de foco en paneles, objetivos de al menos 24 px, contraste (`--control` aclarado de `#3a3a3e` a `#67676b` en la Tarea 22 y a `#6c6c70` en la ronda de arreglos final: ≥ 3:1 sobre `--ground`, `--surface` y `--raised`), tabla móvil con semántica, descripciones de mapa y lienzos, y menos movimiento (`prefers-reduced-motion`) en simulador, recorrido y laboratorio.
- **Kichwa:** `docs/traduccion-kichwa.csv` (923 claves) y `docs/guia-traduccion-kichwa.md` para hablantes; `scripts/traducciones_csv.mjs exportar|importar`.

### Cifras de pruebas (corridas el 2026-11-06 sobre `2fee767`)

| Suite | Resultado |
|---|---|
| `python -m pytest tests -q` | 262 passed, 2 skipped (por diseño) |
| `python -m unittest modelo.clima modelo.desastres` | 13 tests OK |
| `npm test` (vitest) | 523 passed, 51 archivos |
| `npm run lint` | sin errores |
| `npm run build` | OK |
| `VITE_MAPA_REMOTO=0 npm run build && npx playwright test` | 81 passed (incluye 36 de axe y 4 de idioma) |

### Estado del kichwa

**0 de 1 083 claves validadas** (923 al cierre de la primera ronda; 949 tras el bloque B; 1 083 tras el C). Es un borrador redactado por Claude sin hablantes; la app lo avisa («Kichwa tikrayka manaraka chiqanyachishkachu…») y el aviso no desaparece hasta que todas las claves y el contenido largo estén validados. Dudas abiertas por prioridad en la guía (honestidad H1–H5, decisiones D1–D9, palabras con varios sentidos C1–C10).

### Prueba manual (spec §4.7): qué se hizo y con qué herramienta

**Importante:** este entorno no tiene lector de pantalla (Orca/NVDA) ni una persona usando un teclado físico. No se hicieron pasadas a mano ni con lector de pantalla. Lo que sigue se automatizó con Playwright (Chromium) contra `python servidor.py` con el build `VITE_MAPA_REMOTO=0`; el script era temporal y no se versiona.

1. **Solo teclado (automatizado, `es`, ventana 1280×800).** En cada una de las seis pantallas se pulsó Tab hasta que el foco volvió al inicio (sin trampa de teclado) y se comprobó que cada parada tiene nombre accesible, está dentro de la ventana y se recorre hacia atrás con Mayús+Tab. Paradas por ciclo: Historias 24, Observatorio 39, Simulador 26, Laboratorio 12, Recorrido 34 (17 de ellas dentro de los marcos incrustados), Fundamentos 15. Además: Enter abre el selector de idioma, Escape lo cierra y el foco vuelve al botón; la flecha derecha mueve el comparador (50 → 51).
   - Hallazgos de la heurística automática sin consecuencia, revisados a mano en el código: interruptores y campos del simulador sí tienen nombre (por `<label>`); el divisor del comparador dibuja su anillo de foco en el tirador hijo (`comparador.css:39`), no en el elemento. El lienzo del mapa (MapLibre) y los marcos del Recorrido no muestran anillo propio en esta comprobación: no se verificó con ojos humanos si el foco se percibe sobre el mapa. **Pendiente de revisar con una persona.**
   - No se recorrieron con teclado los tres idiomas ni el ancho de 390 px, salvo la prueba existente de foco/objetivos a 390 px (`accesibilidad.spec.ts`).
2. **Zoom/reflujo (emulado con ventana de ancho reducido, no con zoom del navegador).** 640 px CSS (equivale a 200 % sobre 1280 px) y 320 px CSS (400 %), seis rutas × tres idiomas = 36 combinaciones por ancho. Resultado: **0 casos con scroll horizontal** (`scrollWidth` = `clientWidth`), 0 elementos visibles fuera del ancho (salvo contenedores con scroll propio), 1 `h1` por pantalla y banda de demostración presente en todas (a 320 px usa la forma corta «DEMO · …» / «DEMOSTRACIÓN» según el idioma). La «pérdida de contenido» solo se comprobó por la presencia del `h1` y de la banda (no se comparó con la vista de 1280 px); no se comparó el texto completo ni se miró cada captura.
3. **Lector de pantalla (Orca/NVDA), Historias y Observatorio en los tres idiomas: no realizada.** *Pendiente: requiere persona con lector de pantalla.* Hasta entonces no se afirma cumplimiento total de WCAG; solo que axe no encuentra infracciones graves o críticas en las etiquetas wcag2a/2aa/21a/21aa/22aa.

Lo que falló en esta prueba: nada que bloquee. Lo que queda sin demostrar está en «Pendientes vigentes» (grupo «Idioma y accesibilidad»).
