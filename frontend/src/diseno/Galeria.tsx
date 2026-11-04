import { useMemo, useState } from 'react'
import { useCambio, useEscenarios, type Escenario } from '../api/consultas'
import { Barras } from '../graficos/Barras'
import { Linea } from '../graficos/Linea'
import { CapaLienzo } from '../mapa/CapaLienzo'
import { MapaBase } from '../mapa/MapaBase'
import { coloresDeCategorias, rampaDePaleta } from './rampas'
import { Boton } from './Boton'
import { Campo } from './Campo'
import { CabeceraPantalla } from './CabeceraPantalla'
import { Deslizador } from './Deslizador'
import { Cargando, ErrorBloque, Vacio } from './Estados'
import { FranjaKpi } from './FranjaKpi'
import { ICONOS, IconoDescargar } from './iconos'
import { Leyenda } from './Leyenda'
import { Interruptor } from './Interruptor'
import { Pestanas } from './Pestanas'
import { Selector } from './Selector'
import { SelloOrigen } from './SelloOrigen'
import { Tabla, type ColumnaTabla } from './Tabla'
import { Tarjeta } from './Tarjeta'
import { Termino } from './Termino'
import { fechaCorta, textoSello } from './origen'
import { CintaPasadas, type Temporada } from '../tiempo/CintaPasadas'
import { ControlesReproductor, VELOCIDADES, type Velocidad } from '../tiempo/ControlesReproductor'
import { indiceMasCercano, useInstante } from '../tiempo/useInstante'
import { usePlayback } from '../tiempo/usePlayback'

const PESTANAS = [
  { id: 'mapa', etiqueta: 'Mapa' },
  { id: 'antes', etiqueta: 'Antes/después' },
  { id: 'serie', etiqueta: 'Serie' },
]

