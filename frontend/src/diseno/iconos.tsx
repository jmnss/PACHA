import type { ReactNode } from 'react'

/** Conjunto único de iconos de contorno de 1,5 px (docs/diseno.md §8 «Iconos»). Sin emojis. */
interface PropsIcono {
  tamano?: number
}

function Base({ tamano = 16, children }: PropsIcono & { children: ReactNode }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const IconoHistorias = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M2 3.5C4.5 3 6.5 3.4 8 4.5c1.5-1.1 3.5-1.5 6-1v9c-2.5-.5-4.5-.1-6 1-1.5-1.1-3.5-1.5-6-1z" />
    <path d="M8 4.5v9" />
  </Base>
)

export const IconoObservatorio = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M1.5 4.5 6 3l4 1.5L14.5 3v8.5L10 13l-4-1.5L1.5 13z" />
    <path d="M6 3v8.5M10 4.5V13" />
  </Base>
)

export const IconoChevron = (p: PropsIcono) => (
  <Base {...p}>
    <path d="m4 6 4 4 4-4" />
  </Base>
)

export const IconoDescargar = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M8 2v8M4.5 7 8 10.5 11.5 7M2.5 13.5h11" />
  </Base>
)

export const IconoInfo = (p: PropsIcono) => (
  <Base {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7.5V11M8 5.2v.1" />
  </Base>
)

export const IconoAlerta = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M8 2 14.5 13.5h-13z" />
    <path d="M8 6.5v3M8 11.5v.1" />
  </Base>
)

export const IconoCerrar = (p: PropsIcono) => (
  <Base {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Base>
)

export const IconoMas = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M8 3v10M3 8h10" />
  </Base>
)

export const IconoReintentar = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M13 8a5 5 0 1 1-1.5-3.5M13 2.5v3h-3" />
  </Base>
)

export const IconoInicio = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M3.5 3v10M13 3.5 6.5 8l6.5 4.5z" />
  </Base>
)

export const IconoAtras = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M12 3.5 5.5 8l6.5 4.5z" />
  </Base>
)

export const IconoPlay = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M5 3.5 12.5 8 5 12.5z" />
  </Base>
)

export const IconoPausa = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M5.5 3.5v9M10.5 3.5v9" />
  </Base>
)

export const IconoAdelante = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M4 3.5 10.5 8 4 12.5z" />
  </Base>
)

export const IconoFinal = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M12.5 3v10M3 3.5 9.5 8 3 12.5z" />
  </Base>
)

export const IconoEvento = (p: PropsIcono) => (
  <Base {...p}>
    <path d="M4 14V2.5M4 3h8l-2 3 2 3H4" />
  </Base>
)

export const ICONOS = {
  Historias: IconoHistorias,
  Observatorio: IconoObservatorio,
  Chevron: IconoChevron,
  Descargar: IconoDescargar,
  Info: IconoInfo,
  Alerta: IconoAlerta,
  Cerrar: IconoCerrar,
  Mas: IconoMas,
  Reintentar: IconoReintentar,
  Inicio: IconoInicio,
  Atras: IconoAtras,
  Play: IconoPlay,
  Pausa: IconoPausa,
  Adelante: IconoAdelante,
  Final: IconoFinal,
  Evento: IconoEvento,
} as const
