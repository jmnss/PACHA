import { useEffect, useMemo, useState } from 'react'
import type { EventoDto, MundoDto } from '../../api/simulador'
import { Boton } from '../../diseno/Boton'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tabla, type ColumnaTabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { descargarPng } from '../../exportar/png'
import { clavesApi, textoClave, type TextoClaveApi } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import type { Clave } from '../../idioma/traductor'
import { useT } from '../../idioma/useT'
import { Bitacora } from './Bitacora'
import { entradaDeEvento, guardarBitacora, leerBitacora } from './bitacora'
import { EsperaRadar } from './EsperaRadar'
import { escribirEstado, type EstadoSimulador } from './estadoSimulador'
import { GemeloRadar } from './GemeloRadar'
import { generarInforme } from './informe'
import { conBase } from '../../rutaBase'

/** Clave de la fila donde viajan los `TextoClave` de sus celdas (no es una columna). */
const CELDAS = '__celdas_texto'

interface Props { evento: EventoDto; mundo: MundoDto; estado: EstadoSimulador }

/** Detalle de un evento bajo el mapa: tabla, notas, radar simulado, espera, bitácora, enlace e informe (las cifras van en la capa «Resultado»). */
export function ResultadosEvento({ evento, mundo, estado }: Props) {
  const ctx = useT()
  const { t, textoApi } = ctx
  const consulta = `?${escribirEstado(estado)}`
  const [bitacora, setBitacora] = useState(leerBitacora)
  const [aviso, setAviso] = useState<Clave | null>(null)

  // Cada evento nuevo se anota una vez en la bitácora (un mismo enlace no se repite).
  useEffect(() => {
    setBitacora((previa) => {
      if (previa.some((e) => e.enlace === consulta)) return previa
      const nueva = [...previa, entradaDeEvento(evento, mundo, consulta)]
      guardarBitacora(nueva)
      return nueva
    })
  }, [evento, mundo, consulta])

  // Columnas y celdas las escribe modelo/desastres.py en español: el encabezado se traduce por su clave derivada
  // (si el español coincide); las celdas de texto se traducen por su `celdas_texto` y, sin clave, quedan en español
  // con lang="es" (spec §9.5).
  const columnas: ColumnaTabla<Record<string, unknown>>[] = useMemo(() => (evento.tabla?.columnas ?? []).map((c, k) => {
    const encabezado = textoApi(c, clavesApi.simColumna(c))
    const numerica = (evento.tabla?.filas ?? []).every((f) => typeof f[k] === 'number' || f[k] === null)
    return {
      clave: c, etiqueta: encabezado.texto, identidad: k === 0, numerica,
      langEncabezado: encabezado.traducido ? undefined : 'es',
      formato: numerica ? undefined : (v: unknown, f: Record<string, unknown>) => {
        const { clave, valores, decimales } = textoClave((f[CELDAS] as Record<string, TextoClaveApi | null>)[c])
        return <TextoApi texto={String(v)} clave={clave} valores={valores} decimales={decimales} />
      },
    }
  }), [evento, textoApi])
  const filas = useMemo(() => (evento.tabla?.filas ?? []).map((f, r) => ({
    ...Object.fromEntries((evento.tabla?.columnas ?? []).map((c, k) => [c, f[k]])),
    [CELDAS]: Object.fromEntries((evento.tabla?.columnas ?? []).map((c, k) => [c, evento.tabla?.celdas_texto?.[r]?.[k] ?? null])),
  })), [evento])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${conBase('/simular')}${consulta}`)
      setAviso('sim.res.enlace_copiado')
    } catch { setAviso('sim.res.enlace_error') }
  }
  const informe = async () => {
    try { descargarPng(`informe-${evento.herramienta}.png`, await generarInforme(evento, mundo, ctx)) } catch { setAviso('sim.res.informe_error') }
  }

  return (
    <>
      <Tarjeta titulo={<TextoApi texto={evento.titulo} clave={evento.clave_texto} valores={evento.valores_texto} />} pie={<SelloOrigen origen={evento.origen} />}>
        <div className="simulador__acciones">
          <Boton variante="secundario" onClick={() => void copiar()}>{t('sim.res.copiar')}</Boton>
          <Boton variante="secundario" onClick={() => void informe()}>{t('sim.res.informe')}</Boton>
        </div>
        {aviso && <p className="simulador__nota" role="status">{t(aviso)}</p>}
        {evento.tabla && filas.length > 0 && <Tabla columnas={columnas} filas={filas} titulo={t('sim.res.detalle', { titulo: textoApi(evento.titulo, evento.clave_texto, evento.valores_texto).texto })} porPagina={15} />}
        {evento.notas.map((n, k) => {
          const { clave, valores, decimales } = textoClave(evento.notas_texto?.[k])
          return <p key={n} className="simulador__nota"><TextoApi texto={n} clave={clave} valores={valores} decimales={decimales} /></p>
        })}
        {evento.modelos.length > 0 && (
          <details className="simulador__modelos">
            <summary>{t('sim.res.modelos')}</summary>
            <ul>{evento.modelos.map((m) => <li key={m}><TextoApi texto={m} /></li>)}</ul>
          </details>
        )}
      </Tarjeta>
      <GemeloRadar evento={evento} />
      <EsperaRadar espera={evento.espera_radar} origen={evento.origen} />
      <Bitacora entradas={bitacora} origen={evento.origen} onVaciar={() => { setBitacora([]); guardarBitacora([]) }} />
    </>
  )
}
