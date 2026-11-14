# Propuesta C · Estratos

**La idea.** PACHA es el corte de una carretera andina: capas de ceniza, lahar, limo y suelo que guardan lo que pasó.
«La tierra guarda las marcas» se toma al pie de la letra: cada sección es un estrato con su contacto ondulado y su marca de
tiempo al margen, y el mapa sobre basalto se apoya en una columna estratigráfica que hace de línea de tiempo.

Páginas: `inicio.html` y `simulador.html` (hoja compartida `estilo.css`, JS mínimo en línea). Capturas en `capturas/`.

## Paleta

| Nombre | Hex | Uso |
|---|---|---|
| Ceniza clara | `#ECEAE4` | Fondo de página (gris piedra, más frío que el crema genérico) |
| Toba | `#F6F5F1` | Superficies elevadas, capas finas de controles, barra móvil |
| Tinta basalto | `#1E2023` | Texto principal, foco sobre claro, idioma activo |
| Tinta secundaria | `#50524F` | Texto secundario sobre claro |
| Basalto | `#202326` | Superficie de los mapas, pie («roca madre») |
| Tierra sobre basalto | `#2B2F33` | Relleno de las provincias |
| Línea sobre basalto | `#5E6469` | Límites y curvas maestras (decorativo, no texto) |
| Sobre basalto / secundario | `#ECEAE4` / `#A9ABA5` | Texto sobre los mapas |
| Capa ceniza | `#C9C6BC` | Estrato «Incendio en el Casitagua», capa «Resultado» del simulador |
| Capa limo | `#B9A27E` | Estrato «Simula tu propio evento», capas «temporada seca» |
| Capa cacao | `#6E4A2F` | «Avanzado» (la capa profunda), capas antiguas de la columna |
| Capa páramo | `#6F7F52` | Solo como capa sin texto en la columna (no llega a AA con texto, ver abajo) |
| Capa laguna | `#2D6F6C` | Estrato «Embalses y lluvia», capas «temporada de lluvias» |
| Acento ocre maíz | `#D9A21B` | La acción principal (con texto basalto), lugares y barrido sobre basalto, capa en curso |
| Borde ocre | `#8A6410` | Borde del botón principal, deslizadores (añadido: el ocre solo no llega a 3:1 sobre claro) |
| Demostración | fondo `#F4DCC2`, texto `#733010`, borde `#C0531B` | Banda superior y sellos «demostración» |
| Datos: rampa fuego | `#efa04a`, `#9a3412` (borde `#d4622a`) | Área quemada del simulador, tal cual `frontend/src/diseno/rampas.ts` |

Ajustes respecto a la paleta de partida: el **páramo** `#6F7F52` no da AA ni con tinta (3,76:1) ni con toba (3,98:1), así que
solo aparece como capa sin texto; se añadió **borde ocre** `#8A6410` porque el ocre sobre ceniza clara da 1,91:1; los
rótulos pequeños sobre laguna usan `#DCE9E6` y los de limo `#3A2716`. El detector de Impeccable marca el fondo como
«cream palette»: es el `#ECEAE4` pedido (ceniza, gris piedra), lejos del par `#F4F1EA` + terracota prohibido.

## Tipografía

- **Piazzolla** (Huerta Tipográfica, Google Fonts, eje óptico): títulos. Seminegrita 600; la segunda frase del titular en
  cursiva 500 («El radar las lee.») para separar las dos ideas, no para resaltar una palabra.
- **Public Sans**: cuerpo, interfaz y datos, con `font-variant-numeric: tabular-nums` en cifras. Sin monoespaciada.
- Escala (≈ 1,25 sobre 17 px): 13 · 17 · 21 · 26 · 33 · 36–52 (fluida, títulos de estrato) · 40–72 (fluida, titular).
  Interlineado 1,55 en cuerpo, 1,04–1,12 en títulos; medida máxima ~36 rem.

## Logo

Tres anillos de nivel algo irregulares (radios 13, 8,6 y 4,2 en una caja de 32) atravesados por un haz de radar en
tinta con su cuña de barrido en ocre. Archivo: `logo.svg`; también es el favicon de las dos páginas.

