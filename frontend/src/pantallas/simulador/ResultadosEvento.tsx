import { useEffect, useMemo, useState } from 'react'
import type { EventoDto, MundoDto } from '../../api/simulador'
import { Boton } from '../../diseno/Boton'
import { FranjaKpi } from '../../diseno/FranjaKpi'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla, type ColumnaTabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { descargarPng } from '../../exportar/png'
import { Bitacora } from './Bitacora'
import { entradaDeEvento, guardarBitacora, leerBitacora } from './bitacora'
import { EsperaRadar } from './EsperaRadar'
import { escribirEstado, type EstadoSimulador } from './estadoSimulador'
import { GemeloRadar } from './GemeloRadar'
import { generarInforme } from './informe'

interface Props { evento: EventoDto; mundo: MundoDto; estado: EstadoSimulador }

/** KPI, radar simulado, espera, efectos, bitácora, enlace e informe de un evento. */
export function ResultadosEvento({ evento, mundo, estado }: Props) {
  const consulta = `?${escribirEstado(estado)}`
  const [bitacora, setBitacora] = useState(leerBitacora)
  const [aviso, setAviso] = useState<string | null>(null)

  // Cada evento nuevo se anota una vez en la bitácora (un mismo enlace no se repite).
  useEffect(() => {
    setBitacora((previa) => {
      if (previa.some((e) => e.enlace === consulta)) return previa
      const nueva = [...previa, entradaDeEvento(evento, mundo, consulta)]
      guardarBitacora(nueva)
      return nueva
    })
  }, [evento, mundo, consulta])

  const columnas: ColumnaTabla<Record<string, unknown>>[] = useMemo(() => (evento.tabla?.columnas ?? []).map((c, k) => ({
    clave: c, etiqueta: c, identidad: k === 0,
    numerica: (evento.tabla?.filas ?? []).every((f) => typeof f[k] === 'number' || f[k] === null),
  })), [evento])
  const filas = useMemo(() => (evento.tabla?.filas ?? []).map((f) => Object.fromEntries((evento.tabla?.columnas ?? []).map((c, k) => [c, f[k]]))), [evento])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/simulador${consulta}`)
      setAviso('Enlace copiado.')
    } catch { setAviso('No se pudo copiar: copia la dirección del navegador.') }
  }
  const informe = async () => {
    try { descargarPng(`informe-${evento.herramienta}.png`, await generarInforme(evento, mundo)) } catch { setAviso('No se pudo generar el informe.') }
  }

  return (
    <>
      <Tarjeta titulo={evento.titulo} pie={<SelloOrigen origen={evento.origen} />}>
        <FranjaKpi items={evento.metricas.slice(0, 5).map((m, k) => ({ etiqueta: m.etiqueta, valor: m.valor, principal: k === 0 }))} />
        {evento.metricas.length > 5 && <FranjaKpi items={evento.metricas.slice(5).map((m) => ({ etiqueta: m.etiqueta, valor: m.valor }))} />}
        <div className="simulador__acciones">
          <Boton variante="secundario" onClick={() => void copiar()}>Copiar enlace</Boton>
          <Boton variante="secundario" onClick={() => void informe()}>Informe de una página (PNG)</Boton>
        </div>
        {aviso && <p className="simulador__nota" role="status">{aviso}</p>}
        {evento.tabla && filas.length > 0 && <Tabla columnas={columnas} filas={filas} titulo={`Detalle de los efectos: ${evento.titulo}`} porPagina={15} />}
        {evento.notas.map((n) => <p key={n} className="simulador__nota">{n}</p>)}
        {evento.modelos.length > 0 && (
          <details className="simulador__modelos">
            <summary>Modelos usados</summary>
            <ul>{evento.modelos.map((m) => <li key={m}>{m}</li>)}</ul>
          </details>
        )}
      </Tarjeta>
      <GemeloRadar evento={evento} />
      <EsperaRadar espera={evento.espera_radar} origen={evento.origen} />
      <Bitacora entradas={bitacora} origen={evento.origen} onVaciar={() => { setBitacora([]); guardarBitacora([]) }} />
    </>
  )
}
