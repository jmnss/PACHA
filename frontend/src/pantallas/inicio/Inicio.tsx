import { Link } from 'react-router-dom'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { useTituloPagina } from '../../estado/useTituloPagina'
import { useT } from '../../idioma/useT'
import './inicio.css'

/**
 * Inicio, `/`: esqueleto de T2 (T3 lo rediseña con el perfil del Ecuador). Tres entradas y el recorrido de 90 s.
 * Los nombres de query de las historias los fija T4; aquí `historia=embalses|incendio`.
 */
export default function Inicio() {
  const { t } = useT()
  useTituloPagina('titulos.inicio')
  return (
    <>
      <CabeceraPantalla titulo="PACHA" hallazgo={t('inicio.valor')} />
      <nav className="inicio__entradas" aria-label={t('inicio.entradas')}>
        <Link className="inicio__entrada" to="/explorar/historias?historia=embalses">
          <span className="inicio__entrada-titulo">{t('inicio.embalses')}</span>
          <span className="inicio__entrada-detalle">{t('inicio.embalses_detalle')}</span>
        </Link>
        <Link className="inicio__entrada" to="/explorar/historias?historia=incendio">
          <span className="inicio__entrada-titulo">{t('inicio.incendio')}</span>
          <span className="inicio__entrada-detalle">{t('inicio.incendio_detalle')}</span>
        </Link>
        <Link className="inicio__entrada" to="/simular">
          <span className="inicio__entrada-titulo">{t('inicio.simular')}</span>
          <span className="inicio__entrada-detalle">{t('inicio.simular_detalle')}</span>
        </Link>
      </nav>
      <p><Link className="inicio__recorrido" to="/aprender/recorrido">{t('inicio.recorrido')}</Link></p>
    </>
  )
}
