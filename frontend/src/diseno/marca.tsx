/**
 * Marca de PACHA (docs/diseno.md §2): dos curvas de nivel en tinta con un punto central, atravesadas por una cuña de
 * barrido de radar en ocre maíz con su filo en ocre borde (sin el filo, el ocre se pierde sobre la arcilla a 16 px).
 * Mismo dibujo que frontend/public/favicon.svg. Colores por clase (tokens.css).
 */
export function Marca({ tamano = 28 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false" className="marca">
      <path className="marca__barrido" d="M16.4,16.3 L20.3,1.8 A15,15 0 0 1 30,10 Z" />
      <path
        d="M28.80,19.96 C27.65,23.50 22.52,27.47 18.79,28.29 C15.07,29.10 9.13,27.56 6.46,24.83 C3.80,22.11 1.70,15.47 2.82,11.92 C3.93,8.37 9.35,4.33 13.16,3.52 C16.97,2.70 23.08,4.29 25.68,7.03 C28.29,9.77 29.95,16.42 28.80,19.96Z"
        stroke="currentColor" strokeWidth={2.2}
      />
      <path
        d="M21.75,23.04 C19.75,24.61 14.27,24.38 12.03,22.88 C9.79,21.38 7.64,16.64 8.31,14.05 C8.97,11.45 13.40,7.40 16.02,7.31 C18.63,7.21 23.04,10.85 23.99,13.47 C24.94,16.09 23.74,21.47 21.75,23.04Z"
        stroke="currentColor" strokeWidth={2}
      />
      <circle cx="16.4" cy="16.3" r="2.4" fill="currentColor" />
      <path className="marca__filo" d="M16.4,16.3 L30,10" strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  )
}
