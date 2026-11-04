# INFORME — Migración a React

Estado: **Fase 2 terminada: alcance de la primera noche completo (bloques 0 a 5).** Verificación final: build OK, vitest 282, lint OK, Playwright 22/22, pytest 175 (+2 omitidas por diseño), unittest 13 OK.
Última actualización: 2026-11-04

Este archivo lo mantiene Claude durante la ejecución. Se actualiza al cerrar cada tarea.

## Tareas completadas

| Tarea / corrección | Commit | Verificación |
|---|---|---|
| chore: entorno reproducible y dependencias de la API | `fb1abf1` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| test: caracterización del núcleo científico | `35256c7` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix: textos honestos en el núcleo y licencia MIT provisional | `5dc9540` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| chore: dejar de versionar __pycache__ | `6d3f97f` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(datos): contrato de datos genérico | `dc49606` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(datos): endurecer el contrato (fechas con zona, tabla nula, solo lectura, rangos) | `eeccdca` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(datos): generador sintético reproducible | `5b90655` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(datos): proveedor de demostración | `d11a611` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(datos): escenarios simulados consultables, caché acotada y resultados completos | `cc6fa5d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(datos): proveedor demo seguro entre hilos y huella de 12 hex | `dfae01b` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(datos): esqueleto del proveedor real y selección | `66eb201` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| test(datos): conformidad del contrato con dos proveedores | `ee10ae5` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| test(datos): fortalece la suite de conformidad (origen, medir, rutas deterministas) | `16bf072` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): esqueleto y arranque único | `ea07e6d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api): hay_sinteticos en salud, errores HTTP en español y rutas de archivo | `2d3bdcc` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): rejillas cuantizadas y reducidas | `2effd83` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): tipos y escenarios | `9fa768d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): capas, cambio y medición | `b6f6d01` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api): conversión 0–1 a píxel, malla de medición y errores en español | `99f164d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): simulación y fotogramas | `ca5247e` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api): simulación sin caché de escenarios, fechas y entradas acotadas, geografía en datos | `f554a30` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): contexto climático | `90788d6` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(api): contrato OpenAPI | `d8efd3f` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): proyecto, tokens y tipografía | `4405282` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): cliente de la API y estado | `2f43fbd` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| chore: script de revisión visual | `1b2a75a` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): sistema de diseño, banda de demostración y estructura | `c9c9642` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): línea de selección visible, tokens tipográficos y mejoras de accesibilidad del sistema de diseño | `5a67d59` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): rampas de color verificadas y leyendas | `8ee354e` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api): las capas categóricas viajan como códigos enteros y se reducen por moda | `6392e9c` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): colores de categorías por variable, extremos en palabras y pruebas con las leyendas reales | `b6fd0a6` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): gráficos | `0ba20f7` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): escala con decimales, etiquetas de marcas sin solape y gráficos más honestos | `4e61d8d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): mapa local con capa de lienzo | `b61658f` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): cinta de pasadas y reproductor | `7c32dc2` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): useInstante, sin pisar el arrastre de la cinta y más pruebas del reproductor | `b289239` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): comparador deslizante | `22939f0` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): fechas del comparador, sellos de origen y gesto primario | `9e287fe` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): exportaciones con metadatos de origen | `7571b2a` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): exportaciones fail-safe, franja en lienzos estrechos y e2e de tinta | `031481c` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): observatorio, mapa y tiempo | `ea3787d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): observatorio, pareja de pasadas, escenario caducado y pasada activa | `52d7df0` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): antes/después con comparador y medición | `8fb0f3e` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): notas del modelo con aviso, serie del punto pendiente y polarización | `e0586e0` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): historias de inundación e incendio | `0f0802e` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): historias con medida de lectura, comparador visible y pareja de mayor cambio | `c29f3e5` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): series temporales | `a67a54d` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(datos): el demo no atribuye detecciones a NISAR | `55b8ac6` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): panel de simulación | `4d8c6cc` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| test(e2e): flujos principales | `701749e` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| docs: README bilingüe, créditos y guion | `e063478` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(datos): fecha neutra para el escenario de Pedernales | `77418bb` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api): valida max_lado y vmin/vmax; pruebas de orden de filas | `65afd99` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(frontend): celdaCsv neutraliza espacios previos; pruebas de honestidad; fija requirements-api | `e894f30` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| fix(api,docs): sello fijo del contexto climático y matiz en los README | `3d091f6` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): reintenta una vez los enlaces de escenarios simulados caducados | `4d7ee67` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): el reproductor solo ofrece el paso de pasada en pasada en el mapa | `77dddeb` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| feat(frontend): ayuda «Cómo ve el radar» y origen del escenario simulado en la banda | `155d693` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |
| refactor(api): EntradaNoValida (422) y NoEncontrado (404); lo inesperado es 500 genérico | `dd7a779` | pruebas de su bloque en verde; revisión por subagente (ver ledger) |

