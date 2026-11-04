import { useEffect, useId, useState, type ReactNode } from 'react'
import type { Escenario } from '../../api/consultas'
import { Boton } from '../../diseno/Boton'
import { Campo } from '../../diseno/Campo'
import { Deslizador } from '../../diseno/Deslizador'
import { Interruptor } from '../../diseno/Interruptor'
import { Selector } from '../../diseno/Selector'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { defectoDe, GENERICOS, horaATexto, ORBITAS, SEMILLA_MAX, textoAHora, type Control } from './parametros'
import type { Simulacion } from './useSimulacion'

interface Props {
  esc: Escenario
  controles: Control[]
  sim: Simulacion
  /** Dentro de una hoja: sin tarjeta propia. */
  enHoja?: boolean
}

const num = (n: number) => n.toLocaleString('es-EC', { maximumFractionDigits: 3 })
const ayudaEnl = 'Número equivalente de miradas: cuántas observaciones independientes se promedian para suavizar el moteado (speckle) de una imagen de radar. Más miradas dan una imagen más lisa pero con menos detalle.'
const ayudaOrbita = 'Sentido en que el satélite recorre su órbita al pasar sobre el lugar: ascendente (hacia el norte) o descendente (hacia el sur). Cambia desde qué lado mira el radar el mismo sitio.'

function Ayuda({ children }: { children: ReactNode }) {
  return <p className="panel-sim__ayuda">{children}</p>
}

/** Semilla: texto que se valida al escribir; solo un entero válido llega al simulador. */
function CampoSemilla({ valor, onCambiar }: { valor: number; onCambiar: (n: number) => void }) {
  const [texto, setTexto] = useState(String(valor))
  useEffect(() => setTexto(String(valor)), [valor])
  const n = Number(texto)
  const malo = texto.trim() === '' || !Number.isInteger(n) || n < 0 || n > SEMILLA_MAX
  return (
    <div className="panel-sim__campo">
      <Campo
        etiqueta="Semilla" type="number" inputMode="numeric" min={0} max={SEMILLA_MAX} step={1} value={texto}
        limite={`Entero entre 0 y ${SEMILLA_MAX.toLocaleString('es-EC')}`}
        aria-invalid={malo || undefined}
        onChange={(e) => { setTexto(e.target.value); const m = Number(e.target.value); if (e.target.value.trim() !== '' && Number.isInteger(m) && m >= 0 && m <= SEMILLA_MAX) onCambiar(m) }}
      />
      {malo && <p className="panel-sim__invalido">Escribe un entero entre 0 y {SEMILLA_MAX.toLocaleString('es-EC')}.</p>}
      <Ayuda>La semilla fija el azar del simulador: la misma semilla repite exactamente la misma escena.</Ayuda>
    </div>
  )
}

function ControlDelTipo({ c, sim }: { c: Control; sim: Simulacion }) {
  const defecto = defectoDe(c)
  const actual = typeof sim.valores[c.id] === 'number' ? (sim.valores[c.id] as number) : defecto
  const ayuda = c.ayuda ? <Ayuda>{c.ayuda}</Ayuda> : null
  if (c.tipo === 'selector') {
    return (
      <div className="panel-sim__campo">
        <Selector
          etiqueta={c.etiqueta} value={String(actual)} limite="Una de las opciones"
          opciones={(c.opciones ?? []).map((o) => ({ valor: String(o.valor), texto: o.etiqueta }))}
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
          etiqueta={c.etiqueta} type="time" step={900} value={horaATexto(actual)}
          limite="De 00:00 a 23:45 (hora local del escenario, en pasos de 15 minutos)"
          onChange={(e) => { const h = textoAHora(e.target.value); if (h !== null) sim.cambiar(c.id, h) }}
        />
        {ayuda}
      </div>
    )
  }
  if (c.tipo === 'interruptor') {
    return (
      <div className="panel-sim__campo">
        <Interruptor etiqueta={c.etiqueta} activo={actual === 1} onCambiar={(a) => sim.cambiar(c.id, a ? 1 : 0)} />
        {ayuda}
      </div>
    )
  }
  const unidad = c.unidad ? ` ${c.unidad}` : ''
  return (
    <div className="panel-sim__campo">
      <Deslizador
        etiqueta={c.etiqueta} valorTexto={`${num(actual)}${unidad}`}
        limite={`De ${num(c.minimo ?? 0)} a ${num(c.maximo ?? 0)}${unidad}`}
        min={c.minimo ?? 0} max={c.maximo ?? 1} step={c.paso ?? 1} value={actual}
        onChange={(e) => sim.cambiar(c.id, Number(e.target.value))}
      />
      {ayuda}
    </div>
  )
}

