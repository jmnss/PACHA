"""
Genera docs/datos_generados.tex: tablas y coordenadas de figuras de los informes, calculadas con el modelo.

Todas las cifras del informe que dependen de datos (climatología, temporadas, hitos astronómicos y
pruebas de verificación) salen de este script, de modo que el PDF es reproducible:

    python docs/generar_datos_latex.py
    cd docs && pdflatex modelo_nisar_ecuador.tex && pdflatex modelo_nisar_ecuador.tex
"""

import json
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from modelo import estaciones, nisar  # noqa: E402

SALIDA = Path(__file__).resolve().parent / "datos_generados.tex"
MESES_ABR = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]


def num(x: float, dec: int = 0) -> str:
    """Número con coma decimal para LaTeX."""
    return f"{x:.{dec}f}".replace(".", "{,}").replace("-", "$-$")


def fecha(f) -> str:
    return pd.Timestamp(f).strftime("%d/%m")


def meses_texto(nombres: list[str]) -> str:
    return ", ".join(m[:3] for m in nombres) if nombres else "---"


def main() -> None:
    sitios = nisar.cargar_sitios()
    sitios = sitios[sitios["pais"] == "Ecuador"].reset_index(drop=True)
    lineas = ["% Archivo generado por docs/generar_datos_latex.py; no editar a mano.", ""]

    # --- Tabla de climatología y temporadas por sitio ------------------------------------------
    filas = []
    climas = {}
    for _, s in sitios.iterrows():
        lat, lon = float(s["lat"]), float(s["lon"])
        clim = estaciones.climatologia(lat, lon)
        reg = estaciones.region_natural(lat, lon)
        tmp = estaciones.temporada(date(2026, 1, 15), clim, reg["region"])
        climas[s["id"]] = (s, clim, reg)
        filas.append(
            f"{s['sitio'].split(' (')[0]} & {reg['provincia']} & {reg['region']} & "
            f"{num(clim.prec_mm_mes.sum())} & {num(clim.et0_mm_mes.sum())} & {num(clim.elev_malla_m)} & "
            f"{tmp['regimen'].split(' ')[0]} & {meses_texto(tmp['meses_lluviosos'])} & "
            f"{meses_texto(tmp['meses_secos'])} \\\\")
    lineas += [
        r"\newcommand{\TablaClimaSitios}{%",
        r"\begin{table}[htbp]\centering\scriptsize",
        r"\caption{Climatología NASA POWER 2001--2025 interpolada a los sitios de Ecuador y temporadas "
        r"resultantes. $P$ y $ET_0$ son totales anuales (mm); $z_c$ es la elevación media de la celda "
        r"MERRA-2 (m), no la del sitio.}\label{tab:clima-sitios}",
        r"\setlength{\tabcolsep}{2.5pt}",
        r"\begin{tabular}{@{}lllrrrlp{2.5cm}p{2.5cm}@{}}\toprule",
        r"Sitio & Provincia & Región & $P$ & $ET_0$ & $z_c$ & Régimen & Meses lluviosos & "
        r"Meses secos ($<60$ mm) \\ \midrule",
        *filas,
        r"\bottomrule\end{tabular}\end{table}}",
        "",
    ]

    # --- Figura: climatología mensual por sitio (pgfplots, small multiples) --------------------
    graficos = []
    for k, (sid, (s, clim, reg)) in enumerate(climas.items()):
        clases = estaciones.clasificar_meses(clim)
        barras = {c: " ".join(f"({m + 1},{clim.prec_mm_mes[m]:.1f})" for m in range(12) if clases[m] == c)
                  for c in estaciones.TEMPORADAS}
        et0 = " ".join(f"({m + 1},{clim.et0_mm_mes[m]:.1f})" for m in range(12))
        titulo = s["sitio"].split(" (")[0]
        opciones = "title={" + titulo + "}"
        if k % 3 == 0:
            opciones += ", ylabel={mm/mes}"
        bloque = [r"\nextgroupplot[" + opciones + "]"]
        for c, color in (("Lluviosa", "lluviosa"), ("Transición", "transicion"), ("Seca", "seca")):
            if barras[c]:
                bloque.append(r"\addplot[ybar, bar width=4.2pt, fill=" + color + ", draw=none] coordinates {"
                              + barras[c] + "};")
        bloque.append(r"\addplot[thick, dashed, cplinea, mark=*, mark size=0.9pt] coordinates {" + et0 + "};")
        bloque.append(r"\addplot[densely dotted, cpumbral, domain=0.5:12.5, samples=2] {60};")
        graficos.append("\n".join(bloque))
    lineas += [
        r"\newcommand{\FiguraClimaSitios}{%",
        r"\begin{figure}[htbp]\centering",
        r"\begin{tikzpicture}",
        r"\begin{groupplot}[group style={group size=3 by 2, horizontal sep=1.1cm, vertical sep=1.4cm},",
        r"  width=0.36\textwidth, height=4.2cm, ymin=0, xmin=0.5, xmax=12.5, xtick={1,...,12},",
        r"  xticklabels={" + ",".join(MESES_ABR) + r"}, tick label style={font=\scriptsize},",
        r"  title style={font=\small}, ylabel style={font=\scriptsize}, ymajorgrids]",
        *graficos,
        r"\end{groupplot}",
        r"\end{tikzpicture}",
        r"\caption{Precipitación mensual climatológica (barras: cian lluviosa, gris transición, magenta "
        r"seca), $ET_0$ de Hargreaves--Samani (línea discontinua) y umbral de mes seco de 60~mm (punteada) "
        r"en los seis sitios del catálogo.}\label{fig:clima-sitios}",
        r"\end{figure}}",
        "",
    ]

    # --- Figura: forzamiento diario de La Segua (año 2026) --------------------------------------
    s, clim, reg = climas["ec_la_segua"]
    forz = estaciones.forzamiento(float(s["lat"]), float(s["lon"]), date(2026, 1, 1))
    dias = np.arange(0, 365, 3)
    humedad = " ".join(f"({d},{100 * forz.humedad_en(d):.1f})" for d in dias)
    maximo = forz.almacen_mm.max()
    almacen = " ".join(f"({d},{100 * forz._evaluar(forz.almacen_mm, d) / maximo:.1f})" for d in dias)
    dsigma = " ".join(f"({d},{forz.delta_sigma_suelo_db(d):.2f})" for d in dias)
    inicio_mes = np.cumsum(np.r_[0, estaciones.DIAS_MES[:-1]])
    lineas += [
        r"\newcommand{\FiguraForzamiento}{%",
        r"\begin{figure}[htbp]\centering",
        r"\begin{tikzpicture}",
        r"\begin{groupplot}[group style={group size=1 by 2, vertical sep=0.9cm}, width=0.92\textwidth,",
        r"  height=4.3cm, xmin=0, xmax=365, xtick={" + ",".join(str(int(v)) for v in inicio_mes) + "},",
        r"  xticklabels={ene,feb,mar,abr,may,jun,jul,ago,sep,oct,nov,dic}, ymajorgrids,",
        r"  tick label style={font=\scriptsize}, ylabel style={font=\small}, legend style={font=\scriptsize,"
        r" at={(0.99,0.97)}, anchor=north east}]",
        r"\nextgroupplot[ylabel={\%}, ymin=0, ymax=105, xticklabels={}]",
        r"\addplot[thick, color=lluviosa] coordinates {" + humedad + "};",
        r"\addlegendentry{humedad del suelo $s$ (porcentaje del agua útil)}",
        r"\addplot[thick, color=seca] coordinates {" + almacen + "};",
        r"\addlegendentry{almacenamiento del humedal $S$ (porcentaje del máximo anual)}",
        r"\nextgroupplot[ylabel={$\Delta\sigma^0_{suelo}$ (dB)}]",
        r"\addplot[thick, cpamarillo] coordinates {" + dsigma + "};",
        r"\end{groupplot}",
        r"\end{tikzpicture}",
        r"\caption{Ciclo anual del forzamiento estacional en el humedal La Segua (Manabí): humedad del suelo "
        r"del balance hídrico, almacenamiento del humedal (embalse lineal, $\tau=30$ días) y cambio "
        r"resultante de la retrodispersión del suelo, ecuación~\eqref{eq:dsigma}.}\label{fig:forzamiento}",
        r"\end{figure}}",
        "",
    ]

    # --- Hitos astronómicos y pasos cenitales ---------------------------------------------------
    hitos = estaciones._hitos_astronomicos()
    nombres = {"equinoccio_marzo": "Equinoccio de marzo", "solsticio_junio": "Solsticio de junio",
               "equinoccio_septiembre": "Equinoccio de septiembre", "solsticio_diciembre": "Solsticio de diciembre"}
    filas_h = [f"{nombres[k]} & {num(v, 2)} & {estaciones._fecha_de_juliano(2026, v):%d/%m} \\\\"
               for k, v in hitos.items()]
    filas_c = []
    for sid, (s, clim, reg) in climas.items():
        pasos = estaciones.pasos_cenitales(float(s["lat"]), 2026)
        filas_c.append(f"{s['sitio'].split(' (')[0]} & {num(float(s['lat']), 2)} & "
                       f"{' y '.join(f'{p:%d/%m}' for p in pasos)} & "
                       f"{num(float(estaciones.duracion_dia_h(float(s['lat']), 172)), 2)} & "
                       f"{num(float(estaciones.duracion_dia_h(float(s['lat']), 355)), 2)} \\\\")
    lineas += [
        r"\newcommand{\TablaHitos}{%",
        r"\begin{table}[htbp]\centering\small",
        r"\caption{Hitos astronómicos según la declinación de Spencer (día juliano $J$ y fecha de 2026) y, "
        r"para cada sitio, pasos del Sol por el cenit ($\delta=\varphi$) y duración del día en los "
        r"solsticios (h).}\label{tab:hitos}",
        r"\begin{tabular}{@{}lrr@{}}\toprule Hito & $J$ & Fecha \\ \midrule",
        *filas_h,
        r"\bottomrule\end{tabular}\par\bigskip",
        r"\begin{tabular}{@{}lrlrr@{}}\toprule Sitio & $\varphi$ ($^\circ$) & Pasos cenitales & $N_{jun}$ & "
        r"$N_{dic}$ \\ \midrule",
        *filas_c,
        r"\bottomrule\end{tabular}\end{table}}",
        "",
    ]

    # --- Pruebas de verificación con y sin forzamiento ------------------------------------------
    filas_v = []
    for _, s in sitios.iterrows():
        sitio = s.to_dict()
        res = {}
        for est in (False, True):
            e = nisar.simular(sitio, estacional=est)
            i0, i1 = nisar.intervalo_por_defecto(e)
            a = nisar.analizar(e, i0, i1)
            if e.tipo == "humedales":
                area = np.array([m.sum() for m in e.verdad["inundado"]]) * e.pixel_m ** 2 / 1e6
                res[est] = (f"máx. {fecha(e.fechas[int(area.argmax())])}, mín. {fecha(e.fechas[int(area.argmin())])}")
            elif e.tipo == "incendios":
                hv = e.cubos["HV"]
                control = ~e.verdad["quemado"][-1]
                media = np.array([nisar.a_db(nisar.de_db(hv[k][control]).mean()) for k in range(len(e.fechas))])
                res[est] = f"amplitud HV {num(media.max() - media.min(), 1)} dB"
            elif e.tipo == "terremotos":
                p = e.info["parametros"]
                f = [nisar._factor_atmosfera(p, d) for d in e.info["dias"]]
                lo, hi = p["atmosfera_cm"] * min(f), p["atmosfera_cm"] * max(f)
                res[est] = (f"$\\sigma_{{atm}}$ constante, {num(lo, 2)} cm" if abs(hi - lo) < 1e-9
                            else f"$\\sigma_{{atm}}$ {num(lo, 2)}--{num(hi, 2)} cm")
            elif e.tipo == "subsidencia":
                res[est] = f"RMSE {a.metricas[3][1]}"
            elif e.tipo == "glaciares":
                res[est] = f"retroceso {a.metricas[2][1]}"
            elif e.tipo == "agricultura":
                res[est] = f"exactitud {a.metricas[2][1]}"
        filas_v.append(f"{nisar.TIPOS[sitio['tipo_cambio']].nombre} & {sitio['sitio'].split(' (')[0]} & "
                       f"{res[False]} & {res[True]} \\\\".replace("%", "\\%"))

    # Prueba de invariancia: mover la fecha de referencia no debe mover la temporada
    filas_i = []
    for sid, desplazamiento in (("ec_la_segua", 0), ("ec_la_segua", 90), ("ec_la_segua", 180)):
        sitio = sitios[sitios["id"] == sid].iloc[0].to_dict()
        sitio["fecha_evento"] = pd.Timestamp(sitio["fecha_evento"]) + pd.Timedelta(days=desplazamiento)
        celdas = []
        for est in (False, True):
            e = nisar.simular(sitio, estacional=est, n_antes=15, n_despues=15)
            area = np.array([m.sum() for m in e.verdad["inundado"]])
            # Pico del pulso: máximo del área sin la tendencia de secado (se mide con tasa_secado = 0)
            e0 = nisar.simular(sitio, estacional=est, n_antes=15, n_despues=15, ajustes={"tasa_secado": 0.0})
            area0 = np.array([m.sum() for m in e0.verdad["inundado"]])
            celdas.append(fecha(e0.fechas[int(area0.argmax())]))
        filas_i.append(f"{pd.Timestamp(sitio['fecha_evento']):%d/%m/%Y} & +{desplazamiento} & {celdas[0]} & "
                       f"{celdas[1]} \\\\")
    sitio = sitios[sitios["id"] == "ec_daule"].iloc[0].to_dict()
    filas_a = []
    for desplazamiento in (0, 120):
        sitio_d = dict(sitio)
        sitio_d["fecha_evento"] = pd.Timestamp(sitio["fecha_evento"]) + pd.Timedelta(days=desplazamiento)
        e = nisar.simular(sitio_d, estacional=True)
        evento = pd.Timestamp(sitio_d["fecha_evento"])
        cosechas = sorted({(evento + pd.Timedelta(days=int(d))).month for c in e.info["parcelas"]["cosechas"]
                           for cultivo, d in c if cultivo == "Arroz"})
        meses = ", ".join(estaciones.MESES[m - 1][:3] for m in cosechas)
        filas_a.append(f"{evento:%d/%m/%Y} & +{desplazamiento} & {meses} \\\\")

    lineas += [
        r"\newcommand{\TablaVerificacion}{%",
        r"\begin{table}[htbp]\centering\footnotesize\setlength{\tabcolsep}{4pt}",
        r"\caption{Verificación: indicadores de cada escenario de Ecuador sin forzamiento estacional (fase "
        r"fija heredada) y con forzamiento climatológico. Semilla 7, 12 \emph{looks}, órbita ascendente.}"
        r"\label{tab:verificacion}",
        r"\begin{tabular}{@{}llll@{}}\toprule Tipo & Sitio & Fase fija & Forzamiento estacional \\ \midrule",
        *filas_v,
        r"\bottomrule\end{tabular}\end{table}}",
        "",
        r"\newcommand{\TablaInvariancia}{%",
        r"\begin{table}[htbp]\centering\small",
        r"\caption{Prueba de invariancia: fecha del máximo del pulso de inundación en La Segua (sin tendencia "
        r"de secado) al desplazar la fecha de referencia. Con fase fija el pico se desplaza con la fecha; con "
        r"forzamiento permanece en la época lluviosa.}\label{tab:invariancia}",
        r"\begin{tabular}{@{}lrll@{}}\toprule Fecha de referencia & $\Delta$ (días) & Pico con fase fija & "
        r"Pico con forzamiento \\ \midrule",
        *filas_i,
        r"\bottomrule\end{tabular}",
        r"\par\medskip",
        r"\begin{tabular}{@{}lrl@{}}\toprule Fecha de referencia (Daule) & $\Delta$ (días) & Meses de cosecha "
        r"de arroz \\ \midrule",
        *filas_a,
        r"\bottomrule\end{tabular}\end{table}}",
        "",
    ]

    # --- Partición espacial (informe de teoría): artefactos de resultados/particion_espacial ------
    carpeta = RAIZ / "resultados" / "particion_espacial"
    reporte = json.loads((carpeta / "split_report.json").read_text(encoding="utf-8"))
    config = yaml.safe_load((carpeta / "split_config.yaml").read_text(encoding="utf-8"))
    huella = (carpeta / "split_hash.txt").read_text(encoding="utf-8").strip()
    tabla_split = pd.read_csv(carpeta / "spatial_split.csv")
    nombres_conj = {"train": "Entrenamiento", "val": "Validación", "test": "Prueba",
                    "excluded_buffer": "Excluido por buffer"}
    total_area = sum(reporte["surface_area_m2_by_set"].values())
    filas_p = []
    for clave, nombre in nombres_conj.items():
        n = int(reporte["counts_by_set"].get(clave, 0))
        area = float(reporte["surface_area_m2_by_set"].get(clave, 0.0))
        recortado = float(tabla_split.loc[tabla_split["split_set"] == clave, "buffer_trimmed_area_m2"].sum())
        filas_p.append(f"{nombre} & {n} & {num(area / 1e6, 2)} & {num(100 * area / total_area, 1)} & "
                       f"{num(recortado / 1e6, 2)} \\\\")
    lineas += [
        r"\newcommand{\TablaParticion}{%",
        r"\begin{table}[htbp]\centering\small",
        rf"\caption{{Resultado de la partición de demostración: {config['total_blocks_generated']} bloques de "
        rf"{num(config['block_size_m'] / 1000, 0)}~km, buffer de {num(config['buffer_m'], 0)}~m y semilla "
        rf"{config['seed']}. Superficie efectiva tras el recorte por buffer.}}\label{{tab:particion}}",
        r"\begin{tabular}{@{}lrrrr@{}}\toprule Conjunto & Bloques & Superficie (km$^2$) & \% superficie & "
        r"Recortado (km$^2$) \\ \midrule",
        *filas_p,
        r"\bottomrule\end{tabular}",
        r"\par\smallskip{\scriptsize Huella SHA-256: \texttt{" + huella[:32] + r"}\allowbreak\texttt{"
        + huella[32:] + "}}",
        r"\end{table}}",
        r"\newcommand{\BufferDemo}{" + num(config["buffer_m"], 0) + "}",
        r"\newcommand{\BloqueDemo}{" + num(config["block_size_m"], 0) + "}",
        "",
    ]

    SALIDA.write_text("\n".join(lineas), encoding="utf-8")
    print(f"Escrito {SALIDA}")


if __name__ == "__main__":
    main()
