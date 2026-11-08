import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Catalogo, Herramienta, MundoDto } from '../../api/simulador'
import { renderConIdioma, renderPseudo, textosSinTraducir } from '../../idioma/pruebas'
import { Bitacora } from './Bitacora'
import { csvBitacora, entradaDeEvento, lugarTexto } from './bitacora'
import { ESTADO_INICIAL } from './estadoSimulador'
import { EsperaRadar } from './EsperaRadar'
import { INCENDIO, MUNDO, ORIGEN, TERREMOTO } from './fixtures'
import { GemeloRadar } from './GemeloRadar'
import { lineasInforme } from './informe'
import { PanelHerramienta } from './PanelHerramienta'
import { PanelMundo } from './PanelMundo'
import { ResultadosEvento } from './ResultadosEvento'
import { Tablero } from './Tablero'
import { useBorradorMundo } from './useBorradorMundo'
import { valoresIniciales } from './valores'
import { traductor } from '../../idioma/traductor'


// Los rótulos del comparador los escribe la API como texto plano (sin clave hasta el Bloque 4).
vi.mock('../../comparador/Comparador', () => ({
  Comparador: (p: { etiquetaAntes: string; etiquetaDespues: string }) => <div lang="es">{p.etiquetaAntes} | {p.etiquetaDespues}</div>,
}))

const H = {
  id: 'incendio', icono: '', nombre: 'Incendio', controles: [
    { id: 'viento_ms', etiqueta: 'Viento', tipo: 'numero', minimo: 0, maximo: 20, paso: 0.5, defecto: 6, opciones: null, ayuda: 'Se mide a 10 m.', unidad: 'm/s', escala: 1 },
    { id: 'mecanismo', etiqueta: 'Mecanismo', tipo: 'seleccion', minimo: null, maximo: null, paso: null, defecto: 'Normal', opciones: ['Normal', 'Inversa'], ayuda: '', unidad: '', escala: 1 },
    { id: 'tsunami', etiqueta: 'Tsunami', tipo: 'interruptor', minimo: null, maximo: null, paso: null, defecto: true, opciones: null, ayuda: '', unidad: '', escala: 1 },
    { id: 'nombre', etiqueta: 'Nombre', tipo: 'texto', minimo: null, maximo: null, paso: null, defecto: 'Nueva', opciones: null, ayuda: '', unidad: '', escala: 1 },
  ],
} as unknown as Herramienta

const CATALOGO = {
  extensiones_km: [20, 30], herramientas: [H],
  mundos: [{ nombre: 'Loja', lat: -4.05, lon: -79.25, extension_km: 30, herramienta: 'incendio', descripcion: 'Bosque seco.' }],
} as unknown as Catalogo

const MUNDO_MARCAS = { ...MUNDO, marcas: [{ x: 0.2, y: 0.5, texto: 'Loja', tipo: 'ciudad' }, { x: 0.8, y: 0.2, texto: 'Cotopaxi', tipo: 'volcan' }] } as unknown as MundoDto

const ACTUAL_MUNDO = { lat: -4.05, lon: -79.25, ext: 30, fecha: '2026-08-15', dem: true }
function ConBorrador() {
  const borrador = useBorradorMundo(CATALOGO, ACTUAL_MUNDO)
  return <PanelMundo catalogo={CATALOGO} cargando={false} onCrear={() => {}} borrador={borrador} />
}

beforeEach(() => localStorage.clear())

