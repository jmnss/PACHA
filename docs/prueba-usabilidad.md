# Prueba de usabilidad de PACHA · guion de 15 minutos

Para 3 a 5 personas, una por sesión. Público: educadores, gestores y ciudadanía. También sirve con jurado del
NASA Space Apps. Sesiones por separado, sin que unas vean a otras.

Línea base: `docs/auditoria-ux.md` §1 (Nielsen 24/25/18 sobre 40; Simulador con 3–4 toques hasta el resultado a 390 px;
sin portada ni acción principal). El rediseño (`docs/rediseno-pacha.md`) busca superar esa línea. Esta prueba mide si lo logra
con personas reales, no con herramientas.

## Nota de honestidad

- Los datos de la app son **de demostración** (sintéticos). La banda de demostración debe verse siempre.
- El incendio del cerro Casitagua se nombra **sin fecha** y como «evento real · fuente por añadir». No inventes fecha ni fuente.
- No digas a la persona qué es real y qué no antes de la tarea. Eso se pregunta al final.
- Cuando una pantalla muestre un «por llegar», anótalo: es un hueco conocido, no un fallo de la persona.

## Quién lleva la sesión

- **Facilitador:** lee los enunciados, no ayuda, no explica la interfaz.
- **Anotador** (puede ser la misma persona si no hay otra): cronometra y llena la hoja de registro.

## Preparación (5 minutos antes)

1. Dispositivo: el que la persona use a diario. Si hay dos sesiones, una en celular (390 px) y otra en computador.
2. Abre `https://jmnss.github.io/PACHA/` (o `http://localhost:8000` con `python servidor.py`). Idioma: español.
3. Limpia la URL: sin parámetros. Cierra otras pestañas. Activa la grabación de pantalla solo si la persona acepta.
4. Ten a mano el cronómetro y las hojas de registro (abajo).

## Introducción (1 minuto, lee en voz alta)

«Gracias por ayudarnos. Estamos probando una aplicación, no a usted. No hay respuestas malas. Si algo no se entiende,
el problema es de la aplicación. Pida lo que quiera, pero yo no podré ayudar mientras trabaja. Le pido que piense en voz
alta: diga lo que mira, lo que espera y lo que le confunde. No le pediré datos personales y no apuntaré su nombre.
Puede parar cuando quiera. ¿Está de acuerdo en seguir?»

Registra el consentimiento verbal como «sí» en la hoja. Identifica a la persona solo como P1, P2, P3…

## Prueba de 5 segundos en Inicio (2 minutos)

Abre `/` y mírala tú primero. Dile: «Voy a mostrarle una pantalla durante 5 segundos. Mírela y luego se la quito.»
Muestra la portada 5 segundos y tápala (o cambia de pestaña). Pregunta:

1. «¿Qué es esto? ¿Para qué sirve?»
2. «¿Qué haría primero?»

Anota la respuesta textual. Éxito: nombra algo cercano a «mapa o radar que muestra cambios en la tierra (agua, fuego)» y
elige un camino visible (Explorar, Simular, Aprender). Devuelve la pantalla y deja que mire sin límite antes de las tareas.

## Tres tareas (8 minutos en total)

Lee el enunciado exacto. No añadas pistas. Si pasa del máximo, di «Lo dejamos aquí» y pasa a la siguiente (cuenta como «no»).
Empieza cada tarea desde `/`.

### Tarea 1 · El agua del embalse

- **Enunciado:** «Encuentra cuánto cambió el agua del embalse Mazar entre dos fechas.»
- **Ruta esperada:** `/` → `/explorar/historias` (escenario `embalse-mazar`) o `/explorar/observatorio`.
- **Criterio de éxito:** elige el embalse Mazar, escoge dos fechas distintas y dice una cifra o un cambio (más o menos
  agua). **Parcial:** llega al mapa o a la comparación pero no lee el cambio. **No:** no llega al embalse.
- **Tiempo objetivo:** 90 s. **Máximo:** 3 min.
- **Vigila:** si busca primero en Inicio o en Aprender; si entiende el comparador antes/después; si ve la banda de demostración.

### Tarea 2 · El incendio del Casitagua

- **Enunciado:** «Simula un incendio en el cerro Casitagua y compáralo con lo que vio el radar.»
- **Ruta esperada:** `/` → `/simular` (incendio, Casitagua; el resultado aparece tras «Desatar») → vuelve a
  `/explorar/historias` o `/explorar/observatorio` (escenario `incendio-casitagua`) para ver lo del radar.
