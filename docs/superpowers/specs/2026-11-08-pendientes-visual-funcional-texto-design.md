# Pendientes visuales, funcionales y de texto — diseño

Fecha: 2026-11-08 · Rama: `migracion-react` · Estado: para revisión independiente (el usuario delegó la
aprobación; ver «Decisiones tomadas sin supervisión»).

## 1. Propósito

Cerrar tres grupos de «Pendientes vigentes» de `INFORME.md` para que la app publicada en Pages se use bien en el
móvil de un juez, cuente el evento en el tiempo y no mezcle idiomas. Cada parte sirve a `docs/challenge.md`:

| Parte | Objetivo del challenge |
|---|---|
| A · Visual / móvil | Público amplio: la herramienta debe poder usarse en un teléfono (mapa y cinta a la vista, parámetros a mano). |
| B · Funcionales | Contar el cambio en el tiempo (antes, evento, después) y explorar «qué pasa en este punto»; orientar en Ecuador (provincias, catálogo). |
| C · Texto | Público amplio en tres idiomas: nada del demo debe quedar en español cuando se elige inglés o kichwa, salvo lo declarado. |

**Reglas que no cambian:** `modelo/` no se toca (la optimización de `aguas_someras` ya está hecha); la API solo
habla con el contrato de `datos/`; nada de lógica científica en el frontend; sin datos ni detalles nuevos de NISAR;
todo dato sintético sigue marcado; tokens de `frontend/src/diseno/tokens.css`; `docs/diseno.md §12` obligatorio.

## 2. Fuera de alcance

- Impacto ampliado (cultivos, glaciares, terremotos, subsidencia) y la fase 2 del simulador (decisión A/B,
  cascadas, retos educativos).
- Ayudas de las métricas del simulador: hoy no se muestran en ninguna parte; quedan declaradas, 0 claves.
- Validar el kichwa: las claves nuevas entran como borrador sin validar (fuera de `VALIDADAS_QU`).
- Reestructurar el simulador para quitar el `ragged-row` de 1440 px (se defiende, A5).
- Precalcular la serie de un punto: los puntos son infinitos; en Pages responde el motor (como `/medicion`).

## 3. Parte A · Visual / móvil

### A1. Menú de acciones del Observatorio (< 700 px)

- Componente nuevo `frontend/src/diseno/MenuAcciones.tsx` y su icono `IconoMasAcciones` (tres puntos verticales) en
  `diseno/iconos.tsx`. Botón terciario de `--h-touch` con `aria-haspopup="menu"` y `aria-expanded`; la lista es un
  `role="menu"` con `role="menuitem"` en `--raised`, borde `--control`, `--radius-card`, `--shadow-float`. Se cierra
  con Escape (el foco vuelve al botón), con un clic fuera y al elegir. Flechas arriba/abajo recorren los elementos.
- Solo en móvil (`useMovil()`), se coloca en la fila de pestañas de vista del Observatorio (a la derecha) y contiene:
  «Parámetros del modelo» (si `capacidades.simulacion`; abre la `HojaInferior` desde **cualquier** vista) y, en la
  vista Mapa, «Ver todo Ecuador» / «Ver el escenario». En móvil esos dos botones salen de la barra del mapa.
- El estado «país» (`pais`) sube de `VistaMapa` a `Observatorio` (prop `pais` + `onPais`), para que el menú lo cambie.
- Los selectores Tipo/Escenario se quedan en la cabecera (acción principal).
- Meta medible a 390×844 (sin red de mapas): el borde superior del mapa (`.vista-mapa__mapa`) queda dentro de la
  primera pantalla (`top < 844`). Si además se logra que la cinta (`.cinta`) empiece antes de 844, mejor; si no, se
  anota en `INFORME.md` la distancia que falta.

### A2. Placas del mapa y altura en escritorio

- Móvil: el rótulo de la capa y `ControlesMapa` se funden en una sola placa plegable (mismo patrón que la leyenda,
  `.vista-mapa__plegar`). Plegada (estado inicial en móvil) muestra el rótulo y «Capa · NN %»; desplegada muestra
  además las pestañas de base y el deslizador. En escritorio no cambia nada.
- Escritorio: `.observatorio { align-items: start; }` y el mapa deja de estirarse para igualar la columna lateral
  (se quita solo `flex: 1` del mapa; se quedan `min-height: --h-mapa` y `max-height: --h-mapa-max`, sin fijar `height`, y la regla móvil no cambia). No cambia el orden de §7.

### A3. Relieve con etiquetas encima de los datos

- `relieve` pasa a base sin etiquetas `World_Terrain_Base` (Esri) + `etiquetas: 'lugares'`
  (`World_Boundaries_and_Places`, ya usada en Satélite), que se dibujan encima de los datos con el ancla actual.
- El implementador verifica la URL con **una** petición de tesela de Quito (z=6) y su `maxzoom` en el JSON del
  servicio. Si no responde 200 con imagen, plan B: se mantiene `World_Topo_Map` con `etiquetas: 'lugares'` encima.
