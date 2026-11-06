import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderConIdioma } from '../idioma/pruebas'
import { es } from '../idioma/catalogos/es'
import { en } from '../idioma/catalogos/en'
import { qu } from '../idioma/catalogos/qu'
import { AvisoMotor } from './AvisoMotor'

const estado = vi.hoisted(() => ({ valor: { estado: 'inactivo', esperando: false } as { estado: string; esperando: boolean } }))
vi.mock('../motor/clienteMotor', () => ({ useEstadoMotor: () => estado.valor }))

describe('AvisoMotor', () => {
  beforeEach(() => { estado.valor = { estado: 'inactivo', esperando: false } })

  it('no muestra nada con el motor inactivo o listo', () => {
    const { container, rerender } = renderConIdioma(<AvisoMotor />, 'es')
    expect(container).toBeEmptyDOMElement()
    estado.valor = { estado: 'listo', esperando: true }
    rerender(<AvisoMotor />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('muestra el aviso de carga con role=status solo si hay una petición esperando', () => {
    estado.valor = { estado: 'cargando', esperando: false }
    const { rerender } = renderConIdioma(<AvisoMotor />, 'es')
    expect(screen.queryByRole('status')).toBeNull()
    estado.valor = { estado: 'cargando', esperando: true }
    rerender(<AvisoMotor />)
    expect(screen.getByRole('status')).toHaveTextContent(es['estructura.motor.cargando'])
  })

  it('muestra el error con role=alert', () => {
    estado.valor = { estado: 'error', esperando: false }
    renderConIdioma(<AvisoMotor />, 'es')
    expect(screen.getByRole('alert')).toHaveTextContent(es['estructura.motor.error'])
  })

  it('existe en los tres idiomas', () => {
    estado.valor = { estado: 'error', esperando: false }
    const a = renderConIdioma(<AvisoMotor />, 'en')
    expect(screen.getByRole('alert')).toHaveTextContent(en['estructura.motor.error'])
    a.unmount()
    renderConIdioma(<AvisoMotor />, 'qu')
    expect(screen.getByRole('alert')).toHaveTextContent(qu['estructura.motor.error'])
  })
})
