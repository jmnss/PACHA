# Challenge: «Dancing with the SARs» (NASA Space Apps Challenge)

Resumen de trabajo redactado por el equipo a partir del enunciado. **No es el texto oficial.** Toda
decisión de producto se evalúa contra este documento; si una tarea no sirve a estos objetivos, no se hace.

## Objetivo

Construir una aplicación interactiva que use datos de radar de la misión NISAR (NASA-ISRO Synthetic
Aperture Radar) para rastrear y visualizar uno o más tipos de cambio en la superficie terrestre, en
ubicaciones del mundo.

## Tipos de cambio mencionados

- Pérdida o expansión de humedales e inundaciones.
- Deforestación e incendios forestales.
- Cambios en cultivos y su salud.
- Humedad del suelo.
- Glaciares y hielo marino.
- Deformación del terreno por terremotos y subsidencia costera.

## Datos

- Descargar datos de NISAR de libre acceso a partir de la lista de recursos del challenge.
- Se pueden añadir datos complementarios para dar contexto: imágenes ópticas, capas GIS, población,
  tipo de vegetación.

## Qué valora el challenge

- Herramientas intuitivas y visualizaciones innovadoras: mapas interactivos de detección de cambios,
  animaciones de series temporales, dashboards, comparadores deslizantes antes/después.
- Que los datos de NISAR sean accesibles a un público amplio: científicos, gestores de recursos,
  educadores, tomadores de decisiones y público general.

## Resultado deseado

Una solución de código abierto, fácil de usar, que traduzca observaciones de radar complejas en
información accionable.

## Interpretación científica esperada

- Formular hipótesis sobre los impulsores físicos de lo que se ve (o no se ve) en los datos SAR.
- Indicar qué polarizaciones resaltan los cambios.
- Plantear aplicaciones futuras de NISAR.

## Consideraciones opcionales

- Usar distintas polarizaciones o frecuencias.
- Series temporales con varias fechas.
- Mostrar el impacto de factores humanos (agricultura, industria).
- Narrativa de datos convincente.
- Contexto personal si se conoce la zona de estudio.
- Elementos interactivos como sliders de imágenes y mapas web.

## Conceptos clave que la app y su texto deben tratar con rigor

- El radar es un sensor activo: funciona de día y de noche y con nubes.
- Es sensible a la rugosidad y a la constante dieléctrica; por eso resalta agua, inundaciones y humedad.
- Distintas polarizaciones revelan estructura y propiedades del material.
- SAR puede medir movimiento superficial a escala de centímetros.

## Reglas de honestidad científica del proyecto

1. La app nunca presenta como datos reales de NISAR lo que no lo sea.
2. Mientras se usen datos sintéticos, la interfaz muestra de forma permanente y visible la etiqueta
   «DATOS DE DEMOSTRACIÓN: no son observaciones reales de NISAR», y cada capa, gráfico y exportación
   lleva metadatos de origen (sintético o real), fuente, producto y fecha.
3. Los textos explicativos y las hipótesis sobre impulsores físicos apoyados en datos sintéticos se
   redactan como ejemplos ilustrativos, no como hallazgos sobre un lugar real. No se inventan mediciones,
   fechas ni resultados de eventos reales.
4. Los datos sintéticos se generan con un script reproducible del repositorio, con semilla fija y
   documentado, y se marcan como tales en su metadata.
   *(Desde 2026-11-14 la app puede ser mixta: manda la regla 7 de `CLAUDE.md`, que amplía esta.)*
5. Ningún detalle técnico de NISAR (productos, estructura de archivos, bandas, URLs, fechas de la misión)
   se da por cierto sin una fuente oficial; lo no verificado se marca «pendiente de confirmar con la
   documentación oficial».

## Recursos de datos del challenge

Lista oficial de recursos del challenge, tal como la entregó el equipo (2026-11-14). Los detalles técnicos de
NISAR que se usan en el código o en los textos se verifican aparte en `docs/nisar-verificado.md`.

