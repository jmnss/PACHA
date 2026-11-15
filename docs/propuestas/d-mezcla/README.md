# Propuesta D · Mezcla

**La idea.** B pone el mundo, C pone el tiempo y A pone el rigor. El Ecuador se dibuja en un corte de oeste a este, con
cada lugar a su altura. Una columna de capas cuenta las pasadas del radar, y el mapa lleva un margen con coordenadas
reales y sus signos convencionales.

Archivos: `inicio.html` y `simulador.html` comparten `estilo.css`. El JS es mínimo y va en línea: las marcas del perfil,
los deslizadores, el panel, la hoja inferior y «Desatar». `logo.svg` es el logo y también el favicon. En `capturas/` van
las capturas a 1440×900 y 390×844 (primer pantallazo y página completa) y `logo-tamanos.png`. El HTML sale de un script
que está fuera del repo, en el scratchpad de la sesión (`d-mezcla/build.py` y `relieve.py`).

## Qué toma de cada propuesta

| De | Qué | Dónde |
|---|---|---|
| **B · Perfil** (la base) | El perfil oeste-este como imagen principal, con Daule-Peripa, Casitagua y Mazar como botones a su altura que cambian la nota del lugar. Lleva el rótulo «perfil esquemático, alturas por verificar», sin cifras de altitud. Los rótulos van en cursiva dentro del corte. Spectral con Public Sans, papel arcilla y basalto para los mapas | Inicio |
| | Mini-perfil A–A′ por el punto elegido en el panel, y la línea A–A′ en el mapa. Los dos salen del mismo campo de relieve, así que coinciden | Simulador |
| **C · Estratos** | «Registro de pasadas»: una columna de capas que hace de línea de tiempo, con la más reciente arriba. La capa de arriba («Pasada en curso», en ocre) crece mientras el haz cruza el corte, así que también marca el avance de la pasada. Se rotula «ilustrativo, sin fechas reales». Ocupa el cielo, sobre la Amazonía, y no tapa el perfil | Inicio |
| | El panel es una pila de capas finas. Arriba está la capa nueva del **Resultado**, que «Desatar» vuelve a depositar con un recorte de arriba abajo. Luego vienen el mini-perfil y los tres controles. Al fondo, **Avanzado** es la capa profunda, en cacao oscuro y cerrada | Simulador |
| | Los contactos ondulados solo se usan como separadores finos: entre las capas del panel y entre la portada y las entradas | Las dos |
| **A · Carta** | Hoja con margen de papel, coordenadas reales cada 5′ (78°35′, 78°30′ y 78°25′ O; 0°00′ y 0°05′ S) y un **borde graduado cada minuto de arco**. La hoja va de 78°40′ a 78°22′ O y de 0°04′ N a 0°08′ S, en proyección lineal, así que los rótulos caen donde deben a cualquier ancho. La **línea equinoccial** pasa a unos 3 km al norte del punto. El localizador marca el recuadro de la hoja | Simulador |
| | Títulos de tarjeta en un **cajetín** sobrio (título con su dato a la derecha, sobre un filete), también en la capa «Resultado» | Las dos |
| | **Signos convencionales**: un recuadro al pie del perfil (Inicio) y una fila de signos bajo la hoja (Simulador) | Las dos |
| | **Franja de radar de unos 240 km**, verificada en `docs/nisar-verificado.md` («Most L-band acquisitions have a swath width of about 240 km»). Cruza el localizador real con una escala de 240 km, al mismo ritmo que el haz cruza el perfil. El recorrido es ilustrativo y así se rotula | Inicio |

Cambios que pidió la mezcla: el lugar del paso 2 es el **Cerro Casitagua** (−0,03; −78,52, el centro del `bbox` de
`data/incendios/casitagua/sitio.json`). El Resultado lleva el enlace secundario **«Compáralo con lo que vio el radar»**,
que lleva a la historia del incendio, con la nota «evento real · fuente por añadir». En ningún sitio va la fecha del incendio.

## Paleta

