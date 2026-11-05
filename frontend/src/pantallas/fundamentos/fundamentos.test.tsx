import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PENDIENTE } from './contenido'
import Fundamentos from './Fundamentos'

describe('Fundamentos', () => {
  it('marca lo no verificado de NISAR como pendiente de confirmar', () => {
    render(<Fundamentos />)
    expect(screen.getByText(new RegExp(PENDIENTE))).toBeInTheDocument()
  })
  it('explica los tipos de cambio del challenge', () => {
    render(<Fundamentos />)
    for (const t of ['Inundaciones y humedales', 'Glaciares y hielo marino', 'Terremotos y subsidencia']) expect(screen.getByText(t)).toBeInTheDocument()
  })
  it('no afirma fechas ni órbita de la misión', () => {
    const { container } = render(<Fundamentos />)
    expect(container.textContent).not.toMatch(/lanz(ó|amiento el)|\b20(2[4-9]|3\d)\b/)
  })
})
