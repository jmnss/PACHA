# Documento de diseño — NISAR · Ecuador

Dirección elegida: **A · Sala de control** (estilo `data-terminal` de Taste Skill, semilla 1100125639,
tipo «markets», oscuro). Este documento manda sobre toda decisión visual del frontend React. Si algo
no está aquí, se resuelve con `.claude/skills/design-taste-frontend/references/app-screens.md`.

La ficha de la skill queda en `.taste-skill/app/direction.json`; se reimprime con
`node .claude/skills/design-taste-frontend/scripts/draw.mjs --show`.

---

## 1. Qué es la app y qué material propio tiene

NISAR · Ecuador simula y analiza observaciones del radar NISAR (banda L, NASA–ISRO) sobre Ecuador y
detecta seis tipos de cambio: humedales, incendios, terremotos, glaciares, agricultura y subsidencia.
Incluye el Modo Dios, un simulador de desastres sobre relieve real. Público: estudiantes, equipos
científicos y jurados que la usan en sesiones largas, a veces en móvil.

Material que solo esta app tiene (de aquí sale la identidad; nada de esto está en una plantilla):

1. La latitud 0°: el país se llama como la línea, y el modelo calcula los pasos cenitales del sol.
2. Cuatro mundos: Costa, Sierra, Amazonía y Galápagos; 24 provincias con región natural.
3. Una pasada de NISAR cada 12 días: 30 adquisiciones por escena, píxel de 50 m, escena de 8×8 km.
4. Lugares reales: humedal La Segua (Manabí), Cotopaxi, glaciares, parcelas agrícolas.
5. Vocabulario propio: temporada lluviosa o seca, paso ascendente o descendente, balance hídrico, σ° en dB.
6. El Modo Dios: lahares de 1877, terremoto Mw 7,8, tsunami, ceniza, sobre relieve SRTM.
7. Imágenes de radar: granulado (speckle), fase interferométrica y mapas de cambio.
8. Fuentes con nombre propio: NASA POWER, geoBoundaries, SRTM (AWS), catálogo ASF, 13 modelos publicados.

## 2. Idea central

> En esta app, **la cinta de pasadas de NISAR** (una imagen del mismo lugar cada 12 días, con la
> temporada lluviosa o seca de fondo) se convierte en **la única línea de acento de 1 px, un amarillo
> de «sol en el cenit», que marca toda selección y recorre el mismo eje de tiempo en el mapa, las
> series y la comparación.**

Prueba del competidor: cualquier otro panel de observación de la Tierra tiene mapa y gráficos, pero
ninguno tiene una cadencia de 12 días sobre la línea ecuatorial ni un solo hilo amarillo que haga de
cenit. Un panel de bolsa o de despliegues no usaría esta frase.

**Lo vivo (la cosa que se hace en la pantalla):** arrastrar la línea de tiempo y ver cómo el mapa, la
serie y las métricas cambian a la vez, con las pasadas del satélite marcadas como muescas.

**Elemento firma, la «cinta de pasadas»:** una tira horizontal con una muesca por adquisición disponible
(30 en los escenarios de demostración; las que haya con datos reales), la marca del evento, el cursor
del instante actual en amarillo y una banda tenue de fondo para la temporada lluviosa o seca. Aparece en
Observatorio (bajo el mapa) y en Historias (bajo el comparador).

**Público.** La sala de control es oscura y sobria, pero la usan también educadores y público general:
por eso cada término técnico se explica en el sitio (§8 «Términos») y la pantalla Historias lee como un
texto, con cuerpo de 16 px.

**Cara elegida (de las tres que ofrece la skill):**
- El acento sale del mundo del producto: amarillo cenit `#e5b93c` en lugar del azul de la plantilla.
- Una firma del sistema como protagonista: la cinta de pasadas.
- Las cifras van en la misma Public Sans con cifras tabulares (nada de monoespaciada en etiquetas).

**Producto y marca:** el nombre se mantiene, «NISAR · Ecuador». Marca: un círculo de 1,5 px con una
línea horizontal que lo cruza (el ecuador), en blanco; el amarillo solo marca selección y no la marca.

