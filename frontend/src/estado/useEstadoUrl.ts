import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export type CampoString = { tipo: 'string'; porDefecto: string }
export type CampoNumber = { tipo: 'number'; porDefecto: number; min?: number; max?: number }
export type CampoEnum<V extends string = string> = {
  tipo: 'enum'
  valores: readonly V[]
  porDefecto: V
}
export type Campo = CampoString | CampoNumber | CampoEnum
export type Esquema = Record<string, Campo>

export type ValorEstado<C extends Campo> = C extends CampoNumber
  ? number
  : C extends CampoEnum<infer V>
    ? V
    : string
export type Estado<E extends Esquema> = { [K in keyof E]: ValorEstado<E[K]> }

function leer(campo: Campo, crudo: string | null): string | number {
  if (crudo === null) return campo.porDefecto
  switch (campo.tipo) {
    case 'string':
      return crudo
    case 'number': {
      const n = crudo.trim() === '' ? NaN : Number(crudo)
      if (!Number.isFinite(n)) return campo.porDefecto
      if (campo.min !== undefined && n < campo.min) return campo.porDefecto
      if (campo.max !== undefined && n > campo.max) return campo.porDefecto
      return n
    }
    case 'enum':
      return campo.valores.includes(crudo) ? crudo : campo.porDefecto
  }
}

/**
 * Estado de la pantalla en la URL. Valores inválidos o ausentes caen al valor por defecto;
 * los valores por defecto no se escriben en la URL para mantenerla corta.
 */
export function useEstadoUrl<E extends Esquema>(esquema: E) {
  const [params, setParams] = useSearchParams()

  const estado = useMemo(() => {
    const s: Record<string, string | number> = {}
    for (const [clave, campo] of Object.entries(esquema)) s[clave] = leer(campo, params.get(clave))
    return s as Estado<E>
  }, [esquema, params])

  const cambiar = useCallback(
    (parcial: Partial<Estado<E>>, opciones?: { reemplazar?: boolean }) => {
      setParams((previos) => {
        const nuevos = new URLSearchParams(previos)
        for (const [clave, valor] of Object.entries(parcial)) {
          const campo = esquema[clave]
          if (!campo || valor === undefined) continue
          if (leer(campo, String(valor)) !== valor || valor === campo.porDefecto) nuevos.delete(clave)
          else nuevos.set(clave, String(valor))
        }
        return nuevos
      }, { replace: opciones?.reemplazar ?? false })
    },
    [esquema, setParams],
  )

  return [estado, cambiar] as const
}
