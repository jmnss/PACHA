import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErrorApi, MENSAJE_RED } from '../../api/cliente'
import { fundarCiudad, useCatalogo, useEvento, useMundo, type PeticionEvento, type PeticionMundo } from '../../api/simulador'
import { Boton } from '../../diseno/Boton'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Deslizador } from '../../diseno/Deslizador'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { IconoFinal, IconoInicio, IconoPausa, IconoPlay } from '../../diseno/iconos'
import { Pestanas } from '../../diseno/Pestanas'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { Tarjeta } from '../../diseno/Tarjeta'
import { prefiereMenosMovimiento, usePlayback } from '../../tiempo/usePlayback'
import { escribirEstado, leerEstado, sanearParametros, type EstadoSimulador, type ValorParametro } from './estadoSimulador'
import { PanelHerramienta } from './PanelHerramienta'
import { valoresIniciales } from './valores'
import { PanelMundo, type BorradorMundo } from './PanelMundo'
import { Tablero } from './Tablero'
import { ResultadosEvento } from './ResultadosEvento'
import './simulador.css'

const mensaje = (e: unknown) => (e instanceof ErrorApi ? e.mensaje : MENSAJE_RED)

/** Simulador de eventos (antes «Modo Dios»): un evento físico sobre el relieve de Ecuador y lo que vería un radar. */
export default function Simulador() {
  const [params, setParams] = useSearchParams()
  const estado = useMemo(() => leerEstado(params), [params])
  const catalogo = useCatalogo()
  const cat = catalogo.data

  const mundoReq: PeticionMundo = useMemo(() => ({
    lat: estado.lat, lon: estado.lon, extension_km: estado.ext, fecha: estado.fecha, usar_dem: estado.dem, ciudades: estado.ciudades,
  }), [estado.lat, estado.lon, estado.ext, estado.fecha, estado.dem, estado.ciudades])
  const mundo = useMundo(mundoReq)

  const actualizar = (parcial: Partial<EstadoSimulador>, reemplazar = true) =>
    setParams(escribirEstado({ ...estado, ...parcial }), { replace: reemplazar })

  // Valores que el usuario cambió (el resto usa el defecto del catálogo / del mundo).
  const [elegidos, setElegidos] = useState<Record<string, ValorParametro>>({})
  const herramienta = cat?.herramientas.find((h) => h.id === estado.h)
  useEffect(() => { if (cat) setElegidos(sanearParametros(estado.h, estado.p, cat)) }, [cat, estado.h]) // eslint-disable-line react-hooks/exhaustive-deps
  const valores = herramienta ? valoresIniciales(herramienta, { ...(mundo.data ? { humedad_comb: mundo.data.humedad_combustible_defecto } : {}), ...elegidos }) : {}

  const eventoReq: PeticionEvento | undefined = estado.h !== 'ciudad' && estado.i !== null && estado.j !== null && cat
    ? { mundo: mundoReq, herramienta: estado.h, celda: [estado.i, estado.j], parametros: sanearParametros(estado.h, estado.p, cat) }
    : undefined
  const evento = useEvento(eventoReq)

  const ciudad = useMutation({
    mutationFn: fundarCiudad,
    onSuccess: (m) => actualizar({ ciudades: m.ciudades, i: null, j: null }),
  })

  const [cursor, setCursor] = useState<[number, number] | null>(null)
  const alCelda = (i: number, j: number) => {
    if (estado.h === 'ciudad') {
      ciudad.mutate({ mundo: mundoReq, celda: [i, j], nombre: String(valores.nombre ?? 'Nueva Esperanza'), habitantes: Number(valores.habitantes ?? 50000) })
    } else {
      ciudad.reset()
      actualizar({ i, j, p: elegidos }, false)
    }
  }

  // Animación del evento: arranca sola al llegar el resultado (salvo «menos movimiento»: salta al final).
  const datos = evento.data
  const pb = usePlayback({ total: datos?.cuadros_png_b64.length ?? 0, intervaloMs: 170 })
  const { ir, play, pausa } = pb
  const ultimo = useRef<unknown>(null)
  useEffect(() => {
    if (!datos || ultimo.current === datos) return
    ultimo.current = datos
    if (prefiereMenosMovimiento()) ir(datos.cuadros_png_b64.length - 1)
    else { ir(0); play() }
  }, [datos, ir, play])

  const crear = (b: BorradorMundo, h?: string) => {
    const mismoLugar = b.lat === estado.lat && b.lon === estado.lon
    actualizar({ ...b, h: h ?? estado.h, i: null, j: null, p: {}, ciudades: mismoLugar ? estado.ciudades : [] }, false)
    setElegidos({})
    setCursor(null)
  }

  const nombreHerramienta = herramienta?.nombre ?? ''
  return (
    <>
      <CabeceraPantalla
        titulo="Simulador de eventos"
        hallazgo="Provoca un incendio, una tormenta, una crecida, un terremoto o una erupción sobre el relieve de Ecuador y mira cómo lo vería un radar como NISAR. Todo es una simulación."
      />
      {catalogo.isError && <ErrorBloque mensaje={mensaje(catalogo.error)} onReintentar={() => void catalogo.refetch()} />}
      {!cat && !catalogo.isError && <Cargando texto="Cargando el simulador…" />}
      {cat && (
        <div className="simulador">
          <div className="simulador__principal">
            <Tarjeta titulo="Tablero" pie={mundo.data ? <SelloOrigen origen={mundo.data.origen} /> : undefined}>
              <Pestanas etiqueta="Herramienta" pestanas={cat.herramientas.map((h) => ({ id: h.id, etiqueta: h.nombre }))} activa={estado.h}
                onCambiar={(id) => { setElegidos({}); actualizar({ h: id, i: null, j: null, p: {} }, false) }} />
              {mundo.isPending && <Cargando texto="Creando el mundo: la primera vez se descarga el relieve, unos segundos." filas={2} />}
              {mundo.isError && <ErrorBloque mensaje={mensaje(mundo.error)} onReintentar={() => void mundo.refetch()} />}
              {mundo.data && (
                <>
                  <ul className="simulador__chips" aria-label="Datos del mundo">
                    <li>{mundo.data.region}</li>
                    <li>Relieve: {mundo.data.fuente_dem}</li>
                    <li className="num">Celda {Math.round(mundo.data.pixel_m)} m</li>
                    <li className="num">{Math.round(mundo.data.habitantes).toLocaleString('es-EC')} habitantes</li>
                    {mundo.data.temporada && <li>Temporada {mundo.data.temporada.toLowerCase()}</li>}
                  </ul>
                  <Tablero mundo={mundo.data} evento={datos} indice={pb.indice} cursor={cursor} onCursor={setCursor} onCelda={alCelda} />
                  {evento.isFetching && <Cargando texto={`Simulando ${nombreHerramienta.toLowerCase()}… puede tardar unos segundos.`} filas={1} />}
                  {evento.isError && <ErrorBloque mensaje={mensaje(evento.error)} onReintentar={() => void evento.refetch()} />}
                  {ciudad.isError && <p className="simulador__aviso" role="alert">{mensaje(ciudad.error)}</p>}
                  {datos && (
                    <div className="reproductor-evento" role="group" aria-label="Animación del evento">
                      <Boton variante="terciario" aria-label="Ir al inicio" icono={<IconoInicio />} onClick={() => { pausa(); ir(0) }} />
                      <Boton variante="primario" aria-label={pb.reproduciendo ? 'Pausa' : 'Reproducir'} icono={pb.reproduciendo ? <IconoPausa /> : <IconoPlay />}
                        onClick={pb.reproduciendo ? pausa : play} />
                      <Boton variante="terciario" aria-label="Ir al final" icono={<IconoFinal />} onClick={() => { pausa(); ir(datos.cuadros_png_b64.length - 1) }} />
                      <Deslizador etiqueta="Instante del evento" valorTexto={datos.tiempos[pb.indice] ?? '—'} min={0} max={datos.cuadros_png_b64.length - 1} step={1}
                        value={pb.indice} onChange={(e) => { pausa(); ir(Number(e.target.value)) }} />
                    </div>
                  )}
                  <p className="simulador__nota">
                    {estado.h === 'ciudad' ? 'Pulsa el tablero para fundar una ciudad; el mundo se vuelve a poblar con ella.' : 'Pulsa el tablero (o muévete con las flechas y pulsa Enter) para desatar el evento en esa celda.'}
                  </p>
                </>
              )}
            </Tarjeta>
            {datos && mundo.data && <ResultadosEvento evento={datos} mundo={mundo.data} estado={estado} />}
          </div>
          <div className="simulador__lado">
            <Tarjeta titulo="Mundo">
              <PanelMundo catalogo={cat} cargando={mundo.isFetching} onCrear={crear}
                actual={{ lat: estado.lat, lon: estado.lon, ext: estado.ext, fecha: estado.fecha, dem: estado.dem }} />
            </Tarjeta>
            {herramienta && (
              <Tarjeta titulo={`Parámetros · ${herramienta.nombre}`}>
                <PanelHerramienta herramienta={herramienta} valores={valores} onCambio={(id, v) => setElegidos((e) => ({ ...e, [id]: v }))} />
                {estado.ciudades.length > 0 && (
                  <Boton variante="secundario" onClick={() => actualizar({ ciudades: [], i: null, j: null })}>Quitar las ciudades fundadas</Boton>
                )}
              </Tarjeta>
            )}
          </div>
        </div>
      )}
    </>
  )
}
