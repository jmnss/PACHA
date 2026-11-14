# Diseño: embalses y lluvia + incendios (PACHA)

Fecha: 2026-11-14 · Rama: `embalses` · Estado: borrador para aprobación del equipo.

## 1. Intención y por qué

El challenge «Dancing with the SARs» (`docs/challenge.md`) pide una app abierta que haga **accesible a un público
amplio** el cambio de la superficie visto por NISAR. El equipo decidió (2026-11-14) centrar PACHA en dos historias
reales del Ecuador y que la app sea **didáctica, interactiva y multidisciplinaria**:

- **Embalses y lluvia**: dos embalses, **Mazar** (Sierra, río Paute) y **Daule-Peripa** (Costa). Cómo cambia un
  embalse, qué tienen en común y en qué se diferencian, qué pasa si llueve demasiado en distintas épocas o si hay
  sequía, y qué significa para la energía y la seguridad eléctrica.
- **Incendios**: un solo incendio, **Casitagua** (Quito). Superficie quemada, pérdida de biomasa, emisiones y
  calidad del aire, impacto climático.
- Un apartado **«Cómo lo hacemos»**: qué es un SAR, qué es NISAR, qué datos usamos, cómo los procesa el equipo y
  la app, y para qué sirve.

El equipo segmenta el agua (y lo quemado) con su propio método supervisado; **la app solo lee sus resultados, no
recalcula la segmentación**. La app es **mixta**: real donde hay datos con procedencia, demostración donde no, y
cada capa dice de dónde sale (reglas 5–7 de `CLAUDE.md`).

## 2. Objetivos, no objetivos y anti-objetivos

**Objetivos**

1. La portada `/` es la página de lecciones con dos opciones intercambiables: **Embalses y lluvia** (principal) e
   **Incendios**. Cada opción tiene cuatro partes: **Datos**, **Lo que ve el satélite**, **Simular**, **Impactos**.
2. Embalses muestra Mazar y Daule-Peripa por separado y un bloque **Comparación** (en común / diferencias).
3. Simulación de lluvia y sequía **sobre el mapa real** de cada embalse (el agua sube o baja sobre el relieve).
4. Incendios muestra Casitagua con impactos estimados (biomasa, emisiones, aire, clima).
5. Apartado «Cómo lo hacemos» (SAR, NISAR, nuestro método, para qué sirve).
6. Los escenarios de demostración anteriores (Observatorio, Laboratorio, Simulador, Recorrido) se conservan como
   material didáctico de apoyo, en segundo plano en la navegación.
7. Todo funciona igual en local (servidor) y en GitHub Pages (Pyodide), en es, en y qu.

**No objetivos**

- Recalcular o «arreglar» la segmentación del equipo.
- Descargar granulos NISAR (no hay credencial; regla 5). El script de preparación solo lee lo que entrega el equipo.
- Pronóstico operativo de niveles, generación eléctrica o calidad del aire.
- Datos en tiempo real de operación de las centrales.

**Anti-objetivos** (aunque funcione, sería un fracaso)

- Presentar un nivel, una superficie, una cifra de energía o de emisiones simulada o estimada como si fuera medida.
- Nombrar un evento real (apagones, incendio de Casitagua, crecidas) sin fecha y fuente citadas.
- Mostrar una capa real sin procedencia completa.
- Romper GitHub Pages o pasar del presupuesto de derivados (~10 MB nuevos; `dist-pages` hoy pesa 42 MB).
- Que las cifras de las fichas de los embalses (capacidad, potencia, área de cuenca) aparezcan sin fuente o sin la
  marca «ilustrativo».

## 3. Restricciones

- `CLAUDE.md`: reglas de oro 1–7, arquitectura (la API solo habla con `datos/`; nada de ciencia en el frontend),
  dependencias compatibles con Pyodide para `api/`, `datos/`, `modelo/`; `modelo/` no se modifica (salvo errores con
  prueba), así que **la ciencia nueva va en `datos/`**.
- Las dependencias de preparación (`rasterio`, `pyproj`, etc.) van en `requirements-preparacion.txt` y nunca se
  importan desde la app. La app lee solo derivados en formatos que numpy/json leen (`.npz`, `.json`).
