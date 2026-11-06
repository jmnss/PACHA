import type { historias as esHistorias } from '../es/historias'

// Borrador en kichwa unificado, pendiente de revisión por hablantes (ver docs/guia-traduccion-kichwa.md).
export const historias: Record<keyof typeof esHistorias, string> = {
  'historias.indice.etiqueta': 'Willakuykuna',
  'historias.indice.principal': '{etiqueta} · hatun willakuy',
  'historias.pregunta': 'Yaku wicharikpi o sacha ninawan rupakpi, radarka ima rikun, imarayku?',
  'historias.creditos':
    'Yupaychay: NASA POWER-manta clima, geoBoundaries-manta provinciakunapa límites (CC0), Public Sans tipografía (SIL OFL).',
  'historias.cargando': 'Willakuyta chaskishka…',
  'historias.sin_escenario.titulo': 'Kay willakuypak escenario mana tiyanchu',
  'historias.sin_escenario.texto': 'Kay willakuywan rikuchiy escenario mana tiyanchu.',
  'historias.marca.ejemplo': 'Kay rikuchiy escenariopi',
  'historias.marca.pendiente': 'kamachik panka-wan chiqanyachina kan',
  'historias.pol.etiqueta': 'Polarización',
  'historias.pol.recomendada': '{pol} · ruranapak',
  'historias.comparador.sin_pasadas': 'Kay escenariopi mana ishkay mana kikin pasadakuna tiyanchu tupachinkapak.',
  'historias.comparador.calculando': 'Ishkay pasadakunapa tikrayta yupachishka…',
  'historias.comparador.actualizando': 'Mushukyachishka…',
  'historias.comparador.antes': 'Ñawpa · {fecha}',
  'historias.comparador.despues': 'Washa · {fecha}',
  'historias.comparador.nota_cinta': 'Sapa satélitepa pasadapak shuk rikchay. Kursorta kuyuchishpa «washa»ta akllay; «ñawpa» sayashkallami kan.',
  'historias.comparador.ver_observatorio': 'Observatoriopi rikuy',
}
