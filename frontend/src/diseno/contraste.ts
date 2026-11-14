// Contraste WCAG 2.x entre dos colores hexadecimales (#rrggbb).

function canal(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** Luminancia relativa de un color #rrggbb (0 a 1). */
export function luminancia(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) throw new Error(`Color no válido: ${hex}`)
  const n = parseInt(m[1], 16)
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
}

/** Razón de contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