- Diseño: `docs/diseno.md`, tokens y rampas, Taste Skill por el camino de apps, revisión visual a 1440/768/390.
- Textos en tres idiomas (kichwa marcado sin validar, como hoy).
- Un commit por tarea; pruebas y build en verde antes de seguir.

## 4. Enfoques considerados

- **A. Todo dentro del contrato actual**: cada sitio es un `Escenario`, las fechas son adquisiciones, la simulación
  va por `simular`. Reutiliza comparador, procedencia, banda de demostración y la suite de conformidad, pero obliga
  a meter en el contrato cosas que no son genéricas (comparar dos embalses, energía, biomasa).
- **B. Módulo aparte**: rutas y modelos propios para la página. Libre para lo específico, pero duplica capas,
  procedencia y banda de demostración, y la conformidad no lo cubre.
- **Elegido por el equipo: híbrido A+B.** Lo que el contrato ya resuelve (capas, cambio entre fechas, medición,
  procedencia, banda) va por el contrato y su suite de conformidad. Lo específico de las lecciones (fichas,
  comparación, simulación de embalse sobre relieve, impactos de energía e incendio) va en un módulo propio
  `datos/lecciones/` con rutas `api/rutas/lecciones.py`, que **consume el contrato** para leer capas y nunca lee
  archivos por su cuenta salvo sus parámetros estáticos.
- Descartado: calcular la simulación en el frontend (regla: nada de ciencia fuera de Python).

## 5. Datos del equipo (entrada)

Formato de `docs/datos-equipo-embalses.md`, generalizado a los tres sitios:

```
datos_imagenes/<sitio>/<AAAAMMDD>/
  stack.tif          # opcional: HH y HV en dB (float32)
  mascara.tif        # códigos de clase (uint8, o 2 bits de ArcGIS); misma rejilla que el stack
  procedencia.json   # como en datos-equipo-embalses.md
```

- `<sitio>` ∈ `mazar`, `daule-peripa`, `casitagua`.
- Clases: embalses `{"1": "agua", "0": "no agua", "255"|"3": "sin dato"}`; incendio
  `{"1": "quemado", "0": "no quemado", ...}`. Si se añaden clases, se añaden códigos y nombres.
- **Proyección libre** (UTM 17S, 18S…). El script reproyecta a la **rejilla de referencia del sitio** (EPSG:32717
  para los tres; la de la primera fecha si ya está en 32717): vecino más cercano para máscaras, bilineal para dB.
  La **superficie** de cada fecha se mide **antes** de reproyectar, en su rejilla original.
- Para la segunda historia (incendio) el equipo entrega al menos una fecha antes y una después del fuego.
  **Incendio de Casitagua: 17 de septiembre de 2026** (dato del equipo), dentro de la cobertura regular de NISAR
  GCOV sobre Ecuador (17 jun – 5 nov 2026), así que la capa es `nisar`. La app lo nombra solo con una fuente
  publicada citada (pendiente de añadir a la ficha); hasta entonces, el texto dice «incendio de septiembre de 2026
  en el Casitagua (fuente por añadir)» y no se publica en `main`.
- Estado hoy: Mazar tiene una fecha (stack + `Clas_Super.tif`, la máscara supervisada buena, sin `procedencia.json`);
  la segunda fecha de Mazar (UTM 18S), Daule-Peripa y Casitagua están pendientes del equipo. Hasta que llegue la
  procedencia, esa fecha no se muestra; el desarrollo y las pruebas usan **derivados de prueba sintéticos con
  procedencia completa** en `tests/` (nunca en `data/`).
- Número de fechas: el diseño admite N fechas por sitio (se esperan 2–4). *Decisión de Claude:* HH/HV y máscara se
  guardan para todas las fechas; si el presupuesto no alcanza, se baja la resolución de HH/HV antes que quitar
  fechas, y la prueba de presupuesto lo vigila.

