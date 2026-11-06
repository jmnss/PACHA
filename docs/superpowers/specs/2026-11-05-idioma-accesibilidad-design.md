# Idioma (español, inglés, kichwa) y accesibilidad — Diseño

Fecha: 2026-11-05 · Rama: `migracion-react` · Estado: aprobado en conversación, pendiente de revisión escrita.

## 1. Propósito

`docs/challenge.md` pide que los datos de NISAR sean **accesibles a un público amplio**. Esta
actualización hace la app **pluricultural** (español, inglés y kichwa) y la acerca a **WCAG 2.2 AA**, el
nivel con mejor relación calidad-esfuerzo: cubre contraste, teclado, foco, lectores de pantalla, zoom y
movimiento sin el coste del nivel AAA.

### Decisiones del equipo (no se reabren)

| Tema | Decisión |
|---|---|
| Idiomas | Español (`es`, fuente de verdad), inglés (`en`), kichwa (`qu`) |
| Variedad de kichwa | **Kichwa unificado** (norma escrita de la educación intercultural bilingüe de Ecuador) |
| Kichwa sin validar | Se muestra un **borrador** con aviso visible «Traducción en revisión por hablantes»; lo validan hablantes locales |
| Cambio de idioma | Selector visible siempre; cambio **en tiempo real**, sin recargar ni repetir peticiones; **no va en la URL** |
| Persistencia | `localStorage`; primera visita: `navigator.languages`; si no coincide, `es` |
| Texto de la API | Enfoque **A** (el frontend traduce todo con claves estables) en el **orden C** (primero el frontend, después las claves de la API, dentro del mismo plan) |
| Biblioteca | **Ninguna**: proveedor propio + `useT()` + `Intl` |
| Accesibilidad | WCAG 2.2 AA; medida con axe en Playwright + lista manual corta |
| Fuera de alcance | Tamaño de letra y alto contraste propios, nivel AAA, traducción de `/_sistema`, de la app Streamlit y de los documentos de `docs/` (salvo la guía para hablantes) |

### Criterios de éxito

1. Las seis pantallas públicas (`/`, `/observatorio`, `/simulador`, `/laboratorio`, `/recorrido`,
   `/fundamentos`) se leen enteras en los tres idiomas; ningún texto visible queda en español con `en`
   activo, salvo nombres propios, unidades y siglas (§4.6) y texto del proveedor real sin clave (§3).
2. Cambiar de idioma con una simulación cargada no dispara peticiones nuevas y conserva el estado.
3. axe (WCAG 2.2 A y AA) da **0 infracciones `serious` o `critical`** en las 6 rutas × 3 idiomas × 2 anchos.
4. La banda de demostración, los sellos de origen y «pendiente de confirmar» están en los tres idiomas.
5. Pruebas, lint, build y revisión visual en verde (`CLAUDE.md`).

## 2. Arquitectura del idioma (`frontend/src/idioma/`)

| Archivo | Responsabilidad |
|---|---|
| `idiomas.ts` | `IDIOMAS`: `es` (Español, `lang="es"`), `en` (English, `lang="en"`), `qu` (Kichwa, `lang="qu-EC"`, código **pendiente de confirmar con los hablantes**). Tipo `CodigoIdioma = 'es' \| 'en' \| 'qu'`. `IDIOMA_POR_DEFECTO = 'es'`. |
| `catalogos/es.ts` | Catálogo **plano**: `export const es = { 'riel.historias': 'Historias', … } as const`. Define `type Clave = keyof typeof es`. |
| `catalogos/en.ts`, `catalogos/qu.ts` | `export const en: Record<Clave, string> = { … }`. Si falta o sobra una clave, `tsc` falla. |
| `catalogos/validadas.ts` | `export const VALIDADAS_QU: ReadonlySet<Clave>`: claves del kichwa que los hablantes ya revisaron (empieza vacío). |
| `interpolar.ts` | Funciones puras: sustituye `{nombre}` por valores; elige la forma de plural. |
| `formato.ts` | `formatoNumero(idioma, n, opciones)` y `formatoFecha(idioma, fecha, estilo)`. `es` → `es-EC`, `en` → `en`, `qu` → números `es-EC` y nombres de meses y días desde el catálogo (`fecha.mes.1` … `fecha.mes.12`, `fecha.dia.1` … `fecha.dia.7`). El `Intl` de `qu` es quechua de CLDR, no kichwa unificado: no se usa para palabras. |
| `ProveedorIdioma.tsx` | Contexto con `idioma`, `cambiarIdioma`. Lee y escribe `localStorage['nisar.idioma']` dentro de `try/catch`; elige el inicial según el orden de la tabla de decisiones; actualiza `document.documentElement.lang`. |
| `useT.ts` | `const { t, idioma, formatoNumero, formatoFecha, textoApi } = useT()`. |
| `SelectorIdioma.tsx` | Botón que abre un grupo de tres botones de radio (`<fieldset>` + `<input type="radio">` nativos), cada nombre con su propio `lang`. |
| `AvisoTraduccion.tsx` | Con `qu` activo: «Traducción en revisión por hablantes · N de M textos validados» (texto en kichwa + español). |

