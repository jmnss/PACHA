# NISAR: lo verificado en fuentes oficiales

Regla 6 de `CLAUDE.md`: **solo lo que está en este archivo puede dejar de decir «pendiente de confirmar con la
documentación oficial»**. Cada fila lleva la URL, la fecha de consulta y una cita corta (en el idioma de la fuente).
Si una fuente cambia, se actualiza la fila y su fecha; si una cita deja de estar en la fuente, el dato vuelve a
«pendiente de confirmar».

Fuentes y abreviaturas:

- **GU** = NISAR Data User Guide (ASF DAAC), `https://nisar-docs.asf.alaska.edu/<página>/`
- **NASA** = `https://science.nasa.gov/mission/nisar/mission-overview/`
- **JPL-QF** = `https://www.jpl.nasa.gov/press-kits/nisar/quick-facts/`
- **JPL-LANZ** = `https://www.jpl.nasa.gov/news/nasa-isro-satellite-lifts-off-to-track-earths-changing-surfaces/` (30 jul 2025)
- **CAT** = catálogo de ASF consultado con `asf_search` 14.1.0 (solo metadatos, sin cuenta); ver `docs/catalogo-ecuador.md`

Fecha de consulta de todas las filas: **2026-11-14**.

## 1. Misión

| Dato | Fuente | Cita |
|---|---|---|
| Misión conjunta de NASA e ISRO; datos libres y abiertos | GU `nisar-intro` | «NISAR is a joint Earth-observing mission between the National Aeronautics and Space Administration (NASA) and the Indian Space Research Organization (ISRO)» · «Access to NISAR mission data is free and open.» |
| Lanzamiento el 30 de julio de 2025 desde el Centro Espacial Satish Dhawan (India), en un GSLV de ISRO | NASA; GU `availability-overview` | «Launched July 30, 2025 from the Satish Dhawan Space Centre in India» · «The mission was launched with the GSLV Mark II launch vehicle, provided by ISRO.» |
| Altitud de la órbita: 747 km; inclinación 98,4° | NASA (tabla) | «Orbit Altitude 747 km Orbit Inclination 98.4°» |
| Cruce de nodos a las 6 h (ascendente) y 18 h (descendente) | NASA (tabla) | «Time of Nodal Crossing 6 AM (ascending) / 6 PM (descending)» |
| Ciclo de repetición exacto: 12 días | NASA (tabla); GU `gcov` (convención de nombres) | «Exact Repeat Cycle 12 days» · «each cycle represents 12 days» |
| Cubre casi toda la tierra y el hielo dos veces cada 12 días | JPL-LANZ; JPL-QF | «monitor nearly all the planet's land- and ice-covered surfaces twice every 12 days» |
| Mide movimiento de la superficie hasta el centímetro | JPL-LANZ | «the satellite can detect the movement of land and ice surfaces down to the centimeter» |
| Dos radares: banda L (λ = 24 cm) y banda S (λ = 9,3 cm) | GU `nisar-intro` | «The L-SAR instrument operates at a wavelength of 24 cm.» · «The S-SAR instrument … operates at a wavelength of 9.3 cm and is primarily used for acquisitions over India.» |
| La NASA aloja la banda L (ASF DAAC); ISRO aloja la banda S (Bhoonidhi) | GU `nisar-intro`, `access-overview` | «NASA hosts the data acquired by the L-band sensor, and ISRO hosts the data collected by the S-band sensor.» |
| La banda S se adquiere solo sobre zonas seleccionadas | GU `nisar-intro` | «S-band data is collected over select areas, as described in the mission observation plan.» |
| Mirada a la izquierda; franja de unos 240 km | GU `nisar-intro` | «NISAR is a left-looking mission» · «Most L-band acquisitions have a swath width of about 240 km» |
| Frecuencias centrales de banda L (Frecuencia A): 1257,5 MHz (77 MHz), 1239 MHz (40+5), 1229 MHz (20+5 y 20+20), 1221,5 MHz (5+5) | GU `nisar-intro` (tabla 1) | «Table 1: Center frequencies (MHz) for NISAR acquisition bandwidths» |
| Frecuencia A es la principal; la B sirve sobre todo para correcciones atmosféricas y tiene píxel más grueso | GU `nisar-intro` | «Frequency A is the primary frequency used for generating scientific products, while Frequency B data is collected primarily for use in atmospheric corrections.» |

