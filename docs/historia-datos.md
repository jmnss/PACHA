# Guion de presentación: historias de datos (3 minutos; 90 s con el recorrido)

Para quien presente la app NISAR · Ecuador. Ruta de partida: `/` (Historias). Todo lo que se ve hoy son
**datos de demostración sintéticos**: dilo en los primeros diez segundos y no lo sueltes. No se afirma nada
sobre un lugar real ni sobre capacidades de NISAR que no estén confirmadas con la documentación oficial.
Las cifras se leen en pantalla (las calcula la app); no las memorices ni las inventes.

## Antes de empezar (preparación)

1. `cd frontend && npm run build && cd .. && python servidor.py` y abrir `http://localhost:8000/` (o la versión de desarrollo).
2. Comprobar que la banda naranja «DATOS DE DEMOSTRACIÓN · no son observaciones reales de NISAR» está arriba.
3. Tener a mano el Observatorio (`/observatorio`) por si preguntan por una medición o por los otros tipos de cambio.
4. Si falla el internet, el mapa base de Esri no carga; la app sigue funcionando con las provincias locales (ver «Plan B» al final).

## Versión corta: el recorrido guiado (90 s)

`/recorrido` cuenta la historia sola, en seis pasos con la pantalla real incrustada: problema, la nube no lo
detiene, polarizaciones, mapa de cambio, incendio y simulador. Tiene pausa, flechas del teclado y «Anterior» y
«Siguiente». Úsalo cuando haya menos de dos minutos o como fondo mientras explicas; los textos ya dicen que son
datos de demostración.

## Minuto 0:00 a 0:30 · Qué es y qué NO es

- Mostrar: la cabecera «NISAR · Ecuador» y el índice con las dos historias.
- Decir: «Esta app traduce lo que ve un radar de satélite en información que cualquiera puede leer. Dos
  historias: una inundación en la Costa baja y un incendio en la Sierra.»
- Advertir (obligatorio): «Todo lo que van a ver son datos de demostración generados por un script con semilla
  fija, no observaciones reales de NISAR. Sirven para enseñar cómo se vería.»
- Señalar la banda naranja de la parte superior.

## Minuto 0:30 a 1:15 · Por qué un radar (partes 1 y 2 de la historia de inundación)

- Mostrar: «Qué cambia y por qué importa» y «Qué ve el radar y por qué».
- Decir: la temporada lluviosa llena de agua la llanura y cubre el cielo de nubes; un radar es un sensor activo,
  funciona de día y de noche y con nubes. Lo que vuelve depende de la rugosidad y de la constante dieléctrica:
  el agua en calma es un espejo y se ve oscura; bajo árboles inundados, el doble rebote se ve brillante.
- Pulsar un término subrayado (por ejemplo «constante dieléctrica») para enseñar que cada término se explica en
  el sitio.
- Abrir `/laboratorio` («La nube no lo detiene»): subir las nubes al 70-100 %. Decir: «La imagen óptica se pierde;
  el radar sigue viendo la inundación.» Leer las dos cifras de la franja (las calcula la app) y añadir la
  advertencia honesta: aun sin nubes, el óptico no ve el agua bajo los árboles. La escena es inventada.
- No decir qué bandas, productos o fechas tendrá NISAR: «eso está pendiente de confirmar con la documentación
  oficial».

## Minuto 1:15 a 2:00 · El comparador (parte 3)

- Mostrar: el comparador antes/después con «HH · recomendada». Arrastrar el divisor despacio.
- Decir: «Con HH el agua abierta se ve oscura y la vegetación inundada, brillante.» Leer la frase en gris sobre la
  imagen (el hallazgo calculado; empieza por «En este escenario de demostración»).
- Cambiar a HV: «Con HV el contraste del agua es menor; cada polarización cuenta algo distinto.»
- Mover el cursor de la cinta de pasadas para elegir otra pasada «después» y señalar la banda de temporada lluviosa.
- Señalar la leyenda y el sello de origen bajo la imagen: «Sintético · generador… · semilla…».

## Minuto 2:00 a 2:30 · Incendio en la Sierra y qué podría explicar lo que se ve

- Pulsar «Incendio en la Sierra» en el índice. El comparador abre con HV.
- Decir: «Aquí la polarización que mejor lo resalta es HV: responde a las ramas y los troncos, y cae cuando el
  fuego los consume.»
