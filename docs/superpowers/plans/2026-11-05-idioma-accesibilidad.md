# Idioma (es, en, kichwa) y accesibilidad — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que las seis pantallas públicas se lean en español, inglés y kichwa con cambio instantáneo, y
que cumplan WCAG 2.2 AA (0 infracciones axe `serious`/`critical`).

**Architecture:** el frontend traduce todo con catálogos TypeScript tipados (sin biblioteca) y un
contexto `ProveedorIdioma`; la API sigue mandando español y añade `clave_texto`/`valores_texto` para que
el frontend traduzca su texto. Primero el texto propio del frontend (bloques 1–3), después las claves de la
API (bloque 4), después accesibilidad (bloque 5) y cierre (bloque 6).

**Tech Stack:** React 18 + Vite + TypeScript estricto, vitest + Testing Library, Playwright,
`@axe-core/playwright` (nuevo, dev), FastAPI + pydantic v2, pytest.

**Spec:** `docs/superpowers/specs/2026-11-05-idioma-accesibilidad-design.md` (léelo entero, incluida la
§9 «Ajustes al escribir el plan», antes de la primera tarea).

## Global Constraints

- Leer `CLAUDE.md` del repo. En cada shell: `source scripts/entorno.sh` primero.
- Idiomas: `es` (fuente de verdad, `lang="es"`), `en` (`lang="en"`), `qu` (Kichwa unificado, `lang="qu-EC"`).
- Clave de almacenamiento: `localStorage['nisar.idioma']`; siempre dentro de `try/catch`.
- Orden del idioma inicial: `?idioma=` válido → `localStorage` → primer `navigator.languages` cuyo prefijo sea `es`/`en`/`qu` → `es`.
- Las claves de TanStack Query **nunca** incluyen el idioma.
- Sin biblioteca de i18n. Única dependencia nueva: `@axe-core/playwright` (devDependency).
- No tocar `modelo/`, `app.py`, `interfaz/`, la rama `main`; sin `git push`.
- Un commit por tarea con el mensaje indicado y el pie `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Honestidad: la banda «DATOS DE DEMOSTRACIÓN», los sellos de origen y «pendiente de confirmar con la documentación oficial» existen en los tres idiomas con el mismo peso. Las líneas de máquina del CSV (`# origen: …`, `# fuente: …`) siguen en español.
- No se traducen: nombres propios de lugares, unidades (km², ha, dB, %, m, h), siglas (HH, HV, VV, VH, SAR, NISAR, NASA, ISRO, ASF).
- Inglés técnico estándar de teledetección (backscatter, polarization, speckle, wetland, burn scar).
- Kichwa: borrador en kichwa unificado; término técnico sin equivalente asentado → se deja en español y se añade a `docs/guia-traduccion-kichwa.md` (se crea en la Tarea 3, se completa en cada tarea). **No inventar neologismos.**
- Colores y tamaños solo desde `frontend/src/diseno/tokens.css`. `/_sistema` (Galeria) no se traduce.

### Verificación estándar

- **VF** (tareas de frontend): `cd frontend && npm run build && npm test && npm run lint` → todo verde.
- **VP** (tareas de Python): `python -m pytest tests -q` → `0 failed`; y `python -m unittest modelo.clima modelo.desastres` → `OK`.
- **VE** (cuando la tarea lo pida): `cd frontend && VITE_MAPA_REMOTO=0 npm run build && npx playwright test` → todo `passed`; al terminar, `npm run build` (sin la variable) para dejar `dist` normal.
- **VV <ruta> <nombre>** (revisión visual): `bash scripts/revision_visual.sh <ruta> <nombre>` → `RESULT: 0 FAIL` (desde la Tarea 26 acepta un tercer argumento de idioma). Máximo tres rondas; lo pendiente va a `INFORME.md`.

### Procedimiento de extracción (Tareas 4–15)

Para cada archivo listado en la tarea:
1. Todo texto visible o leído por un lector de pantalla (`aria-label`, `title`, `alt`, `placeholder`, texto de botones, encabezados de columnas CSV) pasa a una clave del área de la tarea. Formato de clave: `<área>.<componente>.<qué>` en minúsculas y `_` (p. ej. `obs.mapa.ver_todo`).
2. El valor en `catalogos/es/<área>.ts` es **el texto actual, idéntico** (las pruebas existentes buscan esos textos).
3. Escribir el valor en `catalogos/en/<área>.ts` y el borrador en `catalogos/qu/<área>.ts`.
4. Las cifras se interpolan (`{n}`) y se formatean con `formatoNumero`/`formatoFecha` de `useT()`; nunca concatenar fragmentos traducidos.
5. Texto que viene de la API: se envuelve con `<TextoApi texto={…} />` (Tarea 2). En el bloque 4 recibirá su clave.
6. Funciones puras que producen texto (no hooks) reciben `t: T` como último parámetro con valor por defecto `traductor('es')`, para no romper a quien ya las llama.
7. Prueba de la tarea: `renderPseudo(<Pantalla …/>)` y `expect(textosSinTraducir(container)).toEqual([])` (Tarea 2), con los mismos mocks/fixtures que ya usan las pruebas de esa pantalla.

## Review Focus

1. `localStorage` que lanza (modo privado, sitio bloqueado) → la app arranca en el idioma del navegador o `es` y el selector sigue cambiando el idioma en memoria. Prueba en la Tarea 2.
2. Cambiar de idioma con una simulación o reproducción en curso → no se repite ninguna petición y no se pierde el estado. Prueba unitaria en la Tarea 2 y e2e en la Tarea 26.
3. Una `clave_texto` que el catálogo no conoce (proveedor real, clave nueva) → se ve el `mensaje`/texto en español con `lang="es"`, nunca la clave en crudo. Prueba en las Tareas 2 y 19.
4. Una plantilla con `{x}` sin valor → se muestra `—` en su lugar, sin romper. Prueba en la Tarea 1.
5. Textos en kichwa más largos que en español desbordando a 390 px (riel corto, banda, botones) → revisión visual en `qu` de cada pantalla (Tarea 26) y prueba de etiquetas cortas del riel (Tarea 3).

## Mapa de archivos

```
frontend/src/idioma/
  idiomas.ts            CodigoIdioma, IDIOMAS, esCodigoIdioma
  interpolar.ts         interpolar, formaPlural
  formato.ts            formatoNumero, formatoFecha
  traductor.ts          T, Tn, traductor, Catalogo, Clave, ClavePlural
  catalogos/{es,en,qu}/<área>.ts + index.ts
  catalogos/validadas.ts VALIDADAS_QU
  ProveedorIdioma.tsx   contexto + arranque + <html lang>
  useT.ts               hook
  TextoApi.tsx          texto de la API con caída a es
  SelectorIdioma.tsx    selector
  AvisoTraduccion.tsx   aviso del kichwa
  pruebas.tsx           renderConIdioma, renderPseudo, textosSinTraducir (solo pruebas)
  clavesApi.ts          claves derivadas de ids de la API (Tarea 19)
frontend/src/estado/useMenosMovimiento.ts    (Tarea 24)
frontend/src/estado/useTituloPagina.ts       (Tarea 21)
frontend/src/diseno/contraste.ts + contraste.test.ts (Tarea 22)
frontend/e2e/idioma.spec.ts, frontend/e2e/accesibilidad.spec.ts
datos/claves.py         REGISTRO, texto(), slug()
api/claves.json         generado
scripts/exportar_claves_api.py, scripts/traducciones_csv.mjs
docs/guia-traduccion-kichwa.md, docs/traduccion-kichwa.csv
```