## Decisiones tomadas sin supervisión

- `__pycache__` dejó de versionarse (`git rm --cached`) para tener árbol limpio.
- No se tocó `fecha_evento` de `ec_pedernales` en `data/nisar_sample.csv` (2026-04-16 coincide con el aniversario de un sismo real); **pendiente del equipo** decidir si se cambia.
- El contrato de datos creció de forma aditiva: `ResultadoCambio.tablas/vectores/capas_extra`, `CapaRaster.instante`, `Control/TipoCambio` (necesarios para campo de flujo, tabla por parcela y controles de simulación).
- La API no importa `modelo/` salvo `/api/contexto`; los tipos y controles llegan por `ProveedorDatos.tipos()`.
- `/api/salud` devuelve `hay_sinteticos`; **la banda de demostración del frontend debe usar ese campo**, no `origen_tipo`.
- La validación «dentro de Ecuador» de la simulación es una caja aproximada en `datos/geografia.py`.
- `/api/simulacion/escenario` no se cachea en la API; `/fotogramas` sí (12 entradas).
- Las fechas del contexto climático: `fecha_generacion` es la hora de la petición, no la fecha del dato.

## Riesgos para la integración con datos reales

- `/cambio` puede ser pesado con rejillas reales (hasta 6 capas por respuesta): pedir capas extra a demanda.
- `/medicion` recalcula el cambio solo para conocer la malla: añadir caché.

## Pendientes menores diferidos (de las revisiones)

Ver `.superpowers/sdd/plan-migracion/progress.md` (no versionado): validar `max_lado`/`vmin` NaN en `api/encoding.py`; ids únicos de adquisición en `Escenario`; escena cacheada mutable.

## Revisión final y decisiones adicionales (sin supervisión)

- Revisión final de toda la rama (0 Critical, 6 Important): se corrigieron en una ronda única: fecha neutra para `ec_pedernales`, re-simulación de enlaces caducados, pasos cortos del reproductor deshabilitados con motivo (el reproductor por fotogramas continuos queda **pendiente**), ayuda «Cómo ve el radar» con la frase de centímetros marcada «pendiente de confirmar», excepciones `EntradaNoValida`/`NoEncontrado`, versiones fijadas en `requirements-api.txt`, fecha fija del sello del contexto.
- Las tareas 4.3, 4.4 y 5.1 no tuvieron revisor independiente (presupuesto); la revisión final cubrió su honestidad.
- Notas del modelo heredado (`modelo/nisar.py`) se muestran con el aviso «pendiente de confirmar con la documentación oficial»; no se modificó `modelo/`.
- Categorías: se transportan como códigos enteros y se colorean por variable con hex de `docs/diseno.md` §4 (Severidad alta usa `#9a3412`, parada de `fuego`, por distinguibilidad con daltonismo).
- `--allow palette-terracotta` en `revision_visual.sh` (el color `--demo-ink` lo fija diseno.md §4), con un guard de hex fuera de tokens.

## Pendientes tras la primera noche

- **Funcionales (paridad N1 incompleta):** serie temporal del punto/cuadrante (la API no expone `serie_seleccion`), modelo en el tiempo por fotogramas continuos (`/api/simulacion/fotogramas` existe pero la pantalla no lo usa), fecha del evento (el servidor no la acepta), tooltip de provincia y marcadores del catálogo en el mapa, marcas de evento y cursor en la vista Serie, observable del tipo en la cabecera.
- **Visuales:** mapa gris sin contexto a escala de escenario (falta localizador/escala), menú de tres puntos en móvil, tabla móvil en tres líneas y sin semántica de tabla, margen de la banda móvil (12 px), sin captura con punto/cuadrante seleccionado.
- **Datos reales:** `/api/tipos` mezcla unidades (el panel multiplica por `escala`); `/cambio` pesado con rejillas reales (capas extra a demanda); `/medicion` recalcula el cambio; `RLock` global en el proveedor demo; `/api/salud` depende de `escenarios()`; el proveedor real es un esqueleto.
- **Equipo:** confirmar licencia (MIT provisional), requisitos de entrega, si Validación se conserva, y qué hacer con `/_sistema` (galería publicada en producción).
- **Noche 2:** Estación y temporada, Modo Dios, Fundamentos, Validación (N2.1–N2.6).

## Pendientes (plan completo)

Primera noche, en orden (`docs/plan-migracion.md`): 0.1–0.3, 1.1–1.5, 2.1–2.7, 3.1–3.10, 4.1–4.5,
5.1–5.3. Noche 2: N2.1–N2.6. Con datos reales: sección «Integración de datos reales».

