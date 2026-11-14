/** Antepone la base de publicación (`/` en local, `/NISAR-Ecuador/` en Pages) a una ruta que empieza por `/`. */
export function conBase(ruta: string, base: string = import.meta.env.BASE_URL): string {
  return base.replace(/\/$/, '') + ruta
}
