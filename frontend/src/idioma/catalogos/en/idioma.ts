import type { idioma as esIdioma } from '../es/idioma'

export const idioma: Record<keyof typeof esIdioma, string> = {
  'idioma.selector.etiqueta': 'Language',
  'idioma.sin_traducir': 'Text not yet translated; shown in Spanish',
  'idioma.aviso_qu': 'Translation under review by speakers · {validadas} of {total} texts validated',
}
