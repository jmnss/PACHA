import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIncrustado } from '../../estado/useIncrustado'
import { useTituloPagina } from '../../estado/useTituloPagina'
import { useT } from '../../idioma/useT'
import { Entradas } from './Entradas'
import { GuiaPrimeraVisita } from './GuiaPrimeraVisita'
import { guiaVista } from './guiaMemoria'
import { Localizador } from './Localizador'
import type { IdLugar } from './lugares'
import { NotaLugar } from './NotaLugar'
import { PerfilEcuador } from './PerfilEcuador'
import { RegistroPasadas } from './RegistroPasadas'
import { SignosConvencionales } from './SignosConvencionales'
import './inicio.css'

/**
 * Inicio, `/` (propuesta D «Mezcla»): frase de valor, perfil oeste-este con los tres lugares, registro de
 * pasadas con las fechas reales de la API, localizador con la franja de ~240 km y tres entradas. Una sola acción principal (ocre).
 */
export default function Inicio() {
  const { t } = useT()
  useTituloPagina('titulos.inicio')
  const [elegido, setElegido] = useState<IdLugar>('daule')
  const incrustado = useIncrustado()
  const [guia, setGuia] = useState(false)
  // Primera visita: el recorrido se abre solo una vez, ya con las anclas en pantalla.
  useEffect(() => {
    if (incrustado || guiaVista()) return
    const id = window.setTimeout(() => setGuia(true), 400)
    return () => window.clearTimeout(id)
  }, [incrustado])
  return (
    <div className="inicio">
      <section className="portada" aria-labelledby="inicio-titulo">
        <div className="portada__lienzo">
          <div className="portada__texto">
            <h1 id="inicio-titulo" className="portada__titular">
              {t('inicio.titular_1')} <span className="portada__linea-2">{t('inicio.titular_2')}</span>
            </h1>
            <p className="portada__bajada">{t('inicio.bajada')}</p>
            <div className="portada__acciones">
              <Link className="boton boton--primario portada__principal" to="/explorar/historias?historia=embalses">{t('inicio.principal')}</Link>
              <Link className="inicio__enlace inicio__enlace--icono" to="/aprender/recorrido">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="12" r="9" /><path d="m10 8.5 5 3.5-5 3.5Z" fill="currentColor" />
                </svg>
                {t('inicio.recorrido')}
              </Link>
              <button type="button" className="inicio__enlace inicio__enlace--discreto" onClick={() => setGuia(true)}>{t('guia.repetir')}</button>
            </div>
          </div>
          <RegistroPasadas />
          <PerfilEcuador elegido={elegido} onElegir={setElegido} />
        </div>
        <div className="portada__pie">
          <NotaLugar id={elegido} />
          <Localizador />
          <SignosConvencionales />
        </div>
      </section>
      <div className="inicio__contacto" aria-hidden="true" />
      <Entradas />
      <GuiaPrimeraVisita abierta={guia} onCerrar={() => setGuia(false)} />
    </div>
  )
}
