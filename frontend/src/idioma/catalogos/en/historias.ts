import type { historias as esHistorias } from '../es/historias'

export const historias: Record<keyof typeof esHistorias, string> = {
  'historias.indice.etiqueta': 'Stories',
  'historias.indice.principal': '{etiqueta} · main story',
  'historias.pregunta': 'What the radar sees when the water rises or the forest burns, and why.',
  'historias.creditos':
    'Credits: climate data from NASA POWER, province boundaries from geoBoundaries (CC0), Public Sans typeface (SIL OFL).',
  'historias.cargando': 'Loading the story…',
  'historias.sin_escenario.titulo': 'This story has no scenario',
  'historias.sin_escenario.texto': 'There is no demonstration scenario linked to this story.',
  'historias.marca.ejemplo': 'In this demonstration scenario',
  'historias.marca.pendiente': 'pending confirmation with the official documentation',
  'historias.pol.etiqueta': 'Polarization',
  'historias.pol.recomendada': '{pol} · recommended',
  'historias.comparador.sin_pasadas': 'This scenario does not have two different passes to compare.',
  'historias.comparador.calculando': 'Calculating the change between the two passes…',
  'historias.comparador.actualizando': 'Updating…',
  'historias.comparador.antes': 'Before · {fecha}',
  'historias.comparador.despues': 'After · {fecha}',
  'historias.comparador.nota_cinta': 'One notch per satellite pass. Move the cursor to choose «after»; «before» stays fixed.',
  'historias.comparador.ver_observatorio': 'View in the Observatory',
}
