import { describe, expect, it } from 'vitest'
import combinaciones from './combinaciones-demo.json'
import { COLORES_CATEGORIA, COLORES_RESPALDO, RAMPAS, colorear, coloresDeCategorias, hexARgb, lutDeRampa, rampaDePaleta, type NombreRampa } from './rampas'

type V3 = [number, number, number]
const lineal = (c: number) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
const gamma = (x: number) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)

function lab(rgb: V3): V3 {
  const [r, g, b] = rgb.map(lineal)
  const xyz = [
    (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047,
    0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883,
  ]
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
  const [fx, fy, fz] = xyz.map(f)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}
const L = (hex: string) => lab(hexARgb(hex))[0]

/** ΔE2000 (Sharma, Wu y Dalal 2005). */
function de2000([L1, a1, b1]: V3, [L2, a2, b2]: V3): number {
  const rad = Math.PI / 180
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
  const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2
  const Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2)
  const hp = (b: number, a: number) => (b === 0 && a === 0 ? 0 : ((Math.atan2(b, a) / rad) + 360) % 360)
  const h1 = hp(b1, ap1), h2 = hp(b2, ap2)
  const dL = L2 - L1, dC = Cp2 - Cp1
  let dh = 0
  if (Cp1 * Cp2 !== 0) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360 }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh * rad / 2)
  const Lm = (L1 + L2) / 2, Cpm = (Cp1 + Cp2) / 2
  let hm = h1 + h2
  if (Cp1 * Cp2 !== 0) hm = Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad)
  const dTh = 30 * Math.exp(-(((hm - 275) / 25) ** 2))
  const Rc = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7))
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2)
  const Sc = 1 + 0.045 * Cpm, Sh = 1 + 0.015 * Cpm * T
  const Rt = -Math.sin(2 * dTh * rad) * Rc
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh))
}

// Machado, Oliveira y Fernandes (2009), severidad 1.0, sobre RGB lineal.
const PROTAN = [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]]
const DEUTAN = [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]]
function simular(hex: string, m: number[][]): V3 {
  const lin = hexARgb(hex).map(lineal)
  return m.map((fila) => Math.min(255, Math.max(0, gamma(Math.min(1, Math.max(0, fila[0] * lin[0] + fila[1] * lin[1] + fila[2] * lin[2]))))) ) as V3
}