Áreas del catálogo (un archivo por área y por idioma): `comun`, `idioma`, `fecha`, `estructura`,
`origen`, `piezas` (gráficos, tiempo, comparador, mapa), `exportar`, `historias`, `observatorio`,
`simulador`, `laboratorio`, `recorrido`, `fundamentos`, `titulos`, `a11y`, `api`.

---

## Bloque 1 — Base del idioma

### Task 1: Núcleo puro del idioma

**Files:**
- Create: `frontend/src/idioma/idiomas.ts`, `interpolar.ts`, `formato.ts`, `traductor.ts`
- Create: `frontend/src/idioma/catalogos/{es,en,qu}/{comun,idioma,fecha}.ts`, `catalogos/{es,en,qu}/index.ts`, `catalogos/validadas.ts`
- Test: `frontend/src/idioma/nucleo.test.ts`, `frontend/src/idioma/catalogos.test.ts`

**Interfaces:**
- Produces:
  - `type CodigoIdioma = 'es' | 'en' | 'qu'`; `IDIOMAS: readonly { codigo: CodigoIdioma; nombre: string; lang: string; corto: string }[]` con `{es,'Español','es','ES'}`, `{en,'English','en','EN'}`, `{qu,'Kichwa','qu-EC','QU'}`; `IDIOMA_POR_DEFECTO: CodigoIdioma = 'es'`; `esCodigoIdioma(x: unknown): x is CodigoIdioma`; `langDe(c: CodigoIdioma): string`.
  - `type Valores = Record<string, string | number>`; `interpolar(plantilla: string, valores?: Valores, num?: (n: number) => string): string`; `formaPlural(idioma: CodigoIdioma, n: number): 'uno' | 'otros'`.
  - `formatoNumero(idioma: CodigoIdioma, n: number, op?: Intl.NumberFormatOptions): string`; `formatoFecha(idioma: CodigoIdioma, fecha: Date | string, estilo: 'larga' | 'mes-anio' | 'corta', t: T): string`.
  - `type Catalogo = typeof es` (unión de áreas); `type Clave = keyof Catalogo`; `type ClavePlural` = bases `B` tales que existen `B.uno` y `B.otros`; `type T = (clave: Clave, valores?: Valores) => string`; `type Tn = (base: ClavePlural, n: number, valores?: Valores) => string`; `traductor(idioma: CodigoIdioma, catalogos?: Partial<Record<CodigoIdioma, Catalogo>>): { t: T; tn: Tn }`.
  - `VALIDADAS_QU: ReadonlySet<Clave>` (vacío) y `CONTENIDO_LARGO_QU_VALIDADO = false` en `catalogos/validadas.ts`.

- [ ] **Step 1: Escribir las pruebas que fallan** (`nucleo.test.ts`)

```ts
expect(interpolar('Hay {n} capas de {total}', { n: 2, total: 6 })).toBe('Hay 2 capas de 6')
expect(interpolar('Hola {nombre}', {})).toBe('Hola —')            // Review Focus 4
expect(interpolar('{n} ha', { n: 1234.5 }, (n) => formatoNumero('es', n))).toBe('1234,5 ha') // es-EC
expect(formaPlural('es', 1)).toBe('uno'); expect(formaPlural('en', 2)).toBe('otros')
expect(formaPlural('qu', 1)).toBe('otros')                        // regla pendiente de confirmar
expect(formatoNumero('qu', 1234.5)).toBe(formatoNumero('es', 1234.5))
const { t } = traductor('qu'); expect(formatoFecha('qu', '2026-01-05', 'larga', t)).toContain(t('fecha.mes.1'))
expect(formatoFecha('es', '2026-01-05', 'corta', traductor('es').t)).toBe('2026-01-05')
expect(traductor('en').t('comun.cerrar')).toBe('Close')
expect(traductor('es').tn('comun.capas', 1)).toBe('1 capa')
expect(traductor('es').tn('comun.capas', 3)).toBe('3 capas')
expect(esCodigoIdioma('qu')).toBe(true); expect(esCodigoIdioma('fr')).toBe(false)
```

`catalogos.test.ts` (recorre `es`, `en`, `qu` de `catalogos/*/index.ts`):
- mismas claves en los tres (`Object.keys` ordenadas iguales);
- ningún valor vacío ni solo espacios;
- por cada clave, el conjunto de variables `/\{(\w+)\}/g` es igual en los tres idiomas;
- toda clave de `VALIDADAS_QU` existe;
- registra (`console.info`) cuántas claves `qu` siguen en borrador (`total − VALIDADAS_QU.size`).

- [ ] **Step 2: Correr y ver que falla**

Run: `cd frontend && npx vitest run src/idioma` → FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

- `formatoNumero`: `Intl.NumberFormat(idioma === 'en' ? 'en' : 'es-EC', op)`.
- `formatoFecha`: `'corta'` → `YYYY-MM-DD` (los sellos ya usan ISO). `'larga'` y `'mes-anio'`: `es` → `Intl.DateTimeFormat('es-EC', { dateStyle: 'long' })` / `{ month: 'long', year: 'numeric' }`; `en` → igual con `'en'`; `qu` → `` `${día} ${t(`fecha.mes.${m}`)} ${año}` `` y `` `${t(`fecha.mes.${m}`)} ${año}` `` (fechas `string` se interpretan en UTC).
- Catálogo `fecha`: `fecha.mes.1`…`fecha.mes.12` y `fecha.dia.1`…`fecha.dia.7` (lunes = 1). Catálogo `comun`: al menos `comun.cerrar` (`Cerrar`/`Close`), `comun.capas.uno` (`{n} capa`), `comun.capas.otros` (`{n} capas`), `comun.cargando` (`Cargando…`). Catálogo `idioma`: `idioma.selector.etiqueta` (`Idioma`), `idioma.sin_traducir` (`Texto aún sin traducir; se muestra en español`), `idioma.aviso_qu` (`Traducción en revisión por hablantes · {validadas} de {total} textos validados`).
- `traductor`: `t` busca en el catálogo del idioma y aplica `interpolar` con `formatoNumero` del idioma; `tn` elige `${base}.${formaPlural(idioma, n)}` e interpola `{ n, ...valores }`.
- `en/<área>.ts`: `import type { comun as esComun } from '../es/comun'; export const comun: Record<keyof typeof esComun, string> = { … }`. Igual para `qu`.

- [ ] **Step 4: Correr y ver que pasa** — Run: `cd frontend && npx vitest run src/idioma` → PASS. Luego **VF**.

- [ ] **Step 5: Commit** — `git add frontend/src/idioma && git commit -m "feat(idioma): núcleo de catálogos, interpolación y formatos"`

### Task 2: Proveedor, hook, `TextoApi` y utilidades de prueba

**Files:**
- Create: `frontend/src/idioma/ProveedorIdioma.tsx`, `useT.ts`, `TextoApi.tsx`, `pruebas.tsx`
- Modify: `frontend/src/main.tsx` (`<ProveedorIdioma>` **por fuera** de `<BrowserRouter>`: el parámetro `?idioma=` se lee y se borra con `history.replaceState` en el inicializador de estado, antes de que el router lea la URL)
- Modify: `frontend/playwright.config.ts` (`use: { locale: 'es-EC', … }` en los dos proyectos)
- Test: `frontend/src/idioma/proveedor.test.tsx`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `<ProveedorIdioma inicial?: CodigoIdioma catalogos?: Partial<Record<CodigoIdioma, Catalogo>>>`. Contexto por defecto (sin proveedor): `es`, `cambiarIdioma` sin efecto (así las pruebas existentes no cambian).
  - `useT(): { idioma: CodigoIdioma; cambiarIdioma(c: CodigoIdioma): void; t: T; tn: Tn; formatoNumero(n, op?): string; formatoFecha(f, estilo): string; textoApi(texto: string, clave?: string | null, valores?: Valores | null): { texto: string; traducido: boolean } }`.
  - `<TextoApi texto: string clave?: string | null valores?: Valores | null />`: si `traducido` → el texto; si no → `<span lang="es" title={t('idioma.sin_traducir')}>` (sin `title` cuando el idioma activo es `es`). `textoApi` busca `clave` en el catálogo activo como `Clave`; si no existe → `{ texto, traducido: false }`.
  - `pruebas.tsx`: `renderConIdioma(ui, idioma: CodigoIdioma)`; `renderPseudo(ui)` (idioma `en` con un catálogo donde cada valor es `⟦<valor es>⟧`); `textosSinTraducir(raiz: HTMLElement): string[]`.

