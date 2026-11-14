⚠️ DEGRADED: single-context (el agente que encargó la tarea prohibió lanzar más subagentes; la Evaluación A se hizo en este mismo hilo y la Evaluación B, detector y superposición en el navegador, se corrió *después* de cerrar las puntuaciones de A)

# Crítica Impeccable de PACHA: Historias, Observatorio y Simulador

- **Rama:** `rediseno-pacha`. App en `http://localhost:8000` (proveedor `mixto`), interfaz en español (`?idioma=es`).
- **Anchos:** 1440×900 y 390×844, con Chromium y Playwright. Fecha: 2026-11-14.
- **Modo Impeccable:** *Operate* para Observatorio y Simulador, y *Read* para Historias. Por eso se puntúan las diez heurísticas en las tres pantallas.
- **Marco:** PRODUCT.md, `docs/rediseno-pacha.md` (partes 1 y 2), `docs/diseno.md` (el sistema actual, que se va a sustituir) y las reglas de honestidad de CLAUDE.md. **Ninguna recomendación esconde, achica hasta volver ilegible ni permite cerrar la banda «DATOS DE DEMOSTRACIÓN» o los sellos de origen.**
- **Capturas:** todas están en `(scratchpad de la sesión, no versionado) capturas/`. Más abajo se citan solo por su nombre de archivo dentro de esa carpeta. Los scripts están en la carpeta `auditoria/`, junto a este documento.
- **Persistencia:** no se escribió en `.impeccable/critique/` porque la tarea es de solo lectura sobre el repo. El servidor `live-server` que levanté (puerto 8400) se detuvo y su carpeta `frontend/.impeccable/` se borró.

---

## Veredicto de especificidad del diseño

**Evaluación del revisor.** La app tiene material propio de verdad, pero la forma en que lo presenta no es propia:

- **Lo que es propio:** la cinta de pasadas, el comparador antes/después, la banda de honestidad y el tablero de relieve SRTM.
- **Lo que no:** el envoltorio es un «panel oscuro de tarjetas» que podría ser cualquier consola. Tarjetas `#131217` sobre `#171719`, títulos H2 dentro de cada tarjeta, botones en píldora blanca e íconos sin texto en el riel.

Nada en la composición habla de tierra, agua, fuego o tiempo. Lo más grave: **las dos historias que definen el producto según PRODUCT.md no aparecen en ninguna de las tres pantallas.** Ni Mazar, ni Daule-Peripa ni Casitagua figuran en Historias. El Observatorio abre en «Humedal La Segua» y deja los embalses dentro de un desplegable. `grep -ri "mazar|casitagua" frontend/src/pantallas` no devuelve nada, aunque `/api/escenarios` sí ofrece `embalse-daule-peripa`. La identidad cuenta la historia antigua (inundación genérica e incendio genérico), no la del equipo.

**Escaneo determinista.** `impeccable detect --json frontend/src` salió con código 0 y **0 hallazgos**. En el código fuente TSX no detecta patrones genéricos. Después inyecté el detector en vivo (`detect.js`) en cuatro vistas:

| Vista | Hallazgos | Qué detectó |
|---|---|---|
| `/` a 1440 | 2 | Dos *stragglers*: «qué.» al final del subtítulo y «reducen.» |
| `/observatorio` a 1440 | 2 | Dos *stragglers*: «lugar.» y «2026» |
| Simulador con resultado, a 1440 | 4 | `tight-leading` 1,23 (pide ≥ 1,3) ×3; `line-length` de unas 144 letras en la nota del modelo del terremoto; `nested-cards` (tarjeta dentro de tarjeta: los KPI dentro de «Terremoto Mw 7,0») |
| `/simulador` a 390 | 1 | `tight-leading` |

El detector coincide con la revisión en las tarjetas anidadas y en las líneas largas de las notas del modelo. **No ve los problemas grandes** (flujo, color científico, incoherencia de datos), porque no son patrones de marcado. No hay falsos positivos relevantes; los *stragglers* son de pulido (P3). La superposición se inyectó en pestañas sin cabeza, así que **no hay una pestaña [Human] visible para el usuario**. Capturas con la superposición: `overlay-inicio-1440.png`, `overlay-observatorio-1440.png`, `overlay-simuladorhterremotoij-1440.png` y `overlay-simulador-390.png`.

## Impresión general

Lo que funciona: la honestidad está resuelta, con la banda fija, los sellos al pie de cada capa y las notas «sin verificar». La accesibilidad de base es seria: el tablero se maneja con flechas y Enter, hay enlace «Saltar al contenido» y las etiquetas son reales.

Lo que falla es la **arquitectura de la atención**:

- Historias es un artículo de unas 1000 palabras.
- El Observatorio enseña a la vez 47 controles y los parámetros del generador.
- El Simulador pone el formulario antes del mapa en móvil, deja los resultados fuera de la vista y, lo peor, **muestra un resultado que no corresponde a los parámetros que enseña**.

**La mayor oportunidad:** convertir cada pantalla en un flujo de una acción principal en el que el mapa y la respuesta en palabras llanas aparecen juntos y primero.

## Lo que funciona (conservar)

