# Contrato de datos

Vive en `datos/contrato.py`. Es lo que la interfaz necesita, venga de donde venga: el proveedor `demo`
(sintético) o el `real` (esqueleto). La API solo habla con estos modelos. Todo dato lleva su `Origen`.

Convenciones: `bbox = (oeste, sur, este, norte)` en WGS84, con oeste < este y sur < norte. Los instantes
son UTC. Las rejillas son 2D `float32`, con `NaN` = sin dato (la API las cuantiza a uint8 para viajar).

## Modelos

| Modelo | Qué es |
|---|---|
| `Origen` | De dónde sale el dato. `tipo` es `"sintetico"` o `"real"`; `fuente`, `producto`, `generador`, `version`, `semilla`, `fecha_generacion` (con zona horaria obligatoria), `notas`. `tipo="sintetico"` obliga a mostrar la banda «DATOS DE DEMOSTRACIÓN». |
| `Adquisicion` | Una pasada: `id`, `instante` (UTC, con zona horaria obligatoria), `direccion_orbital` (opcional), `polarizaciones`. |
| `Capacidades` | `simulacion`, `modelo_continuo`, `verdad_terreno` (booleanos; el proveedor real los tendrá en `false`). |
| `Escenario` | Un caso de estudio: `id`, `nombre`, `tipo_cambio`, `historia` (`inundacion`, `incendio` o nulo), `region`, `bbox`, `resolucion_m` (metros por píxel, > 0), `polarizaciones`, `variables`, `adquisiciones` (al menos una), `capacidades`, `origen`. |
| `CapaRaster` | Rejilla 2D con `variable`, `polarizacion`, `unidad`, `paleta` (`gris`, `secuencial`, `divergente`, `ciclico`, `categorias`), `vmin`/`vmax`, `leyenda` (lista de pares `(etiqueta, color)`; el código de categoría es la posición + 1), `datos` (solo lectura, copia propia), `bbox`, `origen`. Inmutable; valida 2D, paleta, `vmin <= vmax` finitos y `bbox`. Opcional `instante` (UTC con zona): lo llevan los fotogramas del modelo continuo; en capas de adquisición es nulo. |
| `SerieTemporal` | `titulo`, `unidad`, `puntos` = lista de `(instante, valor, serie)`, `origen`. |
| `Metrica` | `etiqueta`, `valor` (texto ya formateado), `unidad`, `ayuda` (explicación en español llano). |
| `ResultadoCambio` | Es un dataclass inmutable, no pydantic, porque contiene `CapaRaster` (que lleva `np.ndarray`). `antes`, `despues`, `cambio`, `clasificacion` (opcional), `metricas`, `series`, `notas`, `origen`. Campos opcionales (por defecto vacíos): `tablas`, `vectores`, `capas_extra`. |
| `TablaResultado` | `titulo`, `columnas`, `filas` (celdas texto, número o nulo), `origen`. Ej.: resultados por parcela (agricultura). |
| `CampoVectorial` | Flechas de flujo: `x`, `y` en km respecto al centro de la escena (y hacia el norte), `u` (este) y `v` (norte) en `unidad`, mismas longitudes, `origen`. Ej.: velocidad del hielo (glaciares). |
| `Medicion` | Medición sobre `cuadrante` (fila0, fila1, col0, col1, en píxeles) **o** `punto` (fila, columna); exactamente uno. `metricas` y `tabla` (filas `{columna: texto, número o nulo}`; el nulo es una celda sin valor, p. ej. «% del cuadrante»), `origen`. |
| `ProveedorDatos` | Protocolo: `nombre`, `escenarios`, `escenario`, `capa`, `cambio`, `medir`. Opcional si `capacidades.simulacion`: `simular`, `fotogramas`. De conveniencia (el demo las ofrece): `intervalo_por_defecto(escenario_id) -> (antes_id, despues_id)` y `serie_seleccion(escenario_id, cuadrante, punto) -> SerieTemporal | None`. |

`capas_extra` en el proveedor demo: terremotos (interferograma envuelto, coherencia) y subsidencia
(desplazamiento LOS acumulado, error frente a la verdad sintética).

Escenarios simulados (proveedor demo): `simular(id, parametros)` devuelve un `Escenario` con id derivado
`<base>~<huella>` (huella SHA-256 (12 hex) de los parámetros normalizados). `capa`, `cambio`, `medir`, `fotogramas` y
`escenario` lo resuelven mientras esté en el registro (acotado a 32; luego `KeyError`). Parámetros vacíos o
iguales a los de demostración devuelven el id base. Con `lat` y `lon` coloca un punto del mapa.
`fotogramas` sobre un id derivado exige `parametros` vacíos.

Excepciones: `DatosRealesNoDisponibles` (el proveedor real aún no está integrado) y
`CapacidadNoDisponible` (el proveedor no ofrece esa operación). Ambas derivan de `RuntimeError`.

## Ejemplos

```python
origen = Origen(tipo="sintetico", fuente="demo", generador="scripts/generar_datos_demo.py",
                semilla=7, fecha_generacion=datetime.now(timezone.utc))
capa = CapaRaster("costa-1", "a1", "sigma0", "HH", "dB", "gris", -25.0, 0.0, None,
                  np.zeros((64, 64), np.float32), (-80.0, -3.0, -79.0, -2.0), origen)
```

## Pendiente de confirmar con la documentación oficial de NISAR

La proyección y la rejilla de los productos reales; los nombres exactos de las polarizaciones y sus
unidades (σ⁰ o γ⁰, lineal o dB); el valor de «sin dato»; la dirección orbital y su codificación; el
tamaño típico de un producto; los productos disponibles y su formato. El contrato no depende de ninguno.
