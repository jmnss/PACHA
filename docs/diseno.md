# Documento de diseño — PACHA · v2 «Tierra viva»

Versión 2 (2026-11-15, rama `rediseno-pacha`). Sustituye a la v1 «Sala de control» (oscura, acento amarillo de 1 px),
que queda en la historia de git. La identidad aprobada es la **propuesta D «Mezcla»** (`docs/propuestas/d-mezcla/`:
`README.md`, `estilo.css`, `logo.svg`, capturas) y la dirección del brief es `docs/rediseno-pacha.md` §2. Este
documento manda sobre toda decisión visual del frontend React. Los valores salen de `frontend/src/diseno/tokens.css`
(colores, tamaños, radios) y `frontend/src/diseno/rampas.ts` (datos); nada de valores sueltos.

---

## 1. Qué es la app y qué material propio tiene

PACHA muestra cómo el radar NISAR (banda L, NASA–ISRO) ve **embalses y lluvia** e **incendios en la Sierra** de
Ecuador, con un observatorio para seis tipos de cambio y un simulador de desastres sobre relieve real. Público:
estudiantes, educadores, equipos científicos y jurados, a veces en móvil.

Material propio (de aquí sale la identidad, no de una plantilla): la latitud 0° y el corte oeste-este del país
(Costa, Sierra, Amazonía); los escenarios del equipo (`embalse-mazar`, `embalse-daule-peripa`, `incendio-casitagua`);
una pasada cada 12 días; la franja de unos 240 km (verificada en `docs/nisar-verificado.md`); el vocabulario del
radar (σ⁰ en dB, polarización, fase); el relieve SRTM; las fuentes con nombre propio (NASA POWER, geoBoundaries,
SRTM, catálogo ASF).

## 2. Idea central

> **«La tierra guarda las marcas; el radar las lee.»** PACHA es un **atlas vivo de la tierra ecuatoriana**, no una
> consola. La tecnología se nota en la precisión, no en una estética de ciencia ficción.

La mezcla D: **B pone el mundo** (el perfil oeste-este con cada lugar a su altura), **C pone el tiempo** (una columna
de capas: cada pasada del radar deposita una capa nueva) y **A pone el rigor** (hoja con margen y coordenadas reales,
cajetín, signos convencionales).

- **Tema claro y cálido** (arcilla y papel) para leer y aprender. **Superficies de basalto** para todo lo que es mapa,
  tablero o imagen de radar: ahí los datos resaltan.
- **Motivo:** curvas de nivel (topografía, ondas de radar y anillos de crecimiento a la vez). Se usan en el logo, en
  separadores finos («contactos» ondulados) y en estados vacíos; nunca como textura de fondo cargada.
- **Una sola acción principal por pantalla**, en ocre maíz con su borde.

**Logo.** Dos curvas de nivel algo irregulares en tinta basalto con un punto central, atravesadas por una cuña de
barrido en ocre maíz con su filo en ocre borde `#7D5C0E` (sin el filo, el ocre se pierde sobre la arcilla a 16 px).
Junto al dibujo, «PACHA» en Spectral 600 con interletrado de 0,08 em. Mismo nombre en los tres idiomas. Archivos:
`frontend/src/diseno/marca.tsx` (colores por clase, `currentColor` para la tinta), `frontend/public/favicon.svg`.

**Lo que se descarta de la v1:** el fondo casi negro en toda la app, el amarillo cenit como línea única de selección,
los botones en píldora blanca, los títulos en sans de 700.

## 3. Pantallas y la pregunta de cada una (cuatro destinos)

| Destino | Contiene | Pregunta que responde primero | Elemento más grande |
|---|---|---|---|
| **Inicio** | (nuevo) | ¿Qué es esto y por dónde empiezo? | El perfil oeste-este con Daule-Peripa, Casitagua y Mazar |
| **Explorar** | Historias · Observatorio | ¿Qué le pasó a este lugar? | El comparador fijo (Historias) o el mapa (Observatorio) |
| **Simular** | Simulador | ¿Qué pasaría si…? | El mapa de basalto con la hoja y sus coordenadas |
| **Aprender** | Fundamentos · Laboratorio · Recorrido | ¿Cómo ve el radar? | El texto de lectura o el laboratorio |

