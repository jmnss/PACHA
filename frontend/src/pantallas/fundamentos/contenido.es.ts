/**
 * Texto de «Fundamentos». Solo física general del radar y lo que dice `docs/challenge.md`.
 * Lo específico de NISAR (órbita, frecuencias, productos, fechas) NO se afirma: va marcado
 * «pendiente de confirmar con la documentación oficial».
 */
import type { ContenidoFundamentos } from './contenido.tipos'

const pendiente = 'pendiente de confirmar con la documentación oficial'

export const contenidoEs: ContenidoFundamentos = {
  pendiente,
  radar: [
    [
      'Un radar de apertura sintética (',
      { nombre: 'SAR', explicacion: 'Radar que combina muchas mediciones a lo largo de su trayectoria para formar imágenes de alta resolución.' },
      ') emite microondas y mide el eco. Por eso es un sensor ',
      { nombre: 'activo', explicacion: 'Emite su propia señal: no depende de la luz del Sol.' },
      ': funciona de día y de noche y atraviesa las nubes.',
    ],
    [
      'El eco depende de la ',
      { nombre: 'rugosidad', explicacion: 'Cuán irregular es la superficie comparada con la longitud de onda.' },
      ' de la superficie y de su ',
      { nombre: 'constante dieléctrica', explicacion: 'Cuánto responde un material al campo eléctrico; el agua la tiene muy alta, así que la humedad se nota en el eco.' },
      '. Por eso el radar resalta el agua, las inundaciones y la humedad. Con dos pasadas también se mide el movimiento del terreno, a escala de centímetros.',
    ],
  ],
  fenomenos: [
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
  ],
  polBandas: [
    'La ',
    { nombre: 'polarización', explicacion: 'Orientación de la onda al emitir (primera letra) y al recibir (segunda): H horizontal, V vertical.' },
    ' se nombra con dos letras: HH, VV (paralelas) y HV (cruzada). Cada una responde a una parte distinta de la estructura. La ',
    { nombre: 'banda', explicacion: 'Rango de frecuencias del radar; a mayor longitud de onda, más penetra la vegetación.' },
    ' fija la longitud de onda.',
  ],
  /** Longitudes de onda típicas de cada banda de radar (convención general, no específica de una misión). */
  bandas: [
    { nombre: 'X', longitud: '≈ 2,4–3,8 cm', nota: 'Detalle fino; no atraviesa bien la vegetación.' },
    { nombre: 'C', longitud: '≈ 3,8–7,5 cm', nota: 'Interactúa sobre todo con la copa del dosel.' },
    { nombre: 'S', longitud: '≈ 7,5–15 cm', nota: 'Intermedia entre C y L.' },
    { nombre: 'L', longitud: '≈ 15–30 cm', nota: 'Penetra más el dosel; sensible a troncos y al suelo.' },
  ],
  mision: [
    `NISAR es la misión de radar de apertura sintética de NASA e ISRO. Su fecha de lanzamiento, órbita, frecuencias, productos y ritmo de observación están ${pendiente}, y esta app no los da por ciertos.`,
  ],
}
