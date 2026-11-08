# Guía de traducción al kichwa

## Propósito

La app se ofrece en español (fuente de verdad), inglés y **kichwa unificado** (`qu`, `lang="qu-EC"`).
El kichwa de la app es un **borrador**: lo escribió el equipo, por partes y sin revisión de hablantes.
Mientras no esté validado, la app lo dice con el aviso que va bajo la banda de demostración
(«Traducción en revisión por hablantes · N de M textos validados»). **Nada está validado todavía.**

Esta guía es para la persona hablante que revise el borrador: qué revisar, cómo devolver las
correcciones, qué se dejó en español a propósito y qué dudas concretas tiene el equipo.

Criterios del borrador:

- Kichwa unificado; frases cortas y llanas.
- **No se inventan neologismos.** Un término técnico sin equivalente asentado se deja en español y se
  anota en la tabla «Términos dejados en español».
- No se traducen nombres propios de lugares, unidades (km², ha, dB, %, m, h) ni siglas (HH, HV, VV, VH,
  SAR, NISAR, NASA, ISRO, ASF).
- La banda «DATOS DE DEMOSTRACIÓN», los sellos de origen y «pendiente de confirmar con la documentación
  oficial» tienen en kichwa el mismo peso que en español. **Son lo primero que hay que revisar**
  (ver «Prioridad 1» en las dudas).

## Qué hay que revisar

| Qué | Dónde | Cuántos textos |
|---|---|---|
| Textos cortos de la interfaz (botones, títulos, avisos, errores, textos de la API) | `docs/traduccion-kichwa.csv` (generado desde `frontend/src/idioma/catalogos/qu/*.ts`) | 1083 claves |
| Relatos de las Historias | `frontend/src/pantallas/historias/contenido/inundacion.qu.ts`, `incendio.qu.ts` | 2 relatos |
| Explicaciones de términos de las Historias | `frontend/src/pantallas/historias/contenido/terminos.qu.ts` | 9 términos |
| Guion del recorrido guiado | `frontend/src/pantallas/recorrido/guion.qu.ts` | 6 pasos |
| Fundamentos (radar, polarización, bandas, misión) | `frontend/src/pantallas/fundamentos/contenido.qu.ts` | 1 pantalla |

Cada archivo `.qu.ts` tiene al lado su original en español (`.es.ts`) y en inglés (`.en.ts`), con la
misma estructura. Los fragmentos `t('radar')`, `t('HH')`… insertan un término con su explicación: se dejan
como están.

## Cómo validar

### Textos cortos: con la hoja de cálculo

1. Generar la hoja (desde la raíz del repo): `node scripts/traducciones_csv.mjs exportar`. Escribe
   `docs/traduccion-kichwa.csv` (UTF-8 con BOM, para que Excel, LibreOffice o Google Sheets muestren bien
   ñ y tildes). Columnas: `clave, es, en, qu, validada`; una fila por texto, ordenadas por clave.
2. La persona hablante solo cambia dos columnas:
   - `qu`: el texto corregido.
   - `validada`: `si` cuando aprueba el texto (corregido o no); `no` si sigue en duda.
   No se tocan `clave`, `es` ni `en`.
3. **Las variables entre llaves no se traducen ni se borran**: `{n}`, `{fecha}`, `{total}`… deben seguir
   en el texto kichwa (pueden cambiar de lugar). Los sufijos se pegan con guion: `{desde}-manta`.
4. Guardar como CSV (UTF-8) y devolverla. El equipo la importa con
   `node scripts/traducciones_csv.mjs importar <archivo.csv>`. El script reescribe los textos cambiados en
   `catalogos/qu/<área>.ts` y la lista de claves validadas (`VALIDADAS_QU` en
   `frontend/src/idioma/catalogos/validadas.ts`). **No escribe nada** si falta una columna, si una clave no
   existe, si un texto queda vacío, si `validada` no es `si`/`no` o si un texto cambia las variables
   `{x}`; en ese caso dice en español qué fila falla.
5. Después de importar: `cd frontend && npm test` y revisar la app en kichwa. El aviso cuenta las claves
   validadas.

### Textos largos: en sus archivos

Los relatos y explicaciones largas no van en la hoja: se revisan en los archivos `.qu.ts` de la tabla de
arriba, frente a su `.es.ts`, y se corrigen ahí mismo (o se devuelven en un documento con el párrafo
corregido). Cuando todos estén revisados, `CONTENIDO_LARGO_QU_VALIDADO` pasa a `true` en
`frontend/src/idioma/catalogos/validadas.ts`. Con todas las claves validadas y el contenido largo también,
el aviso desaparece.

