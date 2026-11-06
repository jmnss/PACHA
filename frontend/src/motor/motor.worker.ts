/** Worker del motor: carga Pyodide, descomprime la app Python y atiende las peticiones en orden de llegada. */
import type { EstadoMotor, MensajeAlMotor, MensajeDelMotor } from './protocolo'

interface PyodideMinimo {
  loadPackage(nombres: string[]): Promise<unknown>
  unpackArchive(datos: ArrayBuffer, formato: string, opciones?: { extractDir?: string }): void
  runPythonAsync(codigo: string): Promise<unknown>
  pyimport(nombre: string): { atender(metodo: string, ruta: string, cuerpo: string | null): Promise<unknown> }
}

interface Manifiesto { pyodide: string; paquetes: string[]; app: string }

type Responder = (m: MensajeDelMotor) => void

let arranque: Promise<void> | null = null
let estado: EstadoMotor = 'inactivo'
let detalle: string | undefined
let py: PyodideMinimo | null = null
let cola: Promise<unknown> = Promise.resolve()
const puertos = new Set<Responder>()

function emitirEstado(nuevo: EstadoMotor, d?: string) {
  estado = nuevo
  detalle = d
  puertos.forEach((p) => p({ tipo: 'estado', estado: nuevo, detalle: d }))
}

async function cargar(motorUrl: string): Promise<void> {
  emitirEstado('cargando')
  try {
    const { loadPyodide } = await import(/* @vite-ignore */ motorUrl + 'pyodide/pyodide.mjs')
    const pyodide: PyodideMinimo = await loadPyodide({ indexURL: motorUrl + 'pyodide/' })
    const rm = await fetch(motorUrl + 'manifiesto.json')
    if (!rm.ok) throw new Error(`manifiesto.json: ${rm.status}`)
    const manifiesto: Manifiesto = await rm.json()
    await pyodide.loadPackage(manifiesto.paquetes)
    const ra = await fetch(motorUrl + manifiesto.app)
    if (!ra.ok) throw new Error(`${manifiesto.app}: ${ra.status}`)
    pyodide.unpackArchive(await ra.arrayBuffer(), 'zip', { extractDir: '/app' })
    await pyodide.runPythonAsync(`
import os, sys
sys.path.insert(0, '/app')
os.chdir('/app')
os.environ['NISAR_PROVEEDOR'] = 'demo'
import requests_navegador
requests_navegador.registrar('${motorUrl}')
import arranque
await arranque.iniciar()
`)
    py = pyodide
    emitirEstado('listo')
  } catch (e) {
    emitirEstado('error', e instanceof Error ? e.message : String(e))
  }
}

function manejar(m: MensajeAlMotor, responder: Responder) {
  if (m.tipo === 'iniciar') {
    arranque ??= cargar(m.motorUrl)
    responder({ tipo: 'estado', estado, detalle })
    return
  }
  // Las peticiones esperan al arranque y se atienden de una en una, en orden de llegada.
  cola = cola.then(async () => {
    await arranque
    if (!py) {
      responder({ tipo: 'estado', estado: 'error', detalle })
      return
    }
    try {
      const r = await py.pyimport('arranque').atender(m.metodo, m.ruta, m.cuerpo)
      const [codigo, cuerpo] = (r as { toJs(): [number, string] }).toJs()
      responder({ tipo: 'respuesta', id: m.id, estado: codigo, cuerpo })
    } catch (e) {
      responder({ tipo: 'respuesta', id: m.id, estado: 500, cuerpo: JSON.stringify({ mensaje: String(e) }) })
    }
  })
}

interface AmbitoWorker {
  postMessage(m: MensajeDelMotor): void
  onmessage: ((e: { data: MensajeAlMotor }) => void) | null
}
const ambito = self as unknown as AmbitoWorker
const aqui: Responder = (m) => ambito.postMessage(m)
puertos.add(aqui)
ambito.onmessage = (e) => manejar(e.data, aqui)
