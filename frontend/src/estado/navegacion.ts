/** Foco al navegar (spec §4.3): tras una navegación, el `h1` de la pantalla nueva recibe el foco.
 *
 * La marca dura unos segundos y no se consume al primer intento, porque los efectos de los hijos corren
 * antes que los del padre (la cabecera se monta antes de que `Estructura` marque) y porque una pantalla que
 * carga monta una cabecera provisional y luego la definitiva. Mientras dure, cada cabecera que se monta y un
 * intento tras pintar mueven el foco al `h1`, siempre que la persona no lo haya llevado a otro sitio. */
const VENTANA_MS = 5000

interface Marca {
  hasta: number
  /** Elemento enfocado al navegar (el enlace pulsado) y el último `h1` que enfocamos. */
  origen: Element | null
  enfocado: Element | null
}

let marca: Marca | null = null

const ahora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

function trasPintar(f: () => void): void {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => f())
  else setTimeout(f, 0)
}

export function marcarNavegacion(): void {
  marca = { hasta: ahora() + VENTANA_MS, origen: document.activeElement, enfocado: null }
  trasPintar(() => enfocarTitulo())
}

/** Enfoca `h1` (o el `h1` dentro de `#contenido`) si hay una navegación reciente y el foco sigue libre:
 * en `<body>`, en el enlace pulsado o en un `h1` que ya enfocamos. Devuelve si lo movió. */
export function enfocarTitulo(h1?: HTMLElement | null): boolean {
  if (!marca) return false
  if (ahora() > marca.hasta) { marca = null; return false }
  const activo = document.activeElement
  const libre = !activo || activo === document.body || activo === marca.origen || activo === marca.enfocado
    || activo === document.getElementById('contenido')
  if (!libre) { marca = null; return false }
  const objetivo = h1 ?? document.querySelector<HTMLElement>('#contenido h1')
  if (!objetivo || !objetivo.isConnected) return false
  if (activo !== objetivo) objetivo.focus()
  marca.enfocado = objetivo
  return true
}

/** Solo para pruebas. */
export function olvidarNavegacion(): void { marca = null }