### Términos

Cuando un término de la tabla «Términos dejados en español» reciba un equivalente asentado, se traduce en
todos los textos donde aparece (buscar la palabra en el CSV) y se borra de la tabla.

## Términos dejados en español

Se dejaron en español porque el equipo no conoce un equivalente asentado. Llevan sufijos kichwa
(«capakuna», «escenariopi», «rangomanta»). Si hay un término kichwa ya en uso, se agradece.

| Término | Dónde aparece (claves o archivos) | Motivo |
|---|---|---|
| Nombres de los meses (Enero…Diciembre) y de los días (lunes…domingo) | `fecha.mes.1`…`12`, `fecha.dia.1`…`7`; meses abreviados en gráficos y cinta | Sin forma confirmada por hablantes; ver la duda D3. |
| Observatorio, Simulador de eventos, laboratorio | Riel (`estructura.riel.*`), títulos de pestaña (`titulos.*`), `lab.pantalla.titulo` | Nombres de pantalla; préstamos sin término asentado. «Radarpa laboratorio» solo añade el genitivo. |
| Lab., Simul. (etiquetas cortas) | `estructura.riel.laboratorio_corto`, `.simulador_corto` | Abreviaturas en español para no pasar de 7 caracteres en el riel móvil. |
| radar, satélite, misión, sensor, sensor activo, señal, onda, microonda, eco | Todas las áreas; Historias, Fundamentos | Préstamos sin equivalente asentado. |
| polarización, banda (banda L, banda S), frecuencia, longitud de onda (como «onda»), fase, interferometría, coherencia, desenrollado, interferograma, moteado (speckle), ENL, píxel, paso orbital, órbita | `obs.*`, `lab.*`, `fundamentos.*`, `api.tipo.*` | Términos de teledetección. |
| rugosidad, constante dieléctrica, reflexión especular, doble rebote, biomasa, dosel (como «sacha panka»), estructura | Historias, Laboratorio, Simulador | Términos físicos; «doble rebote» también aparece descrito en kichwa (duda C6). |
| humedal, humedad, glaciar, frente (del glaciar), cicatriz (de quemado), ladera, humo, combustible, parcela, cultivo (como «tarpushka»), riego | Historias, `api.*` | Sin equivalente técnico asentado. |
| incendio, tormenta, crecida, marejada, erupción, volcán, lahar, tsunami, deslizamiento, ceniza, flujos/corriente piroclástica, fase explosiva, explosividad (IEV), magnitud, intensidad (MMI), mecanismo, falla, rumbo, buzamiento, ruptura, centroide, hipocentro, epicentro, subducción, subsidencia, cohesión, fricción | `sim.*`, `api.sim.*`, `api.control.*` | Términos de amenazas naturales. «Allpa kuyuy» (terremoto) sí es término asentado y se usa. |
| escenario, escena, evento, simulación, simulador, modelo, parámetro, control, celda, malla, tablero, herramienta, bitácora, cursor | `obs.*`, `sim.*` | Vocabulario de la app. |
| capa, leyenda, mapa base, relieve, satélite (mapa base), opacidad, transparente, rango, marca, paso (del reproductor), pasada, clasificación, cuadrante/cuadro, gráfico, barras, lienzo | `piezas.*`, `obs.*`, `origen.leyenda.transparente` | Piezas de interfaz. «Opacidad de la capa» quedó «Capapa opacidad». |
| coordenadas, latitud, longitud, horizontal, vertical, N/S/E/O | `obs.medicion.*`, `sim.mundo.*`, `sim.coords.*` | En kichwa se usa «O» para el oeste, como en español. |
| productos, geometría | `origen.notas.aviso` | Detalles de NISAR pendientes de confirmar. |
| servidor, navegador, enlace, dirección (web), app, CSV, PNG, API | `exportar.*`, `sim.res.*`, `estructura.no_encontrada.*` | Términos informáticos. |
| clima, temporada (en algunas claves), región, provincia, hito, estaciones astronómicas (invierno/verano boreal y austral), equinoccio, solsticio, transición, bimodal/unimodal | `obs.contexto.*`, `api.contexto.*` | «Costa» y «Sierra» se conservan como regiones. |
| validación, restauración, riesgo, cobertura, tipografía, límites, créditos de fuentes | Historias | Sin equivalente asentado. |
| hectárea, a lo menos, ejemplo, óptico, contraste, coeficientes, cruzada, paralela | `obs.serie.*`, `obs.impacto.*`, `lab.*` | «a lo menos» queda en español hasta que un hablante proponga la forma natural. «Demostración» se dice «rikuchiy» (H1). |
| Ascendente, Descendente (dirección orbital); Cobertura, Intensidad, Modelo (encabezados de tablas del simulador); «LOS positivo / negativo» | `api.obs.orbita.*`, `api.sim.columna.*`, `api.obs.metrica.max_*.ayuda` | Términos técnicos sin equivalente asentado (ronda de arreglos final). |
| Severa, Violenta, Extrema (escala de intensidad); húmedo (bosque tropical húmedo, CN húmedo, bosque húmedo); páramo, matorral, zona (urbana, quemada, estable, restante), clase | `api.sim.celda.*`, `api.sim.nota.incendio.cobertura`, `api.sim.nota.tormenta.lluvia_*`, `api.obs.serie_nombre.*` | Sin equivalente asentado para los grados altos de la escala (ver C11) ni para «húmedo» como adjetivo técnico. |
| techo, colapso, letalidad, tefra, cráter, masa, dique, hidrograma, pulso senoidal, energía (cono de), advección–difusión, perímetro, autómata, extinción (humedad de), función (de mortalidad), corteza, amplificación, calibrar, ruido turbulento, batimetría, ecuaciones (de aguas someras), drenaje (red de), resolución, referencia, control (serie de control), rotación, parcela, soja, trigo | `api.sim.celda.modelo_*`, `api.sim.celda.techos_colapsados_viviendas`, `api.sim.nota.*`, `api.obs.columna.*`, `api.obs.serie_nombre.*`, `api.obs.valor.*` | Términos de los modelos físicos y de cultivos sin equivalente asentado. |
| Amazonía, Insular (Galápagos) | `api.contexto.region.*` | Regiones del Ecuador, como «Costa» y «Sierra». |
| Nombres de los términos con explicación | `historias/contenido/terminos.qu.ts`, nombres en `fundamentos/contenido.qu.ts` | El nombre queda en español; solo la explicación está en kichwa. |

