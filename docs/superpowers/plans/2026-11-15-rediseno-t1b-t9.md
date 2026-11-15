# Rediseño de PACHA, T1b–T9 · Plan de ejecución

Fecha: 2026-11-15 · rama `rediseno-pacha` · brief `docs/rediseno-pacha.md` · línea base `docs/auditoria-ux.md`.

**Decisiones del usuario (2026-11-15):**
- Identidad: **propuesta D «Mezcla»** (`docs/propuestas/d-mezcla/`, README con paleta, tipografía, logo y contraste),
  con dos correcciones: (1) en el Simulador el Resultado solo aparece tras «Desatar»; antes, el panel muestra los
  controles; (2) en Inicio se mueve **una sola cosa** (el haz, que hace crecer la capa en curso); el resto, quieto.
- **Vía A:** las Historias se arman ya sobre los escenarios del equipo (`embalse-mazar`, `embalse-daule-peripa`,
  `incendio-casitagua`, hoy sustitutos sintéticos del proveedor `mixto`), con los pasos de la fase 2 (Datos, Lo que ve el
  satélite, Simular, Impactos). Lo que la fase 2 aún no trae (fichas con fuente, comparación Mazar–Daule-Peripa,
  simulación del embalse) queda como **hueco marcado** («por llegar») dentro del paso, nunca inventado.
- T9: la tarea del simulador es «simula un incendio en el cerro Casitagua y compáralo con lo que vio el radar».
  El incendio del Casitagua se nombra **sin fecha** y con «evento real · fuente por añadir» hasta tener la fuente (regla 7).
- Subagentes: Sonnet para lo mecánico; Opus para lo que exige juicio; Haiku para comandos simples.

## Reglas globales (todas las tareas)

- `CLAUDE.md` manda: honestidad (reglas 6 y 7; banda y sellos visibles, sin cerrar, en es/en/qu), nada de lógica
  científica en el frontend, TS estricto, un componente por archivo, todo valor sale de `tokens.css`/`rampas.ts`.
- `source scripts/entorno.sh` en cada shell. No pasar de tarea con pruebas o build en rojo: `cd frontend && npm test &&
  npm run lint && npm run build`; e2e afectadas (`npx playwright test`); `python -m pytest tests -q` si se toca Python.
- axe: 0 violaciones, como mucho 59 nodos «incompletos» de contraste, sin desborde a 320 px (línea base).
- Textos nuevos con clave en los catálogos es/en/qu (kichwa como borrador). **No** se re-exporta
  `docs/traduccion-kichwa.csv` ni se toca `INFORME.md` en T3–T6 (se hace en T7/T8 para evitar conflictos); cada tarea
  devuelve en su informe final lo que habría ido a `INFORME.md`.
- Revisión visual: `bash scripts/revision_visual.sh <ruta> <nombre>` a 1440/768/390; máx. tres rondas; capturas en
  `docs/capturas-nuevas/<nombre>/`.
- Un commit por tarea con el mensaje indicado (y la línea `Co-Authored-By`). Sin `git push`.

## T1b · Sistema de diseño v2 (Opus) — `feat(T1): sistema de diseño v2 «Tierra viva» (mezcla D)`
- Reescribir `docs/diseno.md` como v2 a partir de `docs/propuestas/d-mezcla/README.md` y `docs/rediseno-pacha.md` §2:
  idea, pantallas y su pregunta (cuatro destinos), paleta exacta con su tabla de contraste, tipografía (Spectral +
  Public Sans, escala), espaciado, estructura (riel con texto, barra inferior con texto), reglas de componentes
  (una acción principal ocre con borde `#7D5C0E`, cajetín, capas, Avanzado cerrado, hoja inferior), movimiento,
  responsivo, lista anti-slop §12 actualizada (incluye sin símbolos andinos sagrados ni textiles, sin eyebrows ni 01/02/03
  decorativos), criterio de verificación. Las superficies de mapa son basalto.
