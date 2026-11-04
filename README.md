# NISAR · Rastreador de cambios en la superficie de Ecuador

Aplicación Streamlit que simula y analiza observaciones del radar NISAR (banda L, NASA–ISRO) en
Ecuador: humedales, incendios, terremotos, glaciares, agricultura y subsidencia. El modelo conoce la
región natural, la estación astronómica y la temporada climática (lluviosa / seca) de cada lugar y
fecha a partir de la climatología NASA POWER 2001–2025. Interfaz con estética cyberpunk.

Incluye el **🌋 Modo Dios**: un simulador interactivo, a modo de juego, en el que el usuario desata
incendios, tormentas, desbordes, marejadas, terremotos (con tsunamis y deslizamientos en cascada) y
erupciones sobre el relieve real de Ecuador (DEM SRTM). La propagación y los efectos se calculan con
modelos publicados y la app muestra lo que vería NISAR en su siguiente pasada (ver más abajo).

## Ejecutar

```powershell
python app.py
```

Abre http://localhost:8501 (si el puerto está ocupado, la app usa el siguiente libre y lo indica en la
terminal). Dependencias: `python -m pip install -r requirements.txt`.

## Estructura

```
app.py                         Punto de entrada: interfaz Streamlit (comentada línea a línea)
requirements.txt               Dependencias de Python
.streamlit/config.toml         Servidor y tema cyberpunk (colores y fuentes)

modelo/                        Núcleo científico
  nisar.py                     Geometría NISAR, modelos físicos, simulación, detección, HDF5 y catálogo ASF
  estaciones.py                Región natural, estación astronómica, temporada y balance hídrico
  clima.py                     Partición espacial reproducible (+ 5 pruebas unitarias)
  desastres.py                 Modo Dios: mundo (DEM, cobertura, población), desastres, efectos y vista NISAR (+ 8 pruebas)

interfaz/                      Piezas de la interfaz
  tema.py                      Paleta neón validada, rampas de color, CSS y estilo de gráficos
  particion_vista.py           Pestaña «Validación»
  modo_dios.py                 Pestaña «Modo Dios» (fragmento: sus clics no recargan el resto de la app)
  componentes/selector_imagen/ Componente HTML para elegir punto y cuadrante sobre las imágenes
  componentes/mundo_dios/      Tablero del juego: clic para desatar, animación en el navegador

data/                          Datos de entrada
  nisar_sample.csv             Catálogo de lugares
  clima_ecuador_power.csv      Climatología mensual NASA POWER (malla MERRA-2)
  ecuador_provincias.geojson   24 provincias con su región natural (geoBoundaries, CC0)
  nisar/                       (opcional) productos HDF5 reales descargados de ASF
  terreno/                     Caché de teselas del DEM (se crea sola; puede borrarse)

resultados/particion_espacial/ Artefactos de la partición (CSV, YAML, JSON y huella SHA-256)

scripts/
  preparar_datos_ecuador.py    Descarga y prepara los datos de Ecuador

docs/                          Informes técnicos (LaTeX + PDF, estilo cyberpunk)
  modelo_nisar_ecuador.tex/.pdf        Modelo físico-matemático, señal SAR y temporadas
  teoria_particion_espacial.tex/.pdf   Teoría de la partición espacial
  estilo_cyberpunk.sty                 Maqueta común (opción «impresion» para fondo blanco)
  generar_datos_latex.py               Calcula las tablas y figuras de los informes
  datos_generados.tex                  Salida del script anterior (no editar a mano)

archivo/                       Restos de herramientas anteriores (no ejecutar; ver archivo/LEEME.md)
```

## Tareas habituales (desde la raíz del proyecto)

| Tarea | Orden |
|---|---|
| Regenerar los datos de Ecuador | `python scripts/preparar_datos_ecuador.py` |
| Regenerar la partición espacial | `python -m modelo.clima` |
| Pruebas de la partición | `python -m unittest modelo.clima` |
| Pruebas del Modo Dios (sin red) | `python -m unittest modelo.desastres` |
| Regenerar tablas y figuras de los informes | `python docs/generar_datos_latex.py` |
| Compilar un informe | `cd docs` y luego `pdflatex <nombre>.tex` dos veces |

## Modo Dios: modelos usados

| Desastre | Modelo de propagación / área | Efectos |
|---|---|---|
| 🔥 Incendio | Autómata celular de Alexandridis et al. (2008), humedad de Rothermel (1972) | Área, biomasa y CO₂, personas a evacuar |
| ⛈️ Tormenta | SCS-CN (TR-55) + aguas someras inerciales (Bates et al., 2010) + SHALSTAB | Jonkman et al. (2008), daño JRC Sudamérica (Huizinga et al., 2017) |
| 🌊 Desborde / marejada | Hidrograma triangular o nivel del mar + Bates et al. (2010) | Jonkman et al. (2008), JRC |
| 🌍 Terremoto | Wells y Coppersmith (1994), Okada (1985), Allen et al. (2012), Worden et al. (2012) | PAGER (Jaiswal y Wald, 2010); tsunami y deslizamientos en cascada |
| 🌋 Erupción | LAHARZ (Iverson et al., 1998), cono de energía (Malin y Sheridan, 1982), Mastin et al. (2009), advección–difusión de ceniza | Población expuesta, techos colapsados (Spence et al., 2005) |

El relieve son teselas Terrarium (SRTM) de AWS Open Data; la población urbana es aproximada (orden de
magnitud del censo INEC 2022) y la rural, sintética. Los supuestos propios del juego (escala temporal del
fuego, velocidades de lahares, letalidad volcánica) se declaran en las notas de cada evento. Es una
herramienta educativa, no un mapa oficial de riesgo.