- [ ] **Step 1: Escribir las pruebas que fallan** (`proveedor.test.tsx`)

- `localStorage['nisar.idioma']='en'` → `useT().idioma === 'en'` y `document.documentElement.lang === 'en'`.
- Sin almacenamiento y `navigator.languages = ['qu-EC']` → `qu`; `['fr-FR','en-US']` → `en`; `['fr-FR']` → `es`.
- `localStorage.getItem`/`setItem` que lanzan → arranca sin error; `cambiarIdioma('en')` cambia el texto (Review Focus 1).
- URL `?idioma=qu&escenario=x` → idioma `qu`, `localStorage` guarda `qu` y la URL queda `?escenario=x` (`history.replaceState`).
- Un hijo con `useState` contador incrementado a 3: tras `cambiarIdioma('en')` el contador sigue en 3 (no se desmonta; Review Focus 2).
- `<TextoApi texto="Inundación" clave="api.no.existe" />` con `en` → `span[lang="es"]` con texto `Inundación`; nunca aparece `api.no.existe` en el DOM (Review Focus 3).
- `textosSinTraducir` devuelve `['Hola']` para `<p>Hola</p>` y `[]` para `<p>⟦Hola⟧</p>`, `<p lang="es">Hola</p>`, `<p>12,5 km²</p>`, `<p>HV</p>`.

- [ ] **Step 2: Correr y ver que falla** — `cd frontend && npx vitest run src/idioma/proveedor.test.tsx` → FAIL.

- [ ] **Step 3: Implementar**

`textosSinTraducir`: recorre los nodos de texto con `TreeWalker` y descarta los que (a) están vacíos tras `trim`, (b) contienen `⟦`, (c) tienen un ancestro con `lang="es"`, `aria-hidden="true"`, `data-no-traducir` o `data-contenido-largo` (contenido largo por idioma, que se prueba aparte), (d) cumplen
`/^[\d\s.,:;%°+\-−–—·/()×≈<>=±…]*(km²|km|ha|dB|m|h|s|%|px)?[\d\s.,:;%°+\-−–—·/()]*$/` o están en
`SIGLAS = ['HH','HV','VV','VH','SAR','NISAR','NASA','ISRO','ASF','L','S','ES','EN','QU']`, o (e) son nombres propios listados en `NOMBRES_PROPIOS` (export para que cada tarea añada los suyos: `'Ecuador','La Segua','Manabí','Loja', 'NISAR · Ecuador'`). Devuelve los textos restantes. También revisa los atributos `aria-label`, `title`, `alt` y `placeholder` con las mismas reglas.

- [ ] **Step 4: Correr y ver que pasa** — misma orden → PASS; **VF**; **VE** (las e2e siguen en español gracias a `locale: 'es-EC'`).

- [ ] **Step 5: Commit** — `git commit -m "feat(idioma): proveedor, useT, TextoApi y utilidades de prueba"`

### Task 3: Selector de idioma, aviso del kichwa y documentación de diseño

**Files:**
- Create: `frontend/src/idioma/SelectorIdioma.tsx`, `AvisoTraduccion.tsx`, `idioma.css` (importado desde `main.tsx`)
- Create: `docs/guia-traduccion-kichwa.md` (esqueleto: propósito, cómo validar, tabla «Términos dejados en español», «Dudas abiertas»: código `qu-EC`, plurales, nombres de meses)
- Modify: `frontend/src/diseno/iconos.tsx` (añadir `IconoGlobo` con el mismo trazo y tamaño que `IconoLibro`)
- Modify: `frontend/src/diseno/Estructura.tsx` (selector al pie del riel; en móvil, séptimo elemento de la barra inferior; nada en modo incrustado; `<AvisoTraduccion />` justo bajo `<BandaDemostracion />`)
- Modify: `docs/diseno.md` (§7 navegación: el selector; §8: el aviso del kichwa junto a la banda)
- Test: `frontend/src/idioma/selector.test.tsx`

**Interfaces:**
- Consumes: `useT`, `IDIOMAS`, `VALIDADAS_QU`.
- Produces: `<SelectorIdioma />` (sin props), `<AvisoTraduccion />` (sin props).

- [ ] **Step 1: Escribir las pruebas que fallan**

- El botón tiene nombre accesible `t('idioma.selector.etiqueta')` + código activo (p. ej. «Idioma: ES»), `aria-expanded` y `aria-controls`.
- Al abrir: `role="group"` (fieldset con `legend`) con tres `radio` nativos; cada `label` lleva el `lang` de su idioma (`lang="qu-EC"` en «Kichwa»); el activo está `checked`.
- Elegir «English» cierra el panel, devuelve el foco al botón y cambia `document.documentElement.lang` a `en`. Escape cierra y devuelve el foco.
- `AvisoTraduccion` no se ve con `es` ni `en`, ni con `qu` cuando todas las claves están en `VALIDADAS_QU` y `CONTENIDO_LARGO_QU_VALIDADO` es `true` (probar con un catálogo pequeño inyectado); en otro caso, con `qu` muestra el texto de `idioma.aviso_qu` con `{validadas}` = `VALIDADAS_QU.size` y `{total}` = número de claves.
- `Estructura` con `?incrustado=1` no muestra el selector.
- Review Focus 5: el texto `corto` del selector y las `etiquetaCorta` del riel en `qu` tienen como máximo 7 caracteres (prueba sobre el catálogo `qu/estructura` una vez exista en la Tarea 4; en esta tarea, solo sobre `IDIOMAS[].corto`).

- [ ] **Step 2: Correr y ver que falla.**
- [ ] **Step 3: Implementar.** Seguir `docs/diseno.md` y Taste Skill por el camino de apps (`lint.mjs --app`, `inspect.mjs --app`). El panel se cierra con un clic fuera (mismo patrón que `BandaDemostracion`). El aviso usa `--demo-bg`/`--demo-ink` con borde `--demo-edge` y el mismo margen que la banda.
- [ ] **Step 4: Verificar** — vitest PASS; **VF**; **VV / historias-selector**; **VE**.
- [ ] **Step 5: Commit** — `git commit -m "feat(idioma): selector en el riel y aviso del borrador en kichwa"`

## Bloque 2 — Estructura común (Procedimiento de extracción)

### Task 4: Estructura, banda y estados

**Files:** Modify `frontend/src/diseno/{Estructura,BandaDemostracion,CabeceraPantalla,Estados,LimiteError,HojaInferior,Tarjeta,FranjaKpi,Pestanas,Campo,Deslizador,Selector,Interruptor,Boton,Tabla}.tsx` y `frontend/src/App.tsx` (fallback «Cargando…» y página no encontrada). Create `catalogos/{es,en,qu}/estructura.ts`. Test: `frontend/src/diseno/estructura-idioma.test.tsx`.

**Interfaces:** Consumes `useT`, `renderPseudo`, `textosSinTraducir`. Produces claves `estructura.*` (p. ej. `estructura.riel.historias`, `estructura.riel.historias_corto`, `estructura.banda.largo`, `estructura.banda.corto`, `estructura.banda.que_significa`).

