import { Navigate, useLocation } from 'react-router-dom'

/** Lleva a otra ruta de la app conservando la query y el hash (enlaces viejos y compartidos siguen valiendo). */
export function Redirigir({ a }: { a: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: a, search, hash }} replace />
}
