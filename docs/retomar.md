# Retomar el trabajo (resumen para una sesión nueva)

Actualizado: 2026-11-14 (cierre de la fase 1). Léelo antes que `INFORME.md` (que es largo e histórico).

## Qué es y dónde está

- **PACHA** (antes «NISAR · Ecuador»): app web para el NASA Space Apps «Dancing with the SARs». Repo
  `jmnss/PACHA` (la carpeta local se sigue llamando `NISAR-Ecuador`). Publicada en `https://jmnss.github.io/PACHA/`;
  cada push a `main` despliega (flujo `.github/workflows/pages.yml`, base `PAGES_BASE` = nombre del repo).
- Historia completa en `main` (se unió la historia anterior; la carpeta `../modelo clima/` es la copia vieja, ya no
  hace falta). La app Streamlit se retiró: etiqueta `legado-streamlit`.
- Ramas: `main` (publicada), **`embalses` (trabajo actual)**, `datos-reales` (= main), `migracion-react` (historia vieja).

## Datos reales del equipo en la interfaz (2026-11-15, rama `datos-equipo`)

Parte B (`docs/superpowers/plans/2026-11-15-parte-b-datos-reales-en-la-interfaz.md`): `mixto` sirve solo Mazar,
Daule-Peripa y Casitagua como NISAR del equipo, sin demo. Historias leen `/resumen` y `/comparacion/embalses`
(ficha con fuentes, γ⁰ HH/HV, máscara, ΔRFDI, lecturas como hipótesis); Observatorio sin Impacto ni Serie (< 3 fechas).
Pages: `PRECALCULO_PUERTO=8766 bash scripts/construir_pages.sh`. Pendientes en `INFORME.md` («Parte B»).

## Rediseño hecho (2026-11-15, rama `rediseno-pacha`)

T1b–T9 del plan `docs/superpowers/plans/2026-11-15-rediseno-t1b-t9.md` integrados con verificación reducida (ver
`INFORME.md`, «Rediseño «Tierra viva»»). Rutas: `/`, `/explorar/historias`, `/explorar/observatorio`, `/simular`,
`/aprender/*`. Falta el cierre T8 completo (Playwright, axe, Pages) y reconciliar las fases 2–5 con la interfaz nueva.

## (Histórico) En pausa: fase 2 hasta rediseñar la UX (2026-11-14)

**Decisión del usuario:** antes de empezar la fase 2 (`docs/superpowers/plans/2026-11-14-fase2-pagina-embalses.md`,
que ya trabaja con frontend) hay que pasar por un proceso de cambios de interfaz: la UI actual carece de
propiedades intuitivas y de UX. Ese trabajo se hace en **otro chat**; la fase 2 **no se empieza** hasta que el
usuario lo diga.

**Al retomar:**
1. Leer qué cambió el rediseño en el frontend (`git log`, `docs/diseno.md`) y **reconciliar el plan de la fase 2**
   (y quizá 3–5) con la interfaz nueva antes de ejecutarlas: sus rutas, componentes y pruebas pueden haber cambiado.
2. La fase 1 (datos) no depende de la UI: ids `embalse-mazar`, `embalse-daule-peripa`, `incendio-casitagua`,
   proveedor `mixto` por defecto, derivados en `data/embalses/` y `data/incendios/` (1,58 MB).
3. Pendientes de la fase 1 (equipo y menores aplazados): ver la sección «Fase 1» más abajo.
4. Modelos de subagentes: `sonnet` para implementar tareas bien especificadas; `opus` para revisiones y
   razonamiento (también la revisión final de rama).
5. Para ver la app: `source scripts/entorno.sh && (cd frontend && npm run build) && python servidor.py` → http://localhost:8000.

## Decisión del equipo (2026-11-14)

- La app se centra en **embalses y lluvia** y en **incendios**: una página con dos opciones intercambiables (datos,
  lo que ve el satélite, simular, impactos). Sustituye a la historia de inundación de La Segua.
- El equipo segmenta el agua con su propio método (no supervisado); **la app solo lee sus resultados**, no recalcula.

## Estado de los datos reales

- Reglas 5–7 de `CLAUDE.md` reescritas para la fase de datos reales; lo verificado de NISAR, en `docs/nisar-verificado.md`.
- Catálogo (solo metadatos): `docs/catalogo-ecuador.md` (`scripts/explorar_catalogo.py`). NISAR GCOV cubre Ecuador de
  forma regular del 17 jun al 5 nov 2026 (PROVISIONAL y VALIDATED), solo HH y HV (sin VV), 1,2–7,6 GB por granulo.
  Embalses con cobertura (coordenadas aproximadas): Daule-Peripa, La Esperanza, Poza Honda, Chongón, Mazar, Amaluza,
  Pisayambo. También hay SME2 (humedad del suelo).