- **Inicio:** frase de valor, perfil esquemático («alturas por verificar»), «Registro de pasadas» ilustrativo, tres
  entradas (Embalses, Incendio en la Sierra, «Provoca tu propio evento») y «¿Primera vez? Recorrido de 90 s».
- **Historias:** recorrido por pasos (Datos · Lo que ve el satélite · Simular · Impactos) con «Paso n de 4»; cada paso
  es una tarjeta con titular y una cifra visible; lo que aún no existe se marca «por llegar», nunca se inventa.
- **Simular:** tres pasos (fenómeno, lugar, ajustar y desatar). El Resultado aparece solo tras «Desatar».
- **Observatorio:** el mapa es protagonista; semilla, ENL y órbita en «Parámetros avanzados», cerrado.

**Hallazgo** (la línea bajo el título): se calcula con los datos que se muestran, nunca es un texto fijo. Con datos
sintéticos se redacta como ejemplo («En este escenario de demostración…»); con datos reales, como hipótesis.

## 4. Paleta (valores exactos)

Nombres de paisaje para lo nuevo; los nombres heredados (`--ground`, `--text`…) conservan su función con valores v2,
así las pantallas existentes heredan el tema. Este bloque es la fuente de verdad: `tokens.test.ts` exige que cada
variable exista en `tokens.css` con el mismo valor.

```css
:root {
  /* paisaje */
  --arcilla:  #F1E9DD;   /* fondo de página */
  --papel:    #F8F3EC;   /* papel elevado: tarjetas, panel, cartelas */
  --barro:    #DFD0BA;   /* cuerpo de la tierra; nunca lleva texto */
  --filete:   #CDBDA6;   /* filetes, niveles, contactos; nunca lleva texto */
  --tinta:    #1F1D1A;   /* texto principal */
  --tinta-2:  #574F45;   /* texto secundario, rótulos en cursiva */
  --paramo:   #76874F;   /* vegetación de altura (solo gráfico) */
  --laguna:   #2B7A75;   /* agua, haz del radar (solo gráfico) */
  --laguna-tinta: #246A66; /* enlaces y foco sobre papel */
  --laguna-clara: #7FB8B2; /* foco sobre basalto */
  --cacao:    #6B4226;   /* notas al margen, «evento real · fuente por añadir» */
  --limo:     #B9A27E;   /* capa «temporada seca» (gráfico) */
  --ceniza:   #C9C6BC;   /* capa «pasada sin cambios» (gráfico) */
  --capa-nueva: #E3DACB; /* capa «Resultado» */
  --capa-honda: #56341D; /* «Avanzado» */
  --capa-honda-campo: #45291A;
  --capa-honda-borde: #B89C86;
  --sobre-honda:   #F8F3EC;
  --sobre-honda-2: #E6D9C9;

  /* acción */
  --ocre:       #D9A21B;
  --ocre-claro: #E4B23A;
  --ocre-borde: #7D5C0E;
  --sobre-ocre: #1F1D1A;

  /* basalto: mapas, tableros, comparador */
  --mapa-fondo:   #24282B;
  --mapa-elevado: #2E3336;
  --mapa-borde:   #3A4044;
  --mapa-texto:   #F1E9DD;
  --mapa-texto-2: #C9BFB0;
  --mapa-muted:   #A9A196;
  --mapa-control: #8F877C;
  --mapa-acento:  #D9A21B;
  --mapa-aviso:   #EA8A4E;
  --mapa-negativo:#E5566F;

  /* nombres heredados, valores v2 */
  --ground:   #F1E9DD;
  --surface:  #F8F3EC;
  --raised:   #E9E0D2;
  --border:   #CDBDA6;
  --rule:     #DFD0BA;
  --control:  #857867;
  --grid:     #DFD0BA;
  --text:      #1F1D1A;
  --secondary: #574F45;
  --muted:     #635A4F;
  --accent:   #7D5C0E;
  --focus:    #246A66;

  /* estado */
  --positive: #2E6A4A;   --pill-positive-bg: #DDE8DC; --pill-positive-ink: #2E6A4A;
  --negative: #9B2C2C;   --pill-negative-bg: #F3DCD5; --pill-negative-ink: #9B2C2C;
  --warning:  #8E3F0F;   --pill-warning-bg:  #F5E2CC; --pill-warning-ink:  #8E3F0F;
  --pill-neutral-bg: #E9E0D2; --pill-neutral-ink: #574F45;

  /* gráficos: separados de la marca */
  --chart-1: #2a6496;
  --chart-2: #1F1D1A;
  --chart-3: #857867;

  /* demostración */
  --demo-bg:  #F3D9B8;
  --demo-ink: #6E2E0B;
  --demo-edge:#B8561F;
}
```

