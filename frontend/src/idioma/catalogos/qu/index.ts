import { comun } from './comun'
import { fecha } from './fecha'
import { estructura } from './estructura'
import { idioma } from './idioma'
import { origen } from './origen'

export const qu = { ...comun, ...idioma, ...fecha, ...estructura, ...origen }
