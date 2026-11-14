# Auditoría Web Interface Guidelines (Vercel) — frontend PACHA

Rama `rediseno-pacha`, 2026-11-14. Reglas: `vercel-labs/web-interface-guidelines/main/command.md` (descargadas hoy).
Rutas relativas a `frontend/src/` salvo `frontend/index.html`. Formato: `archivo:línea — regla — problema — arreglo [Gravedad]`.

Restricción de honestidad (CLAUDE.md): la banda «DATOS DE DEMOSTRACIÓN» y los sellos de origen se quedan siempre visibles y sin botón de cerrar. Ningún hallazgo propone quitarlos ni plegarlos.

Reglas que no se aplican: «Title Case» (es/qu usan mayúscula solo al inicio; no cambiar) e «hidratación» (no hay SSR).

---

## Historias

- `pantallas/historias/Historia.tsx:106-107` — URL refleja el estado — la polarización (`pol`) y la pasada «después» elegida en la cinta viven en `useState`; un enlace compartido o una recarga vuelven al valor por defecto — añadir `pol` y `despues` al `ESQUEMA` de `Historias.tsx:13` con `useEstadoUrl` **[Media]**
- `pantallas/historias/Historia.tsx:219` — HTML semántico antes que ARIA — `Pestanas` (role=tab) se usa para elegir HH/HV y no tiene tabpanel ni `aria-controls`; es un control segmentado — ver el hallazgo de `diseno/Pestanas.tsx:36` (radiogroup o `aria-pressed`) **[Media]**
- `pantallas/historias/Historias.tsx:58` — i18n `translate="no"` — el h1 «PACHA» (y NASA POWER, geoBoundaries o Public Sans en los créditos, `:61`) se puede traducir automáticamente — dejar pasar `translate="no"` por `CabeceraPantalla` y envolver las marcas **[Baja]**
- `pantallas/historias/historias.css:25,28` — Tipografía: `text-wrap: balance` — `.historia__titulo` y `.historia__encabezado` (26 y 20 px, frases largas en kichwa) no equilibran las líneas — `text-wrap: balance` **[Baja]**
- `comparador/comparador.css:9` (en Historias) — Estados de hover/interacción — `.comparador__gesto` muestra `cursor: crosshair` aunque `Historia.tsx:188` no pasa `onPunto` ni `onCuadrante`, así que la imagen parece medible y no lo es — poner el cursor (o la capa de gesto) solo cuando haya manejadores **[Baja]**

## Observatorio