**Superficies de basalto.** Dentro de `.basalto` (y de `.mapa`, `.vista-mapa__mapa`, `.tablero`,
`.comparador__escenario`, `.panel-radar__lienzo`, `.campo-flujo__lienzo`) los tokens neutros se reasignan a los
`--mapa-*`: `--ground`/`--surface` → `--mapa-fondo`, `--raised` → `--mapa-elevado`, `--text` → `--mapa-texto`,
`--secondary` → `--mapa-texto-2`, `--muted` → `--mapa-muted`, `--control` → `--mapa-control`, `--accent` → ocre,
foco → `--laguna-clara`, `--warning`/`--negative` → sus versiones claras. Lo que flota sobre un mapa usa los tokens
de siempre y sale oscuro y legible. Una pantalla nueva con un mapa solo pone la clase `basalto` a su contenedor.
`frontend/src/mapa/colores.ts` repite estos valores para MapLibre (WebGL no lee variables CSS).

**Reglas de color**
- **La paleta de marca nunca codifica valores.** Los datos usan solo las rampas y categorías de abajo.
- El ocre es para una sola cosa por pantalla: la acción principal (y, en Inicio, «Pasada en curso» y el punto del
  lugar elegido). Los indicadores activos (pestaña, destino, paso) usan `--ocre-borde`, nunca el ocre solo.
- Melocotón con rayado = demostración, y nada más lleva rayado. Se distingue del ocre por tono, por texto (aviso en
  mayúsculas frente a verbo) y por el rayado.
- Páramo, laguna, barro y filete nunca llevan texto. El color de estado va en las cifras de «qué se movió», nunca en
  cada número ni en un cero.
- **Rampas de datos** (verificadas en `rampas.test.ts`: L* monótona en las secuenciales, divergente simétrica,
  cíclica cerrada y sin saltos, categorías distinguibles con deuteranopía y protanopía). Se usan tal cual; no más de
  tres capas a la vez. Viven sobre basalto, por eso la divergente tiene el centro oscuro.

| Rampa | Uso | Paradas (de bajo a alto) | L* |
|---|---|---|---|
| `gris` | σ⁰ en dB (−30 a 0) | `#0d0d0f #3a3a3e #6e6e73 #a6a6ab #e6e6e8` | 4→91 |
| `agua` | profundidad o fracción inundada | `#0f2236 #173f63 #2a6496 #4f8fc4 #8fc0e6 #d2ebf8` | 13→92 |
| `fuego` | severidad, biomasa perdida | `#2a0f07 #5e1d0c #9a3412 #d4622a #efa04a #f8d98a` | 8→88 |
| `divergente` | cambio en dB o en cm (− ← 0 → +) | `#8fc0e6 #2a6496 #1c1c1f #b4501f #efa04a` | 76/41/10/46/72 |
| `ciclico` | fase interferométrica (−π a π) | romaO de Crameri: `#733957 #8b4433 #aa752f #cfbc66 #cbe1b3 #8bcbcf #5393bf #595891 #733957` | cíclica |
| `mmi` | intensidad sísmica | `#2b2230 #6e3a52 #c96b8c #e9a9a0 #f6e2d0` | 15→91 |
| `lahar` | lahares | `#3b2a1a #6b4a28 #b5803d #e2b77a` | 19→77 |
| `ceniza` | espesor de ceniza | `#2a2a2c #6e6e73 #cfcfd2` | 17→83 |

  La cíclica es **romaO** (Crameri, *Scientific colour maps* v8, tabla de 256 entradas de `cmcrameri`), muestreada
  cada 32 entradas y cerrada en la primera; sustituye al arcoíris de la v1 (auditoría UX). Categorías: agua abierta
  `#4f8fc4`, vegetación inundada `#5fc39c`, quemado `#e0773a`, aumento > 3 dB `#4f8fc4`, disminución > 3 dB
  `#e0773a`, deslizamiento `#e5566f`. Sin cambio y sin dato: transparente. Los colores de categoría se asignan por
  variable (`COLORES_CATEGORIA` en `rampas.ts`); el color heredado de la leyenda del contrato se ignora.