## Dudas abiertas

Cada duda indica dónde está (clave del CSV o archivo) para que se pueda buscar directamente.

### Prioridad 1 · Textos de honestidad (revisar primero)

Estas frases avisan que los datos son de demostración o que algo no está confirmado. Deben decir
exactamente eso, con el mismo peso que en español.

- **H1. Banda de demostración** — `estructura.banda.largo` «RIKUCHIY WILLAYKUNA · mana NISAR-pa chiqan
  rikuykuna kanchu», `estructura.banda.corto`, `exportar.franja.demo`. ¿«Rikuchiy willaykuna» se entiende
  como «datos de demostración» (datos para mostrar, no reales)? ¿«chiqan» comunica «real» y no solo
  «correcto»?
- **H2. «Pendiente de confirmar con la documentación oficial»** — `historias.marca.pendiente` «kamachik
  panka-wan chiqanyachina kan»; se repite en `obs.ayuda.aviso`, `origen.notas.aviso`,
  `sim.espera.intro_pendiente`, `lab.pol.aviso_banda`, `api.lab.aviso_banda`, Historias y Fundamentos.
  ¿«kamachik panka» se entiende como «documentación oficial»?
- **H3. Sellos de origen** — `origen.sello.sintetico` «Rurashka», `origen.sello.real` «Chiqan»,
  `origen.sello.sintetico_no_verificado`, `origen.notas.sin_verificar` «(mana chiqanyachishka)».
  «Rurashka» (hecho) se usa también para «generado» y «creado» (ver C1): ¿se lee «sintético» como «hecho
  por un programa», y no como «fabricado / falso»?
- **H4. Aviso del kichwa** — `idioma.aviso_qu` «Kichwa tikrayka manaraka chiqanyachishkachu · {total}-manta
  {validadas} chiqanyachishka». En la revisión de la Tarea 27 se reescribió (el borrador anterior decía
  «ashtawan ñawpachishkapi», que no significaba «en revisión»). Falta una fórmula natural para «en revisión
  por hablantes».
- **H5. Hipótesis de ejemplo** — `historias.marca.ejemplo` «Kay rikuchiy escenariopi», `obs.hallazgo.demo`,
  `obs.impacto.informe_ejemplo`, párrafos `hipotesis` de los relatos («ejemplo yuyay», «rikuchik yuyay»).
  ¿Queda claro que son ejemplos ilustrativos y no hallazgos?

### D · Decisiones generales

- **D1. Código de idioma.** Se usa `qu-EC` para el atributo `lang`. Confirmar con hablantes y con el uso en
  lectores de pantalla si conviene `qu-EC`, `qug` (kichwa de la Sierra de Ecuador) u otro código.
