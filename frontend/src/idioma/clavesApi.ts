import { es } from './catalogos/es'

/** Claves de los textos de la API que no traen campo `clave_texto`: se derivan del id o del texto en español,
 * con las mismas reglas que `datos/claves.py` (`slug` incluido). */

/** Idéntico a `datos.claves.slug`: minúsculas, sin tildes (NFKD: «CO₂» → «co2»), lo no alfanumérico pasa a `_`. */
export function slug(t: string): string {
  const sinMarcas = t.normalize('NFKD').replace(/\p{M}/gu, '')
  const salida = [...sinMarcas.toLowerCase()].map((c) => (/^[a-z0-9]$/.test(c) ? c : '_'))
  return salida.join('').split('_').filter(Boolean).join('_')
}

/** El id de un escenario simulado lleva un sufijo `~…`; las claves usan el id del catálogo. */
const idBase = (id: string) => id.split('~')[0]

export const clavesApi = {
  tipo: (id: string, campo: 'nombre' | 'descripcion' | 'observable') => `api.tipo.${id}.${campo}`,
  control: (tipo: string, id: string, campo: 'etiqueta' | 'ayuda' | 'unidad') => `api.control.${tipo}.${id}.${campo}`,
  opcion: (tipo: string, control: string, etiquetaEs: string) => `api.opcion.${tipo}.${control}.${slug(etiquetaEs)}`,
  categoria: (variable: string, codigo: number | string) => `api.categoria.${slug(variable)}.${codigo}`,
  escenario: (id: string, campo: 'sitio' | 'descripcion') => `api.escenario.${idBase(id)}.${campo}`,
  contexto: (campo: 'estacion' | 'temporada' | 'nombre_local' | 'regimen' | 'proximo_hito', valorEs: string) =>
    `api.contexto.${campo}.${slug(valorEs)}`,
  simHerramienta: (id: string, campo: 'nombre') => `api.sim.herramienta.${id}.${campo}`,
  simControl: (h: string, id: string, campo: 'etiqueta' | 'ayuda') => `api.sim.control.${h}.${id}.${campo}`,
  simOpcion: (h: string, c: string, etiquetaEs: string) => `api.sim.opcion.${h}.${c}.${slug(etiquetaEs)}`,
  simMundo: (nombreEs: string, campo: 'nombre' | 'descripcion') => `api.sim.mundo.${slug(nombreEs)}.${campo}`,
  labCambio: (nombreEs: string) => `api.lab.cambio.${slug(nombreEs)}`,
  simPanel: (tituloEs: string) => `api.sim.panel.${slug(tituloEs)}`,
  simColumna: (columnaEs: string) => `api.sim.columna.${slug(columnaEs)}`,
  /** Nota del modelo por escenario (sin el sufijo `~…`) y posición (desde 1). */
  nota: (escenarioId: string, posicion: number) => `api.nota.${idBase(escenarioId)}.${posicion + 1}`,
  unidad: (unidadEs: string) => `api.unidad.${slug(unidadEs)}`,
  serie: (tituloEs: string) => `api.serie.${slug(tituloEs)}`,
  orbita: (direccionEs: string) => `api.obs.orbita.${slug(direccionEs)}`,
  /** Métricas con `clave_texto` base: el campo se añade. */
  metrica: (clave: string | null | undefined, campo: 'etiqueta' | 'ayuda') => (clave ? `${clave}.${campo}` : null),
}

/** Familias de claves que el frontend deriva del id o del texto en español (no las emite la API). */
const PREFIJOS_DERIVADOS = [
  'api.tipo.', 'api.control.', 'api.opcion.', 'api.categoria.', 'api.escenario.', 'api.contexto.',
  'api.sim.herramienta.', 'api.sim.control.', 'api.sim.opcion.', 'api.sim.mundo.', 'api.sim.panel.', 'api.sim.columna.',
  'api.lab.cambio.', 'api.lab.leyenda.', 'api.nota.', 'api.unidad.', 'api.obs.orbita.', 'api.serie.',
]
export const esClaveDerivada = (clave: string): boolean => PREFIJOS_DERIVADOS.some((p) => clave.startsWith(p))