1. **La honestidad visible y sistemática.** La banda «DATOS DE DEMOSTRACIÓN · no son observaciones reales de NISAR» queda fija arriba en ambos anchos (en móvil, con texto corto). Cada imagen o gráfico lleva su sello de origen («Sintético · Generador de demostración PACHA · generador v1 · semilla 7…»). El contexto climático dice «Real · NASA POWER». Es un diferenciador ante el jurado y está bien resuelto.
2. **Accesibilidad y teclado.** El tablero tiene `role=group` y `tabIndex=0`, con flechas y Enter. Hay «Saltar al contenido», los `label` son reales y existe el estado «Fijar como “después”» deshabilitado con su motivo («La pasada “después” debe ser posterior…»). El estado vive en la URL (`?h=terremoto&i=57&j=64`), así que se puede compartir.
3. **Piezas propias con potencial:** el comparador con divisor, la cinta de pasadas con la franja de temporada, el mapa con el localizador de Ecuador y la leyenda que se puede ocultar, y los términos explicados en el sitio (`Termino`).

---

## Pantalla 1: Historias (`/`)

Capturas: `inicio-1440-fold.png`, `inicio-1440-full.png`, `inicio-390-fold.png` y `inicio-390-full.png`.

Datos medidos:

| Medida | 1440 | 390 |
|---|---|---|
| Palabras en la página | 1015 | 1019 |
| Altura de la página | 2296 px | 4262 px |
| El comparador empieza en | y = 176 (columna derecha) | y = 1696 (dos pantallas de texto antes) |
| El botón «Ver en el Observatorio» está en | y ≈ 1395 | y ≈ 2950 |

| # | Heurística | Nota | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado del sistema | 3 | La historia activa solo se marca con un subrayado amarillo de 1 px; el comparador sí rotula «Antes · 19 mar 2026 / Después · 26 nov 2026» |
| 2 | Relación con el mundo real | 2 | Escala «−21,869 … −1,478 dB» con tres decimales y sin una frase que la interprete; «σ⁰ HH, dB» como título del gráfico |
| 3 | Control y libertad | 3 | Se cambia de historia y de polarización sin coste; no hay una ruta guiada que se pueda abandonar |
| 4 | Consistencia y estándares | 2 | El mismo escenario dice «28,0 → 5,5 km²» aquí y «18,3 → 5,5 km²» en el Observatorio; las cifras de la escala usan otra familia tipográfica (parece monoespaciada) |
| 5 | Prevención de errores | 3 | Casi no hay entradas; el cursor de la cinta solo mueve «después» |
| 6 | Reconocer antes que recordar | 2 | Riel de seis íconos sin texto a 1440; las historias aparecen como texto pequeño, no como opciones |
| 7 | Flexibilidad y eficiencia | 2 | No hay atajos ni pasos; para llegar a la cifra hay que leer |
| 8 | Diseño estético y minimalista | 1 | Muro de texto: la columna derecha queda vacía desde y ≈ 1420 hasta 2296; la imagen del comparador mide 324 px dentro de una tarjeta de unos 800 px |
| 9 | Recuperación de errores | 3 | `ErrorBloque` con «Reintentar» (visto en el código; no se provocó un error) |
| 10 | Ayuda y documentación | 3 | Términos con definición en el sitio y enlace «Qué significa» en la banda |
| **Total** | | **24/40** | **Aceptable** |

**Carga cognitiva:** fallan 4 de los 8 puntos de la lista (foco único, jerarquía visual, una cosa a la vez y divulgación progresiva). Es **carga alta**.

**Recorrido emocional:** el pico está en el comparador, pero en móvil llega después de dos pantallas de texto. El final es un botón blanco perdido en mitad de la página, seguido de dos secciones más de texto. La experiencia no cierra en un punto alto.

### Hallazgos

**H-01 · Crítica · Historias · 1440 y 390 · Regla: alineación con el challenge y PRODUCT.md (Positioning); heurística 2**
- **Evidencia:** las dos historias son «Inundación en la Costa · historia principal» e «Incendio en la Sierra», ambas sintéticas y genéricas. PRODUCT.md define las historias como Embalses (Mazar y Daule-Peripa) e Incendio (Casitagua, 17 sep 2026). Ninguno de esos nombres aparece en `frontend/src/pantallas`. Capturas: `inicio-1440-fold.png` y `inicio-390-fold.png`.
- **Recomendación:** que las dos entradas de Historias sean «Embalses y lluvia» e «Incendio de Casitagua», con su origen visible (sustituto sintético marcado mientras no haya procedencia completa). La inundación de La Segua puede quedar como ejemplo dentro del Observatorio.

**H-02 · Crítica · Historias · 390 (también 1440) · Divulgación progresiva; heurística 8; muro de texto (mentor)**
- **Evidencia:** 1019 palabras en 21 párrafos. A 390, el primer elemento interactivo de la historia (el comparador) aparece en y = 1696, después de «Qué cambia y por qué importa» y «Qué ve el radar y por qué», unos 900 px de párrafos. Captura: `inicio-390-full.png`.
- **Recomendación:** dividir la historia en pasos («Paso 1 de 4»). Cada paso tiene un titular y una cifra visible, y el detalle va en un desplegable. A 390, el comparador va arriba de todo y el texto debajo, por pasos.

**H-03 · Alta · Historias · 1440 · Una acción principal; jerarquía**
- **Evidencia:** la única acción hacia otra pantalla, «Ver en el Observatorio», es una píldora blanca en y ≈ 1395, bajo cuatro párrafos y una nota del modelo. El hallazgo con cifra («superficie inundada baja de 28,0 a 5,5 km²») va en gris secundario, bajo el comparador, sin peso visual. Captura: `inicio-1440-full.png`.
- **Recomendación:** poner el hallazgo como titular del paso, junto al comparador, y una única acción con el color de acento al final de la secuencia.