- **D2. Plurales con cifra.** El borrador usa `-kuna` también detrás de una cifra («{n} capakuna»,
  «{n} rikuykuna», «{medio} punchakuna»), pero no siempre («12 puncha», `piezas.tiempo.paso.17280`). La
  regla de plural del kichwa en el código usa por ahora una sola forma para todos los números
  (`formaPlural` en `frontend/src/idioma/interpolar.ts`). ¿Con una cifra delante se omite `-kuna`?
- **D3. Meses y días.** Quedaron en español (`fecha.mes.*`, `fecha.dia.*`). ¿Se usan los nombres kichwa
  tradicionales (calendario agrícola) o los préstamos del español?
- **D4. Ortografía con k.** En la Tarea 27 se unificó a k/h lo que ya tenía su forma unificada en el
  borrador (Qipa → Kipa, lluqshin → llukshin, tukuriq → tukurik, callari → kallari, jatun → hatun,
  Horkoy → Hurkuy, kocha → kucha). **No se cambió «chiqan»** (real, cierto), que aparece 36 veces junto con
  «chiqanyachishka» (verificado) y «chiqanyachina» (confirmar): ¿se escribe «chiqan» o «chikan»? El equipo
  no lo cambió porque «chikan» puede significar «distinto/otro».
- **D5. j/h y nd/nt en «inundación».** Se usa «jundashka / jundachin / junday / jundarin» (lleno, llenar,
  inundación) unas 30 veces (`obs.variable.cambio_de_inundacion`, `api.categoria.cambio_de_inundacion.*`,
  `api.sim.metrica.area_inundada*`, relatos). El alfabeto unificado no tiene «j»: ¿se escribe
  «huntashka / huntay»? Además, ¿«yaku junday» es la forma natural de decir «inundación»? No se cambió
  sin hablante.
- **D6. «Hayk» y «mashna».** «Hayk» (cuánto) aparece 16 veces en los relatos, Fundamentos y términos; en
  otros textos se usa «mashna». ¿Cuál corresponde al kichwa unificado?
- **D7. Conjunciones.** El borrador usa «o» del español para «o» (y quitó «y» del español, que se cambió
  por comas o `-pash`). Para cerrar listas usa «ima» («sara, palanda ima»). ¿Es natural?
- **D8. Guion antes de sufijos.** Detrás de siglas y préstamos el borrador pone guion de forma irregular
  («NISAR-pa», «app-pi», «Enter-ta», pero «PNGta», «CSVta», «Ecuadorpa»). En la Tarea 27 se unificó solo
  «NISAR-pa». ¿Qué regla seguir?
- **D9. Modo de los botones.** Se unificaron los botones a imperativo `-y` («Sayachiy», «Kallarichiy»,
  «Kallariman riy», «{nombre}-man kutiy»). Confirmar que es la forma natural para un botón.

### C · Palabras con varios sentidos (posible confusión)

- **C1. «Rurashka»**: sintético (`origen.sello.sintetico`), generado (`origen.sello.generado`), inventado
  (`lab.nubes.nota`, `lab.pantalla.hallazgo`, «escena inventada»), verdad sintética («rurashka chiqan»,
  `piezas.grafico.verdad_sintetica`), y también «Mundota rurashka…» (`sim.mundo.creando`, «Creando el
  mundo…», ver C3).
- **C2. «Rikuy»**: observación (banda), vista (`obs.estructura.vistas_etiqueta`, «Shuyu rikuy»), mirada
  (ENL, `obs.parametros.miradas*`), y el verbo «ver». **«Rikcha»** es imagen (unificado en la Tarea 27:
  antes también «imagen», «rikchay» y «rikuy»). **«Rikchay»** es tipo («tikray rikchay», tipo de cambio) y
  muesca (`historias.comparador.nota_cinta`). **«Rikuchiy»** es demostración; **«rikuchik»** es leyenda
  (`origen.leyenda.titulo*`), ilustrativo («rikuchik yuyay») y «que resalta» («ashtawan rikuchik
  polarización»). ¿Es demasiado?
- **C3. Participio `-shka` en mensajes de espera.** «Cargando…», «Calculando…», «Midiendo…»,
  «Actualizando…», «Simulando…», «Creando el mundo…» están en `-shka` («Chaskishka…», «Yupachishka…»,
  «Tupushka…», «Mushukyachishka…», «simulashka…», «rurashka…»), que significa «hecho / ya ocurrido»
  (`comun.cargando`, `historias.cargando`, `obs.*.calculando*`, `obs.*.cargando*`, `obs.medicion.midiendo`,
  `sim.pantalla.*`, `sim.mundo.creando`). Solo `lab.comun.preparando` usa gerundio («allichishpa…»). ¿Se
  usa el progresivo (`-kun`, «yupachikun…») u otra forma? Además «chaskiy» es «recibir», no «cargar».
