import { comun } from './comun'
import { fecha } from './fecha'
import { estructura } from './estructura'
import { idioma } from './idioma'
import { origen } from './origen'
import { piezas } from './piezas'

export const es = { ...comun, ...idioma, ...fecha, ...estructura, ...origen, ...piezas }
