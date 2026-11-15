# Parte B · Datos reales del equipo en la interfaz (sin demostración) · Plan

Fecha: 2026-11-15 · rama `datos-equipo` (worktree `../PACHA-datos`), después de la parte A
(`2026-11-15-datos-equipo-incendio-embalses.md`, T1–T5) · interfaz del rediseño (`2026-11-15-rediseno-t1b-t9.md`).

## Decisiones del usuario (2026-11-15)

1. **Los datos del equipo se muestran como NISAR reales** (GCOV, banda L, HH/HV, procesados por el equipo), **sin aviso
   de procedencia incompleta**. El sello muestra solo lo que se sabe (producto, fecha, polarizaciones, «procesado por el
   equipo PACHA»). Lo que no se sabe (id de granulo, colección, frecuencia, madurez, hora UTC) **se omite**; nunca se
   inventa (regla 6). Cuando el equipo dé los `.h5`, esos campos aparecen solos.
2. **Fuera la banda «DATOS DE DEMOSTRACIÓN»** y todo dato sintético de las pantallas de datos: escenarios demo (La
   Segua y los seis tipos de cambio) y sustitutos sintéticos salen del Observatorio, de las Historias y de Inicio.
3. **Simulador y Laboratorio se quedan como simulación**, con un rótulo «Simulación» en su pantalla (no la banda).
   El paso «Simular» de las historias usa ese rótulo.
4. Prioridad: velocidad. Verificación: pytest de lo tocado + `pytest tests -q` al final de cada tarea de Python;
   vitest de lo tocado, lint y build en las de frontend; e2e solo las que se rompan por las rutas o los escenarios.

## Global Constraints

- Regla 6: nada de NISAR que no esté en `docs/nisar-verificado.md`. Nada de fechas, granulos ni cifras inventadas.
- Las hipótesis sobre los datos reales se redactan como hipótesis (p. ej. «el área marcada sugiere…»), sin avisos de
  «incompleto». Un evento real (incendio del Casitagua, 17 sep 2026) se nombra con su fuente si la hay; si no, sin fecha.
- Nada de lógica científica en el frontend: las cifras y su lectura llegan de la API.
- `datos/` compatible con Pyodide. Presupuesto de `data/` < 10 MB.

## B1 · Contrato y proveedor (Sonnet) — `feat(datos-reales): los datos del equipo se sirven como NISAR sin demo`
- `datos/contrato.py`: nueva clase de origen `nisar_equipo` (o el mismo `nisar` con exigidos reducidos, lo que rompa
  menos): exige `producto`, `fecha_adquisicion` (fecha sola permitida) y `polarizaciones`; `granulos`, `coleccion`,
  `frecuencia`, `madurez` opcionales. `Origen.tipo = "real"`.
- `ProveedorDerivados`: sirve los tres sitios con lo que haya en `procedencia.json` (sin exigir granulos).
- `ProveedorMixto` → por defecto **solo** los escenarios reales del equipo (sin sustitutos ni demo). `NISAR_PROVEEDOR=demo`
  sigue existiendo para pruebas. El Simulador no depende del proveedor de escenarios (comprobar).
- Pruebas: escenarios por defecto = `embalse-mazar`, `embalse-daule-peripa`, `incendio-casitagua`, todos `real`; un
  sello sin granulo no lleva campos vacíos.

## B2 · Precisión científica en la API (Opus) — `feat(datos-reales): métricas y lecturas de los datos del equipo`
- Embalses: superficie de agua por fecha (km², medida en la rejilla nativa de la máscara), variación absoluta y
  relativa, serie de superficie; σ°/γ° HH y HV en dB por fecha con su rango real (percentiles 2–98 para la escala).
- **Comparación Mazar – Daule-Peripa** (fase 2, Task 2): misma métrica, mismas fechas más cercanas, con la diferencia de
  días entre fechas explícita.
- Incendio: área marcada por la máscara del equipo (km²) y ΔRFDI (antes − después; positivo = menos vegetación):
  mediana dentro y fuera del área marcada. Lecturas en palabras (`lectura_texto`) redactadas como hipótesis.
- Fichas de sitio (fase 2, Task 1) **solo con dato y URL citada** (capacidad, potencia, río, provincia; fuente
  pública: CELEC EP, ministerio, artículo). Lo que no tenga fuente, no va. Se permite WebSearch para encontrar fuentes.
- Claves de texto nuevas en `datos/claves.py` → `api/claves.json`.

## B3 · Interfaz sin demostración (Opus) — `feat(datos-reales): interfaz con los datos reales del equipo`
- Quitar `BandaDemostracion` de `Estructura.tsx` y los sellos «demostración» de Inicio, Historias y Observatorio;
  `SelloOrigen` muestra para `real`: «NISAR · GCOV · HH/HV · <fecha> · procesado por el equipo PACHA» (+ granulo y madurez
  solo si vienen).
- Simulador y Laboratorio: rótulo «Simulación» visible y fijo en la pantalla (en sus tres idiomas), no banda global.
- Inicio: el «Registro de pasadas» usa las fechas reales de las adquisiciones del API (sin «ilustrativo»); el perfil
  oeste-este sale del relieve real (Copernicus DEM 30 m, ya usado en la fase 1: precalcular un perfil por las tres
  latitudes en `data/perfil_ecuador.json` con `procedencia`, fuera de línea) y se rotula con su fuente; si no da tiempo,
  quitar el rótulo «esquemático» solo cuando el perfil sea real. Las cifras de las tarjetas vienen del API.
- Historias: paso «Lo que ve el satélite» con HH/HV en dB antes/después; incendio con la imagen «después», la máscara de
  quemado y la capa ΔRFDI (con `Termino` que explique RFDI); embalses con la comparación Mazar – Daule-Peripa y las
  fichas con fuente. **Quitar los huecos «Por llegar»** (lo que no se rellene, desaparece). Paso «Simular» con rótulo
  «Simulación» y enlace a `/simular`.
- Observatorio: solo los tres escenarios; ocultar las vistas sin datos (Serie si hay < 3 fechas, Impacto, Simulación
  del modelo) y los «Parámetros avanzados» del generador sintético (semilla, ENL, órbita) que ya no aplican.
- Recorrido, Fundamentos y Laboratorio: textos sin La Segua ni «datos de demostración»; la escala de grises y los
  ejemplos usan los sitios reales.
- Claves es/en/qu (kichwa borrador) y re-exportar el CSV.

## B4 · Pages, pruebas y documentos (Sonnet) — `chore(datos-reales): Pages, pruebas y reglas al día`
- `frontend/scripts/precalcular.mts` y el zip del motor con los escenarios reales (incluye `data/embalses/**`,
  `data/incendios/**`, el perfil); `bash scripts/construir_pages.sh` sin errores.
- Pruebas que dependían del demo: fijarlas con `NISAR_PROVEEDOR=demo` o pasarlas a los escenarios reales.
- `CLAUDE.md` regla 7 reescrita según las decisiones de arriba (datos del equipo como NISAR con lo que se sabe; sin
  banda; simulación rotulada). `docs/retomar.md` e `INFORME.md` al día.

## Pendiente del equipo (no se muestra en la interfaz)
- Nombres de los `.h5` por fecha (para completar granulo, colección, frecuencia, madurez y hora UTC).
- Confirmar fechas supuestas: Daule-Peripa 2026-10-12 (por descarte) y Mazar 2026-10-29 (del nombre del archivo).
- Fuente publicada del incendio del Casitagua del 17 sep 2026.

## Orden
Parte A (T1–T5) → B1 → B2 → B3 → B4 → integrar `datos-equipo` en `rediseno-pacha`.