## Decisiones tomadas

- Historia principal: inundaciones y humedales (Costa baja). Segunda historia: incendios forestales (Sierra).
- Zona: Ecuador entero, con dos zonas de demostración (La Segua, Manabí; Loja, Sierra) y clic libre en el país.
- Capa de datos intercambiable (`datos/`): proveedor de demostración sintético hoy; proveedor real
  como esqueleto. La API solo habla con el contrato.
- Honestidad: banda permanente de demostración, sello de origen en cada capa y gráfico, exportaciones marcadas.
- FastAPI; React + Vite + TypeScript; MapLibre con estilo local; sin cuentas ni estado en el servidor.
- Dirección de arte A «Sala de control», acento amarillo cenit `#e5b93c`, Public Sans.
- Licencia MIT **provisional, pendiente de confirmar por el equipo**.

## Decisiones pendientes del equipo

- Confirmar la licencia (MIT provisional).
- Requisitos oficiales de entrega del hackathon.
- Si la pestaña Validación (partición espacial) se conserva.

## Problemas encontrados

| Fecha | Tarea | Problema | Qué se probó | Estado |
|---|---|---|---|---|
| 2026-11-04 | Paso 0 | Node 12 y sin navegador | nvm + Playwright | Resuelto |
| 2026-11-04 | Revisión | La app presentaba sintético como NISAR («Datos de radar NISAR…», «Producto: NISAR L2 GCOV», «Área quemada real») | — | Se corrige en Tareas 0.3, 3.4, 3.10 |
| 2026-11-04 | Revisión | Código de lectura HDF5 y búsqueda ASF con detalles de NISAR no verificados | — | Marcado en `docs/challenge.md`; se revisa en la integración de datos reales |

## Pendientes visuales por pantalla

| Pantalla | Rondas usadas | 1440 | 768 | 390 | Pendientes |
|---|---|---|---|---|---|
| Sistema de diseño (`/_sistema`) | 3 de 3 + 1 de corrección del revisor | 0 FAIL | 0 FAIL | 0 FAIL (1 WARN `edge-text`) | WARN `edge-text` a 390 px: la banda de demostración usa margen de 12 px (diseno.md §10 pide 16) para que su texto obligatorio quepa; tabla móvil en 3 líneas por fila y sin semántica de tabla (display:block); `--allow palette-terracotta` en `revision_visual.sh` por `--demo-ink` fijado en §4 (con guard de hex fuera de tokens) |
| Historias (`/`) | 3 de 3 (2 de implementación + 1 de revisor) | 0 FAIL | 0 FAIL | 0 FAIL | En móvil el comparador queda tras el texto de las partes 1–2 (se respeta el orden de lectura); la tarjeta del comparador a 1440×900 termina a 10 px del borde inferior (depende del viewport); la pareja de pasadas se elige por el mayor cambio de la serie (criterio de la demo); sin e2e propio |
| Observatorio · mapa | 3 de 3 (2 de implementación + 1 de revisor) | 0 FAIL | 0 FAIL | 0 FAIL | Con OpenFreeMap apagado el mapa a escala de escenario (~8 km) es un fondo gris con la capa: falta un localizador de Ecuador o escala gráfica; hoja inferior de parámetros en móvil y menú de tres puntos (§10) pendientes; sin prueba e2e propia |
| Observatorio · comparar | 3 de 3 + 1 de revisor | 0 FAIL | 0 FAIL | 0 FAIL | Sin captura con punto/cuadrante seleccionado ni e2e propio; serie del punto pendiente (la API no expone `serie_seleccion`); medición y cambio usan las polarizaciones del análisis, no el selector (avisado en pantalla); notas del modelo heredado mostradas con aviso «pendiente de confirmar» |
| Observatorio · serie | 1 de 3 | 0 FAIL | 0 FAIL | 0 FAIL (1 WARN `ragged-row` a 1440, defendido: distribución de dos columnas) | Sin marcas de evento ni cursor de instante (la API no trae fecha de evento; Linea no soporta cursor); tabla intercalada de 60 filas en La Segua; sin revisión independiente de esta tarea |

Para cada pantalla cerrada se pega aquí la crítica de las siete preguntas de `app-screens.md §2.7`.

## Paridad funcional

Leyenda: `[~]` = parcial; `[ ]` = no hecho (noche 2 / datos reales).

Copia de la lista de `docs/plan-migracion.md` (N1 primera noche, N2 segunda, R con datos reales).

