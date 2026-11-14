/** Marca: un círculo de 1,5 px cruzado por una línea horizontal (el ecuador), en blanco. */
export function Marca({ tamano = 20 }: { tamano?: number }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10" cy="10" r="8" />
      <line x1="1" y1="10" x2="19" y2="10" />
    </svg>
  )
}
