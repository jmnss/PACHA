import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { dentroDeEcuador } from './dentroDeEcuador'
import { ANCLA_DATOS_REMOTA, construirEstilo, MAPAS_BASE, mapaRemotoActivo } from './estilo'
import { CIUDADES, ciudadesVisibles } from './ciudades'
import { ControlesMapa } from './ControlesMapa'
import { esquinas, pixelesDeRejilla } from './lienzo'
import { COLORES_MAPA } from './colores'

describe('dentroDeEcuador', () => {
  it('acepta Quito y Puerto Ayora (Galápagos)', () => {
    expect(dentroDeEcuador(-0.18, -78.47)).toBe(true)
    expect(dentroDeEcuador(-0.74, -90.31)).toBe(true)
  })
  it('rechaza Lima y el Pacífico', () => {
    expect(dentroDeEcuador(-12.05, -77.04)).toBe(false)
    expect(dentroDeEcuador(-1, -83)).toBe(false)
  })
  it('rechaza valores no finitos', () => {
    expect(dentroDeEcuador(NaN, -78)).toBe(false)
  })
})

describe('CapaLienzo (píxeles)', () => {
  it('deja el 0 transparente y pinta el resto', () => {
    const datos = new Uint8Array([0, 1, 128, 255])
    const rej = { bbox: [0, 0, 1, 1] as [number, number, number, number], columnas: 2, filas: 2, vmin: 0, vmax: 1, datos_b64: btoa(String.fromCharCode(...datos)) }
    const px = pixelesDeRejilla(rej, 'agua')
    expect(px.data[3]).toBe(0)
    expect(px.data[7]).toBe(255)
    expect(px.data[11]).toBe(255)
    expect(px.width).toBe(2)
    expect(px.height).toBe(2)
  })
  it('conserva el orden de filas: la fila 0 (norte) queda arriba y la columna 0 al oeste', () => {
    // Rejilla 2×2 asimétrica: solo el píxel noreste (fila 0, columna 1) tiene dato.
    const datos = new Uint8Array([0, 255, 0, 0])
    const rej = { bbox: [0, 0, 1, 1] as [number, number, number, number], columnas: 2, filas: 2, vmin: 0, vmax: 1, datos_b64: btoa(String.fromCharCode(...datos)) }
    const px = pixelesDeRejilla(rej, 'agua')
    const alfa = (f: number, c: number) => px.data[(f * 2 + c) * 4 + 3]
    expect(alfa(0, 1)).toBe(255)
    expect(alfa(0, 0)).toBe(0)
    expect(alfa(1, 0)).toBe(0)
    expect(alfa(1, 1)).toBe(0)
    // La primera esquina (origen de la imagen) es el noroeste.
    expect(esquinas([-80, -1, -79, 0])[0]).toEqual([-80, 0])
  })
  it('esquinas: noroeste, noreste, sureste, suroeste', () => {
    expect(esquinas([-80, -1, -79, 0])).toEqual([[-80, 0], [-79, 0], [-79, -1], [-80, -1]])
  })
})

