# Pendientes visuales, funcionales y de texto — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cerrar los grupos «Visuales / móvil», «Funcionales» (serie del punto, fecha del evento, mapa y observable)
y «Texto que sigue en español» de `INFORME.md`, sin tocar `modelo/`.

**Architecture:** A es solo frontend (componente `MenuAcciones`, CSS con tokens, orden del DOM con `useMovil`).
B amplía el contrato de `datos/` con campos opcionales (`instante_evento`, `observable`), una ruta GET nueva y
la prop `cursor` de `Linea`. C reconoce en `datos/` el texto que escribe `modelo/` contra plantillas registradas y lo
envía en campos paralelos opcionales (`TextoClave`); el frontend los traduce con `textoApi`.

**Tech Stack:** Python 3.13 · FastAPI · pydantic 2 · React 18 + Vite + TS estricto · vitest · Playwright · MapLibre.

**Spec:** `docs/superpowers/specs/2026-11-08-pendientes-visual-funcional-texto-design.md` (léelo entero antes).

## Global Constraints

- Primero en cada shell: `source scripts/entorno.sh`. Python es `python` (3.13).
- `modelo/`, `app.py`, `interfaz/` y `main` no se tocan. Sin `git push`. `modelo/` solo se **lee** (constantes).
- La API solo habla con el contrato de `datos/` (`datos/contrato.py`); campos nuevos siempre opcionales con
  valor por defecto, para que el proveedor `real` y los datos existentes sigan valiendo.
- Ningún detalle nuevo de NISAR. `producto` (GCOV/GUNW/GOFF) **no** se expone.
- Todo texto nuevo de interfaz en `frontend/src/idioma/catalogos/{es,en,qu}/<área>.ts`; el kichwa es borrador sin
  validar (no se añade a `catalogos/validadas.ts`). Tras tocar catálogos: `node scripts/traducciones_csv.mjs exportar`.
- Tras tocar textos de la API: `python scripts/exportar_claves_api.py`. Tras tocar esquemas de la API:
  `python scripts/exportar_openapi.py && cd frontend && npm run tipos`.
- Colores, tamaños y radios solo de `frontend/src/diseno/tokens.css`; `docs/diseno.md §10` y `§12` obligatorios.
- Pantalla tocada → `bash scripts/revision_visual.sh <ruta> <nombre>` a 1440/768/390, máximo tres rondas; lo que
  quede va a `INFORME.md`. Taste Skill por el camino de apps (`node .claude/skills/design-taste-frontend/scripts/lint.mjs --app`
  y `inspect.mjs --app`).
- Suites antes de cada commit: `python -m pytest tests -q`, `python -m unittest modelo.clima modelo.desastres`,
  `cd frontend && npm test && npm run lint && npm run build`. No se pasa a la siguiente tarea en rojo.
- Un commit por tarea con el mensaje indicado, terminado en la línea
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Orden: bloque A, luego B, luego C (B y C tocan contrato, catálogos y `api/claves.json`: en serie, nunca en paralelo).

## Review Focus

1. Un clic en un marcador del catálogo NO crea un escenario derivado (el mapa ignora clics sobre `.mapa__marcador`) → prueba en Tarea B6.
2. `fecha_evento` sin usar no cambia los ids existentes (`ec_la_segua` sigue siendo `ec_la_segua`, mismo hash con lat/lon) → prueba en Tarea B3.
3. Instante `t` de la URL fuera del rango de las pasadas tras cambiar la fecha → se acota a la primera/última pasada → prueba en Tarea B4.
4. Texto del modelo que no encaja en ninguna plantilla → sin clave y en español con `lang="es"`, nunca una clave visible → prueba en Tarea C1.
5. Menú de acciones abierto y luego la hoja inferior: el foco termina dentro de la hoja y vuelve al botón del menú al cerrarla → prueba en Tarea A2.

---

## Bloque A · Visual / móvil

### Task A1: componente `MenuAcciones`

**Files:**
- Create: `frontend/src/diseno/MenuAcciones.tsx`, `frontend/src/diseno/MenuAcciones.test.tsx`
- Modify: `frontend/src/diseno/iconos.tsx` (añadir `IconoMasAcciones`, tres puntos verticales, mismo estilo de trazo que `IconoMas`), `frontend/src/diseno/componentes.css` (sección `.menu-acciones`), catálogos `piezas` de es/en/qu

**Interfaces:**
- Produces: `MenuAcciones({ etiqueta, acciones }: { etiqueta: string; acciones: AccionMenu[] })`, con
  `export interface AccionMenu { id: string; texto: string; alElegir: () => void; presionada?: boolean }`.

- [ ] **Step 1: Pruebas (vitest + Testing Library, como `HojaInferior.test.tsx`)**
  - `abre la lista al pulsar el botón`: botón con nombre `etiqueta`, `aria-haspopup="menu"`, `aria-expanded` pasa de `false` a `true`; aparecen `menuitem` con los textos.
  - `Escape cierra y devuelve el foco al botón`.
  - `elegir ejecuta la acción y cierra` (`alElegir` llamado una vez; el menú desaparece).
  - `flecha abajo mueve el foco al siguiente elemento` (con dos acciones, foco en la segunda).
  - `clic fuera cierra`.
- [ ] **Step 2:** `cd frontend && npx vitest run src/diseno/MenuAcciones.test.tsx` → FAIL (no existe).
- [ ] **Step 3: Implementar.** Botón nativo `<button type="button" className="boton boton--terciario" ref={botonRef}>` (`Boton` no reenvía refs) con `<IconoMasAcciones />` y `aria-label={etiqueta}`, alto `--h-touch`. Al elegir, en este orden: `botonRef.current?.focus()`, `setAbierto(false)`, `accion.alElegir()` — `HojaInferior` guarda `document.activeElement` al montarse y así devuelve el foco al botón del menú. Lista `role="menu"` posicionada bajo el botón, alineada a la derecha: fondo `--raised`, borde 1px `--control`, `--radius-card`, `--shadow-float`, elementos de alto `--h-touch` y `--fs-14`. Al abrir, foco en el primer `menuitem`. Clic fuera con el mismo patrón que `BandaDemostracion`.
- [ ] **Step 4:** la prueba pasa; suites del frontend en verde.
- [ ] **Step 5: Commit** `feat(frontend): menú de acciones para móvil`