- **C4. «Pacha»**: tiempo, lugar («Pachapa tiyashka pacha», `obs.contexto.titulo`), temporada
  (`sim.pantalla.temporada`, `sim.bitacora.col_temporada`), superficie (`lab.pol.barras_titulo`,
  `lab.pol.superficies`, «sapa pachapi»). La fecha se unificó a «puncha» en la Tarea 27.
- **C5. «Willay»**: dato («willaykuna»), informe (`obs.impacto.descargar`, `sim.res.informe`), aviso
  (`estructura.banda.aviso`, «willachiy»), detalle (`sim.res.detalle`), contenido (`a11y.saltar`,
  «Willaykunaman pasay»). «Willayta mana rurayta ushashkachu» puede leerse «no se pudo generar el dato» en
  lugar de «el informe». ¿Hay una palabra para «informe» y otra para «dato de medición»?
- **C6. «Ñan»**: paso del recorrido (`recorrido.*`), dirección orbital (`obs.metricas.direccion`), línea de
  vista («rikuy ñan», `obs.variable.desplazamiento_los*`), huella (`fundamentos.tabla.cambios`), dirección
  web (`estructura.no_encontrada.hallazgo`), cauce (`api.sim.control.erupcion.volumen_lahar_hm3.etiqueta`).
  El reproductor usa «paso» en español.
- **C7. «Panka»**: página (`estructura.no_encontrada.titulo`), documentación («kamachik panka»), pantalla y
  panel (`a11y.mapa.nota`), hoja (`fundamentos`, «sacha panka»).
- **C8. «Yupay»**: métrica (`obs.metricas.col_metrica`), número (`obs.parametros.miradas`), «entero»
  («tukuy yupay», `obs.parametros.semilla_*`; «tukuy» es «todo»), y «yupachiy / yupay» para calcular y
  estimar.
- **C9. «Kallari»**: inicio (`estructura.riel.historias_corto`), origen (`estructura.banda.sin_origen`,
  «Sapa willaypak kallarishkami tiyan»), activa (`obs.parametros.estacional_ayuda`). En
  `a11y.lienzo.*` origen es «Maypi llukshishka».
- **C10. «Shuklla» / «mana kikin».** «Shuklla» (solo uno) se usaba para «distinto»; en la Tarea 27 se
  cambió por «mana kikin» como en el resto del catálogo. Confirmar «mana kikinta kutichin» (responde
  distinto).
- **C11. Grados de intensidad.** `api.sim.celda.ligera` «Pishi», `.moderada` «Chawpi», `.fuerte` «Sinchi»,
  `.muy_fuerte` «Ancha sinchi»; `.severa`, `.violenta` y `.extrema` quedaron en español porque «ashtawan
  sinchi» no distingue tres grados. ¿Hay una escala natural en kichwa?
- **C12. «Pallay» y «kuchuy» (cosecha).** `api.obs.metrica.cosecha_labranza.etiqueta` y
  `api.obs.medida.cosecha_labranza` dicen «Pallay / allpa yapuy»; `api.categoria.cambio_por_parcela.3` dice
  «Kuchuy / allpa llankay». Las columnas nuevas siguen «pallay» (`api.obs.columna.cosecha_estimada` «Yupashka
  pallay», `.cosecha_real` «Chiqan pallay», `.cultivo_cosechado` «Pallashka tarpushka»). ¿Cuál se usa para
  cosechar granos (arroz, maíz) y cuál para labranza?
- **C13. «Resultados».** `api.obs.titulo_tabla.resultados` «Tukuri yupaykuna» y `.resultados_por_parcela`
  «Sapa parcelapa tukuri yupaykuna» (cifras finales). ¿Hay una palabra mejor para «resultados»?
- **C14. Frases del modelo con forma dudosa.** «mutkichina yaku» (agua útil, `api.sim.nota.tormenta.lluvia_*`);
  «yakuyuk ceniza llashak» (carga húmeda, `api.sim.celda.modelo_techos`); «mana ukku yaku» (aguas someras,
  `api.sim.nota.terremoto.tsunami`); «kimsa kuchuyuk» (triangular, `api.sim.nota.inundacion.hidrograma`);
  «rasu» (nieve, `api.sim.celda.glaciar_y_nieve`); «Ruru yurakuna» (frutales, `api.obs.valor.frutales`);
  «ishkay niki tarpuy» (soja de segunda, `api.obs.valor.trigo_soja_de_segunda`); «Willay illa (pakashka)»
  (sin dato, enmascarado, `api.obs.valor.sin_dato_enmascarado`); «Mana kuyuk zona» (zona estable,
  `api.obs.serie_nombre.zona_estable_referencia`); «killkashka modelokuna» (modelos publicados,
  `api.sim.nota.erupcion.supuestos`). Confirmar cada una.
