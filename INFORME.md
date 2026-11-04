# INFORME — Migración a React

Estado: **Fase 1 revisada (análisis, diseño, plan y revisión crítica). Fase 2 sin empezar.**
Última actualización: 2026-11-04

Este archivo lo mantiene Claude durante la ejecución. Se actualiza al cerrar cada tarea.

## Tareas completadas

| Tarea | Commit | Verificación |
|---|---|---|
| — | — | — |

## Pendientes

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
| Sistema de diseño | 0 de 3 | — | — | — | — |
| Historias | 0 de 3 | — | — | — | — |
| Observatorio · mapa | 0 de 3 | — | — | — | — |
| Observatorio · comparar | 0 de 3 | — | — | — | — |
| Observatorio · serie | 0 de 3 | — | — | — | — |

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
