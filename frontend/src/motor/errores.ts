/** Respuesta 500 genérica del motor ante una excepción de Python que la API no tradujo (sin rastro técnico). */
import { es } from '../idioma/catalogos/es'

// Recibe la excepción a propósito para dejar claro que se descarta: nunca llega al usuario.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function respuestaInesperada(_e: unknown): { estado: number; cuerpo: string } {
  return {
    estado: 500,
    cuerpo: JSON.stringify({ mensaje: es['api.error.inesperado'], clave_texto: 'api.error.inesperado' }),
  }
}
