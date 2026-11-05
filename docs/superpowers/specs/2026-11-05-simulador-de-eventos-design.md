# Simulador de Eventos (antes «Modo Dios») — diseño

Fecha: 2026-11-05 · Rama `migracion-react` · Estado: **pendiente de revisión del usuario**

## Intención (acordada con el usuario)

Conservar el Modo Dios de la app Streamlit (`interfaz/modo_dios.py`, motor `modelo/desastres.py`), migrarlo a
React, **renombrarlo «Simulador de Eventos»** (nombre neutro, sin carga religiosa) y convertirlo en el
diferenciador del equipo: que sirva a educadores y gestores y no solo cumpla el challenge.
Alcance de esta noche: **la base + ideas 1, 2 y 6** (abajo). A/B de decisiones, cascadas y retos
educativos quedan como fase 2.

Sirve a `docs/challenge.md`: hipótesis de impulsores físicos y humanos, qué polarización resalta cada
cambio, aplicaciones futuras de NISAR, público amplio, elementos interactivos. Cubre los seis tipos de
cambio con eventos (incendio, inundación, deslizamientos por tormenta, deformación por terremoto, lahar y
ceniza por erupción).

## Honestidad (no negociable)

- Todo lo que sale del simulador es **sintético**: `origen.tipo = "sintetico"`, fuente «Simulador de
  eventos (modelos físicos publicados sobre relieve SRTM)»; la banda de demostración, los sellos y las
  exportaciones (PNG, informe) llevan la marca. El relieve SRTM y la población son complementarios; el
  relieve real no vuelve «real» al evento.
- «Lo que vería NISAR» es una **simulación del radar**, no una observación. Los textos hablan de
  «un radar como NISAR» y no afirman parámetros de la misión.
- El ciclo de repetición de 12 días (`nisar.CICLO_DIAS`) es un **supuesto pendiente de confirmar con la
  documentación oficial**. La idea 2 lo presenta como tal.
- Modelos y referencias de cada evento se muestran (`Evento.modelos`); ninguna cifra de eventos reales.

## Arquitectura

```
modelo/desastres.py (sin cambios)     motor físico + paneles radar
datos/simulador.py        (nuevo)     puente: crea mundos, ejecuta eventos, serializa; sin estado
api/rutas/simulador.py    (nuevo)     /api/simulador/*  (solo habla con datos/simulador.py)
frontend/src/pantallas/simulador/     pantalla nueva, ruta /simulador
```

`datos/simulador.py` es independiente de `NISAR_PROVEEDOR`: el simulador es sintético por naturaleza.
Mantiene la regla «la API solo habla con `datos/`». `modelo/` no se modifica salvo un error con su prueba.
La física y la colorización viven en el servidor; el frontend no calcula nada científico.

### API (todas bajo `/api/simulador`, sin estado, caché LRU acotada)

| Ruta | Respuesta |
|---|---|
| `GET /catalogo` | herramientas (id, nombre, controles con rango/defecto/ayuda/unidad), mundos predefinidos (`desastres.ESCENARIOS`), volcanes, extensiones permitidas |
| `POST /mundo` `{lat, lon, extension_km, fecha, usar_dem, ciudades[]}` | `MundoDto`: id estable (hash), `n`, bbox, región, fuente del relieve, píxel (m), habitantes, humedad, temporada, relieve como PNG base64, marcas (ciudades, volcanes), `origen` |
| `POST /evento` `{mundo, herramienta, celda:[i,j], parametros}` | `EventoDto`: título, cuadros (PNG RGBA base64 ≤ 48) con `tiempos`, leyenda por capa, métricas, tabla, notas, modelos, paneles de radar (`CapaDto`), métricas de detección, `espera_radar`, `origen` |
| `POST /ciudad` | mundo nuevo con la ciudad fundada (herramienta «Fundar ciudad») |

Validación: `lat/lon` dentro de Ecuador (`datos/geografia.py`), `extension_km ∈ {20,30,40,60,80,120}`,
parámetros dentro del rango del catálogo (422 en español), `celda` dentro de la malla, ≤ 8 ciudades
extra, nombres ≤ 40 caracteres. Descarga de teselas SRTM: es red saliente de datos abiertos (AWS Open
Data) que el proyecto ya usa; si falla, terreno sintético fractal y el mundo lo declara.
Pruebas con `usar_dem=false` y sin red.