/** Texto del modelo con su clave (`TextoClave` de la API): lo que `textoApi` necesita, o nulos si no hay clave. */
export interface TextoClaveApi {
  clave_texto: string
  valores_texto?: Record<string, string | number> | null
  decimales_texto?: Record<string, number> | null
}

export function textoClave(tc: TextoClaveApi | null | undefined): {
  clave: string | null
  valores: Record<string, string | number> | null
  decimales: Record<string, number> | null
} {
  if (!tc) return { clave: null, valores: null, decimales: null }
  return { clave: tc.clave_texto, valores: tc.valores_texto ?? null, decimales: tc.decimales_texto ?? null }
}

/** Cifras de `valores_texto` que Python escribe con un número fijo de decimales. */
const DECIMALES: Record<string, number> = { pct: 1, mw: 1, ha: 0, metros: 0 }

/** Los números de la API llegan sin formato: se escriben a la manera del idioma activo. */
export function valoresApi(
  valores: Record<string, string | number> | null | undefined,
  formato: (n: number, op?: Intl.NumberFormatOptions) => string,
  fecha?: (iso: string) => string,
  decimales?: Record<string, number> | null,
): Record<string, string | number> | undefined {
  if (!valores) return undefined
  return Object.fromEntries(
    Object.entries(valores).map(([k, v]) => {
      // Las fechas viajan en ISO (aaaa-mm-dd) y se escriben a la manera del idioma.
      if (typeof v === 'string' && fecha && /^\d{4}-\d{2}-\d{2}$/.test(v)) return [k, fecha(v)]
      if (typeof v !== 'number') return [k, v]
      const d = decimales?.[k] ?? DECIMALES[k]
      // `…_signo_punto`: cifra que el modelo escribe siempre con signo (+0.64): se conserva en cada idioma.
      const signo = k.endsWith('_signo_punto') ? ({ signDisplay: 'always' } as const) : {}
      return [k, d === undefined ? formato(v, signo) : formato(v, { minimumFractionDigits: d, maximumFractionDigits: d, ...signo })]
    }),
  )
}

const NUMERO = /\d+(?:[\s\u2009\u00a0]\d{3})*(?:,\d+)?/g

/** Valor de una métrica de la API («1 113 viviendas», «0,22 km²»): reescribe las cifras con el formato del idioma,
 * conservando sus decimales, y traduce las palabras «mil» y «personas». Sin `valores_texto.valor`, el texto queda tal cual. */
export function valorMetrica(
  valorEs: string,
  valores: Record<string, string | number> | null | undefined,
  formato: (n: number, op?: Intl.NumberFormatOptions) => string,
  palabras: { mil: string; personas: string },
): string {
  if (!valores || typeof valores.valor !== 'number') return valorEs
  return valorEs
    .replace(NUMERO, (m) => {
      const dec = m.includes(',') ? m.split(',')[1].length : 0
      const n = Number(m.replace(/[\s\u2009\u00a0]/g, '').replace(',', '.'))
      return formato(n, { minimumFractionDigits: dec, maximumFractionDigits: dec })
    })
    .replace(/\bmil\b/g, palabras.mil)
    .replace(/\bpersonas\b/g, palabras.personas)
}

/** Clave de una etiqueta de leyenda: la de su categoría (`variable` + posición) o, si no, la del laboratorio.
 * Solo vale si el español del catálogo coincide con el de la API: así una categoría nueva nunca se traduce mal. */
export function claveLeyenda(variable: string | undefined, posicion: number, etiquetaEs: string): string | null {
  const candidatas = [variable ? clavesApi.categoria(variable, posicion + 1) : null, `api.lab.leyenda.${slug(etiquetaEs)}`]
  for (const c of candidatas) if (c && (es as Record<string, string>)[c] === etiquetaEs) return c
  return null
}
