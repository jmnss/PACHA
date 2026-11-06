import { comun } from './comun'
import { fecha } from './fecha'
import { exportar } from './exportar'
import { estructura } from './estructura'
import { idioma } from './idioma'
import { origen } from './origen'
import { piezas } from './piezas'

export const en = { ...comun, ...idioma, ...fecha, ...estructura, ...origen, ...piezas, ...exportar }