**Contorno del sitio** (`contorno.geojson`, versionado): polígono dentro del cual se mide la superficie, para que
las manchas sueltas de ladera no cuenten (en la máscara supervisada de Mazar suman ~5 km² frente a ~7 km² del
embalse). *Decisión de Claude:* lo genera el script la primera vez a partir de las regiones conectadas grandes de la
máscara (≥ 10 ha) más un margen, y el equipo lo revisa; si el equipo entrega su propio polígono, manda el suyo. Es
medición, no segmentación.

## 6. Preparación fuera de línea: `scripts/preparar_embalses.py`

Lee `datos_imagenes/`, valida y escribe derivados pequeños versionados. Maneja los tres sitios (embalses e
incendio) con el mismo código; el nombre se conserva por continuidad.

Por sitio y fecha:
1. Valida `procedencia.json` (campos de la regla 7) y la rejilla (máscara y stack alineados). Si falta algo, la
   fecha se escribe con `procedencia_completa = false` y el proveedor **no la muestra**; el informe del script dice
   qué falta.
2. Lee máscaras de 2 bits sin `imagecodecs` (desempaquetado propio) y trata el borde sin dato del stack (valor 0)
   como «sin dato» aunque la máscara diga 0.
3. Mide superficie de cada clase dentro del contorno (km²) en la rejilla original.
4. Reproyecta a la rejilla de referencia, reduce (lado largo ≤ ~1024 px, ~20–30 m) y escribe máscara en códigos del
   contrato (k = `leyenda[k-1]`, 0 = sin dato) y HH/HV cuantizados a uint8 con `vmin`/`vmax`.
5. Disco: el usuario dispone de **~10 GB como máximo**. El script trabaja de a un archivo grande por vez, recorta
   en cuanto descarga, borra lo crudo que ya no necesita y comprueba el espacio libre antes de cada descarga
   (aborta con un mensaje claro si no queda margen). Las descargas de datos abiertos que no son de NISAR (DEM, mapa
   de cobertura) están **autorizadas por el usuario** (2026-11-14) y van fuera del repo (`data/crudo/`, en
   `.gitignore`); los granulos NISAR siguen necesitando la credencial (regla 5).
6. Relieve: recorta el DEM de referencia (propuesta: **Copernicus GLO-30**, acceso abierto sin cuenta; si no
   conviene, otro de 30 m) a la caja del sitio, en la rejilla de referencia, y precalcula la **curva
   nivel–superficie** del vaso. Solo para embalses.

Salida: `data/embalses/<sitio>/` y `data/incendios/casitagua/` con `sitio.json` (fechas, superficies, procedencia
por fecha, rejilla, bbox WGS84), `<AAAAMMDD>.npz`, `dem.npz`, `curva.json`, `contorno.geojson`. Presupuesto total
≤ 10 MB; una prueba lo vigila. `scripts/empaquetar_app.py` incluye estas carpetas para Pyodide.

## 7. Contrato y proveedor mixto

**Cambios al contrato** (`datos/contrato.py`, `docs/contrato-datos.md`):
- `Escenario.historia` admite `"embalse"` además de `"inundacion"` e `"incendio"`; nuevo campo opcional `sitio`
  (`mazar`, `daule-peripa`, `casitagua`).
- `Origen` gana `clase` ∈ `nisar | otro_sensor | sintetico | complementario` y `procedencia: Procedencia | None`
  (producto, colección, granulos, fecha de adquisición, polarizaciones, frecuencia, madurez, método, autor). Un
  validador exige procedencia completa cuando `clase` es `nisar` u `otro_sensor`. `tipo` se mantiene por
  compatibilidad (`real`/`sintetico`) y se deriva de `clase`.

**Proveedor de derivados** (`datos/proveedores/derivados.py`): lee `data/embalses/` y `data/incendios/`, expone un
`Escenario` por sitio con sus fechas con procedencia completa como adquisiciones, `capa` (HH, HV, máscara),
`cambio` (agua ganada / perdida / persistente; quemado nuevo) y `medir`. Con una sola fecha, `cambio` lanza
`CapacidadNoDisponible` y la interfaz dice «falta la segunda fecha»: **nunca se rellena con una fecha sintética**.

