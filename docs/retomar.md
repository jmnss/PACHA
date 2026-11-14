# Retomar el trabajo (resumen para una sesión nueva)

Actualizado: 2026-11-14. Léelo antes que `INFORME.md` (que es largo e histórico).

## Qué es y dónde está

- **PACHA** (antes «NISAR · Ecuador»): app web para el NASA Space Apps «Dancing with the SARs». Repo
  `jmnss/PACHA` (la carpeta local se sigue llamando `NISAR-Ecuador`). Publicada en `https://jmnss.github.io/PACHA/`;
  cada push a `main` despliega (flujo `.github/workflows/pages.yml`, base `PAGES_BASE` = nombre del repo).
- Historia completa en `main` (se unió la historia anterior; la carpeta `../modelo clima/` es la copia vieja, ya no
  hace falta). La app Streamlit se retiró: etiqueta `legado-streamlit`.
- Ramas: `main` (publicada), **`embalses` (trabajo actual)**, `datos-reales` (= main), `migracion-react` (historia vieja).

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
