# Guía de traducción al kichwa

## Propósito

La app se ofrece en español (fuente de verdad), inglés y **kichwa unificado** (`qu`, `lang="qu-EC"`).
El kichwa de los catálogos (`frontend/src/idioma/catalogos/qu/`) es un **borrador**: lo escribió el equipo
sin revisión de hablantes. Mientras no esté validado, la app lo dice con el aviso que va bajo la banda de
demostración («Traducción en revisión por hablantes · N de M textos validados»).

Criterios del borrador:

- Kichwa unificado; frases cortas y llanas.
- **No se inventan neologismos.** Un término técnico sin equivalente asentado se deja en español y se
  anota en la tabla de abajo.
- No se traducen nombres propios de lugares, unidades (km², ha, dB, %, m, h) ni siglas (HH, HV, VV, VH,
  SAR, NISAR, NASA, ISRO, ASF).
- La banda «DATOS DE DEMOSTRACIÓN», los sellos de origen y «pendiente de confirmar con la documentación
  oficial» tienen en kichwa el mismo peso que en español.

## Cómo validar

1. Un hablante revisa un área del catálogo (`catalogos/qu/<área>.ts`) frente a su original en
   `catalogos/es/<área>.ts`, en la app con el idioma Kichwa activo.
2. Las correcciones se escriben en el archivo `qu` del área.
3. Cada clave aprobada se añade a `VALIDADAS_QU` en `frontend/src/idioma/catalogos/validadas.ts`; el
   aviso cuenta esas claves.
4. Cuando también se hayan validado los textos largos (relatos de Historias, explicaciones),
   `CONTENIDO_LARGO_QU_VALIDADO` pasa a `true`. Con todo validado, el aviso desaparece.
5. Los términos de la tabla que reciban un equivalente asentado se traducen y se borran de la tabla.

## Términos dejados en español

| Término | Dónde aparece | Motivo |
|---|---|---|
| Nombres de los meses (Enero…Diciembre) y de los días | `catalogos/qu/fecha.ts` | Sin forma asentada confirmada por hablantes; ver «Dudas abiertas». |
| Observatorio | Riel (`estructura.riel.observatorio`) | Sin equivalente asentado; la etiqueta corta usa «Rikuy» (mirar), a confirmar. |
| Laboratorio, Simulador de eventos | Riel (`estructura.riel.laboratorio`, `.simulador`) | Préstamos del español sin término asentado; «Laboratorio radarpa» solo añade el genitivo. |
| Lab., Simul. (etiquetas cortas) | Riel móvil | Abreviaturas en español para no pasar de 7 caracteres. |
| Observatorio, radar, app | Banda y pantallas | Préstamos del español sin equivalente asentado. |
| transparente | Leyendas (`origen.leyenda.transparente`) | Sin equivalente asentado; se deja en español. |
| señal, productos, geometría, bandas | Leyendas y aviso de notas (`catalogos/qu/origen.ts`) | Términos de teledetección sin equivalente asentado; se dejan en español. |
| Rurashka (sintético), Chiqan (real), rurachik (generador), muju (semilla) | Sellos de origen | Vocabulario ya usado en la banda; a confirmar con hablantes. |
| Paso orbital, interferometría, ENL, moteado, escenario, evento, parámetro, control, pixel, órbita, temporada, región, provincia, hito, clima, humedad, Observatorio | Parámetros, contexto y ayuda del Observatorio (`catalogos/qu/observatorio.ts`) | Términos técnicos sin equivalente asentado; se dejan en español (los nombres de los términos con explicación también). «Costa» y «Sierra» se conservan como regiones. |

## Dudas abiertas


- **Código de idioma:** se usa `qu-EC` (quechua de Ecuador) para el atributo `lang`. Pendiente de
  confirmar con hablantes y con el uso en lectores de pantalla si conviene `qu-EC`, `qug` (kichwa de la
  Sierra) u otro código.
- **Plurales:** el borrador usa el sufijo `-kuna` para varios («1 capa», «3 capakuna»). Falta confirmar
  si, con una cifra delante, el kichwa omite `-kuna` (una sola forma para todos los números).
- **Nombres de los meses:** se dejaron en español; falta decidir si se usan los nombres kichwa
  tradicionales (por ejemplo, de calendario agrícola) o los préstamos del español.
- **«Capa» (capa de mapa):** se dejó «capa», préstamo del español; pendiente de un término asentado.
- **«Cargando…»:** el borrador dice «Chaskishka…», que significa más bien «recibido»; necesita revisión.
- **«Real / verdadero» en la banda:** el borrador usa «chiqan» (cierto, verdadero) en «mana NISAR-pa chiqan
  rikuykuna kanchu»; confirmar que comunica «observaciones reales» y no solo «correctas».
- **«Datos» como «willaykuna»:** se usa «willay» (aviso, noticia) para «dato»; confirmar si hay un término
  mejor para datos de medición.