**Lo que se descarta del diseño actual:** degradado cian-magenta, Orbitron, Share Tech Mono, rejilla de
fondo, esquinas cortadas, brillos, emojis como iconos, el título gigante repetido en cada pestaña.

## 3. Pantallas y la pregunta de cada una

Historia principal: **inundaciones y humedales en la Costa baja**; segunda historia: **incendios
forestales en la Sierra** (ver `docs/challenge.md`).

| Pantalla | Noche | Pregunta que responde primero | Elemento más grande |
|---|---|---|---|
| Historias (inicio) | 1 | ¿Qué ve el radar cuando el agua sube o el bosque arde, y por qué? | El comparador antes/después de la historia |
| Observatorio (Mapa, Antes/después, Serie) | 1 | ¿Qué cambió aquí entre dos pasadas y cuánto? | El mapa con la capa de cambio |
| Estación y temporada | 2 | ¿En qué estación y temporada está este lugar? | La climatología mensual |
| Modo Dios | 2 | ¿Qué pasa si desato esto aquí y lo vería el radar? | El tablero de relieve |
| Fundamentos | 2 | ¿Cómo mide el radar y por qué sirve? | El texto de lectura |
| Validación | 2, si se confirma | ¿Está bien separada la partición espacial? | La tabla de bloques |
| Catálogo y explorador | con datos reales | ¿Qué productos existen sobre esta área? | El mapa de huellas con su lista |

**Hallazgo** (la línea bajo el título): se calcula con los datos que se muestran y nunca es un texto
fijo. Mientras el origen sea sintético se redacta como ejemplo: «En este escenario de demostración, el
espejo de agua baja de 26,8 a 5,5 km² entre la primera y la última pasada». Nunca «el humedal perdió…».

## 4. Paleta (valores exactos)

```css
:root {
  /* superficies: la elevación se marca solo por luminosidad */
  --ground:   #171719;   /* fondo de la app */
  --surface:  #131217;   /* tarjetas, más oscuras que el fondo */
  --raised:   #212023;   /* paneles anidados, campos */
  --border:   #222224;
  --rule:     #1b1a1f;   /* filas de tablas */
  --control:  #3a3a3e;   /* bordes de controles */
  --grid:     #2b2b2b;   /* rejilla de gráficos */

  /* texto: dos grises, y se ven distintos */
  --text:      #ffffff;
  --secondary: #b4b4b8;
  --muted:     #8a8c92;  /* 4,5:1 sobre --surface */

  /* acento: una línea de 1 px, nunca un relleno */
  --accent:   #e5b93c;   /* amarillo cenit */

  /* estado */
  --positive: #44a282;   --pill-positive-bg: #1b2828; --pill-positive-ink: #5fc39c;
  --negative: #e5566f;   --pill-negative-bg: #2c1a20; --pill-negative-ink: #e5566f;
  --warning:  #e0773a;   --pill-warning-bg:  #2a1c14; --pill-warning-ink:  #e0773a;
  --pill-neutral-bg: #212023; --pill-neutral-ink: #bdbdc0;

  /* gráficos: un solo tono */
  --chart-1: #e5b93c;    /* serie principal: lo detectado, hoy, el periodo actual */
  --chart-2: #f2f2f3;    /* referencia: la verdad sintética del modelo (punteada) */
  --chart-3: #8a8c92;    /* comparación o lo posterior al cursor */

  /* origen de los datos (banda y sellos de demostración) */
  --demo-bg:  #2a1c14;
  --demo-ink: #f0a868;   /* 8,2:1 sobre --demo-bg */
  --demo-edge:#e0773a;
}
```

**Reglas de color**
- El color ocupa menos del 3 % de los píxeles y va sobre datos, estados y la selección. Lo demás es neutro.
- Fondo neutro verdadero: sin azul marino ni pizarra. Sin violeta ni índigo en ningún sitio.
- Positivo y negativo van en las cifras de «qué se movió», nunca en cada número. Un cambio malo (más
  incendio, menos humedal) usa `--negative`; un cambio bueno, `--positive` o gris. Cero o sin cambio, gris.