A 16 px: <img src="logo.svg" width="16" height="16" alt="logo de PACHA a 16 px"> · a 32 px: <img src="logo.svg" width="32" height="32" alt="logo de PACHA a 32 px">
(captura: `capturas/logo-16-32.png`).

## Cómo funciona la dirección

- **Inicio.** Arriba, el estrato más reciente: titular, bajada y la única acción en ocre («Mira cómo cambian los embalses»),
  con «¿Primera vez? Recorrido de 90 s» como enlace. A la derecha, el mapa real del Ecuador (geoBoundaries) sobre basalto
  con Daule-Peripa, Mazar y Casitagua. Una franja de pasada del radar baja de norte a sur cada 12 s y, al mismo ritmo, se
  deposita una capa ocre nueva en lo alto de la columna «Hoy → Antes». Las tres entradas son estratos de material
  distinto (laguna, ceniza, limo) con su marca de tiempo al margen («Cada temporada», «Después del fuego», «Cuando tú
  quieras») y un dato propio: barras de agua lluvias/sequía (sello «demostración»), el minimapa del cerro con
  «evento real · fuente por añadir» y las ondas de 24 cm de la banda L (verificado en `docs/nisar-verificado.md`), y los
  cinco fenómenos con sus lugares. El pie es la roca madre (basalto) con los créditos.
- **Simulador (paso 3).** Pasos 1 y 2 hechos y reabribles; el mapa a pantalla con relieve ilustrativo (curvas generadas,
  rotulado como tal), el punto de Loja, el localizador con el contorno real y el sello «Simulación · modelo de PACHA ·
  relieve SRTM». El panel es una pila de capas finas: arriba la capa nueva «Resultado» (ceniza, «ejemplo de
  demostración»), debajo Viento, Humedad del combustible muerto y Duración, y al fondo «Avanzado» en cacao, cerrado.
  «Desatar» vuelve a depositar la capa del resultado (animación de recorte; nada con reduced-motion). En móvil el panel
  es una hoja inferior medio abierta con asa; «Desatar» la sube.
- `prefers-reduced-motion`: el barrido queda quieto a media altura, la capa en curso queda entera, sin transiciones.

## Contraste (WCAG 2.2, calculado con script)

