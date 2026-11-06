import { comun } from './comun'
import { fecha } from './fecha'
import { estructura } from './estructura'
import { idioma } from './idioma'

export const en = { ...comun, ...idioma, ...fecha, ...estructura }
