import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { mensajeDeError } from '../../api/cliente'
import { useCatalogo, useEvento, useMundo, type PeticionEvento, type PeticionMundo } from '../../api/simulador'
import { Boton } from '../../diseno/Boton'
import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Deslizador } from '../../diseno/Deslizador'
import { Cargando, ErrorBloque } from '../../diseno/Estados'
import { HojaInferior } from '../../diseno/HojaInferior'
import { IconoFinal, IconoInicio, IconoPausa, IconoPlay } from '../../diseno/iconos'
import { RotuloSimulacion } from '../../diseno/RotuloSimulacion'
import { SelloOrigen } from '../../diseno/SelloOrigen'
import { clavesApi } from '../../idioma/clavesApi'
import { TextoApi } from '../../idioma/TextoApi'
import { useT } from '../../idioma/useT'
import { useMenosMovimiento } from '../../estado/useMenosMovimiento'
import { useMovil } from '../../estado/useMovil'
import { useTituloPagina } from '../../estado/useTituloPagina'
import { usePlayback } from '../../tiempo/usePlayback'
import { CapaResultado } from './CapaResultado'
import { CartaMapa } from './CartaMapa'
import { ElegirFenomeno } from './ElegirFenomeno'
import { escribirEstado, leerEstado, sanearParametros, type EstadoSimulador, type ValorParametro } from './estadoSimulador'
import { FENOMENOS, lugarPorDefecto } from './fenomenos'
import { PanelAjustes } from './PanelAjustes'
import type { BorradorMundo } from './PanelMundo'
import { PasosSimulador } from './PasosSimulador'
import { ResultadosEvento } from './ResultadosEvento'
import { Tablero } from './Tablero'
import { PROPIO, useBorradorMundo } from './useBorradorMundo'
import { valoresIniciales } from './valores'
import './simulador.css'

/**
 * Simulador en tres pasos: (1) elige el fenómeno, (2) elige el lugar en el mapa, (3) ajusta y desata.
 * El resultado solo aparece tras «Desatar»: junto al mapa en escritorio, en una hoja que sube en móvil.
 */