| Pareja | Texto / elemento | Fondo | Contraste | Nivel |
|---|---|---|---|---|
| Banda y sello de demostración: texto | `#733010` | `#F4DCC2` | 7.35:1 | AAA |
| Banda de demostración: borde y punto (no texto) | `#C0531B` | `#F4DCC2` | 3.53:1 | AA grande/no texto |
| Borde de la banda contra el fondo (no texto) | `#C0531B` | `#ECEAE4` | 3.88:1 | AA grande/no texto |
| Tinta basalto sobre ceniza clara (fondo) | `#1E2023` | `#ECEAE4` | 13.57:1 | AAA |
| Tinta secundaria sobre ceniza clara | `#50524F` | `#ECEAE4` | 6.56:1 | AA |
| Tinta basalto sobre toba (elevado) | `#1E2023` | `#F6F5F1` | 14.97:1 | AAA |
| Tinta secundaria sobre toba | `#50524F` | `#F6F5F1` | 7.23:1 | AAA |
| Idioma activo: toba sobre tinta | `#F6F5F1` | `#1E2023` | 14.97:1 | AAA |
| Botón principal: tinta sobre ocre maíz | `#1E2023` | `#D9A21B` | 7.10:1 | AAA |
| Borde del botón y deslizadores sobre ceniza clara (no texto) | `#8A6410` | `#ECEAE4` | 4.46:1 | AA grande/no texto |
| Deslizadores sobre toba (no texto) | `#8A6410` | `#F6F5F1` | 4.92:1 | AA |
| Capa laguna: texto toba | `#F6F5F1` | `#2D6F6C` | 5.34:1 | AA |
| Capa laguna: rótulos pequeños | `#DCE9E6` | `#2D6F6C` | 4.68:1 | AA |
| Sello demo sobre laguna: borde (no texto) | `#C0531B` | `#2D6F6C` | 1.25:1 | NO |
| Capa ceniza: texto | `#1E2023` | `#C9C6BC` | 9.55:1 | AAA |
| Capa limo: texto | `#1E2023` | `#B9A27E` | 6.63:1 | AA |
| Capa limo: rótulos secundarios | `#3A2716` | `#B9A27E` | 5.76:1 | AA |
| Capa cacao (Avanzado): texto | `#F6F5F1` | `#6E4A2F` | 7.17:1 | AAA |
| Capa cacao: rótulo secundario | `#E6DCD2` | `#6E4A2F` | 5.79:1 | AA |
| Campos de Avanzado: texto | `#F6F5F1` | `#5A3C25` | 9.13:1 | AAA |
| Campos de Avanzado: borde (no texto) | `#C9B8A8` | `#6E4A2F` | 4.06:1 | AA grande/no texto |
| Sobre basalto: texto | `#ECEAE4` | `#202326` | 13.13:1 | AAA |
| Sobre basalto: texto secundario | `#A9ABA5` | `#202326` | 6.81:1 | AA |
| Lugares y foco sobre basalto (no texto) | `#D9A21B` | `#202326` | 6.87:1 | AA |
| Límites de provincia y curvas maestras (no texto, decorativo) | `#5E6469` | `#202326` | 2.63:1 | NO |
| Rampa fuego: ardió poco (dato) | `#efa04a` | `#202326` | 7.37:1 | AAA |
| Rampa fuego: ardió con fuerza (dato, con borde #d4622a) | `#9a3412` | `#202326` | 2.16:1 | NO |
| Borde del área de ardió con fuerza | `#d4622a` | `#202326` | 4.20:1 | AA grande/no texto |
| Sello demo sobre laguna: relleno del sello contra la capa (no texto) | `#F4DCC2` | `#2D6F6C` | 4.40:1 | AA grande/no texto |
| Ardió con fuerza contra ardió poco (dato) | `#9a3412` | `#efa04a` | 3.41:1 | AA grande/no texto |
| Anillo de foco ocre sobre cacao (no texto) | `#D9A21B` | `#6E4A2F` | 3.40:1 | AA grande/no texto |
| Anillo de foco tinta sobre capa ceniza (no texto) | `#1E2023` | `#C9C6BC` | 9.55:1 | AAA |
| Anillo de foco ocre sobre laguna (no texto) | `#D9A21B` | `#2D6F6C` | 2.54:1 | NO |

Notas: el anillo de foco es tinta (3 px) sobre claro, ocre sobre basalto y cacao, y toba sobre laguna, siempre ≥ 3:1.
«Ardió con fuerza» (`#9a3412`) solo da 2,16:1 sobre basalto, por eso lleva borde `#d4622a` y va dentro de «ardió poco»
(3,41:1 entre ambos). El sello «demostración» sobre laguna se distingue por su relleno (4,40:1), no por el borde. Las
líneas de provincia y las curvas son textura (2,63:1): los lugares se reconocen por el ocre (6,87:1) y por su etiqueta.

## Riesgos

- **El mayor: las capas pueden robarle el sitio al mapa.** Tres estratos de color saturado a todo el ancho pesan mucho;
  en la app real, con Historias y Observatorio, los estratos deben quedarse en portadas y paneles, nunca encima del dato.
  En el simulador ya se nota el límite: las capas del panel son casi neutras para que el mapa mande.
- En móvil la columna estratigráfica pierde sus rótulos (quedan «Hoy» y «Antes», el resto solo para lectores de
  pantalla) y el mapa del inicio queda bajo el primer pantallazo.
- La columna y el barrido son ilustrativos: con datos reales cada capa tendría que ser una pasada con fecha y
  procedencia, o la metáfora miente. Las cifras de los embalses son de demostración y así se rotulan.
- Contactos ondulados con máscaras CSS: en navegadores sin `mask` se ven como bordes rectos (degrada bien).
