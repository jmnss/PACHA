import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Herramienta } from '../../api/simulador'
import { renderConIdioma } from '../../idioma/pruebas'
import { AccionesSugeridas } from './AccionesSugeridas'
import { INCENDIO } from './fixtures'

const HERRAMIENTA = {
  id: 'incendio', icono: '', nombre: 'Incendio',
  controles: [{ id: 'viento_ms', etiqueta: 'Viento', tipo: 'numero', minimo: 0, maximo: 20, paso: 0.5, defecto: 6, opciones: null, ayuda: '', unidad: 'm/s', escala: 1 }],
} as unknown as Herramienta

const montar = (idioma: 'es' | 'en' = 'es') =>
  renderConIdioma(<AccionesSugeridas evento={INCENDIO} herramienta={HERRAMIENTA} parametros={{ viento_ms: 8 }} lugar="Cerro Casitagua" />, idioma)

afterEach(() => vi.restoreAllMocks())

describe('AccionesSugeridas', () => {
  it('agrupa por momento, avisa de ECU 911 y enlaza cada fuente', () => {
    montar()
    expect(screen.getByRole('heading', { name: 'Qué hacer: acciones sugeridas' })).toBeInTheDocument()
    expect(screen.getByText(/en una emergencia real sigue a las autoridades \(ECU 911\)/)).toBeInTheDocument()
    expect(screen.getByText('Antes · preparación')).toBeInTheDocument()
    expect(screen.getByText('Durante · respuesta')).toBeInTheDocument()
    expect(screen.getByText('Después · recuperación')).toBeInTheDocument()
    const enlaces = screen.getAllByRole('link', { name: /Ready\.gov/ })
    expect(enlaces).toHaveLength(3)
    for (const a of enlaces) expect(a).toHaveAttribute('href', 'https://www.ready.gov/wildfires')
    expect(screen.getByText('Prioritaria')).toBeInTheDocument()
  })

  it('«Pregúntale a tu IA» copia un prompt con el escenario y las acciones', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true })
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Pregúntale a tu IA' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copiado'))
    const prompt = escribir.mock.calls[0][0] as string
    expect(prompt).toContain('Cerro Casitagua')
    expect(prompt).toContain('Viento: 8 m/s')
    expect(prompt).toContain('Área quemada: 12,3 km²')
    expect(prompt).toContain('avisa enseguida al 911')
    expect(prompt).toContain('https://www.ready.gov/wildfires')
    expect(prompt).toContain('ECU 911')
  })

  it('si el portapapeles falla, ofrece el texto para copiarlo a mano', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('no')) }, configurable: true })
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true })
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Pregúntale a tu IA' }))
    const area = await screen.findByLabelText('Texto para tu asistente de IA')
    expect((area as HTMLTextAreaElement).value).toContain('Cerro Casitagua')
  })

  it('en inglés el prompt y los momentos van en inglés', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true })
    montar('en')
    expect(screen.getByText('Before · preparedness')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ask your AI' }))
    await waitFor(() => expect(escribir).toHaveBeenCalled())
    expect(escribir.mock.calls[0][0]).toContain('Answer in English.')
  })
})