**Proveedor mixto** (`datos/proveedores/mixto.py`): combina derivados + demo. Para cada sitio sin datos reales
mostrables, ofrece un **sustituto de demostración** del mismo sitio (escenario demo de inundación o incendio
colocado en las coordenadas del sitio con `simular(lat, lon)`), marcado como sintético.
*Decisión de Claude (tras la revisión):* para embalses ese sustituto no sirve (daría una llanura, no un vaso en un
cañón), así que el **sustituto de embalse se construye con el DEM real llenado hasta una cota ilustrativa** de la
curva nivel–superficie: sintético y marcado, pero con la forma del embalse real. Por eso el DEM y la curva entran
en la **fase 1**, y la simulación de la fase 3 parte de ese estado cuando no hay máscara real. El sustituto de
incendio sí usa el escenario demo colocado en Casitagua. Los escenarios demo
habituales siguen disponibles para Observatorio, Laboratorio y Simulador. `NISAR_PROVEEDOR=mixto` pasa a ser el
valor por defecto; `demo` y `real` siguen existiendo. Se añade a la suite de conformidad.

## 8. Módulo de lecciones: `datos/lecciones/` + `api/rutas/lecciones.py`

- **Fichas** (`fichas.json` estático): por sitio, datos descriptivos (región, río, usos, capacidad, potencia
  instalada, área de cuenca, régimen de lluvias). **Cada cifra lleva fuente o la marca «ilustrativo, por confirmar
  con fuente»**; la interfaz muestra la marca.
- **Comparación de embalses**: superficie por fecha, variación relativa, lluvia mensual (NASA POWER, ya en
  `/api/contexto`), régimen de lluvias, usos. Devuelve lo común y lo distinto como datos; el texto lo arma el
  frontend con claves traducidas.
- **Simulación de embalse** (100 % sintética, marcada): controles **mes de inicio**, **lluvia** (factor sobre la
  climatología mensual de POWER, de sequía a extrema) y **duración** (meses). Balance de agua mensual ilustrativo:
  entrada = lluvia × área de cuenca × coeficiente de escorrentía; salida = turbinado + vertido cuando se supera el
  nivel máximo + evaporación. Del volumen al nivel con la curva nivel–superficie; el agua simulada se pinta sobre el
  relieve (celdas por debajo del nivel conectadas al embalse, `scipy.ndimage`). Punto de partida: la última máscara
  real mostrable del sitio, o el estado demo si no hay.
  *Límite honesto:* el DEM ve la superficie del agua de cuando se tomó, no el fondo; por debajo de esa cota la
  bajada se ilustra con la curva extrapolada y lo dice una nota.
  Salidas: serie de nivel, superficie y volumen; máscara simulada al final y en pasos; **energía ilustrativa**
  (potencia ∝ caudal turbinado × salto) e indicadores de seguridad eléctrica (meses por debajo del nivel mínimo de
  operación, vertido).
- **Impactos de embalse**: energía y seguridad eléctrica (ilustrativo; un evento real como los cortes de 2024 solo
  con fuente citada), vertido y riesgo aguas abajo, orilla expuesta en sequía (superficie entre la máscara máxima y
  la actual).
- **Impactos de incendio** (Casitagua): superficie quemada (de la máscara real si existe), biomasa perdida =
  superficie × densidad de biomasa por cobertura × fracción quemada, emisiones (CO₂, CO, PM2.5) = biomasa ×
  factores de emisión, CO₂ equivalente en comparaciones comprensibles, y una lectura de calidad del aire
  ilustrativa. Cada factor con su cita bibliográfica en `fichas.json`; sin cita, marcado «por confirmar».
- **Simulación de incendio**: reutiliza el modelo de incendio de demostración colocado en Casitagua (`simular` con
  `lat`/`lon`) con sus controles actuales; los impactos se recalculan sobre la superficie simulada.
- Todas las respuestas llevan `origen` y, en lo real, `procedencia`. Las rutas son sin estado y funcionan en Pyodide.

## 9. Interfaz

