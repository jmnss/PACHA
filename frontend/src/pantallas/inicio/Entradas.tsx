import { Link } from 'react-router-dom'
import { useT } from '../../idioma/useT'

function Sello({ texto }: { texto: string }) {
  return <span className="entrada__sello"><span className="entrada__rayado" aria-hidden="true" />{texto}</span>
}

/** Las tres entradas de Inicio: dos historias (embalses, incendio) y el simulador. Sin cifras inventadas. */
export function Entradas() {
  const { t } = useT()
  return (
    <section className="entradas" aria-labelledby="inicio-entradas-t">
      <h2 id="inicio-entradas-t" className="entradas__titulo">{t('inicio.entradas')}</h2>
      <p className="entradas__bajada">{t('inicio.entradas_bajada')}</p>
      <div className="entradas__rejilla">

        <article className="entrada" aria-labelledby="inicio-t-embalses">
          <header className="entrada__cajetin"><h3 id="inicio-t-embalses">{t('inicio.embalses')}</h3><p>{t('inicio.embalses_dato')}</p></header>
          <div className="entrada__corte">
            <svg viewBox="0 0 360 120" role="img" aria-labelledby="inicio-c1-t">
              <title id="inicio-c1-t">{t('inicio.embalses_corte')}</title>
              <path className="corte__tierra" d="M0,30 L60,36 L120,70 L160,104 L200,106 L240,72 L300,40 L360,34 L360,120 L0,120 Z" />
              <path className="corte__agua-llena" d="M88.2,52 L120,70 L160,104 L200,106 L240,72 L277.5,52 Z" />
              <path className="corte__agua-baja" d="M136.5,84 L160,104 L200,106 L225.9,84 Z" />
              <path className="corte__suelo" d="M0,30 L60,36 L120,70 L160,104 L200,106 L240,72 L300,40 L360,34" />
              <path className="corte__linea-agua" d="M88,52 H344 M136,84 H344" />
              <text x="352" y="47" textAnchor="end">{t('inicio.embalses_lluvia')}</text>
              <text x="352" y="79" textAnchor="end">{t('inicio.embalses_sequia')}</text>
            </svg>
          </div>
          <div className="entrada__cuerpo">
            <p>{t('inicio.embalses_detalle')}</p>
            <nav className="entrada__lugares" aria-label={t('inicio.embalses_lugares')}>
              <Link className="inicio__enlace" to="/explorar/historias?historia=embalses&sitio=mazar">{t('inicio.embalses_ir_mazar')}</Link>
              <Link className="inicio__enlace" to="/explorar/historias?historia=embalses&sitio=daule-peripa">{t('inicio.embalses_ir_daule')}</Link>
            </nav>
          </div>
        </article>

        <article className="entrada" aria-labelledby="inicio-t-incendio">
          <header className="entrada__cajetin"><h3 id="inicio-t-incendio">{t('inicio.incendio')}</h3><p>{t('inicio.incendio_dato')}</p></header>
          <div className="entrada__corte">
            <svg viewBox="0 0 360 120" role="img" aria-labelledby="inicio-c2-t">
              <title id="inicio-c2-t">{t('inicio.incendio_corte')}</title>
              <path className="corte__tierra" d="M0,108 L40,100 L90,80 L140,46 L175,28 L205,32 L240,52 L290,84 L330,100 L360,106 L360,120 L0,120 Z" />
              <path className="corte__verde" d="M0,108 L40,100 L90,80 L140,46 L175,28" />
              <path className="corte__quemado" d="M205,32 L240,52 L290,84 L330,100" />
              <path className="corte__suelo" d="M0,108 L40,100 L90,80 L140,46 L175,28 L205,32 L240,52 L290,84 L330,100 L360,106" />
              <text x="8" y="60">{t('inicio.incendio_verde')}</text>
              <text x="352" y="56" textAnchor="end">{t('inicio.incendio_quemado')}</text>
            </svg>
          </div>
          <div className="entrada__cuerpo">
            <p>{t('inicio.incendio_detalle')}</p>
            <p className="inicio__nota">{t('inicio.incendio_hv')}</p>
            <Link className="inicio__enlace" to="/explorar/historias?historia=incendio">{t('inicio.incendio_ir')}</Link>
          </div>
        </article>

        <article className="entrada" aria-labelledby="inicio-t-simula">
          <header className="entrada__cajetin"><h3 id="inicio-t-simula">{t('inicio.simular')}</h3><p>{t('inicio.simular_dato')}</p></header>
          <div className="entrada__corte">
            <svg viewBox="0 0 360 120" role="img" aria-labelledby="inicio-c3-t">
              <title id="inicio-c3-t">{t('inicio.simular_corte')}</title>
              <path className="corte__tierra" d="M14,104 L22,96 L30,104 Z" />
              <path className="corte__suelo" d="M14,104 L22,96 L30,104" />
              <path className="corte__tierra" d="M70,104 L96,100 L120,98 L150,96 L180,86 L205,52 L222,30 L236,46 L250,36 L262,24 L278,46 L300,80 L330,94 L360,98 L360,120 L70,120 Z" />
              <path className="corte__suelo" d="M70,104 L96,100 L120,98 L150,96 L180,86 L205,52 L222,30 L236,46 L250,36 L262,24 L278,46 L300,80 L330,94 L360,98" />
              <path className="corte__mar" d="M0,104 H70" />
              <g className="corte__puntos">
                <circle cx="22" cy="96" r="4" /><circle cx="82" cy="102" r="4" /><circle cx="112" cy="98.5" r="4" /><circle cx="140" cy="96.5" r="4" />
                <circle cx="196" cy="64" r="4" /><circle cx="222" cy="30" r="4" /><circle cx="246" cy="40" r="4" /><circle cx="262" cy="24" r="4" />
              </g>
              <text x="10" y="86" className="corte__r">Galápagos</text>
            </svg>
          </div>
          <div className="entrada__cuerpo">
            <p>{t('inicio.simular_detalle')}</p>
            <Sello texto={t('inicio.sello_simulacion')} />
            <Link className="inicio__enlace" to="/simular">{t('inicio.simular_ir')}</Link>
          </div>
        </article>
      </div>
    </section>
  )
}