describe('simulador · idioma', () => {
  it('el tablero no deja texto sin traducir', () => {
    const { container } = renderPseudo(<Tablero mundo={MUNDO_MARCAS} indice={0} cursor={null} onCelda={() => {}} onCursor={() => {}} />)
    expect(textosSinTraducir(container)).toEqual([])
  })

  it('el panel de herramienta no deja texto sin traducir', () => {
    const { container } = renderPseudo(<PanelHerramienta herramienta={H} valores={valoresIniciales(H, {})} onCambio={() => {}} />)
    expect(textosSinTraducir(container)).toEqual([])
  })

  it('el panel del mundo no deja texto sin traducir', () => {
    const { container } = renderPseudo(
      <ConBorrador />,
    )
    expect(textosSinTraducir(container)).toEqual([])
  })

  it('los resultados no dejan texto sin traducir (tabla y notas del modelo quedan con lang="es")', () => {
    const { container } = renderPseudo(<ResultadosEvento evento={INCENDIO} mundo={MUNDO} estado={{ ...ESTADO_INICIAL, i: 60, j: 60 }} />)
    expect(textosSinTraducir(container)).toEqual([])
    expect(container.querySelector('td[lang="es"]')).not.toBeNull()
    expect(screen.getByText('Nota del modelo.')).toHaveAttribute('lang', 'es')
  })

  it('el gemelo y la espera no dejan texto sin traducir', () => {
    const { container } = renderPseudo(<><GemeloRadar evento={INCENDIO} /><EsperaRadar espera={TERREMOTO.espera_radar} origen={ORIGEN} /></>)
    expect(textosSinTraducir(container)).toEqual([])
  })

  it('la bitácora, con entradas nuevas y antiguas, no deja texto sin traducir', () => {
    const nueva = entradaDeEvento(INCENDIO, MUNDO, '?a=1')
    const antigua = { ...nueva, lat: undefined, lon: undefined, region: undefined, lugar: '4.050° S, 79.250° O · Sierra', enlace: '?b=2' }
    const { container } = renderPseudo(<Bitacora entradas={[nueva, antigua]} origen={ORIGEN} onVaciar={() => {}} />)
    expect(textosSinTraducir(container)).toEqual([])
  })

  it('la espera del radar mantiene «supuesto, pendiente de confirmar» en los tres idiomas', () => {
    const textos = { es: /pendiente de confirmar con la documentación oficial/, en: /assumed repeat cycle.*pending confirmation with the official documentation/, qu: /yuyashka ciclowan \(kamachik panka-wan chiqanyachina kan\)/ }
    for (const [idioma, patron] of Object.entries(textos) as ['es' | 'en' | 'qu', RegExp][]) {
      const { container, unmount } = renderConIdioma(<EsperaRadar espera={INCENDIO.espera_radar} origen={ORIGEN} />, idioma)
      expect(container.textContent).toMatch(patron)
      unmount()
    }
  })

  it('el CSV de la bitácora en inglés traduce las columnas, añade «# idioma» y mantiene «# origen» en español', () => {
    const t = traductor('en').t
    const csv = csvBitacora([entradaDeEvento(INCENDIO, MUNDO, '?a=1')], ORIGEN, t, 'en')
    const lineas = csv.split('\n')
    expect(lineas[0]).toBe('# origen: sintético')
    expect(csv).toContain('# DATOS DE DEMOSTRACIÓN')
    expect(csv).toContain('# idioma: en')
    expect(csv).toContain('Event,Place,Season,Area (km²)')
    expect(csv).toContain('4.050° S, 79.250° W · Sierra')
  })

  it('el lugar de una entrada nueva se arma con el idioma; el de una antigua conserva su frase', () => {
    const e = entradaDeEvento(INCENDIO, MUNDO, '?a=1')
    expect(lugarTexto(e, traductor('es').t)).toBe('4.050° S, 79.250° O · Sierra')
    expect(lugarTexto(e, traductor('en').t)).toBe('4.050° S, 79.250° W · Sierra')
    expect(lugarTexto({ ...e, lat: undefined, lon: undefined, region: undefined, lugar: 'frase antigua' }, traductor('en').t)).toBe('frase antigua')
  })

  it('el informe lleva el aviso de simulación en los tres idiomas', () => {
    expect(lineasInforme(INCENDIO, MUNDO, traductor('es').t).join('\n')).toContain('no son observaciones reales de NISAR')
    expect(lineasInforme(INCENDIO, MUNDO, traductor('en').t).join('\n')).toContain('not real NISAR observations')
    expect(lineasInforme(INCENDIO, MUNDO, traductor('qu').t).join('\n')).toContain('mana NISAR-pa chiqan rikuychu')
  })
})
