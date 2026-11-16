# Versión final para la entrega · Plan

Fecha: 2026-11-15, 22:40 (UTC−5). El envío de Space Apps cierra el 15 nov a las 23:59, hora local
(spaceappschallenge.org; la guía de 2026 no se pudo leer: confirmar el formato de la demo).
Criterios de jurado según la guía de 2025: Impacto, Creatividad, Validez, Relevancia y Presentación.

## Cronograma

| Hora | Paso |
|---|---|
| 22:40–23:00 | Commits de los cuatro frentes: acciones sugeridas del Simulador, limpieza, «Cómo lo hacemos» y el perfil real, README y `docs/entrega.md` |
| 23:00–23:12 | Integración en `main` (merge de `acciones`, `limpieza`, `metodo` y `entrega`), conflictos, lint, build, vitest, pytest y unittest |
| 23:12 | Push a `main` → GitHub Pages (unos 20 min) |
| 23:15–23:50 | El equipo llena el formulario con `docs/entrega.md`, la URL de la app y el repo, y graba el vídeo o las diapositivas |
| 23:40 | Comprobar la app publicada (Inicio, Historias, Observatorio, Simulador) y etiquetar `v1.0` |

## Lo que ven los jueces

1. **Inicio**: frase de valor, perfil del Ecuador con los tres sitios y tres entradas.
2. **Explorar › Historias**: los embalses (Mazar y Daule-Peripa) y el incendio del Casitagua, en cuatro pasos, con datos
   NISAR GCOV reales del equipo, el comparador antes/después HH/HV, la máscara de agua o de quemado, el ΔRFDI, las fichas
   con fuente y lecturas redactadas como hipótesis.
3. **Explorar › Observatorio**: mapa y antes/después de los tres sitios.
4. **Simular**: simulador de eventos en tres pasos, con acciones sugeridas citadas y «Pregúntale a tu IA» (rotulado «Simulación»).
5. **Aprender**: Fundamentos, Laboratorio, Recorrido de 90 s y Cómo lo hacemos.
6. **Idiomas**: es, en y kichwa (borrador). El idioma del navegador elige el inglés para los jueces internacionales.

## Después de la entrega (no bloquea)

- Granulos (`.h5`) del equipo para completar la procedencia; signo del ΔRFDI; confirmar las fechas del 12 oct en
  Daule-Peripa y del 29 oct en Mazar.
- Verificación completa: axe, e2e, 768 px y revisión con hablantes de kichwa.
