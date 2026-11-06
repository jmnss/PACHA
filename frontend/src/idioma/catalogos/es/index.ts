import { comun } from './comun'
import { fecha } from './fecha'
import { exportar } from './exportar'
import { estructura } from './estructura'
import { historias } from './historias'
import { idioma } from './idioma'
import { observatorio } from './observatorio'
import { origen } from './origen'
import { piezas } from './piezas'
import { simulador } from './simulador'

export const es = { ...comun, ...idioma, ...fecha, ...estructura, ...historias, ...origen, ...piezas, ...exportar, ...observatorio, ...simulador }
