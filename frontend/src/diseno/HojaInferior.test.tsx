import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { HojaInferior } from './HojaInferior'

function Prueba() {
  const [abierta, setAbierta] = useState(false)
  return (
    <>
      <button onClick={() => setAbierta(true)}>Abrir</button>
      {abierta && (
        <HojaInferior titulo="Parámetros" onCerrar={() => setAbierta(false)}>
          <button>Uno</button>
          <button>Dos</button>
        </HojaInferior>
      )}
    </>
  )
}

function abrir() {
  render(<Prueba />)
  const abridor = screen.getByRole('button', { name: 'Abrir' })
  abridor.focus()
  fireEvent.click(abridor)
  return abridor
}

describe('HojaInferior: foco', () => {
  it('Tab desde el último enfocable vuelve al primero', () => {
    abrir()
    const botones = screen.getByRole('dialog').querySelectorAll('button')
    const ultimo = botones[botones.length - 1] as HTMLElement
    ultimo.focus()
    fireEvent.keyDown(ultimo, { key: 'Tab' })
    expect(document.activeElement).toBe(botones[0])
  })

  it('Shift+Tab desde el primero va al último', () => {
    abrir()
    const botones = screen.getByRole('dialog').querySelectorAll('button')
    const primero = botones[0] as HTMLElement
    primero.focus()
    fireEvent.keyDown(primero, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(botones[botones.length - 1])
  })

  it('Shift+Tab desde el propio panel (foco inicial) no escapa de la hoja', () => {
    abrir()
    const panel = screen.getByRole('dialog')
    expect(document.activeElement).toBe(panel)
    fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true })
    const botones = panel.querySelectorAll('button')
    expect(document.activeElement).toBe(botones[botones.length - 1])
  })

  it('al cerrar devuelve el foco al botón que la abrió', () => {
    const abridor = abrir()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(abridor)
  })
})