**No verificado** (sigue «pendiente de confirmar»): «heliosíncrona amanecer-anochecer» como nombre (la NASA solo da los
cruces de 6 h y 18 h), ángulos de incidencia 33°–47°, frecuencia de la banda S en GHz (3,2 GHz), el modo de la banda S
sobre Ecuador.

## 2. Publicaciones y madurez de los datos

| Dato | Fuente | Cita |
|---|---|---|
| BETA: precalibración; subconjunto de adquisiciones del 17 oct 2025 al 20 ene 2026; publicado el 27 feb 2026 | GU `availability-overview` | «The BETA products are not fully calibrated» · «a subset of the data acquired between October 17, 2025 and January 20, 2026» |
| PROVISIONAL: publicado el 20 jul 2026; calibrado y validado en pocos sitios; adquisiciones desde el 17 jun 2026 hasta parte del 23 oct 2026; CRID P05023 | GU `availability-overview` | «NISAR PROVISIONAL datasets were released July 20, 2026.» · «available for all acquisitions starting from June 17, 2026 until partway through October 23, 2026» |
| **VALIDATED**: publicado el 6 nov 2026; L0 a L2; adquisiciones desde el 21 oct 2026; CRID P05036; sin SME2 validado todavía | GU `availability-overview` | «NISAR VALIDATED datasets were released November 6, 2026.» · «VALIDATED collections include products for all L-band NISAR acquisitions starting October 21, 2026.» |
| Las colecciones VALIDATED no llevan la madurez en el nombre (`NISAR_L2_GCOV_V1`); las otras sí (`NISAR_L2_GCOV_PROVISIONAL_V1`, `NISAR_L2_GCOV_BETA_V1`) | GU `availability-overview`, `products-overview` | «the PROVISIONAL GCOV collection is NISAR_L2_GCOV_PROVISIONAL_V1, while the VALIDATED collection is simply NISAR_L2_GCOV_V1» |
| Hueco permanente de datos del 27 jul 2026 22:03 UTC al 10 ago 2026 00:55 UTC | GU `availability-overview` | «Permanent NISAR instrument data gap exists between 2026-07-27T22:03:25Z and 2026-08-10T00:55:27Z.» |
| No conviene analizar juntos BETA y PROVISIONAL | GU `availability-overview` | «Users should exercise care if attempting to analyze BETA products together with PROVISIONAL products.» |
| En 2027 se reprocesará como VALIDATED todo lo adquirido antes del 21 oct 2026, y sustituirá a las versiones anteriores | GU `availability-overview` | «These validated products will supersede any earlier versions of the data in the archive.» |
| PROVISIONAL cumple requisitos radiométricos y de geolocalización en latitudes bajas | GU `availability-overview` | «generally meet radiometric and geolocation requirements in lower-latitude areas where ionospheric variability is low» |

## 3. Productos

