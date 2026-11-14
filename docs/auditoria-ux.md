# Auditoría de UX de partida (T0 del rediseño)

Fecha: 2026-11-14 · rama `rediseno-pacha` (desde `embalses`, commit `6565439`) · app en local, proveedor `mixto`.
Es la **línea base** contra la que se mide el rediseño en T8. Une cuatro fuentes:

| Código | Fuente | Detalle |
|---|---|---|
| **R** | Auditoría del brief, `docs/rediseno-pacha.md` §1 (problemas 1–9) | Del equipo y del mentor |
| **C** | Impeccable `critique`: heurísticas de Nielsen, carga cognitiva y flujo, en el navegador a 1440 y 390 | `docs/auditoria-ux/critique.md` |
| **A** | Impeccable `audit`: accesibilidad (axe WCAG 2.2 AA), rendimiento, responsive y tema | `docs/auditoria-ux/audit.md` |
| **W** | Web Interface Guidelines (Vercel), revisión del código | `docs/auditoria-ux/wig.md` (55 hallazgos, `archivo:línea`) |

Pantallas: Historias (`/`), Observatorio (`/observatorio`) y Simulador (`/simulador`), a 1440×900 y 390×844 (más 320 px
para el reflujo). Capturas de referencia en `docs/capturas-nuevas/linea-base/`. Ningún hallazgo propone esconder, cerrar
ni achicar la banda «DATOS DE DEMOSTRACIÓN» ni los sellos de origen.

## 1. Línea base medida (lo que T8 tiene que superar o igualar)

| Medida | Historias | Observatorio | Simulador |
|---|---|---|---|
| Nielsen, suma de las 10 heurísticas (0–40) | 24 (aceptable) | 25 (aceptable) | **18 (pobre)** |
| Heurística 8, estética y minimalismo (0–4) | 1 | 1 | 1 |
| Carga cognitiva (puntos que fallan de 8) | 4 (alta) | 5 (alta) | 6 (crítica) |
| Violaciones de axe WCAG 2.2 AA (1440 / 390) | 0 / 0 | 0 / 0 | 0 / 0 |
| Nodos «incompletos» de contraste en axe (1440 / 390) | 3 / 3 | 28 / 20 | 1 / 4 |
| Una acción principal por pantalla | no | no | no |
| Palabras en la página | 1015 | — | — |
| Primer elemento interactivo a 390 (y) | 1696 px (comparador) | ≈ 480 px (mapa) | 873 px (pestañas de fenómeno) |
| Toques y desplazamientos hasta el resultado a 390 | — | — | 3–4 toques y 3–4 desplazamientos |
| Elementos interactivos visibles a 1440 | — | 47 | — |
| Niveles de pestañas (máximo) | 1 | 3 (más 2 desplegables) | 1 |
| Desborde horizontal | no | no | **sí, 436 px a 390 tras un resultado** |

Otras medidas: Impeccable `audit` 16/20 (bueno); Web Interface Guidelines: 0 críticos, 4 altos, 21 medios y 30 bajos.
Entrada JS: 140 KB gzip (con los tres catálogos de idioma); MapLibre: 260 KB gzip, solo en el Observatorio. En carga lenta
(CPU ×4, 1,6 Mbps), el título aparece a los 3,7 s en Historias, 4,4 s en Observatorio y 2,5 s en Simulador. El modo Pages
(Pyodide) no se midió. **Criterio para no empeorar en accesibilidad:** 0 violaciones de axe en todas las combinaciones,
como mucho 59 nodos «incompletos» y reflujo sin desborde a 320 px.

## 2. Hallazgos ordenados por gravedad

Gravedad: **Crítica**, impide entender o usar la app, o da un dato incoherente; **Alta**, frena mucho o incumple una regla
obligatoria; **Media**, molesta o es inconsistente; **Baja**, pulido. La última columna dice qué tarea del rediseño lo
resuelve.

### Críticas

