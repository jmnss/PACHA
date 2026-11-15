const CLAVE = 'pacha.guia.vista'
/** Si el almacenamiento falla (ventana privada, bloqueado), se recuerda solo mientras dure la sesión. */
let vistaEnSesion = false

/** ¿Ya se mostró el recorrido de primera visita? */
export function guiaVista(): boolean {
  if (vistaEnSesion) return true
  try { return localStorage.getItem(CLAVE) === '1' } catch { return false }
}

export function marcarGuiaVista(): void {
  vistaEnSesion = true
  try { localStorage.setItem(CLAVE, '1') } catch { /* sin almacenamiento: queda la marca de sesión */ }
}

/** Solo para las pruebas. */
export function olvidarGuiaVista(): void {
  vistaEnSesion = false
  try { localStorage.removeItem(CLAVE) } catch { /* nada */ }
}
