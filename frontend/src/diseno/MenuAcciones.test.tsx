import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MenuAcciones } from './MenuAcciones'

function montar(alElegir = vi.fn()) {
  render(
    <div>
      <button>Fuera</button>
      <MenuAcciones
        etiqueta="Más acciones"
        acciones={[
          { id: 'uno', texto: 'Uno', alElegir },
          { id: 'dos', texto: 'Dos', alElegir: () => undefined },
        ]}
      />
    </div>,
  )
  return screen.getByRole('button', { name: 'Más acciones' })
}

describe('MenuAcciones', () => {
  it('abre la lista al pulsar el botón', () => {
    const boton = montar()
    expect(boton).toHaveAttribute('aria-haspopup', 'menu')
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('menuitem').map((e) => e.textContent)).toEqual(['Uno', 'Dos'])
  })

  it('Escape cierra y devuelve el foco al botón', () => {
    const boton = montar()
    fireEvent.click(boton)
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(boton)
  })

  it('elegir ejecuta la acción y cierra', () => {
    const alElegir = vi.fn()
    const boton = montar(alElegir)
    fireEvent.click(boton)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Uno' }))
    expect(alElegir).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('flecha abajo mueve el foco al siguiente elemento', () => {
    const boton = montar()
    fireEvent.click(boton)
    const [uno, dos] = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(uno)
    fireEvent.keyDown(uno, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(dos)
  })

  it('clic fuera cierra', () => {
    const boton = montar()
    fireEvent.click(boton)
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Fuera' }))
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