```
PACHA                         [ Embalses y lluvia | Incendios ]
 Embalses:  [ Mazar | Daule-Peripa | Comparar ]
 1 Datos              ficha + lluvia mensual (POWER) + superficie por fecha (equipo)
 2 Lo que ve el       HH/HV por fecha, comparador deslizante, máscara del equipo,
   satélite           agua ganada/perdida (con 2 fechas) — sello de procedencia
 3 Simular            mes · lluvia (sequía…extrema) · duración → el agua sube/baja en el mapa
 4 Impactos           energía · seguridad eléctrica · vertido · orilla expuesta
```

- Ruta `/` (sustituye a Historias). Estado en la URL: `?leccion=embalses|incendios&sitio=…&parte=…`.
- Reutiliza `Comparador`, `CintaPasadas`, `SelloOrigen`, `BandaDemostracion`, `Termino`, gráficos y la plantilla
  por partes de `Historia.tsx` donde encaje. Componentes nuevos: selector de lección y sitio, bloque de comparación,
  panel de simulación de embalse, tarjetas de impacto.
- **«Cómo lo hacemos»**: amplía `Fundamentos` con (a) qué es un SAR y la banda L, (b) qué es NISAR (solo lo
  verificado en `docs/nisar-verificado.md`), (c) qué producto usamos y por qué (GCOV, HH/HV), (d) el método del
  equipo, que se lee del `metodo` de `procedencia.json` y no se escribe a mano, (e) el camino dato → app y (f) para
  qué sirve. El `Recorrido` se actualiza para guiar por la lección de embalses.
- Navegación: Lecciones (`/`), Cómo lo hacemos, y un grupo «Más escenarios para aprender» con Observatorio,
  Laboratorio y Simulador. Las historias de La Segua y el incendio de la Sierra salen de `/`.
- Banda «DATOS DE DEMOSTRACIÓN» visible siempre que haya algo sintético en pantalla (la simulación siempre lo es).

## 10. Fases (cada una con su plan)

1. **Datos**: contrato (`clase`, `procedencia`, `historia="embalse"`, `sitio`), `preparar_embalses.py` (máscaras,
   stack, contorno, DEM y curva) con la fecha de Mazar disponible y derivados de prueba, proveedor de derivados, proveedor mixto, conformidad, empaquetado para Pages.
2. **Página de embalses** sin simulación: ruta `/`, lecciones, Mazar y Daule-Peripa (real o sustituto demo),
   partes Datos, Satélite e Impactos observados, comparación, fichas.
3. **Simulación de embalses**: DEM y curva en la preparación, balance de agua, agua sobre el relieve, energía e
   indicadores de seguridad eléctrica.
4. **Incendios (Casitagua)**: datos, satélite, simulación reutilizada, impactos de biomasa, emisiones, aire y clima.
5. **«Cómo lo hacemos», navegación y cierre**: Fundamentos ampliado, Recorrido, retiro de las historias anteriores,
   e2e, Pages, README y `CREDITOS.md`.

Cada fase entra con pruebas y build en verde, revisión visual a tres anchos y su commit por tarea.

## 11. Pendientes que no bloquean el diseño

- Segunda fecha de Mazar (UTM 18S), Daule-Peripa y Casitagua: del equipo, con `procedencia.json`.
- Fuente publicada del incendio de Casitagua (17 sep 2026) y granulos NISAR antes/después (catálogo, solo
  metadatos).
- Fuentes de las fichas (capacidades, potencias, cuencas) y de los factores de biomasa y emisión.
- DEM: Copernicus GLO-30 (descarga autorizada); cobertura: ESA WorldCover (descarga autorizada).

## 12. Decisiones de Claude (para revisar)

- Contorno del sitio generado por el script y revisado por el equipo.
- EPSG:32717 como rejilla de referencia de los tres sitios.
- Un solo script para embalses e incendio.
- Sustituto demo por sitio cuando no hay datos reales, sin mezclar fechas sintéticas en un escenario real; el de
  embalse es el DEM llenado a una cota ilustrativa (DEM en la fase 1).
- Todas las fechas guardan HH/HV y máscara; si falta presupuesto se reduce resolución, no fechas.
- `mixto` como proveedor por defecto.
