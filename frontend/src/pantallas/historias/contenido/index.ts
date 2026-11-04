import { incendio } from './incendio'
import { inundacion } from './inundacion'
import type { ContenidoHistoria } from './tipos'

/** La historia principal va primero. */
export const HISTORIAS: ContenidoHistoria[] = [inundacion, incendio]