### Pantalla `/simulador`

Riel de navegación nuevo («Simulador»). Tres zonas:
1. **Mundo:** selector de mundos predefinidos / coordenadas (clic en mapa reutilizable), lado, fecha de
   temporada, relieve real o sintético, «Crear mundo». Chips con región, relieve, habitantes, suelo.
2. **Tablero:** relieve + capas animadas, clic para desatar, herramienta y parámetros (con `Termino` para
   cada concepto), reproductor reutilizando `usePlayback`/`ControlesReproductor`, leyenda por capa.
3. **Resultados:** KPIs y tabla de efectos, referencias, bitácora (en el navegador, `localStorage`
   envuelto en try/catch, exportable a CSV con cabecera de origen), PNG final con franja.

### Las tres ideas diferenciadoras de esta noche

**1 · Gemelo del radar.** Tras cada evento, «Lo que vería un radar como NISAR»: si los dos primeros
paneles comparten paleta y rango (incendio: HV antes/después; inundación y tormenta: HH antes/pico), se
muestran en el **comparador deslizante** existente, con la polarización nombrada y una frase de por qué
resalta el cambio (misma lógica de `Historias`); si no (terremoto: deformación; erupción: ceniza/flujos),
se muestran los paneles en rejilla con su leyenda. Debajo, las métricas de detección con el rótulo
«frente a la verdad sintética».

**2 · ¿Cuándo lo vería NISAR?** Tarjeta «Espera hasta la primera imagen»: con el ciclo supuesto de 12
días, un evento ocurre en cualquier punto del ciclo, así que la espera es de 0 a 12 días (media 6).
Gráfico de barras de la espera por instante y comparación con la duración del evento simulado («el
incendio dura 24 h; el radar llegaría después de 0–12 días»). Texto: «Ciclo supuesto de 12 días,
pendiente de confirmar con la documentación oficial». Se calcula en el servidor
(`espera_radar: {ciclo_dias, minimo_dias, maximo_dias, medio_dias, duracion_evento_h, verificado: false}`);
reemplaza el sorteo aleatorio del código heredado, que es engañoso, por un valor determinista.

**6 · Compartir.** El escenario viaja en la URL (`/simulador?lat&lon&ext&fecha&dem&h&i&j&p=…`), con los
parámetros validados al leer (ignora inválidos, como `useEstadoUrl`). Botón «Copiar enlace» y
**«Informe de una página»**: PNG con relieve + estado final + KPIs + sello y franja de demostración.
Quien abre el enlace recrea el mundo y el evento (determinista por semilla).

## Fuera de alcance esta noche (fase 2)

A/B de decisiones (cortafuegos, dique, evacuación), cascadas multi-evento y retos educativos.
Necesitan sus propios diseño y pruebas; el contrato de `EventoDto` no los impide.

## Pruebas

- `tests/datos/test_simulador.py`: mundo y evento con `usar_dem=false` son deterministas por semilla; cada
  herramienta devuelve cuadros, métricas y origen sintético; `espera_radar` determinista y con
  `verificado=false`; rangos rechazados.
- `tests/api/test_simulador.py`: catálogo, 422 en español (fuera de Ecuador, parámetro fuera de rango,
  celda fuera de malla, demasiadas ciudades), `origen` en toda respuesta, caché.
- Frontend (vitest): URL ida y vuelta e inválidos ignorados; el comparador aparece solo con paneles
  compatibles; la marca de demostración está en el PNG/informe y en el CSV de la bitácora; la tarjeta de
  espera muestra «pendiente de confirmar».
- e2e (Playwright, 1440 y 390): crear mundo, desatar un incendio, ver el comparador, copiar enlace.
- Revisión visual `bash scripts/revision_visual.sh /simulador simulador` (0 FAIL, tres anchos).

## Riesgos

- Coste de CPU de `desatar` con mallas de 160×160: ya funciona hoy en Streamlit; se acota con caché y
  `n` fijo. Descarga de DEM con red lenta: estado de carga y fallback sintético.
- Tamaño de la respuesta de `/evento` (48 PNG): se mide; si pesa, se reduce el número de cuadros.
- Paridad con `interfaz/modo_dios.py` (herramientas, parámetros, bitácora, PNG): se verifica al cierre.
