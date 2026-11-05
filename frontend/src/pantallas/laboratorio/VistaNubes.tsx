import { useNubes } from '../../api/laboratorio'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { Deslizador } from '../../diseno/Deslizador'
import { FranjaKpi } from '../../diseno/FranjaKpi'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { PanelRadar } from '../simulador/PanelRadar'
import { mensajeError } from './mensajeError'

interface Props { cobertura: number; onCobertura: (n: number) => void }

/** Misma inundación vista por un satélite óptico y por un radar, con nubes ajustables sobre la imagen óptica. */
export function VistaNubes({ cobertura, onCobertura }: Props) {
  const q = useNubes(cobertura)
  if (q.isPending) return <Cargando texto="Preparando el experimento…" filas={4} />
  if (q.isError) return <ErrorBloque mensaje={mensajeError(q.error)} onReintentar={() => void q.refetch()} />
  const d = q.data
  const [radar, optico, tapado] = d.metricas
  return (
    <div className="laboratorio">
      <Tarjeta titulo="Ajusta las nubes" pie={<SelloOrigen origen={d.origen} />}>
        <Deslizador
          etiqueta="Cobertura de nubes"
          valorTexto={`${cobertura} %`}
          min={0} max={100} step={10} value={cobertura}
          onChange={(e) => onCobertura(Number(e.target.value))}
          limite="Las nubes tapan la imagen óptica posterior a la inundación. Al radar no le afectan."
        />
        <FranjaKpi items={[
          { ...radar, etiqueta: radar.etiqueta, principal: true },
          { ...optico, etiqueta: optico.etiqueta },
          { ...tapado, etiqueta: tapado.etiqueta },
        ]} />
      </Tarjeta>
      <div className="laboratorio__rejilla">
        <PanelRadar capa={d.optico} titulo="Imagen óptica después de la inundación" />
        <PanelRadar capa={d.radar} titulo="Radar después de la inundación" />
        <PanelRadar capa={d.cambio_optico} titulo="Cambio que ve el óptico" />
        <PanelRadar capa={d.cambio_radar} titulo="Cambio que ve el radar" />
      </div>
      <Tarjeta titulo="Qué muestra este experimento">
        <p className="laboratorio__texto">
          El radar es un sensor <Termino nombre="activo" explicacion="Emite su propia señal y mide el eco, así que no necesita luz del Sol ni se detiene por las nubes." />:
          lo que ve no depende de la nube. Aun sin nubes, el óptico no detecta el agua bajo el dosel del bosque, y el radar sí
          (el agua bajo los árboles devuelve más señal por un doble rebote).
        </p>
        <p className="laboratorio__nota">
          Escena inventada con coeficientes ilustrativos: sirve para entender el principio, no describe un lugar real ni una observación de NISAR.
        </p>
      </Tarjeta>
    </div>
  )
}
