import { t, type ContenidoHistoria } from './tipos'

/** Redactada como ejemplo ilustrativo: sin cifras ni nombres de eventos, sin años (docs/challenge.md, honestidad). */
export const incendio: ContenidoHistoria = {
  clave: 'incendio',
  etiqueta: 'Incendio en la Sierra',
  titulo: 'Cuando arde el bosque en la Sierra',
  resumen: 'Una ladera de la Sierra con bosque que se quema en la temporada seca, vista por un radar que atraviesa el humo y las nubes.',
  queCambia: {
    titulo: 'Qué cambia y por qué importa',
    parrafos: [
      ['En la Sierra, la temporada seca deja el bosque y los pastos secos, y un fuego puede consumir en pocos días las hojas, las ramas y parte de los troncos. Saber qué superficie se quemó y cuánta vegetación se perdió ayuda a organizar la restauración, proteger las cuencas y calcular el daño.'],
      ['Durante un incendio, el humo y las nubes tapan la vista de los satélites ópticos. Esta historia muestra qué cambia en la señal de un radar cuando el bosque pierde su estructura.'],
    ],
  },
  queVeElRadar: {
    titulo: 'Qué ve el radar y por qué',
    parrafos: [
      ['Un ', t('radar'), ' es un sensor activo: emite su propia señal y mide lo que vuelve. Por eso funciona de día y de noche, y la señal atraviesa el humo y las nubes. Lo que mide en cada punto se llama ', t('sigma0'), ' y se expresa en ', t('dB'), '.'],
      ['Lo que vuelve depende de la ', t('rugosidad'), ' y de la ', t('dielectrica'), ' del terreno. Un bosque es un conjunto de ramas y troncos que esparcen la señal en todas direcciones; mientras más madera y más follaje, más señal vuelve.'],
      ['Una onda de ', t('bandaL'), ' es larga y atraviesa las hojas para llegar a las ramas y los troncos. Cuando el fuego los consume, esa dispersión desaparece y la señal baja. Qué bandas y qué polarizaciones tendrán los productos de NISAR está pendiente de confirmar con la documentación oficial.'],
    ],
  },
  comparador: {
    titulo: 'Antes y después, en el comparador',
    introduccion: [
      ['Desliza el divisor para pasar de la primera a la última pasada del escenario. La zona que se oscurece es la que perdió estructura. Para medir un punto o un cuadrante, abre el mismo escenario en el Observatorio.'],
    ],
    polarizacion: 'HV',
    porQue: ['La ', t('polarizacion'), ' ', t('HV'), ' es la que mejor resalta el bosque quemado: responde a la dispersión de las ramas y los troncos, y cae cuando esa estructura se consume.'],
    otra: ['Cambia a ', t('HH'), ' para comparar: responde también al suelo y a la humedad, y el cambio del bosque se distingue menos.'],
  },
  hipotesis: {
    titulo: 'Qué podría explicar lo que se ve',
    parrafos: [
      ['En este escenario de demostración, una hipótesis de ejemplo es que la temporada seca deja el combustible (hojarasca, pasto y ramas secas) listo para arder, y que un fuego avanza más rápido ladera arriba cuando sopla el viento.'],
      ['En este escenario de demostración, otra hipótesis ilustrativa es que la zona quemada coincide con las áreas de más biomasa: donde hay más ramas y troncos hay más combustible y, por eso, una caída más marcada de la señal HV.'],
      ['En este escenario de demostración, un impulsor humano de ejemplo son las quemas agrícolas: un fuego para limpiar un terreno de cultivo puede escaparse hacia el bosque vecino si el suelo y el pasto están secos.'],
    ],
  },
  aplicaciones: {
    titulo: 'Aplicaciones futuras y qué haría falta',
    parrafos: [
      ['Con observaciones de NISAR, esta lectura podría servir para cartografiar áreas quemadas aunque haya humo o nubes, y para estimar cuánta biomasa se perdió, apoyando a quienes gestionan el bosque y la restauración. Qué cobertura y cuántas pasadas habrá sobre la Sierra está pendiente de confirmar con la documentación oficial.'],
      ['Para pasar del ejemplo a una conclusión haría falta: una serie de pasadas antes y después del fuego sobre el mismo lugar; las polarizaciones disponibles en cada una; y validación en campo, con parcelas quemadas medidas y mapas de cicatrices independientes. Hasta entonces, esta historia solo ilustra cómo se vería.'],
    ],
  },
}
