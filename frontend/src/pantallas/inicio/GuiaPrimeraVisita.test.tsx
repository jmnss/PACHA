import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuiaPrimeraVisita } from './GuiaPrimeraVisita'
import { guiaVista, olvidarGuiaVista } from './guiaMemoria'
import { ProveedorIdioma } from '../../idioma/ProveedorIdioma'

function Pagina({ onCerrar }: { onCerrar: () => void }) {
  return (
    <ProveedorIdioma inicial="es">
      <div className="portada__texto">Texto</div>
      <div className="entradas">Entradas</div>
      <GuiaPrimeraVisita abierta onCerrar={onCerrar} />
    </ProveedorIdioma>
  )
}

describe('GuiaPrimeraVisita', () => {
  beforeEach(() => olvidarGuiaVista())

  it('recorre los pasos con anclas, enfoca el botón y se recuerda al terminar', () => {
    const cerrar = vi.fn()
    render(<Pagina onCerrar={cerrar} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Paso 1 de 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Paso 2 de 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(cerrar).toHaveBeenCalled()
    expect(guiaVista()).toBe(true)
  })

  it('Esc la cierra y la recuerda aunque localStorage falle', () => {
    const cerrar = vi.fn()
    const roto = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    render(<Pagina onCerrar={cerrar} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(cerrar).toHaveBeenCalled()
    expect(guiaVista()).toBe(true)
    roto.mockRestore()
  })
})