describe('estilo', () => {
  it('funciona sin la fuente remota y no contiene URLs', () => {
    const e = construirEstilo({ remoto: false })
    expect(Object.keys(e.sources).sort()).toEqual(['contorno', 'exterior', 'provincias'])
    expect(JSON.stringify(e)).not.toMatch(/arcgisonline|openfreemap/i)
    expect(JSON.stringify(e)).not.toMatch(/https?:/)
    expect(e.glyphs).toBeUndefined()
    expect(e.sprite).toBeUndefined()
    expect(e.layers.map((l) => l.id)).toEqual(['fondo', 'tierra', 'provincias', 'provincias-linea', 'exterior', 'frontera'])
  })
  it('con remoto incluye una fuente por mapa base y por etiquetas, con el orden base → etiquetas → máscara', () => {
    const e = construirEstilo({ remoto: true })
    for (const id of ['base-oscuro', 'base-satelite', 'base-relieve', 'etiquetas-oscuro', 'etiquetas-lugares']) {
      expect(e.sources[id].type).toBe('raster')
    }
    expect(MAPAS_BASE.map((b) => b.nombre)).toEqual(['Oscuro', 'Satélite', 'Relieve'])
    const ids = e.layers.map((l) => l.id)
    const pos = (id: string) => ids.indexOf(id)
    expect(pos('provincias-linea')).toBeLessThan(pos('base-oscuro'))
    expect(pos('base-relieve')).toBeLessThan(pos(ANCLA_DATOS_REMOTA)) // los datos se insertan en el ancla
    expect(pos(ANCLA_DATOS_REMOTA)).toBeLessThan(pos('etiquetas-lugares'))
    expect(pos('etiquetas-lugares')).toBeLessThan(pos('exterior'))
    expect(pos('exterior')).toBeLessThan(pos('frontera'))
  })
  it('solo el mapa base elegido y sus etiquetas están visibles', () => {
    const visibles = (base: 'oscuro' | 'satelite' | 'relieve') =>
      construirEstilo({ remoto: true, base }).layers.filter((l) => l.layout?.visibility === 'visible').map((l) => l.id)
    expect(visibles('oscuro')).toEqual(['base-oscuro', 'etiquetas-oscuro'])
    expect(visibles('satelite')).toEqual(['base-satelite', 'etiquetas-lugares'])
    expect(visibles('relieve')).toEqual(['base-relieve', 'etiquetas-lugares']) // World_Terrain_Base no trae etiquetas: van encima de los datos
  })
  it('las URLs de las teselas son las de Esri, sin claves', () => {
    const urls = Object.values(construirEstilo({ remoto: true }).sources).flatMap((s) => ('tiles' in s ? s.tiles ?? [] : []))
    expect(urls).toHaveLength(5)
    for (const u of urls) {
      expect(u).toMatch(/^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/.+\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}$/)
    }
  })
  it('usa los colores del diseño', () => {
    expect(COLORES_MAPA.tierra).toBe('#2E3336')
    expect(COLORES_MAPA.provincia).toBe('#3A4044')
  })
  it('la capa remota se desactiva con VITE_MAPA_REMOTO=0', () => {
    vi.stubEnv('VITE_MAPA_REMOTO', '0')
    expect(mapaRemotoActivo()).toBe(false)
    vi.unstubAllEnvs()
  })
})

describe('MapaBase', () => {
  it('monta con maplibre-gl simulado y atribuye geoBoundaries', async () => {
    const on = vi.fn()
    vi.resetModules()
    vi.doMock('maplibre-gl', () => ({
      default: { Map: vi.fn(() => ({ on, remove: vi.fn(), fitBounds: vi.fn() })), Marker: vi.fn() },
    }))
    vi.doMock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
    const { MapaBase } = await import('./MapaBase')
    const { getByText, getByTestId } = render(<MapaBase />)
    expect(getByTestId('mapa')).toBeTruthy()
    expect(getByText('geoBoundaries')).toBeTruthy()
    expect(on).toHaveBeenCalledWith('click', expect.any(Function))
    vi.doUnmock('maplibre-gl')
  })
})

describe('ciudades', () => {
  it('no hay duplicados ni nombres vacíos', () => {
    const nombres = CIUDADES.map((c) => c.nombre.trim())
    expect(nombres.every((n) => n.length > 0)).toBe(true)
    expect(new Set(nombres).size).toBe(nombres.length)
    expect(CIUDADES.length).toBeGreaterThanOrEqual(24)
  })
  it('cada ciudad cae dentro de Ecuador', () => {
    const fuera = CIUDADES.filter((c) => !dentroDeEcuador(c.lat, c.lon)).map((c) => c.nombre)
    expect(fuera).toEqual([])
  })
  it('con el país entero solo se muestran las principales', () => {
    expect(ciudadesVisibles(5).map((c) => c.nombre)).toEqual(['Quito', 'Guayaquil', 'Cuenca'])
    expect(ciudadesVisibles(9)).toHaveLength(CIUDADES.length)
  })
})

describe('ControlesMapa', () => {
  it('cambiar de pestaña cambia el mapa base y el deslizador cambia la opacidad', () => {
    const onBase = vi.fn()
    const onOpacidad = vi.fn()
    const { getByRole } = render(<ControlesMapa base="oscuro" onBase={onBase} opacidad={0.85} onOpacidad={onOpacidad} conBases />)
    fireEvent.click(getByRole('radio', { name: 'Satélite' }))
    expect(onBase).toHaveBeenCalledWith('satelite')
    expect(getByRole('radio', { name: 'Oscuro' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.change(getByRole('slider', { name: 'Opacidad de la capa' }), { target: { value: '50' } })
    expect(onOpacidad).toHaveBeenCalledWith(0.5)
  })
  it('sin red no ofrece mapas base', () => {
    const { queryByRole } = render(<ControlesMapa base="oscuro" onBase={vi.fn()} opacidad={1} onOpacidad={vi.fn()} conBases={false} />)
    expect(queryByRole('radio')).toBeNull()
  })
})