/** CSV de los escenarios con las líneas `# origen` y la advertencia (docs/diseno.md §8). */
function descargarCsv(filas: Record<string, unknown>[], esc: Escenario | undefined) {
  if (!esc) return
  const lineas = [
    `# origen: ${textoSello(esc.origen)}`,
    '# DATOS DE DEMOSTRACIÓN: no son observaciones reales de NISAR',
    'nombre,tipo_cambio,region,resolucion_m,pasadas',
    ...filas.map((f) => [f.nombre, f.tipo_cambio, f.region, f.resolucion_m, f.pasadas].map((v) => `"${String(v)}"`).join(',')),
  ]
  const url = URL.createObjectURL(new Blob([lineas.join('\n')], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'escenarios-demostracion.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/** Tarjeta de la cinta de pasadas: el play recorre las pasadas; ±paso mueve el instante en minutos. */
function TarjetaCinta({ esc }: { esc: Escenario }) {
  const adq = esc.adquisiciones
  const [velocidad, setVelocidad] = useState<Velocidad>('normal')
  const [pasoMin, setPasoMin] = useState(17280)
  const instantes = useMemo(() => adq.map((a) => a.instante), [adq])
  const inst = useInstante(instantes)
  const pb = usePlayback({ total: adq.length, intervaloMs: VELOCIDADES[velocidad].ms, onIndice: inst.irAIndice })
  if (adq.length === 0) return null
  const t0 = Date.parse(adq[0].instante)
  const t1 = Date.parse(adq[adq.length - 1].instante)
  // Ejemplo ilustrativo: evento a media serie y una temporada lluviosa en el primer tercio.
  const iEvento = Math.floor(adq.length / 2)
  const temporadas: Temporada[] = adq.length > 1
    ? [{ inicio: adq[0].instante, fin: new Date(t0 + (t1 - t0) / 3).toISOString(), tipo: 'lluviosa' }]
    : []
  const aIndice = (i: number) => { pb.pausa(); pb.ir(i); inst.irAIndice(i) }
  const mover = (min: number) => {
    pb.pausa()
    const nuevo = Math.min(t1, Math.max(t0, inst.ms + min * 60000))
    inst.irAInstante(nuevo)
    pb.ir(indiceMasCercano(instantes.map((s) => Date.parse(s)), nuevo))
  }
  return (
    <Tarjeta titulo="Cinta de pasadas y reproductor" pie={<SelloOrigen origen={esc.origen} />}>
      <div className="galeria-cinta">
        <CintaPasadas adquisiciones={adq} evento={adq[iEvento].instante} instante={inst.instante} temporadas={temporadas}
          onCambio={(t, i) => { pb.pausa(); pb.ir(i); inst.irAInstante(t) }} />
        <ControlesReproductor
          pasoMin={pasoMin} onPaso={setPasoMin} velocidad={velocidad} onVelocidad={setVelocidad}
          reproduciendo={pb.reproduciendo} onPlay={pb.play} onPausa={pb.pausa}
          onInicio={() => aIndice(0)} onFinal={() => aIndice(adq.length - 1)}
          onAtras={() => mover(-pasoMin)} onAdelante={() => mover(pasoMin)}
          onEvento={() => aIndice(iEvento)} />
      </div>
    </Tarjeta>
  )
}

/** Galería de todos los componentes con datos reales de la API (/_sistema). */
export function Galeria() {
  const escenarios = useEscenarios()
  const [id, setId] = useState('')
  const [pestana, setPestana] = useState('mapa')
  const [umbral, setUmbral] = useState(3)
  const [activo, setActivo] = useState(true)
  const [nombre, setNombre] = useState('')

  const lista = escenarios.data ?? []
  const vacio = escenarios.isSuccess && lista.length === 0
  const esc: Escenario | undefined = lista.find((e) => e.id === id) ?? lista[0]
  const adq = esc?.adquisiciones
  const peticion = adq && adq.length > 1 ? { antes: adq[0].id, despues: adq[adq.length - 1].id } : undefined
  const cambio = useCambio(esc?.id, peticion)

  if (escenarios.isPending) {
    return (
      <>
        <CabeceraPantalla titulo="Sistema de diseño" />
        <Cargando texto="Cargando escenarios de demostración…" />
      </>
    )
  }
  if (escenarios.isError) {
    return (
      <>
        <CabeceraPantalla titulo="Sistema de diseño" />
        <ErrorBloque mensaje="No se pudieron cargar los escenarios." onReintentar={() => void escenarios.refetch()} />
      </>
    )
  }

  if (vacio) {
    return (
      <>
        <CabeceraPantalla titulo="Sistema de diseño" />
        <Vacio titulo="Sin escenarios" texto="La API no devolvió ningún escenario para mostrar en la galería." />
      </>
    )
  }

  const columnasEsc: ColumnaTabla<Record<string, unknown>>[] = [
    { clave: 'nombre', etiqueta: 'Escenario', identidad: true },
    { clave: 'tipo_cambio', etiqueta: 'Tipo de cambio' },
    { clave: 'region', etiqueta: 'Región' },
    { clave: 'resolucion_m', etiqueta: 'Píxel (m)', numerica: true, formato: (v) => Number(v).toLocaleString('es-EC', { minimumFractionDigits: 0 }) },
    { clave: 'pasadas', etiqueta: 'Pasadas', numerica: true },
  ]
  const filasEsc = lista.map((e) => ({ ...e, pasadas: e.adquisiciones.length }))
  const filasAdq = (adq ?? []).map((a) => ({
    fecha: a.id,
    orbita: a.direccion_orbital,
    pol: a.polarizaciones.join(', '),
    n: a.polarizaciones.length,
  }))
  const tablaCambio = cambio.data?.tablas[0]
  const columnasCambio: ColumnaTabla<Record<string, unknown>>[] = (tablaCambio?.columnas ?? []).map((c, i) => ({
    clave: c,
    etiqueta: c,
    identidad: i === 0,
    numerica: (tablaCambio?.filas ?? []).every((f) => f[i] === null || typeof f[i] === 'number') && i > 0,
  }))
  const filasCambio = (tablaCambio?.filas ?? []).map((f) =>
    Object.fromEntries((tablaCambio?.columnas ?? []).map((c, i) => [c, f[i]])),
  )

  const serieCambio = cambio.data?.series[0]
  const porSerie = new Map<string, [string, number][]>()
  for (const [t, v, nombre] of serieCambio?.puntos ?? []) porSerie.set(nombre, [...(porSerie.get(nombre) ?? []), [t, v]])
  const barras = [...porSerie.entries()].map(([etiqueta, p]) => ({ etiqueta, valor: p[p.length - 1][1] }))

  return (
    <>
      <CabeceraPantalla
        titulo="Sistema de diseño"
        hallazgo={`En este escenario de demostración, «${esc?.nombre}» tiene ${adq?.length} pasadas de ${esc?.resolucion_m}\u00a0m de píxel.`}
        acciones={
          <Boton variante="primario" icono={<IconoDescargar />} onClick={() => descargarCsv(filasEsc, esc)}>
            Descargar CSV
          </Boton>
        }
        frescura={esc ? `Generado ${fechaCorta(esc.origen.fecha_generacion)}` : undefined}
      />

      {cambio.data ? (
        <FranjaKpi
          items={cambio.data.metricas.slice(0, 4).map((m, i) => ({
            etiqueta: m.etiqueta,
            valor: m.valor,
            unidad: m.unidad,
            principal: i === 0,
            base: i === 0 ? `entre ${peticion?.antes} y ${peticion?.despues}` : undefined,
          }))}
        />
      ) : cambio.isError ? (
        <ErrorBloque mensaje="No se pudo calcular el cambio." onReintentar={() => void cambio.refetch()} />
      ) : (
        <Cargando texto="Calculando métricas del cambio…" filas={1} />
      )}

      {cambio.data && (
        <Tarjeta titulo="Mapa con una capa de cambio" pie={<SelloOrigen origen={cambio.data.cambio.origen} />}>
          <div className="galeria-mapa">
            <MapaBase bbox={esc?.bbox}>
              <CapaLienzo
                rejilla={cambio.data.cambio.rejilla}
                bbox={cambio.data.cambio.rejilla.bbox}
                rampa={rampaDePaleta(cambio.data.cambio.paleta, cambio.data.cambio.variable) ?? 'gris'}
                categorias={cambio.data.cambio.paleta === 'categorias'
                  ? coloresDeCategorias(cambio.data.cambio.variable, cambio.data.cambio.leyenda?.length ?? 0) : undefined}
              />
            </MapaBase>
          </div>
        </Tarjeta>
      )}
      {esc && <TarjetaCinta key={esc.id} esc={esc} />}
      <Tarjeta titulo="Escenarios de demostración" pie={esc && <SelloOrigen origen={esc.origen} />}>
        <Tabla titulo="Escenarios" columnas={columnasEsc} filas={filasEsc} />
      </Tarjeta>
      <Tarjeta titulo="Leyendas de las capas" pie={esc && <SelloOrigen origen={esc.origen} />}>
        <div className="galeria__leyendas">
          <Leyenda paleta="gris" vmin={-30} vmax={0} unidad="dB" />
          <Leyenda paleta="divergente" vmin={-6} vmax={6} unidad="dB" />
          <Leyenda paleta="categorias" vmin={0} vmax={2} unidad="categoría" variable="cambio_de_inundacion"
            leyenda={[['Nueva inundación', ''], ['Pérdida de inundación', ''], ['Inundación persistente', '']]} />
        </div>
      </Tarjeta>
      {serieCambio && (
        <Tarjeta titulo={serieCambio.titulo}>
          <Linea
            titulo={serieCambio.titulo}
            unidad={serieCambio.unidad}
            origen={serieCambio.origen}
            series={[...porSerie.entries()].map(([nombre, puntos]) => ({ nombre, puntos }))}
            marcas={adq && adq.length > 1 ? [{ instante: adq[adq.length - 1].id, etiqueta: 'después', tipo: 'despues' }, { instante: adq[0].id, etiqueta: 'antes', tipo: 'antes' }] : []}
          />
          <Barras
            titulo={`Último valor de ${serieCambio.titulo}`}
            unidad={serieCambio.unidad}
            origen={serieCambio.origen}
            datos={barras}
          />
        </Tarjeta>
      )}
      {tablaCambio && (
        <Tarjeta titulo={tablaCambio.titulo} pie={<SelloOrigen origen={tablaCambio.origen} />}>
          <Tabla titulo={tablaCambio.titulo} columnas={columnasCambio} filas={filasCambio} />
        </Tarjeta>
      )}

      <div className="galeria-rejilla">
        <div className="galeria-col">
        <Tarjeta titulo="Pasadas del escenario" pie={esc && <SelloOrigen origen={esc.origen} />}>
          <Tabla titulo="Pasadas del escenario" columnas={[
            { clave: 'fecha', etiqueta: 'Fecha', identidad: true },
            { clave: 'orbita', etiqueta: 'Órbita' },
            { clave: 'pol', etiqueta: 'Polarizaciones' },
            { clave: 'n', etiqueta: 'Nº', numerica: true },
          ]} filas={filasAdq} porPagina={10} />
        </Tarjeta>
        <Tarjeta titulo="Pestañas, botones y términos" pie={esc && <SelloOrigen origen={esc.origen} />}>
          <div className="galeria-pila">
            <Pestanas etiqueta="Vistas del observatorio" pestanas={PESTANAS} activa={pestana} onCambiar={setPestana} />
            <div className="galeria-fila">
              <Boton variante="secundario">Secundario</Boton>
              <Boton variante="terciario">Terciario</Boton>
              <Boton variante="secundario" disabled>Desactivado</Boton>
            </div>
            <p className="galeria-texto">El botón primario de la pantalla es el de la cabecera: solo hay uno.</p>
            <p className="galeria-texto">
              El radar mide la retrodispersión, llamada{' '}
              <Termino nombre="σ⁰" explicacion="Cuánta señal vuelve al satélite desde cada punto del suelo. El agua lisa devuelve poca; las copas de los árboles, mucha." />
              , en{' '}
              <Termino nombre="dB" explicacion="Decibelios: una escala logarítmica. Cada 3 dB la señal se duplica o se reduce a la mitad." />
              , con polarización{' '}
              <Termino nombre="HH" explicacion="La antena emite y recibe con la onda vibrando en horizontal." />.
            </p>
          </div>
        </Tarjeta>
        </div>
        <div className="galeria-col">
        <Tarjeta titulo="Campos y controles" pie={esc && <SelloOrigen origen={esc.origen} />}>
          <div className="galeria-pila">
            <Selector
              etiqueta="Escenario"
              value={esc?.id ?? ''}
              onChange={(e) => setId(e.target.value)}
              opciones={lista.map((e) => ({ valor: e.id, texto: e.nombre }))}
            />
            <Campo etiqueta="Lugar" limite="Solo puntos dentro de Ecuador." value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del lugar" />
            <Deslizador etiqueta="Umbral de cambio" valorTexto={`${umbral.toFixed(1)} dB`} limite="Entre 1 y 6 dB." min={1} max={6} step={0.5} value={umbral} onChange={(e) => setUmbral(Number(e.target.value))} />
            <Interruptor etiqueta="Mostrar la pasada anterior" activo={activo} onCambiar={setActivo} />
            <Interruptor etiqueta="Cargar productos de NISAR" activo={false} onCambiar={() => {}} disabled motivo="Aún no hay acceso a los productos oficiales." />
          </div>
        </Tarjeta>
        <Tarjeta titulo="Estados">
          <div className="galeria-pila">
            <Cargando texto="Calculando 120 fotogramas… 4 s" />
            <ErrorBloque
              mensaje="No se pudo calcular el escenario."
              ultimoDato="14:02"
              onReintentar={() => {}}
            />
            <Vacio titulo="Sin pasadas en este rango" texto="Elige otro rango de fechas para ver el cambio." />
          </div>
        </Tarjeta>
        </div>
      </div>
      <Tarjeta titulo="Iconos de contorno">
        <ul className="galeria-iconos">
          {Object.entries(ICONOS).map(([n, I]) => (
            <li key={n}><I tamano={20} />{n}</li>
          ))}
        </ul>
      </Tarjeta>
    </>
  )
}