- [ ] **Step 1:** Prueba: `renderPseudo` de `Estructura` (con `MemoryRouter` y `QueryClientProvider` como en `sistema.test.tsx`), de la banda abierta y de `Cargando`/`ErrorEstado` → `textosSinTraducir` = `[]`. Prueba de honestidad: con `es`, `en` y `qu` la banda existe, no tiene botón de cerrar y su texto es `t('estructura.banda.largo')` del idioma. Ampliar la prueba de la Tarea 3: `etiquetaCorta` del riel en `qu` ≤ 7 caracteres.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Extraer. `DESTINOS` guarda claves, no textos (`etiqueta: Clave`). El panel de la banda formatea la fecha con `formatoFecha(…, 'corta')`.
- [ ] **Step 4:** vitest PASS; **VF**.
- [ ] **Step 5:** `git commit -m "feat(idioma): estructura, banda de demostración y estados traducidos"`

### Task 5: Origen, sellos, notas del modelo y leyendas

**Files:** Modify `frontend/src/diseno/{origen.ts,SelloOrigen.tsx,NotasModelo.tsx,notasModelo.ts,Leyenda.tsx,Termino.tsx,rampas.ts}`. Create `catalogos/{es,en,qu}/origen.ts`. Test: `frontend/src/diseno/origen-idioma.test.tsx`.

**Interfaces:** Produces `textoSello(o: Origen | null | undefined, t: T = traductor('es').t): string` (misma salida que hoy con `es`). Las etiquetas de rampas/categorías que hoy son texto pasan a `Clave` y se resuelven en `Leyenda` con `t`.

- [ ] **Step 1:** Pruebas: `textoSello(origenDemo)` sin `t` devuelve exactamente lo de hoy (copiar el valor esperado de la prueba existente); con `traductor('en').t` empieza por `Synthetic`; con `qu` no contiene `Sintético` salvo que el valor `qu` lo deje en español a propósito. `NotasModelo` muestra «pendiente de confirmar con la documentación oficial» en los tres idiomas (`t('origen.pendiente_confirmar')`). `renderPseudo` de `SelloOrigen`, `Leyenda` y `Termino` abierto → `[]`.
- [ ] **Step 2:** FAIL. **Step 3:** Extraer. **Step 4:** PASS; **VF**.
- [ ] **Step 5:** `git commit -m "feat(idioma): origen, sellos, notas y leyendas traducidos"`

### Task 6: Piezas: gráficos, tiempo, comparador y mapa

**Files:** Modify los `.tsx`/`.ts` con texto en `frontend/src/{graficos,tiempo,comparador,mapa}/` (`grep -rlE "['\"][A-ZÁÉÍÓÚ¿¡][a-záéíóúñ]+ " <carpeta> --include=*.ts*` lista los candidatos; ignorar `*.test.*`). Sustituir cada `toLocale*`/`Intl.*` de esas carpetas por `formatoNumero`/`formatoFecha`. Create `catalogos/{es,en,qu}/piezas.ts`. Test: `frontend/src/comparador/piezas-idioma.test.tsx`.

**Interfaces:** Produces claves `piezas.grafico.*`, `piezas.tiempo.*`, `piezas.comparador.*`, `piezas.mapa.*`. Las funciones puras de esas carpetas que devuelven texto reciben `t: T` (regla 6).

- [ ] **Step 1:** `renderPseudo` de `Comparador`, `CintaPasadas`/reproductor, `Linea`, `Barras` y `Localizador` con sus props de prueba actuales → `[]`. El deslizador del comparador anuncia su valor en inglés con `en` (`aria-valuetext`).
- [ ] **Step 2:** FAIL. **Step 3:** Extraer. **Step 4:** PASS; **VF**; **VE**.
- [ ] **Step 5:** `git commit -m "feat(idioma): gráficos, reproductor, comparador y mapa traducidos"`

### Task 7: Exportaciones y errores del cliente

**Files:** Modify `frontend/src/exportar/{csv.ts,png.ts}`, `frontend/src/api/cliente.ts` (y el `mensajeDeError` compartido: `grep -rn "export function mensajeDeError" frontend/src`). Create `catalogos/{es,en,qu}/exportar.ts`. Test: `frontend/src/exportar/exportar-idioma.test.ts`.

**Interfaces:**
- `lineasOrigen(o, idioma: CodigoIdioma = 'es'): string[]`: las seis líneas de hoy **idénticas y en español**, más `# idioma: <código>` como última línea (después de `# producto` si existe).
- `aCsv(filas, columnas, origen, idioma: CodigoIdioma = 'es')`: los **nombres de columna los traduce quien llama**.
- `pixelesFranja(ancho, origen, medir, t: T = traductor('es').t)` y `aPng(lienzo, origen, t = …)`: la franja usa `textoSello(o, t)`.
- `ErrorApi` gana `clave: string | null` y `valores: Valores | null` (los lee de `clave_texto`/`valores_texto` del cuerpo si existen; la API los añade en la Tarea 16). `MENSAJE_RED` y `MENSAJE_GENERICO` pasan a claves `exportar.error.red` / `exportar.error.generico`, y `mensajeDeError(e, t)` devuelve `textoApi(e.mensaje, e.clave, e.valores).texto` o el texto de esas claves.

- [ ] **Step 1:** Pruebas: `aCsv([...], cols, origenDemo, 'qu')` empieza por `# origen: sintético` y contiene `# idioma: qu`; las pruebas existentes de `exportar.test.ts` pasan **sin tocarlas**; la franja PNG con `en` contiene `DEMONSTRATION DATA` (o el valor de `exportar.franja.demo` en `en`); `ErrorApi` con cuerpo `{mensaje:'X', clave_texto:'error.nubes_rango', valores_texto:{min:0,max:100}}` guarda clave y valores.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS; **VF**; **VE** (incluye `exportar.spec.ts`).
- [ ] **Step 5:** `git commit -m "feat(idioma): exportaciones con idioma y errores con clave"`

## Bloque 3 — Pantallas (Procedimiento de extracción)

En cada tarea de este bloque: añadir a `NOMBRES_PROPIOS` los nombres de lugar que use la pantalla; prueba
`renderPseudo` → `[]` de cada vista; las pruebas existentes de la pantalla siguen pasando sin cambios;
**VF**; **VV** de la ruta; **VE**; commit.

### Task 8: Historias

**Files:**
- Split: `frontend/src/pantallas/historias/contenido/{inundacion,incendio}.ts` → `{inundacion,incendio}.{es,en,qu}.ts` (tipo `Historia` de `contenido/tipos.ts`); `contenido/index.ts` exporta `historiasDe(idioma: CodigoIdioma)`.
- Modify: `Historias.tsx`, `Historia.tsx`, `pareja.ts` (si produce texto).
- Create: `catalogos/{es,en,qu}/historias.ts` (texto corto de la interfaz).
- Test: `frontend/src/pantallas/historias/historias-idioma.test.tsx`.

- [ ] **Step 1:** Pruebas: `historiasDe('es')` es igual (`toEqual`) al contenido de hoy; las tres versiones tienen el mismo número de partes, los mismos `id` y las mismas claves de `Termino`; en las tres, la parte de hipótesis contiene la marca de ejemplo ilustrativo y la de aplicaciones futuras la de «pendiente de confirmar» (comprobar con la frase `es` y su traducción `t('origen.pendiente_confirmar')`); el contenedor del contenido largo lleva `data-contenido-largo`; `renderPseudo(<Historias/>)` → `[]`; el contenido largo se prueba con `renderConIdioma(…, 'en')` y `(…, 'qu')` buscando el título de cada versión. Lo mismo en las Tareas 15 (guion y Fundamentos).
- [ ] **Step 2–5:** FAIL → extraer → PASS, **VF**, **VV / historias**, **VE** → `git commit -m "feat(idioma): historias en español, inglés y kichwa"`