/** Parámetros del simulador de demostración: solo existe si el escenario declara `capacidades.simulacion`. */
export function PanelSimulacion({ esc, controles, sim, enHoja }: Props) {
  const idEstado = useId()
  const v = sim.valores
  const looks = typeof v.looks === 'number' ? v.looks : GENERICOS.looks.defecto
  const orbita = typeof v.orbita === 'string' ? v.orbita : GENERICOS.orbita.defecto
  const estacional = typeof v.estacional === 'boolean' ? v.estacional : GENERICOS.estacional.defecto
  const semilla = typeof v.semilla === 'number' ? v.semilla : GENERICOS.semilla.defecto

  const cuerpo = (
    <div className="panel-sim">
      <p className="panel-sim__intro">
        Estos parámetros mueven el simulador de demostración: generan una escena sintética nueva, no
        cambian ningún dato real ni de NISAR.
      </p>
      <p className="panel-sim__resumen num">
        {esc.adquisiciones.length} pasadas · píxel de {num(esc.resolucion_m)} m
      </p>

      <CampoSemilla valor={semilla} onCambiar={(n) => sim.cambiar('semilla', n)} />

      <div className="panel-sim__campo">
        <Deslizador
          etiqueta="Número de miradas (ENL)" valorTexto={`${num(looks)} miradas`} limite="De 1 a 100 miradas"
          min={GENERICOS.looks.min} max={GENERICOS.looks.max} step={1} value={looks}
          onChange={(e) => sim.cambiar('looks', Number(e.target.value))}
        />
        <Ayuda>Más miradas, menos moteado. <Termino nombre="ENL" explicacion={ayudaEnl} /></Ayuda>
      </div>

      <div className="panel-sim__campo">
        <Selector
          etiqueta="Dirección de la órbita" value={orbita} limite="Ascendente o descendente"
          opciones={ORBITAS.map((o) => ({ valor: o, texto: o }))}
          onChange={(e) => sim.cambiar('orbita', e.target.value)}
        />
        <Ayuda>Desde qué lado mira el radar. <Termino nombre="Paso orbital" explicacion={ayudaOrbita} /></Ayuda>
      </div>

      <div className="panel-sim__campo">
        <Interruptor etiqueta="Variación estacional" activo={estacional} onCambiar={(a) => sim.cambiar('estacional', a)} />
        <Ayuda>Si está activa, la escena sigue el ciclo de lluvias y sequía del lugar.</Ayuda>
      </div>

      <div className="panel-sim__campo">
        <Campo
          etiqueta="Fecha del evento" value="Fija en este escenario" readOnly disabled
          limite="Todavía no se puede mover en el simulador"
        />
        <Ayuda>El simulador de demostración fija la fecha del evento de cada escenario; moverla llegará más adelante.</Ayuda>
      </div>

      {controles.length > 0 && <h3 className="panel-sim__subtitulo">Controles de este tipo de cambio</h3>}
      {controles.map((c) => <ControlDelTipo key={c.id} c={c} sim={sim} />)}

      <div className="panel-sim__pie">
        <Boton variante="secundario" onClick={sim.restablecer}>Restablecer parámetros</Boton>
        <div id={idEstado} className="panel-sim__estado" role="status">
          {sim.calculando && <span className="num">Calculando… {sim.segundos} s</span>}
        </div>
        {sim.error && <p className="panel-sim__error" role="alert">{sim.error}</p>}
      </div>
    </div>
  )
  return enHoja ? cuerpo : <Tarjeta titulo="Parámetros del modelo">{cuerpo}</Tarjeta>
}
