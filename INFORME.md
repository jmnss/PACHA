# INFORME — Migración a React

Estado: **Fase 2 INTERRUMPIDA por límite de uso. Completos: bloques 0, 1, 2 y tareas 3.1–3.7 (3.8 implementada, sin revisar). Faltan 3.9, 3.10, bloque 4 (pantallas) y bloque 5 (cierre).** La app todavía no tiene pantallas Historias ni Observatorio; solo existe la galería `/_sistema`.
Última actualización: 2026-11-04

Este archivo lo mantiene Claude durante la ejecución. Se actualiza al cerrar cada tarea.

## Tareas completadas

| Tarea | Commit | Verificación |
|---|---|---|
| chore: entorno reproducible y dependencias de la API | `fb1abf1` | pruebas del bloque en verde |
| test: caracterización del núcleo científico | `35256c7` | pruebas del bloque en verde |
| fix: textos honestos en el núcleo y licencia MIT provisional | `5dc9540` | pruebas del bloque en verde |
| chore: dejar de versionar __pycache__ | `6d3f97f` | pruebas del bloque en verde |
| feat(datos): contrato de datos genérico | `dc49606` | pruebas del bloque en verde |
| feat(datos): generador sintético reproducible | `5b90655` | pruebas del bloque en verde |
| feat(datos): proveedor de demostración | `d11a611` | pruebas del bloque en verde |
| feat(datos): esqueleto del proveedor real y selección | `66eb201` | pruebas del bloque en verde |
| test(datos): conformidad del contrato con dos proveedores | `ee10ae5` | pruebas del bloque en verde |
| test(datos): fortalece la suite de conformidad (origen, medir, rutas deterministas) | `16bf072` | pruebas del bloque en verde |
| feat(api): esqueleto y arranque único | `ea07e6d` | pruebas del bloque en verde |
| feat(api): rejillas cuantizadas y reducidas | `2effd83` | pruebas del bloque en verde |
| feat(api): tipos y escenarios | `9fa768d` | pruebas del bloque en verde |
| feat(api): capas, cambio y medición | `b6f6d01` | pruebas del bloque en verde |
| feat(api): simulación y fotogramas | `ca5247e` | pruebas del bloque en verde |
| feat(api): contexto climático | `90788d6` | pruebas del bloque en verde |
| feat(api): contrato OpenAPI | `d8efd3f` | pruebas del bloque en verde |

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

## Pendientes por la interrupción (retomar aquí)

1. Revisar la Tarea 3.8 (commit `7c32dc2`, pruebas verdes pero sin revisor).
2. Tareas 3.9 (comparador), 3.10 (exportaciones con origen), punto de control 3.
3. Bloque 4: 4.1–4.5 (Observatorio y Historias). Bloque 5: 5.1–5.3 (e2e, README bilingüe, informe).
4. Diferidos de las revisiones: `React.lazy` del mapa (bundle 1,17 MB); documentar en `docs/contrato-datos.md` que la fila 0 de la rejilla es el norte; `revision_visual.sh` deja `dist` compilado con `VITE_MAPA_REMOTO=0` (usar otro `outDir`); el decodificador API→lienzo debe usar `colorear` con categorías (código k → color k−1) y aún no hay prueba de integración; pruebas débiles de honestidad en `useHayDatosSinteticos`.
5. El plan original (`docs/plan-migracion.md`) sigue siendo la guía; el ledger de ejecución (`.superpowers/sdd/plan-migracion/progress.md`) no está versionado.

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

Copia de la lista de `docs/plan-migracion.md` (N1 primera noche, N2 segunda, R con datos reales).

- [ ] N1 · Parámetros (tipo, lugar, clic en mapa, estacionalidad, radar, intervalo, controles con hora, fecha, restablecer, resumen)
- [ ] N1 · Cabecera y contexto
- [ ] N1 · Mapa (capas, reproductor completo, deslizador, reloj, métricas, provincias, catálogo, aviso fuera de Ecuador)
- [ ] N1 · Antes / después (paneles, punto y cuadrante, medición y CSV, punto y serie, borrar, flujo, notas, PNG, parcelas) + comparador
- [ ] N1 · Serie temporal (gráficos, tabla y CSV)
- [ ] N1 · Física por tipo
- [ ] N2 · Estación y temporada
- [ ] N2 · Modo Dios
- [ ] N2 · Fundamentos (misión marcada pendiente, fenómenos, polarización y bandas)
- [ ] N2 · Validación (si se confirma)
- [ ] R · HDF5 reales, catálogo ASF, explorador geográfico

## Cómo verificar manualmente el resultado

1. `source scripts/entorno.sh`
2. (Opcional) `python scripts/generar_datos_demo.py` publica la instantánea del conjunto sintético en `data/demo/`; la app no la necesita para funcionar.
3. `cd frontend && npm run build && cd .. && python servidor.py`, y abre http://localhost:8000.
4. Comprueba que la banda «DATOS DE DEMOSTRACIÓN» se ve en todas las pantallas y no se puede cerrar.
5. Historias: mueve el comparador con el ratón y con las flechas; lee las cinco partes de cada historia.
6. Observatorio: elige La Segua, pulsa Play y comprueba que el mapa, la cinta y las métricas cambian a la
   vez; dibuja un cuadrante en «Comparar» y descarga el CSV (debe empezar con `# origen: sintético`).
7. Haz clic fuera de Ecuador: debe avisar.
8. Reduce la ventana a 390 px: el riel pasa a barra inferior y nada se desborda.
9. Pruebas completas: ver la tabla de comandos de `CLAUDE.md`.
