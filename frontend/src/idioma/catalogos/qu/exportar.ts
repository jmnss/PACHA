import type { exportar as esExportar } from '../es/exportar'

// Borrador en kichwa unificado, pendiente de revisión por hablantes.
export const exportar: Record<keyof typeof esExportar, string> = {
  'exportar.franja.fuente_desconocida': 'mana yachashka',
  'exportar.error.red': 'Servidor-wan mana tinkichishkachu.',
  'exportar.error.generico': 'Servidor mana tukuchishkachu mañaytaka.',
  'exportar.error.respuesta_invalida': 'Servidorpa kutichiyka mana allichu.',
  'exportar.error.lienzo': 'Mana rurashkachu exportana lienzota.',
  'exportar.error.png': 'Mana rurashkachu PNG-ta.',
}