export default function Simulador() {
  const { t, formatoNumero } = useT()
  useTituloPagina('titulos.simulador')
  const mensaje = (e: unknown) => mensajeDeError(e, t)
  const [params, setParams] = useSearchParams()
  const estado = useMemo(() => leerEstado(params), [params])
  const catalogo = useCatalogo()
  const cat = catalogo.data
  const movil = useMovil()

  const enPaso1 = !params.has('h') || !(FENOMENOS as readonly string[]).includes(estado.h)
  const mundoReq: PeticionMundo = useMemo(() => ({
    lat: estado.lat, lon: estado.lon, extension_km: estado.ext, fecha: estado.fecha, usar_dem: estado.dem, ciudades: estado.ciudades,
  }), [estado.lat, estado.lon, estado.ext, estado.fecha, estado.dem, estado.ciudades])
  const mundo = useMundo(enPaso1 ? undefined : mundoReq)
  const actualMundo = useMemo(() => ({ lat: estado.lat, lon: estado.lon, ext: estado.ext, fecha: estado.fecha, dem: estado.dem }), [estado.lat, estado.lon, estado.ext, estado.fecha, estado.dem])
  const borrador = useBorradorMundo(cat, actualMundo)

  const actualizar = (parcial: Partial<EstadoSimulador>, reemplazar = true) =>
    setParams(escribirEstado({ ...estado, ...parcial }), { replace: reemplazar })

  // Ajustes que el usuario cambió; los que se ven (con los defectos) son los que se envían al desatar.
  const [elegidos, setElegidos] = useState<Record<string, ValorParametro>>({})
  const herramienta = cat?.herramientas.find((h) => h.id === estado.h)
  useEffect(() => { if (cat) setElegidos(sanearParametros(estado.h, estado.p, cat)) }, [cat, estado.h]) // eslint-disable-line react-hooks/exhaustive-deps
  const valores = herramienta ? valoresIniciales(herramienta, { ...(mundo.data ? { humedad_comb: mundo.data.humedad_combustible_defecto } : {}), ...elegidos }) : {}

  const eventoReq: PeticionEvento | undefined = !enPaso1 && estado.i !== null && estado.j !== null && cat
    ? { mundo: mundoReq, herramienta: estado.h, celda: [estado.i, estado.j], parametros: sanearParametros(estado.h, estado.p, cat) }
    : undefined
  const evento = useEvento(eventoReq)
  const datos = evento.data

  // Punto elegido en el mapa; sin tocar nada, el centro (el lugar del catálogo).
  const [cursor, setCursor] = useState<[number, number] | null>(estado.i !== null && estado.j !== null ? [estado.i, estado.j] : null)
  const n = mundo.data?.n ?? 128
  const punto: [number, number] = cursor ?? [Math.floor(n / 2), Math.floor(n / 2)]

  const [hojaAjustes, setHojaAjustes] = useState(false)
  const [hojaResultado, setHojaResultado] = useState(false)
  const detalle = useRef<HTMLDivElement>(null)

  const desatar = () => {
    actualizar({ i: punto[0], j: punto[1], p: valores }, false)
    setHojaAjustes(false)
    if (movil) setHojaResultado(true)
  }
  const verDetalle = () => {
    setHojaResultado(false)
    requestAnimationFrame(() => detalle.current?.scrollIntoView({ block: 'start' }))
  }
  const elegirFenomeno = (id: string) => {
    if (!cat) return
    const m = lugarPorDefecto(id, cat)
    setElegidos({})
    setCursor(null)
    borrador.setPreset(m?.nombre ?? PROPIO)
    actualizar({ h: id, i: null, j: null, p: {}, ciudades: [], ...(m ? { lat: m.lat, lon: m.lon, ext: m.extension_km } : {}) }, false)
  }
  const elegirLugar = (nombre: string) => {
    const m = cat?.mundos.find((x) => x.nombre === nombre)
    if (!m) return
    borrador.setPreset(nombre)
    setCursor(null)
    actualizar({ lat: m.lat, lon: m.lon, ext: m.extension_km, i: null, j: null, ciudades: [] }, false)
  }
  const aplicarCoordenadas = (b: BorradorMundo) => {
    setCursor(null)
    actualizar({ ...b, i: null, j: null, ciudades: [] }, false)
  }

  // Animación del evento: arranca sola al llegar el resultado (salvo «menos movimiento»: salta al final).
  const menosMovimiento = useMenosMovimiento()
  const pb = usePlayback({ total: datos?.cuadros_png_b64.length ?? 0, intervaloMs: 170 })
  const { ir, play, pausa } = pb
  const ultimo = useRef<unknown>(null)
  useEffect(() => {
    if (!datos || ultimo.current === datos) return
    ultimo.current = datos
    if (menosMovimiento) ir(datos.cuadros_png_b64.length - 1)
    else { ir(0); play() }
  }, [datos, ir, play, menosMovimiento])

  const desatado = estado.i !== null && estado.j !== null
  const cambiaron = desatado && (
    Object.entries(valores).some(([k, v]) => estado.p[k] !== undefined && estado.p[k] !== v)
    || punto[0] !== estado.i || punto[1] !== estado.j)
  const paso: 1 | 2 | 3 = enPaso1 ? 1 : cursor === null && !desatado ? 2 : 3
  const lugarElegido = cat?.mundos.find((m) => m.lat === estado.lat && m.lon === estado.lon)
  const nombreLugar = lugarElegido
    ? <TextoApi texto={lugarElegido.nombre} clave={clavesApi.simMundo(lugarElegido.nombre, 'nombre')} />
    : <span className="num">{formatoNumero(estado.lat, { maximumFractionDigits: 2 })}; {formatoNumero(estado.lon, { maximumFractionDigits: 2 })}</span>
  const textoPunto = cursor === null ? t('sim.lugar.centro') : t('sim.lugar.punto')
  const capaResultado = desatado
    ? <CapaResultado evento={datos} cargando={evento.isFetching} onDetalle={verDetalle}
      herramienta={herramienta} parametros={herramienta ? valoresIniciales(herramienta, estado.p) : estado.p} lugar={lugarElegido?.nombre} />
    : undefined

  const panel = cat && herramienta && (
    <PanelAjustes catalogo={cat} herramienta={herramienta} valores={valores}
      onCambio={(id, v) => setElegidos((e) => ({ ...e, [id]: v }))}
      lugar={lugarElegido?.nombre ?? PROPIO} onLugar={elegirLugar} borrador={borrador}
      onCoordenadas={aplicarCoordenadas} cargandoMundo={mundo.isFetching}
      punto={textoPunto} onDesatar={desatar} desatando={evento.isFetching} cambiaron={cambiaron}
      resultado={movil ? undefined : capaResultado} />
  )

  return (
    <>
      <CabeceraPantalla titulo={t('sim.pantalla.titulo')} hallazgo={enPaso1 ? t('sim.pantalla.hallazgo') : undefined} acciones={<RotuloSimulacion />} />
      <PasosSimulador paso={paso} onFenomeno={() => setParams('', { replace: false })}
        fenomeno={herramienta && <TextoApi texto={herramienta.nombre} clave={clavesApi.simHerramienta(herramienta.id, 'nombre')} />}
        lugar={nombreLugar} />
      {catalogo.isError && <ErrorBloque mensaje={mensaje(catalogo.error)} onReintentar={() => void catalogo.refetch()} />}
      {!cat && !catalogo.isError && <Cargando texto={t('sim.pantalla.cargando_simulador')} />}
      {cat && enPaso1 && <ElegirFenomeno herramientas={cat.herramientas} onElegir={elegirFenomeno} />}
      {cat && !enPaso1 && herramienta && (
        <>
          <div className="sim">
            <section className="sim__mapa basalto" aria-label={t('sim.lugar.aria')}>
              {mundo.isPending && <Cargando texto={t('sim.pantalla.creando_mundo')} filas={2} />}
              {mundo.isError && <ErrorBloque mensaje={mensaje(mundo.error)} onReintentar={() => void mundo.refetch()} />}
              {mundo.data && (
                <>
                  <p className="sim__pista">{t('sim.lugar.toca')}</p>
                  <CartaMapa bbox={mundo.data.bbox}>
                    <Tablero mundo={mundo.data} evento={datos} indice={pb.indice} cursor={cursor ?? (desatado ? null : punto)}
                      onCursor={setCursor} onCelda={(i, j) => setCursor([i, j])} />
                  </CartaMapa>
                  {evento.isError && <ErrorBloque mensaje={mensaje(evento.error)} onReintentar={() => void evento.refetch()} />}
                  {datos && (
                    <div className="reproductor-evento" role="group" aria-label={t('sim.pantalla.animacion')}>
                      <Boton variante="terciario" aria-label={t('piezas.tiempo.reproductor.ir_inicio')} icono={<IconoInicio />} onClick={() => { pausa(); ir(0) }} />
                      <Boton variante="secundario" aria-label={pb.reproduciendo ? t('piezas.tiempo.reproductor.pausa') : t('piezas.tiempo.reproductor.reproducir')} icono={pb.reproduciendo ? <IconoPausa /> : <IconoPlay />}
                        onClick={pb.reproduciendo ? pausa : play} />
                      <Boton variante="terciario" aria-label={t('piezas.tiempo.reproductor.ir_final')} icono={<IconoFinal />} onClick={() => { pausa(); ir(datos.cuadros_png_b64.length - 1) }} />
                      <Deslizador etiqueta={t('sim.pantalla.instante')} valorTexto={datos.tiempos[pb.indice] ?? '—'} min={0} max={datos.cuadros_png_b64.length - 1} step={1}
                        value={pb.indice} onChange={(e) => { pausa(); ir(Number(e.target.value)) }} />
                    </div>
                  )}
                  <SelloOrigen origen={mundo.data.origen} />
                </>
              )}
            </section>
            {!movil && <aside className="sim__panel" aria-label={t('sim.panel.aria')}>{panel}</aside>}
          </div>
          {movil && (
            <div className="sim__barra">
              <Boton variante="secundario" onClick={() => setHojaAjustes(true)}>{t('sim.panel.ajustes')}</Boton>
              <Boton variante="primario" onClick={desatar} disabled={evento.isFetching || mundo.isFetching}>{t('sim.panel.desatar')}</Boton>
            </div>
          )}
          {movil && hojaAjustes && <HojaInferior titulo={t('sim.panel.ajustes')} onCerrar={() => setHojaAjustes(false)}>{panel}</HojaInferior>}
          {movil && hojaResultado && capaResultado && (
            <HojaInferior titulo={t('sim.res.titulo')} onCerrar={() => setHojaResultado(false)}>{capaResultado}</HojaInferior>
          )}
          {datos && mundo.data && (
            <div className="sim__detalle" ref={detalle} id="detalle-evento">
              <ResultadosEvento evento={datos} mundo={mundo.data} estado={estado} />
            </div>
          )}
        </>
      )}
    </>
  )
}