### Task 9: Observatorio — estructura, parámetros, contexto y ayuda

**Files:** Modify `pantallas/observatorio/{Observatorio,PanelSimulacion,PanelContexto,AyudaRadar}.tsx`, `parametros.ts`, `useSimulacion.ts` (mensajes). Create `catalogos/{es,en,qu}/observatorio.ts`. Test: `pantallas/observatorio/observatorio-idioma.test.tsx`.

- [ ] **Step 1:** `renderPseudo` del Observatorio con los mocks de `observatorio.test.tsx` en cada pestaña → `[]` en lo propio (el texto de la API ya va en `TextoApi`). `PanelContexto`: las fechas y los meses se formatean con `formatoFecha`; con `qu` el mes es `t('fecha.mes.N')`.
- [ ] **Step 2–5:** FAIL → extraer → PASS, **VF**, **VV /observatorio observatorio-idioma**, **VE** → `git commit -m "feat(idioma): observatorio, parámetros y contexto traducidos"`

### Task 10: Observatorio — mapa, tiempo y métricas

**Files:** Modify `pantallas/observatorio/{VistaMapa,BloqueTiempo,PanelMetricas}.tsx`, `fotogramas.ts`, `useTiempoObservatorio.ts`, `derivados.ts`. Áreas: `observatorio`. Test: añadir casos a `observatorio-idioma.test.tsx`.

- [ ] **Step 1:** `renderPseudo` de `VistaMapa` (con el mock de MapLibre de `observatorio.test.tsx`), `BloqueTiempo` y `PanelMetricas` → `[]`; el aviso «fuera de Ecuador» en `en` y `qu`.
- [ ] **Step 2–5:** FAIL → extraer → PASS, **VF**, **VE** → `git commit -m "feat(idioma): mapa, tiempo y métricas del observatorio traducidos"`

### Task 11: Observatorio — comparar y medir

**Files:** Modify `pantallas/observatorio/{VistaAntesDespues,Mediciones,TablaResultados,CampoFlujo,LienzoCapa}.tsx`, `medicion.ts`, `pngCapa.ts`. Columnas del CSV de medición traducidas por quien llama a `aCsv`, pasando el `idioma`. Test: añadir a `comparar.test.tsx` un caso `renderPseudo` → `[]` y un caso CSV con `en` (cabecera en inglés, primera línea `# origen: sintético`).
- [ ] **Step 1–5:** FAIL → extraer → PASS, **VF**, **VE** → `git commit -m "feat(idioma): comparar y medición traducidos"`

### Task 12: Observatorio — serie e impacto

**Files:** Modify `pantallas/observatorio/{VistaSerie,VistaImpacto}.tsx`, `informeImpacto.ts` (recibe `t` y `idioma`). Test: añadir a `serie.test.tsx` y `impacto.test.ts` casos `renderPseudo` → `[]`; el PNG de impacto en `en` lleva la franja `en` y el aviso de ejemplo ilustrativo en inglés.
- [ ] **Step 1–5:** FAIL → extraer → PASS, **VF**, **VE** → `git commit -m "feat(idioma): serie e impacto traducidos"`

### Task 13: Simulador de eventos

**Files:** Modify `pantallas/simulador/{Simulador,Tablero,PanelHerramienta,PanelMundo,PanelRadar,GemeloRadar,EsperaRadar,ResultadosEvento,Bitacora}.tsx`, `{estadoSimulador,bitacora,informe,valores}.ts`. Create `catalogos/{es,en,qu}/simulador.ts`. La bitácora guardada en `localStorage` guarda datos, no frases: si hoy guarda frases, guardar `{clave, valores}` y traducir al mostrar (las entradas antiguas con texto se muestran con `TextoApi`). Test: `pantallas/simulador/simulador-idioma.test.tsx` con `fixtures.ts`.
- [ ] **Step 1:** `renderPseudo` del tablero, del panel de herramienta y de los resultados con `fixtures.ts` → `[]`; el CSV de la bitácora con `en` mantiene `# origen:` en español; la espera del radar mantiene «supuesto, pendiente de confirmar» en los tres idiomas.
- [ ] **Step 2–5:** FAIL → extraer → PASS, **VF**, **VV /simulador simulador-idioma**, **VE** → `git commit -m "feat(idioma): simulador de eventos traducido"`

### Task 14: Laboratorio del radar

**Files:** Modify `pantallas/laboratorio/{Laboratorio,VistaNubes,VistaPolarizacion}.tsx`, `frontend/src/api/laboratorio.ts` (si formatea texto). Create `catalogos/{es,en,qu}/laboratorio.ts`. Test: añadir a `laboratorio.test.tsx` casos `renderPseudo` → `[]` en las dos vistas; la banda S marcada «pendiente de confirmar» en los tres idiomas.
- [ ] **Step 1–5:** FAIL → extraer → PASS, **VF**, **VV /laboratorio laboratorio-idioma**, **VE** → `git commit -m "feat(idioma): laboratorio traducido"`

### Task 15: Recorrido y Fundamentos

**Files:**
- Split `pantallas/recorrido/guion.ts` → `guion.{es,en,qu}.ts` + `guionDe(idioma)`; `pantallas/fundamentos/contenido.ts` → `contenido.{es,en,qu}.ts` + `contenidoDe(idioma)`.
- Modify `Recorrido.tsx` (el iframe hereda el idioma por `localStorage`; la pantalla incrustada escucha el evento `storage` de `nisar.idioma` en `ProveedorIdioma` y aplica el nuevo valor), `Fundamentos.tsx`.
- Modify `idioma/ProveedorIdioma.tsx` (escuchar `storage`).
- Create `catalogos/{es,en,qu}/{recorrido,fundamentos}.ts`.
- Test: añadir a `recorrido.test.tsx` y `fundamentos.test.tsx`: igualdad del contenido `es` con el de hoy; mismo número de pasos/secciones en los tres; `renderPseudo` → `[]` en lo corto; un `StorageEvent('storage', { key: 'nisar.idioma', newValue: 'en' })` cambia el idioma del proveedor.
- [ ] **Step 1–5:** FAIL → extraer → PASS, **VF**, **VV /recorrido recorrido-idioma**, **VV /fundamentos fundamentos-idioma**, **VE** → `git commit -m "feat(idioma): recorrido y fundamentos traducidos"`

## Bloque 4 — Claves de la API

### Task 16: Registro de claves y errores con clave

**Files:**
- Create: `datos/claves.py`
- Modify: `datos/contrato.py` (`EntradaNoValida`, `NoEncontrado`), `api/app.py` (`_error`, manejadores), `api/schemas.py` (`ErrorDto`)
- Modify: todos los `raise EntradaNoValida(...)` / `raise NoEncontrado(...)` de `datos/` y `api/` (`grep -rn "raise EntradaNoValida\|raise NoEncontrado" datos api`)
- Test: `tests/datos/test_claves.py`, ampliar `tests/api/test_escenarios.py` o el archivo que ya pruebe un 422

**Interfaces:**
- `REGISTRO: dict[str, str]` (clave → plantilla en español con `{nombre}`); `texto(clave: str, **valores) -> str` (formatea la plantilla; `KeyError` si la clave no está registrada); `slug(t: str) -> str` (minúsculas, sin tildes con `unicodedata`, no alfanumérico → `_`, sin `_` repetidos ni en los extremos).
- `EntradaNoValida(mensaje: str, *, clave: str | None = None, valores: dict | None = None)` y `EntradaNoValida.con(clave: str, **valores) -> EntradaNoValida` (mensaje = `texto(clave, **valores)`); igual para `NoEncontrado`. Atributos `.clave` y `.valores`.
- Cuerpo de error: `{"mensaje": str, "clave_texto": str | None, "valores_texto": dict | None}`; `ErrorDto` con esos dos campos opcionales. Prefijo de claves de error: `api.error.<slug>`.

