/** Dibujo de línea de cada fenómeno para su tarjeta (24 × 24, trazo del color del texto). */
const TRAZOS: Record<string, string[]> = {
  incendio: ['M12 21c-4 0-6.5-2.6-6.5-6 0-3.5 2.6-5.4 3.6-8.5 1.6 1.4 2.4 3 2.4 4.6 1-.8 1.7-2 1.9-3.4 2.4 2 3.1 4.5 3.1 7.3 0 3.4-2.5 6-4.5 6Z'],
  tormenta: ['M7 15.5a4.5 4.5 0 1 1 1.2-8.8A5.5 5.5 0 0 1 18.5 9a3.3 3.3 0 0 1-.5 6.5', 'M9 18l-1 2.5', 'M13 18l-1 2.5', 'M17 18l-1 2.5'],
  inundacion: ['M3 9c2 0 2-1.5 4.5-1.5S10 9 12 9s2-1.5 4.5-1.5S19 9 21 9', 'M3 14c2 0 2-1.5 4.5-1.5S10 14 12 14s2-1.5 4.5-1.5S19 14 21 14', 'M3 19c2 0 2-1.5 4.5-1.5S10 19 12 19s2-1.5 4.5-1.5S19 19 21 19'],
  terremoto: ['M2.5 12h4l2-5 3 10 2.5-7 2 4h5.5'],
  erupcion: ['M3 20.5h18L15 10h-6L3 20.5Z', 'M10 6.5 9 3.5', 'M12 6V3', 'M14 6.5l1-3'],
}

export function IconoFenomeno({ id }: { id: string }) {
  return (
    <svg className="icono-fenomeno" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {(TRAZOS[id] ?? []).map((d) => <path key={d} d={d} />)}
    </svg>
  )
}
