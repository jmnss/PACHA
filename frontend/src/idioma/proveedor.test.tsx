import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { ProveedorIdioma } from './ProveedorIdioma'
import { TextoApi } from './TextoApi'
import { renderConIdioma, textosSinTraducir } from './pruebas'
import { useT } from './useT'

function Sonda() {
  const { idioma, cambiarIdioma, t } = useT()
  return (
    <div>
      <span data-testid="idioma">{idioma}</span>
      <span data-testid="ayuda">{t('idioma.selector.etiqueta')}</span>
      <button onClick={() => cambiarIdioma('en')}>a-en</button>
    </div>
  )
}

function Contador() {
  const [n, setN] = useState(0)
  const { cambiarIdioma } = useT()
  return (
    <div>
      <span data-testid="n">{n}</span>
      <button onClick={() => setN(n + 1)}>mas</button>
      <button onClick={() => cambiarIdioma('en')}>en</button>
    </div>
  )
}

function idiomas(l: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(l)
}

beforeEach(() => {
  window.localStorage.clear()
  window.history.replaceState(null, '', '/')
  document.documentElement.lang = ''
})
afterEach(() => vi.restoreAllMocks())

const montar = () =>
  render(
    <ProveedorIdioma>
      <Sonda />
    </ProveedorIdioma>,
  )

describe('ProveedorIdioma', () => {
  it('usa localStorage y fija lang', () => {
    window.localStorage.setItem('nisar.idioma', 'en')
    montar()
    expect(screen.getByTestId('idioma').textContent).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it.each([
    [['qu-EC'], 'qu'],
    [['fr-FR', 'en-US'], 'en'],
    [['fr-FR'], 'es'],
  ])('idioma del navegador %j -> %s', (langs, esperado) => {
    idiomas(langs)
    montar()
    expect(screen.getByTestId('idioma').textContent).toBe(esperado)
  })

  it('sobrevive a un localStorage que lanza y cambia en memoria', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    idiomas(['es-EC'])
    montar()
    expect(screen.getByTestId('idioma').textContent).toBe('es')
    act(() => screen.getByText('a-en').click())
    expect(screen.getByTestId('idioma').textContent).toBe('en')
    expect(screen.getByTestId('ayuda').textContent).not.toBe('Idioma')
  })

  it('con un localStorage que lanza arranca en el idioma del navegador (Review Focus 1)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    idiomas(['en-US'])
    montar()
    expect(screen.getByTestId('idioma').textContent).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('un ?idioma= no válido se borra de la URL y cae al siguiente criterio', () => {
    window.localStorage.setItem('nisar.idioma', 'en')
    window.history.replaceState(null, '', '/?idioma=zz&escenario=x')
    montar()
    expect(screen.getByTestId('idioma').textContent).toBe('en')
    expect(window.location.search).toBe('?escenario=x')
    expect(window.localStorage.getItem('nisar.idioma')).toBe('en')
  })

  it('un ?idioma= no válido sin nada guardado cae al navegador', () => {
    idiomas(['qu-EC'])
    window.history.replaceState(null, '', '/?idioma=zz')
    montar()
    expect(screen.getByTestId('idioma').textContent).toBe('qu')
    expect(window.location.search).toBe('')
  })

  it('aplica ?idioma=, lo guarda y lo borra de la URL', () => {
    window.history.replaceState(null, '', '/?idioma=qu&escenario=x')
    montar()
    expect(screen.getByTestId('idioma').textContent).toBe('qu')
    expect(window.localStorage.getItem('nisar.idioma')).toBe('qu')
    expect(window.location.search).toBe('?escenario=x')
  })

  it('cambiar de idioma no desmonta a los hijos', () => {
    render(
      <ProveedorIdioma inicial="es">
        <Contador />
      </ProveedorIdioma>,
    )
    for (let i = 0; i < 3; i++) act(() => screen.getByText('mas').click())
    act(() => screen.getByText('en').click())
    expect(screen.getByTestId('n').textContent).toBe('3')
  })
})

describe('TextoApi', () => {
  it('clave desconocida: texto en español con lang="es", sin la clave', () => {
    const { container } = renderConIdioma(<TextoApi texto="Inundación" clave="api.no.existe" />, 'en')
    const span = container.querySelector('span[lang="es"]')
    expect(span?.textContent).toBe('Inundación')
    expect(span?.getAttribute('title')).toBeTruthy()
    expect(container.innerHTML).not.toContain('api.no.existe')
  })

  it('clave conocida: texto traducido', () => {
    const { container } = renderConIdioma(<TextoApi texto="x" clave="idioma.selector.etiqueta" />, 'en')
    expect(container.textContent).toBe('Language')
  })

  it('en español no lleva title', () => {
    const { container } = renderConIdioma(<TextoApi texto="Hola" />, 'es')
    expect(container.querySelector('span')?.hasAttribute('title')).toBe(false)
  })
})

describe('textosSinTraducir', () => {
  const de = (html: string) => {
    const d = document.createElement('div')
    d.innerHTML = html
    return textosSinTraducir(d)
  }
  it('detecta y descarta', () => {
    expect(de('<p>Hola</p>')).toEqual(['Hola'])
    expect(de('<p>⟦Hola⟧</p>')).toEqual([])
    expect(de('<p lang="es">Hola</p>')).toEqual([])
    expect(de('<p>12,5 km²</p>')).toEqual([])
    expect(de('<p>HV</p>')).toEqual([])
    expect(de('<p aria-label="Hola">⟦x⟧</p>')).toEqual(['Hola'])
  })
})

describe('ProveedorIdioma · evento storage', () => {
  const evento = (key: string | null, newValue: string | null) => act(() => { window.dispatchEvent(new StorageEvent('storage', { key, newValue })) })

  it('aplica el idioma nuevo de la clave nisar.idioma', () => {
    idiomas(['es-EC'])
    montar()
    expect(screen.getByTestId('idioma').textContent).toBe('es')
    evento('nisar.idioma', 'en')
    expect(screen.getByTestId('idioma').textContent).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('ignora otras claves y valores inválidos', () => {
    idiomas(['es-EC'])
    montar()
    evento('otra.clave', 'en')
    evento('nisar.idioma', 'fr')
    evento('nisar.idioma', null)
    expect(screen.getByTestId('idioma').textContent).toBe('es')
  })
})