- [ ] **Step 1: Pruebas que fallan**

```python
def test_slug():
    assert slug("Cobertura de nubes (%)") == "cobertura_de_nubes"
    assert slug("Área quemada") == "area_quemada"
def test_texto_formatea():
    assert texto("api.error.nubes_rango", min=0, max=100) == "La cobertura de nubes va de 0 a 100 %."
def test_422_lleva_clave(cliente):
    r = cliente.get("/api/laboratorio/nubes", params={"cobertura": 150})
    assert r.status_code == 422
    assert r.json()["mensaje"] == "La cobertura de nubes va de 0 a 100 %."
    assert r.json()["clave_texto"] == "api.error.nubes_rango"
```
Además: todos los mensajes de error que ya comprueban las pruebas existentes salen **idénticos**.

- [ ] **Step 2:** `python -m pytest tests/datos/test_claves.py -q` → FAIL.
- [ ] **Step 3:** Implementar; convertir cada `raise` a `.con(...)` registrando su plantilla con el texto exacto de hoy. Los errores de validación de FastAPI (`RequestValidationError`) usan `api.error.entrada_no_valida` con `{detalle}` (el detalle queda en español). El 500 genérico usa `api.error.inesperado`.
- [ ] **Step 4:** **VP**; `python scripts/exportar_openapi.py && cd frontend && npm run tipos`; **VF**.
- [ ] **Step 5:** `git commit -m "feat(api): errores con clave_texto y valores_texto"`

### Task 17: Claves en métricas, laboratorio, impacto, escenarios y contexto; `claves.json`

**Files:**
- Modify: `datos/contrato.py` (`Metrica`: `clave_texto: str | None = None`, `valores_texto: dict[str, float | int | str] | None = None`)
- Modify: `datos/laboratorio.py`, `datos/impacto.py`, `datos/proveedores/demo.py`, `api/schemas_impacto.py`, `api/schemas.py` (contexto), `api/rutas/contexto.py`
- Create: `scripts/exportar_claves_api.py`, `api/claves.json`
- Test: `tests/api/test_claves_api.py`

**Interfaces:**
- Convención: un objeto con varios textos usa una clave base y el frontend añade el campo: `<clave>.etiqueta`, `<clave>.ayuda`, `<clave>.nombre`, `<clave>.descripcion`. En `REGISTRO` se registra cada subclave.
- `Metrica` del laboratorio: `clave_texto="api.lab.metrica.<slug(etiqueta)>"`; su `valor` sigue siendo texto y además `valores_texto={"valor": <número>}`.
- `ImpactoDto` gana `lectura_frases`, `acciones_frases`, `notas_frases: list[Frase] | None` y `titulo_frase: Frase | None`, donde `class Frase(BaseModel): clave_texto: str; valores_texto: dict[str, float | int | str] = {}` (en `api/schemas_impacto.py`). Los campos de texto actuales no cambian.
- Leyendas del laboratorio: `api.lab.leyenda.<slug>`; títulos de capa: `api.lab.capa.<slug>`.
- Claves **derivadas por id** (sin campo nuevo; las usa el frontend en la Tarea 19): `api.tipo.<id>.nombre|descripcion`, `api.control.<tipo>.<id>.etiqueta|ayuda|unidad`, `api.opcion.<tipo>.<control>.<slug(etiqueta)>`, `api.categoria.<variable>.<codigo>`, `api.escenario.<id>.sitio|descripcion` (`id` sin el sufijo `~…` de los simulados), `api.contexto.<campo>.<slug(valor)>` para `estacion`, `temporada`, `nombre_local`, `regimen`.
- `scripts/exportar_claves_api.py` escribe `api/claves.json` (lista ordenada por clave de `{"clave": str, "es": str}`, `ensure_ascii=False`, `indent=2`) con `REGISTRO` más las derivadas que salen de recorrer `ProveedorDemo().tipos()`, sus escenarios, las variables categóricas y todos los valores posibles del contexto. Sigue el patrón de `scripts/exportar_openapi.py`.

- [ ] **Step 1:** Pruebas (`test_claves_api.py`): el `claves.json` versionado es igual al regenerado en memoria (mismo patrón que `test_contrato_openapi.py`); las respuestas de `/api/laboratorio/nubes`, `/api/laboratorio/respuesta`, `/api/escenarios/{id}/impacto` (La Segua) y `/api/contexto` solo traen `clave_texto` presentes en `claves.json`, y cada `valores_texto` cubre las variables `{x}` de su plantilla; el texto en español de cada respuesta no cambia (comparar con las aserciones existentes).
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** **VP**; regenerar OpenAPI y tipos; **VF**.
- [ ] **Step 5:** `git commit -m "feat(api): claves de texto en métricas, impacto, laboratorio y contexto"`

### Task 18: Claves del simulador

**Files:** Modify `datos/simulador.py`, `api/schemas_simulador.py`. Test: ampliar `tests/api/test_simulador.py` y `tests/datos/test_simulador.py`; regenerar `api/claves.json` (ampliar `exportar_claves_api.py` para añadir el catálogo del simulador: herramientas, controles, opciones y mundos predefinidos).

**Interfaces:**
- Derivadas por id: `api.sim.herramienta.<id>.nombre`, `api.sim.control.<herramienta>.<id>.etiqueta|ayuda`, `api.sim.opcion.<herramienta>.<control>.<slug(opción)>`, `api.sim.mundo.<slug(nombre)>.nombre|descripcion`.
- Con campo nuevo (`clave_texto: str | None` en `MetricaEventoDto`, `CapaEventoDto`, `EventoDto` para el título): métricas `api.sim.metrica.<slug(etiqueta)>` (+ `valores_texto` si el valor es numérico); capas `api.sim.capa.<slug(nombre)>`; título `api.sim.titulo.<herramienta>` con `valores_texto={"lat": …, "lon": …}` reconstruido en el puente.
- Notas y celdas de tabla del modelo: sin clave (spec §9.5).
- Las claves que solo aparecen al desatar un evento (métricas, capas) **no** se generan en `exportar_claves_api.py` (sería lento): se añaden a `REGISTRO` a mano en `datos/claves.py`, y la prueba las verifica.

- [ ] **Step 1:** Prueba: en los eventos que ya desatan las pruebas existentes, toda `clave_texto` está en `claves.json`; el catálogo devuelto no cambia de forma (mismas claves y textos).
- [ ] **Step 2–5:** FAIL → implementar → **VP**, OpenAPI y tipos, **VF** → `git commit -m "feat(api): claves de texto del simulador"`

### Task 19: El frontend traduce el texto de la API

**Files:**
- Create: `frontend/src/idioma/clavesApi.ts`; `catalogos/{es,en,qu}/api.ts` (todas las claves de `api/claves.json`; el valor `es` es el de `claves.json`)
- Modify: cada `<TextoApi texto={…} />` del bloque 3 recibe su `clave`/`valores` (por campo `clave_texto` o por `clavesApi`). En atributos se usa `textoApi(…).texto`.
- Test: `frontend/src/idioma/api-claves.test.ts`

**Interfaces:**
- `clavesApi.tipo(id, campo)`, `.control(tipo, id, campo)`, `.opcion(tipo, control, etiquetaEs)`, `.categoria(variable, codigo)`, `.escenario(id, campo)`, `.contexto(campo, valorEs)`, `.simHerramienta(id, campo)`, `.simControl(h, id, campo)`, `.simOpcion(h, c, etiquetaEs)`, `.simMundo(nombreEs, campo)` → `string`. `slug` en TS idéntico al de Python (prueba con los mismos casos que `test_slug`).
- Las frases de impacto (`*_frases`) se traducen con `textoApi(textoEs, frase.clave_texto, frase.valores_texto)` emparejadas por posición con la lista de texto.