### Task A2: menú en el Observatorio y estado «país» en la pantalla

**Files:**
- Modify: `frontend/src/pantallas/observatorio/Observatorio.tsx` (líneas 207–273), `VistaMapa.tsx` (estado `pais`, botones de `vista-mapa__acciones`), `observatorio.css`, catálogos `observatorio`
- Test: `frontend/src/pantallas/observatorio/panel.test.tsx` (añadir), `frontend/e2e/panel.spec.ts` (añadir)

**Interfaces:**
- Consumes: `MenuAcciones`, `AccionMenu` (A1).
- Produces: `VistaMapa` recibe `pais: boolean` y `onPais: (p: boolean) => void` (ya no tiene estado propio de país) y pierde la prop `onAbrirParametros`.

- [ ] **Step 1: Pruebas.**
  - Reescribir `panel.test.tsx:197-215` y `e2e/panel.spec.ts:4-17` (hoy buscan «Parámetros del modelo» en la barra del mapa móvil): abren el menú «Más acciones» y eligen el elemento «Parámetros del modelo».
  - vitest con `matchMedia` móvil simulado (como las pruebas existentes de `HojaInferior` en `panel.test.tsx`): en `vista=comparar` existe el botón «Más acciones» y su elemento «Parámetros del modelo» abre el diálogo `HojaInferior`; al cerrarlo (Escape) el foco vuelve al botón del menú (Review Focus 5).
  - vitest: en `vista=mapa` móvil el menú contiene «Ver todo Ecuador» y al elegirlo el texto pasa a «Ver el escenario»; la barra del mapa ya no muestra esos dos botones.
  - vitest de escritorio (sin `matchMedia` móvil): no hay botón «Más acciones» y los dos botones siguen en la barra.
  - e2e a 390×844 con `VITE_MAPA_REMOTO=0`: en `/observatorio` el `boundingBox().y` de `.vista-mapa__mapa` es `< 844`.
- [ ] **Step 2:** las pruebas fallan.
- [ ] **Step 3: Implementar.** `const [pais, setPais] = useState(false)` en `Observatorio`; el menú se pinta solo si `movil`, a la derecha de la fila de `Pestanas` de vistas (envolver ambos en `div.observatorio__vistas` con `display:flex; justify-content:space-between; align-items:center`). Acciones: `parametros` (si `puedeSimular`, `alElegir: () => setHoja(true)`, en cualquier vista) y `pais` (solo `vista === 'mapa'`). En móvil `VistaMapa` no pinta `vista-mapa__acciones`; se quita `onAbrirParametros` de `VistaMapa` y de `Observatorio.tsx:238`. Para cumplir la meta, en móvil reducir el hueco vertical de la cabecera (`.cabecera` gap a `--space-2`) y del `hallazgo` si hace falta; medir con el e2e. Claves nuevas: `obs.estructura.mas_acciones` («Más acciones»).
- [ ] **Step 4:** pruebas en verde; medir también si `.cinta` empieza antes de 844 y anotar el valor en el mensaje del commit.
- [ ] **Step 5: Commit** `feat(frontend): parámetros y vista país en el menú del Observatorio móvil`

### Task A3: placa plegable del mapa en móvil y altura en escritorio

**Files:**
- Modify: `frontend/src/pantallas/observatorio/VistaMapa.tsx:166-172`, `frontend/src/mapa/ControlesMapa.tsx`, `observatorio.css:7,15,52-70`, catálogos `observatorio`
- Test: `frontend/src/pantallas/observatorio/observatorio.test.tsx` (añadir)

- [ ] **Step 1: Pruebas.** vitest móvil: dentro de `.vista-mapa__arriba` hay una sola placa (`.vista-mapa__placa`) con un botón `aria-expanded="false"` cuyo texto incluye el rótulo y «Capa · 85 %»; no se ven las pestañas de base ni el deslizador; al pulsar, `aria-expanded="true"` y aparece el deslizador «Opacidad». vitest escritorio: rótulo y `ControlesMapa` siguen separados como hoy.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar.** Crear la clase `.vista-mapa__placa` (mismo fondo, radio, relleno y tipografía que `.vista-mapa__capa`, ancho 100 % en móvil) que envuelve el botón y, desplegada, `ControlesMapa`. Estado `placaAbierta` (inicial `false`) solo en móvil; el botón reutiliza `.vista-mapa__plegar`. Clave nueva `obs.mapa.resumen_capa` = `«{rotulo} · Capa · {pct} %»` (en: «{rotulo} · Layer · {pct} %»). CSS escritorio: `.observatorio { align-items: start; }` y quitar **solo** `flex: 1` de `.vista-mapa__mapa` (borrar el comentario «El mapa absorbe…»); se quedan `min-height: var(--h-mapa)` y `max-height: var(--h-mapa-max)`, sin fijar `height`, y la regla móvil `min-height: var(--h-mapa-movil)` no se toca.
- [ ] **Step 4:** verde. `bash scripts/revision_visual.sh /observatorio obs-placa` → sin `ragged-row` a 1440 (si aparece, dejar el WARN y defenderlo en `INFORME.md`).
- [ ] **Step 5: Commit** `fix(frontend): placa única del mapa en móvil y columnas sin hueco en escritorio`

### Task A4: Relieve con etiquetas encima de los datos

**Files:**
- Modify: `frontend/src/mapa/estilo.ts:34-37`, `docs/diseno.md §8`, `CREDITOS.md`
- Test: `frontend/src/mapa/mapa.test.ts` (o el archivo de pruebas de `estilo.ts` que exista; buscar `capasVisibles`)