- Incendios 2026 en Loja con fuente: SNGR vía El Comercio (21 oct 2026, 5 490 ha en Loja en el año) y Teleamazonas
  (1 oct 2026, Sucre y Carigán). El incendio de 3 709 ha en Vilcabamba es de 2024: descartado.
- **No hay credencial de Earthdata todavía**: no se ha descargado nada de NISAR.
- Primera entrega del equipo (Mazar) evaluada en `docs/datos-equipo-embalses.md`: la máscara está bien alineada, pero
  marca ~20 % de la escena como agua (incluye zonas oscuras que no son agua), y faltan fechas y procedencia; el CSV no
  sirve sin geometría. Ahí está el formato pedido. Esa máscara fue una **prueba de formato** (válida); el equipo hará segmentación supervisada. Las
  clases van como códigos en el TIF y sus nombres («agua», «no agua») en `procedencia.json`.

## Pendientes (en orden)

1. **Ejecutar los planes por fases** (spec `docs/superpowers/specs/2026-11-14-embalses-incendios-design.md`; planes en
   `docs/superpowers/plans/2026-11-14-fase{1..5}-*.md`, pensados para que los ejecute Sonnet). Sitios: Mazar y
   Daule-Peripa (embalses, comparados) y Casitagua (incendio del 17 sep 2026).
2. **Del equipo:** fecha de la primera máscara de Mazar (`Clas_Super.tif`), `procedencia.json` de cada fecha, stack
   HH/HV del 29 oct, entregas de Daule-Peripa y de Casitagua (antes y después del 17 sep 2026). Ver
   `docs/datos-equipo-embalses.md`.
3. Credencial de Earthdata (la crea el usuario) si hace falta leer granulos. Disco del usuario: ~10 GB como máximo.
4. Equipo: licencia (MIT provisional), Validación, requisitos de entrega (`docs/entrega.md`, por hacer), kichwa sin
   validar.

## Cómo correr

```bash
cd ~/NASA2026/NISAR-Ecuador && source scripts/entorno.sh
python -m pip install -r requirements.txt -r requirements-api.txt      # primera vez
cd frontend && npm ci && npm run build && cd .. && python servidor.py   # http://localhost:8000
# desarrollo: python servidor.py  +  (otra terminal) cd frontend && npm run dev   → http://localhost:5173
# sitio de Pages: bash scripts/construir_pages.sh && cd frontend && npx vite preview --outDir dist-pages --base /PACHA/
```

Pruebas (todas en verde el 2026-11-14): pytest 382 (+2 omitidas), unittest 13 OK, vitest 624, lint, build,
Playwright 93, Pages 11. Revisión visual: `bash scripts/revision_visual.sh <ruta> <nombre>` (la Taste Skill está en
`.claude/skills/`).

## Fase 1: datos de embalses e incendio (cerrada, rama `embalses`)
**Hecho.** Contrato con procedencia (`datos.contrato`); `preparacion/` (sitios, entrada del equipo, rejilla, medidas, relieve Copernicus, salida) y `scripts/preparar_embalses.py`, que escribe `data/embalses/<sitio>/` y `data/incendios/<sitio>/` (`sitio.json`, `<AAAAMMDD>.npz`, `dem.npz`, `curva.json`, `contorno.geojson`; ~1,6 MB de 10). Proveedores `derivados` (reales del equipo) y `sustituto` (sintético con relieve real), reunidos en **`mixto`, el proveedor por defecto** (`NISAR_PROVEEDOR=demo|real|mixto`). Ids de escenario: `embalse-mazar`, `embalse-daule-peripa`, `incendio-casitagua`. Hoy ninguna fecha tiene procedencia completa, así que se sirven los sustitutos sintéticos (y se etiquetan como tales).
**Comandos.** `python scripts/preparar_embalses.py --sitio todos [--entrada datos_imagenes] [--salida data] [--regenerar-contorno] [--sin-dem]` (el DEM usa red; imprime lo que falta y lo omitido). Pruebas: `python -m pytest tests -q`.
**Falta del equipo.** Fecha de la primera máscara de Mazar (`Clas_Super.tif`); `procedencia.json` de todas las fechas (la fecha 2026-10-29 de Mazar está inferida del nombre `Mazar_CS1029.tif`); stack del 29 oct; entregas de Daule-Peripa y de Casitagua (antes y después del 17 sep 2026).
**Menores diferidos.**
- T3: contorno con lista vacía; signo en `_es_cuadrado`; guardia de CRS en `superficie_km2` (supone metros).
- T4: mediana con NaN; `except` demasiado amplio en el DEM; fijar versión de scipy.
- T5: `.npz` obsoletos al volver a correr (no se borran); excepciones de `dem_fn` no capturadas salvo ValueError/IndexError.
- T7: textos de métrica solo en español (sin en/qu); 409 sin `clave_texto`.
- T9: instancia demo separada; el bbox del sustituto de incendio difiere del de `sitio.json`; el borrador kichwa de `api.error.segunda_fecha_comparar` no está validado.