| Id | Pantalla | Problema | Evidencia | Fuentes | Tarea |
|---|---|---|---|---|---|
| UX-01 | Simulador | **El resultado no corresponde a los parámetros que se ven:** el panel dice Mw 7,8 y el resultado, Mw 7,0. `alCelda` envía `elegidos`, que está vacío si no se tocó nada, y la API usa otro valor por defecto. | Reproducido contra la API: con `{}` sale 7,0 y con `{"mw":7.8}` sale 7,8 | C S-01 | Arreglo con prueba **antes** de T5 (es un error de datos) |
| UX-02 | Historias | **No hay portada.** `/` abre un artículo a dos columnas; quien llega no sabe qué es PACHA ni por dónde empezar. | `inicio-1440-fold.jpg` | R1, C H-07 | T3 |
| UX-03 | Historias | **Las historias del equipo no aparecen.** Se cuentan «Inundación en la Costa» e «Incendio en la Sierra» (sintéticas y genéricas); Mazar, Daule-Peripa y Casitagua no figuran en ninguna pantalla, y el Observatorio abre en La Segua. | `grep -ri "mazar\|casitagua" frontend/src/pantallas` vacío | C H-01 | T3, T4 (con los datos de la fase 1) |
| UX-04 | Historias | **Muro de texto:** 1019 palabras en 21 párrafos; a 390 el comparador empieza en y = 1696, después de dos pantallas de texto. Desde y ≈ 1420 la columna derecha queda vacía en escritorio. | `inicio-390-full.jpg` | R2, C H-02, C H-04 | T4 |
| UX-05 | Simulador | **Empieza por el final:** en móvil lo primero es un formulario de latitud y longitud de unos 580 px; las pestañas de fenómeno quedan fuera del primer pantallazo y el mapa en y = 1034. | `simulador-390-fold.jpg` | R3, C S-03 | T5 |
| UX-06 | Simulador | **Cambiar un parámetro después del evento no hace nada** y no avisa; en móvil los parámetros están debajo de todos los resultados (y = 4646). | `sim-1440-4-tras-parametro.png` (anexo) | C S-02 | T5 («Desatar» y «Los parámetros cambiaron · Volver a simular») |
| UX-07 | Observatorio | **Controles de experto abiertos junto al mapa** en escritorio: semilla («entero entre 0 y 2.147.483.647»), ENL, órbita y cinco parámetros más, en una columna de unos 2700 px. | `observatorio-1440-full.jpg` | R4, C O-01 | T6 |

### Altas

