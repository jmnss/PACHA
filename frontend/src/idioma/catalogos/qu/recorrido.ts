import type { recorrido as esRecorrido } from '../es/recorrido'

// Borrador en kichwa unificado, pendiente de revisión por hablantes (ver docs/guia-traduccion-kichwa.md).
export const recorrido: Record<keyof typeof esRecorrido, string> = {
  'recorrido.titulo': 'Purina',
  'recorrido.hallazgo': 'Ishkay minutomanta pishi: radarka imarayku ministirishkata rikuy. Laboratoriopi simuladorpipash rikushkakunaka simulaciónmi.',
  'recorrido.contador': '{n}-manta {i} ñan',
  'recorrido.anterior': 'Ñawpa',
  'recorrido.siguiente': 'Katik',
  'recorrido.pausar': 'Sayachiy',
  'recorrido.reanudar': 'Katichiy',
  'recorrido.pasos': 'Ñankuna',
  'recorrido.paso_n': '{i} ñan: {titulo}',
  'recorrido.marco': 'Ñanpa pantalla: {titulo}',
}