- **Riel:** «Hatun» (principal), «Sapi yachay» (fundamentos), «Pushashka purina» (recorrido guiado) y
  «Kallari» (inicio) son propuestas del equipo sin validar.
- **«Rikuchik» (leyenda):** el borrador lo usa para «leyenda» (`origen.leyenda.titulo*`); es una propuesta
  del equipo, sin validar.
- **«Rurashka» con dos acepciones:** se usa para «sintético» (sellos) y para «generado» (`origen.sello.generado`,
  «rurashka puncha»); confirmar que no se confunden y que «sintético» no se lee como «fabricado».
- **«Chiqan» (= real):** duda de ortografía (¿«chiqan» o «chikan» en la ortografía unificada?) y de sentido
  («chikan» puede significar «distinto»). No se cambia sin hablante. Aparece en
  `catalogos/qu/origen.ts` (`origen.sello.real`), en `catalogos/qu/estructura.ts`
  (`estructura.banda.largo`, `estructura.banda.corto`) y en la derivada «chiqanyachishka» (verificado) de
  `origen.sello.sintetico_no_verificado`, `origen.notas.aviso` y `origen.notas.sin_verificar`.

## Tarea 6 · Piezas (gráficos, tiempo, comparador y mapa)

Términos que se dejaron en español por no tener equivalente asentado (`catalogos/qu/piezas.ts`):

- **«rango»** (rango de fechas o de valores, `piezas.grafico.*`, `piezas.comparador.aviso_rangos`): se usa
  «rango» con sufijos kichwa («rangopi», «rangomanta»).
- **«marca»** (marcas del gráfico), **«paso»** (paso del reproductor), **«evento»**, **«pasada»** (adquisición
  del satélite), **«banda»** (franja tenue de la cinta), **«Barras»**, **«Gráfico»**, **«Satélite»**,
  **«Relieve»**, **«Mapa base»**, **«Normal»** (velocidad), **«min»/«h»**: préstamos del español.
- **Leyenda del mapa y de los gráficos**: las palabras «alejándose», «hacia el satélite» y «señal» en
  `origen.leyenda.*` siguen en español (ver las notas de la Tarea 3).
- **«Utkay» (velocidad)**, **«utka» / «mana utka» (rápida / lenta)**: propuesta del equipo; confirmar.
- **«Yana» (oscuro)**, **«Panka mana rikuy» (opacidad de la capa)**: propuestas sin validar; «opacidad» no
  tiene término asentado.
- **«Rurashka chiqan» (verdad sintética)**: calco que mezcla «sintético» con «chiqan»; revisar con un
  hablante (véase también la duda sobre «chiqan»).
- **Meses y fechas**: los gráficos y la cinta muestran los meses abreviados en español en kichwa, hasta decidir
  los nombres de los meses.

## Tarea 7 · Exportaciones y errores del cliente

Borrador de `catalogos/qu/exportar.ts`; todo sin validar por hablantes:

- **Franja del PNG de demostración** (`exportar.franja.demo`): «Rikuchiy willaykuna» (datos de demostración) y
  «chiqan rikuykuna mana kanchu» (no son observaciones reales). Sigue la duda sobre «chiqan» (véase la Tarea 3).
- **«servidor», «lienzo», «PNG»**: préstamos del español / sigla, sin equivalente asentado.
- Las líneas de máquina del CSV (`# origen: …`, `# idioma: …`) no se traducen: siguen en español.

## Tarea 8 · Historias

Borrador de `catalogos/qu/historias.ts`, `contenido/{inundacion,incendio}.qu.ts` y `contenido/terminos.qu.ts`;
todo sin validar por hablantes (los relatos cuentan como contenido largo: `CONTENIDO_LARGO_QU_VALIDADO` sigue en `false`):

- **Se dejaron en español**: radar, satélite, misión, sensor activo, señal, onda, banda L, polarización, constante
  dieléctrica, rugosidad, humedal, humedad, biomasa, combustible, restauración, riesgo, cobertura, pasada, escenario,
  divisor, cuadrante, cámara, producto, ladera, humo, parcela, cicatriz (de quemado), validación, tipografía, límites,
  clima, provincia. Sin equivalente asentado; no se inventaron neologismos. Los nombres de los términos técnicos
  (`terminos.qu.ts`) también quedan en español; solo sus explicaciones están en kichwa.