- En la divergente, el signo se explica con palabras en la leyenda («más señal», «menos señal»; «hacia el
  satélite», «alejándose»), no solo con color. Cada escala lleva su lectura («más oscuro = agua lisa»).

### Contraste (WCAG 2.x; `contraste.test.ts` comprueba cada par)

| Texto / elemento | Fondo | Uso | Contraste | Mínimo |
|---|---|---|---|---|
| `#1F1D1A` tinta | `#F1E9DD` arcilla | cuerpo y títulos | 13,96 | 4,5 |
| `#1F1D1A` tinta | `#F8F3EC` papel | tarjetas, panel | 15,23 | 4,5 |
| `#574F45` secundaria | arcilla / papel / `#E9E0D2` | texto secundario | 6,68 / 7,29 / 6,15 | 4,5 |
| `#635A4F` muted | arcilla / papel / `#E9E0D2` / `#E3DACB` | notas, ejes, sellos | 5,62 / 6,12 / 5,17 / 4,88 | 4,5 |
| `#6B4226` cacao | arcilla / papel / capa nueva | notas al margen | 7,17 / 7,82 / 6,23 | 4,5 |
| `#246A66` laguna tinta | arcilla / papel / capa nueva | enlaces, anillo de foco | 5,24 / 5,72 / 4,55 | 4,5 |
| `#1F1D1A` | `#D9A21B` ocre / `#E4B23A` | botón principal / hover | 7,31 / 8,59 | 4,5 |
| `#7D5C0E` ocre borde | arcilla / papel | borde del botón, indicador activo | 5,12 / 5,58 | 3 |
| `#857867` control | arcilla / papel / `#E9E0D2` | bordes de campos y botones | 3,57 / 3,90 / 3,29 | 3 |
| `#6E2E0B` | `#F3D9B8` | banda y sellos de demostración | 7,49 | 4,5 |
| `#B8561F` | `#F3D9B8` / arcilla | borde y rayado de la banda | 3,52 / 3,97 | 3 |
| `#2E6A4A` / `#9B2C2C` / `#8E3F0F` | arcilla, papel y su píldora | positivo, negativo, aviso | ≥ 4,5 | 4,5 |
| `#2a6496` chart-1 | arcilla / papel | serie principal | 5,19 / 5,66 | 3 |
| `#F8F3EC` / `#E6D9C9` | `#56341D` capa honda | «Avanzado» | 9,99 / 7,95 | 4,5 |
| `#F1E9DD` / `#C9BFB0` / `#A9A196` | `#24282B` basalto | texto sobre el mapa | 12,34 / 8,18 / 5,82 | 4,5 |
| las mismas | `#2E3336` placa | texto en placas del mapa | 10,61 / 7,04 / 5,01 | 4,5 |
| `#D9A21B` ocre / `#7FB8B2` | basalto | selección, foco sobre el mapa | 6,46 / 6,65 | 3 |
| `#8F877C` | basalto | bordes de controles sobre el mapa | 4,19 | 3 |

Fallan a propósito y nunca se usan así: el ocre solo sobre arcilla (1,91; siempre lleva su borde), el ocre contra
el melocotón (1,69; se distinguen por tono, texto y rayado) y el páramo como texto (3,26).

## 5. Tipografía

- **Spectral** (Production Type, SIL OFL; `@fontsource/spectral` 500, 500 cursiva y 600, autoalojada como Public
  Sans): títulos de pantalla y tarjeta, nombres de lugar, cajetines y cifras destacadas (KPI). La cursiva, para la
  segunda línea del titular y los rótulos escritos dentro del corte o sobre el mapa («páramo», «perímetro de ejemplo»).
- **Public Sans** (400–700, `@fontsource/public-sans`): cuerpo, controles, coordenadas y datos. Sin monoespaciada,
  salvo código real e identificadores de producto ASF.
