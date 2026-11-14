# Propuesta B · Perfil

La idea parte del *Tableau physique des Andes* de Humboldt y Bonpland, el corte del Chimborazo de 1807: el Ecuador se dibuja en corte, del Pacífico a la Amazonía, y cada cosa se escribe a la altura a la que está, con las notas al margen. De ese grabado se toma la forma de componer: el corte oeste-este, las cosas a su altura y las notas a los lados. No hay texturas de papel viejo ni imitación de grabado. Todo es SVG y HTML limpios.

- `inicio.html`: la portada. El perfil esquemático ocupa la pantalla y el título va en el «cielo», sobre la Costa. Daule-Peripa, Casitagua y Mazar son botones marcados a su altura: al tocarlos cambia la nota del lugar que va al pie del perfil. Un haz de radar cruza el corte de oeste a este cada 26 s y se queda quieto con `prefers-reduced-motion`. Arriba a la derecha va un localizador con el contorno real (geoBoundaries).
- `simulador.html`: el paso 3. El mapa en planta va sobre basalto y lleva la línea de corte A–A′. El panel de ajustes empieza con un **mini-perfil A–A′ por el punto elegido**: es la firma de esta dirección, que une la planta con el corte. El mini-perfil sale del mismo campo de relieve ilustrativo que el mapa, así que las dos vistas coinciden.
- `estilo.css` lo comparten las dos páginas. `logo.svg` es el logo, que también sirve de favicon.

## Paleta

Se partió de la paleta del encargo. Solo hubo dos cambios, porque un tono no llegaba a AA:

| Nombre | Hex | Uso |
|---|---|---|
| Arcilla | `#F1E9DD` | Fondo de página |
| Papel elevado | `#F8F3EC` | Tarjetas, panel, hoja inferior, cartelas de las marcas |
| Barro | `#DFD0BA` | Cuerpo de la tierra en los perfiles (añadido) |
| Filete | `#CDBDA6` | Filetes, niveles sin cifra, pista de los deslizadores (añadido, no lleva texto) |
| Tinta basalto | `#1F1D1A` | Texto principal, línea del suelo, marca elegida |
| Tinta secundaria | `#574F45` | Texto secundario, rótulos en cursiva |
| Basalto | `#24282B` | Superficie del mapa del Simulador |
| Páramo | `#76874F` | Tierras altas y selva en los perfiles (solo gráfico) |
| Laguna | `#2B7A75` | Agua en los gráficos (mar, embalses, haz del radar) |
| Laguna tinta | `#246A66` | **Ajuste:** enlaces y anillo de foco sobre papel. `#2B7A75` daba 4,21:1 sobre arcilla |
| Laguna clara | `#7FB8B2` | Anillo de foco sobre basalto |
| Cacao | `#6B4226` | Segunda línea del título, nombres de región dentro de la tierra, ladera quemada |
| Achiote | `#A8361A` | Única acción principal por pantalla, paso activo, barrido del logo |
| Achiote hondo | `#8C2B13` | Hover del botón principal |
| Texto sobre achiote | `#FFF8F0` | Texto del botón principal |
| Demostración: fondo | `#F3D9B8` | Banda y sellos |
| Demostración: texto | `#6E2E0B` | Banda y sellos |
| Demostración: borde | `#B8561F` | Borde de la banda y rayado del sello |

Los colores de datos salen de `frontend/src/diseno/rampas.ts`: el perímetro de ejemplo usa `#efa04a` y el punto de ignición `#d4622a` (rampa `fuego`). La paleta de marca nunca codifica valores.

**Sello de demostración.** Es un cuadrado con rayado diagonal en `#B8561F`, siempre el mismo: en la banda, junto a cada cifra y bajo el mapa. Así funciona como leyenda: lo rayado es demostración.

## Tipografía

- **Spectral** (Production Type, Google Fonts) para títulos, nombres de lugares y rótulos en cursiva escritos dentro del perfil («páramo», «valle interandino»). Su cursiva es la voz de las notas del corte.
- **Public Sans** para el cuerpo, los controles y los datos, siempre con `font-variant-numeric: tabular-nums`.

Escala (rem / px): 0,8125 / 13 notas y sellos · 0,9375 / 15 etiquetas y datos · 1,0625 / 17 cuerpo · 1,3125 / 21 subtítulos y nombres de las marcas · 1,75 / 28 títulos de sección · 2,375 / 38 título en móvil · 3,75 / 60 título de portada. Las cifras de las tarjetas y del resultado van en Spectral seminegrita.

## Logo

<img src="logo.svg" width="64" alt="Logo de PACHA a 64 px"> <img src="logo.svg" width="32" alt="Logo a 32 px"> <img src="logo.svg" width="16" alt="Logo a 16 px"> (64, 32 y 16 px)

Son dos curvas de nivel algo irregulares con un punto central y una cuña de barrido de radar en achiote, con su borde de ataque. A 16 px se leen el anillo exterior, la cuña y el punto. El SVG está hecho a mano (`logo.svg`). Al lado va «PACHA» en Spectral seminegrita con un interletrado de 0,08 em.

## Contraste (WCAG 2.x, calculado con script)