| Dato | Fuente | Cita |
|---|---|---|
| Niveles: L0 (RRSD), L1 (RSLC, RIFG, ROFF, RUNW), L2 (GSLC, GOFF, GCOV, GUNW), L3 (SME2, humedad del suelo, ~200 m) | GU `products-overview` | Lista de productos por nivel en la página |
| Todos los productos estándar son HDF5 (estructura compatible con CF/netCDF) | GU `data-format` | «All NISAR standard products are in Hierarchical Data Format version 5 (HDF5).» |
| GCOV: retrodispersión calibrada, corregida del relieve (RTC por área), como potencia **gamma-0 (γ⁰)** | GU `gcov` | «calibrated backscatter measurements corrected for both radiometric and terrain distortions, presented as gamma-0 power values» |
| GCOV: proyección UTM de la zona; píxel de 10 o 20 m en Frecuencia A y 80 m en Frecuencia B | GU `gcov` | «projected to the appropriate UTM zone» · «Frequency B datasets have a pixel spacing of 80 meters» |
| Rutas GCOV: `/science/LSAR/GCOV/grids/frequency[A|B]/HHHH`, `HVHV`, `VVVV`, `VHVH`…; términos diagonales reales | GU `gcov` | «/science/LSAR/GCOV/grids/frequency[A\|B]/HHHH» · «The diagonal terms … are real-valued» |
| GCOV incluye `numberOfLooks`, `mask` y `rtcGammaToSigmaFactor` (convierte γ⁰ a σ⁰) | GU `gcov` | «provides factors to normalize the backscatter normalization convention of the GCOV matrix from gamma0 to sigma0» |
| Las polarizaciones y frecuencias dependen del modo de adquisición | GU `gcov` | «The frequencies and polarizations available in a particular GCOV data product will vary based on the acquisition mode» |
| Códigos de polarización del nombre: SH, SV, DH (HH/HV), DV (VV/VH), QP… | GU `gcov` (convención de nombres) | «DH = HH/HV – Dual Polarity (H transmit)» |
| GUNW: fase desenrollada (rad) a 80 m, coherencia a 20 y 80 m, componentes conexas, pantalla ionosférica; UTM | GU `gunw` | «the unwrapped interferometric phase in radians (80-m posting), the normalized interferometric coherence magnitude (20-m and 80-m posting)» |
| GUNW: solo copolar (HH o VV), solo vecinos de 12 días, solo Frecuencia A | GU `gunw` | «Only co-polarized (HH or VV) nearest-neighbor (12-day) GUNW products are generated … only generated for freqency A» |
| Especificación del GUNW: JPL D-102272 Rev E; del GCOV: JPL D-102274 Rev F (Shiroma, 2026) | GU `gunw` (nombre del PDF enlazado), `gcov` (referencias) | «NISAR_D-102272_RevE_NASA_SDS_Product_Specification_L2_GUNW…» · «Level-2 Geocoded Polarimetric Covariance (NASA SDS Product Specification JPL D-102274 (Revision F))» |
| Tamaño de un GCOV de Frecuencia A sobre Ecuador: ~7,4 GB (un granulo del 31 oct 2026) | CAT | campo `bytes` del granulo `NISAR_L2_PR_GCOV_034_112_D_089_4005_DHDH_A_20261031T233908_…_P05036_N_F_J_001` |

**No verificado:** si los términos GCOV vienen en potencia lineal o en dB (la guía dice «power values», sin unidad; se
comprobará en los atributos del HDF5); el valor de «sin dato»; la convención de signo del desplazamiento LOS del GUNW
(está en la especificación D-102272, aún no leída); las rutas internas de `unwrappedPhase` y `coherenceMagnitude`.

## 4. Acceso

| Dato | Fuente | Cita |
|---|---|---|
| Vertex, Earthdata Search, `asf_search`, `earthaccess`, S3 directo y GDAL `vsicurl` | GU `access-overview` | Lista de opciones de la página |
| Descargar (o leer en streaming) exige Earthdata Login | GU `access-overview`, `earthaccess` | «Downloading NISAR data requires logging in with your Earthdata Login (EDL) credentials.» |
| Credenciales en `~/.netrc` (`machine urs.earthdata.nasa.gov`) | GU `access-overview` | «configure a local .netrc file to securely store credentials» |
| Datos en AWS us-west-2; S3 directo solo desde esa región | GU `earthaccess`, `aws-s3-access` | «NISAR data is hosted in the AWS us-west-2 region» |
| La búsqueda de metadatos no exige cuenta | CAT | `asf_search.search(dataset='NISAR', …)` respondió sin credenciales el 2026-11-14 |
| La guía no ofrece cita recomendada para los productos | GU `access-overview` | (ausencia comprobada; la cita se busca en ASF antes del cierre) |

## 5. Revisión del código y los textos heredados