- [ ] **Step 1: Verificar la URL (una sola petición permitida, no son datos de NISAR).**
  `curl -s -o "$SCRATCHPAD/tesela.jpg" -w "%{http_code} %{content_type}\n" https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/6/32/18`
  y `curl -s "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer?f=json" | python -c "import json,sys;d=json.load(sys.stdin);print(d['tileInfo']['lods'][-1]['level'], d.get('copyrightText'))"`.
  (`$SCRATCHPAD` = el directorio temporal de la sesión, nunca `/tmp`.) Si el primero no da `200 image/…` → plan B (Step 3b).
- [ ] **Step 2: Prueba.** `capasVisibles('relieve')` es `['base-relieve', 'etiquetas-lugares']`. Es la única que prueba el cambio: el orden base → datos → etiquetas ya se cumple en `construirEstilo` y no necesita prueba nueva.
- [ ] **Step 3a:** `relieve`: `base.url = ${ESRI}/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}`, `maxzoom` = el nivel leído en Step 1, `etiquetas: 'lugares'`, `atribucion` = `copyrightText` leído + `' · Labels: ' + ATRIB_ESRI`.
- [ ] **Step 3b (plan B):** dejar `World_Topo_Map` y poner `etiquetas: 'lugares'`.
- [ ] **Step 4:** verde. Actualizar `docs/diseno.md §8` (frase de Relieve) y `CREDITOS.md` con el servicio usado. Anotar en `INFORME.md` qué plan se aplicó.
- [ ] **Step 5: Commit** `fix(mapa): en Relieve las etiquetas van encima de los datos`

### Task A5: Simulador en móvil (pestañas, orden, KPIs)

**Files:**
- Modify: `frontend/src/diseno/componentes.css:215` (`.pestanas__pestana { flex: none; }`) y `:126-138` (KPI), `frontend/src/pantallas/simulador/Simulador.tsx:101-152`, `frontend/src/diseno/FranjaKpi.tsx` (solo si hace falta una clase)
- Test: `frontend/e2e/simulador.spec.ts` (añadir), `frontend/src/pantallas/simulador/tablero.test.tsx` o un test nuevo `simulador-movil.test.tsx`

- [ ] **Step 1: Pruebas.**
  - e2e a 390×844: en `/simulador?lat=-4.05&lon=-79.25&dem=0&ext=60&i=64&j=64` (esperar el evento), los rectángulos de las pestañas de `role=tablist` «Herramienta» no se intersecan entre sí (comparar `boundingBox` de cada `role=tab` consecutivo: `x + width <= siguiente.x`), y `document.documentElement.scrollWidth === clientWidth`.
  - vitest móvil: en el DOM la tarjeta con título «Mundo» aparece antes que la de «Tablero» (`compareDocumentPosition`); en escritorio, después.
  - vitest de `FranjaKpi` con 5 elementos a móvil: el quinto tiene la clase `franja-kpi__item--ancho` (o comprobar la regla CSS `:last-child:nth-child(odd)` con una prueba de `componentes.test.ts` que lea el CSS, como ya hacen otras).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar.** `flex: none` en `.pestanas__pestana`. En `Simulador`, con `const movil = useMovil()`, si `movil` la tarjeta «Mundo» se pinta dentro de `simulador__principal` antes del tablero y `simulador__lado` solo con los parámetros. CSS móvil: `.franja-kpi__item:last-child:nth-child(odd) { grid-column: 1 / -1; border-right: 0; }` y `.franja-kpi__unidad { white-space: nowrap; }`.
- [ ] **Step 4:** verde. `bash scripts/revision_visual.sh "/simulador?lat=-4.05&lon=-79.25&dem=0&ext=60&i=64&j=64" sim-movil` y revisar las pestañas de las seis rutas en las capturas de la Tarea A6.
- [ ] **Step 5: Commit** `fix(frontend): pestañas sin solape, Mundo primero y KPIs enteros en el simulador móvil`

### Task A6: cierre del bloque A

- [ ] **Step 1:** `bash scripts/revision_visual.sh <ruta> bloque-a-<nombre>` (compila su propia copia) para `/`, `/observatorio`, `/observatorio?vista=comparar`, `/simulador`, `/laboratorio`, `/recorrido`, `/fundamentos`. Corregir FAIL (máx. 3 rondas).
- [ ] **Step 2:** `cd frontend && npx playwright test` → todo en verde (la intermitencia conocida de `flujos.spec.ts` «clic fuera de Ecuador» se repite aislada antes de darla por buena).
- [ ] **Step 3:** `INFORME.md`: quitar de «Pendientes vigentes / Visuales» los cinco puntos resueltos (incluido el margen de 12 px, ya resuelto en `ea3787d`); defender el `ragged-row` del simulador; anotar la distancia de la cinta a 390 px si no quedó a la vista; decisiones A1–A5 en «Decisiones tomadas sin supervisión».
- [ ] **Step 4: Commit** `docs: informe del bloque visual y móvil`

## Bloque B · Funcionales

### Task B1: ruta `serie-seleccion`

**Files:**
- Modify: `api/schemas.py` (añadir `PeticionSerieSeleccion` y `SerieTemporalDto` si no existe un DTO de serie; si existe, reutilizarlo), `api/rutas/capas.py` (ruta nueva tras `medicion`), `docs/contrato-datos.md` (el opcional `serie_seleccion`)
- Test: `tests/api/test_capas.py` (añadir), `tests/api/test_contrato_openapi.py` (si fija rutas)

**Interfaces:**
- Produces: `GET /api/escenarios/{id}/serie-seleccion?punto=x,y&cuadrante=x0,y0,x1,y1` → `SerieTemporalDto | None` (mismo esquema que los elementos de `ResultadoCambioDto.series`).

- [ ] **Step 1: Pruebas (fixture `cliente_demo`).**
  - `test_serie_seleccion_punto`: `GET /api/escenarios/ec_la_segua/serie-seleccion?punto=0.5,0.5` → 200; `len({p[2] for p in puntos}) == 1`; hay ≥ 20 puntos; `origen.tipo == "sintetico"`.
  - `test_serie_seleccion_punto_y_cuadrante`: `punto=0.5,0.5&cuadrante=0.2,0.2,0.6,0.6` → dos nombres distintos en `puntos[*][2]`.
  - `test_serie_seleccion_valida`: `punto=1.2,0.5` → 422; `cuadrante=0.3,0.3,0.3,0.6` → 422; sin parámetros → 422; `punto=a,b` → 422.
  - `test_serie_seleccion_mar_vacia`: `GET /api/escenarios/ec_pedernales/serie-seleccion?cuadrante=0,0,0.1,0.1` → 200 con `puntos == []` (mar al oeste).
  - `test_serie_seleccion_sin_capacidad`: con el proveedor ficticio de `conftest.py` sin `serie_seleccion` → el mismo código que da hoy `CapacidadNoDisponible` en otra ruta (mirar `test_simulacion.py`).