- [ ] **Step 1:** Pruebas: toda clave de `api/claves.json` existe en los tres catálogos (leer el JSON con `readFileSync` como `tokens.test.ts`) y su valor `es` es igual al de `claves.json`; `slug` TS = Python en los casos de `test_slug`; `renderPseudo` del Observatorio (con un fixture cuyos textos de API tienen claves) muestra `⟦…⟧` para los nombres de tipo y `textosSinTraducir` = `[]` sin contar `lang="es"`.
- [ ] **Step 2–5:** FAIL → implementar y traducir (`en` y `qu`) → PASS, **VF**, **VE** → `git commit -m "feat(idioma): el frontend traduce el texto de la API"`

## Bloque 5 — Accesibilidad

### Task 20: Auditoría automática con axe y línea base

**Files:** `cd frontend && npm install -D @axe-core/playwright`. Create `frontend/e2e/accesibilidad.spec.ts`; añadirlo a `testMatch` del proyecto `flujos` en `playwright.config.ts`. Modify `INFORME.md` (sección «Accesibilidad: línea base»).

**Interfaces:** Produces en el spec `const PENDIENTES: string[] = [...]` (ids de reglas axe que fallan hoy). Las Tareas 21–25 los van quitando; la Tarea 25 deja `PENDIENTES = []`.

- [ ] **Step 1:** Escribir el spec: para cada ruta de `['/', '/observatorio', '/simulador', '/laboratorio', '/recorrido', '/fundamentos']`, cada idioma (`page.goto(ruta + '?idioma=' + i)`) y cada ancho (1440×900 y 390×844): esperar a que no haya `[aria-busy="true"]`, `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()` y afirmar que las infracciones con `impact` `serious` o `critical` cuyo `id` no está en `PENDIENTES` son `[]`.
- [ ] **Step 2:** Correr con `PENDIENTES = []` → FAIL; copiar los ids que fallan a `PENDIENTES` y la tabla (regla, impacto, rutas, número de nodos) a `INFORME.md`.
- [ ] **Step 3:** Correr de nuevo → PASS. **VE**.
- [ ] **Step 4:** `git commit -m "test(a11y): auditoría axe en seis rutas, tres idiomas y dos anchos"`

### Task 21: Orientación: saltar al contenido, títulos y encabezados

**Files:** Create `frontend/src/estado/useTituloPagina.ts`, `catalogos/{es,en,qu}/{titulos,a11y}.ts`. Modify `diseno/Estructura.tsx` (enlace «Saltar al contenido» como primer elemento enfocable, `<main id="contenido" tabIndex={-1}>`), `diseno/CabeceraPantalla.tsx` (el `h1` recibe el foco al cambiar de ruta), cada pantalla (llamar a `useTituloPagina('titulos.<pantalla>')`), `diseno/componentes.css` (enlace visible solo con foco). Test: `frontend/src/estado/orientacion.test.tsx`.

**Interfaces:** `useTituloPagina(clave: Clave): void` → `document.title = \`${t(clave)} · NISAR Ecuador\`` y se actualiza al cambiar de idioma.

- [ ] **Step 1:** Pruebas: el primer `Tab` en `Estructura` enfoca «Saltar al contenido» (y su versión en `en`/`qu`); activarlo enfoca `#contenido`; `document.title` = `Observatorio · NISAR Ecuador` en `es` y cambia con `cambiarIdioma('en')`; cada pantalla renderizada tiene exactamente un `h1` y no salta niveles (`h1`→`h3` sin `h2` falla).
- [ ] **Step 2–3:** FAIL → implementar → PASS. Quitar de `PENDIENTES` las reglas resueltas (`bypass`, `document-title`, `page-has-heading-one`, `heading-order`, `landmark-*` si estaban).
- [ ] **Step 4:** **VF**; **VE**.
- [ ] **Step 5:** `git commit -m "feat(a11y): saltar al contenido, títulos por pantalla y foco al navegar"`

### Task 22: Contraste de los tokens

**Files:** Create `frontend/src/diseno/contraste.ts`, `contraste.test.ts`. Modify (si hace falta) `diseno/tokens.css` **y** el bloque css de `docs/diseno.md` §4 a la vez (`tokens.test.ts` exige que coincidan).

**Interfaces:** `luminancia(hex: string): number`, `contraste(a: string, b: string): number` (fórmula WCAG 2.x: canales sRGB `c ≤ 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`; `L = 0.2126R + 0.7152G + 0.0722B`; `(L1+0.05)/(L2+0.05)` con L1 la mayor).

