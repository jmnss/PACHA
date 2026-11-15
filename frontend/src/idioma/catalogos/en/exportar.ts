import type { exportar as esExportar } from '../es/exportar'

export const exportar: Record<keyof typeof esExportar, string> = {
  'exportar.franja.fuente_desconocida': 'unknown',
  'exportar.error.red': 'Could not connect to the server.',
  'exportar.error.generico': 'The server could not complete the request.',
  'exportar.error.respuesta_invalida': 'The server response is not valid.',
  'exportar.error.lienzo': 'Could not create the export canvas.',
  'exportar.error.png': 'Could not generate the PNG.',
}
