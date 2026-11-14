# Rediseño de PACHA: auditoría y dirección

Brief de referencia del rediseño (partes 1 y 2). Lo usa el prompt de Claude Code de la rama `rediseno-pacha`.

## 1. Auditoría

### Lo que ya funciona (hay que conservarlo)
- La honestidad: la banda de demostración, los sellos de origen y las notas «sin verificar». Es un diferenciador real.
- El comparador antes/después y el mapa del Observatorio, con mapas base Esri, el localizador de Ecuador y la leyenda.
- La accesibilidad medida (axe, teclado, reflujo), los tres idiomas y el estado guardado en la URL.

### Problemas, ordenados por gravedad

**Graves (impiden entender o usar la app)**

1. **No hay portada.** `/` abre directamente un artículo largo a dos columnas. Un visitante nuevo no sabe qué es PACHA, qué puede hacer ni por dónde empezar. Las dos historias aparecen como texto pequeño en la columna izquierda, no como opciones que se puedan elegir.
2. **Muro de texto** en Historias, como señaló el mentor. La columna izquierda tiene párrafos largos uno tras otro y la derecha queda vacía cuando bajas: se desperdicia la mitad de la pantalla y no hay nada que invite a interactuar.
3. **El Simulador empieza por el final.** Primero ocupa espacio el título con su descripción, luego aparecen pestañas de fenómenos dentro de una tarjeta llamada «Tablero» y, a la derecha, un formulario de latitud y longitud. El botón «Crear el mundo» queda debajo del primer pantallazo y los resultados mucho más abajo. En móvil lo primero que ves son los parámetros, no el mapa (mentor).
4. **Se exponen controles de experto al público general.** En el Observatorio se ve en primer plano «Semilla: entero entre 0 y 2.147.483.647», el número de miradas (ENL) y la dirección de la órbita. En el Simulador, la semilla del azar, el rumbo de la falla y la vulnerabilidad PAGER. Para el público del challenge (educadores, gestores, ciudadanía) eso es ruido.
5. **Navegación sin rumbo.** El riel tiene solo íconos sin texto (libro, mapa, matraz, lápiz, play, libro), con seis destinos que se solapan: Historias, Observatorio, Laboratorio, Simulador, Recorrido y Fundamentos. Dentro del Observatorio hay tres niveles de pestañas (vistas → «Modelo en el tiempo / Cambio detectado» → base Oscuro/Satélite/Relieve). Es fácil perderse, que es justo el tercer punto del mentor.

**Importantes**

6. No hay **una acción principal por pantalla**. Todo pesa lo mismo: tarjetas oscuras, texto gris y botones blancos parecidos.
7. **La jerarquía de color va al revés.** El fondo es casi negro y lo que más resalta es la banda naranja de demostración y el amarillo del relieve del simulador, que satura toda la vista. El contenido importante (el cambio detectado) compite con la decoración.
8. **Las cifras y unidades no se interpretan.** Por ejemplo, la escala «−21,869 … −1,478 dB» sale sin la frase que diga qué significa. Los KPI del simulador (MMI 7,4, víctimas 4) aparecen sin contexto ni comparación.
9. **La identidad no cuenta la historia.** La «sala de control» dice «tecnología», no «Pacha Mama marcada por el clima». Nada en lo visual habla de tierra, agua, fuego o tiempo.

---

## 2. Dirección propuesta

### 2.1 Idea central
**«La tierra guarda las marcas; el radar las lee.»** PACHA debe sentirse como un **atlas vivo de la tierra ecuatoriana**, no como una consola. La tecnología se nota en la precisión, no en la estética de ciencia ficción.

### 2.2 Identidad visual («Tierra viva»)
- **Tema claro y cálido por defecto** para leer y aprender, con el fondo en tono arcilla o papel. Para las vistas de mapa y radar hay **superficies oscuras de basalto volcánico**, que hacen resaltar los datos. Un modo oscuro completo puede quedar como opción.
- **Paleta que sale del paisaje** (Claude Code debe proponer valores exactos y comprobar el contraste AA):
  - basalto o andesita (texto y superficies oscuras);
  - páramo y musgo (verde apagado: vegetación);
  - tierra de cacao y barro (marrón: suelo);
  - laguna y manglar (verde azulado: agua y humedales);
  - un solo **acento** ocre maíz o achiote para la acción principal.
  - El naranja de la banda de demostración se queda, pero se integra a la paleta en vez de competir con ella.
- **Los datos no se tocan por estética.** Las rampas científicas siguen siendo perceptualmente uniformes y aptas para daltonismo (las actuales de `rampas.ts`, o las de Crameri como batlow, vik o roma). Nada de arcoíris. La paleta de marca es para la interfaz, no para los valores.
- **Tipografía:** un serif humanista para los títulos (que transmita atlas o publicación científica) y Public Sans para el cuerpo y los datos. Claude Code debe elegir con la skill de diseño y evitar las fuentes de moda de lo generado por IA.
- **Motivo gráfico:** **curvas de nivel**, anillos concéntricos que son a la vez topografía, ondas de radar y anillos de crecimiento (tiempo). Se usan como textura sutil, en separadores, en estados vacíos y en el logo.
- **Logo:** «PACHA» con un círculo de curvas de nivel atravesado por un barrido de radar. Es sencillo y funciona a 16 px.
- **Sensibilidad cultural:** **no usar** símbolos andinos sagrados (chakana, iconografía ritual) ni patrones textiles como decoración sin consultar a la comunidad. El kichwa ya está en revisión con hablantes; la identidad debe seguir esa misma ética.

