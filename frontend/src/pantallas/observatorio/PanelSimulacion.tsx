import { useEffect, useId, useState, type ReactNode } from 'react'
import type { Escenario } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { Campo } from '../../diseno/Campo'
import { Deslizador } from '../../diseno/Deslizador'
import { Interruptor } from '../../diseno/Interruptor'
import { Selector } from '../../diseno/Selector'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { clavesApi } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import { defectoDe, GENERICOS, horaATexto, ORBITAS, SEMILLA_MAX, textoAHora, type Control } from './parametros'
import type { Simulacion } from './useSimulacion'

interface Props {
  esc: Escenario
  controles: Control[]
  sim: Simulacion
  /** Dentro de una hoja: sin tarjeta propia. */
  enHoja?: boolean
}

/** Número con hasta tres decimales en el formato del idioma activo. */
function useNum() {
  const { formatoNumero } = useT()
  return (n: number) => formatoNumero(n, { maximumFractionDigits: 3 })
}

function Ayuda({ children }: { children: ReactNode }) {
  return <p className="panel-sim__ayuda">{children}</p>
}

/** Semilla: texto que se valida al escribir; solo un entero válido llega al simulador. */
function CampoSemilla({ valor, onCambiar }: { valor: number; onCambiar: (n: number) => void }) {
  const { t, formatoNumero } = useT()
  const [texto, setTexto] = useState(String(valor))
  useEffect(() => setTexto(String(valor)), [valor])
  const n = Number(texto)
  const malo = texto.trim() === '' || !Number.isInteger(n) || n < 0 || n > SEMILLA_MAX
  return (
    <div className="panel-sim__campo">
      <Campo
        etiqueta={t('obs.parametros.semilla')} type="number" inputMode="numeric" min={0} max={SEMILLA_MAX} step={1} value={texto}
        limite={t('obs.parametros.semilla_limite', { max: formatoNumero(SEMILLA_MAX) })}
        aria-invalid={malo || undefined}
        onChange={(e) => { setTexto(e.target.value); const m = Number(e.target.value); if (e.target.value.trim() !== '' && Number.isInteger(m) && m >= 0 && m <= SEMILLA_MAX) onCambiar(m) }}
      />
      {malo && <p className="panel-sim__invalido">{t('obs.parametros.semilla_invalida', { max: formatoNumero(SEMILLA_MAX) })}</p>}
      <Ayuda>{t('obs.parametros.semilla_ayuda')}</Ayuda>
    </div>
  )
}

function ControlDelTipo({ tipo, c, sim }: { tipo: string; c: Control; sim: Simulacion }) {
  const { t, textoApi } = useT()
  const etiqueta = textoApi(c.etiqueta, clavesApi.control(tipo, c.id, 'etiqueta')).texto
  const num = useNum()
  const defecto = defectoDe(c)
  const actual = typeof sim.valores[c.id] === 'number' ? (sim.valores[c.id] as number) : defecto
  const ayuda = c.ayuda ? <Ayuda><TextoApi texto={c.ayuda} clave={clavesApi.control(tipo, c.id, 'ayuda')} /></Ayuda> : null
  if (c.tipo === 'selector') {
    return (
      <div className="panel-sim__campo">
        <Selector
          etiqueta={etiqueta} value={String(actual)} limite={t('obs.parametros.opciones_limite')}
          opciones={(c.opciones ?? []).map((o) => ({ valor: String(o.valor), texto: textoApi(o.etiqueta, clavesApi.opcion(tipo, c.id, o.etiqueta)).texto }))}
          onChange={(e) => sim.cambiar(c.id, Number(e.target.value))}
        />
        {ayuda}
      </div>
    )
  }
  if (c.tipo === 'hora') {
    return (
      <div className="panel-sim__campo">
        <Campo
          etiqueta={etiqueta} type="time" step={900} value={horaATexto(actual)}
          limite={t('obs.parametros.hora_limite')}
          onChange={(e) => { const h = textoAHora(e.target.value); if (h !== null) sim.cambiar(c.id, h) }}
        />
        {ayuda}
      </div>
    )
  }
  if (c.tipo === 'interruptor') {
    return (
      <div className="panel-sim__campo">
        <Interruptor etiqueta={etiqueta} activo={actual === 1} onCambiar={(a) => sim.cambiar(c.id, a ? 1 : 0)} />
        {ayuda}
      </div>
    )
  }
  const unidad = c.unidad ? ` ${c.unidad}` : ''
  return (
    <div className="panel-sim__campo">
      <Deslizador
        etiqueta={etiqueta} valorTexto={`${num(actual)}${unidad}`}
        limite={t('obs.parametros.rango_limite', { min: num(c.minimo ?? 0), max: num(c.maximo ?? 0), unidad })}
        min={c.minimo ?? 0} max={c.maximo ?? 1} step={c.paso ?? 1} value={actual}
        onChange={(e) => sim.cambiar(c.id, Number(e.target.value))}
      />
      {ayuda}
    </div>
  )
}