**H-04 · Alta · Historias · 1440 · Heurística 8; composición**
- **Evidencia:**
  - La imagen del comparador ocupa unos 324×324 px centrada en una tarjeta de unos 800 px de ancho, con márgenes vacíos a ambos lados.
  - Desde y ≈ 1420 la columna derecha queda vacía mientras la izquierda sigue con unos 900 px de texto.
  - El comparador no es pegajoso (*sticky*): al bajar, el lector pierde la imagen de la que habla el texto.

  Captura: `inicio-1440-full.png`.
- **Recomendación:** que el comparador se quede fijo a la derecha y cambie con cada paso, y que la imagen llene el ancho de su columna.

**H-05 · Media · Historias · 1440 y 390 · Color científico e interpretación de cifras; heurísticas 2 y 4**
- **Evidencia:**
  - La escala del comparador muestra «−21,869 · −16,772 · −11,674 · −6,576 · −1,478» con tres decimales, una precisión falsa para dB de un ejemplo. Con coma decimal, «−21,869» se lee como «menos veintiún mil».
  - Usa otra tipografía (monoespaciada), en contra de `diseno.md` («nada de monoespaciada»).
  - Solo dice «más oscuro / más claro», sin explicar qué significa oscuro (agua lisa).

  Captura: `inicio-1440-fold.png`.
- **Recomendación:** redondear a enteros (−22 … −1 dB), usar Public Sans con cifras tabulares y añadir una frase de lectura: «oscuro = agua abierta, claro = vegetación inundada».

**H-06 · Media · Historias y Observatorio · 1440 · Consistencia (heurística 4)**
- **Evidencia:** la misma escena de demostración da «28,0 → 5,5 km² (19 mar → 26 nov)» en Historias y «18,3 → 5,5 km² (13 dic → 26 nov)» en el Observatorio. Cambia la pasada «antes» y no se explica. Un jurado que pase de una pantalla a otra verá dos cifras distintas para «lo mismo». Capturas: `inicio-1440-full.png` y `observatorio-1440-full.png`.
- **Recomendación:** que el Observatorio abra con la misma pareja de pasadas que la historia («Ver en el Observatorio» debería conservarla), o que cada hallazgo nombre su intervalo con más peso visual.

**H-07 · Media · Historias · 1440 · Reconocer antes que recordar (heurística 6); navegación sin rumbo**
- **Evidencia:** el riel izquierdo tiene seis íconos sin texto (libro, mapa, matraz, gráfico, play, libro). El primero y el último son casi iguales. La pantalla se titula «PACHA», pero en la barra móvil se llama «Inicio». Captura: `inicio-1440-fold.png`.
- **Recomendación:** riel con texto y cuatro destinos (Inicio, Explorar, Simular, Aprender), como propone `rediseno-pacha.md §2.3`.

**H-08 · Baja · Historias · 1440 · Detector (*straggler*)**
- **Evidencia:** en el subtítulo, «qué.» queda sola en la segunda línea, y «reducen.» también. Captura: `overlay-inicio-1440.png`.
- **Recomendación:** `text-wrap: balance` en títulos y `pretty` en párrafos.

---

## Pantalla 2: Observatorio (`/observatorio`)

Capturas: `observatorio-1440-fold.png`, `observatorio-1440-full.png`, `observatorio-390-fold.png`, `observatorio-390-full.png`, `obs-1440-Antes-y-despu-s.png`, `obs-1440-Serie.png`, `obs-1440-Impacto.png` y `obs-390-mas-acciones.png`.

Datos medidos:

| Medida | 1440 | 390 |
|---|---|---|
| Elementos interactivos visibles | 47 (46 de menos de 44 px en algún lado) | 33 |
| Campos con etiqueta | 13 | 4 |
| Altura de la página | 2740 px | 3221 px |

**Niveles de pestañas:**
- **A 1440:** tres listas de pestañas a la vez: «Vistas del Observatorio» (Mapa · Antes y después · Serie · Impacto), luego «Capa del mapa» (Modelo en el tiempo · Cambio detectado), luego «Mapa base» (Oscuro · Satélite · Relieve, dentro del mapa). Hay además dos desplegables globales (Tipo de cambio y Escenario), así que son **cinco niveles de elección antes de mirar el mapa**.
- **A 390:** son dos listas; el mapa base se pliega en un resumen y los parámetros pasan a un menú «⋮».

**Controles de experto visibles a 1440, abiertos por defecto en la columna derecha:**
- «Semilla · Entero entre 0 y 2.147.483.647»
- «Número de miradas (ENL) · De 1 a 100»
- «Dirección de la órbita»
- «Variación estacional»
- «Fecha del evento · Entre 2024-01-01 y 2030-12-31»
- «Superficie inundada inicial (%)»
- «Tasa de secado (desv. topográfica/año)»
- «Pulso de inundación estacional»

| # | Heurística | Nota | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado del sistema | 3 | La pasada activa, la cinta y el hallazgo de la cabecera se actualizan; se ven las pestañas activas |
| 2 | Relación con el mundo real | 2 | «ENL», «Semilla», «Tasa de secado (desv. topográfica/año)», «Pulso de inundación estacional» en primer plano |
| 3 | Control y libertad | 3 | «Restablecer parámetros» y «Ver todo Ecuador»; la leyenda se puede ocultar |
| 4 | Consistencia y estándares | 2 | km² en la tabla y ha en Impacto; tres formatos de fecha en la misma vista; las categorías cambian de color entre el mapa y las barras |
| 5 | Prevención de errores | 3 | «Fijar como “después”» se deshabilita con su motivo; la semilla tiene límites |
| 6 | Reconocer antes que recordar | 2 | Tres niveles de pestañas; a 390 los parámetros quedan escondidos en «⋮» sin etiqueta visible |
| 7 | Flexibilidad y eficiencia | 3 | Teclado, paso y velocidad, URL, descarga del informe en PNG |
| 8 | Diseño estético y minimalista | 1 | 47 controles; la columna lateral mide unos 2700 px; todo pesa lo mismo |
| 9 | Recuperación de errores | 3 | `ErrorBloque` con reintento (código) |
| 10 | Ayuda y documentación | 3 | «Cómo ve el radar este tipo de cambio» (desplegable) y términos |
| **Total** | | **25/40** | **Aceptable** |