- [ ] **Step 2:** `python -m pytest tests/api/test_capas.py -q -k serie_seleccion` → FAIL.
- [ ] **Step 3: Implementar.** Parámetros de consulta como texto (`punto: str | None = None`, `cuadrante: str | None = None`), parseados a floats y validados por `PeticionSerieSeleccion` (0–1; al menos uno; error con las claves de error existentes de `PeticionMedicion` o `api.error.*` nuevas registradas en `datos/claves.py`). Malla: `esc = prov.escenario(id)`; `pol = esc.polarizaciones[0] if esc.polarizaciones else None`; `ny, nx = prov.capa(id, esc.adquisiciones[0].id, esc.variables[0], pol).datos.shape`; pasar a píxeles con `_indice` e `_intervalo` (cuadrante como `(f0, f1, c0, c1)`, igual que `medicion`). Llamar `prov.serie_seleccion(id, cuadrante=..., punto=...)`; sin el método → `CapacidadNoDisponible`.
- [ ] **Step 4:** verde; `python scripts/exportar_openapi.py && cd frontend && npm run tipos`.
- [ ] **Step 5: Commit** `feat(api): serie temporal del punto o cuadrante`

### Task B2: la selección en la vista Serie

**Files:**
- Modify: `frontend/src/api/consultas.ts` (hook), `frontend/src/pantallas/observatorio/VistaSerie.tsx`, `Observatorio.tsx:252`, `Mediciones.tsx:99-103`, catálogos `observatorio` (cambiar `obs.medicion.serie_*`)
- Test: `frontend/src/pantallas/observatorio/serie.test.tsx` (añadir), `frontend/e2e/flujos.spec.ts` (añadir)

**Interfaces:**
- Consumes: ruta de B1.
- Produces: `useSerieSeleccion(id: string | undefined, sel: { punto?: Punto; cuadrante?: Cuadrante } | undefined)` con `queryKey: ['serie-seleccion', id, sel]`, `enabled: !!id && !!sel && (!!sel.punto || !!sel.cuadrante)`; `Punto`/`Cuadrante` son los tipos de `medicion.ts`. `VistaSerie` gana `punto?: Punto | null; cuadrante?: Cuadrante | null`.

- [ ] **Step 1: Pruebas.**
  - vitest con fixture de serie: con `punto` → aparece primero un bloque titulado «En la selección» con la gráfica, la tabla y el botón CSV, y el aviso «La serie usa la polarización del observable del tipo, no la del selector.»; debajo, las series del escenario.
  - vitest con respuesta `{ ..., puntos: [] }` → `Vacio` con título «Sin dato en la selección».
  - vitest sin `punto` ni `cuadrante` → no se llama a la API de selección (espía de `llamar`).
  - vitest `Mediciones` con punto: enlace «Ver su evolución en Serie» que llama a `onVerSerie`.
  - e2e: `/observatorio?escenario=ec_la_segua&vista=comparar`, clic en la imagen de comparación, enlace «Ver su evolución en Serie» → la URL tiene `vista=serie` y `p=`; se ve «En la selección».
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar.** `BloqueSerie` se reutiliza con un `titulo` opcional; el CSV del bloque de selección se llama `serie_<escenario>_seleccion.csv`. `Mediciones` recibe `onVerSerie?: () => void` y `Observatorio` lo pasa como `() => cambiar({ vista: 'serie' })`. Claves nuevas (es/en/qu): `obs.serie.seleccion_titulo`, `obs.serie.seleccion_aviso_pol`, `obs.serie.seleccion_vacia_titulo`, `obs.serie.seleccion_vacia_texto` («El punto o el cuadrante cae en agua o en una zona sin dato del radar.»), `obs.medicion.ver_serie`.
- [ ] **Step 4:** verde.
- [ ] **Step 5: Commit** `feat(frontend): evolución del punto o cuadrante en la vista Serie`

### Task B3: `instante_evento` y `fecha_evento` simulable

**Files:**
- Modify: `datos/contrato.py:96-108` (`instante_evento: AwareDatetime | None = None`), `datos/proveedores/demo.py:36,218-279,313-355`, `datos/claves.py` (errores nuevos), `api/rutas/simulacion.py` solo si valida tipos de parámetros, `docs/contrato-datos.md`
- Test: `tests/datos/test_proveedor_demo.py`, `tests/api/test_simulacion.py`

**Interfaces:**
- Produces: `Escenario.instante_evento` (ISO con zona en el JSON); parámetro genérico `fecha_evento: str` (`AAAA-MM-DD`).

