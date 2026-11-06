import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { IDIOMA_POR_DEFECTO, esCodigoIdioma, langDe, type CodigoIdioma } from './idiomas'
import type { Catalogo } from './traductor'
import { ContextoIdiomaReact, crearContexto } from './useT'

const CLAVE = 'nisar.idioma'

function leerAlmacen(): string | null {
  try {
    return window.localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

function guardar(c: CodigoIdioma): void {
  try {
    window.localStorage.setItem(CLAVE, c)
  } catch {
    /* modo privado o sitio bloqueado: el idioma queda solo en memoria */
  }
}

/** Aplica y borra `?idioma=xx` de la URL (una sola vez, antes de que el router la lea). */
function leerParametro(): CodigoIdioma | null {
  try {
    const url = new URL(window.location.href)
    const v = url.searchParams.get('idioma')
    if (v === null) return null
    url.searchParams.delete('idioma')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    return esCodigoIdioma(v) ? v : null
  } catch {
    return null
  }
}

function delNavegador(): CodigoIdioma {
  const langs = typeof navigator !== 'undefined' ? navigator.languages ?? [] : []
  for (const l of langs) {
    const p = l.toLowerCase().split('-')[0]
    if (esCodigoIdioma(p)) return p
  }
  return IDIOMA_POR_DEFECTO
}

function idiomaInicial(): CodigoIdioma {
  const param = leerParametro()
  if (param) {
    guardar(param)
    return param
  }
  const guardado = leerAlmacen()
  if (esCodigoIdioma(guardado)) return guardado
  return delNavegador()
}

interface Props {
  inicial?: CodigoIdioma
  catalogos?: Partial<Record<CodigoIdioma, Catalogo>>
  children: ReactNode
}

export function ProveedorIdioma({ inicial, catalogos, children }: Props) {
  const [idioma, setIdioma] = useState<CodigoIdioma>(() => inicial ?? idiomaInicial())

  const cambiarIdioma = useCallback((c: CodigoIdioma) => {
    setIdioma(c)
    guardar(c)
  }, [])

  // Otra pestaña o la ventana que contiene a esta (el recorrido incrusta pantallas en un iframe) cambió el idioma:
  // se aplica sin volver a guardarlo, y sin tocar la red.
  useEffect(() => {
    const alAlmacenar = (e: StorageEvent) => {
      if (e.key === CLAVE && esCodigoIdioma(e.newValue)) setIdioma(e.newValue)
    }
    window.addEventListener('storage', alAlmacenar)
    return () => window.removeEventListener('storage', alAlmacenar)
  }, [])

  useEffect(() => {
    document.documentElement.lang = langDe(idioma)
  }, [idioma])

  const valor = useMemo(() => crearContexto(idioma, cambiarIdioma, catalogos), [idioma, cambiarIdioma, catalogos])

  return <ContextoIdiomaReact.Provider value={valor}>{children}</ContextoIdiomaReact.Provider>
}
