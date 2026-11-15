import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { RotuloSimulacion } from '../../diseno/RotuloSimulacion'
import { ControlSegmentado } from '../../diseno/ControlSegmentado'
import { useEstadoUrl, type Esquema } from '../../estado/useEstadoUrl'
import { useTituloPagina } from '../../estado/useTituloPagina'
import { useT } from '../../idioma/useT'
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
  const { t } = useT()
  useTituloPagina('titulos.laboratorio')
  const [url, cambiar] = useEstadoUrl(ESQUEMA)
  return (
    <>
      <CabeceraPantalla
        titulo={t('lab.pantalla.titulo')}
        hallazgo={t('lab.pantalla.hallazgo')}
        acciones={<RotuloSimulacion />}
      />
      <ControlSegmentado
        etiqueta={t('lab.pantalla.experimentos')}
        valor={url.vista}
        onCambiar={(id) => cambiar({ vista: id as (typeof VISTAS)[number] })}
        opciones={[{ id: 'nubes', etiqueta: t('lab.pestana.nubes') }, { id: 'polarizacion', etiqueta: t('lab.pestana.polarizacion') }]}
      />
      {url.vista === 'nubes'
        ? <VistaNubes cobertura={url.nubes} onCobertura={(n) => cambiar({ nubes: n }, { reemplazar: true })} />
        : <VistaPolarizacion banda={url.banda} pol={url.pol} onBanda={(b) => cambiar({ banda: b as 'L' | 'S' })} onPol={(p) => cambiar({ pol: p as 'HH' | 'HV' | 'VV' })} />}
    </>
  )
}