- `tokens.css`: tema claro cálido (arcilla, papel, tinta…), superficies de basalto para mapas (`--mapa-*`), acento ocre,
  demostración melocotón con rayado. Mantener los **nombres** de tokens que usa el código cuando sea posible
  (reasignar valores) para no romper pantallas; añadir los nuevos. Cargar Spectral (Google Fonts) igual que Public Sans.
- Logo nuevo (`marca.tsx`, favicon) desde `docs/propuestas/d-mezcla/logo.svg`.
- Ajustar `componentes.css` y los componentes base de `frontend/src/diseno/` al tema claro; actualizar
  `tokens.test.ts`/`contraste.test.ts` con los pares nuevos. Las rampas de `rampas.ts` no cambian, salvo el arcoíris de
  la fase interferométrica señalado en la auditoría (cambiar a una rampa cíclica perceptual, p. ej. «romaO»/«vikO» de
  Crameri, con su prueba) y separar el acento de los colores de datos (`--chart-1` deja de ser el acento).
- Todas las pantallas actuales siguen funcionando y pasan axe con el tema nuevo.

## T2 · Arquitectura de cuatro destinos (Sonnet) — `feat(T2): cuatro destinos (Inicio, Explorar, Simular, Aprender) y redirecciones`
- Rutas: `/` Inicio (pantalla nueva; T2 deja un esqueleto mínimo que T3 rellena) · `/explorar/historias` (Historias) ·
  `/explorar/observatorio` (Observatorio) · `/explorar` → `/explorar/historias` · `/simular` · `/aprender/fundamentos`,
  `/aprender/laboratorio`, `/aprender/recorrido` · `/aprender` → `/aprender/fundamentos`.
- Redirecciones que **conservan la query y el hash**: `/observatorio`, `/simulador`, `/laboratorio`, `/recorrido`,
  `/fundamentos`, y `/` con parámetros de Historias (los que hoy lee `Historias.tsx`) → `/explorar/historias?…`.
  Funciona en local y en Pages (`rutaBase.ts`, `PAGES_BASE`, 404 de Pages si aplica).
- Riel con texto (escritorio) y barra inferior con texto (móvil), cuatro destinos + idioma. Dentro de Explorar y
  Aprender, un único nivel de subnavegación (pestañas de verdad con `tabpanel` o enlaces; UX-28: `Pestanas` se separa
  en pestañas y control segmentado). Máximo dos niveles de pestañas en cualquier pantalla.
- Actualizar el recorrido (iframes `?incrustado=1`), enlaces internos, e2e y pruebas de las rutas.

## T3 · Inicio (Opus, worktree) — `feat(T3): Inicio con perfil del Ecuador y tres entradas`
- Según D: frase de valor «La tierra guarda las marcas; el radar las lee.», perfil oeste-este (rotulado «perfil
  esquemático, alturas por verificar» salvo que se saque de un corte SRTM con fuente), Daule-Peripa, Mazar y Casitagua
  como botones que llevan a su historia, «Registro de pasadas» ilustrativo, franja de ≈240 km (verificada en
  `docs/nisar-verificado.md`). Una sola animación (el haz) y quieta con `prefers-reduced-motion`.
- Tres tarjetas de entrada: Embalses (Mazar y Daule-Peripa) → historia de embalses; Incendio en la Sierra (Casitagua)
  → historia del incendio; «Provoca tu propio evento» → `/simular`. Acceso «¿Primera vez? Recorrido de 90 s» →
  `/aprender/recorrido`. Una acción principal ocre. Banda de demostración presente.

## T4 · Historias como recorrido por pasos (Opus, worktree) — `feat(T4): historias por pasos sobre los escenarios del equipo`
- Dos historias: **Embalses y lluvia** (Mazar, con Daule-Peripa) e **Incendio en la Sierra** (Casitagua), sobre los
  escenarios del API. Pasos numerados (Datos · Lo que ve el satélite · Simular · Impactos) con indicador «Paso n de 4»
  (columna de capas de C). Cada paso es una tarjeta con titular y una cifra visible (del API, con su sello de origen);
  el detalle se abre al clic. Comparador fijo a la derecha en escritorio que cambia con cada paso; en móvil, arriba.