- Cifras **tabulares** en todo lo que sea número (`font-variant-numeric: tabular-nums`), también en Spectral.
- Escala (px, tokens `--fs-*`): 12 coordenadas, ejes y metadatos · 13 notas, sellos y cuerpo denso · 14 datos en móvil
  · 15 etiquetas · 16–17 cuerpo de lectura · 20–21 cajetines y cartelas · 26–28 títulos de pantalla y sección ·
  38 titular en móvil · 60 titular de portada (solo Inicio). Interlineado 1,55 en el cuerpo, 1,04 en el titular
  (`--lh-cuerpo`, `--lh-titular`). Nada por debajo de 12 px.
- Mayúsculas solo en la primera letra de la frase; la única etiqueta en mayúsculas es la banda de demostración.

## 6. Espaciado, forma y rejilla

- Base de 4 px. Escala: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 72 (`--space-1` a `--space-9`). Un solo hueco de 24 px;
  relleno de página 32 px (16 en móvil), de tarjeta 20 px.
- **Tres radios:** 8 px tarjetas, botones y campos (`--radius-card`, `--radius-pill`); 4 px chips, sellos y entradas
  de Inicio (`--radius-chip`); redondo solo para tiradores, puntos e interruptores (`--radius-redondo`).
- Sin sombra en reposo; solo lo que flota (menús, popover, hoja, cartela flotante) lleva `--shadow-float`.
- Alturas: control 36 px, botón principal 44 px, fila de tabla 42 px, cabecera de tabla 38 px; 44 px táctiles en móvil.
- Bordes de 1 px; 1,5 px (`--borde-control`) solo en el botón principal y el cajetín.

## 7. Estructura general

- **Riel con texto** a la izquierda en escritorio (logo y «PACHA» arriba; Inicio, Explorar, Simular, Aprender con
  icono de contorno y nombre; idioma al pie). El destino activo: tinta y un subrayado o barra de `--ocre-borde`.
  **Barra inferior con texto** bajo 700 px, con los cuatro destinos y el idioma. (La v2 de la navegación la hace T2;
  hasta entonces el riel de iconos existente hereda los colores.)
- **Banda de demostración** fija arriba en todas las pantallas mientras haya algo sintético, sin botón de cerrar.
- Dentro de Explorar y Aprender, un único nivel de subnavegación. Máximo dos niveles de pestañas en una pantalla.
- **Cabecera de pantalla:** título en Spectral 600 a 28 px (22 en móvil), el hallazgo en una línea gris debajo y, a
  la derecha, solo acciones reales.

## 8. Reglas de componentes

**Acción principal.** Una por pantalla: `Boton variante="primario"`, fondo `--ocre`, texto `--sobre-ocre`, borde
1,5 px `--ocre-borde`; hover `--ocre-claro`. Secundario: contorno `--control` sin relleno (hover, tinte de cacao al
8 %). Terciario: texto. Foco: anillo de 2 px `--focus` (laguna tinta; laguna clara sobre basalto) con 2 px de aire.

**Selección.** Pestaña, destino o paso activos: texto en tinta y una línea de 2 px `--accent` (ocre borde) tan ancha
como su etiqueta. Sin píldoras rellenas. Los controles segmentados (p. ej. idioma) marcan el activo con tinta de
fondo y texto arcilla (13,96:1).

**Cajetín.** Título de tarjeta en Spectral 600 sobre un filete; a la derecha, su dato o su estado en 13 px. La capa
«Resultado» del simulador también lleva cajetín.

**Capas (de C).** El panel del simulador es una pila de capas finas separadas por contactos ondulados (filete). Arriba,
la capa nueva `--capa-nueva` del Resultado (solo tras «Desatar»); al fondo, **«Avanzado», cerrado por defecto**, en
`--capa-honda` con campos `--capa-honda-campo`, borde `--capa-honda-borde` y texto `--sobre-honda`.

**Hoja inferior.** En móvil, los paneles (parámetros, resultado) son una hoja que sube (`HojaInferior`), con su título,
cierre con Escape y fondo `--scrim`. Nunca dejan la página con desborde horizontal.

**Aviso del motor (`AvisoMotor`).** Solo en el modo `navegador` (Pages): una fila neutra bajo la banda (`--raised`,
`--secondary`), con borde `--warning` si el motor no pudo cargarse.

**Tablas.** Cabecera de 12 px gris sin banda; filas de 42 px con regla `--rule`, sin cebra; números a la derecha,
tabulares; valor ausente, guion gris; cero real, se imprime. En móvil, filas de dos líneas.

