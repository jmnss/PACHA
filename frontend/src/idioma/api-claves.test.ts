import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { en } from './catalogos/en'
import { es } from './catalogos/es'
import { qu } from './catalogos/qu'
import { clavesApi, slug, valorMetrica, valoresApi } from './clavesApi'
import { formatoNumero } from './formato'
import { renderConIdioma } from './pruebas'
import { TextoApi } from './TextoApi'

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