- `pantallas/observatorio/VistaMapa.tsx:484` + `mapa/MapaBase.tsx:86-93` — Gesto sin alternativa de teclado — crear un escenario «al pulsar un punto del mapa» solo funciona con puntero; con teclado no se puede elegir un lugar — ofrecer una alternativa: campos lat/lon con «Simular aquí», o «Simular en el centro del mapa» para el teclado de MapLibre (flechas, +/−) **[Alta]**
- `pantallas/observatorio/VistaAntesDespues.tsx:141,148` · `comparador/Comparador.tsx:166-167` · `pantallas/observatorio/LienzoCapa.tsx:83-84` — Gesto sin alternativa de teclado — medir un punto (clic) o un cuadrante (arrastre) solo funciona con puntero; `Mediciones` queda inaccesible por teclado — capa de gesto enfocable con cursor por flechas, Enter para el punto y Mayús+flechas para el cuadrante (como en `simulador/Tablero.tsx`), o campos numéricos **[Alta]**
- `comparador/comparador.css:6,9` — Táctil — `touch-action: pan-y` en la imagen hace que un arrastre vertical desplace la página (llega `pointercancel`), así que en móvil el cuadrante solo se dibuja en horizontal — `touch-action: none` en `.comparador__gesto` cuando haya `onCuadrante`, con una alternativa de toque (dos toques = esquinas) **[Media]**
- `pantallas/observatorio/VistaMapa.tsx:388` · `Observatorio.tsx:225` — URL refleja el estado — el modo de capa (`modelo`/`cambio`) y la vista país (`pais`) viven en `useState`, así que el enlace no los conserva — añadir `capa` y `pais` al `ESQUEMA` (`Observatorio.tsx:37`) **[Media]**
- `pantallas/observatorio/VistaAntesDespues.tsx:56` — URL refleja el estado — la subvista (`ver`: comparar, cambio, clasificación o extra) es `useState` — añadirla al `ESQUEMA` **[Media]**
- `pantallas/observatorio/VistaMapa.tsx:537` — Mensaje de error con paso siguiente / etiqueta específica — el botón «Reintentar» del error de simulación llama a `simular.reset()`, que solo oculta el error sin volver a intentar — guardar el último lat/lon y repetir `simular.mutate`, o rotular el botón «Cerrar aviso» **[Media]**
- `pantallas/observatorio/PanelSimulacion.tsx:485` — Acción destructiva sin confirmación ni deshacer — «Restablecer parámetros» borra todos los valores de una vez, y como `alNuevo` (`Observatorio.tsx:221`) usa `reemplazar: true`, el botón Atrás no los recupera — dar una ventana de «Deshacer» o escribir esa entrada en el historial sin `reemplazar` **[Media]**
- `pantallas/observatorio/PanelSimulacion.tsx:486-487` — `aria-live` comedido — el `role="status"` se reescribe cada segundo («Calculando… N s») y el lector de pantalla lo anuncia sin parar — anunciar solo el inicio y el final y dejar el contador en `aria-hidden` o `aria-live="off"` **[Media]**
- `pantallas/observatorio/PanelSimulacion.tsx:359-362` — Errores junto al campo y anunciados — `semilla_invalida` no está enlazado al input (`aria-describedby`) ni es región viva — enlazar el id del error en `aria-describedby` y añadir `aria-live="polite"` **[Media]**
- `pantallas/observatorio/PanelSimulacion.tsx:356-357` — Formularios: `name` / `autocomplete` — el campo de la semilla no tiene `name` ni `autocomplete="off"` — añadir los dos **[Baja]**
- `pantallas/observatorio/Mediciones.tsx:238` · `PanelContexto.tsx:258` · `mapa/ControlesMapa.tsx:210` — Números con `Intl` y espacio duro — el porcentaje se forma como `` `${n} %` `` con un espacio normal que puede partir la línea — `formatoNumero(..., { style: 'percent' })`, o como mínimo ` %` **[Baja]**
- `pantallas/observatorio/VistaAntesDespues.tsx:116-121,153` · `VistaImpacto.tsx:178-185,193` — Estado de carga durante la petición — la descarga PNG es asíncrona y el botón no muestra «Generando…» ni se desactiva, así que permite doble clic — desactivar el botón con su texto de carga mientras corre **[Baja]**
- `pantallas/observatorio/observatorio.css:111` — Estado hover — `summary.ayuda-radar__resumen` no cambia al pasar el puntero — añadir `:hover` con más contraste (`--text` o subrayado) **[Baja]**
- `pantallas/observatorio/observatorio.css:93` — Estado hover — `.medicion__nota a` («Ver la serie») no tiene `:hover` — añadirlo **[Baja]**
- `pantallas/observatorio/observatorio.css:46` — Contenido largo — `.lista-datos dd` (región, próximo hito y otros textos de la API, kichwa) está en un flex `space-between` sin `min-width: 0` ni `overflow-wrap` — `min-width: 0; overflow-wrap: anywhere` **[Baja]**
- `mapa/MapaBase.tsx:85,166-169` — `aria-live` / interacción — la placa de provincia solo se actualiza con `mousemove` y clic, no con el teclado del mapa, y no es región viva — actualizarla también en `moveend` (centro) con `aria-live="polite"` **[Baja]**
- `mapa/mapa.css:6-9` — Estado hover — `button.mapa__marcador` no tiene `:hover` — subir el borde o la escala en `:hover` **[Baja]**
- `mapa/MapaBase.tsx:172` — Enlaces — el enlace de geoBoundaries abre una pestaña nueva (`target="_blank"`) sin avisarlo — añadir el aviso en texto para lectores o quitar `_blank` **[Baja]**