| Nombre | Hex | Uso |
|---|---|---|
| Arcilla | `#F1E9DD` | Fondo de página, cielo del perfil |
| Papel elevado | `#F8F3EC` | Tarjetas, panel, margen de la hoja, cartelas |
| Barro | `#DFD0BA` | Cuerpo de la tierra en los perfiles |
| Filete | `#CDBDA6` | Filetes, niveles, contactos ondulados, pista de los deslizadores (nunca lleva texto) |
| Tinta basalto | `#1F1D1A` | Texto principal, línea del suelo, texto del botón principal |
| Tinta secundaria | `#574F45` | Texto secundario, rótulos en cursiva, coordenadas del margen, bordes de cajetín y tarjeta |
| Basalto | `#24282B` | Campo del mapa del Simulador |
| Sobre basalto / secundario | `#F1E9DD` / `#C9BFB0` | Texto sobre el mapa |
| Páramo | `#76874F` | Tierras altas y capa «Transición» (solo gráfico) |
| Laguna | `#2B7A75` | Agua, haz del radar, franja de 240 km, capas de lluvia |
| Laguna tinta | `#246A66` | Enlaces y anillo de foco sobre papel |
| Laguna clara | `#7FB8B2` | Anillo de foco sobre basalto |
| Cacao | `#6B4226` | «El radar las lee.», regiones dentro del corte, «evento real · fuente por añadir», capa antigua |
| Limo / ceniza | `#B9A27E` / `#C9C6BC` | Capas «Temporada seca» y «Pasada sin cambios» de la columna |
| Capa nueva | `#E3DACB` | Capa «Resultado» del panel |
| Capa honda | `#56341D` | «Avanzado» (campos en `#45291A`, borde `#B89C86`, texto `#F8F3EC` / `#E6D9C9`) |
| **Ocre maíz** | `#D9A21B` | La única acción principal de cada pantalla (texto basalto), paso activo, punto del lugar elegido, «Pasada en curso», barrido del logo |
| Ocre claro | `#E4B23A` | Hover del botón principal |
| Ocre borde | `#7D5C0E` | Borde del botón principal, subrayado del destino activo, borde del paso activo y filo del barrido del logo |
| Demostración: fondo / texto / borde | `#F3D9B8` / `#6E2E0B` / `#B8561F` | Banda y sellos, con el rayado diagonal de B como signo de «demostración» |
| Datos (de `frontend/src/diseno/rampas.ts`) | `#efa04a` / `#d4622a` | Perímetro de ejemplo y punto de ignición. La paleta de marca nunca codifica valores |

**Por qué ocre y no achiote.** El achiote de B (`#A8361A`) y el melocotón de la banda (`#F3D9B8` con borde `#B8561F`)
son de la misma familia, así que la acción principal se confundía con el aviso. El ocre maíz es amarillo, más claro y más
saturado, y lleva texto oscuro. La banda sigue siendo melocotón con texto claro sobre fondo y rayado. El ocre contra la
arcilla solo da 1,91:1, así que el botón lleva un borde `#7D5C0E` (5,12:1) que lo marca como control, igual que hicieron
A y C. Los indicadores activos (subrayado, paso) usan ese borde y no el ocre solo.

## Tipografía

- **Spectral** (Production Type, Google Fonts): títulos, nombres de lugar, cajetines y cifras destacadas, en 500 y 600.
  Su cursiva sirve para la segunda línea del titular y para los rótulos escritos dentro del corte y sobre el mapa
  («páramo», «línea equinoccial, 0°», «perímetro de ejemplo»).
- **Public Sans**: cuerpo, controles, coordenadas y datos, siempre con `font-variant-numeric: tabular-nums`. No hay
  monoespaciada.
- Escala (rem / px): 0,75 / 12 coordenadas del margen · 0,8125 / 13 notas, sellos y signos · 0,9375 / 15 etiquetas y
  datos · 1,0625 / 17 cuerpo · 1,3125 / 21 cajetines y cartelas · 1,75 / 28 títulos de sección y del panel · 2,375 / 38
  titular en móvil · 3,75 / 60 titular de portada (3 rem por debajo de 1180 px). Interlineado: 1,55 en el cuerpo y 1,04
  en el titular.

## Logo

<img src="logo.svg" width="64" alt="Logo de PACHA a 64 px"> <img src="logo.svg" width="32" alt="Logo a 32 px"> <img src="logo.svg" width="16" alt="Logo a 16 px"> (64, 32 y 16 px; también en `capturas/logo-tamanos.png`)

Son dos curvas de nivel algo irregulares en tinta basalto, con un punto central. Las atraviesa una cuña de barrido en ocre
maíz con su filo en ocre borde (`#7D5C0E`): sin ese filo, el ocre se pierde sobre la arcilla a 16 px. A 16 px se leen el
anillo exterior, el punto y la cuña. Junto al dibujo va «PACHA» en Spectral 600 con un interletrado de 0,08 em.

## Contraste (WCAG 2.x, calculado con script)