- Leer una hipótesis (parte 4) y subrayar que cada una empieza por «En este escenario de demostración»: son
  ejemplos ilustrativos (temporada seca, viento, combustible, quemas agrícolas), no hallazgos.

## Minuto 2:30 a 3:00 · Cierre: qué cambiaría con datos reales

- Mostrar: la parte 5 y el botón «Ver en el Observatorio» (mismo escenario, mismas fechas).
- Decir: con datos reales de NISAR esto podría servir para cartografiar inundaciones y áreas quemadas aunque haya
  nubes o humo. Para sacar conclusiones haría falta: series largas del mismo lugar, saber qué polarizaciones hay en
  cada pasada, y validación en campo. Qué cobertura habrá sobre Ecuador está pendiente de confirmar.
- Frase final: «Hoy es una demostración honesta. Con datos reales cambiará la fuente y hará falta calibrar y validar antes de sacar conclusiones; la forma de leerlo, en cambio, se mantiene.»

## Extra (si sobra tiempo): polarización y banda, impacto y simulador

- **Laboratorio · Polarización y banda** (`/laboratorio?vista=polarizacion`): cambiar HH, HV y VV y la tabla dice cuál
  resalta cada cambio (la calcula la API). La banda S es solo un ejemplo marcado «pendiente de confirmar con la
  documentación oficial»: no afirmar que NISAR la entregue.
- **Impacto** (`/observatorio?escenario=ec_la_segua&vista=impacto`, o `ec_loja` para el incendio): hectáreas
  afectadas, evolución y una lectura en lenguaje llano para gestores. Pulsar «Descargar informe (PNG)». Las acciones
  son condicionales («si esto fuera un evento real…») y no sustituyen a la autoridad competente.
- **Simulador de eventos** (`/simulador`): un incendio, una erupción o un terremoto sobre el relieve real de Ecuador.
- **Fundamentos** (`/fundamentos`): la física del radar y lo que de NISAR sigue pendiente de confirmar.

## Extra (si sobra tiempo): el Observatorio

Ruta `/observatorio`. Mismo escenario, tres vistas: **Mapa** (capas sobre el mapa; los mapas base de Esri (Oscuro, Satélite, Relieve) son
opcionales: requieren internet), **Antes y después** (comparador deslizante) y **Serie** (serie temporal del escenario). Un panel de
**simulación** permite cambiar parámetros (semilla, miradas/ENL, dirección de la órbita, variación estacional y los
controles propios de cada tipo de cambio) y ver otra escena sintética; con la misma semilla se repite la misma escena.
Los seis tipos de cambio del challenge están en el selector. Sigue siendo demostración: la banda no se cierra.

## Cómo cambiaría con datos reales

| Elemento | Hoy (demostración) | Con datos reales |
|---|---|---|
| Banda superior | «DATOS DE DEMOSTRACIÓN» siempre visible | Desaparece solo si todo origen es real |
| Sello de origen | «Sintético · generador… · semilla…» | Fuente y producto oficiales, con su cita |
| Hallazgo | «En este escenario de demostración, …» | Redacción de hecho, con fechas de las pasadas |
| Hipótesis | Ejemplos ilustrativos | Hipótesis a contrastar con campo y otras fuentes |
| Pareja antes/después | La pareja de pasadas que más cambia en la serie del escenario (ver abajo) | Las fechas que existan y elija quien analiza |

## Plan B si no hay internet

- El mapa base de Esri y las etiquetas no cargan; el Observatorio sigue mostrando las capas sobre las provincias
  locales y las ciudades principales. Dilo en una frase y sigue con Historias, Laboratorio, Impacto y Recorrido, que
  no dependen de la red.

## Si preguntan

- «¿Es real?» No: sintético, generado con un script reproducible con semilla fija.
- «¿Qué satélite, qué banda, qué fecha?» No lo afirmamos: pendiente de confirmar con la documentación oficial.
- «¿Por qué esa pareja de fechas?» La API no recomienda un intervalo; la historia pide primero el cambio entre la
  primera y la última pasada y, con su serie, elige la pareja ordenada con mayor diferencia absoluta (si no hay
  criterio fiable, deja primera y última). Con la inundación suele ser el pico de la crecida frente a la pasada más
  seca; con el incendio, antes del fuego frente a la primera pasada posterior. El cursor de la cinta mueve «después»
  y el Observatorio permite elegir otras.
