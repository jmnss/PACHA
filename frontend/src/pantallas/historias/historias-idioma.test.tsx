import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { traductor } from '../../idioma/traductor'
import type { CodigoIdioma } from '../../idioma/idiomas'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../../idioma/pruebas'
import { HISTORIAS, historiasDe, terminosDe } from './contenido'
import type { ContenidoHistoria, Parrafo } from './contenido/tipos'
import Historias from './Historias'

const IDIOMAS: CodigoIdioma[] = ['es', 'en', 'qu']
const origen = { tipo: 'sintetico', fuente: 'Generador de demostración', generador: 'datos/generador.py', version: '1', semilla: 7, fecha_generacion: '2026-11-04T00:00:00Z' }
const BBOX = [-80.24, -0.74, -80.16, -0.66]
const rejilla = { filas: 2, columnas: 2, vmin: -20, vmax: -2, bbox: BBOX, datos_b64: btoa(String.fromCharCode(1, 80, 160, 255)) }
const fechas = ['2026-04-12', '2026-04-24', '2026-05-06', '2026-05-18']
const escenario = (id: string, historia: string) => ({
  id, nombre: `Escenario ${id}`, tipo_cambio: 'x', historia, region: 'Costa', bbox: BBOX, resolucion_m: 100,
  polarizaciones: ['HH', 'HV'], variables: ['sigma0'], origen,
  capacidades: { simulacion: true, modelo_continuo: true, verdad_terreno: true },
  adquisiciones: fechas.map((f) => ({ id: f, instante: `${f}T00:00:00Z`, direccion_orbital: 'Ascendente', polarizaciones: ['HH', 'HV'] })),
})
const capa = (pol: string) => ({ escenario_id: 'x', adquisicion_id: null, instante: null, polarizacion: pol, origen, rejilla, variable: 'sigma0', paleta: 'gris', unidad: 'dB', leyenda: null })
const json = (x: unknown) => Promise.resolve(new Response(JSON.stringify(x)))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/escenarios') return json([escenario('ec_agua', 'inundacion'), escenario('ec_fuego', 'incendio')])
    if (url.startsWith('/api/contexto')) return json(null)
    if (url.endsWith('/cambio')) {
      const pol = JSON.parse(String(init?.body)).polarizacion
      return json({
        antes: capa(pol), despues: capa(pol), cambio: capa(pol), capas_extra: [], clasificacion: null, tablas: [], vectores: null, origen,
        notas: [], metricas: [], series: [{ titulo: 'Superficie inundada', unidad: 'km²', puntos: fechas.map((f, i) => [f, [20, 28, 10, 5][i], 'Detectada']) }],
      })
    }
    return json({ mensaje: 'no previsto' })
  }))
})
afterEach(() => { vi.unstubAllGlobals() })

const montar = (ruta = '/') => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[ruta]}><Historias /></MemoryRouter>
  </QueryClientProvider>
)

// Datos ya formateados por el idioma activo (fechas) y el rótulo σ⁰ + polarización + unidad: no son texto de catálogo.
const DATO = /^(\d{1,2} )?[A-Z][a-z]{2}( \d{1,2})?( \d{4})?$|^σ⁰ (HH|HV), dB$/
const sinDatos = (c: HTMLElement) => textosSinTraducir(c).filter((x) => !DATO.test(x))

const aTexto = (p: Parrafo) => p.map((s) => (typeof s === 'string' ? s : s.termino)).join('')
const terminosDeParrafo = (p: Parrafo) => p.flatMap((s) => (typeof s === 'string' ? [] : [s.termino])).sort()
const partes = (h: ContenidoHistoria) => [
  ...h.queCambia.parrafos, ...h.queVeElRadar.parrafos, ...h.comparador.introduccion, h.comparador.porQue, h.comparador.otra,
  ...h.hipotesis.parrafos, ...h.aplicaciones.parrafos,
]