| Texto / elemento | Fondo | Uso | Contraste | Mínimo | Resultado |
|---|---|---|---|---|---|
| `#1F1D1A` | `#F1E9DD` | Tinta sobre arcilla (cuerpo, títulos) | 13.96:1 | 4.5:1 | AA |
| `#1F1D1A` | `#F8F3EC` | Tinta sobre papel elevado (tarjetas, panel) | 15.23:1 | 4.5:1 | AA |
| `#574F45` | `#F1E9DD` | Secundaria sobre arcilla (bajada, rótulos en cursiva del cielo) | 6.68:1 | 4.5:1 | AA |
| `#574F45` | `#F8F3EC` | Secundaria sobre papel elevado | 7.29:1 | 4.5:1 | AA |
| `#574F45` | `#DFD0BA` | Secundaria sobre barro (rótulos en cursiva dentro del corte) | 5.31:1 | 4.5:1 | AA |
| `#6B4226` | `#F1E9DD` | Cacao sobre arcilla («El radar las lee.», «fuente por añadir») | 7.17:1 | 4.5:1 | AA |
| `#6B4226` | `#DFD0BA` | Cacao sobre barro (Costa, Sierra, Amazonía) | 5.70:1 | 4.5:1 | AA |
| `#6B4226` | `#F8F3EC` | Cacao sobre papel elevado («evento real · fuente por añadir») | 7.82:1 | 4.5:1 | AA |
| `#246A66` | `#F1E9DD` | Laguna tinta: enlaces sobre arcilla | 5.24:1 | 4.5:1 | AA |
| `#246A66` | `#F8F3EC` | Laguna tinta: enlaces en tarjetas y panel | 5.72:1 | 4.5:1 | AA |
| `#246A66` | `#E3DACB` | Laguna tinta: «Compáralo con lo que vio el radar» en la capa nueva | 4.55:1 | 4.5:1 | AA |
| `#1F1D1A` | `#D9A21B` | Botón principal: basalto sobre ocre maíz | 7.31:1 | 4.5:1 | AA |
| `#1F1D1A` | `#E4B23A` | Botón principal en hover | 8.59:1 | 4.5:1 | AA |
| `#7D5C0E` | `#F1E9DD` | Borde del botón, subrayado activo y anillo del paso sobre arcilla | 5.12:1 | 3:1 | AA |
| `#7D5C0E` | `#F8F3EC` | Borde del botón sobre papel elevado (panel) | 5.58:1 | 3:1 | AA |
| `#D9A21B` | `#F1E9DD` | Ocre solo contra arcilla (por eso lleva borde) | 1.91:1 | 3:1 | **no** |
| `#1F1D1A` | `#E3DACB` | Tinta sobre la capa nueva (Resultado) | 12.14:1 | 4.5:1 | AA |
| `#574F45` | `#E3DACB` | Secundaria sobre la capa nueva | 5.81:1 | 4.5:1 | AA |
| `#6B4226` | `#E3DACB` | Cacao sobre la capa nueva («evento real · fuente por añadir») | 6.23:1 | 4.5:1 | AA |
| `#F8F3EC` | `#56341D` | Texto sobre la capa honda («Avanzado») | 9.99:1 | 4.5:1 | AA |
| `#E6D9C9` | `#56341D` | Secundario sobre la capa honda | 7.95:1 | 4.5:1 | AA |
| `#F8F3EC` | `#45291A` | Texto de los campos de «Avanzado» | 12.00:1 | 4.5:1 | AA |
| `#B89C86` | `#56341D` | Borde de los campos de «Avanzado» | 4.27:1 | 3:1 | AA |
| `#D9A21B` | `#56341D` | Anillo de foco ocre sobre la capa honda | 4.80:1 | 3:1 | AA |
| `#6E2E0B` | `#F3D9B8` | Banda y sellos de demostración: texto | 7.49:1 | 4.5:1 | AA |
| `#B8561F` | `#F3D9B8` | Banda: borde y rayado contra su fondo | 3.52:1 | 3:1 | AA |
| `#B8561F` | `#F1E9DD` | Borde de la banda contra la página | 3.97:1 | 3:1 | AA |
| `#D9A21B` | `#F3D9B8` | Ocre contra melocotón (se distinguen por tono, no por luz) | 1.69:1 | 3:1 | **no** |
| `#F1E9DD` | `#1F1D1A` | Arcilla sobre tinta (idioma activo, marca elegida) | 13.96:1 | 4.5:1 | AA |
| `#F1E9DD` | `#24282B` | Texto claro sobre basalto | 12.34:1 | 4.5:1 | AA |
| `#C9BFB0` | `#24282B` | Secundario sobre basalto («relieve ilustrativo», «línea equinoccial») | 8.18:1 | 4.5:1 | AA |
| `#F5C48B` | `#24282B` | «perímetro de ejemplo» | 9.30:1 | 4.5:1 | AA |
| `#efa04a` | `#24282B` | Perímetro (rampa fuego, gráfico) | 6.93:1 | 3:1 | AA |
| `#d4622a` | `#24282B` | Punto de ignición (rampa fuego, gráfico) | 3.95:1 | 3:1 | AA |
| `#7FB8B2` | `#24282B` | Anillo de foco sobre basalto | 6.65:1 | 3:1 | AA |
| `#574F45` | `#F8F3EC` | Coordenadas en el margen de la hoja | 7.29:1 | 4.5:1 | AA |
| `#F1E9DD` | `#1F1D1A` | Borde graduado: tramo claro contra tramo oscuro | 13.96:1 | 3:1 | AA |
| `#246A66` | `#F1E9DD` | Anillo de foco sobre papel | 5.24:1 | 3:1 | AA |
| `#2B7A75` | `#F1E9DD` | Agua y franja de 240 km (gráfico) | 4.21:1 | 3:1 | AA |
| `#76874F` | `#F1E9DD` | Páramo (gráfico, nunca texto) | 3.26:1 | 3:1 | AA |
| `#76874F` | `#F1E9DD` | Páramo como texto (descartado) | 3.26:1 | 4.5:1 | **no** |

