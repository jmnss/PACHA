import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { en } from './catalogos/en'
import { es } from './catalogos/es'
import { qu } from './catalogos/qu'
import { clavesApi, slug, textoClave, valorMetrica, valoresApi } from './clavesApi'
import { formatoNumero } from './formato'
import { renderConIdioma } from './pruebas'
import { TextoApi } from './TextoApi'
import { useT } from './useT'

const claves = JSON.parse(readFileSync(resolve(__dirname, '../../../api/claves.json'), 'utf8')) as { clave: string; es: string }[]

describe('claves de la API', () => {
  it('toda clave de claves.json existe en los tres catálogos y el español es idéntico', () => {
    expect(claves.length).toBeGreaterThan(300)
    for (const { clave, es: texto } of claves) {
      expect((es as Record<string, string>)[clave], clave).toBe(texto)
      expect((en as Record<string, string>)[clave], clave).toBeTruthy()
      expect((qu as Record<string, string>)[clave], clave).toBeTruthy()
    }
  })

  it('slug en TypeScript es igual al de Python', () => {
    expect(slug('Cobertura de nubes (%)')).toBe('cobertura_de_nubes')
    expect(slug('Área quemada')).toBe('area_quemada')
    expect(slug('CO₂ emitido')).toBe('co2_emitido')
    expect(slug('Ceniza ≥ 1 cm')).toBe('ceniza_1_cm')
    expect(slug('Precisión · exhaustividad')).toBe('precision_exhaustividad')
  })

  it('las claves derivadas coinciden con las de claves.json', () => {
    const existe = (k: string) => claves.some((c) => c.clave === k)
    expect(existe(clavesApi.tipo('humedales', 'nombre'))).toBe(true)
    expect(existe(clavesApi.control('glaciares', 'retroceso_m_a', 'ayuda'))).toBe(true)
    expect(existe(clavesApi.opcion('terremotos', 'rake', 'Rumbo dextral'))).toBe(true)
    expect(existe(clavesApi.categoria('Cambio de inundación', 1))).toBe(true)
    expect(existe(clavesApi.escenario('ec_la_segua~abc', 'sitio'))).toBe(true)
    expect(existe(clavesApi.contexto('estacion', 'otoño austral'))).toBe(true)
    expect(existe(clavesApi.simHerramienta('erupcion', 'nombre'))).toBe(true)
    expect(existe(clavesApi.simControl('terremoto', 'mw', 'etiqueta'))).toBe(true)
    expect(existe(clavesApi.simOpcion('terremoto', 'pais', 'Perú'))).toBe(true)
    expect(existe(clavesApi.simMundo('Cotopaxi y el valle de Latacunga', 'descripcion'))).toBe(true)
  })

  it('formatea cifras con el idioma activo y conserva decimales', () => {
    const f = (n: number, op?: Intl.NumberFormatOptions) => formatoNumero('en', n, op)
    expect(valoresApi({ pct: 12, ha: 1113.4, fecha: '01/02/2026' }, f)).toEqual({ pct: '12.0', ha: '1,113', fecha: '01/02/2026' })
    const palabras = { mil: 'thousand', personas: 'people' }
    expect(valorMetrica('1,2 mil Mg', { valor: 1.2 }, f, palabras)).toBe('1.2 thousand Mg')
    expect(valorMetrica('18 564', { valor: 18564 }, f, palabras)).toBe('18,564')
    expect(valorMetrica('Mw 7,0', null, f, palabras)).toBe('Mw 7,0')
  })

  it('una clave desconocida nunca muestra la clave: se ve el español con lang="es"', () => {
    renderConIdioma(createElement(TextoApi, { texto: 'Texto nuevo del proveedor', clave: 'api.no.existe' }), 'en')
    expect(screen.getByText('Texto nuevo del proveedor')).toHaveAttribute('lang', 'es')
    expect(screen.queryByText('api.no.existe')).toBeNull()
  })
})

describe('textoApi: español y claves derivadas (spec §3)', () => {
  it('en español devuelve el texto de la API aunque la clave exista con otro texto', () => {
    renderConIdioma(createElement(TextoApi, { texto: 'Descripción de otro proveedor', clave: clavesApi.tipo('humedales', 'descripcion') }), 'es')
    expect(screen.getByText('Descripción de otro proveedor')).toBeInTheDocument()
  })

  it('una clave derivada por id solo traduce si el español coincide', () => {
    const { container, unmount } = renderConIdioma(createElement(TextoApi, { texto: 'Descripción de otro proveedor', clave: clavesApi.tipo('humedales', 'descripcion') }), 'en')
    expect(container.querySelector('[lang="es"]')?.textContent).toBe('Descripción de otro proveedor')
    unmount()
    renderConIdioma(createElement(TextoApi, { texto: es['api.tipo.humedales.descripcion'], clave: clavesApi.tipo('humedales', 'descripcion') }), 'en')
    expect(screen.getByText(en['api.tipo.humedales.descripcion'])).not.toHaveAttribute('lang')
  })

  it('una clave_texto emitida por la API se traduce aunque el texto no sea la plantilla', () => {
    renderConIdioma(createElement(TextoApi, { texto: 'Terremoto Mw 7,0', clave: 'api.sim.titulo.terremoto', valores: { mw: 7 } }), 'en')
    expect(screen.getByText('Earthquake Mw 7.0')).toBeInTheDocument()
  })

  it('las fechas ISO de valores_texto se escriben a la manera del idioma', () => {
    renderConIdioma(createElement(TextoApi, { texto: 'El máximo de la serie llega el 05/01/2026 con unas 12 ha.', clave: 'api.impacto.lectura.pico', valores: { fecha: '2026-01-05', ha: 12 } }), 'en')
    expect(screen.getByText(/January 5, 2026/)).toBeInTheDocument()
  })
})

describe('decimales y TextoClave (bloque C)', () => {
  const f = (n: number, op?: Intl.NumberFormatOptions) => formatoNumero('en', n, op)

  it('los decimales de la API ganan a la tabla fija DECIMALES', () => {
    expect(valoresApi({ mm: 150 }, f, undefined, { mm: 1 })).toEqual({ mm: '150.0' })
    expect(valoresApi({ pct: 12 }, f, undefined, { pct: 0 })).toEqual({ pct: '12' })
    expect(valoresApi({ pct: 12 }, f)).toEqual({ pct: '12.0' })
  })

  it('textoClave devuelve clave, valores y decimales (o nulos)', () => {
    expect(textoClave({ clave_texto: 'api.x', valores_texto: { a: 1 }, decimales_texto: { a: 2 } })).toEqual({ clave: 'api.x', valores: { a: 1 }, decimales: { a: 2 } })
    expect(textoClave(null)).toEqual({ clave: null, valores: null, decimales: null })
    expect(textoClave(undefined)).toEqual({ clave: null, valores: null, decimales: null })
  })

  it('textoApi con clave desconocida devuelve el español sin traducir', () => {
    let r: { texto: string; traducido: boolean } | undefined
    const Prueba = () => { r = useT().textoApi('Texto', 'api.no.existe', { mm: 1 }, { mm: 1 }); return null }
    renderConIdioma(createElement(Prueba), 'en')
    expect(r).toEqual({ texto: 'Texto', traducido: false })
  })
})
