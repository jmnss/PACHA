/** Marca de «se acaba de navegar»: la primera cabecera que se monta después la consume y recibe el foco. */
let pendiente = false
export const marcarNavegacion = (): void => { pendiente = true }
export function consumirNavegacion(): boolean {
  const p = pendiente
  pendiente = false
  return p
}