- **Rampas de datos** (verificadas: luminancia CIELAB monótona en las secuenciales, divergente
  simétrica, categorías distinguibles con deuteranopía y protanopía). Se usan tal cual, por paradas
  interpoladas linealmente; no se inventan otras. No más de tres capas a la vez.

| Rampa | Uso | Paradas (de bajo a alto) | L* |
|---|---|---|---|
| `gris` | σ⁰ en dB (−30 a 0) | `#0d0d0f #3a3a3e #6e6e73 #a6a6ab #e6e6e8` | 4→91 |
| `agua` | profundidad o fracción inundada | `#0f2236 #173f63 #2a6496 #4f8fc4 #8fc0e6 #d2ebf8` | 13→92 |
| `fuego` | severidad, biomasa perdida | `#2a0f07 #5e1d0c #9a3412 #d4622a #efa04a #f8d98a` | 8→88 |
| `divergente` | cambio en dB o en cm (− ← 0 → +) | `#8fc0e6 #2a6496 #1c1c1f #b4501f #efa04a` | 76/41/10/46/72 |
| `ciclico` | fase interferométrica (−π a π) | `#e0773a #e5b93c #5fc39c #3f8fd0 #c96b8c #e0773a` | — |
| `mmi` | intensidad sísmica | `#2b2230 #6e3a52 #c96b8c #e9a9a0 #f6e2d0` | 15→91 |
| `lahar` | lahares | `#3b2a1a #6b4a28 #b5803d #e2b77a` | 19→77 |
| `ceniza` | espesor de ceniza | `#2a2a2c #6e6e73 #cfcfd2` | 17→83 |

  Categorías: agua abierta `#4f8fc4`, vegetación inundada `#5fc39c`, quemado `#e0773a`, aumento > 3 dB
  `#4f8fc4`, disminución > 3 dB `#e0773a`, deslizamiento `#e5566f`. Sin cambio y sin dato: transparente.
  Convención: los colores de las categorías se asignan por variable (`COLORES_CATEGORIA` en `frontend/src/diseno/rampas.ts`, solo hex de esta sección; el color heredado de la leyenda del contrato se ignora), el código k de la rejilla corresponde a la categoría k de la leyenda, «Sin cambio» es transparente y una variable desconocida usa una lista fija de esta sección por posición.
- Cada tipo de cambio mantiene su rampa en todas las pantallas. Mismo sujeto, mismo tono. En la
  divergente, el signo positivo y el negativo se explican en la leyenda con palabras («más señal»,
  «menos señal»; «hacia el satélite», «alejándose»), no solo con color.

## 5. Tipografía

- **Una sola familia: Public Sans** (pesos 400, 500, 600, 700), autoalojada con `@fontsource/public-sans`
  (la app no debe depender de Google Fonts en ejecución ni en las pruebas).
- Cifras **tabulares** en todo lo que sea número: `font-variant-numeric: tabular-nums`. Tarea de
  verificación (plan): comprobar que activarlo cambia de verdad el ancho de los dígitos; si no, cambiar
  de tipografía.
- Escala (px): **26** título de pantalla (700) · **20** sección (400, gris `--muted`) · **20** cifra
  principal · **16** título de tarjeta (600) · **13** cuerpo y celdas · **12** etiquetas, ejes, metadatos.
  Nada por debajo de 11 px. Ninguna cifra llega a 48 px.
- **Historias** es lectura: cuerpo de **16 px**, interlineado 26 px, medida máxima de 68 caracteres;
  títulos de cada parte a 20 px (600). El resto de la escala no cambia.
- Mayúsculas solo en la primera letra de la frase. Sin etiquetas en mayúsculas espaciadas ni `// títulos`.
- Interlineado 20 px en 13 px, 24 px en 16 px. Espaciado entre letras 0; negativo solo en títulos grandes.
- Monoespaciada: solo código real y los identificadores de producto ASF, truncados con puntos suspensivos.

## 6. Espaciado, forma y rejilla