- **C15. «Shuk washa pasadapi».** Las notas `api.sim.nota.agua.radar`, `.erupcion.radar` e `.incendio.radar`
  traducen «en una pasada posterior (ver «Espera hasta la primera imagen»)» como «shuk washa pasadapi
  («Ñawpa rikchakama shuyay» rikuy)», con el nombre de `sim.espera.media`. El español repite paréntesis;
  confirmar que la frase se entiende.

### I · Misma palabra española, traducciones distintas (sin resolver)

| Español | Traducciones en el borrador | Claves |
|---|---|---|
| origen | «kallari», «maypi llukshishka» | `estructura.banda.sin_origen`, `estructura.banda.panel_texto`, `a11y.lienzo.*` |
| desconocido | «mana yachashka», «mana riksishka» | `origen.sello.desconocida`, `exportar.franja.fuente_desconocida`, `api.error.*_desconocid*` |
| expuestos / población expuesta | «llakichishka» (dañado), «rikuchishka runakuna» (mostrado) | `sim.bitacora.col_expuestos`, `api.sim.metrica.poblacion_expuesta.etiqueta` |
| víctimas | «wañushka» (muerto), «wañuk runakuna» | `sim.bitacora.col_victimas`, `api.sim.metrica.victimas_*` — confirmar si «víctimas» incluye heridos |
| pérdidas | «chinkachishka», «tukuri» | `sim.bitacora.col_perdidas`, `api.sim.metrica.perdidas_en_viviendas.etiqueta` |
| temporada | «pacha», «temporada», «tamya pacha» | `sim.pantalla.temporada`, `obs.tiempo.temporada`, `piezas.tiempo.cinta.*` |
| superficie | «pacha», «allpa», «pacha pata», «hawa» | `lab.pol.*`, `api.impacto.*`, `obs.ayuda.interferometria_antes`, `terminos.qu.ts` |
| doble rebote | «ishkay kutin tupashpa», «ishkay kuti kutichiy», «sachapa-yakupa ishkay kutichiy», «doble rebote» | `lab.*`, relatos, `api.tipo.humedales.descripcion`, `sim.gemelo.por_que_hh` |
| ejemplo ilustrativo / hipótesis | «ejemplo yuyay», «rikuchik yuyay», «rikuchiy ejemplo» | `obs.impacto.informe_ejemplo`, `lab.*`, `api.lab.aviso_banda`, relatos |
| recorrido | «Purina», «Pushashka purina» | `recorrido.titulo`, `estructura.riel.recorrido*`, `titulos.recorrido` |
| lugar / sitio | «maypi», «pacha», «llakta», «kuska», «uku» («kay ukuta», `sim.espera.intro_*`) | varias |
| leer | «ñawinchiy» (unificado en la Tarea 27; antes «killkay», que es escribir) | `obs.comparar.como_leer`, `fundamentos.hallazgo` |

### P · Propuestas del equipo sin validar

Riel y títulos: «Hatun» (principal), «Willakuykuna» (historias), «Kallari» (inicio), «Rikuy» (observatorio,
corto), «Sapi yachay» / «Sapi» (fundamentos; también el título de la pantalla desde la Tarea 27, antes
«Tiksi yachaykuna»), «Pushashka purina» / «Purina» (recorrido), «Radarpa laboratorio» (laboratorio; antes
«Laboratorio radarpa» en el riel y «Radarpa yachana wasi» en la pantalla), «Willaykunaman pasay» (saltar al
contenido).

