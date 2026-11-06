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
import { claveLeyenda, clavesApi } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import { es } from '../../idioma/catalogos/es'
import { useT } from '../../idioma/useT'

interface Props { banda: string; pol: string; onBanda: (b: string) => void; onPol: (p: string) => void }

/** Clave del cambio solo si el español del catálogo coincide con el de la API. */
const claveCambio = (cambioEs: string) => { const k = clavesApi.labCambio(cambioEs); return (es as Record<string, string>)[k] === cambioEs ? k : null }

type Fila = { cambio: string; mejor: string; contraste: number }

/** Respuesta de cada superficie según polarización y banda, y qué polarización resalta cada cambio. */
export function VistaPolarizacion({ banda, pol, onBanda, onPol }: Props) {
  const { t, textoApi } = useT()
  const COLUMNAS: ColumnaTabla<Fila>[] = [
    { clave: 'cambio', etiqueta: t('lab.pol.col_cambio'), identidad: true, formato: (v) => <TextoApi texto={String(v)} clave={claveCambio(String(v))} /> },
    { clave: 'mejor', etiqueta: t('lab.pol.col_mejor') },
    { clave: 'contraste', etiqueta: t('lab.pol.col_contraste'), numerica: true },
  ]
  const q = useRespuestaRadar(banda, pol)
  if (q.isPending) return <Cargando texto={t('lab.comun.preparando')} filas={4} />
  if (q.isError) return <ErrorBloque mensaje={mensajeDeError(q.error, t)} onReintentar={() => void q.refetch()} />
  const d = q.data
  const barras = d.respuestas.filter((r) => r.pol === pol).map((r) => {
    const sup = textoApi(r.superficie, claveLeyenda(undefined, 0, r.superficie))
    return { etiqueta: sup.texto, corta: r.superficie === 'Bosque inundado' ? t('lab.pol.inundado_corta') : sup.texto, valor: r.db, lang: r.superficie === 'Bosque inundado' || sup.traducido ? undefined : 'es' }
  })
  const filas: Fila[] = d.cambios.map((c) => ({ cambio: c.cambio, mejor: c.mejor_pol, contraste: c.contraste_db }))
  return (
    <div className="laboratorio">
      <Tarjeta titulo={t('lab.pol.elige')} pie={<SelloOrigen origen={d.origen} />}>
        <div className="laboratorio__controles">
          <Selector etiqueta={t('lab.pol.banda')} value={banda} onChange={(e) => onBanda(e.target.value)}
            opciones={[{ valor: 'L', texto: t('lab.pol.banda_l') }, { valor: 'S', texto: t('lab.pol.banda_s') }]} />
          <Selector etiqueta={t('lab.pol.polarizacion')} value={pol} onChange={(e) => onPol(e.target.value)}
            opciones={['HH', 'HV', 'VV'].map((p) => ({ valor: p, texto: p }))} />
        </div>
        {d.aviso_banda && <p className="laboratorio__aviso">{t('lab.pol.aviso_banda')}</p>}
      </Tarjeta>
      <div className="laboratorio__rejilla">
        <PanelRadar capa={d.superficies} titulo={t('lab.pol.superficies')} propio />
        <PanelRadar capa={d.capa} titulo={t('lab.pol.vista_radar', { banda, pol })} propio />
      </div>
      <Tarjeta titulo={t('lab.pol.respuesta_titulo', { pol })}>
        <Barras datos={barras} unidad="dB" origen={d.origen} titulo={t('lab.pol.barras_titulo')} />
      </Tarjeta>
      <Tarjeta titulo={t('lab.pol.cual_resalta')} pie={<SelloOrigen origen={d.origen} />}>
        <Tabla columnas={COLUMNAS} filas={filas} titulo={t('lab.pol.tabla_titulo')} />
        <p className="laboratorio__texto">
          {t('lab.pol.texto_antes')}<Termino nombre={t('lab.pol.termino')} explicacion={t('lab.pol.termino_explicacion')} />{t('lab.pol.texto_despues')}
        </p>
      </Tarjeta>
    </div>
  )
}