### 2.1 Reglas de `t()`

- `t(clave, valores?)` busca en el catálogo activo; si la entrada está vacía o falta (posible solo en el
  contenido largo), usa `es` y devuelve el texto marcado para envolverse con `lang="es"`.
- Interpolación: `{nombre}`; los números se formatean con `formatoNumero` del idioma activo.
- Plurales: claves con sufijo `.uno` y `.otros`; la forma se elige con `Intl.PluralRules` en `es` y `en`.
  En `qu` se usa siempre `.otros` (regla **pendiente de confirmar con los hablantes**).
- Nunca se muestra una clave en crudo ni un hueco.

### 2.2 Contenido largo

Historias, Fundamentos y el guion del Recorrido pasan a un módulo por idioma con el tipo que ya existe:
`pantallas/historias/contenido/{inundacion,incendio}.{es,en,qu}.ts` (tipo de `contenido/tipos.ts`),
`pantallas/fundamentos/contenido.{es,en,qu}.ts` y `pantallas/recorrido/guion.{es,en,qu}.ts`. El `index.ts`
de cada uno elige por idioma. Un texto largo se traduce entero, no por fragmentos.

### 2.3 Lugar del selector

- Escritorio y tablet: al pie del riel (`diseno/Estructura.tsx`), icono de globo + código («ES», «EN», «QU»).
- Móvil (< 700 px): séptimo elemento de la barra inferior, mismo icono + código.
- Modo incrustado (`?incrustado=1`, dentro del recorrido): sin selector; la pantalla incrustada hereda el
  idioma por `localStorage` (mismo origen). El recorrido escucha el evento `storage` para que el iframe
  siga al idioma de la página que lo contiene.
- El icono de globo se añade a `diseno/iconos.tsx` con el estilo de los existentes.

### 2.4 Cambio en tiempo real

El idioma vive solo en el contexto; las claves de TanStack Query **no** incluyen el idioma. Cambiar de
idioma vuelve a renderizar, no desmonta rutas ni repite peticiones.

### 2.5 Honestidad en los tres idiomas

- La banda «DATOS DE DEMOSTRACIÓN» se traduce y sigue sin poder cerrarse.
- Los sellos de origen (`SelloOrigen`) y las notas «pendiente de confirmar con la documentación oficial»
  existen en los tres catálogos.
- Exportaciones: encabezados del CSV y franja del PNG en el idioma activo. Las líneas de máquina
  `# origen: sintético` (y demás metadatos `# clave: valor`) **se quedan en español** y se añade una línea
  `# idioma: <código>`. Las pruebas existentes de exportación siguen pasando sin cambios.

## 3. Textos de la API

Principio: la API sigue mandando el texto en español (el contrato solo crece). Añade lo necesario para
que el frontend traduzca.

| Tipo de texto | Ejemplos | Cómo se traduce |
|---|---|---|
| 1. Con identificador existente | tipos de cambio, controles, opciones, categorías, herramientas y parámetros del simulador, escenarios | El frontend usa claves derivadas: `api.tipo.<id>.nombre`, `api.control.<id>.etiqueta`, `api.opcion.<control>.<valor>`, `api.categoria.<variable>.<codigo>`, `api.escenario.<id>.sitio`, etc. Sin cambios en la API. |
| 2. Fijo sin identificador | métricas y leyendas del laboratorio, notas, títulos de paneles | La API añade el campo opcional `clave: str \| None` junto al texto. |
| 3. Frase con valores | lecturas de impacto, métricas con cifras, errores 422/404 | La API añade `clave` y `valores: dict[str, float \| int \| str] \| None`. Los errores responden `{"mensaje", "clave", "valores"}` (`mensaje` se queda). `EntradaNoValida` y `NoEncontrado` aceptan `clave=` y `valores=` opcionales. |
| 4. Texto de `modelo/` | descripciones y notas del modelo heredado | El puente en `datos/` asigna la clave por el `id` del escenario o del tipo. `modelo/` no se toca. |

Regla del frontend (`textoApi(texto, clave?, valores?)`): si la clave existe en el catálogo activo, se
traduce; si no, se muestra el texto en español con `lang="es"` y el indicador discreto «sin traducir»
(traducido). El proveedor real puede no emitir claves: cae en esta regla.