**Carga cognitiva:** fallan 5 de 8 (foco único, agrupación de cuatro o menos, opciones mínimas, una cosa a la vez y divulgación progresiva). Es **carga alta**. Hay puntos de decisión con más de cuatro opciones: los ocho parámetros, los cinco controles de reproducción con dos desplegables y la fila de cuatro vistas, dos capas y tres mapas base.

### Hallazgos

**O-01 · Crítica · Observatorio · 1440 · Divulgación progresiva; controles de experto (auditoría §4)**
- **Evidencia:** la tarjeta «Parámetros del modelo» está abierta por defecto a la derecha del mapa, desde y = 286 hasta y ≈ 1360, con la semilla («Entero entre 0 y 2.147.483.647»), el ENL, la órbita y cinco controles más. Ocupa la misma altura que el mapa y compite con él. Captura: `observatorio-1440-full.png`.
- **Recomendación:** cerrarla en «Parámetros avanzados» por defecto y dejar en ese lugar «Qué estás viendo» (una frase) y la tabla «Cambio entre dos pasadas» (que hoy está en y = 1696). Esto ya se hace a 390 con el menú «⋮» y debería ser igual en escritorio.

**O-02 · Alta · Observatorio · 1440 · Navegación; máximo dos niveles (rediseno §2.3)**
- **Evidencia:** tres listas de pestañas apiladas: vistas, capa y mapa base. Por encima hay dos desplegables. Los botones de mapa base («Oscuro · Satélite · Relieve») y la opacidad viven dentro del mapa, en una caja que tapa unos 230×90 px de la esquina superior derecha. Captura: `observatorio-1440-fold.png`.
- **Recomendación:** dejar como primer nivel las vistas. «Modelo en el tiempo / Cambio detectado» puede ser un interruptor dentro del mapa, y el mapa base, un único botón de capas que se despliega.

**O-03 · Alta · Observatorio · 1440 · Color científico; consistencia (heurística 4)**
- **Evidencia:** en el mapa, las categorías de cambio son azul (nueva inundación), **naranja** (pérdida) y verde azulado (persistente). En «Hectáreas por categoría» (Impacto), esas mismas tres categorías se dibujan como tres barras **amarillas iguales**. El naranja de «pérdida» es casi el de la banda de demostración (`--warning #e0773a`), así que el color de aviso de honestidad se recicla como dato. Además, la «nueva inundación» azul es casi invisible en la escena (pocas celdas, azul oscuro sobre gris oscuro). Capturas: `observatorio-1440-full.png` y `obs-1440-Impacto.png`.
- **Recomendación:**
  - Una paleta categórica de datos fija, apta para daltonismo, que se use igual en el mapa, las barras y la leyenda.
  - Ningún tono de datos que coincida con el de la banda de demostración ni con el acento de interfaz.
  - Comprobarla con un simulador de deuteranopía.

**O-04 · Media · Observatorio · 1440 · Consistencia en unidades y fechas (heurística 4)**
- **Evidencia:**
  - **Unidades:** la cabecera y la tabla usan km² («18,3 → 5,5 km²») y la vista Impacto usa ha («548 ha», «1.290 ha»).
  - **Fechas:** en Impacto hay tres formatos, «Dónde: 2025-12-13 → 2026-11-26», «el 31/03/2026» y, en otras partes, «13 dic 2025». El campo de fecha muestra «05/01/2026», que en un navegador en inglés de EE. UU. es mes/día, mientras la cinta dice «Evento: 1 may 2026». La ayuda dice «Entre 2024-01-01 y 2030-12-31» (ISO).
  - Las etiquetas del eje de barras se cortan: «Nueva inundaci…», «Pérdida de inu…».

  Captura: `obs-1440-Impacto.png`.
- **Recomendación:** una sola unidad de superficie por escena (o las dos en el mismo formato), y un solo formato de fecha visible («1 may 2026») en textos y ayudas. Etiquetas de eje completas, en dos líneas o en horizontal.

**O-05 · Media · Observatorio · 390 · El mapa como protagonista; móvil**
- **Evidencia:** en el primer pantallazo a 390 el mapa empieza en y ≈ 480, después del título, el hallazgo, dos desplegables y dos filas de pestañas. Lo tapan arriba la ficha plegable «Cambio · antes 13 dic 2025, después 26 nov 2026 · Capa · 85 %» y abajo la barra de navegación. Después, la leyenda y la atribución cubren cerca de un tercio de la parte inferior del mapa. Capturas: `observatorio-390-fold.png` y `obs-390-mas-acciones.png`.
- **Recomendación:**
  - Llevar «Tipo de cambio» y «Escenario» a una sola fila compacta, o a una hoja desplegable.
  - Dar más altura al mapa en móvil y mover la atribución a una línea bajo el mapa.

**O-06 · Media · Observatorio · 390 · Reconocer antes que recordar (heurística 6)**
- **Evidencia:** los parámetros del modelo y «Ver todo Ecuador» están escondidos tras un botón «⋮» («Más acciones») sin texto visible, pegado a la fila de pestañas. Esconder lo de experto está bien; esconder «Ver todo Ecuador», que sirve para elegir lugar, no. Captura: `obs-390-mas-acciones.png`.
- **Recomendación:** que «Ver todo Ecuador» sea un botón visible junto al mapa, y que los parámetros vayan en «Parámetros avanzados», con texto.

