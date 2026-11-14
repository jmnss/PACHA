export type Celda = [number, number]

/** Celda (fila, columna) bajo un punto de la pantalla; recorta a la malla. */
export function celdaDesdePunto(rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, n: number, x: number, y: number): Celda {
  const lim = (v: number) => Math.min(n - 1, Math.max(0, Math.floor(v)))
  return [lim(((y - rect.top) / rect.height) * n), lim(((x - rect.left) / rect.width) * n)]
}
