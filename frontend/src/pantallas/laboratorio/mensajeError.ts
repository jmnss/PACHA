import { ErrorApi, MENSAJE_RED } from '../../api/cliente'

export const mensajeError = (e: unknown) => (e instanceof ErrorApi ? e.mensaje : MENSAJE_RED)
