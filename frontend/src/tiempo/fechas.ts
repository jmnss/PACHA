const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const SIN_ZONA = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/

/** «12 abr 2026» en UTC y en español; un ISO sin zona se lee como UTC. `null` si no es una fecha válida. */
export function formatearFecha(iso: string | null | undefined): string | null {
  if (typeof iso !== 'string' || iso.trim() === '') return null
  const texto = SIN_ZONA.test(iso.trim()) ? `${iso.trim().replace(' ', 'T')}Z` : iso.trim()
  const t = Date.parse(texto)
  if (Number.isNaN(t)) return null
  const d = new Date(t)
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** «12 abr 2026 14:05 UTC»: la fecha con la hora, para fotogramas dentro de un mismo día. */
export function formatearInstante(ms: number): string | null {
  const fecha = formatearFecha(new Date(ms).toISOString())
  if (!fecha) return null
  const d = new Date(ms)
  return `${fecha} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`
}