## Simulador

- `pantallas/simulador/Bitacora.tsx:43` · `ResultadosEvento.tsx:317` — Acción destructiva sin confirmación ni deshacer — «Vaciar la bitácora» borra al instante el registro guardado en el navegador (`guardarBitacora([])`), sin forma de recuperarlo — pedir confirmación o dar una ventana de «Deshacer» de unos 5 s antes de escribir **[Alta]**
- `pantallas/simulador/Simulador.tsx:159` — Acción destructiva sin deshacer — «Quitar ciudades» usa `actualizar(..., reemplazar=true)`, así que tampoco Atrás las devuelve — escribir en el historial (`false`) o dar «Deshacer» **[Media]**
- `pantallas/simulador/Tablero.tsx:220-236` — `aria-live` para cambios asíncronos — al mover el cursor con las flechas no se anuncia la celda ni lo que hay en ella, así que se maneja a ciegas — región `aria-live="polite"` en `solo-lectores` con «fila i, columna j · lugar» **[Media]**
- `pantallas/simulador/PanelMundo.tsx:158,177` — El envío sigue activo y los errores van junto al campo — «Crear el mundo» se desactiva si lat, lon o fecha no son válidas y no dice por qué — dejar el botón activo, validar al enviar, mostrar el error junto a cada campo y llevar el foco al primero **[Media]**
- `pantallas/simulador/Simulador.tsx:51-53` — URL refleja el estado — los parámetros cambiados (`elegidos`) solo pasan a la URL al pulsar una celda; si se recarga antes, se pierden — escribir `p` en la URL (con `reemplazar`) al cambiar cada control **[Media]**
- `pantallas/simulador/PanelMundo.tsx:168-169` — Formularios: `name`, `autocomplete`, `inputmode` — lat y lon no tienen `name` ni `autocomplete="off"`, y les falta `inputMode="decimal"` — añadirlos **[Baja]**
- `pantallas/simulador/PanelHerramienta.tsx:280` — Formularios — el campo de texto libre (nombre de la ciudad) no tiene `name`, `autocomplete="off"` ni `spellCheck={false}` — añadirlos **[Baja]**
- `pantallas/simulador/ResultadosEvento.tsx:289-291,300` — Estado de carga — el informe PNG es asíncrono y el botón no muestra carga ni se desactiva — mostrar «Generando…» y desactivarlo **[Baja]**
- `pantallas/simulador/Tablero.tsx:224-225` — Imágenes con `width`/`height` — los `<img>` del relieve y de los cuadros no llevan dimensiones; el `aspect-ratio` del contenedor ya evita el salto de diseño, así que el riesgo es bajo — añadir `width={n} height={n}` **[Baja]**
- `pantallas/simulador/simulador.css:19` — Contenido largo — `.tablero__marca` usa `white-space: nowrap` y está centrada con `translate(-50%)`, así que los nombres cerca del borde se cortan con el `overflow: hidden` — acotar con `max-width` y `text-overflow: ellipsis`, o recolocar en los bordes **[Baja]**
- `pantallas/simulador/Simulador.tsx:141` — Fechas y horas con `Intl` — `valorTexto` usa `datos.tiempos[i]` tal como llega de la API (sin formato por idioma) — formatear en el cliente o traer clave y valores; está por comprobar qué formato manda la API **[Baja]**

## Sistema de diseño compartido