- **«Sierra» y «Costa»** se conservan como nombres de región.
- **Dudas de vocabulario**: «jundashka / jundachin» (lleno / llenar, de «hunta»), «wicharina» (subir el agua),
  «llampu» (liso), «suni» (largo), «chimpana» (atravesar), «kutimuk señal» (señal que vuelve), «mikuchin» (alimentar),
  «ejemplo yuyay» (hipótesis de ejemplo), «rikuchik yuyay» (hipótesis ilustrativa), «tukuri yuyay» (conclusión),
  «runakunapa ruray» (impulsor humano), «yupaychay» (créditos), «ruranapak» (recomendada), «tupachik» (comparador),
  «ñawpa / washa» (antes / después), «wiñachik» (serie), «llakichiy» (impacto), «uraykun / wicharin» (baja / sube), «tamya / chaki» (lluviosa / seca), «pachapa tiyashka pacha» (contexto del lugar). Todas son propuestas del equipo.
- **Marca de honestidad**: «Kay rikuchiy escenariopi» (en este escenario de demostración) abre cada hipótesis y
  «kamachik panka-wan chiqanyachina kan» (pendiente de confirmar con la documentación oficial) cierra lo específico
  de la misión; se reutiliza la frase de `origen.notas.aviso`. Sigue la duda sobre «chiqan».

## Tarea 10 · Observatorio: mapa, tiempo y métricas

Borrador de las claves `obs.mapa.*`, `obs.tiempo.*` y `obs.metricas.*`; todo sin validar por hablantes:

- **Se dejaron en español**: modelo, capa, pasada, leyenda, temporada, escenario, Ecuador (nombre propio). Sin
  equivalente asentado; no se inventaron neologismos.
- **Dudas**: «rikushka» (detectado, de «rikuy»), «katik» (siguiente), «yupay» (métrica, de «yupay», contar),
  «chaninchay» (valor), «pakay» (ocultar), «ñitiy» (pulsar), «hawapi / ukupi» (fuera / dentro), «mamallaktapi» (en el país).

## Tarea 11 · Observatorio: comparar y medir

Borrador de `obs.comparar.*`, `obs.medicion.*`, `obs.variable.*` y `obs.flujo.*`; todo sin validar por hablantes:

- **Se dejaron en español**: polarización, capa, clasificación, cuadrante/cuadro, horizontal, vertical, fase
  interferométrica, coherencia interferométrica, desenrollado, frente, parcela, píxel, CSV, PNG, N/S/E (O en lugar de W).
- **Dudas**: «tupuy» (medir / medición), «chullunku» (hielo), «utkay» (velocidad), «kutichin» (devuelve, de «kutichina»),
  «tinkichiy» (combinación), «yaklla» (aproximado), «uraykachay» (descargar), «tukuchiy» (borrar), «rakirina»
  (apartado), «pishiyachishka / hatunyachishka» (resumen / detalle), «chiqan» en «Sintético chiqanwan pantay».
- Los nombres de columna del CSV de medición se traducen; las líneas `# origen: …` siguen en español.

## Tarea 12 · Observatorio: serie e impacto

Borrador de `obs.serie.*` y `obs.impacto.*`; todo sin validar por hablantes:

- **Se dejaron en español**: lienzo, PNG, CSV, hectárea, «a lo menos». Sin equivalente asentado; sin neologismos.
- **Dudas**: «wiñachik» (serie), «llakichiy» (impacto), «puntukuna siki» (línea punteada), «ejemplo yuyay»
  (ejemplo ilustrativo; véase la Tarea 8), «tupachishpa wiñay» (evolución frente a), «chiqan» en «Sintético chiqanwan»
  y en «mana NISARpa chiqan rikuymi» (no es una observación real de NISAR), «uraykachay» (descargar).
- El aviso «Ejemplo ilustrativo con datos de demostración…» del informe PNG existe en los tres idiomas.

## Tarea 13 · Simulador de eventos

Borrador de `sim.*`; todo sin validar por hablantes:

- **Se dejaron en español**: simulador, simulación, tablero, herramienta, evento, incendio, tormenta, crecida,
  erupción, volcán, celda, parámetros, cursor, coordenadas, latitud, longitud, polarización, reflexión
  especular, doble rebote, biomasa, bitácora, modelos, ciclo, imagen, enlace, navegador, dirección, mundo.
  Sin equivalente asentado; sin neologismos. «Allpa kuyuy» (terremoto) sí es término asentado.
- **Dudas**: «yuyashka» (supuesto), «allpa pata» (relieve), «kinray» (lado), «maypi» (lugar), «pacha»
  (temporada, también «tiempo»), «punchapacha» (fecha), «kawsay» (duración del evento), «shuyay» (espera),
  «tarinakuy» (detección), «llakichishka» (expuestos), «chinkachishka» (pérdidas), «chullayachiy» (vaciar),
  «paskashka yaku» (agua abierta), «sintético chiqanwan» (frente a la verdad sintética).
- La letra de hemisferio oeste es «O» en español y kichwa, «W» en inglés.
- Los textos que escribe la API (títulos de evento, etiquetas de métricas, controles, notas del modelo) y
  las celdas de la tabla de efectos que escribe `modelo/desastres.py` se quedan en español con `lang="es"`.
