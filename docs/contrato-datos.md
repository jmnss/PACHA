# Contrato de datos

Vive en `datos/contrato.py`. Es lo que la interfaz necesita, venga de donde venga: el proveedor `demo`
(sintético) o el `real` (esqueleto). La API solo habla con estos modelos. Todo dato lleva su `Origen`.

Convenciones: `bbox = (oeste, sur, este, norte)` en WGS84, con oeste < este y sur < norte. Los instantes
son UTC. Las rejillas son 2D `float32`, con `NaN` = sin dato (la API las cuantiza a uint8 para viajar).

## Modelos

| Modelo | Qué es |
|---|---|
| `Origen` | De dónde sale el dato. `tipo` es `"sintetico"` o `"real"`; `fuente`, `producto`, `generador`, `version`, `semilla`, `fecha_generacion`, `notas`. `tipo="sintetico"` obliga a mostrar la banda «DATOS DE DEMOSTRACIÓN». |
| `Adquisicion` | Una pasada: `id`, `instante` (UTC), `direccion_orbital` (opcional), `polarizaciones`. |
| `Capacidades` | `simulacion`, `modelo_continuo`, `verdad_terreno` (booleanos; el proveedor real los tendrá en `false`). |
| `Escenario` | Un caso de estudio: `id`, `nombre`, `tipo_cambio`, `historia` (`inundacion`, `incendio` o nulo), `region`, `bbox`, `resolucion_m` (metros por píxel, > 0), `polarizaciones`, `variables`, `adquisiciones` (al menos una), `capacidades`, `origen`. |
| `CapaRaster` | Rejilla 2D con `variable`, `polarizacion`, `unidad`, `paleta` (`gris`, `secuencial`, `divergente`, `ciclico`, `categorias`), `vmin`/`vmax`, `leyenda` (pares código-etiqueta, color), `datos`, `bbox`, `origen`. Inmutable; valida 2D, paleta, `vmin <= vmax` y `bbox`. |
| `SerieTemporal` | `titulo`, `unidad`, `puntos` = lista de `(instante, valor, serie)`, `origen`. |
| `Metrica` | `etiqueta`, `valor` (texto ya formateado), `unidad`, `ayuda` (explicación en español llano). |
| `ResultadoCambio` | `antes`, `despues`, `cambio`, `clasificacion` (opcional), `metricas`, `series`, `notas`, `origen`. |
| `Medicion` | Medición sobre `cuadrante` (fila0, fila1, col0, col1, en píxeles) **o** `punto` (fila, columna); exactamente uno. `metricas` y `tabla` (filas `{columna: texto o número}`), `origen`. |
| `ProveedorDatos` | Protocolo: `nombre`, `escenarios`, `escenario`, `capa`, `cambio`, `medir`. Opcional si `capacidades.simulacion`: `simular`, `fotogramas`. |

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