Vocabulario: «Shimi» (idioma), «Rikuchik» (leyenda), «yanayashka / yurakyashka» (más oscuro / más claro),
«Yana» (mapa base oscuro), «utkay» (velocidad), «utka / mana utka» (rápida / lenta), «shuyan» y «shuyashka»
(espera, pendiente), «yuyashka» (supuesto), «allpa pata» (relieve), «tarinakuy» (detección), «kinray»
(lado), «maypi» (lugar), «punchapacha» → «puncha» (fecha), «kawsay» (duración del evento), «shuyay»
(espera), «llakichishka» (expuestos), «chinkachishka» (pérdidas), «chullayachiy» (vaciar), «paskashka yaku»
(agua abierta), «tupuy» (medir), «chullunku» (hielo), «kutichin» (devuelve), «tinkichiy» (combinación),
«yaklla» (aproximado), «uraykachay» (descargar), «tukuchiy» (borrar), «rakirina» (apartado),
«pishiyachishka / hatunyachishka» (resumen / detalle), «wiñachik» (serie), «llakichiy» (impacto), «puntukuna
siki» (línea punteada), «tupachishpa wiñay» (evolución frente a), «katik» (siguiente; unificado en la Tarea
27, antes también «Qipa» y «Washa»), «Kipa» (último), «chaninchay» → «chanin» (valor), «pakay» (ocultar),
«ñitiy» (pulsar), «hawapi / ukupi» (fuera / dentro), «yupaychay» (créditos), «ruranapak» (recomendada),
«tupachik» / «rakik» (comparador / divisor), «ñawpa / washa» (antes / después), «uraykun / wicharin» (baja /
sube), «tamya / chaki» (lluviosa / seca), «jundashka / jundachin» (lleno / llenar; D5), «wicharina» (subir el
agua), «llampu» (liso), «suni» (largo), «chimpana» (atravesar), «kutimuk señal» (señal que vuelve),
«mikuchin» (alimentar), «tukuri yuyay» (conclusión), «runakunapa ruray» (impulsor humano), «puyu» (nube),
«pakashka» (tapado), «ecota tupun» (mide el eco), «kiwa ukupi yaku» (agua bajo los árboles), «sacha pakana
uku» (bajo dosel), «inti achik» (luz del Sol), «Maypi llukshishka» (origen), «Allpapa chawpi chanin» (valor
medio; ¿o «tantachishka chanin»?), «makiwan llamkachishka» (interactivo), «Áreayuk shuk cuadrota shuyuy»
(dibuja un recuadro con área), «kuntuy» (orientación de la onda), «chapuk» (que mezcla), «sapa kutin
sunilla» (longitud típica), «tukuy ima kawsaymanta» (por convención general, `fundamentos.nota.bandas`;
dudoso), «Ninan ukuta rikuchin» (detalle fino, banda X en Fundamentos; dudoso).

API (`api.*`): «sacha» (bosque), «mushuk» (nuevo), «pishiyay» (disminución), «Llulla alarma» (falsa
alarma), «tarpushka» (cultivo), «kuchuy» (cosecha), «chawpi» (moderada), «sinchi» (alta / fuerte),
«kunuk / chiri» (cálida / fría), «waranka» (mil), «hunu» (millón), «ukku» (profundidad), «wichay / uray»
(subir / bajar), «allpa uraykay» (hundimiento), «Pachapa muju» (semilla del azar; «mana yuyashka ruray» en
`obs.parametros.semilla_ayuda`), «intipa chinkana kinray» (oeste), «Kikin kashpaka» (por defecto),
«rikurishka» (vigilado, `api.sim.mundo.cotopaxi_y_el_valle_de_latacunga.descripcion`; dudoso), «tukuy invierno
shina» (casi todos los inviernos; dudoso), «pampa hawa» (a cielo abierto, `api.lab.cambio.inundacion_a_cielo_abierto`;
dudoso), «Pamba» y «palanda» (llanura, banano), «ashtawan hatunka» (el máximo).

Extremos de la leyenda del desplazamiento (`origen.leyenda.desplazamiento_menos` / `_mas`): hasta la ronda
de arreglos de la revisión final estaban en español sin marca de idioma («alejándose» / «hacia el
satélite»); ahora llevan el borrador «karuyakun» / «satéliteman kuchuyakun» (dudoso: ¿«karuyakun» se entiende
como «se aleja del satélite»?). Las métricas del Observatorio usan la misma raíz: «Ashtawan karuyay»
(máx. alejándose) y «Satéliteman ashtawan kuchuyay» (máx. hacia el satélite).

Textos del modelo con clave (ronda de arreglos final): métricas del cambio y de la medición (`api.obs.metrica.*`),
notas del modelo por escenario (`api.nota.*`, largas y técnicas: muchos términos quedan en español, p. ej.
«dispersión de volumen», «reflexión especular», «correlacionar»), títulos de paneles y encabezados del
simulador (`api.sim.panel.*`, `api.sim.columna.*`), títulos de series (`api.serie.*`), unidades (`api.unidad.*`: «punchakuna», «m/puncha»,
«cm/wata») y «· modelopa rikushka (simulación)» para la detección del simulador.

### Textos que siguen en español a propósito

Los textos que escribe la API sin clave (404/405 genéricos, ayudas de métricas del simulador, notas y celdas
de la tabla de `modelo/desastres.py`, títulos de las entradas antiguas de la bitácora, informe PNG del
simulador, métricas de la medición con fecha en la etiqueta y notas del modelo con otros parámetros que los
de por defecto) se muestran en español con `lang="es"`. Las líneas de máquina del CSV (`# origen: …`, `# fuente: …`,
`# idioma: …`) siguen en español.