describe('Historias · contenido en tres idiomas', () => {
  it('el español es el contenido de siempre', () => {
    expect(historiasDe('es')).toBe(HISTORIAS)
    expect(HISTORIAS.map((h) => h.clave)).toEqual(['inundacion', 'incendio'])
    expect(HISTORIAS[0].titulo).toBe('Cuando el agua sube en la Costa baja')
    expect(HISTORIAS[1].titulo).toBe('Cuando arde el bosque en la Sierra')
    expect(terminosDe('es').radar.nombre).toBe('radar de apertura sintética')
  })

  for (const idioma of IDIOMAS) {
    describe(idioma, () => {
      const { t } = traductor(idioma)
      const historias = historiasDe(idioma)

      it('misma estructura que el español: partes, párrafos y términos', () => {
        expect(historias.map((h) => h.clave)).toEqual(HISTORIAS.map((h) => h.clave))
        historias.forEach((h, i) => {
          const base = HISTORIAS[i]
          expect(h.comparador.polarizacion).toBe(base.comparador.polarizacion)
          const mio = partes(h)
          const suyo = partes(base)
          expect(mio.map((p) => p.length > 0)).toEqual(suyo.map(() => true))
          expect(mio.map(terminosDeParrafo)).toEqual(suyo.map(terminosDeParrafo))
          expect(h.queCambia.parrafos).toHaveLength(base.queCambia.parrafos.length)
          expect(h.queVeElRadar.parrafos).toHaveLength(base.queVeElRadar.parrafos.length)
          expect(h.hipotesis.parrafos).toHaveLength(base.hipotesis.parrafos.length)
          expect(h.aplicaciones.parrafos).toHaveLength(base.aplicaciones.parrafos.length)
          for (const x of [h.titulo, h.etiqueta, h.resumen, h.queCambia.titulo, h.queVeElRadar.titulo, h.comparador.titulo, h.hipotesis.titulo, h.aplicaciones.titulo])
            expect(x.trim()).not.toBe('')
        })
      })

      it('mismas claves de término, todas con nombre y explicación', () => {
        expect(Object.keys(terminosDe(idioma)).sort()).toEqual(Object.keys(terminosDe('es')).sort())
        for (const d of Object.values(terminosDe(idioma))) {
          expect(d.nombre.trim()).not.toBe('')
          expect(d.explicacion.trim()).not.toBe('')
        }
      })

      it('la hipótesis conserva la marca de ejemplo ilustrativo', () => {
        for (const h of historias)
          for (const p of h.hipotesis.parrafos) expect(aTexto(p).startsWith(t('historias.marca.ejemplo'))).toBe(true)
      })

      it('lo específico de la misión y las aplicaciones futuras llevan «pendiente de confirmar»', () => {
        const marca = t('historias.marca.pendiente')
        for (const h of historias) {
          expect(aTexto(h.queVeElRadar.parrafos[h.queVeElRadar.parrafos.length - 1])).toContain(marca)
          expect(aTexto(h.aplicaciones.parrafos[0])).toContain(marca)
        }
      })
    })
  }
})

describe('Historias · pantalla traducida', () => {
  it('renderPseudo no deja texto de interfaz sin traducir (cargando y con historia)', async () => {
    const { container } = renderPseudo(montar())
    expect(sinDatos(container)).toEqual([])
    await screen.findByRole('figure')
    expect(sinDatos(container)).toEqual([])
    expect(container.querySelectorAll('[data-contenido-largo]').length).toBeGreaterThan(0)
  })

  for (const idioma of ['en', 'qu'] as const) {
    it(`muestra el contenido largo en ${idioma}`, async () => {
      const h = historiasDe(idioma)
      const { container } = renderConIdioma(montar(), idioma)
      expect(await screen.findByRole('heading', { name: h[0].titulo })).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 3 }).map((x) => x.textContent)).toEqual([
        h[0].queCambia.titulo, h[0].queVeElRadar.titulo, h[0].comparador.titulo, h[0].hipotesis.titulo, h[0].aplicaciones.titulo,
      ])
      expect(container.querySelector('[data-contenido-largo]')).not.toBeNull()
      expect(screen.getByRole('link', { name: traductor(idioma).t('historias.comparador.ver_observatorio') })).toBeInTheDocument()
    })
  }
})