- Base de 4 px. Escala: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64.
- **Un solo hueco** en horizontal y vertical: 24 px. Relleno de página 32 px, de tarjeta 20 px.
- Radios: tarjetas 6 px, campos y botones en píldora (999), chips 4 px. Los radios anidados bajan, nunca suben.
- Sin sombra en nada en reposo. Solo cast shadow en lo que flota: menús, popover, diálogo (`0 12px 28px rgba(0,0,0,.2)`).
- Alturas: control 34 px, fila de tabla 42 px, cabecera de tabla 38 px, fila de lista 28 px.
- Cada tarjeta de una misma fila termina en el mismo borde inferior. La rejilla se calcula con la suma
  y se anota en un comentario del código (columnas + huecos = ancho del lienzo).

## 7. Estructura general

- **Riel de iconos de 50 px** a la izquierda: la marca arriba; destinos en este orden: Historias,
  Observatorio (y en la noche 2: Estación, Modo Dios, Fundamentos); iconos de contorno de 16 px con
  tooltip y nombre accesible; el destino activo se marca por brillo (gris → blanco) y una barra de 1 px
  amarilla en el borde del riel. Solo aparecen destinos que existen.
- **Banda de demostración** (ver §8 «Origen de los datos»): la primera fila del lienzo en todas las
  pantallas, por encima del título, mientras haya datos sintéticos.
- **Sin barra superior.** El título de la pantalla, el lugar y el tipo de cambio van en la cabecera del lienzo.
- **Cabecera de pantalla:** título 26/700, una línea gris con el hallazgo debajo, y a la derecha solo
  acciones reales (por ejemplo «Descargar CSV»), más la marca de frescura de los datos.
- **Observatorio:** lienzo en dos columnas, mapa y cinta a la izquierda; a la derecha una columna fija de
  384 px con parámetros del modelo y métricas. Las pestañas internas (Mapa, Antes/después, Serie) son
  subvistas con la misma cinta de pasadas debajo.
- Las acciones principales del trabajo (Play, mover el comparador, exportar) están a un clic de la
  primera pantalla.

## 8. Reglas de componentes

**Selección (la jugada del estilo).** Toda selección (pestaña, interruptor, rango, destino del riel) es una
**línea de 1 px de `--accent`, tan ancha como su etiqueta**, apoyada en el borde existente más cercano.
Nada de píldoras rellenas, segmentados coloreados ni barras gruesas.

**Botones.** Un solo primario por pantalla: píldora blanca de 34 px con texto negro. Secundario:
contorno `--control` de 1 px, sin relleno. Terciario: texto. Los controles de una fila comparten altura.
Foco visible: anillo de 2 px blanco con 2 px de separación.

**Tablas.** Cabecera de 12 px gris, sin banda ni fondo. Filas de 42 px con regla de 1 px `--rule`, sin
cebra. Números alineados a la derecha, con tabulares y decimales fijos por métrica. Solo la identidad y
el total en blanco; lo demás gris. Dos medidas apiladas en una celda (cifra sobre su 12 px gris).
Valor ausente: guion gris. Cero real: se imprime. En móvil, las tablas pasan a filas de dos líneas.

**Formularios y controles.** Etiqueta sobre el campo, 13 px/500. Campos de 34 px, fondo `--raised`,
borde `--control`. Deslizadores: pista de 2 px, tirador blanco de 14 px, el valor en cifras tabulares.
Selectores: el mismo campo con un chevron de 12 px. Interruptor 28×16, activo en blanco, no en amarillo.
Un campo con límite visible lo declara bajo la etiqueta. Los controles desactivados siguen legibles y
dicen por qué.

**Gráficos.** Siempre con escala y fechas. Una serie, un tono (`--chart-1`); la comparación en gris o
punteada. Líneas rectas de 2 px sin puntos ni suavizado. Relleno ninguno, o un tinte plano del 14 %.
3 a 5 líneas de rejilla horizontales de 1 px, sin línea de eje en y, ticks redondos con el tope por
encima del máximo, ejes en 12 px gris. Sin leyenda si hay una sola serie; si hay varias, puntos de 5 px
en la cabecera de la tarjeta. Cada evento que importa lleva una marca de 1 px y una etiqueta de 12 px.
Un pronóstico va punteado. Cero real: línea plana dibujada, no «sin datos».