- `mapa/mapa.css:14` — Anti-patrón `outline: none` sin sustituto — `.maplibregl-canvas { outline: none }` quita el anillo de foco del lienzo del mapa, que se enfoca con Tab (flechas y +/−) — dar el foco a `.vista-mapa__mapa:focus-within` con `var(--focus-ring)`, o usar `:focus-visible` en el canvas **[Alta]**
- `diseno/Pestanas.tsx:36-47` — HTML semántico antes que ARIA — `role="tab"` sin `aria-controls` ni ningún `role="tabpanel"` en la app; además se usa como control segmentado (mapa base en `mapa/ControlesMapa.tsx:207`, modo de capa en `VistaMapa.tsx:473`, polarización) — dos variantes: pestañas de verdad con `aria-controls`→`tabpanel` (vistas del Observatorio) y un segmentado con `role="radiogroup"`/`radio` o botones con `aria-pressed` **[Media]**
- `diseno/componentes.css:171` (`.boton:hover { opacity: .85 }`) — Los estados interactivos suben el contraste — el hover baja la opacidad, así que el botón primario blanco pierde contraste en vez de ganarlo — en el hover, subir el borde o el fondo (`--raised` en el secundario) **[Media]**
- `diseno/tokens.css:69` · `frontend/index.html:4-5` — Tema oscuro — falta `color-scheme: dark` en `html` (barras de desplazamiento, `type=date/time/number` y desplegables nativos salen claros) y falta `<meta name="theme-color" content="#171719">` — añadir los dos **[Media]**
- `diseno/componentes.css:54` (riel móvil `inset: auto 0 0 0`) · `:306-313` (`.hoja__panel`) — Zonas seguras — la barra inferior fija y la hoja inferior no reservan `env(safe-area-inset-bottom)`, así que el indicador de inicio de iOS las tapa; además `index.html:5` no tiene `viewport-fit=cover` — `padding-bottom: env(safe-area-inset-bottom)` y `viewport-fit=cover` **[Media]**
- `diseno/componentes.css:313` (`.hoja__cuerpo`) — `overscroll-behavior: contain` en hojas y modales — el desplazamiento de la hoja pasa a la página de detrás — añadir `overscroll-behavior: contain` **[Media]**
- `diseno/componentes.css:201` (`.interruptor` 28×16) · `:200` (`.interruptor-fila` con `gap`) — Objetivo mínimo y un solo área para control y etiqueta — el interruptor mide 16 px de alto (menos que `--size-objetivo` de 24) y el hueco entre interruptor y `<label>` no responde al clic — envolver interruptor y etiqueta en una sola área clicable de al menos 24 px de alto (en móvil `--h-touch`) **[Media]**
- `diseno/Tabla.tsx:30` — Lectores de pantalla — `aria-label` en un `<span>` sin rol («—» = sin dato) no se anuncia de forma fiable — `<span aria-hidden="true">—</span><span class="solo-lectores">sin dato</span>` **[Media]**
- `diseno/CabeceraPantalla.tsx:20` · `diseno/BandaDemostracion.tsx:86` — i18n `translate="no"` — el marcador `data-no-traducir` solo lo usan las pruebas; marcas e identificadores (PACHA, NISAR, HH/HV, σ⁰, ENL, NASA POWER, generador o versión) no llevan `translate="no"`, y el traductor del navegador los estropea (sobre todo quien navega en kichwa con traducción automática) — añadir `translate="no"` donde hoy va `data-no-traducir` y en `Termino` para siglas **[Media]**
- `diseno/tokens.css:71` (`body`) — Táctil — faltan `touch-action: manipulation` y un `-webkit-tap-highlight-color` decidido a propósito — `html { touch-action: manipulation; -webkit-tap-highlight-color: transparent }` (el foco ya tiene anillo propio) **[Baja]**
- `diseno/componentes.css:110,122` — Tipografía: `text-wrap: balance` — `.cabecera__titulo` y `.tarjeta__titulo` no lo usan (solo `.cabecera__detalle`) — añadirlo **[Baja]**
- `diseno/HojaInferior.tsx:41-50` — Modales — el foco queda atrapado, pero el resto de la página no se marca `inert`, así que lectores y búsqueda del navegador siguen llegando al fondo — poner `inert` en `#root` mientras la hoja esté abierta **[Baja]**
- `diseno/MenuAcciones.tsx:29-30` — Foco — un clic fuera cierra el menú sin devolver el foco al botón, y el foco queda en `body` si el clic cae en zona no enfocable — devolver el foco solo si estaba dentro de la lista **[Baja]**
- `diseno/Termino.tsx:42-45,63-71` — Teclado y anuncio — Escape solo cierra si el foco está en el botón, y el panel `role="note"` no se lee al abrir — enlazar el panel con `aria-describedby` en el botón mientras esté abierto y escuchar Escape en el documento **[Baja]**
- `diseno/BandaDemostracion.tsx:73-79` — Foco en ventanas no modales — el panel «Qué significa» (`role="dialog"`) recibe el foco, pero un Tab fuera no lo cierra y queda flotando sobre el contenido. Arreglo: cerrarlo con `focusout` fuera de la raíz. **Solo el panel informativo: la banda sigue fija y sin cerrar** **[Baja]**
- `diseno/Tabla.tsx:34` — URL refleja el estado — la página de la tabla es `useState` y se pierde al recargar — opcional: parámetro `pag` en la URL para las tablas largas **[Baja]**
- `diseno/Campo.tsx:17` — Formularios — el componente no pone `name` por defecto ni ofrece `autocomplete` — aceptar `name` y poner `autocomplete="off"` por defecto en campos que no son de credenciales **[Baja]**
- `diseno/Galeria.tsx:310` — Marcadores de posición — `placeholder="Nombre del lugar"` no termina en «…» ni da un ejemplo (página interna `/_sistema`) — `placeholder="p. ej. Portoviejo…"` **[Baja]**
- `comparador/Comparador.tsx:174-178` — HTML semántico antes que ARIA — el divisor es un `div role="slider"` hecho a mano; funciona con flechas, Inicio y Fin, pero le faltan Re Pág/Av Pág — añadir `PageUp`/`PageDown` (±10) o usar `<input type="range">` oculto **[Baja]**
- `comparador/comparador.css:15-20` — Contenido largo — las etiquetas de fecha (`max-width: 45%`) no tienen recorte ni control de altura; en kichwa ocupan varias líneas sobre la imagen — `text-overflow: ellipsis; white-space: nowrap; overflow: hidden` con el texto completo en el resumen para lectores **[Baja]**
- `comparador/Comparador.tsx:151` — El mensaje de error dice el paso siguiente — «Las dos imágenes no cubren la misma zona…» no dice qué hacer — añadir «Elige otra pareja de pasadas.» **[Baja]**