- **Criterio de éxito:** lanza la simulación, ve el resultado y abre la vista del radar para comparar. **Parcial:** simula
  pero no encuentra la parte del radar (o al revés). **No:** no logra lanzar la simulación.
- **Tiempo objetivo:** 2 min. **Máximo:** 4 min.
- **Vigila:** si encuentra la acción principal sin ayuda; si entiende que el Resultado llega después de «Desatar»; si abre
  «Avanzado» sin necesidad; toques hasta el resultado a 390 px (línea base: 3–4).

### Tarea 3 · La polarización

- **Enunciado:** «Explica qué polarización ve mejor el agua.»
- **Ruta esperada:** `/` → `/aprender/fundamentos` (o `/aprender/laboratorio`, `/aprender/recorrido`).
- **Criterio de éxito:** dice con sus palabras cuál polarización se usa para el agua y por qué (el agua lisa devuelve poco
  al radar y se ve oscura). Debe responder según lo que la app dice, no de memoria. **Parcial:** nombra la polarización sin la razón.
  **No:** no la encuentra.
- **Tiempo objetivo:** 90 s. **Máximo:** 3 min.
- **Vigila:** si abre Aprender o prefiere Explorar; si el término técnico tiene su explicación a mano.

## Preguntas posteriores (3 minutos)

1. «¿Qué fue lo más fácil? ¿Y lo más difícil?»
2. «¿Se perdió en algún momento? ¿Dónde?»
3. «¿Le quedó claro qué datos eran de demostración y cuáles no?» Pídale que lo explique con sus palabras.
4. «¿Qué entendió que era el incendio del Casitagua? ¿Era un evento real?» (la respuesta correcta: aún sin fecha ni fuente.)
5. «¿Qué entendió por la cifra o la escala que vio? ¿Qué le dijo?»
6. «¿Lo usaría para enseñar o decidir algo? ¿Qué le faltó?»
7. «Del 1 al 5, ¿qué tan fácil fue? ¿Se lo mostraría a alguien?»

## Hoja de registro (una por persona)

Persona: P__ · Fecha: ____ · Dispositivo: ____ · Consentimiento verbal: sí
5 segundos, «¿qué es?»: ____________ · «¿qué haría primero?»: ____________

| Tarea | Tiempo | Éxito (sí/parcial/no) | Dónde se trabó | Cita textual |
|---|---|---|---|---|
| 1. Agua de Mazar | | | | |
| 2. Incendio y radar | | | | |
| 3. Polarización | | | | |

Preguntas posteriores: anota las respuestas 3 y 4 palabra por palabra (honestidad de datos).

## Cómo resumir

- **Tasa de éxito:** por tarea, sí / total de personas. Cuenta «parcial» aparte (no suma como sí). Meta: 80 % o más en las tres.
- **Mediana de tiempo:** por tarea, con las tareas completadas. Compárala con el objetivo y el máximo. Con 3–5 personas,
  muestra también el rango.
- **Problemas por gravedad (escala de Nielsen 0–4):** 0 no es problema, 1 cosmético, 2 menor, 3 mayor (arreglar pronto),
  4 catastrófico (arreglar antes de publicar). Puntúa por frecuencia (¿cuántos lo sufrieron?), impacto (¿impidió la tarea?)
  y persistencia (¿se repitió?). Una persona atascada con gravedad 4 pesa más que cuatro con gravedad 1.
- **Honestidad:** cuenta cuántas personas distinguieron los datos de demostración. Si menos de todas, es gravedad 4.
- Compara con la línea base: toques hasta el resultado, primer elemento interactivo, una acción principal clara.

## De lo observado a correcciones

1. Agrupa las citas por pantalla y por tarea. Un problema visto en 2 o más personas entra a la lista.
2. Escribe cada problema como hecho, no como solución: «P2 y P4 no vieron el botón Desatar» (no «hacer el botón más grande»).
3. Asigna gravedad (0–4) y ordena. Gravedad 3–4 primero.
4. Para cada uno, propón un cambio con un único responsable y una pantalla: ruta, componente o texto (clave es/en/qu).
5. Los textos nuevos llevan su clave en los tres catálogos. Nada de lógica científica en el frontend.
6. Los problemas de gravedad 3–4 se corrigen y se vuelve a probar con otras 2 personas. Los de 1–2 quedan anotados como pendientes.
7. Guarda el resumen (tabla de tareas, problemas, citas) en un archivo nuevo en `docs/`, sin nombres de personas.