Las tres filas que fallan son a propósito. El ocre solo contra la arcilla nunca aparece sin su borde `#7D5C0E`. El ocre y
el melocotón de la banda no se distinguen por luminosidad sino por tono, por texto (botón con texto oscuro y verbo frente
a banda con aviso en mayúsculas) y por el rayado, que solo lleva lo de demostración. El páramo nunca lleva texto.

## Honestidad

- La banda va fija arriba en las dos páginas, sin botón de cerrar y con «Qué significa». En móvil dice
  «DEMOSTRACIÓN · no son datos reales de NISAR».
- El perfil no lleva cifras de altitud y se rotula «perfil esquemático, alturas por verificar», dentro del corte y en los
  signos. En la app saldrá del relieve SRTM. El mini-perfil del panel dice lo mismo.
- La columna de pasadas y el recorrido de la franja son ilustrativos y así se rotulan. Lo único medido es el ancho de la
  franja (≈ 240 km, verificado).
- Las coordenadas del margen de la hoja son reales y la línea equinoccial está donde debe. El relieve es sintético
  («relieve ilustrativo de la propuesta»). El sello bajo la hoja dice «Simulación · modelo de PACHA · relieve SRTM».
- Toda cifra lleva el sello rayado. En el Simulador dicen «ejemplo de demostración». El incendio del Casitagua no lleva
  fecha y dice «evento real · fuente por añadir».

## Riesgos

1. **Tres ideas en una pantalla.** El perfil, la columna y la franja se mueven al mismo ritmo, pero son tres cosas que
   leer. La columna se queda en el cielo con colores planos. Si en la demo distrae, la capa en curso puede crecer una
   sola vez al cargar. Con `prefers-reduced-motion` todo queda quieto (las capturas están hechas así).
2. **El panel del Simulador es largo.** Con el Resultado arriba (la capa nueva) y el mini-perfil debajo, a 1440×900 solo
   se ve el primer control sin desplazar. Si molesta, el Resultado puede plegarse hasta el primer «Desatar».
3. **Las alturas y la geografía del corte.** Como en B, el perfil compuesto proyecta tres latitudes sobre un solo corte.
   Hace falta un corte real (SRTM) o mantener el rótulo.
4. **La hoja con margen ocupa sitio.** El margen de papel con coordenadas le quita unos 60 px al mapa. Junto a las teselas
   de Esri en la app hay que aligerar el borde graduado.
5. **El detector de Impeccable** marca el fondo arcilla como «crema» y el rayado del sello como «franjas decorativas».
   Se mantienen: la arcilla la pide el brief (`#F1E9DD`, lejos del par prohibido `#F4F1EA` con terracota) y el rayado es
   la leyenda de lo que es demostración. También marca «hijos sin margen interior» en los cortes de las tarjetas, en el
   número de los pasos y en el mini-perfil. Ahí la tierra toca el borde a propósito.