**Formularios.** Etiqueta sobre el campo (13/500). Campos de 36 px, fondo `--raised`, borde `--control`, radio 8.
Deslizador: pista de 2 px `--control`, tirador tinta de 14 px, valor tabular. Interruptor 28×16, activo en tinta.
Un control desactivado sigue legible y dice por qué.

**Gráficos.** Siempre con escala y fechas. La serie principal en `--chart-1` (azul de la rampa `agua`, ya no el
acento); la verdad sintética en `--chart-2` punteada; la comparación en `--chart-3`. Líneas rectas de 2 px, sin puntos
ni suavizado; 3–5 líneas de rejilla `--grid`; ejes en 12 px `--muted`. Un pronóstico va punteado.

**KPI.** Sin tarjeta propia ni iconos: un contenedor dividido por líneas de 1 px, etiqueta 13 px gris sobre la cifra en
Spectral; la cifra de la respuesta es 1,3 veces mayor. Cada cifra relativa dice su base. Cada KPI con una frase llana.

**Mapa (MapLibre) — basalto.** El mapa y lo que flota sobre él viven en una superficie de basalto. Fondo local siempre
presente (`colores.ts`: tierra `#2E3336`, agua `#1C2022`, provincias `#3A4044`, fuera de Ecuador `#24282B` al 80 %,
frontera arcilla al 60 %). Mapas base de Esri seleccionables (Oscuro, Satélite, Relieve; URLs en
`frontend/src/mapa/estilo.ts`), con su atribución visible. Orden de capas: fondo local → mapa base → datos (`nearest`,
el 0 transparente, opacidad 10–100 %) → etiquetas → máscara exterior → fronteras. Placas flotantes `--surface` al
85 % (basalto). Sin red, ciudades de respaldo. Solo se colocan puntos dentro de Ecuador. La **hoja con margen** (de A:
coordenadas reales cada 5′, borde graduado, línea equinoccial) es para el Simulador (T5).

**Origen de los datos (honestidad, obligatorio).**
- **Banda de demostración:** fondo `--demo-bg`, borde inferior `--demo-edge`, texto 13/600 `--demo-ink`, con el
  cuadro rayado delante: «DATOS DE DEMOSTRACIÓN · no son observaciones reales de NISAR» y «Qué significa». No se
  cierra. En móvil: «DEMOSTRACIÓN · no son datos reales de NISAR», fija arriba.
- **Aviso del kichwa:** fila bajo la banda con sus mismos colores mientras queden textos sin validar.
- **Sello de origen** al pie de cada mapa, gráfico, comparador y tabla (12 px `--muted`); si es sintético, lleva el
  cuadro rayado delante. Nunca se omite. En el simulador dice «ejemplo de demostración».
- Un evento real (el incendio del Casitagua) se nombra **sin fecha** y con «evento real · fuente por añadir» en
  `--cacao` hasta tener la fuente.
- **Exportaciones:** CSV con líneas `# origen…`; PNG con la franja inferior de la banda.

**Comparador antes/después.** Superficie de basalto. Divisor de 2 px arcilla con tirador redondo de 32 px y zona
táctil de 44 px; fechas en placas en las esquinas; teclado ←/→ 1 %, Mayús 10 %; clic = punto, arrastre = cuadrante
en ocre. Una sola leyenda para las dos imágenes.

**Leyendas.** Junto a su capa: rampa en **pasos** de 9 casillas, 5 marcas con valores, la unidad y lo que significan
los extremos en palabras; seguida del sello de origen.

**Términos.** Cada término técnico la primera vez como `Termino` (subrayado punteado, explicación de una o dos frases).

**Estados.** Cargando: el diseño final con barras planas `--raised`, el texto de lo que se calcula y el tiempo. Error:
una frase y «Reintentar». **Vacío que enseña** («Toca el mapa para elegir dónde ocurre»), con curvas de nivel finas
como único adorno.

**Iconos.** Un solo conjunto de contorno de 1,5 px, 16 a 22 px, en tinta secundaria. Ningún emoji.

## 9. Movimiento

- Respuesta a la interacción: 120–180 ms (`--t-respuesta`), curva de salida, solo `transform`, `opacity` y color de
  fondo.
