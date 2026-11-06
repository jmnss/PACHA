import { useRespuestaRadar } from '../../api/laboratorio'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { Selector } from '../../diseno/Selector'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla, type ColumnaTabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { Barras } from '../../graficos/Barras'
import { PanelRadar } from '../simulador/PanelRadar'
import { mensajeDeError } from '../../api/cliente'
import { useT } from '../../idioma/useT'

interface Props { banda: string; pol: string; onBanda: (b: string) => void; onPol: (p: string) => void }

type Fila = { cambio: string; mejor: string; contraste: number }
const COLUMNAS: ColumnaTabla<Fila>[] = [
  { clave: 'cambio', etiqueta: 'Cambio', identidad: true },
  { clave: 'mejor', etiqueta: 'Polarización que más lo resalta' },
  { clave: 'contraste', etiqueta: 'Contraste (dB)', numerica: true },
]

/** Respuesta de cada superficie según polarización y banda, y qué polarización resalta cada cambio. */
export function VistaPolarizacion({ banda, pol, onBanda, onPol }: Props) {
  const { t } = useT()
  const q = useRespuestaRadar(banda, pol)
  if (q.isPending) return <Cargando texto="Preparando el experimento…" filas={4} />
  if (q.isError) return <ErrorBloque mensaje={mensajeDeError(q.error, t)} onReintentar={() => void q.refetch()} />
  const d = q.data
  const barras = d.respuestas.filter((r) => r.pol === pol).map((r) => ({ etiqueta: r.superficie, corta: r.superficie === 'Bosque inundado' ? 'Inundado' : r.superficie, valor: r.db }))
  const filas: Fila[] = d.cambios.map((c) => ({ cambio: c.cambio, mejor: c.mejor_pol, contraste: c.contraste_db }))
  return (
    <div className="laboratorio">
      <Tarjeta titulo="Elige cómo mira el radar" pie={<SelloOrigen origen={d.origen} />}>
        <div className="laboratorio__controles">
          <Selector etiqueta="Banda" value={banda} onChange={(e) => onBanda(e.target.value)}
            opciones={[{ valor: 'L', texto: 'Banda L' }, { valor: 'S', texto: 'Banda S (ejemplo)' }]} />
          <Selector etiqueta="Polarización" value={pol} onChange={(e) => onPol(e.target.value)}
            opciones={['HH', 'HV', 'VV'].map((p) => ({ valor: p, texto: p }))} />
        </div>
        {d.aviso_banda && <p className="laboratorio__aviso">{d.aviso_banda}</p>}
      </Tarjeta>
      <div className="laboratorio__rejilla">
        <PanelRadar capa={d.superficies} titulo="Superficies de la escena" />
        <PanelRadar capa={d.capa} titulo={`Lo que ve el radar · banda ${banda}, ${pol}`} />
      </div>
      <Tarjeta titulo={`Respuesta de cada superficie en ${pol}`}>
        <Barras datos={barras} unidad="dB" origen={d.origen} titulo="σ⁰ por superficie (dB)" />
      </Tarjeta>
      <Tarjeta titulo="Qué polarización resalta cada cambio" pie={<SelloOrigen origen={d.origen} />}>
        <Tabla columnas={COLUMNAS} filas={filas} titulo="Polarización que más resalta cada cambio" />
        <p className="laboratorio__texto">
          Cada cambio cambia la <Termino nombre="polarización" explicacion="Orientación de la onda que el radar emite y recibe. HH y VV son «paralelas»; HV mezcla orientaciones y responde sobre todo a la estructura de la vegetación." /> de
          forma distinta: el agua abierta apaga la señal paralela, el agua bajo árboles la dispara por doble rebote y la pérdida de biomasa
          apaga la cruzada (HV).
        </p>
      </Tarjeta>
    </div>
  )
}
