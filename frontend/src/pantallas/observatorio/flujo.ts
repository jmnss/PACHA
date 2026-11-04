/** Valor «redondo» (1, 2 o 5 por una potencia de diez) que no supera `max`. */
export function valorRedondo(max: number): number {
  if (!(max > 0)) return 0
  const p = 10 ** Math.floor(Math.log10(max))
  const m = max / p
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p
}
