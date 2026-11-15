import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../../idioma/useT'
import type { Clave } from '../../idioma/traductor'
import { Boton } from '../../diseno/Boton'
import { marcarGuiaVista } from './guiaMemoria'

interface PasoGuia { ancla: string; titulo: Clave; texto: Clave }

const PASOS: PasoGuia[] = [
  { ancla: '.portada__texto', titulo: 'guia.1.titulo', texto: 'guia.1.texto' },
  { ancla: '.entradas', titulo: 'guia.2.titulo', texto: 'guia.2.texto' },
  { ancla: '.riel', titulo: 'guia.3.titulo', texto: 'guia.3.texto' },
  { ancla: '.riel__idioma', titulo: 'guia.4.titulo', texto: 'guia.4.texto' },
]

const MARGEN = 12
const CLASE_ANCLA = 'guia-ancla'

/** Coloca el globo junto al ancla: a su derecha, debajo o encima, siempre dentro de la ventana. */
function colocar(globo: HTMLElement, ancla: HTMLElement) {
  const r = ancla.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = globo.offsetWidth
  const h = globo.offsetHeight
  const minTop = MARGEN
  let top: number
  let left: number
  if (r.right + MARGEN + w <= vw - MARGEN && r.width < vw * 0.4) {
    left = r.right + MARGEN
    top = r.top
  } else if (r.bottom + MARGEN + h <= vh - MARGEN) {
    left = r.left
    top = r.bottom + MARGEN
  } else if (r.top - MARGEN - h >= minTop) {
    left = r.left
    top = r.top - MARGEN - h
  } else {
    // El ancla ocupa casi toda la ventana (una sección alta): el globo va abajo, sobre ella.
    left = r.left + MARGEN
    top = vh - h - MARGEN
  }
  left = Math.min(Math.max(MARGEN, left), vw - w - MARGEN)
  top = Math.min(Math.max(minTop, top), vh - h - MARGEN)
  globo.style.left = `${left}px`
  globo.style.top = `${top}px`
}

/**
 * Recorrido de primera visita de Inicio: tres o cuatro globos anclados. Se puede saltar, Esc lo cierra y se recuerda
 * en localStorage (con try/catch; si falla, no vuelve a salir en la sesión). Inicio decide cuándo está abierta y
 * ofrece «Ver la guía otra vez».
 */
export function GuiaPrimeraVisita({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const { t } = useT()
  const [i, setI] = useState(0)
  const [pasos, setPasos] = useState<PasoGuia[]>([])
  const globo = useRef<HTMLDivElement>(null)
  const previo = useRef<Element | null>(null)

  const cerrar = useCallback(() => {
    marcarGuiaVista()
    onCerrar()
  }, [onCerrar])

  // Solo los pasos cuyo ancla existe en esta pantalla.
  useEffect(() => {
    if (!abierta) return
    previo.current = document.activeElement
    setPasos(PASOS.filter((p) => document.querySelector(p.ancla)))
    setI(0)
  }, [abierta])

  const paso = pasos[i]
  const reposicionar = useCallback(() => {
    if (!paso || !globo.current) return
    const ancla = document.querySelector<HTMLElement>(paso.ancla)
    if (ancla) colocar(globo.current, ancla)
  }, [paso])

  useLayoutEffect(() => {
    if (!abierta || !paso) return
    const ancla = document.querySelector<HTMLElement>(paso.ancla)
    if (!ancla) return
    ancla.classList.add(CLASE_ANCLA)
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (ancla.getBoundingClientRect().top > window.innerHeight * 0.6) {
      ancla.scrollIntoView?.({ block: 'center', behavior: reducido ? 'auto' : 'smooth' })
    }
    reposicionar()
    globo.current?.querySelector<HTMLElement>('[data-foco]')?.focus({ preventScroll: true })
    return () => ancla.classList.remove(CLASE_ANCLA)
  }, [abierta, paso, reposicionar])

  useEffect(() => {
    if (!abierta) return
    const alCambiar = () => reposicionar()
    window.addEventListener('resize', alCambiar)
    window.addEventListener('scroll', alCambiar, true)
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); cerrar() }
    }
    document.addEventListener('keydown', alTeclear)
    return () => {
      window.removeEventListener('resize', alCambiar)
      window.removeEventListener('scroll', alCambiar, true)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [abierta, reposicionar, cerrar])

  // Al cerrar, el foco vuelve a donde estaba.
  useEffect(() => {
    if (abierta) return
    const p = previo.current
    if (p instanceof HTMLElement && document.contains(p)) p.focus({ preventScroll: true })
    previo.current = null
  }, [abierta])

  if (!abierta || !paso) return null
  const ultimo = i === pasos.length - 1
  return (
    <div ref={globo} className="guia" role="dialog" aria-modal="false" aria-label={t('guia.etiqueta')} aria-describedby="guia-texto">
      <p className="guia__paso">{t('guia.paso', { n: i + 1, total: pasos.length })}</p>
      <h2 className="guia__titulo">{t(paso.titulo)}</h2>
      <p id="guia-texto" className="guia__texto">{t(paso.texto)}</p>
      <div className="guia__acciones">
        <Boton variante="terciario" onClick={cerrar}>{t('guia.saltar')}</Boton>
        {i > 0 && <Boton variante="secundario" onClick={() => setI(i - 1)}>{t('guia.anterior')}</Boton>}
        <Boton variante="secundario" data-foco onClick={() => (ultimo ? cerrar() : setI(i + 1))}>
          {ultimo ? t('guia.entendido') : t('guia.siguiente')}
        </Boton>
      </div>
    </div>
  )
}
