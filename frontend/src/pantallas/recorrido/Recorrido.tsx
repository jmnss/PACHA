import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Boton } from '../../diseno/Boton'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { IconoPausa, IconoPlay } from '../../diseno/iconos'
import { useMenosMovimiento } from '../../estado/useMenosMovimiento'
import { useTituloPagina } from '../../estado/useTituloPagina'
import { useT } from '../../idioma/useT'
import { guionDe } from './guion'
import './recorrido.css'

const conIncrustado = (ruta: string) => ruta + (ruta.includes('?') ? '&' : '?') + 'incrustado=1'

/** Recorrido guiado: un paso a la vez, con una pantalla real incrustada. Avanza solo, salvo con «menos movimiento». */
export default function Recorrido() {
  const { t, idioma } = useT()
  useTituloPagina('titulos.recorrido')
  const GUION = guionDe(idioma)
  const menosMovimiento = useMenosMovimiento()
  const [params, setParams] = useSearchParams()
  const n = Number(params.get('paso'))
  const indice = Number.isInteger(n) && n >= 1 && n <= GUION.length ? n - 1 : 0
  const paso = GUION[indice]
  const [auto, setAuto] = useState(() => !menosMovimiento)
  useEffect(() => { if (menosMovimiento) setAuto(false) }, [menosMovimiento])
  const raiz = useRef<HTMLDivElement>(null)

  const ir = (i: number) => setParams(i === 0 ? {} : { paso: String(i + 1) }, { replace: true })

  // Un temporizador por paso: se rearma al cambiar de paso o al reanudar, y nunca lee estado de un render anterior.
  useEffect(() => {
    if (!auto) return
    const temporizador = setTimeout(() => {
      if (indice < GUION.length - 1) ir(indice + 1)
      else setAuto(false)
    }, paso.segundos * 1000)
    return () => clearTimeout(temporizador)
  }, [auto, indice]) // eslint-disable-line react-hooks/exhaustive-deps

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' && indice < GUION.length - 1) ir(indice + 1)
    else if (e.key === 'ArrowLeft' && indice > 0) ir(indice - 1)
    else if (e.key === ' ' && e.target === e.currentTarget) { e.preventDefault(); setAuto((a) => !a) }
  }

  return (
    <div className="recorrido" ref={raiz} tabIndex={-1} onKeyDown={alTeclear}>
      <CabeceraPantalla titulo={t('recorrido.titulo')} hallazgo={t('recorrido.hallazgo')} />
      <div className="recorrido__cuerpo">
      <section className="recorrido__paso" aria-live="polite">
        <p className="recorrido__contador num">{t('recorrido.contador', { i: indice + 1, n: GUION.length })}</p>
        <h2 className="recorrido__titulo" data-contenido-largo>{paso.titulo}</h2>
        <p className="recorrido__texto" data-contenido-largo>{paso.texto}</p>
        <div className="recorrido__controles">
          <Boton onClick={() => ir(indice - 1)} disabled={indice === 0}>{t('recorrido.anterior')}</Boton>
          <Boton variante="primario" icono={auto ? <IconoPausa /> : <IconoPlay />} onClick={() => setAuto((a) => !a)}>
            {auto ? t('recorrido.pausar') : t('recorrido.reanudar')}
          </Boton>
          <Boton onClick={() => ir(indice + 1)} disabled={indice === GUION.length - 1}>{t('recorrido.siguiente')}</Boton>
        </div>
        <ol className="recorrido__pasos" aria-label={t('recorrido.pasos')}>
          {GUION.map((p, i) => (
            <li key={p.id}>
              <button type="button" className={`recorrido__punto${i === indice ? ' recorrido__punto--activo' : ''}`}
                aria-label={t('recorrido.paso_n', { i: i + 1, titulo: p.titulo })} aria-current={i === indice ? 'step' : undefined} onClick={() => ir(i)} />
            </li>
          ))}
        </ol>
      </section>
      <iframe key={paso.id} className="recorrido__marco" title={t('recorrido.marco', { titulo: paso.titulo })} src={conIncrustado(paso.ruta)} />
      </div>
    </div>
  )
}
