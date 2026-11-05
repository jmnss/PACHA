# Laboratorio del radar, recorrido guiado y cierre de la migración — diseño

Aprobado en chat por el equipo (2026-11-05) con revisión del spec y del plan preaprobada («hazlo autónomo»).

## Objetivo
Mostrar al jurado, con honestidad, **por qué un radar de apertura sintética sirve** (ve a través de nubes,
distingue superficies según polarización y banda) y cerrar la migración de Streamlit a React.
Todo sirve a `docs/challenge.md`: «polarizaciones y frecuencias», «qué polarización resalta el cambio»,
«narrativa convincente», «público amplio».

## Piezas
1. **Laboratorio** (`/laboratorio`), dos vistas por `?vista=`:
   - `nubes` — «La nube no lo detiene»: una escena sintética genérica (llanura inundable, no un lugar real)
     con una inundación a cielo abierto y otra bajo dosel. Un deslizador de cobertura de nubes tapa la imagen
     óptica simulada; el radar no cambia. Métricas: % del cambio detectado por cada sensor y % tapado.
     Honesto: aun sin nubes el óptico no ve el agua bajo el dosel.
   - `polarizacion` — selector de polarización (HH/HV/VV) y banda (L/S): la escena en σ⁰, barras de respuesta
     por superficie y qué polarización resalta cada cambio (calculado, no escrito a mano).
2. **Recorrido** (`/recorrido`): guion declarativo de pasos; cada paso incrusta una pantalla real
   (`?incrustado=1` oculta el riel) con subtítulo, pausa, salto y teclado; respeta `prefers-reduced-motion`.
3. **Fundamentos** (`/fundamentos`) y **Estación y temporada** (`/estacion`): cierran la paridad N2.
4. Validación sigue fuera (pendiente de decisión del equipo).

## Arquitectura
- `datos/laboratorio.py`: escena y modelos ilustrativos en numpy puro, con semilla fija; devuelve `CapaRaster`
  con `Origen(tipo="sintetico")`. No toca `modelo/`.
- `api/rutas/laboratorio.py` + `api/schemas_laboratorio.py`: `GET /api/laboratorio/nubes` y
  `GET /api/laboratorio/respuesta`. Sin estado; sin proveedor.
- Frontend: solo pinta (`PanelRadar`, `Barras`, `Deslizador`). Tipos desde OpenAPI.

## Honestidad
- Todo con sello sintético y banda de demostración (las consultas activan `hay_sinteticos` como el simulador).
- Coeficientes de retrodispersión **ilustrativos**, no mediciones; la banda S se marca «pendiente de confirmar
  con la documentación oficial» y no se afirma qué entrega NISAR.
- Ningún dato o fecha de la misión se da por cierto.

## Pruebas
pytest de `datos/laboratorio` y de la API (determinismo, cobertura exacta, radar invariante a las nubes,
óptico decreciente, 422 en entradas inválidas), vitest de pantallas y del guion, e2e de laboratorio y recorrido,
revisión visual a 1440/768/390.