Lo que ya cumple (sin cambios): enlace para saltar al contenido y `scroll-padding` bajo la banda fija; anillo `:focus-visible` global; transiciones solo de `transform`/`opacity`/`color` y anuladas con `prefers-reduced-motion`; animación del Simulador con pausa y que salta al final con menos movimiento; textos de carga con «…»; cifras tabulares (`.num`); fechas y números por `formatoFecha`/`formatoNumero`; idioma tomado de `navigator.languages` y `document.documentElement.lang` sincronizado; `<select>` con fondo y color explícitos; botones de solo icono con `aria-label`; iconos SVG con `aria-hidden`; tablas con `<caption>` y paginadas desde 50 filas; lienzos con `role="img"` y resumen para lectores; banda y sellos de origen siempre visibles.

---

## Recuento por gravedad

| Gravedad | Hallazgos |
|---|---|
| Crítica | 0 |
| Alta | 4 |
| Media | 21 |
| Baja | 30 |
| **Total** | **55** |

Por pantalla: Historias 5 (0 A · 2 M · 3 B) · Observatorio 18 (2 A · 7 M · 9 B) · Simulador 11 (1 A · 4 M · 6 B) · Sistema compartido 21 (1 A · 8 M · 12 B). Un hallazgo que cita varios archivos con el mismo problema cuenta una vez.
