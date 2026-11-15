import { Link } from 'react-router-dom'
import type { Clave } from '../../idioma/traductor'
import { useT } from '../../idioma/useT'
import { LUGARES, type IdLugar } from './lugares'

/** Nota del lugar elegido en el perfil, con el enlace a su historia. */
export function NotaLugar({ id }: { id: IdLugar }) {
  const { t } = useT()
  const lugar = LUGARES.find((l) => l.id === id)!
  const k = (s: string) => t(`inicio.lugar.${id}.${s}` as Clave)
  return (
    <div className="nota-lugar" id="inicio-nota-lugar" aria-live="polite">
      <h2 className="nota-lugar__titulo">{k('titulo')}</h2>
      <p className="nota-lugar__donde">{k('donde')}</p>
      <p className="nota-lugar__texto">
        {k('texto')}
        {lugar.sinFuente && <> <span className="inicio__fuente">{t('inicio.fuente_por_anadir')}</span></>}
      </p>
      <Link className="inicio__enlace" to={lugar.enlace}>{t(lugar.claveIr)}</Link>
      <p className="inicio__nota">{t('inicio.lugar.ayuda')}</p>
    </div>
  )
}
