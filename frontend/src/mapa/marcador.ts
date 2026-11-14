/** ¿El clic nació en un marcador del catálogo (o dentro de él)? Entonces el mapa no debe crear un escenario. */
export function esClicEnMarcador(objetivo: EventTarget | null): boolean {
  return objetivo instanceof Element && objetivo.closest('.mapa__marcador') !== null
}