**KPI.** Sin tarjeta propia, sin iconos, sin sparklines. Un contenedor dividido por líneas de 1 px, etiqueta
13 px gris sobre valor de 20 px en 400 a 600. La cifra de la respuesta es 1,3 veces mayor que sus vecinas.
Cada cifra relativa dice su base («frente a la pasada anterior, 24 abr»).

**Mapa (MapLibre) — carta geográfica.** Decisión del usuario (sustituye a «primero local, OpenFreeMap opcional»):
el mapa **puede requerir internet** y es una carta con colores, etiquetas y terreno, porque eso sirve para
analizar los datos. Estilo propio sobre un **fondo local** siempre presente: tierra `#1b1b1f`, agua
`#101014`, provincias `#2e2e33` y fuera de Ecuador `#171719` al 80 % (el GeoJSON del repositorio, sin
glyphs), frontera de Ecuador en blanco al 60 % de 1 px.

- **Mapas base seleccionables** (control flotante «Mapa base», pestañas con línea de 1 px `--accent`):
  *Oscuro* (Esri Canvas World_Dark_Gray_Base + World_Dark_Gray_Reference), *Satélite* (Esri World_Imagery +
  Reference/World_Boundaries_and_Places) y *Relieve* (Esri World_Topo_Map, que ya trae sus etiquetas). Son
  fuentes raster de MapLibre de `server.arcgisonline.com` (sin clave ni cuenta; URLs en `frontend/src/mapa/estilo.ts`).
- **Orden de capas:** fondo local → mapa base → **capa de datos** (lienzo `nearest`, el 0 transparente,
  opacidad regulable 10–100 %) → etiquetas de referencia → máscara de fuera de Ecuador → frontera y
  límites provinciales. En *Relieve* las etiquetas van dentro de la tesela, bajo los datos.
- **Sin red** (`VITE_MAPA_REMOTO=0`, `navigator.onLine` falso o cuatro errores de tesela sin ninguna cargada)
  el mapa queda como el fondo local con provincias, y aparecen las **ciudades de respaldo**
  (`frontend/src/mapa/ciudades.ts`: capitales de provincia y ciudades grandes, marcadores HTML de 12 px;
  solo las tres mayores con el país entero). Con los mapas de Esri no se dibujan, para no duplicar etiquetas.
- **Inmersión:** el mapa mide `--h-mapa` (alto de la ventana menos cabecera, con mínimo y máximo en tokens).
  La leyenda (plegable), el rótulo de la pasada, el mapa base y la opacidad son placas flotantes `--surface`
  al 85 % sobre el mapa, sin degradados ni brillos; la cinta de pasadas y sus controles siguen debajo.
- Solo se pueden colocar puntos dentro de Ecuador. **Atribución** visible abajo a la derecha: geoBoundaries y
  el texto que exige Esri para el mapa base elegido. La imagen satelital es fondo real; la capa de datos
  sigue siendo sintética y su sello lo dice.

**Origen de los datos (honestidad, obligatorio).**
- **Banda de demostración:** franja de 36 px, ancho completo del lienzo, fondo `--demo-bg`, borde
  inferior de 1 px `--demo-edge`, texto 13/600 `--demo-ink`: «DATOS DE DEMOSTRACIÓN · no son
  observaciones reales de NISAR» y, a la derecha, el enlace «Qué significa» que abre un panel con el
  generador, la semilla y la fecha. Es la única etiqueta en mayúsculas de la app (la regla de la skill
  permite una). No se puede cerrar ni ocultar. En móvil: 32 px, una línea, «DEMOSTRACIÓN · no son datos
  reales de NISAR», fija arriba al desplazar.
- **Sello de origen:** al pie de cada mapa, gráfico, comparador y tabla, una línea de 12 px `--muted`:
  «Sintético · generador v1 · semilla 7 · generado 2026-11-05» o «NASA POWER · climatología 2001–2025».
  Nunca se omite.
