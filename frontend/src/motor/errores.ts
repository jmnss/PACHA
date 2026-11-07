/** Respuesta 500 genérica del motor ante una excepción de Python que la API no tradujo (sin rastro técnico). */
import { es } from '../idioma/catalogos/es'

export function respuestaInesperada(_e: unknown): { estado: number; cuerpo: string } {
  return {
    estado: 500,
    cuerpo: JSON.stringify({ mensaje: es['api.error.inesperado'], clave_texto: 'api.error.inesperado' }),
  }
}