**O-07 · Media · Observatorio · 1440 · Una acción principal**
- **Evidencia:** botones del mismo peso compiten entre sí: «Ver todo Ecuador» (píldora con borde), el «Reproducir» blanco relleno, «Fijar como “antes”», «Restablecer parámetros» y «Descargar informe (PNG)» (blanco relleno, en Impacto). Ninguno se distingue como la acción de la pantalla. Captura: `observatorio-1440-fold.png`.
- **Recomendación:** decidir cuál es la acción principal (probablemente reproducir la cinta o «Comparar dos pasadas») y darle el acento. El resto, terciario.

**O-08 · Baja · Observatorio · 1440 · Detector (*straggler*)**
- **Evidencia:** «lugar.» y «2026» quedan solas en la última línea. Captura: `overlay-observatorio-1440.png`.
- **Recomendación:** `text-wrap: pretty`.

---

## Pantalla 3: Simulador (`/simulador`)

Capturas: `simulador-1440-fold.png`, `simulador-1440-full.png`, `simulador-390-fold.png`, `simulador-390-full.png`, `sim-1440-1-fenomeno.png`, `sim-1440-3-tras-clic.png`, `sim-1440-3-completa.png`, `sim-1440-4-tras-parametro.png`, y sus equivalentes `sim-390-*`.

**Flujo probado:** elegir «Terremoto» → «Crear el mundo» → pulsar el centro del tablero → esperar el resultado (unos 8 a 10 s) → mover el primer deslizador.

Datos medidos:

| Medida | 1440 | 390 |
|---|---|---|
| Pestañas de fenómeno | y = 261, dentro del primer pantallazo | y = 873, **fuera** del primer pantallazo; «Erupción» y «Fundar ciudad» quedan fuera de la pantalla (desplazamiento horizontal sin indicador) |
| «Crear el mundo» | y = 681 | y = 723 |
| Tablero | y = 318 | y = 1034 |
| Resultado «Terremoto Mw 7,0» | y = 1303 | y = 1649 |
| «Lo que vería un radar como NISAR» | y = 2043 | y = 2923 |
| Parámetros | columna lateral, y = 781 | y = 4646, **después de todos los resultados** |
| Tras el toque en el tablero | el resultado queda fuera de la vista: no se ve nada nuevo salvo la capa del evento | la vista queda en scrollY = 578, el resultado empieza unos 230 px por debajo del borde inferior y no hay ningún aviso; el botón de reproducción queda medio tapado por la barra de navegación (`sim-390-3-tras-clic.png`) |

**Pasos para llegar al resultado:**
- **A 1440:** 3 clics (pestaña, «Crear el mundo» y tablero) y un desplazamiento de unos 400 px para ver las cifras, más otro de unos 1100 px para ver el radar.
- **A 390:** un desplazamiento vertical para llegar a las pestañas, uno horizontal dentro de la fila de pestañas, el toque en la pestaña, el toque en «Crear el mundo» (innecesario, porque el mundo ya está creado al entrar: «Loja»), el toque en el tablero y unos dos desplazamientos (más de 1000 px) para ver la cifra. El radar está a unas 3,5 pantallas.
- **Cifra:** como mínimo 3 o 4 toques y 3 o 4 desplazamientos a 390.

| # | Heurística | Nota | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado del sistema | 1 | El resultado aparece fuera de la vista; un cambio de parámetro tras el evento no da ninguna señal; «Crear el mundo» invita a algo que ya pasó |
| 2 | Relación con el mundo real | 2 | «Vulnerabilidad de las construcciones (PAGER)», «MMI ≥ VI», «rake 90°», «Lado del mundo», espera «144 / 288» en horas |
| 3 | Control y libertad | 2 | Se puede cambiar de fenómeno, pero no hay pasos ni forma de volver a un paso anterior; «Vaciar la bitácora» sin confirmación aparente |
| 4 | Consistencia y estándares | 1 | El panel muestra Mw 7,8 y el resultado dice Mw 7,0; «201500» frente a «202.277»; arcoíris en un sitio y rampas uniformes en otro |
| 5 | Prevención de errores | 1 | Los parámetros cambiados después del toque no se aplican; en móvil van detrás de los resultados; latitud y longitud en texto libre |
| 6 | Reconocer antes que recordar | 2 | Pestañas cortadas a 390; la instrucción clave («Pulsa el tablero…») es una nota de 13 px bajo el mapa |
| 7 | Flexibilidad y eficiencia | 3 | Tablero con teclado, «Copiar enlace», informe PNG, CSV de la bitácora |
| 8 | Diseño estético y minimalista | 1 | El amarillo satura todo el tablero tras el sismo; cinco KPI, una tabla de diez filas, tres paneles de radar, un gráfico y la bitácora, todo de una vez |
| 9 | Recuperación de errores | 3 | `ErrorBloque` con reintento (código) |
| 10 | Ayuda y documentación | 2 | «Modelos usados» plegado; no hay guía de pasos ni estado vacío que enseñe |
| **Total** | | **18/40** | **Pobre** |

**Carga cognitiva:** fallan 6 de 8. Solo pasan la agrupación (las tarjetas agrupan) y la memoria de trabajo a 1440. Es **carga crítica**. Hay seis pestañas de herramienta, más de cuatro, y además «Fundar ciudad» no es un fenómeno.

