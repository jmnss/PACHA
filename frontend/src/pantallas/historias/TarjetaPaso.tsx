import type { ReactNode } from 'react'
import { useT } from '../../idioma/useT'

interface Props {
  n: number
  titular: string
  frase: string
  /** La cifra visible (siempre a la vista, también con el paso cerrado). */
  cifra: ReactNode
  abierto: boolean
  onAbrir: () => void
  /** Detalle técnico: solo se monta con el paso abierto. */
  children: ReactNode
}

/** Un paso de la historia: titular y frase llana, la cifra y, al abrirlo, el detalle (divulgación progresiva). */
export function TarjetaPaso({ n, titular, frase, cifra, abierto, onAbrir, children }: Props) {
  const { t } = useT()
  const id = `paso-${n}`
  return (
    <li className={`paso${abierto ? ' paso--abierto' : ''}`} aria-current={abierto ? 'step' : undefined}>
      <h3 className="paso__titulo">
        <button type="button" className="paso__boton" aria-expanded={abierto} aria-controls={`${id}-detalle`} onClick={onAbrir}>
          <span className="paso__numero">{t('historias.paso.numero', { n })}</span>
          <span className="paso__titular">{titular}</span>
        </button>
      </h3>
      <p className="paso__frase">{frase}</p>
      {cifra}
      <div id={`${id}-detalle`} className="paso__detalle" hidden={!abierto}>
        {abierto && children}
      </div>
    </li>
  )
}
