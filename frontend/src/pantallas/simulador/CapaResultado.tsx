import { Link } from 'react-router-dom'
import type { EventoDto, Herramienta } from '../../api/simulador'
import { Cargando } from '../../diseno/Estados'
import { EtiquetaMetrica, ValorMetrica } from '../../idioma/MetricaApi'
import { textoClave } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import { AccionesSugeridas } from './AccionesSugeridas'
import type { Valores } from './valores'

interface Props {
  evento?: EventoDto
  cargando: boolean
  /** Ir al detalle (gemelo del radar, espera, tabla, bitácora) bajo el mapa. */
  onDetalle: () => void
  /** Para el resumen del escenario de «Pregúntale a tu IA». */
  herramienta?: Herramienta
  parametros?: Valores
  lugar?: string
}

/** Capa «Resultado», la nueva de la pila: cada cifra con su frase llana; todo es un ejemplo de demostración. */
export function CapaResultado({ evento, cargando, onDetalle, herramienta, parametros, lugar }: Props) {
  const { t } = useT()
  return (
    <section className="capa-resultado" aria-labelledby="capa-resultado-titulo" aria-live="polite" aria-busy={cargando}>
      <div className="cajetin">
        <h2 id="capa-resultado-titulo" className="cajetin__titulo">{t('sim.res.titulo')}</h2>
        <p className="sello-origen" data-origen="sintetico">{t('sim.res.ejemplo')}</p>
      </div>
      {cargando && <Cargando texto={t('sim.res.calculando')} filas={2} />}
      {!cargando && evento && (
        <>
          <ul className="capa-resultado__lista">
            {evento.metricas.map((m) => {
              const l = textoClave(m.lectura_texto)
              return (
                <li key={m.etiqueta}>
                  <strong className="capa-resultado__cifra"><EtiquetaMetrica m={m} />: <span className="num"><ValorMetrica m={m} /></span></strong>
                  {m.lectura && <span className="capa-resultado__lectura"><TextoApi texto={m.lectura} clave={l.clave} valores={l.valores} decimales={l.decimales} /></span>}
                </li>
              )
            })}
          </ul>
          {evento.acciones && <AccionesSugeridas evento={evento} herramienta={herramienta} parametros={parametros} lugar={lugar} />}
          {evento.herramienta === 'incendio' && (
            <p className="capa-resultado__comparar">
              <Link to="/explorar/historias?historia=incendio">{t('sim.res.comparar')}</Link>
              <span className="capa-resultado__real">{t('sim.res.evento_real')}</span>
            </p>
          )}
          <button type="button" className="capa-resultado__detalle" onClick={onDetalle}>{t('sim.res.ver_detalle')}</button>
        </>
      )}
    </section>
  )
}