- Se actualizan la atribución de la base, `docs/diseno.md §8` y `CREDITOS.md`.

### A4. Margen de la banda móvil

Ya resuelto (`componentes.css:97`, 16 px medidos). Solo se corrige `INFORME.md`.

### A5. Simulador en móvil

- `.pestanas__pestana { flex: none; }` (global): las pestañas ya no se encogen por debajo de su texto; la fila se
  desplaza dentro de sí. Se revisan las pestañas de las seis rutas en la revisión visual.
- En móvil la tarjeta «Mundo» va **antes** del tablero cambiando el orden en el DOM con `useMovil()` (no con CSS
  `order`), para que el orden de lectura y de foco coincida con el visual.
- `FranjaKpi`: la unidad no parte en varias líneas (`white-space: nowrap` en la unidad) y, a 2 columnas, el último
  elemento de una cantidad impar ocupa la fila entera.
- El `ragged-row` a 1440 con un evento cargado se defiende en `INFORME.md` (la columna lateral es de parámetros; los
  resultados crecen con el evento).

## 4. Parte B · Funcionales

### B1. Serie del punto o cuadrante

- Ruta nueva `GET /api/escenarios/{id}/serie-seleccion?punto=x,y&cuadrante=x0,y0,x1,y1` (coordenadas normalizadas
  0–1 como en `/medicion`; al menos uno de los dos). Devuelve `SerieTemporalDto | null` (`null` si el proveedor
  devuelve `None`). Valida con `PeticionSerieSeleccion` (pydantic). Para pasar a píxeles usa la forma de
  `prov.capa(id, primera_adquisicion, variables[0], pol).datos.shape`. Sin `serie_seleccion` en el proveedor →
  `CapacidadNoDisponible`. El contrato documenta el opcional (`docs/contrato-datos.md`).
- Frontend: hook `useSerieSeleccion`; `VistaSerie` recibe `punto` y `cuadrante` de la URL y, si hay alguno, muestra
  primero un bloque «En la selección» con la misma gráfica, tabla y CSV marcado, y debajo las series del escenario.
  Aviso fijo: la serie usa la polarización del observable del tipo, no la del selector. Serie sin puntos (mar o
  agua enmascarada) → `Vacio` «Sin dato en la selección». `Mediciones` cambia el texto «pendiente» por un enlace
  «Ver su evolución en Serie» que cambia `vista=serie` conservando `p`/`c`.
- Pages: no se precalcula; responde el motor (estado `Cargando` mientras arranca).

### B2. Fecha del evento, marca y cursor

- Contrato: `Escenario.instante_evento: AwareDatetime | None = None`. El demo lo rellena con
  `escena.instante_evento()` en UTC. El proveedor real lo deja en `None`.
- Demo: `fecha_evento` (texto ISO `AAAA-MM-DD`) pasa a ser parámetro genérico simulable, entre 2024-01-01 y
  2030-12-31 (ilustrativo, datos sintéticos). Si coincide con la del catálogo, no cuenta (id base). Solo entra en
  la huella canónica cuando se usa, para no cambiar los ids existentes. Desplaza todas las pasadas.
- Frontend: el campo de fecha del panel de parámetros se activa (`type="date"`, `min`/`max`); `parametros.ts` lo
  valida. `Linea` gana la prop `cursor?: string` (línea vertical de 1 px en `--accent`, fuera de la colisión de
  etiquetas). `VistaSerie` añade la marca `{ tipo: 'evento', etiqueta: 'Evento' }` y el cursor en el instante `t`.
  `BloqueTiempo` pasa `evento` a `CintaPasadas` (que ya lo sabe dibujar). `useTiempoObservatorio` acota `t` al rango
  de las pasadas nuevas (con prueba).

### B3. Orientación en el mapa y observable

- `TipoCambio.observable: str | None = None` en el contrato; el demo lo rellena con `nisar.TIPOS[k].observable`;
  la cabecera del Observatorio lo muestra («Qué observa el radar en esta demostración: σ⁰ HH y HV (dB)»; el valor no está verificado, regla 6) con su clave
  `api.tipo.<id>.observable` y `Termino` para σ⁰ con una definición nueva («Retrodispersión: fracción de la señal del radar que vuelve al satélite.»). `producto` **no** se expone (regla 6): una prueba lo vigila.
- Provincia bajo el puntero: `MapaBase` consulta la capa `provincias` (existe en los dos modos, `estilo.ts`) con
  `queryRenderedFeatures`; con puntero fino al pasar (`mousemove`) y en táctil al tocar (el `click` que ya existe),
  muestra una placa «Provincia · Región» en una esquina del mapa. La región se traduce con claves nuevas
  `piezas.mapa.region.<slug>`; el nombre de la provincia es nombre propio. Si una prueba muestra que la capa no se
  consulta en modo remoto, se añade una capa de relleno transparente `provincias-hit`.
