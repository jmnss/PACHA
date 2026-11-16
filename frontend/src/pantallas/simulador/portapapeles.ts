/** Copia texto al portapapeles: primero la API moderna; si falla (permiso, contexto no seguro), el método
 * clásico con un `textarea` oculto. Devuelve si se pudo copiar; si no, la interfaz ofrece el texto a mano. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch { /* sigue con el respaldo */ }
  try {
    const area = document.createElement('textarea')
    area.value = texto
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = typeof document.execCommand === 'function' && document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}