- Huecos de la fase 2 marcados como «por llegar» (fichas con fuente, comparación Mazar–Daule-Peripa, simulación del
  embalse). Al final, llamado «Explóralo tú en el Observatorio» con el escenario elegido en la URL. Estado (historia,
  paso, polarización, pasada) en la URL. Sin columnas vacías. Las historias genéricas viejas (La Segua) se retiran de
  Historias (siguen en el Observatorio).

## T5 · Simulador en tres pasos (Opus, worktree) — `feat(T5): simulador en tres pasos con panel y hoja inferior`
- Antes, con su prueba: arreglar el error Mw 7,8 en el panel / Mw 7,0 en el resultado (los valores que se ven se envían
  aunque el usuario no toque nada).
- (1) tarjetas de fenómeno; (2) mapa a pantalla (basalto), tocar o elegir lugar del catálogo, lat/lon en «Avanzado»;
  incendio con Casitagua por defecto; (3) panel lateral (hoja inferior en móvil) con 2–3 controles esenciales, «Avanzado»
  cerrado (semilla, rumbo de falla, PAGER…), acción principal «Desatar». El Resultado aparece tras Desatar como capa
  nueva junto al mapa (o hoja que sube en móvil), cada KPI con una frase llana, rotulado «ejemplo de demostración»; en
  incendio, enlace «Compáralo con lo que vio el radar» → historia del incendio, con «evento real · fuente por añadir».
- Indicador de pasos; sin desborde a 390 tras un resultado (UX de la línea base). Mucho cuidado en móvil.

## T6 · Observatorio (Sonnet, worktree) — `feat(T6): observatorio con el mapa protagonista y parámetros avanzados`
- Mapa protagonista; semilla, ENL y órbita en «Parámetros avanzados», cerrado. Máximo dos niveles de pestañas contando
  la subnavegación de Explorar (el mapa base pasa a la placa flotante como selector, no pestañas). Cada vista con una
  frase «qué estás viendo»; cada escala de color con su lectura en palabras (p. ej. «más oscuro = agua lisa»).
  Abre por defecto en `embalse-mazar`. Una acción principal.

## T7 · Guía y textos (Sonnet) — `feat(T7): recorrido de primera visita, estados vacíos, migas y textos claros`
- Recorrido de primera visita (3–4 globos, saltable, recordado con `localStorage` en try/catch), estados vacíos que
  enseñan, migas de pan en Explorar. Pasada de `/clarify` (frases cortas, español llano) y claves en/qu.
  Re-exportar `docs/traduccion-kichwa.csv` y `api/claves.json` si cambió.

## T8 · Pulido y verificación (Opus) — `docs(T8): verificación del rediseño frente a la línea base`
- `/polish` y `/audit`; comparar con `docs/auditoria-ux.md` (tabla resuelto / pendiente). Todas las pantallas por
  `revision_visual.sh` a 1440/768/390 en es/en/qu; axe; suites completas (pytest, unittest, vitest, lint, build,
  Playwright normal y de Pages con `bash scripts/construir_pages.sh`). Actualizar `INFORME.md`, `docs/retomar.md` y
  reconciliar los planes de las fases 2–5 con la interfaz nueva (rellenan los huecos de T4, no crean página aparte).

## T9 · Prueba con personas (Sonnet) — `docs(T9): guion de la prueba de usabilidad`
- `docs/prueba-usabilidad.md`: 15 min, 3–5 personas; prueba de 5 s en Inicio («¿qué es esto?») y tres tareas:
  «encuentra cuánto cambió el agua del embalse Mazar», «simula un incendio en el cerro Casitagua y compáralo con lo que
  vio el radar», «explica qué polarización ve mejor el agua»; con tiempos, criterio de éxito y dónde se trabaron.

## Orden

T1b → T2 → (T3 ∥ T4 ∥ T5 ∥ T6, cada una en su worktree desde T2; se integran en ese orden resolviendo conflictos) →
T7 → T8 → T9.