describe('rampas de color (docs/diseno.md §4)', () => {
  it('tiene exactamente las ocho rampas', () => {
    expect(Object.keys(RAMPAS).sort()).toEqual(['agua', 'ceniza', 'ciclico', 'divergente', 'fuego', 'gris', 'lahar', 'mmi'])
  })

  it.each(['gris', 'agua', 'fuego', 'mmi', 'lahar', 'ceniza'] as NombreRampa[])('luminancia L* monótona creciente en %s', (n) => {
    const ls = RAMPAS[n].map(L)
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeGreaterThan(ls[i - 1])
  })

  it('divergente simétrica con centro oscuro', () => {
    const [a, b, c, d, e] = RAMPAS.divergente.map(L)
    expect(c).toBeLessThan(Math.min(b, d)) // centro el más oscuro
    expect(b).toBeLessThan(a); expect(d).toBeLessThan(e) // sube hacia los extremos
    expect(Math.abs(a - e)).toBeLessThan(8) // extremos de luminosidad comparable (76 / 72)
    expect(Math.abs(b - d)).toBeLessThan(8) // 41 / 46
  })

  it('cíclica empieza y termina en el mismo color', () => {
    expect(RAMPAS.ciclico[0]).toBe(RAMPAS.ciclico[RAMPAS.ciclico.length - 1])
  })

  // Fase interferométrica: romaO de Crameri, no un arcoíris (auditoría UX). Una cíclica perceptual avanza a pasos
  // de diferencia parecida (ΔE2000 entre paradas vecinas) y su luminosidad sube y baja una sola vez.
  it('cíclica perceptual: pasos de ΔE2000 parecidos y un solo máximo de L*', () => {
    const c = RAMPAS.ciclico
    expect(c).toEqual(['#733957', '#8b4433', '#aa752f', '#cfbc66', '#cbe1b3', '#8bcbcf', '#5393bf', '#595891', '#733957'])
    const pasos = c.slice(1).map((h, i) => de2000(lab(hexARgb(c[i])), lab(hexARgb(h))))
    expect(Math.max(...pasos) / Math.min(...pasos)).toBeLessThan(2.5)
    const ls = c.slice(0, -1).map(L)
    const cambios = ls.map((l, i) => Math.sign(ls[(i + 1) % ls.length] - l)).filter((s, i, a) => s !== a[(i + 1) % a.length])
    expect(cambios.length).toBe(2) // sube hasta el claro y baja: una vuelta, sin bandas
  })

  it('cíclica sin los tonos del arcoíris de la v1', () => {
    for (const viejo of ['#e0773a', '#e5b93c', '#5fc39c', '#3f8fd0', '#c96b8c']) expect(RAMPAS.ciclico).not.toContain(viejo)
  })

  const CONJUNTOS: Record<string, (string | null)[]> = {
    ...COLORES_CATEGORIA,
    respaldo_4: COLORES_RESPALDO.slice(0, 4),
  }
  it.each([['deuteranopía', DEUTAN], ['protanopía', PROTAN]] as const)(
    'categorías reales y de respaldo son distinguibles con %s (ΔE2000 ≥ 15 por pares)', (_n, m) => {
      for (const [nombre, colores] of Object.entries(CONJUNTOS)) {
        const opacos = colores.filter((c): c is string => c !== null)
        for (let i = 0; i < opacos.length; i++) {
          for (let j = i + 1; j < opacos.length; j++) {
            const d = de2000(lab(simular(opacos[i], m)), lab(simular(opacos[j], m)))
            expect(d, `${nombre}: ${opacos[i]} vs ${opacos[j]}`).toBeGreaterThanOrEqual(15)
          }
        }
      }
    })

  it('todas las combinaciones que emite el proveedor demo tienen color (o transparencia explícita)', () => {
    expect(combinaciones.length).toBeGreaterThan(10)
    for (const c of combinaciones) {
      if (c.paleta === 'categorias') {
        expect(c.leyenda, c.variable).toBeTruthy()
        const colores = coloresDeCategorias(c.variable, c.leyenda!.length)
        expect(colores).toHaveLength(c.leyenda!.length)
        // Variable emitida y conocida: sin recurrir al respaldo.
        expect(COLORES_CATEGORIA[c.variable], `falta COLORES_CATEGORIA[${c.variable}]`).toBeDefined()
        colores.forEach((col) => { if (col !== null) expect(col).toMatch(/^#[0-9a-f]{6}$/) })
      } else {
        expect(rampaDePaleta(c.paleta as never, c.variable), `${c.variable}/${c.paleta}`).not.toBeNull()
      }
    }
  })

  it('variable categórica desconocida: tonos de respaldo por posición, ninguno vacío', () => {
    const col = coloresDeCategorias('variable_nueva', 7)
    expect(col.every((c) => typeof c === 'string')).toBe(true)
    expect(col[0]).toBe(COLORES_RESPALDO[0])
  })

  it('el 0 es transparente y 1..255 son opacos con los extremos de la rampa', () => {
    const img = colorear(new Uint8Array([0, 1, 255, 128]), 'agua', undefined, 2)
    expect(img.data[3]).toBe(0)
    expect([...img.data.slice(4, 8)]).toEqual([...hexARgb(RAMPAS.agua[0]), 255])
    expect([...img.data.slice(8, 12)]).toEqual([...hexARgb(RAMPAS.agua[RAMPAS.agua.length - 1]), 255])
    expect(img.data[15]).toBe(255)
    expect(lutDeRampa('agua').length).toBe(1024)
  })

  it('con categorías, el código k toma el color de la categoría k (1-based)', () => {
    const img = colorear(new Uint8Array([0, 1, 2, 3]), 'agua', ['#4f8fc4', '#5fc39c'], 2)
    expect(img.data[3]).toBe(0)
    expect([...img.data.slice(4, 8)]).toEqual([0x4f, 0x8f, 0xc4, 255])
    expect([...img.data.slice(8, 12)]).toEqual([0x5f, 0xc3, 0x9c, 255])
    expect(img.data[15]).toBe(0) // código sin categoría
  })

  it('categoría null (p. ej. «Sin cambio») es transparente', () => {
    const img = colorear(new Uint8Array([1, 2]), 'agua', [null, '#5fc39c'], 2)
    expect(img.data[3]).toBe(0)
    expect(img.data[7]).toBe(255)
  })

  it('rampaDePaleta: secuencial es agua salvo que la variable indique otra', () => {
    expect(rampaDePaleta('secuencial')).toBe('agua')
    expect(rampaDePaleta('secuencial', 'severidad_quemado')).toBe('fuego')
    expect(rampaDePaleta('secuencial', 'Área quemada')).toBe('fuego')
    expect(rampaDePaleta('gris')).toBe('gris')
    expect(rampaDePaleta('categorias')).toBeNull()
  })
})