- [ ] **Step 1: Pruebas.**
  - `test_instante_evento_en_utc`: `ProveedorDemostracion().escenario("ec_loja").instante_evento` tiene `tzinfo` UTC, fecha = la de `data/nisar_sample.csv` para `ec_loja` y hora 15:30.
  - `test_fecha_evento_desplaza_pasadas`: `simular("ec_la_segua", {"fecha_evento": "2026-06-01"})` → id distinto de `ec_la_segua`; `instante_evento.date() == date(2026, 6, 1)`; cada adquisición está desplazada 31 días respecto de la base (la base es 2026-05-01).
  - `test_fecha_evento_igual_al_catalogo_es_la_base`: `simular("ec_la_segua", {"fecha_evento": "2026-05-01"}).id == "ec_la_segua"`.
  - `test_fecha_evento_invalida`: `"2026-13-01"`, `"01/05/2026"`, `"2023-12-31"`, `"2031-01-01"`, `20260501` → `EntradaNoValida` (422 por la API).
  - `test_ids_existentes_no_cambian` (Review Focus 2): el id de `simular("ec_la_segua", {"lat": -0.7, "lon": -80.2})` es igual antes y después del cambio (fijar el valor actual como literal en la prueba antes de implementar).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar.** `GENERICOS` gana `"fecha_evento"`. En `_validar`: si viene, debe ser `str`, `date.fromisoformat`, entre `date(2024,1,1)` y `date(2030,12,31)`; devolver `v["fecha"]: date | None`. En `_contexto_sin_cerrojo`: si `v["fecha"]` es igual a la fecha del catálogo de `base`, tratarla como `None`; si no es `None`, añadir `canon["fecha"] = v["fecha"].isoformat()` (solo entonces, para no cambiar las huellas existentes). El sitio: `sitio_en_mapa(...)` si hay punto, si no la fila del catálogo (`nisar.cargar_sitios()`, `to_dict()`); en ambos casos `sitio["fecha_evento"] = v["fecha"].isoformat()` cuando hay fecha. La fecha «del catálogo» con la que se compara es `sitio["fecha_evento"]` del sitio que se va a usar (con punto del mapa, el de `sitio_en_mapa`), no la de `base`; hay que construir el sitio antes de decidir la huella. Rellenar `instante_evento=escena.instante_evento().replace(tzinfo=timezone.utc)`. Errores: `api.error.fecha_evento_formato`, `api.error.fecha_evento_rango` («La fecha del evento debe estar entre 2024-01-01 y 2030-12-31.»).
- [ ] **Step 4:** verde; `python scripts/exportar_claves_api.py`; tipos regenerados.
- [ ] **Step 5: Commit** `feat(datos): fecha del evento en el escenario y simulable en la demostración`

### Task B4: fecha en el panel, marca, cursor y acotado de `t`

**Files:**
- Modify: `frontend/src/pantallas/observatorio/parametros.ts:15-60`, `PanelSimulacion.tsx:152-158`, `frontend/src/graficos/Linea.tsx`, `frontend/src/graficos/graficos.css`, `VistaSerie.tsx`, `BloqueTiempo.tsx` (pasar `evento`), `useTiempoObservatorio.ts`, `Observatorio.tsx` (pasar `ms` a `VistaSerie`), catálogos `observatorio`, `piezas`
- Test: `frontend/src/pantallas/observatorio/panel.test.tsx`, `frontend/src/graficos/linea.test.tsx` (o el existente de `Linea`), `serie.test.tsx`, `tiempoCorto.test.tsx` o uno nuevo para el acotado

**Interfaces:**
- Consumes: `Escenario.instante_evento` (B3, regenerado en `tipos.ts`).
- Produces: `Linea` prop `cursor?: string` (ISO); `VistaSerie` prop `ms?: number`.

- [ ] **Step 1: Pruebas.**
  - `normalizar({ fecha_evento: '2026-06-01' }, [])` conserva la fecha; `'2023-12-31'`, `'2026-02-30'` y `20260601` se descartan.
  - Panel: el campo «Fecha del evento» es `input[type=date]` habilitado con `min="2024-01-01"` y `max="2030-12-31"`; cambiarlo llama a `sim.cambiar('fecha_evento', '2026-06-01')`.
  - `Linea` con `cursor` dentro del rango dibuja un `line.grafico__cursor`; fuera del rango, no; el cursor no aparece en la lista del resumen accesible de marcas.
  - `VistaSerie` con `esc.instante_evento` → el resumen accesible del gráfico nombra la marca «Evento».
  - Acotado (Review Focus 3), **prueba de regresión**: con `tUrl` anterior a la primera pasada, `useTiempoObservatorio` deja `ms` en la primera pasada; posterior a la última, en la última. `useInstante.ts:23` ya acota y `parejaValida` ya rehace antes/después: esta prueba pasa desde el principio y no lleva implementación nueva.
- [ ] **Step 2:** las demás fallan (la de acotado pasa).
- [ ] **Step 3: Implementar.** `GENERICOS.fecha_evento = { min: '2024-01-01', max: '2030-12-31' }` y su `valido`; nunca es «por defecto» en el frontend (el servidor decide). Campo con `Campo` (`type="date"`, valor `sim.valores.fecha_evento ?? esc.instante_evento?.slice(0, 10) ?? ''`); si `Campo` no acepta `type`, añadir la prop pasándola al `<input>`. Quitar la clave `obs.parametros.fecha_fija` y ajustar `fecha_ayuda` («Cambia la fecha y todas las pasadas se mueven con ella. Datos de demostración.»). `.grafico__cursor { stroke: var(--accent); stroke-width: 1px; }`. Clave `obs.serie.marca_evento` = «Evento».
- [ ] **Step 4:** verde; `bash scripts/revision_visual.sh "/observatorio?vista=serie" serie-evento`.
- [ ] **Step 5: Commit** `feat(frontend): fecha del evento editable, marca del evento y cursor del instante`

### Task B5: `observable` del tipo de cambio

**Files:**
- Modify: `datos/contrato.py:258-262`, `datos/proveedores/demo.py:376-400`, `datos/catalogo_claves.py:_tipos`, `Observatorio.tsx` (cabecera), `frontend/src/diseno/CabeceraPantalla.tsx` (prop `detalle?: ReactNode`, debajo del hallazgo), `frontend/src/idioma/clavesApi.ts:17` (`'observable'` en el campo de `tipo`), catálogos `api` y `observatorio`
- Test: `tests/api/test_escenarios.py` (o donde se pruebe `/api/tipos`), `frontend/src/pantallas/observatorio/observatorio.test.tsx`