**Recorrido emocional:** el momento de «desatar» el evento debería ser el pico. A 390 el usuario toca el mapa y **no pasa nada visible**: es un valle justo en el punto clave. A 1440, el pico (la capa del evento) llega tapado por el amarillo.

### Hallazgos

**S-01 · Crítica · Simulador · 1440 y 390 · Consistencia (heurística 4); honestidad del resultado**
- **Evidencia:** al elegir «Terremoto» y pulsar el tablero, el panel «Parámetros · Terremoto» muestra **«Magnitud Mw 7,8»** (el `defecto` del catálogo es 7.8), pero la tarjeta de resultado dice **«Terremoto Mw 7,0»** y el KPI «Mw 7,0». Lo reproduje contra la API:
  - `POST /api/simulador/evento` con `parametros: {}` devuelve «Terremoto Mw 7,0»;
  - con `{"mw": 7.8}` devuelve «Terremoto Mw 7,8».

  La causa está en `Simulador.tsx`: `alCelda` envía `p: elegidos`, que está vacío si el usuario no tocó nada, y la API usa otro valor por defecto distinto del que ve el usuario. Captura: `sim-1440-3-completa.png` (panel a la derecha frente a la tarjeta del resultado).
- **Recomendación:** enviar siempre los valores que se ven (`valores`, no `elegidos`), o igualar el valor por defecto de la API y el del catálogo, con una prueba que lo vigile. Es un error de datos, no de estética. Arreglarlo exige tocar código con su prueba, fuera de esta crítica.

**S-02 · Crítica · Simulador · 1440 y 390 · Visibilidad (heurística 1); prevención (heurística 5)**
- **Evidencia:** después del evento moví el primer deslizador (+15 pasos con el teclado) y esperé 5 s. **El resultado no cambió y no apareció ningún aviso** (la prueba de igualdad del texto del panel principal dio `false` para «cambió»). La URL siguió siendo `?h=terremoto&i=57&j=64`, sin parámetros. Los parámetros solo se leen en el momento del toque. En móvil esto empeora, porque los parámetros están **debajo** de los resultados (y = 4646). Capturas: `sim-1440-4-tras-parametro.png` y `sim-390-3-completa.png`.
- **Recomendación:** flujo de tres pasos (fenómeno → lugar → ajusta y **desata**), con un botón explícito «Desatar» después de los ajustes. Si el usuario cambia algo después, un aviso «Los parámetros cambiaron · Volver a simular».

**S-03 · Crítica · Simulador · 390 · El simulador empieza por el final (mentor); progresión**
- **Evidencia:** lo primero bajo el título es la tarjeta «Mundo» con «Lugar: Coordenadas propias», «Latitud −4.05», «Longitud −79.25», «Lado del mundo 30 km» y «Fecha 08/15/2026», unos 580 px de formulario. Las pestañas de fenómeno están en y = 873, fuera del primer pantallazo, y el tablero en y = 1034. Captura: `simulador-390-fold.png`.
- **Recomendación:** el primer paso es elegir el fenómeno, con tarjetas grandes con texto. El segundo, un mapa a pantalla completa para elegir el lugar, tocando o eligiendo del catálogo. La latitud, la longitud y el tamaño van a «Opciones avanzadas».

**S-04 · Alta · Simulador · 390 (y 1440) · Visibilidad del resultado (heurística 1)**
- **Evidencia:** tras tocar el tablero a 390, la vista no se mueve: el resultado «Terremoto Mw 7,0» empieza en y = 1649 y queda fuera de la pantalla, el botón de reproducción queda medio tapado por la barra inferior y no hay ningún aviso de que haya resultados. A 1440 los KPI quedan unos 400 px por debajo del pantallazo. Capturas: `sim-390-3-tras-clic.png` y `sim-1440-3-tras-clic.png`.
- **Recomendación:** en escritorio, resultados junto al mapa, en un panel lateral que sustituya a los parámetros una vez desatado el evento. En móvil, una hoja inferior que sube con la cifra principal y la frase «Un sismo Mw 7,0 aquí sacudiría con fuerza a unas 202 000 personas». Además, anunciar el resultado con `aria-live`.

**S-05 · Alta · Simulador · 1440 y 390 · Color científico: arcoíris**
- **Evidencia:** el «Interferograma envuelto (fase LOS)» usa una rampa cíclica tipo arcoíris (rojo, amarillo, verde, azul). PRODUCT.md (Accesibilidad) y `rediseno-pacha.md §2.2` prohíben el arcoíris. El resto de los paneles sí usa rampas razonables: desplazamiento divergente naranja–azul centrado en 0 y coherencia en azules secuenciales. Captura: `sim-1440-3-completa.png`, sección «Lo que vería un radar como NISAR».
- **Recomendación:** para la fase envuelta, una rampa **cíclica** perceptualmente uniforme (Crameri *romaO*, *vikO* o *bamO*, o cmocean *phase*), con la explicación «cada vuelta completa de color = una franja». La regla se fija en `rampas.ts` y no se toca por estética.

**S-06 · Alta · Simulador · 1440 y 390 · Color: jerarquía al revés (auditoría §7)**
- **Evidencia:**
  - **Antes del evento:** el relieve se pinta en ocre y oliva saturados, y la ciudad en lavanda (`simulador-1440-fold.png`).
  - **Después del sismo:** la capa de intensidad **inunda todo el tablero de amarillo**, se pierde la lectura del relieve, el epicentro es un círculo diminuto y los deslizamientos son trazos naranjas finos que apenas se distinguen (`sim-1440-3-completa.png` y `sim-390-3-tras-clic.png`).
  - Ese amarillo es también el acento de interfaz (`--accent #e5b93c`) y el de todas las barras de los gráficos, así que el dato se confunde con la decoración y con la selección.
