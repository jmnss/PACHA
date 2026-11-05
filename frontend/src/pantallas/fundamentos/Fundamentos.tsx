import { CabeceraPantalla } from '../../diseno/CabeceraPantalla'
import { Tabla, type ColumnaTabla } from '../../diseno/Tabla'
import { Tarjeta } from '../../diseno/Tarjeta'
import { Termino } from '../../diseno/Termino'
import { BANDAS, FENOMENOS, PENDIENTE, type Banda, type Fenomeno } from './contenido'
import './fundamentos.css'

const COL_FEN: ColumnaTabla<Fenomeno & Record<string, unknown>>[] = [
  { clave: 'cambio', etiqueta: 'Cambio', identidad: true },
  { clave: 'pol', etiqueta: 'Polarización que suele resaltarlo' },
  { clave: 'que_ve', etiqueta: 'Qué ve el radar' },
]
const COL_BANDAS: ColumnaTabla<Banda & Record<string, unknown>>[] = [
  { clave: 'nombre', etiqueta: 'Banda', identidad: true },
  { clave: 'longitud', etiqueta: 'Longitud de onda típica' },
  { clave: 'nota', etiqueta: 'Qué implica' },
]

/** Fundamentos: la física del radar en lenguaje llano y lo que de NISAR queda por confirmar. */
export default function Fundamentos() {
  return (
    <>
      <CabeceraPantalla titulo="Fundamentos" hallazgo="Lo mínimo que hay que saber para leer una imagen de radar." />
      <div className="fundamentos">
        <Tarjeta titulo="Un radar que ilumina por sí mismo">
          <p className="fundamentos__texto">
            Un radar de apertura sintética (<Termino nombre="SAR" explicacion="Radar que combina muchas mediciones a lo largo de su trayectoria para formar imágenes de alta resolución." />) emite
            microondas y mide el eco. Por eso es un sensor <Termino nombre="activo" explicacion="Emite su propia señal: no depende de la luz del Sol." />: funciona de día y de noche
            y atraviesa las nubes.
          </p>
          <p className="fundamentos__texto">
            El eco depende de la <Termino nombre="rugosidad" explicacion="Cuán irregular es la superficie comparada con la longitud de onda." /> de
            la superficie y de su <Termino nombre="constante dieléctrica" explicacion="Cuánto responde un material al campo eléctrico; el agua la tiene muy alta, así que la humedad se nota en el eco." />.
            Por eso el radar resalta el agua, las inundaciones y la humedad. Con dos pasadas también se mide el movimiento del terreno, a escala de centímetros.
          </p>
        </Tarjeta>
        <Tarjeta titulo="Qué ve el radar en cada tipo de cambio">
          <Tabla columnas={COL_FEN} filas={FENOMENOS as (Fenomeno & Record<string, unknown>)[]} titulo="Cambios y su huella en el radar" />
          <p className="fundamentos__nota">Descripción general de la física; en la app los ejemplos son de demostración.</p>
        </Tarjeta>
        <Tarjeta titulo="Polarizaciones y bandas">
          <p className="fundamentos__texto">
            La <Termino nombre="polarización" explicacion="Orientación de la onda al emitir (primera letra) y al recibir (segunda): H horizontal, V vertical." /> se
            nombra con dos letras: HH, VV (paralelas) y HV (cruzada). Cada una responde a una parte distinta de la estructura.
            La <Termino nombre="banda" explicacion="Rango de frecuencias del radar; a mayor longitud de onda, más penetra la vegetación." /> fija
            la longitud de onda.
          </p>
          <Tabla columnas={COL_BANDAS} filas={BANDAS as (Banda & Record<string, unknown>)[]} titulo="Bandas de radar y su longitud de onda típica" />
          <p className="fundamentos__nota">Longitudes típicas por convención general, no propias de una misión.</p>
        </Tarjeta>
        <Tarjeta titulo="La misión NISAR">
          <p className="fundamentos__texto">
            NISAR es la misión de radar de apertura sintética de NASA e ISRO. Su fecha de lanzamiento, órbita, frecuencias, productos y
            ritmo de observación están {PENDIENTE}, y esta app no los da por ciertos.
          </p>
          <p className="fundamentos__nota">Mientras no haya acceso a los datos oficiales, todo lo que ves aquí son datos de demostración.</p>
        </Tarjeta>
      </div>
    </>
  )
}
