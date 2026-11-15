/** Marcas de coordenadas del margen de la hoja: cada tanto de minutos de arco, dentro de [min, max]. */
const PASOS_MIN = [1, 2, 5, 10, 15, 20, 30, 60]

export interface MarcaCoordenada { valor: number; /** 0–1 desde `min`. */ fraccion: number }

export function marcasCoordenadas(min: number, max: number, maximo = 4): MarcaCoordenada[] {
  if (!(max > min)) return []
  const minutos = (max - min) * 60
  const paso = PASOS_MIN.find((p) => minutos / p <= maximo) ?? 60
  const salida: MarcaCoordenada[] = []
  for (let m = Math.ceil((min * 60) / paso) * paso; m <= max * 60 + 1e-9; m += paso) {
    const valor = m / 60
    salida.push({ valor, fraccion: (valor - min) / (max - min) })
  }
  return salida
}

/** «0°05′ S», «78°30′ O»: grados y minutos enteros con la letra del hemisferio. */
export function gradosMinutos(valor: number, positivo: string, negativo: string): string {
  const total = Math.round(Math.abs(valor) * 60)
  const g = Math.floor(total / 60)
  const m = total % 60
  const letra = total === 0 ? '' : ` ${valor < 0 ? negativo : positivo}`
  return `${g}°${String(m).padStart(2, '0')}′${letra}`
}