- **Recomendación:**
  - Relieve en grises o en tonos tierra muy bajos de saturación, como sombreado.
  - Una capa de evento con rampa secuencial y transparencia proporcional a la intensidad, y su propia leyenda con unidades (MMI).
  - Reservar el acento de interfaz solo para la acción principal y la selección.

**S-07 · Alta · Simulador · 390 · Responsive: desplazamiento horizontal de la página**
- **Evidencia:** con el resultado del terremoto, `document.documentElement.scrollWidth = 436` a 390 de ancho. La etiqueta «26,704» de la escala de desplazamiento llega a x = 436. Las cifras de las escalas de los tres paneles de radar se pisan («−3,142−1,5710,0001,5713,142…»). Captura: `sim-390-3-completa.png` (la captura completa sale a 436 px de ancho).
- **Recomendación:** escalas con tres marcas como máximo en móvil (mínimo, 0 y máximo), redondeadas, y paneles de radar uno por fila con el comparador. Añadir esta vista a la prueba de reflujo a 320 px.

**S-08 · Alta · Simulador · 1440 y 390 · Interpretación de cifras (auditoría §8); heurística 2**
- **Evidencia:**
  - Los KPI «Intensidad máxima MMI 7,4», «Población con MMI ≥ VI 202.277» y «Víctimas estimadas 4» aparecen sin una frase que diga qué significan ni con qué comparar.
  - En la tabla de intensidad, «201500» va sin separador de miles mientras el KPI dice «202.277».
  - «¿Cuándo lo vería el radar?» dibuja 144 y 288 con la unidad «h» en 11 px, cuando lo natural sería «6 días de media, 12 como máximo».
  - En la bitácora, «Detección del radar: 4» no se entiende.

  Captura: `sim-1440-3-completa.png`.
- **Recomendación:** primero la frase llana, luego la cifra y al final la tabla (plegada). Usar el mismo formato numérico en todo el resultado, con días en lugar de horas. Etiquetar o eliminar la columna «Detección del radar».

**S-09 · Media · Simulador · 1440 y 390 · Controles de experto (auditoría §4)**
- **Evidencia:** visibles por defecto en el terremoto: «Rumbo de la falla 25°», «Vulnerabilidad de las construcciones (PAGER)», «Mecanismo · Inversa (subducción)» y «Semilla del azar 7». En el incendio, «Semilla del azar» y «Humedad del combustible muerto 13,53 %» (con dos decimales). En el mundo, «Lado del mundo» y «Relieve real (SRTM)». Capturas: `simulador-1440-fold.png` y `sim-1440-3-completa.png`.
- **Recomendación:** dejar visibles dos o tres controles esenciales por fenómeno (para el sismo: magnitud y profundidad; para el incendio: viento y dirección) y el resto en «Avanzado».

**S-10 · Media · Simulador · 1440 y 390 · Etiqueta engañosa (heurísticas 1 y 2)**
- **Evidencia:** al entrar, el mundo ya está creado (tablero de Loja y chips «Sierra · 202.277 habitantes · Temporada seca»), pero el botón blanco relleno más visible de la pantalla es «Crear el mundo». El usuario cree que debe pulsarlo antes de empezar; en realidad solo hace falta si cambia el lugar. Además, «Fundar ciudad» está entre las pestañas de fenómenos, aunque es otra clase de acción. Captura: `simulador-1440-fold.png`.
- **Recomendación:** «Cambiar de lugar» como acción secundaria del paso 2. «Fundar ciudad» fuera de la fila de fenómenos (por ejemplo, como herramienta del paso 2).

**S-11 · Media · Simulador · 390 · Densidad de metadatos**
- **Evidencia:** a 390 los chips del mundo se apilan en cinco líneas («Sierra», «Relieve: SRTM (teselas Terrarium, AWS Open Data)», «Celda 234 m», «202.277 habitantes», «Temporada seca») entre las pestañas y el tablero, unos 120 px de texto técnico antes del mapa. Captura: `sim-390-1-fenomeno.png`.
- **Recomendación:** una sola línea resumen («Loja · Sierra · temporada seca») con el detalle en un desplegable. El sello de origen se queda donde está.

**S-12 · Baja · Simulador · 1440 · Detector: `nested-cards`, `line-length`, `tight-leading`**
- **Evidencia:**
  - La fila de cinco KPI es una tarjeta dentro de la tarjeta del resultado.
  - La nota del modelo tiene unas 144 letras por línea.
  - Interlineado de 1,23 en tres textos.

  Captura: `overlay-simuladorhterremotoij-1440.png`.
- **Recomendación:** KPI sin borde propio, notas a 70–80 caracteres e interlineado de al menos 1,4 en el cuerpo.

**S-13 · Baja · Simulador y Observatorio · 1440 · Formato de fecha del campo nativo**
- **Evidencia:** «Fecha (fija la temporada) 08/15/2026» y «05/01/2026». El campo `type=date` muestra el formato del navegador (en la prueba, mm/dd), mientras el resto de la app dice «15 ago 2026». Un usuario en español puede leer «05/01» como 5 de enero. Esto depende de la configuración regional del navegador; habría que verificarlo con un Chrome en español.
- **Recomendación:** un selector de fecha propio con el mes en letras, o mostrar al lado del campo la fecha ya formateada.

---

## Otras reglas pedidas, en conjunto

**Una acción principal por pantalla:**

