/**
 * Texto de «Fundamentos». Solo física general del radar y lo que dice `docs/challenge.md`.
 * Lo específico de NISAR (órbita, frecuencias, productos, fechas) NO se afirma: va marcado
 * «pendiente de confirmar con la documentación oficial».
 */
export const PENDIENTE = 'pendiente de confirmar con la documentación oficial'

export interface Fenomeno { cambio: string; que_ve: string; pol: string }

export const FENOMENOS: Fenomeno[] = [
  { cambio: 'Inundaciones y humedales', pol: 'HH y VV',
    que_ve: 'El agua en calma refleja la señal lejos del radar y se ve oscura. Si hay vegetación sobre el agua, el doble rebote la hace más brillante.' },
  { cambio: 'Deforestación e incendios', pol: 'HV',
    que_ve: 'La polarización cruzada responde a la estructura del bosque (ramas, hojas); cuando se pierde, la señal baja.' },
  { cambio: 'Cultivos y su salud', pol: 'HV y VV',
    que_ve: 'El crecimiento cambia la estructura y la humedad del cultivo, y con ellas la señal a lo largo de la temporada.' },
  { cambio: 'Humedad del suelo', pol: 'HH y VV',
    que_ve: 'El agua en el suelo aumenta su constante dieléctrica y, con ella, el eco: suelo más húmedo suele verse más brillante.' },
  { cambio: 'Glaciares y hielo marino', pol: 'Varias',
    que_ve: 'Rugosidad, humedad y movimiento distinguen hielo de agua y permiten seguir el avance del frente.' },
  { cambio: 'Terremotos y subsidencia', pol: 'Fase de dos pasadas',
    que_ve: 'Al comparar la fase de dos pasadas se mide cuánto se movió el terreno, a escala de centímetros (interferometría).' },
]

export interface Banda { nombre: string; longitud: string; nota: string }
/** Longitudes de onda típicas de cada banda de radar (convención general, no específica de una misión). */
export const BANDAS: Banda[] = [
  { nombre: 'X', longitud: '≈ 2,4–3,8 cm', nota: 'Detalle fino; no atraviesa bien la vegetación.' },
  { nombre: 'C', longitud: '≈ 3,8–7,5 cm', nota: 'Interactúa sobre todo con la copa del dosel.' },
  { nombre: 'S', longitud: '≈ 7,5–15 cm', nota: 'Intermedia entre C y L.' },
  { nombre: 'L', longitud: '≈ 15–30 cm', nota: 'Penetra más el dosel; sensible a troncos y al suelo.' },
]