/** Parámetros del simulador de demostración: solo existe si el escenario declara `capacidades.simulacion`. */
export function PanelSimulacion({ esc, controles, sim, enHoja }: Props) {
  const { t } = useT()
  const num = useNum()
  const idEstado = useId()
  const v = sim.valores
  const looks = typeof v.looks === 'number' ? v.looks : GENERICOS.looks.defecto
  const orbita = typeof v.orbita === 'string' ? v.orbita : GENERICOS.orbita.defecto
  const estacional = typeof v.estacional === 'boolean' ? v.estacional : GENERICOS.estacional.defecto
  const semilla = typeof v.semilla === 'number' ? v.semilla : GENERICOS.semilla.defecto

  const cuerpo = (
    <div className="panel-sim">
      <p className="panel-sim__intro">{t('obs.parametros.intro')}</p>
      <p className="panel-sim__resumen num">
        {t('obs.parametros.resumen', { pasadas: esc.adquisiciones.length, resolucion: num(esc.resolucion_m) })}
      </p>

      <CampoSemilla valor={semilla} onCambiar={(n) => sim.cambiar('semilla', n)} />

      <div className="panel-sim__campo">
        <Deslizador
          etiqueta={t('obs.parametros.miradas')} valorTexto={t('obs.parametros.miradas_valor', { n: num(looks) })} limite={t('obs.parametros.miradas_limite')}
          min={GENERICOS.looks.min} max={GENERICOS.looks.max} step={1} value={looks}
          onChange={(e) => sim.cambiar('looks', Number(e.target.value))}
        />
        <Ayuda>{t('obs.parametros.miradas_ayuda')} <Termino nombre="ENL" explicacion={t('obs.parametros.miradas_explicacion')} /></Ayuda>
      </div>

      <div className="panel-sim__campo">
        <Selector
          etiqueta={t('obs.parametros.orbita')} value={orbita} limite={t('obs.parametros.orbita_limite')}
          opciones={ORBITAS.map((o) => ({ valor: o, texto: t(o === 'Ascendente' ? 'obs.parametros.orbita_ascendente' : 'obs.parametros.orbita_descendente') }))}
          onChange={(e) => sim.cambiar('orbita', e.target.value)}
        />
        <Ayuda>{t('obs.parametros.orbita_ayuda')} <Termino nombre={t('obs.parametros.orbita_termino')} explicacion={t('obs.parametros.orbita_explicacion')} /></Ayuda>
      </div>

      <div className="panel-sim__campo">
        <Interruptor etiqueta={t('obs.parametros.estacional')} activo={estacional} onCambiar={(a) => sim.cambiar('estacional', a)} />
        <Ayuda>{t('obs.parametros.estacional_ayuda')}</Ayuda>
      </div>

      <div className="panel-sim__campo">
        <Campo
          etiqueta={t('obs.parametros.fecha_evento')} value={t('obs.parametros.fecha_fija')} readOnly disabled
          limite={t('obs.parametros.fecha_limite')}
        />
        <Ayuda>{t('obs.parametros.fecha_ayuda')}</Ayuda>
      </div>

      {controles.length > 0 && <h3 className="panel-sim__subtitulo">{t('obs.parametros.controles_titulo')}</h3>}
      {controles.map((c) => <ControlDelTipo key={c.id} tipo={esc.tipo_cambio} c={c} sim={sim} />)}

      <div className="panel-sim__pie">
        <Boton variante="secundario" onClick={sim.restablecer}>{t('obs.parametros.restablecer')}</Boton>
        <div id={idEstado} className="panel-sim__estado" role="status">
          {sim.calculando && <span className="num">{t('obs.parametros.calculando', { s: sim.segundos })}</span>}
        </div>
        {sim.error && <p className="panel-sim__error" role="alert">{sim.error}</p>}
      </div>
    </div>
  )
  return enHoja ? cuerpo : <Tarjeta titulo={t('obs.parametros.titulo')}>{cuerpo}</Tarjeta>
}