| Pantalla | ¿Cumple? | Por qué |
|---|---|---|
| Historias | No | La acción está escondida a media página |
| Observatorio | No | Hay al menos cinco botones del mismo peso |
| Simulador | No | La acción más visible («Crear el mundo») es la que menos falta hace, y la real (tocar el tablero) es una nota de 13 px |

**Divulgación progresiva:** solo se aplica a medias en el Observatorio a 390 (el menú «⋮» y el resumen del mapa base) y en los desplegables «Cómo ve el radar…» y «Modelos usados». En escritorio todo está abierto.

**Color científico:**
- **Lo que está bien:** comparador en grises (bien, aunque falta la frase de lectura), coherencia secuencial, desplazamiento divergente centrado en cero y climatología en barras.
- **Lo que está mal:** arcoíris en la fase (S-05), amarillo de acento usado como dato en todo (S-06 y O-03), naranja de la banda de demostración reciclado como categoría de datos (O-03), categorías con colores distintos entre el mapa y las barras (O-03) y precisión falsa en las escalas (H-05 y S-07).

**Honestidad:** cumple en las tres pantallas y en ambos anchos. La banda y los sellos están siempre visibles. **No se recomienda tocarlos**, salvo integrar su naranja en la nueva paleta sin perder contraste ni prominencia, y dejar de usar ese tono para datos.

## Personas

**Jurado o mentor del Space Apps** (proyecto, 3–5 min, portátil). Abre `/` y ve «PACHA» y un artículo. No ve Mazar ni Casitagua, así que no reconoce las historias del equipo. Pasa al Simulador, elige «Terremoto», pulsa el tablero y lee «Mw 7,0» al lado de un panel que dice «7,8». Si se da cuenta, la credibilidad científica cae en el peor momento.

**Público general desde un enlace en el móvil** (proyecto, 390 px). En el Simulador ve primero latitud y longitud y no encuentra el fenómeno. Toca el mapa y no pasa nada visible. La página se desplaza en horizontal tras el resultado. Abandona en el paso 2.

**Jordan (primera vez).** Riel de íconos sin texto, «ENL», «Semilla: 2.147.483.647», «PAGER», «MMI ≥ VI». No hay un indicador de pasos ni un estado vacío que diga «Toca el mapa para elegir dónde ocurre» con peso suficiente.

**Sam (accesibilidad).** Lo bueno: tablero con teclado, «Saltar al contenido» y etiquetas reales. Los fallos:
- 46 de los 47 elementos interactivos del Observatorio a 1440 miden menos de 44 px en algún lado (en escritorio es aceptable por WCAG 2.2 AA a 24 px, pero hay que vigilarlo en móvil, donde el Simulador tiene 3 y el Observatorio 13).
- El resultado del evento no se anuncia.
- Las categorías del mapa se distinguen solo por el color (azul frente a verde azulado con poca diferencia de luminosidad).

## Preguntas para el equipo

- ¿Y si el Simulador no tuviera formulario al entrar, sino cinco tarjetas de fenómeno y luego el mapa a pantalla completa?
- ¿Y si «Parámetros del modelo» desapareciera del Observatorio de escritorio igual que ya desaparece en móvil?
- ¿Qué tendría que ver un jurado en los primeros 10 segundos para saber que PACHA trata de *sus* embalses y de *su* incendio?

Preguntas sin hacer: me encargaron un informe escrito y no tengo forma de preguntar al usuario. Las preguntas de priorización quedan para el agente principal.

---

## Top 10 (por impacto en el challenge y en el jurado)

1. **S-01 · Crítica:** el resultado del terremoto (Mw 7,0) no coincide con el parámetro que se ve (Mw 7,8). Hay que enviar los valores visibles e igualar los valores por defecto de la API y el catálogo.
2. **H-01 · Crítica:** las historias del equipo (Mazar, Daule-Peripa y Casitagua) no aparecen; Historias cuenta los ejemplos sintéticos antiguos.
3. **S-03 + S-02 · Crítica:** el Simulador empieza por latitud y longitud, y los parámetros cambiados tras el toque no se aplican ni avisan. Hace falta un flujo de tres pasos con un botón «Desatar».
4. **H-02 · Crítica:** el muro de texto de Historias (1019 palabras; el comparador en y = 1696 a 390). Debe ser un recorrido por pasos con el comparador fijo.
5. **O-01 · Crítica:** los parámetros de experto (semilla, ENL, órbita…) están abiertos junto al mapa en escritorio. Deben ir a «Parámetros avanzados», cerrado.
6. **S-04 · Alta:** el resultado aparece fuera de la vista sin ningún aviso, sobre todo a 390. Debe ir en un panel junto al mapa o en una hoja inferior, con `aria-live`.
7. **S-05 + S-06 · Alta:** arcoíris en la fase del interferograma y el amarillo de acento inundando el tablero y todos los gráficos. Hacen falta rampas cíclicas uniformes y separar el color de interfaz del color de datos.
8. **O-03 · Alta:** las categorías de cambio tienen colores distintos en el mapa y en las barras, y la «pérdida» usa el naranja de la banda de demostración. Hace falta una paleta categórica única apta para daltonismo.
9. **S-07 · Alta:** desbordamiento horizontal a 390 (436 px) por las escalas de los paneles de radar, cuyas cifras además se pisan.
10. **O-02 + H-07 · Alta/Media:** tres niveles de pestañas en el Observatorio y un riel de seis íconos sin texto. Máximo dos niveles y cuatro destinos con texto.

**Resumen de notas:** Historias 24/40 (Aceptable) · Observatorio 25/40 (Aceptable) · Simulador 18/40 (Pobre).