- [ ] **Step 1: Pruebas.**
  - `GET /api/tipos` → los seis tienen `observable` no vacío; `humedales` es `"σ⁰ HH y HV (dB)"` (valor de `nisar.TIPOS`); ningún tipo tiene la clave `producto` ni los textos `GCOV`, `GUNW`, `GOFF` en el JSON completo.
  - vitest: la cabecera del Observatorio muestra «Qué observa el radar en esta demostración: σ⁰ HH y HV (dB)» en es y la versión en en con la clave `api.tipo.humedales.observable`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar.** `observable: str | None = None` en `TipoCambio`; el demo pasa `observable=t.observable`; `_tipos` registra `api.tipo.<id>.observable`. Clave `obs.estructura.observable` = «Qué observa el radar en esta demostración: {observable}» (el valor de `nisar.TIPOS` no está verificado con documentación oficial: regla 6). No existe una definición de σ⁰: crear `obs.estructura.sigma0_termino` = «σ⁰» y `obs.estructura.sigma0_explicacion` = «Retrodispersión: fracción de la señal del radar que vuelve al satélite.» (es/en/qu) y usarlas con `Termino` alrededor de «σ⁰».
- [ ] **Step 4:** verde; claves y tipos regenerados.
- [ ] **Step 5: Commit** `feat: el observable del tipo de cambio en la cabecera del Observatorio`

### Task B6: provincia bajo el puntero y marcadores del catálogo

**Files:**
- Modify: `frontend/src/mapa/MapaBase.tsx:12,29,61-66,122-131,135-140`, `frontend/src/mapa/mapa.css`, `VistaMapa.tsx:120`, catálogos `piezas`
- Test: `frontend/src/mapa/mapa.test.tsx` (o el existente), `frontend/src/pantallas/observatorio/observatorio.test.tsx`, `frontend/e2e/flujos.spec.ts`

**Interfaces:**
- Produces: `Marcador = { lat: number; lon: number; etiqueta?: string; actual?: boolean; onClic?: () => void }`; `MapaBase` prop `conProvincia?: boolean`.

- [ ] **Step 1: Pruebas.**
  - vitest de `VistaMapa` en vista país: se pasan a `MapaBase` tantos marcadores como escenarios de `useEscenarios()`, uno con `actual: true` (el del escenario abierto) y cada uno con `etiqueta` traducida.
  - vitest de la función pura `provinciaEn(features)` (nueva, en `frontend/src/mapa/provincia.ts`): de `[{ properties: { nombre: 'Manabí', region: 'Costa' } }]` devuelve `{ nombre: 'Manabí', region: 'Costa' }`; de `[]`, `null`.
  - e2e (Review Focus 1) con `VITE_MAPA_REMOTO=0`: en `/observatorio`, «Ver todo Ecuador», clic en el marcador con nombre accesible del escenario `ec_loja` → la URL pasa a `escenario=ec_loja` (sin `~`) y no aparece «Calculando la escena».
  - e2e: mover el ratón sobre el centro del mapa del escenario `ec_la_segua` → se ve una placa con «Manabí».
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementar.** Marcadores con `onClic` se crean como `<button type="button" class="mapa__marcador">` con `aria-label` y `title`; `--actual` más grande con borde `--text`. En `m.on('click')`, salir si `(e.originalEvent.target as HTMLElement | null)?.closest('.mapa__marcador')`. Con `conProvincia`, `mousemove` y `click` consultan `m.queryRenderedFeatures(e.point, { layers: ['provincias'] })` y guardan `provinciaEn(...)`; placa `.mapa__provincia` abajo a la izquierda sobre la atribución, `--surface` al 85 %, `--fs-12`, sin `aria-live`. Región con claves `piezas.mapa.region.costa|sierra|amazonia|galapagos`. Si la consulta no devuelve nada en modo remoto, añadir en `estilo.ts` una capa `provincias-hit` (`fill-opacity: 0`) al final y consultarla.
- [ ] **Step 4:** verde; `bash scripts/revision_visual.sh /observatorio mapa-catalogo`.
- [ ] **Step 5: Commit** `feat(mapa): provincia bajo el puntero y marcadores del catálogo en la vista país`

### Task B7: cierre del bloque B

- [ ] **Step 1:** tipos, `api/claves.json` y `node scripts/traducciones_csv.mjs exportar` al día; suites completas y `npx playwright test` en verde.
- [ ] **Step 2:** `bash scripts/construir_pages.sh` y `cd frontend && npx playwright test -c playwright.pages.config.ts` → 11 passed o más.
- [ ] **Step 3:** `INFORME.md`: quitar de «Funcionales» la serie del punto, la fecha del evento, el tooltip y marcadores y el observable; decisiones B1–B3; en «Pendientes visuales por pantalla» actualizar las filas Observatorio · serie y · comparar.
- [ ] **Step 4: Commit** `docs: informe del bloque funcional`

## Bloque C · Texto que sigue en español

### Task C1: plantillas, `TextoClave` y decimales

**Files:**
- Create: `datos/claves_demo.py` (plantillas del bloque C, `PLANTILLAS: dict[str, str]`), `tests/datos/test_reconocer.py`
- Modify: `datos/claves.py:296-325` (`reconocer`, nueva `buscar_texto`), final de `datos/claves.py` (`REGISTRO.update(PLANTILLAS)` importando `claves_demo` al final para evitar ciclos), `datos/contrato.py` (`TextoClave`), `frontend/src/idioma/useT.ts:39-48`, `frontend/src/idioma/clavesApi.ts:52-67`, `frontend/src/idioma/TextoApi.tsx`
- Test: `frontend/src/idioma/api-claves.test.ts` (añadir)

**Interfaces:**
- Produces (Python): `class TextoClave(BaseModel): clave_texto: str; valores_texto: dict[str, float | str] = {}; decimales_texto: dict[str, int] = {}`;
  `reconocer(plantilla: str, texto_es: str) -> dict[str, float | str] | None` (antes `dict[str, float]`; revisar sus usos);
  `reconocer_con_decimales(plantilla: str, texto_es: str) -> tuple[dict[str, float | str], dict[str, int]] | None`;
  `buscar_texto(prefijo: str, texto_es: str) -> TextoClave | None` (primero coincidencia literal entre las claves de
  `REGISTRO` que empiezan por `prefijo`, luego plantillas; si varias encajan, la de más texto literal).