| Id | Pantalla | Problema | Evidencia | Fuentes | Tarea |
|---|---|---|---|---|---|
| UX-08 | Todas | **Navegación sin rumbo:** riel de seis iconos sin texto con destinos que se solapan (el primero y el último casi iguales); la pantalla se llama «PACHA» y en móvil «Inicio». | `inicio-1440-fold.jpg` | R5, C H-07 | T2 |
| UX-09 | Observatorio | **Tres niveles de pestañas** (vistas → capa → mapa base) más dos desplegables: cinco elecciones antes de mirar el mapa. | `observatorio-1440-full.jpg` | R5, C O-02 | T2, T6 |
| UX-10 | Todas | **Ninguna pantalla tiene una acción principal:** en Historias está escondida a media página; en el Observatorio compiten cinco botones del mismo peso; en el Simulador la más visible («Crear el mundo») es la que menos falta hace, porque el mundo ya existe. | — | R6, C H-03, C O-07, C S-10 | T1 (sistema), T3–T6 |
| UX-11 | Simulador | **El resultado aparece fuera de la vista y sin aviso:** a 390 queda unos 230 px por debajo del borde inferior y el reproductor queda medio tapado por la barra inferior. | `sim-390-3-tras-clic.jpg` | C S-04 | T5 (resultado junto al mapa u hoja que sube, con `aria-live`) |
| UX-12 | Todas | **La jerarquía de color va al revés:** el amarillo de acento hace también de color de datos (inunda el tablero tras un sismo y todas las barras), y el naranja de «pérdida» es el de la banda de demostración. | `sim-1440-3-completa.jpg`, `obs-1440-Impacto.jpg` | R7, C S-06, C O-03 | T1 (separar el color de interfaz del de datos) |
| UX-13 | Simulador | **Arcoíris en la fase del interferograma envuelto** (rampa `ciclico`), prohibido por las reglas de color científico. | `sim-1440-3-completa.jpg` | C S-05 | T1 (rampa cíclica uniforme, p. ej. Crameri *romaO*, con su verificación en `rampas.test.ts`) |
| UX-14 | Observatorio | **Las categorías de cambio cambian de color** entre el mapa (azul, naranja y verde azulado) y las barras de Impacto (tres barras amarillas iguales); «nueva inundación» apenas se ve. | `obs-1440-Impacto.jpg` | C O-03 | T1, T6 |
| UX-15 | Todas | **Cifras sin interpretar:** escala «−21,869 … −1,478 dB» con tres decimales (con coma decimal parece «veintiún mil»); KPI «MMI 7,4», «202.277», «Víctimas 4» sin una frase; «144 / 288 h» en vez de días. | `inicio-1440-fold.jpg`, `sim-1440-3-completa.jpg` | R8, C H-05, C S-08 | T5, T6 (frase llana por KPI y lectura en palabras de cada escala) |
| UX-16 | Simulador | **Desborde horizontal a 390** (436 px) por las escalas de los paneles de radar, cuyas cifras se pisan. | `sim-390-3-completa.png` (anexo) | C S-07 | T5, T8 (añadir a la prueba de reflujo) |
| UX-17 | Observatorio | **El mapa no se puede usar con teclado:** el lienzo recibe el foco sin anillo (`mapa/mapa.css:14`, WCAG 2.4.7), y crear un escenario tocando el mapa o medir un punto o un cuadrante solo funciona con puntero. | `foco-mapa-1440.jpg`; `VistaMapa.tsx:484`, `Comparador.tsx:166` | A F-01, W | T6, T8 |
| UX-18 | Simulador | **«Vaciar la bitácora» borra al instante**, sin confirmar y sin deshacer. | `Bitacora.tsx:43` | W | T5 |
| UX-19 | Todas | **La identidad no cuenta la historia:** la «sala de control» dice tecnología, no «Pacha Mama marcada por el clima»; nada habla de tierra, agua, fuego o tiempo. | — | R9, C (veredicto de especificidad) | T1 |

### Medias

| Id | Pantalla | Problema | Fuentes | Tarea |
|---|---|---|---|---|
| UX-20 | Historias y Observatorio | La misma escena da «28,0 → 5,5 km²» en Historias y «18,3 → 5,5 km²» en el Observatorio (otra pasada «antes», sin explicarlo). | C H-06 | T4, T6 (el enlace conserva la pareja de pasadas) |
| UX-21 | Observatorio | Unidades y fechas mezcladas: km² y ha; «2025-12-13», «31/03/2026» y «13 dic 2025» en la misma vista; ejes cortados («Nueva inundaci…»). | C O-04 | T6 |
| UX-22 | Observatorio | A 390 el mapa empieza en y ≈ 480 y la cinta de pasadas queda bajo el pliegue; leyenda y atribución tapan un tercio del mapa. | C O-05, A F-04 | T6 |
| UX-23 | Observatorio | A 390, «Ver todo Ecuador» y los parámetros se esconden tras un «⋮» sin texto. | C O-06 | T6 |
| UX-24 | Simulador | Controles de experto visibles por defecto: rumbo de la falla, PAGER, mecanismo, semilla, «Lado del mundo»; humedad con dos decimales. | R4, C S-09 | T5 («Avanzado» cerrado) |
| UX-25 | Simulador | «Fundar ciudad» va entre los fenómenos; a 390 los datos del mundo ocupan cinco líneas de chips antes del mapa. | C S-10, C S-11 | T5 |
| UX-26 | Todas | Estado que no vive en la URL: polarización y pasada de Historias; capa, vista país y subvista del Observatorio; parámetros del Simulador antes de tocar el tablero. | W | T2 (el estado sigue en la URL), T4–T6 |
| UX-27 | Todas | Objetivos táctiles por debajo de 44 px en móvil: «Qué significa», `Termino`, «Mostrar leyenda», pestañas cortas, reproductor, cinta y un `summary`; interruptor de 28×16. | A F-02, A F-03, W | T1 (regla de sistema), T8 |
| UX-28 | Todas | `Pestanas` usa `role="tab"` sin `tabpanel` y hace también de control segmentado. | W | T2 (pestañas de verdad y un segmentado aparte) |
| UX-29 | Observatorio y Simulador | Acciones que no se pueden deshacer («Restablecer parámetros», «Quitar ciudades» con `reemplazar`); «Reintentar» que solo oculta el error (`VistaMapa.tsx:537`); «Crear el mundo» desactivado sin decir por qué. | W | T5, T6 |
| UX-30 | Todas | Anuncios de lector de pantalla: «Calculando… N s» se anuncia cada segundo; mover el cursor del tablero no anuncia nada; el error de la semilla no está enlazado a su campo. | W | T5, T6 |
| UX-31 | Todas | `translate="no"` ausente: el traductor automático estropea PACHA, NISAR, HH/HV, σ⁰ y NASA POWER (importa para quien navega en kichwa). | W | T7 |
| UX-32 | Todas | Sistema: el hover de los botones baja el contraste; faltan `color-scheme`, `theme-color`, zonas seguras de iOS (`safe-area-inset`) y `overscroll-behavior` en la hoja inferior; foco invisible en el botón de calendario del campo de fecha. | W, A F-05 | T1, T8 |
| UX-33 | Todas | Rendimiento: la entrada lleva los tres catálogos de idioma; la cabecera del Observatorio espera a la API; falta medir el modo Pages (lo que ve el jurado). | A F-06, A F-07 | T8 |