Control de calidad:
- `scripts/exportar_claves_api.py` escribe `api/claves.json`: lista ordenada de `{clave, es}` con las claves
  estáticas (registro en `datos/claves.py`) y las derivadas de las enumeraciones del proveedor demo y del
  catálogo del simulador.
- pytest: el `claves.json` versionado coincide con el regenerado (como el contrato OpenAPI) y toda clave
  emitida en las respuestas de las pruebas está en él.
- vitest: cada clave de `api/claves.json` existe en los tres catálogos.

## 4. Accesibilidad (WCAG 2.2 AA)

Línea base comprobada: lienzos con `role="img"` y nombre; `:focus-visible` global
(`diseno/componentes.css`); 19 regiones `aria-live`/`status`/`alert`; «menos movimiento» en
`usePlayback`, `VistaMapa`, `useMovil` y CSS. Faltan: enlace para saltar, `<title>` por ruta, contraste de
`--muted` fuera de `--surface`, auditoría automática.

1. **Medición:** dependencia de desarrollo `@axe-core/playwright`; `e2e/accesibilidad.spec.ts` recorre las 6
   rutas × 3 idiomas × 1440 y 390 con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
   `wcag22aa`. Primero se registra la línea base en `INFORME.md`; al terminar, 0 `serious`/`critical`.
2. **Idioma para lectores de pantalla:** `<html lang>` sigue al idioma; todo texto que cae al español lleva
   `lang="es"`.
3. **Orientación:** enlace «Saltar al contenido» (primer elemento enfocable) hacia `<main id="contenido">`;
   `document.title` por ruta e idioma («<Pantalla> · NISAR Ecuador»); un solo `h1` por pantalla y
   encabezados sin saltos; al navegar, el foco va al `h1` (con `tabIndex={-1}`).
4. **Contraste:** `diseno/contraste.test.ts` calcula el contraste de cada par texto/fondo de `tokens.css`
   (texto ≥ 4,5:1; bordes de control y foco ≥ 3:1). Lo que no cumpla se ajusta en `tokens.css` y en
   `docs/diseno.md` a la vez. Ninguna información solo por color.
5. **Teclado y foco:** todo operable con teclado; el foco nunca queda tapado por la banda ni la barra móvil
   (`scroll-padding`); las hojas y diálogos atrapan el foco y lo devuelven al cerrar; objetivos ≥ 24×24 px.
6. **Movimiento:** «menos movimiento» también en simulador, recorrido y laboratorio; toda animación
   automática tiene pausa.
7. **Mapa y lienzos:** cada lienzo tiene, además del nombre, un resumen textual visible o enlazado (qué
   muestra, fecha, valor medio). El mapa MapLibre se declara con un texto que remite al panel de métricas y a
   la tabla, donde están las mismas cifras.
8. **Tabla móvil:** recupera la semántica (`role="table"`, `row`, `cell`, `columnheader`) cuando el CSS la
   pone en bloque.

### 4.6 Lo que no se traduce

Nombres propios de lugares, unidades (km², dB, %), siglas técnicas (HH, HV, VV, SAR, NISAR) —que explica
`Termino`— y los valores de máquina de las exportaciones.

### 4.7 Prueba manual (una vez, al cerrar)

Recorrer las seis pantallas solo con teclado; una pasada con lector de pantalla (NVDA o Orca) por
Historias y Observatorio en los tres idiomas; zoom al 200 % y 400 % (reflujo a 320 px CSS) sin pérdida de
contenido. Resultado en `INFORME.md`.

## 5. Kichwa: borrador y validación

- Claude redacta el borrador en kichwa unificado. Términos técnicos sin equivalente asentado se dejan en
  español con su explicación y se listan en la guía; **no se inventan neologismos**.
- `scripts/traducciones_csv.mjs exportar` genera `docs/traduccion-kichwa.csv` (`clave, es, en, qu,
  validada`) para revisar en una hoja de cálculo; `importar` devuelve los cambios a `catalogos/qu.ts` y
  `validadas.ts`. El contenido largo se revisa en sus módulos `.qu.ts` (la guía explica cómo).
- `docs/guia-traduccion-kichwa.md`: para los hablantes; qué revisar, cómo marcar validado, lista de
  términos técnicos dejados en español y dudas abiertas (código de idioma, plurales, nombres de meses).
- El aviso de §2 desaparece cuando todas las claves están en `VALIDADAS_QU` y el contenido largo está
  marcado validado.

## 6. Pruebas

