/**
 * ¿Hay que avisar de que el kichwa es un borrador? Devuelve las cifras del aviso, o `null` cuando todas
 * las claves están validadas por hablantes y también el contenido largo (relatos, explicaciones).
 */
export function datosAvisoQu(
  claves: readonly string[],
  validadas: ReadonlySet<string>,
  contenidoLargoValidado: boolean,
): { validadas: number; total: number } | null {
  const todas = claves.length > 0 && claves.every((c) => validadas.has(c))
  if (todas && contenidoLargoValidado) return null
  return { validadas: validadas.size, total: claves.length }
}
