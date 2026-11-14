import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Localizador } from './Localizador'

describe('Localizador', () => {
  it('dibuja la silueta y un punto dentro del lienzo para un escenario de la Costa', () => {
    const { container } = render(<Localizador bbox={[-80.3, -0.8, -80.1, -0.6]} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('path')!.getAttribute('d')!.length).toBeGreaterThan(50)
    const c = container.querySelector('circle')!
    expect(Number(c.getAttribute('cx'))).toBeGreaterThan(0)
    expect(Number(c.getAttribute('cx'))).toBeLessThan(Number(svg.getAttribute('width')))
    expect(Number(c.getAttribute('cy'))).toBeLessThan(Number(svg.getAttribute('height')))
  })
})
