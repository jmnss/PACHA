import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Herramienta } from '../../api/simulador'
import { PanelHerramienta } from './PanelHerramienta'
import { valoresIniciales } from './valores'

const H = {
  id: 'incendio', icono: '', nombre: 'Incendio', controles: [
    { id: 'viento_ms', etiqueta: 'Viento', tipo: 'numero', minimo: 0, maximo: 20, paso: 0.5, defecto: 6, opciones: null, ayuda: '', unidad: 'm/s', escala: 1 },
    { id: 'humedad_comb', etiqueta: 'Humedad del combustible', tipo: 'numero', minimo: 0.03, maximo: 0.35, paso: 0.01, defecto: 0.15, opciones: null, ayuda: 'Se deriva del suelo.', unidad: '%', escala: 100 },
    { id: 'mecanismo', etiqueta: 'Mecanismo', tipo: 'seleccion', minimo: null, maximo: null, paso: null, defecto: 'Normal', opciones: ['Normal', 'Inversa'], ayuda: '', unidad: '', escala: 1 },
    { id: 'tsunami', etiqueta: 'Tsunami', tipo: 'interruptor', minimo: null, maximo: null, paso: null, defecto: true, opciones: null, ayuda: '', unidad: '', escala: 1 },
  ],
} as unknown as Herramienta

describe('PanelHerramienta', () => {
  it('los controles salen del catálogo, con la escala de la interfaz', () => {
    render(<PanelHerramienta herramienta={H} valores={valoresIniciales(H, { humedad_comb: 0.2 })} onCambio={() => {}} />)
    expect(screen.getByLabelText('Viento')).toHaveValue('6')
    expect(screen.getByText('20 %')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Mecanismo' })).toHaveValue('Normal')
    expect(screen.getByRole('switch', { name: 'Tsunami' })).toHaveAttribute('aria-checked', 'true')
  })

  it('cambiar un control avisa con el valor en unidades del modelo', () => {
    const onCambio = vi.fn()
    render(<PanelHerramienta herramienta={H} valores={valoresIniciales(H, {})} onCambio={onCambio} />)
    fireEvent.change(screen.getByLabelText('Humedad del combustible'), { target: { value: '0.2' } })
    expect(onCambio).toHaveBeenCalledWith('humedad_comb', 0.2)
    fireEvent.click(screen.getByRole('switch', { name: 'Tsunami' }))
    expect(onCambio).toHaveBeenCalledWith('tsunami', false)
  })
})