**NASA**
- Earthdata Search (búsqueda de todos los datos de observación de la Tierra de la NASA).
- ASF Vertex (búsqueda de datos SAR de la NASA, incluido NISAR banda L).
- NISAR Data User Guide (`https://nisar-docs.asf.alaska.edu`).
- Intro to Remote Sensing e Intro to SAR (Earthdata Learn).
- ARSET (programa de capacitación de la NASA; tiene material de NISAR en español).
- NISAR StoryMaps: inundaciones, incendios, subsidencia, derrames y glaciares.
- NISAR Applications White Papers.
- UAVSAR Postcards.

**CSA (Agencia Espacial Canadiense)**
- RADARSAT Constellation Mission (RCM).
- RADARSAT-1 (datos abiertos).
- Tutorial de SAR en Python: `https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial`.

**CONAE (Argentina)**
- Catálogo SAOCOM (banda L; exige registro: lo decide el equipo, no Claude).

**Disponibilidad de NISAR (verificada, ver `docs/nisar-verificado.md` §2):** BETA (precalibración, adquisiciones de
oct 2025 a ene 2026), PROVISIONAL (calibrado, desde el 17 jun 2026, publicado el 20 jul 2026) y VALIDATED (desde el
21 oct 2026, publicado el 6 nov 2026). La banda S está en Bhoonidhi (ISRO). La descarga exige Earthdata Login;
la búsqueda de metadatos, no.

### Referencias que ya usa el código (no verificadas como recursos oficiales del challenge)

| Referencia en el código | Para qué | Estado |
|---|---|---|
| ASF SearchAPI `https://api.daac.asf.alaska.edu/services/search/param` con `dataset=NISAR` (`modelo/nisar.py:1550`) | Búsqueda de productos NISAR | `dataset=NISAR` y `processingLevel` verificados con `asf_search` (`docs/nisar-verificado.md` §5); la URL exacta de la API, pendiente |
| `https://nisar-docs.asf.alaska.edu` (`app.py:856`, `app.py:1542`) | Documentación de productos | Verificado: es la NISAR Data User Guide oficial de ASF |
| Productos «GCOV, GUNW, GOFF, GSLC», ruta interna HDF5 `science/LSAR/GCOV/grids/frequencyA`, datasets `unwrappedPhase`, `coherenceMagnitude`, `xCoordinates` (`modelo/nisar.py:1658-1725`) | Lectura de HDF5 reales | Productos y ruta GCOV verificados; GCOV es γ⁰ (no σ⁰); rutas del GUNW pendientes (`docs/nisar-verificado.md` §5) |
| Ficha `nisar.MISION` (lanzamiento, órbita, frecuencias, «BETA feb. 2026 / PROVISIONAL 20 jul. 2026») (`modelo/nisar.py:55-64`) | Texto de la misión | Parcialmente verificado; falta VALIDATED y hay dos longitudes de onda que corregir (`docs/nisar-verificado.md` §5) |
| «JPL D-102272» como especificación de GUNW (`modelo/nisar.py:1813`) | Nota de signo LOS | Número del documento verificado; la convención de signo, pendiente |
| ISRO Bhoonidhi (`app.py:860`) | Banda S | Verificado: la banda S de NISAR se distribuye en Bhoonidhi (ISRO) |
| NASA POWER, API de climatología regional (`scripts/preparar_datos_ecuador.py:22`) → `data/clima_ecuador_power.csv` | Clima mensual 2001–2025 | Dato real complementario ya descargado |
| geoBoundaries gbOpen ECU ADM1, CC0 (`scripts/preparar_datos_ecuador.py:20`) → `data/ecuador_provincias.geojson` | Provincias | Dato real complementario ya descargado |
| Teselas Terrarium de AWS Open Data (`modelo/desastres.py:49`) | Relieve SRTM del Modo Dios | Dato real complementario, se descarga al usar el Modo Dios |
| OpenStreetMap Nominatim (`app.py:660`) | Geocodificación | Servicio externo |
| Esri World Dark Gray e Imagery (`app.py:503-508`) | Mapas base; el frontend React los usa (más Topo y etiquetas de referencia) cuando hay internet | Servicio externo, sin clave; ya en uso |

## Requisitos de entrega

**PENDIENTE:** se buscarán los oficiales de Space Apps 2026 y se resumirán en `docs/entrega.md`. La licencia la
decide el equipo. No se asume ninguno.