| Texto | Fondo | Uso | Contraste | AA |
|---|---|---|---|---|
| `#1F1D1A` | `#F1E9DD` | Tinta sobre arcilla (cuerpo, títulos) | 13,96:1 | sí |
| `#1F1D1A` | `#F8F3EC` | Tinta sobre papel elevado | 15,23:1 | sí |
| `#1F1D1A` | `#DFD0BA` | Tinta sobre barro | 11,10:1 | sí |
| `#574F45` | `#F1E9DD` | Secundaria sobre arcilla | 6,68:1 | sí |
| `#574F45` | `#F8F3EC` | Secundaria sobre elevado | 7,29:1 | sí |
| `#574F45` | `#DFD0BA` | Secundaria sobre barro (rótulos en cursiva) | 5,31:1 | sí |
| `#6B4226` | `#F1E9DD` | Cacao sobre arcilla («El radar las lee.») | 7,17:1 | sí |
| `#6B4226` | `#DFD0BA` | Cacao sobre barro (Costa, Sierra, Amazonía) | 5,70:1 | sí |
| `#246A66` | `#F1E9DD` | Laguna tinta: enlaces sobre arcilla | 5,24:1 | sí |
| `#246A66` | `#F8F3EC` | Laguna tinta: enlaces en tarjetas | 5,72:1 | sí |
| `#FFF8F0` | `#A8361A` | Botón principal | 6,22:1 | sí |
| `#FFF8F0` | `#8C2B13` | Botón principal en hover | 8,07:1 | sí |
| `#F1E9DD` | `#1F1D1A` | Marca elegida, idioma activo | 13,96:1 | sí |
| `#6E2E0B` | `#F3D9B8` | **Banda y sellos de demostración** | 7,49:1 | sí |
| `#B8561F` | `#F3D9B8` | Borde y rayado de demostración (gráfico) | 3,52:1 | sí (≥3) |
| `#B8561F` | `#F1E9DD` | Borde de la banda contra la página (gráfico) | 3,97:1 | sí (≥3) |
| `#F1E9DD` | `#24282B` | Texto claro sobre basalto | 12,34:1 | sí |
| `#C9BFB0` | `#24282B` | Secundario sobre basalto | 8,18:1 | sí |
| `#F5C48B` | `#24282B` | «perímetro de ejemplo» | 9,30:1 | sí |
| `#efa04a` | `#24282B` | Perímetro (gráfico) | 6,93:1 | sí (≥3) |
| `#d4622a` | `#24282B` | Punto de ignición (gráfico) | 3,95:1 | sí (≥3) |
| `#7FB8B2` | `#24282B` | Anillo de foco sobre basalto | 6,65:1 | sí (≥3) |
| `#246A66` | `#F1E9DD` | Anillo de foco sobre papel | 5,24:1 | sí (≥3) |
| `#2B7A75` | `#F1E9DD` | Agua en los perfiles (gráfico) | 4,21:1 | sí (≥3) |
| `#76874F` | `#F1E9DD` | Páramo (gráfico, nunca texto) | 3,26:1 | sí (≥3) |
| `#2B7A75` | `#F1E9DD` | Laguna original como texto | 4,21:1 | **no**: por eso se usa `#246A66` |
| `#76874F` | `#F1E9DD` | Páramo como texto | 3,26:1 | **no**: nunca lleva texto |

## Honestidad

- Banda fija arriba, sin botón de cerrar. En móvil dice «DEMOSTRACIÓN · no son datos reales de NISAR» y siempre lleva el enlace «Qué significa».
- El perfil se rotula «Perfil esquemático, alturas por verificar» y no lleva ninguna cifra de altitud. Sus niveles son líneas punteadas sin número. Como los tres lugares están en latitudes distintas, la leyenda aclara que se proyectan sobre un mismo corte.
- Toda cifra lleva el sello rayado. En el Simulador, todas dicen «ejemplo de demostración» y el sello de origen bajo el mapa dice «Simulación · modelo de PACHA · relieve SRTM». El relieve dibujado se rotula «relieve ilustrativo de la propuesta».
- El incendio del Casitagua no lleva fecha y dice «Evento real · fuente por añadir».

## Riesgos

1. **Las alturas.** El perfil dice «esto está más alto que aquello» aunque no lleve cifras. Antes de pasarlo a la app hace falta un corte con fuente, por ejemplo SRTM a lo largo de una línea, o mantener el rótulo «esquemático». Como un solo corte oeste-este no pasa por los tres lugares, el perfil compuesto también hay que explicarlo, cosa que ya hace la leyenda.
2. **El ancho.** El perfil vive del formato apaisado. A 390 px tiene que estirarse en vertical (`preserveAspectRatio="none"`, con el texto en HTML para que no se deforme) y las cumbres quedan más agudas. Con más lugares que tres, las cartelas chocarían.
3. **Arcilla y serif.** El detector de Impeccable marca el fondo crema como patrón de IA. Lo pide el encargo, y aquí lo justifica el papel del grabado, pero es el punto más cercano a lo genérico. El rayado del sello también sale como «repeating-gradient». Se mantiene porque es una leyenda funcional, no decoración.
4. **El haz animado.** Es el único movimiento de la portada. Si distrae en la demo, puede pasar una sola vez al cargar.
