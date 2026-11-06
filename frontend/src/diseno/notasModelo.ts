import { es } from '../idioma/catalogos/es'

export const AVISO_NOTAS = es['origen.notas.aviso']

/** Siglas y términos de misión: las siglas se leen en mayúsculas exactas («los» no cuenta). */
const SIN_VERIFICAR = /\b(?:GUNW|GOFF|GCOV|GSLC|NISAR|LOS)\b|\b[Bb]anda L\b/

/** Una nota que habla de la misión o de sus productos no está verificada con la documentación oficial. */
export const esNotaSinVerificar = (nota: string) => SIN_VERIFICAR.test(nota)