- Produces (TS): `textoApi(texto, clave?, valores?, decimales?: Record<string, number> | null)`; `valoresApi(valores, formato, fecha?, decimales?)`; `TextoApi` prop `decimales`; helper `textoClave(texto: string, tc: TextoClave | null | undefined)` en `clavesApi.ts` que devuelve `{ clave, valores, decimales }`.
- Marcadores de plantilla: `{x}` número con coma decimal (como hoy); un nombre que empieza por `fecha` casa `dd/mm/aaaa` y su valor es la fecha ISO `aaaa-mm-dd`; un nombre que termina en `_punto` casa `[−+-]?\d+\.\d+` (punto decimal, con signo).

- [ ] **Step 1: Pruebas Python.**
  - `reconocer_con_decimales("Lluvia de {mm} mm en {km} km", "Lluvia de 150,0 mm en 15 km") == ({"mm": 150.0, "km": 15.0}, {"mm": 1, "km": 0})`.
  - `reconocer("Media · Velocidad · {fecha}", "Media · Velocidad · 27/12/2026") == {"fecha": "2026-12-27"}`.
  - `reconocer("Levantamiento de {le_punto} m", "Levantamiento de +0.42 m") == {"le_punto": 0.42}`. En las plantillas reales el «+» se conserva en el literal (`… de +{le_punto} m` si el modelo siempre escribe signo) para que el texto traducido lo muestre.
  - `buscar_texto("api.prueba.", "texto que no encaja")` es `None` (Review Focus 4); con una plantilla registrada en la prueba (monkeypatch de `REGISTRO`) devuelve su `TextoClave`.
- [ ] **Step 2: Pruebas TS.** `valoresApi({ mm: 150 }, f, undefined, { mm: 1 })` → `{ mm: '150.0' }` en en; `decimales` gana a `DECIMALES`; `textoApi` con clave desconocida devuelve el español y `traducido: false`.
- [ ] **Step 3:** FAIL → implementar → verde.
- [ ] **Step 4: Commit** `feat(idioma): plantillas reconocidas con decimales y fechas para el texto del modelo`

### Task C2: notas y celdas del simulador

**Files:**
- Modify: `datos/claves_demo.py` (plantillas `api.sim.nota.*`, celdas `api.sim.celda.*` desde `modelo.desastres.COBERTURAS` y las listas fijas citadas en el spec §5), `datos/simulador.py:318-368` (emitir `notas_texto` y `tabla.celdas_texto`), `api/schemas_simulador.py:107-130`, `frontend/src/pantallas/simulador/ResultadosEvento.tsx:74` y la tabla del evento, catálogos `api` es/en/qu
- Test: `tests/datos/test_simulador.py` (añadir), `frontend/src/pantallas/simulador/resultados.test.tsx`

**Interfaces:**
- Consumes: `TextoClave`, `buscar_texto` (C1).
- Produces: `EventoDto.notas_texto: list[TextoClave | None] | None = None` (misma longitud que `notas`); `TablaEventoDto.celdas_texto: list[list[TextoClave | None]] | None = None`.

- [ ] **Step 1: Prueba de cobertura.** `test_notas_y_celdas_del_simulador_tienen_clave`: para cada herramienta de `simulador.catalogo()["herramientas"]` que sea evento (`desastres.DESASTRES`), con el mundo de `tests/datos/test_simulador.py` y la celda central, `all(nt is not None for nt in dto["notas_texto"])` y toda celda de texto de la tabla tiene su `TextoClave`. Las cifras de la nota de lluvia se recuperan con sus decimales.
- [ ] **Step 2:** FAIL → escribir las plantillas copiando literalmente el texto de `modelo/desastres.py` con `{x}` en cada cifra. Para encontrarlas: `grep -n "notas\b\|notas.append\|notas = \[\|nota = \|tabla = pd.DataFrame\|\"Percepción\"\|\"Peligro\"" modelo/desastres.py` (unas 18 notas, 8 con cifras: paso del autómata, residentes, lluvia y radio, caudal y volumen, marejada, levantamiento del tsunami, hipocentro, cráter y tefra; celdas: 8 coberturas de `COBERTURAS`, 7 percepciones, 4 peligros, 4 modelos de erupción). Una clave por variante (tipo de suelo CN: 3; mecanismo del sismo: 4). Ejecutar la prueba de cobertura para descubrir las que falten. Ojo: la nota de la espera del radar la reescribe `datos/simulador.py` («en una pasada posterior (ver «Espera hasta la primera imagen»)»); su plantilla copia el texto **ya reescrito**, no el de `modelo/`. La nota «0.25 m/s» conserva el literal. Traducción en (Sonnet) y qu (borrador, ver Task C5).
- [ ] **Step 3:** vitest: `ResultadosEvento` en en muestra la nota de lluvia traducida con «150.0 mm»; sin `notas_texto`, el español con `lang="es"`.
- [ ] **Step 4:** verde; claves y tipos regenerados.
- [ ] **Step 5: Commit** `feat(idioma): notas y tablas del simulador con clave`

### Task C3: textos del Observatorio (tablas, medición, series, nota de Pedernales)

**Files:**
- Modify: `api/rutas/capas.py` (las rutas `cambio` y `medicion` construyen los DTO campo por campo: pasar los campos nuevos), `datos/claves_demo.py`, `datos/contrato.py` (`TablaResultado.titulo_texto`/`columnas_texto`/`celdas_texto`, `SerieTemporal.nombres_texto: dict[str, TextoClave] | None = None`, `Medicion.textos: list[dict[str, TextoClave | None]] | None = None`, `ResultadoCambio.notas_texto`), `datos/proveedores/demo.py:182,455-470,480-510`, `api/schemas.py`, `frontend/src/pantallas/observatorio/TablaResultados.tsx:31`, `Mediciones.tsx`, `medicion.ts:50-56`, `VistaSerie.tsx:97`, `frontend/src/diseno/NotasModelo.tsx`, catálogos
- Test: `tests/datos/test_proveedor_demo.py`, `tests/api/test_claves_api.py`, `frontend/src/pantallas/observatorio/observatorio-idioma.test.tsx`