- **Exportaciones:** los CSV empiezan con líneas `# origen…` y la advertencia; los PNG llevan una franja
  inferior de 24 px con el mismo texto que la banda, dibujada en la imagen.
- La verdad sintética se rotula «verdad sintética» (punteada), nunca «real».

**Comparador antes/después.** Dos imágenes de la misma extensión, la misma rampa y el mismo rango (una
sola leyenda). Divisor vertical de 2 px `--text` con un tirador de 32 px de diámetro (contorno 1 px,
relleno `--surface`) y zona táctil de 44 px. Fechas en las esquinas superiores en 12 px sobre una placa
`--surface` al 85 %: «Antes · 12 abr 2026», «Después · 26 nov 2026». Teclado: ←/→ 1 %, Mayús 10 %.
Polarización activa en el título («σ⁰ HH, dB»). Clic = punto, arrastre = cuadrante (1 px `--accent`).

**Leyendas.** Siempre visibles junto a su capa: rampa en **pasos** de 9 casillas (sin degradado), 5
marcas con valores, la unidad («dB», «cm», «km²») y lo que significan los extremos en palabras. Las
categorías llevan su muestra exacta. Cada leyenda va seguida del sello de origen.

**Términos.** Cada término técnico (σ⁰, dB, HH, HV, polarización, banda L, LOS, coherencia, ENL)
aparece la primera vez como componente `Termino`: subrayado punteado de 1 px y, al pulsarlo o con
teclado, una explicación de una o dos frases en lenguaje llano. Las Historias no usan siglas sin
explicarlas.

**Datos pesados y carga.** Mientras se calcula un escenario o un lote de fotogramas: el diseño final con
barras grises, el texto «Calculando 120 fotogramas…» y el tiempo transcurrido; el reproductor queda
desactivado con su motivo. Nunca una pantalla en blanco ni un giro infinito sin texto.

**Tablas largas.** Más de 50 filas: «1–50 de N» con paginación al pie; la cabecera queda fija al
desplazar dentro de la tabla.

**Cinta de pasadas.** Una muesca de 1 px por adquisición (cada 12 días en la demostración; con datos
reales, las fechas que existan); el evento en blanco; el cursor y la
adquisición activa en `--accent`; banda de fondo tenue (`--raised`) para la temporada lluviosa. El
arrastre se mide en minutos como hoy. Es también el control de tiempo: Play, retroceder, adelantar y
velocidad al lado.

**Estados.** Cargando: el diseño final con barras grises planas del tamaño real, sin brillo ni
desplazamiento. Error: dentro del bloque, una frase con la hora del último dato bueno y un botón
«Reintentar». Vacío: el marco con título y una frase; los gráficos vacíos dibujan la línea de cero. Los
datos estáticos que no se pueden actualizar lo dicen con un aviso discreto.

**Iconos.** Un solo conjunto de contorno de 1,5 px, 14 a 20 px, en gris. Nunca dentro de un círculo ni
un cuadrado de color. Ningún emoji.

## 9. Movimiento

- Solo respuesta a la interacción: pulsar, pasar el cursor, foco, abrir un menú o un panel. 120 a 180 ms,
  curva de salida suave; solo `transform` y `opacity`.
- La única animación con contenido es el reproductor del mapa y del Modo Dios. Nada hace entrada en la
  carga y no hay efectos de aparición al desplazarse.
- Con `prefers-reduced-motion`: el reproductor no arranca solo y las transiciones son instantáneas.
  El contenido nunca depende de la animación.

## 10. Comportamiento responsivo

Tres anchos de verificación: **1440 (escritorio), 768 (tablet), 390 (móvil)**.

- **Menos de 1100 px:** la columna de 384 px baja debajo del mapa; el riel se mantiene.
- **Menos de 700 px:** el riel pasa a una **barra inferior** con los mismos seis iconos y una etiqueta
  corta bajo cada uno; márgenes de 16 px; objetivos táctiles de al menos 44 px; texto de datos 14 px y
  nada por debajo de 12 px.