| Capa | Qué se prueba |
|---|---|
| vitest · idioma | elección inicial (localStorage → navigator → es); `localStorage` que lanza; `t()` interpola, plurales, caída a `es` con `lang`; selector cambia el texto sin desmontar (el estado de un componente hijo se conserva); `document.documentElement.lang` |
| vitest · catálogos | mismas claves en los tres; ningún valor vacío; mismas variables `{x}` por clave; cada clave de `api/claves.json` existe; recuento de borradores del kichwa |
| vitest · honestidad | banda, sello de origen y «pendiente de confirmar» en los tres idiomas; CSV conserva `# origen: sintético` y añade `# idioma:` |
| vitest · contraste | §4.4 |
| pytest | `claves.json` al día; claves emitidas registradas; errores con `clave`; `mensaje` en español intacto |
| Playwright | cambio de idioma en el Observatorio con simulación cargada sin peticiones nuevas a `/api/`; idioma tras recargar; axe §4.1; las e2e existentes siguen en verde (fijan `es`) |
| Visual | `revision_visual.sh` de cada pantalla en `en` y `qu` a 1440/768/390 (el script acepta el idioma) |

## 7. Orden de trabajo

Cada bloque deja la app funcionando y cada tarea es un commit.

1. **Base del idioma:** `idioma/`, proveedor en `main.tsx`, `useT`, selector en el riel y la barra móvil,
   aviso del kichwa, globo en `iconos.tsx`, `docs/diseno.md` con el selector.
2. **Estructura común:** banda, riel, cabeceras, estados y errores, `Termino`, `SelloOrigen`, leyendas,
   gráficos, reproductor, comparador, exportaciones.
3. **Pantallas, una por tarea:** Historias; Observatorio (mapa, comparar, serie, simulación, impacto,
   contexto); Simulador; Laboratorio; Recorrido; Fundamentos.
4. **Claves de la API:** `datos/claves.py`, `clave`/`valores` en contrato, excepciones y respuestas,
   `claves.json`, pruebas; frontend con `textoApi`.
5. **Accesibilidad:** axe y línea base; luego orientación, contraste, teclado y foco, movimiento, lienzos,
   tabla.
6. **Cierre:** e2e de idioma, revisión visual en tres idiomas, guía y CSV para hablantes, prueba manual,
   `INFORME.md`, README y guion.

El inglés y el kichwa se escriben dentro de cada tarea (nunca una clave en `es` sin sus pares).

## 8. Reglas de ejecución

- Un commit por tarea; pruebas y build en verde antes de seguir (`CLAUDE.md`).
- `modelo/`, `app.py`, `interfaz/` y `main` no se tocan.
- Ningún texto nuevo presenta datos sintéticos como reales en ningún idioma; lo «pendiente de confirmar»
  se traduce con el mismo peso.
- Términos técnicos en inglés: uso estándar de teledetección (backscatter, polarization, speckle).
- Las pruebas e2e existentes fijan `localStorage['nisar.idioma']='es'` para no depender del navegador.
- Colores y tamaños del selector y del aviso salen de `tokens.css`; Taste Skill por el camino de apps.

## 9. Ajustes al escribir el plan (2026-11-05)

Precisiones técnicas que no cambian las decisiones del equipo:

1. **Catálogos por área:** en lugar de un archivo por idioma, una carpeta por idioma con un archivo por área
   (`catalogos/es/comun.ts`, `catalogos/en/comun.ts`, …) y un `index.ts` que los une. El tipo de cada área
   inglesa y kichwa es `Record<keyof typeof <área es>, string>`: sigue fallando el build si falta una clave.
2. **Sin caída en tiempo de ejecución para el catálogo:** las pruebas exigen que los tres catálogos estén
   completos y sin valores vacíos, así que `t()` siempre encuentra su texto. La caída al español con
   `lang="es"` queda solo para el texto de la API (componente `TextoApi`).
3. **Nombres de campo:** `clave_texto` y `valores_texto` (en lugar de `clave` y `valores`), porque
   `CapaEventoDto` ya tiene un campo `clave` con otro significado. Los errores responden
   `{"mensaje", "clave_texto", "valores_texto"}`.
4. **Parámetro de arranque `?idioma=xx`:** opcional; si es válido se aplica una vez, se guarda en
   `localStorage` y se borra de la URL. Lo usa `revision_visual.sh` (el inspector no puede fijar el idioma
   del navegador); el idioma sigue sin viajar en la URL como estado.
5. **Simulador:** los títulos de evento se reconstruyen en `datos/simulador.py` con clave; las etiquetas de
   métricas y los nombres de capas llevan clave derivada de su texto. Las **notas y celdas de tabla que
   escribe `modelo/desastres.py` con cifras incrustadas** se quedan en español con `lang="es"` (excepción al
   criterio de éxito 1, porque `modelo/` no se toca).
6. **Playwright** fija `locale: 'es-EC'` en la configuración para que las e2e existentes sigan en español.
