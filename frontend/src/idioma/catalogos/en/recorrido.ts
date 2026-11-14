import type { recorrido as esRecorrido } from '../es/recorrido'

export const recorrido: Record<keyof typeof esRecorrido, string> = {
  'recorrido.titulo': 'Tour',
  'recorrido.hallazgo': 'Less than two minutes to see why a radar matters. Everything shown is demonstration data.',
  'recorrido.contador': 'Step {i} of {n}',
  'recorrido.anterior': 'Previous',
  'recorrido.siguiente': 'Next',
  'recorrido.pausar': 'Pause',
  'recorrido.reanudar': 'Resume',
  'recorrido.pasos': 'Steps',
  'recorrido.paso_n': 'Step {i}: {titulo}',
  'recorrido.marco': 'Screen for the step: {titulo}',
}
