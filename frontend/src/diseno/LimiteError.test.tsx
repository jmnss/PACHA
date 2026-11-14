import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LimiteError } from './LimiteError'

function Roto(): never { throw new Error('no cargó') }

describe('LimiteError', () => {
  it('muestra el mensaje y Reintentar cuando un hijo falla', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reintentar = vi.fn()
    render(<LimiteError alReintentar={reintentar}><Roto /></LimiteError>)
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar la pantalla')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(reintentar).toHaveBeenCalled()
  })
  it('deja pasar a los hijos sanos', () => {
    render(<LimiteError><p>bien</p></LimiteError>)
    expect(screen.getByText('bien')).toBeInTheDocument()
  })
})
