import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Boton } from '../../diseno/Boton'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { IconoPausa, IconoPlay } from '../../diseno/iconos'
import { prefiereMenosMovimiento } from '../../tiempo/usePlayback'
import { GUION } from './guion'
import './recorrido.css'

const conIncrustado = (ruta: string) => ruta + (ruta.includes('?') ? '&' : '?') + 'incrustado=1'

/** Recorrido guiado: un paso a la vez, con una pantalla real incrustada. Avanza solo, salvo con «menos movimiento». */
export default function Recorrido() {
  const [params, setParams] = useSearchParams()
  const n = Number(params.get('paso'))
  const indice = Number.isInteger(n) && n >= 1 && n <= GUION.length ? n - 1 : 0
  const paso = GUION[indice]
  const [auto, setAuto] = useState(() => !prefiereMenosMovimiento())
  const [restante, setRestante] = useState(paso.segundos)
  const raiz = useRef<HTMLDivElement>(null)

  const ir = (i: number) => setParams(i === 0 ? {} : { paso: String(i + 1) }, { replace: true })

  useEffect(() => { setRestante(paso.segundos) }, [paso])
  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => setRestante((r) => r - 1), 1000)
    return () => clearInterval(t)
  }, [auto, indice])
  useEffect(() => {
    if (restante > 0) return
    if (indice < GUION.length - 1) ir(indice + 1)
    else setAuto(false)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' && indice < GUION.length - 1) ir(indice + 1)
    else if (e.key === 'ArrowLeft' && indice > 0) ir(indice - 1)
    else if (e.key === ' ' && e.target === e.currentTarget) { e.preventDefault(); setAuto((a) => !a) }
  }

  return (
    <div className="recorrido" ref={raiz} tabIndex={-1} onKeyDown={alTeclear}>
      <CabeceraPantalla titulo="Recorrido" hallazgo="Menos de dos minutos para ver por qué un radar importa. Todo son datos de demostración." />
      <div className="recorrido__cuerpo">
      <section className="recorrido__paso" aria-live="polite">
        <p className="recorrido__contador num">Paso {indice + 1} de {GUION.length}</p>
        <h2 className="recorrido__titulo">{paso.titulo}</h2>
        <p className="recorrido__texto">{paso.texto}</p>
        <div className="recorrido__controles">
          <Boton onClick={() => ir(indice - 1)} disabled={indice === 0}>Anterior</Boton>
          <Boton variante="primario" icono={auto ? <IconoPausa /> : <IconoPlay />} onClick={() => setAuto((a) => !a)}>
            {auto ? 'Pausar' : 'Reanudar'}
          </Boton>
          <Boton onClick={() => ir(indice + 1)} disabled={indice === GUION.length - 1}>Siguiente</Boton>
        </div>
        <ol className="recorrido__pasos" aria-label="Pasos">
          {GUION.map((p, i) => (
            <li key={p.id}>
              <button type="button" className={`recorrido__punto${i === indice ? ' recorrido__punto--activo' : ''}`}
                aria-label={`Paso ${i + 1}: ${p.titulo}`} aria-current={i === indice ? 'step' : undefined} onClick={() => ir(i)} />
            </li>
          ))}
        </ol>
      </section>
      <iframe key={paso.id} className="recorrido__marco" title={`Pantalla del paso: ${paso.titulo}`} src={conIncrustado(paso.ruta)} />
      </div>
    </div>
  )
}