- Marcadores del catálogo en la vista país: uno por escenario del catálogo (centro de su bbox), el actual distinto
  (`mapa__marcador--actual`), cada uno un `<button>` con nombre accesible traducido; un clic lleva a ese escenario.
  El clic de un marcador no debe disparar el clic del mapa (que crearía un escenario derivado): el manejador del
  mapa ignora los clics cuyo objetivo está dentro de `.mapa__marcador`.

## 5. Parte C · Texto que sigue en español

Estrategia única: el texto que escribe `modelo/` se **reconoce** en `datos/` contra plantillas registradas en
`datos/claves.py` (como `api.nota.*` y `_clave_titulo`). Si encaja, la API añade su clave y valores en campos
paralelos opcionales; si no, el texto se queda en español con `lang="es"` (honesto). Nada se reconstruye desde
números que `datos/` no tiene.

- C-a Notas del simulador: `notas_texto: list[TextoClave] | None` en el evento (`TextoClave = {clave_texto,
  valores_texto, decimales_texto}`), con unas 25 plantillas (variantes de CN y mecanismo, una clave por variante).
- C-b Celdas de las tablas del simulador y del Observatorio: `celdas_texto` (misma forma que las filas, `null`
  donde no hay clave). Familias `api.sim.celda.<slug>`, `api.obs.columna.<slug>`, `api.obs.valor.<slug>`.
- C-c Medición: etiquetas con fecha («Media · Velocidad · 27/12/2026») se reconocen con un marcador `{fecha}`
  dd/mm/aaaa → ISO; columnas Capa/Medida/Valor de la tabla con `textos` por fila; Valor con número y unidad.
- C-d Nombres de los puntos de las series (`nombres_texto` en `SerieTemporal`): nombres fijos y «A {km} km del
  frente inicial»; rotaciones de cultivo registradas desde `modelo/` en modo lectura.
- C-e Nota 1 de Pedernales: plantilla con número con punto y signo.
- C-f Regiones (`api.contexto.region.<slug>`), títulos antiguos de la bitácora (reconocimiento en TypeScript contra
  `api.sim.titulo.*`), informe PNG y CSV de la bitácora y de la medición: el frontend usa `textoApi` y
  `valorMetrica` en vez del español crudo.
- `TablaResultados.tsx`: las columnas sin clave llevan `lang="es"` (hoy falta).
- Decimales: `reconocer` devuelve también los decimales de cada cifra; viajan en `decimales_texto` y el frontend
  los respeta (por encima de la tabla fija `DECIMALES`).
- Fechas en valores: viajan en ISO y se escriben con el formateador que ya usa `textoApi`.
- Pruebas nuevas: cobertura (todas las notas y celdas del demo y del simulador, con los seis escenarios y las cinco
  herramientas por defecto, tienen clave), texto que no encaja queda sin clave, `docs/traduccion-kichwa.csv` al día,
  informe y CSV en inglés sin español dentro.

## 6. Pruebas y verificación

- Cada tarea con TDD (pytest, vitest o Playwright según la capa) y las suites de `CLAUDE.md` en verde.
- Cada parte termina con revisión visual a 1440/768/390 (`bash scripts/revision_visual.sh`, máximo tres rondas;
  Taste Skill por el camino de apps) y, si cambió la API, tipos, `api/claves.json` y el CSV kichwa regenerados.
- Al final: `bash scripts/construir_pages.sh` + e2e de Pages (cambian `/api/escenarios` y `/api/tipos`).

## 7. Decisiones tomadas sin supervisión

| # | Decisión | Por qué |
|---|---|---|
| A1 | Menú de tres puntos solo en móvil, con Parámetros y Ver todo Ecuador; selectores fuera del menú | Cambiar de escenario es la acción principal; §10 pide menú para lo secundario |
| A2 | Placa única plegable en móvil; `align-items: start` en escritorio | Libera ~100 px del mapa; no cambia §7 |
| A3 | Relieve = World_Terrain_Base + etiquetas encima; plan B Topo + etiquetas | Las etiquetas no deben quedar bajo el radar |
| A5 | `flex: none` global, orden en el DOM con `useMovil`, `ragged-row` defendido | Corrige el solape; orden de lectura igual al visual |
| B1 | GET con coordenadas normalizadas, `null` sin selección | Clave estable para el transporte; mismo sistema que `/medicion` |
| B2 | `fecha_evento` simulable 2024–2030, fuera de la huella si no se usa | Ilustrativo; no cambia ids existentes ni enlaces |
| B3 | `observable` sí, `producto` no; capa `provincias` existente; clic de marcador aislado | Regla 6; sin capas nuevas si no hacen falta |
| C | Reconocer plantillas en `datos/`, campos paralelos opcionales, decimales explícitos; ayudas del simulador declaradas | No tocar `modelo/`; compatible con lo existente; honesto si no encaja |
| C3 | Fechas de valores con el formateador actual de `textoApi` (largo) | No cambia los textos ya traducidos |