- **Una sola animación con contenido por pantalla:** en Inicio, el haz que cruza el perfil y hace crecer la capa en
  curso; en Observatorio y Simulador, el reproductor. En el Simulador, «Desatar» deposita la capa Resultado con un
  recorte de arriba abajo (una vez). Nada entra al cargar ni aparece al desplazarse.
- Con `prefers-reduced-motion`: todo quieto, el reproductor no arranca solo, transiciones instantáneas. El contenido
  nunca depende de la animación.

## 10. Comportamiento responsivo

Anchos de verificación: **1440, 768 y 390** (y sin desborde a 320).
- **Menos de 1100 px:** las columnas laterales bajan bajo el mapa.
- **Menos de 700 px:** barra inferior con texto; márgenes de 16 px; objetivos de 44 px; datos a 14 px; los paneles son
  hojas inferiores; el mapa a ancho completo dejando ver su cinta; KPI en dos columnas; pestañas que se desplazan
  dentro de su fila, nunca la página.

## 11. Imágenes y créditos

Sin fotografías: los visuales son el perfil, los mapas, las imágenes de radar y los gráficos. Créditos en
`CREDITOS.md` y al pie: NASA POWER, geoBoundaries (CC0), SRTM / Terrain Tiles (AWS Open Data), los mapas base de Esri
con su atribución, Public Sans y Spectral (SIL OFL), la rampa romaO de Fabio Crameri (*Scientific colour maps*,
doi:10.5281/zenodo.1243862). ASF DAAC y NISAR se acreditan solo cuando se usen datos reales, con la cita oficial.

## 12. Lista «anti-slop»: lo que NO debe aparecer

- **Símbolos andinos sagrados** (chakana, iconografía ritual) o **patrones textiles** como decoración. El kichwa y la
  identidad siguen la misma ética: nada se toma de una comunidad sin consultarla.
- Degradados decorativos, brillos, neón, cristal, desenfoque. Violeta o índigo en la interfaz (las rampas científicas
  de Crameri se usan tal cual). El par prohibido crema `#F4F1EA` con terracota.
- **Eyebrows** (etiqueta pequeña encima del título), etiquetas en mayúsculas espaciadas, numeración «01/02/03»
  decorativa, `// títulos`. Un número de paso solo cuando es un paso de verdad («Paso 2 de 4»).
- Más de una acción principal en ocre por pantalla; el ocre sin su borde sobre papel; el ocre como color de datos.
- Rayado en algo que no sea demostración; la banda de demostración que se cierra o se oculta.
- Texto sobre páramo, laguna, barro o filete; texto ilegible sobre un mapa.
- Tarjetas todas iguales con icono encima; KPI con icono en círculo de color o sparkline en cada KPI.
- Gráficos arcoíris, más de cuatro tonos en una pantalla, curvas suavizadas, puntos en cada dato, leyenda para una
  sola serie, donut con etiquetas encima.
- Tablas con cebra o con números a la izquierda o proporcionales.
- Sombras en reposo; más de tres radios; bordes gruesos fuera del botón principal y el cajetín.
- Monoespaciada fuera de código e identificadores; emojis en cualquier sitio.
- Datos de relleno, cifras redondas inventadas, alturas o fechas sin fuente; la palabra «real» en algo sintético; un
  hallazgo redactado como hecho sobre un lugar real; un evento real con fecha sin su fuente.
- Componentes genéricos de una librería sin adaptar, o cualquier estilo fuera de este documento.

## 13. Cómo se verifica cada pantalla

1. `bash scripts/revision_visual.sh <ruta> <nombre>` (captura a 1440, 768 y 390; lint e inspección de Taste Skill
   `--app`); capturas en `docs/capturas-nuevas/<nombre>/`.
2. Playwright con axe: 0 violaciones (como mucho los nodos «incompletos» de contraste de la línea base, 59), sin
   desborde horizontal a 320 px.
3. `cd frontend && npm test` (incluye `tokens.test.ts`, `contraste.test.ts`, `rampas.test.ts`), `npm run lint`,
   `npm run build`.
4. Crítica escrita con las preguntas de `.claude/skills/design-taste-frontend/references/app-screens.md` §2.7 y, si
   hace falta, `/critique` de Impeccable. Cada aviso se corrige o se defiende en una frase.
5. Como máximo tres rondas de corrección por pantalla; lo pendiente se anota y se sigue.