### Bajas

| Id | Problema | Fuentes | Tarea |
|---|---|---|---|
| UX-34 | Palabras sueltas al final de títulos y párrafos (10 casos), interlineado de 1,23 en `simulador__nota`, notas de 144 letras por línea, KPI como tarjeta dentro de tarjeta. | C, A F-10, A F-14 | T8 (`/polish`) |
| UX-35 | Pestañas del Simulador cortadas a mitad de palabra a 320 px, sin pista de desplazamiento. | A F-08 | T5 |
| UX-36 | Márgenes de contraste estrechos que cualquier cambio de paleta rompe (`--negative` sobre `--raised` 4,55:1, `--control` 3,10:1). | A F-11 | T1 (nueva tabla de contraste) |
| UX-37 | Campo de fecha nativo con el formato del navegador (mm/dd en la prueba) mientras la app escribe «15 ago 2026». | C S-13 | T5 |
| UX-38 | Más detalles de código (`name` y `autocomplete` en campos, PNG sin estado de carga, `inert` tras la hoja inferior, Re Pág/Av Pág en el comparador, etc.). | W (Bajas) | T8 |

## 3. Lo que funciona y se conserva

- **La honestidad visible:** la banda fija en los dos anchos, sellos al pie de cada capa y notas «sin verificar». Diferencia
  a PACHA ante el jurado.
- **Accesibilidad de base:** 0 violaciones de axe, «Saltar al contenido», `h1` enfocado al navegar, tablero manejable con
  flechas y Enter, etiquetas reales, `prefers-reduced-motion` respetado de verdad y reflujo limpio a 320 px.
- **Piezas propias:** el comparador antes/después, la cinta de pasadas, el mapa con localizador y leyenda plegable, los
  términos explicados en el sitio (`Termino`), el estado en la URL y los tres idiomas.
- **Sistema de tokens sin colores sueltos**, rutas con `lazy()` y MapLibre fuera de Historias y del Simulador.

## 4. Cómo se mide en T8

Repetir las tres revisiones (Impeccable `critique` y `audit` y Web Interface Guidelines) con las mismas pantallas y anchos,
y además las nuevas (Inicio, Explorar, Aprender). Para cada Id de este documento se anota: resuelto, mejorado, igual o peor.
Objetivos mínimos:
- Nielsen ≥ 32/40 en cada pantalla y heurística 8 ≥ 3.
- Una acción principal en cada pantalla.
- A 390: el primer elemento interactivo dentro del primer pantallazo y el resultado del Simulador en 3 toques sin desplazarse.
- Máximo dos niveles de pestañas.
- axe en 0 y reflujo sin desborde, también con un resultado del Simulador en pantalla.