## Registro de la revisión del borrador (Tarea 27)

Revisión hecha por el equipo (modelo de lenguaje), **no por hablantes**: solo corrige inconsistencias
internas, errores de sentido evidentes y gramática segura; nada se marca como validado. Las decisiones
dudosas quedaron arriba como dudas. Cambios hechos:

- **Ortografía unificada** (D4): Kipa, llukshin, tukurik, kallari, hatun, Hurkuy, kucha, Ishkay (antes
  «Iskay»), allichishpa (antes «alichishpa»), alli (antes «allí», con tilde del español), «-manta» con
  guion, «NISAR-pa».
- **«Más» = «ashtawan»** (antes también «aswa»).
- **Negación con `-chu`**: «Kay panka mana tiyanchu», «… mana kanchu», «mana tupushkachu», «mana NISAR-pa
  chiqan rikuychu» (antes «… rikuymi», que afirmaba), «mana charinchu», «mana rikunchu», «mana
  yaykunchu», «mana minishtinchu».
- **Obligación «-na kan»** en los errores de la API (antes «kanan kan»), y «entre X y Y» como
  «X-manta Y-kama» (antes «X shuk Y chawpipi»; «shuk» es «uno/otro»).
- **Errores de sentido**: «aycha» (carne) en «más miradas» → «ashtawan achka rikuykuna»; «inti killa» (sol y
  luna) → «inti achik» (luz del Sol); «Cayna» (ayer) → «Kaya» (mañana) en el recorrido; «kuyakun» (ama) →
  «kun» (da) en «la API aún no la ofrece»; «utka» (rápido) usado como «o» → «o»; «ima» usado como «o» en
  `sim.pantalla.hallazgo` → «o»; «chusku panka» (cuatro hojas) → «chaki panka» (hojas secas);
  «satélitemanta kutimun» (vuelve desde el satélite) → «satéliteman kutimun»; «chullunkuna maymanta»
  (desde dónde) → «mayman kuyukta» (hacia dónde se mueve); «hanak ñanman / uranman» → «norteman / surman»;
  «Mamallaktapi ukupi» → «Mamallakta ukupi»; «killkana» (escribir) por «leer» → «ñawinchina»; «Chikan
  tukuyla ruray shuk cuadrota» (sin sentido) → «Áreayuk shuk cuadrota shuyuy»; «Panka mana rikuy» → «Capapa
  opacidad»; «ichuriy», «plawa», «elektrico kampo», «islla» (no identificadas) → «riego», «fase
  explosiva / explosividad», «campo eléctrico», «isla» en español; «mastaka» → «ashtawan hatunka»;
  «biomasa chinkaykan» → «biomasa chinkayka».
- **Una palabra por concepto**: cambio = «tikray» (el Laboratorio usaba «cambio»); señal = «señal» (el
  Laboratorio usaba «chimpay», atravesar); imagen = «rikcha» (antes también «imagen», «rikuy»,
  «rikchay»); fecha = «puncha» (antes también «pacha», «punchapacha»); valor = «chanin» (antes también
  «chaninchay»); comparar = «tupachiy» (antes también «tupuchiy»); siguiente = «Katik» (antes también «Qipa»
  y «Washa»); después = «washa» (antes también «kipa» en el divisor); distinto = «mana kikin» (antes
  también «shuklla»); agua abierta = «paskashka yaku» (antes también «kicharishka»); demostración =
  «rikuchiy» (Fundamentos y recorrido usaban «demostración»); verificado = «chiqanyachishka» (antes también
  «chiqanyashka»); «pendiente de confirmar» = «kamachik panka-wan chiqanyachina kan» también en
  `lab.pol.aviso_banda` (antes «oficial documentacionwan sinchiyachinata shuyan»); «Inténtalo de nuevo» =
  «Kutin ruray» como el botón «Reintentar».
- **Nombres de pantalla iguales en riel, pestaña y encabezado**: «Radarpa laboratorio» (genitivo delante;
  antes «Laboratorio radarpa» y «Radarpa yachana wasi»), «Sapi yachay» (antes también «Tiksi yachaykuna»).
- **Conjunción «y» del español** quitada («Polarizacionpash bandapash», «HH, VV»); comillas «» en
  `sim.gemelo.nota` (antes “ ”).
- **Aviso del kichwa** (H4) reescrito con el vocabulario de verificación ya usado en el borrador.
- **Botones en imperativo** (D9) en el reproductor y «Volver a».
