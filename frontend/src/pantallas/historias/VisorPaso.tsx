import type { ReactNode } from 'react'
import { mensajeDeError } from '../../api/cliente'
import type { CapaDto, ResultadoCambio } from '../../api/consultas'
import { Comparador } from '../../comparador/Comparador'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { useT } from '../../idioma/useT'
import { estiloDeCapa } from '../observatorio/derivados'

interface Consulta<T> {
  data: T | undefined
  isPending: boolean
  isError: boolean
  error: unknown
  refetch: () => unknown
}

interface Props {
  vista: 'mascara' | 'radar'
  /** «Qué estás viendo» en este paso. */
  queVes: string
  hayPareja: boolean
  cambio: Consulta<ResultadoCambio>
  mascaraAntes: Consulta<CapaDto>
  mascaraDespues: Consulta<CapaDto>
  fechaAntes: string
  fechaDespues: string
  /** Controles bajo la imagen (polarización, cinta de pasadas). */
  controles?: ReactNode
}

const NOMBRE_VARIABLE: Record<string, string> = { sigma0: 'σ⁰', gamma0: 'γ⁰' }

/** El comparador fijo de la historia: cambia de capa con cada paso (máscara del equipo o señal del radar). */
export function VisorPaso({ vista, queVes, hayPareja, cambio, mascaraAntes, mascaraDespues, fechaAntes, fechaDespues, controles }: Props) {
  const { t } = useT()
  const etiquetaAntes = t('historias.comparador.antes', { fecha: fechaAntes })
  const etiquetaDespues = t('historias.comparador.despues', { fecha: fechaDespues })

  let cuerpo: ReactNode
  if (!hayPareja) {
    cuerpo = <p className="historia__nota">{t('historias.comparador.sin_pasadas')}</p>
  } else if (vista === 'mascara') {
    const a = mascaraAntes.data, d = mascaraDespues.data
    const fallo = mascaraAntes.isError ? mascaraAntes : mascaraDespues.isError ? mascaraDespues : null
    if (a && d) {
      const estilo = estiloDeCapa(a)
      cuerpo = (
        <Comparador
          antes={a.rejilla} despues={d.rejilla} rampa={estilo.rampa} categorias={estilo.categorias}
          etiquetaAntes={etiquetaAntes} etiquetaDespues={etiquetaDespues} titulo={t('historias.comparador.mascara')}
          origen={a.origen} origenDespues={d.origen} unidad={a.unidad} variable={a.variable} leyenda={a.leyenda}
        />
      )
    } else if (fallo) {
      cuerpo = <ErrorBloque mensaje={mensajeDeError(fallo.error, t)} onReintentar={() => void fallo.refetch()} />
    } else cuerpo = <Cargando texto={t('historias.comparador.calculando')} filas={5} />
  } else {
    const r = cambio.data
    if (r) {
      const estilo = estiloDeCapa(r.antes)
      const nombre = NOMBRE_VARIABLE[r.antes.variable] ?? r.antes.variable
      cuerpo = (
        <Comparador
          antes={r.antes.rejilla} despues={r.despues.rejilla} rampa={estilo.rampa} categorias={estilo.categorias}
          etiquetaAntes={etiquetaAntes} etiquetaDespues={etiquetaDespues}
          titulo={`${nombre}${r.antes.polarizacion ? ` ${r.antes.polarizacion}` : ''}, ${r.antes.unidad}`}
          origen={r.antes.origen} origenDespues={r.despues.origen} unidad={r.antes.unidad} variable={r.antes.variable} leyenda={r.antes.leyenda}
        />
      )
    } else if (cambio.isError) {
      cuerpo = <ErrorBloque mensaje={mensajeDeError(cambio.error, t)} onReintentar={() => void cambio.refetch()} />
    } else cuerpo = <Cargando texto={t('historias.comparador.calculando')} filas={5} />
  }

  return (
    <section className="visor" aria-label={t('historias.vista.etiqueta')}>
      <p className="visor__que-ves"><span className="visor__rotulo">{t('historias.vista.etiqueta')}:</span> {queVes}</p>
      {cuerpo}
      {controles}
    </section>
  )
}