### 2.3 Arquitectura de la experiencia
Pasar de seis destinos a **cuatro**, con nombres claros (riel con texto en escritorio y barra inferior con texto en móvil):

| Destino | Contiene hoy | Pregunta del usuario |
|---|---|---|
| **Inicio** | (nuevo) | ¿Qué es esto y por dónde empiezo? |
| **Explorar** | Historias + Observatorio | ¿Qué le pasó a este lugar? |
| **Simular** | Simulador | ¿Qué pasaría si…? |
| **Aprender** | Fundamentos + Laboratorio + Recorrido | ¿Cómo ve el radar? |

**Inicio:** una portada con una frase de valor, una imagen protagonista (el comparador o un mapa animado de Ecuador) y **tres tarjetas de entrada grandes**: «Ver cómo se inunda la Costa», «Ver un incendio en la Sierra» y «Provoca tu propio evento». Debajo, «¿Primera vez? Recorrido de 90 segundos».

**Historias como recorrido por pasos** (*scrollytelling* o pasos numerados), no como artículo. Cada parte es una **tarjeta desplegable** con un titular y una cifra visible, y el detalle se abre al hacer clic (mentor). El comparador queda **fijo** a la derecha en escritorio y cambia con cada paso. Hay un indicador de progreso («Paso 2 de 5») y, al final, un botón claro hacia «Explóralo tú en el Observatorio».

**Simulador con un flujo de tres pasos:**
1. **Elige el fenómeno**: tarjetas grandes con ícono e imagen (Incendio, Tormenta, Crecida, Terremoto, Erupción).
2. **Elige el lugar**: el mapa ocupa la pantalla; se toca un lugar o se elige uno del catálogo. La latitud y longitud quedan en «Opciones avanzadas».
3. **Ajusta y desata**: los parámetros van en un **panel lateral desplegable** (en móvil, una hoja inferior) con 2–3 controles esenciales visibles y el resto en «Avanzado» (mentor).

El mapa siempre ocupa el centro. Los resultados aparecen **junto al mapa** (en escritorio) o en una hoja que sube (en móvil), no al fondo de la página.

**Observatorio:** el mapa es el protagonista. Los controles técnicos (semilla, ENL, órbita) pasan a «Parámetros avanzados», cerrados por defecto. Hay como máximo dos niveles de pestañas. Cada vista tiene una frase que dice «qué estás viendo».

**Guía al usuario (mentor):**
- Indicador de pasos en los flujos.
- Recorrido de primera visita opcional (3–4 globos, que se puede saltar y no vuelve a salir).
- Estados vacíos que enseñan («Toca el mapa para elegir dónde ocurre»).
- Migas de pan en Explorar.
- Cada pantalla tiene **una acción principal** con el color de acento.

**Divulgación progresiva** en todo: primero la respuesta en lenguaje llano, luego la cifra y por último el detalle técnico.

### 2.4 Skills y reglas que encontré

Todas las skills son de terceros salvo la de Anthropic. Revisen su código antes de instalarlas: algunas ejecutan scripts o descargan binarios.

| Recurso | Para qué | Instalación (verificar en su repo) |
|---|---|---|
| **frontend-design** (oficial de Anthropic) | Dirección estética con intención, contra lo genérico | `claude plugin add anthropic/frontend-design` o desde `anthropics/skills` |
| **Taste Skill** (ya la usan) | Gusto visual medible | ya está en `.claude/skills/` |
| **Impeccable** (Paul Bakaus, Apache 2.0) | `/impeccable teach` fija el contexto de diseño del proyecto; `/critique` hace una revisión UX con puntuación heurística; `/audit` revisa accesibilidad, rendimiento y responsive; `/polish`, `/distill`, `/clarify`, `/onboard` | `npx skills add pbakaus/impeccable` (su lanzador descarga binarios de sus releases: revisar) |
| **Web Interface Guidelines** (Vercel) | Auditoría de código contra más de 100 reglas de accesibilidad, foco, formularios, animación y rendimiento, en formato `archivo:línea` | `npx skills add vercel-labs/agent-skills --skill web-design-guidelines` |
| **UI/UX Pro Max** (opcional) | Base de datos de estilos, paletas y tipografías para generar un sistema de diseño | `npx skills add nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max` |

Marcos clásicos que el prompt también le pide aplicar: las 10 heurísticas de Nielsen, WCAG 2.2 AA (que ya tienen), la divulgación progresiva, una acción principal por pantalla y las reglas de color científico de NASA Earth Observatory y Crameri.

**Ojo con instalar demasiadas skills que choquen entre sí.** Recomiendo **Impeccable + Web Interface Guidelines + Taste Skill** (la que ya tienen) y dejar las reglas esenciales escritas en `docs/diseno.md` y `CLAUDE.md`: unas reglas cortas y explícitas en el repo son más fiables que muchas skills.

---