- El título se queda (22 px) y las acciones secundarias van a un menú de tres puntos.
- Los parámetros del Observatorio abren como una **hoja inferior**; el mapa ocupa el ancho completo, con
  una altura que deja ver la cinta de pasadas sin desplazarse.
- KPIs en rejilla de 2 columnas, o lista con etiqueta a la izquierda y valor a la derecha. Nunca cuatro
  columnas apretadas.
- Gráficos a ancho completo, de 160 a 200 px de alto, con 3 o 4 etiquetas en x.
- Las pestañas internas se desplazan dentro de su fila, nunca la página en horizontal.

## 11. Imágenes y créditos

La app **no necesita fotografías**: los visuales son los mapas, las imágenes de radar y los gráficos que
genera. Por eso no hay búsqueda de imágenes en colecciones abiertas. Los créditos van en `CREDITOS.md`,
al pie de Historias y, en pequeño, sobre el mapa: NASA POWER, geoBoundaries (CC0), SRTM / Terrain Tiles
(AWS Open Data, solo Modo Dios), los mapas base de Esri (Dark Gray, World Imagery, World Topo y sus etiquetas; OpenStreetMap, HERE, Garmin y otros según la atribución del servicio) cuando hay internet, Public Sans (SIL OFL).
ASF DAAC y cualquier producto NISAR se acreditan solo cuando se usen datos reales, con la cita oficial.

## 12. Lista «anti-slop»: lo que NO debe aparecer

Reprobaría una pantalla la revisión de Taste Skill (`inspect.mjs --app` y `lint.mjs --app`) y la mía:

- Degradados en cualquier sitio (texto, botones, fondos, tarjetas); brillos, neón, cristal, desenfoque.
- Violeta, índigo, el par crema y terracota. Azul marino o pizarra en el fondo oscuro.
- Barra lateral coloreada o saturada, con píldora de color en el destino activo.
- Un «saludo» o título gigante tipo página de aterrizaje; títulos de más de 32 px o cifras de 48 px o más.
- KPI con icono en círculo de color, sparkline en cada KPI, tarjetas todas iguales con icono encima.
- Etiquetas pequeñas en mayúsculas espaciadas, numeración «01/02/03», eyebrows, `// títulos`.
- Texto monoespaciado fuera de código e identificadores.
- Emojis en etiquetas, navegación, pestañas o estados vacíos.
- Gráficos arcoíris, más de cuatro tonos en una pantalla, curvas suavizadas, puntos en cada dato, una
  leyenda para una sola serie, un donut con etiquetas sobre las porciones.
- Tablas con cebra, cabecera con banda, números alineados a la izquierda o con cifras proporcionales.
- Sombras en reposo; bordes más pesados de 1 px; más de tres radios distintos.
- Datos de relleno (lorem, Acme, «Usuario 1»), cifras redondas inventadas, totales que no suman.
- Rojo o verde en cada número; color de estado en un cero o en un cambio indefinido.
- Una pantalla sin nombre de producto, sin su acción principal a un clic, o con una cifra sin unidad.
- Cualquier estilo fuera de este documento: componentes genéricos de una librería sin adaptar.
- Datos sin banda de demostración o sin sello de origen; una exportación sin su marca; la palabra «real»
  en algo sintético; un hallazgo redactado como hecho sobre un lugar real.
- Barras de color en degradado continuo, rampas distintas de las de §4, una leyenda sin unidad.

## 13. Cómo se verifica cada pantalla (criterio visual del plan)

1. Captura en navegador real a 1440, 768 y 390 px.
2. `node .claude/skills/design-taste-frontend/scripts/lint.mjs --app <fuentes>` sin fallos.
3. `node .claude/skills/design-taste-frontend/scripts/inspect.mjs --app <url>` sin fallos; cada aviso se
   corrige o se defiende en una frase.
4. Crítica escrita con las siete preguntas de `app-screens.md` §2.7.
5. Como máximo tres rondas de corrección; lo pendiente va a `INFORME.md` y se continúa.