- [ ] **Step 1:** Pruebas: `contraste('#ffffff','#000000')` ≈ 21; luego, leyendo `tokens.css`: texto `--text`, `--secondary`, `--muted` sobre `--ground`, `--surface`, `--raised` ≥ 4,5; cada `--pill-*-ink` sobre su `--pill-*-bg` ≥ 4,5; `--demo-ink` sobre `--demo-bg` ≥ 4,5; `--accent` y `--control` (borde de control) y el color del anillo de foco sobre `--ground` y `--surface` ≥ 3.
- [ ] **Step 2:** FAIL o PASS según los tokens. Por cada par que falle: subir la luminosidad del color del texto/borde (mismo tono) en pasos de `#050505` hasta cumplir, y actualizar `tokens.css` y `docs/diseno.md` §4 (incluido su comentario de contraste).
- [ ] **Step 3:** PASS; quitar `color-contrast` de `PENDIENTES` si se resolvió; **VF**; **VV /** y **VV /observatorio** (el cambio es global); **VE**.
- [ ] **Step 4:** `git commit -m "fix(a11y): contraste de los tokens verificado (WCAG 2.2 AA)"`

### Task 23: Teclado, foco y tamaño de objetivos

**Files:** Modify `diseno/componentes.css` (`html { scroll-padding-top: <alto de banda>; scroll-padding-bottom: <alto de barra móvil> }` con variables de `tokens.css`; mínimo `24px` de alto/ancho en controles interactivos: `.boton`, `.riel__destino`, `.termino__nombre`, selector de idioma, puntos de la cinta), `diseno/HojaInferior.tsx` (atrapar el foco con Tab/Shift+Tab y devolverlo al elemento que la abrió). Test: ampliar las pruebas de `HojaInferior` y `frontend/e2e/accesibilidad.spec.ts`.

- [ ] **Step 1:** Pruebas: en `HojaInferior`, Tab desde el último enfocable vuelve al primero y Shift+Tab desde el primero va al último; al cerrar, el foco vuelve al botón que la abrió. E2e: a 390 px, recorrer con `Tab` 40 veces el Observatorio y, para cada elemento enfocado, su `getBoundingClientRect()` queda dentro del viewport y no lo tapa la banda (su `top` ≥ el `bottom` de `.banda-demo`) ni la barra inferior; todo `button`, `a`, `input` visible mide ≥ 24×24 px (o tiene 24 px de separación; regla axe `target-size`).
- [ ] **Step 2–3:** FAIL → implementar → PASS; quitar `target-size`/`focus-*` de `PENDIENTES`.
- [ ] **Step 4:** **VF**; **VE**; **VV /observatorio observatorio-foco**.
- [ ] **Step 5:** `git commit -m "fix(a11y): foco visible sin tapar, trampa de foco y objetivos de 24 px"`

### Task 24: Menos movimiento en todas las animaciones

**Files:** Create `frontend/src/estado/useMenosMovimiento.ts`. Modify `tiempo/usePlayback.ts` y `pantallas/observatorio/VistaMapa.tsx` (usar el hook en lugar de su consulta propia), `pantallas/simulador/{Simulador,Tablero,ResultadosEvento}.tsx` (animación del evento: con menos movimiento se muestra el último fotograma y un botón «Reproducir»), `pantallas/recorrido/Recorrido.tsx`, `pantallas/laboratorio/*.tsx` (transiciones). Test: `frontend/src/estado/movimiento.test.tsx`.

**Interfaces:** `useMenosMovimiento(): boolean` (`matchMedia('(prefers-reduced-motion: reduce)')` con escucha de cambios; sin `matchMedia` → `false`, como `useMovil`).

- [ ] **Step 1:** Pruebas con `matchMedia` simulado a `reduce`: el simulador no arranca la animación sola y muestra el estado final; el recorrido no avanza solo (ya lo hacía: la prueba debe seguir pasando con el hook); el reproductor no arranca solo.
- [ ] **Step 2–5:** FAIL → implementar → PASS, **VF**, **VE** → `git commit -m "feat(a11y): menos movimiento en simulador, recorrido y laboratorio"`

### Task 25: Alternativas textuales del mapa y los lienzos; tabla móvil

**Files:** Modify `pantallas/observatorio/{VistaMapa,LienzoCapa}.tsx`, `comparador/Comparador.tsx`, `pantallas/simulador/PanelRadar.tsx` (cada lienzo con `aria-describedby` hacia un resumen textual: qué muestra, fecha y valor medio si existe; el mapa con una nota visible para lectores de pantalla que remite al panel de métricas y a la tabla), `diseno/Tabla.tsx` (cuando el CSS móvil pone las filas en bloque: `role="table"`, `role="row"`, `role="columnheader"`, `role="cell"`), `catalogos/*/a11y.ts`. Test: ampliar las pruebas de esos componentes; `frontend/e2e/accesibilidad.spec.ts` con `PENDIENTES = []`.

- [ ] **Step 1:** Pruebas: `getByRole('img', { name })` de cada lienzo tiene una descripción accesible no vacía (`toHaveAccessibleDescription`); a 390 px (`matchMedia` móvil) `getByRole('table')` y `getAllByRole('cell')` siguen existiendo; `PENDIENTES` vacío.
- [ ] **Step 2–3:** FAIL → implementar → PASS (si una regla no se puede resolver sin rediseñar, anotarla en `INFORME.md` con el motivo y dejarla en `PENDIENTES` **solo** con aprobación del revisor de la tarea).
- [ ] **Step 4:** **VF**; **VE**.
- [ ] **Step 5:** `git commit -m "feat(a11y): descripciones de mapa y lienzos, tabla móvil con semántica"`

## Bloque 6 — Cierre

### Task 26: E2e de idioma y revisión visual en tres idiomas

**Files:** Create `frontend/e2e/idioma.spec.ts` (en `testMatch` de `flujos`). Modify `scripts/revision_visual.sh` (tercer argumento opcional `idioma` = `es|en|qu`; se añade `?idioma=<idioma>` a la URL inspeccionada —con `&` si la ruta ya tiene `?`— y la salida va a `docs/capturas-nuevas/<nombre>-<idioma>/`; sin tercer argumento, comportamiento de hoy).

- [ ] **Step 1:** `idioma.spec.ts`:
  - En `/observatorio?escenario=<La Segua>` esperar a que carguen las capas y a la red en reposo; contar las peticiones a `/api/` desde ese momento; abrir el selector, elegir English → el `h1` cambia a inglés y el contador sigue en 0 (Review Focus 2).
  - Recargar → sigue en inglés; `document.documentElement.lang === 'en'`.
  - Con `qu`: el aviso «en revisión» es visible y la banda de demostración también.
  - `/recorrido` con `qu`: el texto del iframe tiene `lang="qu-EC"` en su `<html>`.
- [ ] **Step 2:** **VE** → PASS.
- [ ] **Step 3:** Revisión visual en `en` y `qu` de `/`, `/observatorio`, `/simulador`, `/laboratorio`, `/recorrido`, `/fundamentos` (`bash scripts/revision_visual.sh <ruta> <nombre> <idioma>`). Corregir desbordes (sobre todo `qu` a 390 px) hasta 3 rondas por pantalla; lo pendiente, a `INFORME.md`.
- [ ] **Step 4:** `git commit -m "test(idioma): e2e de cambio en vivo y revisión visual en tres idiomas"`

### Task 27: Herramientas y revisión del borrador en kichwa

**Files:** Create `scripts/traducciones_csv.mjs`, `docs/traduccion-kichwa.csv`. Modify `docs/guia-traduccion-kichwa.md`, `catalogos/qu/*.ts`, `catalogos/validadas.ts` (solo vía el script).

**Interfaces:**
- `node scripts/traducciones_csv.mjs exportar` → escribe `docs/traduccion-kichwa.csv` con columnas `clave,es,en,qu,validada` (UTF-8 con BOM, una fila por clave, ordenado por clave; `validada` = `si`/`no` según `VALIDADAS_QU`). Lee los catálogos importando los `.ts` con `tsx` o compilándolos con `esbuild` (ya está en `devDependencies`).
- `node scripts/traducciones_csv.mjs importar <archivo.csv>` → por cada fila con `qu` distinto del catálogo, reescribe ese valor en el archivo `catalogos/qu/<área>.ts` que contiene la clave (sustitución de la línea `'<clave>': '…',`, escapando comillas); reescribe `validadas.ts` con las filas `validada=si`. Rechaza el CSV (sin escribir nada) si falta una columna, si una clave no existe o si un `qu` cambia las variables `{x}`.

- [ ] **Step 1:** Prueba `frontend/src/idioma/traducciones-csv.test.ts`: exportar → importar el mismo CSV no cambia ningún archivo; importar un CSV con una variable `{n}` borrada falla con mensaje en español y no escribe.
- [ ] **Step 2–3:** FAIL → implementar → PASS.
- [ ] **Step 4:** Revisión del borrador por el modelo más capaz disponible: leer `catalogos/qu/*.ts` y el contenido largo `.qu.ts` buscando inconsistencias de terminología y términos inventados; completar en la guía la tabla «Términos dejados en español» y las «Dudas abiertas». Generar el CSV.
- [ ] **Step 5:** **VF** → `git commit -m "feat(idioma): CSV y guía para validar el kichwa con hablantes"`

### Task 28: Prueba manual, documentación e informe

**Files:** Modify `INFORME.md`, `README.md`, `README.es.md`, `docs/historia-datos.md`, `CLAUDE.md` (tabla de comandos: `revision_visual.sh … <idioma>`, `exportar_claves_api.py`, `traducciones_csv.mjs`).

- [ ] **Step 1:** Prueba manual (spec §4.7): las seis pantallas solo con teclado; una pasada con Orca (o NVDA) por Historias y Observatorio en los tres idiomas; zoom 200 % y 400 % (ventana de 1280 px → reflujo a 320 px CSS) sin pérdida de contenido ni scroll horizontal. Anotar en `INFORME.md` qué se probó, con qué herramienta, y lo que falló.
- [ ] **Step 2:** `INFORME.md`: sección «Idioma y accesibilidad (2026-11-05)» con lo hecho, cifras de pruebas, estado del kichwa (N de M validadas), pendientes; actualizar «Pendientes vigentes», la tabla de cumplimiento del challenge («Público amplio») y la cabecera. README (es/en): selector de idioma y nivel de accesibilidad. Guion: mencionar el selector y que el kichwa está en revisión por hablantes.
- [ ] **Step 3:** Verificación final completa: **VP**, **VF**, **VE** y `npm run build` normal. Todo en verde.
- [ ] **Step 4:** `git commit -m "docs: informe, README y guion con idioma y accesibilidad"`
