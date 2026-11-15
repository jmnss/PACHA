import { fireEvent, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderConIdioma } from '../../idioma/pruebas'
import Inicio from './Inicio'

const montar = (idioma: 'es' | 'en' | 'qu' = 'es') =>
  renderConIdioma(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><Inicio /></MemoryRouter></QueryClientProvider>, idioma)

describe('Inicio', () => {
  it('tiene una sola acción principal y las entradas enlazan a su destino', () => {
    const { container } = montar()
    expect(container.querySelectorAll('.boton--primario')).toHaveLength(1)
    const href = (nombre: string) => screen.getAllByRole('link', { name: nombre })[0].getAttribute('href')
    expect(href('Entra a la historia de los embalses')).toBe('/explorar/historias?historia=embalses')
    expect(href('Mazar')).toBe('/explorar/historias?historia=embalses&sitio=mazar')
    expect(href('Daule-Peripa')).toBe('/explorar/historias?historia=embalses&sitio=daule-peripa')
    expect(href('Ver la historia del incendio')).toBe('/explorar/historias?historia=incendio')
    expect(href('Abrir el simulador')).toBe('/simular')
    expect(href('¿Primera vez? Recorrido de 90 s')).toBe('/aprender/recorrido')
  })

  it('no rotula datos de demostración ni lo ilustrativo', () => {
    montar()
    expect(document.body.textContent).not.toMatch(/demostraci|ilustrativ|esquem|fuente por añadir|por verificar/i)
  })

  it('los lugares del perfil cambian la nota y su enlace', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Casitagua/ }))
    expect(screen.getByRole('button', { name: /Casitagua/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Cerro Casitagua' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Mazar/ }))
    expect(screen.getByRole('heading', { name: 'Embalse Mazar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver cómo cambia el embalse' })).toHaveAttribute('href', '/explorar/historias?historia=embalses&sitio=mazar')
  })

  it('se traduce al inglés', () => {
    montar('en')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('the radar reads them.')
    expect(screen.getByRole('link', { name: 'Open the simulator' })).toHaveAttribute('href', '/simular')
  })
})