- [~] N1 · Parámetros (parcial: sin fecha del evento) (tipo, lugar, clic en mapa, estacionalidad, radar, intervalo, controles con hora, fecha, restablecer, resumen)
- [~] N1 · Cabecera y contexto (parcial: sin «observable»)
- [~] N1 · Mapa (parcial: sin fotogramas continuos, tooltip de provincia ni marcadores del catálogo) (capas, reproductor completo, deslizador, reloj, métricas, provincias, catálogo, aviso fuera de Ecuador)
- [~] N1 · Antes / después (parcial: sin serie del punto) (paneles, punto y cuadrante, medición y CSV, punto y serie, borrar, flujo, notas, PNG, parcelas) + comparador
- [~] N1 · Serie temporal (parcial: sin marcas de evento) (gráficos, tabla y CSV)
- [~] N1 · Física por tipo (inundación e incendio en Historias; los otros cuatro con la ayuda «Cómo ve el radar»)
- [ ] N2 · Estación y temporada
- [ ] N2 · Modo Dios
- [ ] N2 · Fundamentos (misión marcada pendiente, fenómenos, polarización y bandas)
- [ ] N2 · Validación (si se confirma)
- [ ] R · HDF5 reales, catálogo ASF, explorador geográfico

## Cumplimiento de `docs/challenge.md` (con evidencia)

| Requisito | Estado | Evidencia |
|---|---|---|
| Mapa interactivo de cambio | Cumple | `frontend/src/pantallas/observatorio/VistaMapa.tsx` (capa de cambio, clic para simular, aviso fuera de Ecuador); e2e `flujos.spec.ts` |
| Animación de series temporales | Parcial | Reproductor por pasadas (`tiempo/usePlayback.ts`, `BloqueTiempo.tsx`); sin fotogramas continuos |
| Comparador deslizante antes/después | Cumple | `comparador/Comparador.tsx`; Historias y Observatorio; e2e con teclado |
| Dashboards y métricas | Cumple | `PanelMetricas.tsx`, `Mediciones.tsx`, `TablaResultados.tsx`, vista Serie |
| Público amplio | Cumple | Términos explicados (`Termino`), accesibilidad por teclado/ARIA, tres anchos revisados |
| Qué polarización resalta el cambio | Cumple | Historias: HH inundación, HV incendio, con conmutador |
| Hipótesis de impulsores (físicos y humanos) | Cumple (ejemplos ilustrativos) | `pantallas/historias/contenido/*.ts` |
| Aplicaciones futuras de NISAR | Cumple (condicionales, «pendiente de confirmar») | contenido de Historias, parte 5 |
| Series con varias fechas | Cumple | Cinta de pasadas (30 adquisiciones) y vista Serie |
| Distintas frecuencias | No cumple | Solo banda L en el demo |
| Conceptos clave (activo, dieléctrica, polarización, centímetros) | Cumple | Historias parte 2 y ayuda «Cómo ve el radar» (centímetros marcado «pendiente de confirmar») |
| Datos NISAR reales | No cumple (por diseño) | Proveedor real = esqueleto; sin recursos oficiales |
| Honestidad (reglas 1–5) | Cumple | Banda permanente (`hay_sinteticos`, fail-safe), sellos de origen, exportaciones con marca (CSV/PNG, e2e), `esReal` único criterio, notas heredadas con aviso |
| Código abierto | Parcial | MIT provisional, pendiente de confirmar por el equipo |

## Cómo verificar manualmente el resultado

1. `source scripts/entorno.sh`
2. (Opcional) `python scripts/generar_datos_demo.py` publica la instantánea del conjunto sintético en `data/demo/`; la app no la necesita para funcionar.
3. `cd frontend && npm install && npm run build && cd .. && python servidor.py`, y abre http://localhost:8000 (Node 22 vía `source scripts/entorno.sh`; `python -m pip install -r requirements.txt -r requirements-api.txt` la primera vez).
4. Comprueba que la banda «DATOS DE DEMOSTRACIÓN» se ve en todas las pantallas y no se puede cerrar.
5. Historias: mueve el comparador con el ratón y con las flechas; lee las cinco partes de cada historia.
6. Observatorio: elige La Segua, pulsa Play y comprueba que el mapa, la cinta y las métricas cambian a la
   vez; dibuja un cuadrante en «Comparar» y descarga el CSV (debe empezar con `# origen: sintético`).
7. Haz clic fuera de Ecuador: debe avisar.
8. Reduce la ventana a 390 px: el riel pasa a barra inferior y nada se desborda.
9. Pruebas completas: `python -m pytest tests -q`, `python -m unittest modelo.clima modelo.desastres`, y en `frontend/`: `VITE_MAPA_REMOTO=0 npm run build && npm test && npm run lint && npx playwright test` (ver también la tabla de `CLAUDE.md`).
