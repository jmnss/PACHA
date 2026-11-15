import type { ReactNode } from 'react'
import type { Catalogo, Herramienta } from '../../api/simulador'
import { Boton } from '../../diseno/Boton'
import { Selector } from '../../diseno/Selector'
import { clavesApi } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import type { ValorParametro } from './estadoSimulador'
import { repartirControles } from './fenomenos'
import { PanelHerramienta } from './PanelHerramienta'
import { PanelMundo, type BorradorMundo } from './PanelMundo'
import { PROPIO, type BorradorMundoEstado } from './useBorradorMundo'
import type { Valores } from './valores'

interface Props {
  catalogo: Catalogo
  herramienta: Herramienta
  valores: Valores
  onCambio: (id: string, valor: ValorParametro) => void
  /** Nombre del lugar del catálogo elegido, o PROPIO. */
  lugar: string
  onLugar: (nombre: string) => void
  borrador: BorradorMundoEstado
  onCoordenadas: (b: BorradorMundo) => void
  cargandoMundo: boolean
  /** Texto del punto elegido en el mapa. */
  punto: ReactNode
  onDesatar: () => void
  desatando: boolean
  /** Los ajustes ya no son los del resultado en pantalla. */
  cambiaron: boolean
  /** Capa «Resultado» (solo en escritorio y solo tras «Desatar»). */
  resultado?: ReactNode
}

/** Paso 3 como pila de capas: resultado (si lo hay), lugar, ajustes esenciales y «Avanzado», la capa honda, cerrada. */
export function PanelAjustes(p: Props) {
  const { t, textoApi } = useT()
  const { esenciales, avanzados } = repartirControles(p.herramienta)
  const mundo = p.catalogo.mundos.find((m) => m.nombre === p.lugar)
  return (
    <div className="panel-ajustes">
      {p.resultado}
      <div className="panel-ajustes__capa">
        <Selector etiqueta={t('sim.mundo.lugar')} value={p.lugar} onChange={(e) => p.onLugar(e.target.value)}
          opciones={[...p.catalogo.mundos.map((m) => {
            const r = textoApi(m.nombre, clavesApi.simMundo(m.nombre, 'nombre'))
            return { valor: m.nombre, texto: r.texto, lang: r.traducido ? undefined : 'es' }
          }), ...(p.lugar === PROPIO ? [{ valor: PROPIO, texto: t('sim.mundo.propio') }] : [])]} />
        {mundo && <p className="simulador__nota"><TextoApi texto={mundo.descripcion} clave={clavesApi.simMundo(mundo.nombre, 'descripcion')} /></p>}
        <p className="simulador__nota">{p.punto}</p>
      </div>
      <div className="panel-ajustes__capa">
        <PanelHerramienta herramienta={esenciales} valores={p.valores} onCambio={p.onCambio} />
      </div>
      <details className="panel-ajustes__avanzado">
        <summary>{t('sim.panel.avanzado')}</summary>
        <div className="panel-ajustes__hondo">
          {avanzados.controles.length > 0 && <PanelHerramienta herramienta={avanzados} valores={p.valores} onCambio={p.onCambio} />}
          <PanelMundo catalogo={p.catalogo} borrador={p.borrador} cargando={p.cargandoMundo} onCrear={p.onCoordenadas} />
        </div>
      </details>
      {p.cambiaron && <p className="panel-ajustes__aviso" role="status">{t('sim.panel.cambiaron')}</p>}
      <div className="panel-ajustes__acciones">
        <Boton variante="primario" onClick={p.onDesatar} disabled={p.desatando || p.cargandoMundo}>
          {p.desatando ? t('sim.panel.desatando') : t('sim.panel.desatar')}
        </Boton>
      </div>
    </div>
  )
}