- [ ] **Step 1: Pruebas.**
  - Cobertura: para los seis escenarios con su intervalo por defecto, el título, toda columna y toda celda de texto de `tablas`, todo nombre de `series[*].puntos[*][2]`, todo nombre de `serie_seleccion(id, punto=(80, 80))` (B1) y toda etiqueta/medida/capa de la tabla de `medir(..., punto=(80, 80))` tienen `TextoClave`.
  - A nivel API (`tests/api/test_capas.py`): `POST /api/escenarios/ec_la_segua/cambio` trae `tablas[*].titulo_texto` y `notas_texto`; `POST …/medicion` trae `textos`.
  - El escenario de glaciar: la métrica «Media · Velocidad · dd/mm/aaaa» trae `clave_texto` y `valores_texto["fecha"]` en ISO.
  - `TablaResultados` en `es`: una columna sin clave lleva `lang="es"`.
  - vitest en `en`: la tabla de parcelas no contiene «Resultados por parcela» ni nombres de cultivo en español (usar `textosSinTraducir` de `idioma/pruebas.tsx`).
- [ ] **Step 2:** FAIL → plantillas (rotaciones y cultivos leídos de `modelo.nisar` en modo lectura, nombres de serie fijos, «A {km} km del frente inicial», capas con `{fecha}`, nota 1 de Pedernales con `{le_punto}`) y campos paralelos → verde.
- [ ] **Step 3: Commit** `feat(idioma): tablas, medición, series y notas del Observatorio con clave`

### Task C4: exportaciones, bitácora e informe PNG

**Files:**
- Modify: `frontend/src/pantallas/simulador/bitacora.ts`, `Bitacora.tsx:19-32`, `informe.ts:11-13`, `frontend/src/pantallas/observatorio/medicion.ts:50-56` (CSV), `datos/claves.py` o `catalogo_claves.py` (`api.contexto.region.<slug>` para Costa, Sierra, Amazonía, Galápagos), `frontend/src/idioma/clavesApi.ts` (campo `region` en `contexto`)
- Test: `frontend/src/pantallas/simulador/simulador-idioma.test.tsx`, `frontend/e2e/exportar.spec.ts` (si ya prueba el CSV)

**Interfaces:**
- Produces: `reconocerTitulo(tituloEs: string): { clave: string; valores: Record<string, number> } | null` en `frontend/src/pantallas/simulador/bitacora.ts`, que prueba las plantillas `api.sim.titulo.*` del catálogo `es` (cada `{x}` casa un número con coma decimal, salvo `{volcan}` de `api.sim.titulo.erupcion_volcan`, que es texto y casa `[^·]+?`).

- [ ] **Step 1: Pruebas.**
  - `reconocerTitulo('Tormenta extrema')` → `{ clave: 'api.sim.titulo.tormenta', valores: {} }`; un título inventado → `null`.
  - En `en`: `lineasInforme(...)` y `csvBitacora(...)` de una entrada con región «Costa» y temporada «Lluviosa» no contienen «Costa»→ sí «Coast» (o el valor del catálogo en), ni «Lluviosa», ni coma decimal.
  - Entrada antigua sin `titulo_clave` y título no reconocible → `Bitacora` la pinta con `lang="es"`.
- [ ] **Step 2:** FAIL → pasar `crearContexto(idioma)` (o `textoApi` y `formatoNumero`) a `lineasInforme`, `filasBitacora`, `csvBitacora` y a las filas del CSV de la medición → verde.
- [ ] **Step 3: Commit** `feat(idioma): bitácora, informe PNG y CSV en el idioma elegido`

### Task C5: kichwa de las claves nuevas y CSV al día — **modelo más capaz (Opus)**

Esta tarea la hace el modelo más capaz, no Sonnet: redactar kichwa unificado (`qu-EC`) siguiendo
`docs/guia-traduccion-kichwa.md` (glosario, decisiones D1–D9 y las dudas C1–C10).

**Files:**
- Modify: `frontend/src/idioma/catalogos/qu/*.ts` (solo claves añadidas en A–C), `docs/guia-traduccion-kichwa.md` (términos nuevos a revisar), `docs/traduccion-kichwa.csv`
- Test: `frontend/src/idioma/traducciones-csv.test.ts` (añadir)

- [ ] **Step 1: Prueba.** Ampliar `traducciones-csv.test.ts` (ya exporta a un temporal), sin duplicarla: añadir el caso `el CSV del repositorio está al día`, que compara ese temporal byte a byte con `docs/traduccion-kichwa.csv`.
- [ ] **Step 2:** redactar o revisar el kichwa de todas las claves nuevas (los textos que Sonnet dejó en `qu` como copia provisional del inglés o del español se sustituyen); ninguna entra en `VALIDADAS_QU`; añadir a la guía los términos nuevos dudosos.
- [ ] **Step 3:** `node scripts/traducciones_csv.mjs exportar`; suites del frontend en verde.
- [ ] **Step 4: Commit** `docs(idioma): borrador kichwa de las claves nuevas y CSV de revisión al día`

### Task C6: cierre del bloque C y de la rama

- [ ] **Step 1:** `bash scripts/revision_visual.sh <ruta> bloque-c-<nombre> en` y `… qu` para `/observatorio`, `/observatorio?vista=comparar`, `/observatorio?vista=serie` y `/simulador?lat=-4.05&lon=-79.25&dem=0&ext=60&i=64&j=64`; FAIL corregidos (máx. 3 rondas).
- [ ] **Step 2:** suites completas, `npx playwright test`, `bash scripts/construir_pages.sh` y e2e de Pages en verde.
- [ ] **Step 3:** `INFORME.md`: quitar el pendiente «Texto del demo que sigue en español» salvo lo que quede declarado (ayudas de métricas del simulador; textos que no encajen) y listarlo; actualizar las cifras de pruebas; decisiones C en «Decisiones tomadas sin supervisión»; claves kichwa nuevas sin validar en «Estado del kichwa».
- [ ] **Step 4: Commit** `docs: informe del bloque de texto y cierre de los pendientes`
- [ ] **Step 5:** `git push origin migracion-react` **solo** si el usuario lo autorizó para esta rama (sí, en la sesión del 2026-11-08: «Solo a la rama»; autorizado por el usuario el 2026-11-08). Nunca a `main`.
