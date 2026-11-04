# Guion de presentación: historias de datos (3 minutos)

Para quien presente la app NISAR · Ecuador. Ruta de partida: `/` (Historias). Todo lo que se ve hoy son
**datos de demostración sintéticos**: dilo en los primeros diez segundos y no lo sueltes. No se afirma nada
sobre un lugar real ni sobre capacidades de NISAR que no estén confirmadas con la documentación oficial.
Las cifras se leen en pantalla (las calcula la app); no las memorices ni las inventes.

## Antes de empezar (preparación)

1. `python servidor.py` y abrir `http://localhost:8000/` (o la versión de desarrollo).
2. Comprobar que la banda naranja «DATOS DE DEMOSTRACIÓN · no son observaciones reales de NISAR» está arriba.
3. Tener a mano el Observatorio (`/observatorio`) por si preguntan por una medición.

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

## Cómo cambiaría con datos reales

| Elemento | Hoy (demostración) | Con datos reales |
|---|---|---|
| Banda superior | «DATOS DE DEMOSTRACIÓN» siempre visible | Desaparece solo si todo origen es real |
| Sello de origen | «Sintético · generador… · semilla…» | Fuente y producto oficiales, con su cita |
| Hallazgo | «En este escenario de demostración, …» | Redacción de hecho, con fechas de las pasadas |
| Hipótesis | Ejemplos ilustrativos | Hipótesis a contrastar con campo y otras fuentes |
| Pareja antes/después | La pareja de pasadas que más cambia en la serie del escenario (ver abajo) | Las fechas que existan y elija quien analiza |

## Si preguntan

- «¿Es real?» No: sintético, generado con un script reproducible con semilla fija.
- «¿Qué satélite, qué banda, qué fecha?» No lo afirmamos: pendiente de confirmar con la documentación oficial.
- «¿Por qué esa pareja de fechas?» La API no recomienda un intervalo; la historia pide primero el cambio entre la
  primera y la última pasada y, con su serie, elige la pareja ordenada con mayor diferencia absoluta (si no hay
  criterio fiable, deja primera y última). Con la inundación suele ser el pico de la crecida frente a la pasada más
  seca; con el incendio, antes del fuego frente a la primera pasada posterior. El cursor de la cinta mueve «después»
  y el Observatorio permite elegir otras.
