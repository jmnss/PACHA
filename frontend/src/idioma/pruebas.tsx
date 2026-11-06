import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { es } from './catalogos/es'
import type { CodigoIdioma } from './idiomas'
import { ProveedorIdioma } from './ProveedorIdioma'
import type { Catalogo } from './traductor'

export function renderConIdioma(ui: ReactElement, idioma: CodigoIdioma): RenderResult {
  return render(<ProveedorIdioma inicial={idioma}>{ui}</ProveedorIdioma>)
}

const PSEUDO = Object.fromEntries(Object.entries(es).map(([k, v]) => [k, `⟦${v}⟧`])) as Catalogo

/** Idioma `en` con un catálogo donde cada valor es ⟦valor es⟧: lo que no lo lleva, no pasó por t(). */
export function renderPseudo(ui: ReactElement): RenderResult {
  return render(
    <ProveedorIdioma inicial="en" catalogos={{ en: PSEUDO }}>
      {ui}
    </ProveedorIdioma>,
  )
}

export const SIGLAS = ['ENL', 'HH', 'HV', 'VV', 'VH', 'SAR', 'NISAR', 'NASA', 'ISRO', 'ASF', 'L', 'S', 'ES', 'EN', 'QU']
export const NOMBRES_PROPIOS = ['Costa', 'NASA POWER', 'Ecuador', 'La Segua', 'Manabí', 'Loja', 'NISAR · Ecuador']

const NUMERICO =
  /^[\d\s.,:;%°+\-−–—·/()×≈<>=±…]*(km²|km|ha|dB|m|h|s|%|px)?[\d\s.,:;%°+\-−–—·/()]*$/

function ignorable(texto: string): boolean {
  const s = texto.trim()
  return s === '' || s.includes('⟦') || NUMERICO.test(s) || SIGLAS.includes(s) || NOMBRES_PROPIOS.includes(s)
}

function excluido(el: Element | null): boolean {
  return !!el?.closest('[lang="es"], [aria-hidden="true"], [data-no-traducir], [data-contenido-largo]')
}

/** Textos visibles o leídos por lector de pantalla que no pasaron por el traductor pseudo. */
export function textosSinTraducir(raiz: HTMLElement): string[] {
  const salida: string[] = []
  const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const texto = n.textContent ?? ''
    if (ignorable(texto) || excluido(n.parentElement)) continue
    salida.push(texto.trim())
  }
  for (const el of raiz.querySelectorAll('[aria-label], [title], [alt], [placeholder]')) {
    if (excluido(el)) continue
    for (const a of ['aria-label', 'title', 'alt', 'placeholder']) {
      const v = el.getAttribute(a)
      if (v !== null && !ignorable(v)) salida.push(v.trim())
    }
  }
  return salida
}