| Lugar | Qué afirma | Estado |
|---|---|---|
| `modelo/nisar.py:45-50` constantes | L 1,257 GHz; S 3,2 GHz; ciclo 12 días; inclinación 98,4° | Ciclo 12 días e inclinación 98,4°: **verificado (NASA)**. L 1,257 GHz: **verificado** como la central de 77 MHz (1257,5 MHz, GU `nisar-intro`), no es la única. S 3,2 GHz: pendiente de confirmar (la GU solo da λ = 9,3 cm, que equivale a ~3,2 GHz). |
| `nisar.MISION` «Lanzamiento» | 30 jul 2025, GSLV-F16 desde Sriharikota | Fecha, GSLV y Sriharikota: **verificado (NASA)**. «F16» (número de vuelo): pendiente de confirmar. |
| `nisar.MISION` «Radares» | λ ≈ 23,8 cm (L) y ≈ 9,4 cm (S) | La GU dice 24 cm y 9,3 cm: **se corrige a 24 cm y 9,3 cm** citando GU. |
| `nisar.MISION` «Órbita» | Heliosíncrona amanecer-anochecer, 747 km, 98,4° | 747 km y 98,4°: **verificado (NASA)**; «amanecer-anochecer» se reescribe como «cruza el ecuador hacia las 6 h y las 18 h» (NASA). |
| `nisar.MISION` «Repetición» | 12 días, pasos ascendente y descendente | **Verificado (NASA; JPL-LANZ «twice every 12 days»)**. |
| `nisar.MISION` «Geometría» | Mirada izquierda, franja ≈ 240 km, incidencia 33°–47° | Mirada izquierda y 240 km: **verificado (GU)**. Incidencia: pendiente de confirmar. |
| `nisar.MISION` «Productos L2» | GCOV, GUNW, GOFF, GSLC | **Verificado (GU `products-overview`)**. |
| `nisar.MISION` «Archivo» | BETA (feb. 2026) y PROVISIONAL (desde 20 jul 2026) | **Verificado (GU)** pero incompleto: falta VALIDATED (6 nov 2026). |
| `modelo/nisar.py:1553` `URL_ASF` y parámetros `dataset=NISAR`, `processingLevel` | Búsqueda en la Search API de ASF | `dataset='NISAR'` y `processingLevel='GCOV'`: **verificado (CAT)**, la búsqueda funciona y devuelve esos campos. La URL concreta de la API: pendiente (se usa `asf_search`, que la encapsula). |
| `modelo/nisar.py:1602` madurez por nombre de colección | «PROVISIONAL» o «BETA» si aparece en el nombre; si no, el nombre | **Incompleto:** sin marca es VALIDATED (GU). Se resuelve en `scripts/`, no en `modelo/`. |
| `modelo/nisar.py:1666` `science/LSAR/GCOV/grids/frequencyA` | Ruta de las covarianzas | **Verificado (GU `gcov`)**. |
| `modelo/nisar.py:1662` y `1756` «potencia lineal» y rótulo «σ⁰» | GCOV como σ⁰ | **Error:** GCOV es γ⁰ (GU `gcov`); σ⁰ requiere `rtcGammaToSigmaFactor`. Lineal o dB: pendiente (atributos del HDF5). El lector nuevo irá en `scripts/preparar_datos_reales.py`; `modelo/` no se toca salvo corrección con prueba. |
| `modelo/nisar.py:1684-1694` `unwrappedPhase`, `coherenceMagnitude`, `centerFrequency`, `xCoordinates` | Rutas del GUNW | Capas existen (GU `gunw`); nombres exactos de los datasets: pendiente de confirmar con un archivo real. |
| `modelo/nisar.py:1800` «JPL D-102272» y convención de signo | Especificación del GUNW | Número del documento: **verificado (GU `gunw`)**. Signo: pendiente (no se ha leído D-102272). |
| Notas e INFORME (bloque C): menciones a GCOV, GUNW, GOFF | Productos con que se observaría cada cambio | Existencia y descripción de los tres: **verificado (GU `products-overview`)**. Que el demo los «simula» sigue siendo ilustrativo. |
| Laboratorio: banda S (`datos/laboratorio.py:5,186`, `lab.pol.aviso_banda`) | «Ejemplo ilustrativo; pendiente qué bandas entrega NISAR» | Que NISAR tiene banda S (λ 9,3 cm), sobre zonas seleccionadas y sobre todo sobre India, vía Bhoonidhi: **verificado (GU)**. Los coeficientes del Laboratorio siguen siendo ilustrativos; si hay banda S sobre Ecuador: pendiente (no consultado, Bhoonidhi exige registro). |
| Simulador: ciclo de 12 días (`datos/simulador.py:209`, `sim.espera.intro_pendiente`) | «Ciclo supuesto de 12 días» | **Verificado (NASA)**. Matiz: el mismo lugar se vuelve a ver dos veces por ciclo (ascendente y descendente; JPL-LANZ), así que la espera máxima real en un punto puede ser menor que 12 días según la geometría. |
| «Cómo ve el radar» (`obs.ayuda.interferometria_antes`) y Fundamentos: «a escala de centímetros» | Movimiento de la superficie | **Verificado (JPL-LANZ, «down to the centimeter»)**. |
| Fundamentos: «fecha de lanzamiento, órbita, frecuencias, productos y ritmo de observación» pendientes | Ficha de la misión | Lanzamiento, órbita (747 km, 98,4°), longitudes de onda, productos y ciclo: **verificados** (§1 y §3). |

Los cambios de texto en la app y en `modelo/` se hacen en sus tareas (no en la de reglas); esta tabla es su referencia.
