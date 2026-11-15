import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ControlSegmentado } from './ControlSegmentado'
import { Pestanas } from './Pestanas'
import { propsPanel } from './panelPestana'
import { Redirigir } from './Redirigir'
import { SubNavegacion } from './SubNavegacion'

function Donde() {
  const l = useLocation()
  return <p data-testid="donde">{l.pathname}{l.search}{l.hash}</p>
}

describe('ControlSegmentado', () => {
  const opciones = [{ id: 'a', etiqueta: 'A' }, { id: 'b', etiqueta: 'B' }]
  it('es un radiogroup con una sola opción marcada, no pestañas', () => {
    render(<ControlSegmentado etiqueta="Capa" valor="b" onCambiar={() => {}} opciones={opciones} />)
    expect(screen.getByRole('radiogroup', { name: 'Capa' })).toBeInTheDocument()
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('aria-checked', 'false')
  })
  it('las flechas eligen la vecina', () => {
    const cambiar = vi.fn()
    render(<ControlSegmentado etiqueta="Capa" valor="a" onCambiar={cambiar} opciones={opciones} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'A' }), { key: 'ArrowRight' })
    expect(cambiar).toHaveBeenCalledWith('b')
  })
})

describe('Pestanas con tabpanel', () => {
  it('cada pestaña apunta a su panel y el panel a su pestaña', () => {
    render(<>
      <Pestanas etiqueta="Vistas" activa="b" onCambiar={() => {}} pestanas={[{ id: 'a', etiqueta: 'A' }, { id: 'b', etiqueta: 'B' }]} />
      <div {...propsPanel('b')}>contenido</div>
    </>)
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-controls', 'panel-b')
    expect(screen.getByRole('tabpanel', { name: 'B' })).toHaveAttribute('id', 'panel-b')
  })
})

describe('SubNavegacion', () => {
  it('son enlaces con aria-current, no pestañas', () => {
    render(
      <MemoryRouter initialEntries={['/explorar/observatorio']}>
        <SubNavegacion etiqueta="estructura.sub.explorar" enlaces={[
          { ruta: '/explorar/historias', etiqueta: 'estructura.sub.historias' },
          { ruta: '/explorar/observatorio', etiqueta: 'estructura.sub.observatorio' },
        ]} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.getByRole('link', { name: 'Observatorio' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Historias' })).not.toHaveAttribute('aria-current')
  })
})

describe('Redirigir', () => {
  it('conserva la query y el hash', () => {
    render(
      <MemoryRouter initialEntries={['/observatorio?escenario=ec_x&vista=serie#r']}>
        <Routes>
          <Route path="observatorio" element={<Redirigir a="/explorar/observatorio" />} />
          <Route path="explorar/observatorio" element={<Donde />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('donde')).toHaveTextContent('/explorar/observatorio?escenario=ec_x&vista=serie#r')
  })
})
