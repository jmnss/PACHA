import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Pestanas } from '../../diseno/Pestanas'
import { useEstadoUrl, type Esquema } from '../../estado/useEstadoUrl'
import { VistaNubes } from './VistaNubes'
import { VistaPolarizacion } from './VistaPolarizacion'
import '../simulador/simulador.css'
import './laboratorio.css'

const VISTAS = ['nubes', 'polarizacion'] as const
const ESQUEMA = {
  vista: { tipo: 'enum', valores: VISTAS, porDefecto: 'nubes' },
  nubes: { tipo: 'number', porDefecto: 60, min: 0, max: 100 },
  banda: { tipo: 'enum', valores: ['L', 'S'], porDefecto: 'L' },
  pol: { tipo: 'enum', valores: ['HH', 'HV', 'VV'], porDefecto: 'HH' },
} as const satisfies Esquema

/** Laboratorio del radar: por qué un radar ve lo que un satélite óptico no, y qué polarización resalta cada cambio. */
export default function Laboratorio() {
  const [url, cambiar] = useEstadoUrl(ESQUEMA)
  return (
    <>
      <CabeceraPantalla
        titulo="Laboratorio del radar"
        hallazgo="Dos experimentos con una escena inventada: qué pasa cuando hay nubes y qué polarización resalta cada cambio."
      />
      <Pestanas
        etiqueta="Experimentos"
        activa={url.vista}
        onCambiar={(id) => cambiar({ vista: id as (typeof VISTAS)[number] })}
        pestanas={[{ id: 'nubes', etiqueta: 'La nube no lo detiene' }, { id: 'polarizacion', etiqueta: 'Polarización y banda' }]}
      />
      {url.vista === 'nubes'
        ? <VistaNubes cobertura={url.nubes} onCobertura={(n) => cambiar({ nubes: n }, { reemplazar: true })} />
        : <VistaPolarizacion banda={url.banda} pol={url.pol} onBanda={(b) => cambiar({ banda: b as 'L' | 'S' })} onPol={(p) => cambiar({ pol: p as 'HH' | 'HV' | 'VV' })} />}
    </>
  )
}
