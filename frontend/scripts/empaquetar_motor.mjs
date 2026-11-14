// Prepara el motor autoalojado: núcleo de Pyodide, librerías verificadas por sha256, teselas de terreno y manifiesto.
// Uso (desde frontend/): node scripts/empaquetar_motor.mjs --salida <dir>   (el zip de la app ya debe estar en <dir>)
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const FRONTEND = resolve(AQUI, '..')
const RAIZ = resolve(FRONTEND, '..')
const PYODIDE = JSON.parse(readFileSync(join(FRONTEND, 'package.json'), 'utf8')).devDependencies.pyodide
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE}/full/`
const PAQUETES = ['numpy', 'pandas', 'pillow', 'pydantic', 'shapely', 'fastapi']
const NUCLEO = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']
const CACHE = join(FRONTEND, '.cache-pyodide')

const i = process.argv.indexOf('--salida')
if (i < 0 || !process.argv[i + 1]) { console.error('Falta --salida <dir>'); process.exit(2) }
const salida = resolve(process.argv[i + 1])
const destino = join(salida, 'pyodide')
mkdirSync(destino, { recursive: true })
mkdirSync(CACHE, { recursive: true })

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const norm = (n) => n.toLowerCase().replace(/_/g, '-')

const origen = join(FRONTEND, 'node_modules', 'pyodide')
for (const f of NUCLEO) copyFileSync(join(origen, f), join(destino, f))

const lock = JSON.parse(readFileSync(join(origen, 'pyodide-lock.json'), 'utf8'))
const porNombre = new Map(Object.entries(lock.packages).map(([n, p]) => [norm(n), p]))

// Cierre de dependencias de los paquetes pedidos.
const cierre = new Set()
const pendientes = [...PAQUETES]
while (pendientes.length) {
  const n = norm(pendientes.pop())
  if (cierre.has(n)) continue
  const p = porNombre.get(n)
  if (!p) throw new Error(`pyodide-lock.json no tiene el paquete ${n}`)
  cierre.add(n)
  pendientes.push(...p.depends)
}

for (const n of [...cierre].sort()) {
  const p = porNombre.get(n)
  const archivo = join(CACHE, p.file_name)
  let datos = existsSync(archivo) ? readFileSync(archivo) : null
  if (!datos || sha256(datos) !== p.sha256) {
    const r = await fetch(CDN + p.file_name)
    if (!r.ok) throw new Error(`${p.file_name}: HTTP ${r.status}`)
    datos = Buffer.from(await r.arrayBuffer())
    if (sha256(datos) !== p.sha256) throw new Error(`${p.file_name}: sha256 no coincide con pyodide-lock.json`)
    writeFileSync(archivo, datos)
  }
  copyFileSync(archivo, join(destino, p.file_name))
}

const terreno = join(RAIZ, 'data', 'terreno')
if (existsSync(terreno)) {
  const t = join(salida, 'terreno')
  mkdirSync(t, { recursive: true })
  for (const f of readdirSync(terreno).filter((x) => x.endsWith('.png'))) copyFileSync(join(terreno, f), join(t, f))
}

const apps = readdirSync(salida).filter((f) => /^app-.*\.zip$/.test(f))
if (apps.length !== 1) throw new Error(`Se esperaba un único app-*.zip en ${salida} y hay ${apps.length}`)
writeFileSync(join(salida, 'manifiesto.json'), JSON.stringify({ pyodide: PYODIDE, paquetes: PAQUETES, app: apps[0] }, null, 2))
console.log(`Motor listo en ${salida}: ${cierre.size} paquetes, ${apps[0]}`)
