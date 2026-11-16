import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LUGARES } from './lugares'

const SITIOS = { daule: 'embalses/daule-peripa', mazar: 'embalses/mazar', casitagua: 'incendios/casitagua' } as const

describe('lugares de Inicio', () => {
  it.each(LUGARES)('$id está en el centro del bbox de su sitio.json', (l) => {
    const sitio = JSON.parse(readFileSync(resolve(__dirname, '../../../../data', SITIOS[l.id], 'sitio.json'), 'utf8'))
    const [o, s, e, n] = sitio.bbox as number[]
    expect(l.lon).toBeCloseTo((o + e) / 2, 3)
    expect(l.lat).toBeCloseTo((s + n) / 2, 3)
  })

  it('cada lugar enlaza a su historia', () => {
    expect(LUGARES.map((l) => l.enlace)).toEqual([
      '/explorar/historias?historia=embalses&sitio=daule-peripa',
      '/explorar/historias?historia=incendio',
      '/explorar/historias?historia=embalses&sitio=mazar',
    ])
  })
})
