/** Antepone la base de publicación (`/` en local, `/<repo>/` en Pages, hoy `/PACHA/`) a una ruta que empieza por `/`. */
export function conBase(ruta: string, base: string = import.meta.env.BASE_URL): string {
  return base.replace(/\/$/, '') + ruta
}
