import { t, type ContenidoHistoria } from './tipos'

/** Redactada como ejemplo ilustrativo: sin cifras ni nombres de eventos, sin años (docs/challenge.md, honestidad). */
export const inundacion: ContenidoHistoria = {
  clave: 'inundacion',
  etiqueta: 'Inundación en la Costa',
  titulo: 'Cuando el agua sube en la Costa baja',
  resumen: 'Una llanura de la Costa que se cubre de agua en la temporada lluviosa y se seca después, vista por un radar que no necesita sol ni cielo despejado.',
  queCambia: {
    titulo: 'Qué cambia y por qué importa',
    parrafos: [
      ['En la Costa baja, la temporada lluviosa llena de agua los humedales, los cauces y los campos vecinos. Cuando llega la temporada seca, el agua se retira. Saber cuánto terreno se cubre, dónde y por cuánto tiempo ayuda a decidir dónde sembrar, dónde no construir y a quién avisar.'],
      ['Mirar desde el espacio tiene una dificultad: justo cuando más llueve, el cielo está cubierto de nubes y las cámaras comunes no ven el suelo. Esta historia muestra cómo un radar sí lo ve, y qué señales delatan el agua.'],
    ],
  },
  queVeElRadar: {
    titulo: 'Qué ve el radar y por qué',
    parrafos: [
      ['NISAR es una misión de satélite de ', t('radar'), ' de la NASA y la agencia espacial india (ISRO); sus detalles técnicos están pendientes de confirmar con la documentación oficial. Un radar de este tipo es un sensor activo: emite su propia señal y mide lo que vuelve. Por eso funciona de día y de noche, y la señal atraviesa las nubes. Lo que mide en cada punto se llama ', t('sigma0'), ' y se expresa en ', t('dB'), '.'],
      ['Lo que vuelve depende de dos cosas del terreno: su ', t('rugosidad'), ' y su ', t('dielectrica'), '. El agua abierta y en calma es muy lisa: actúa como un espejo y manda la señal lejos del satélite, así que se ve oscura en la imagen.'],
      ['Bajo árboles o cultivos altos inundados pasa lo contrario. La señal rebota en el agua, después en un tronco (o en el tallo de un cultivo alto) y vuelve hacia el satélite (un doble rebote), y la zona se ve más brillante que antes. Una onda de ', t('bandaL'), ' atraviesa parte de las copas, por lo que puede registrar ese rebote. Además, el radar emite y recibe la onda con una orientación determinada, la ', t('polarizacion'), ', y cada combinación responde distinto al agua y a las plantas. Qué bandas y qué polarizaciones tendrán los productos de NISAR está pendiente de confirmar con la documentación oficial.'],
    ],
  },
  comparador: {
    titulo: 'Antes y después, en el comparador',
    introduccion: [
      ['Desliza el divisor para pasar de la pasada «antes» a la pasada «después» del escenario. Las zonas que se oscurecen o se aclaran son las que cambiaron. Para medir un punto o un cuadrante, abre el mismo escenario en el Observatorio.'],
    ],
    polarizacion: 'HH',
    porQue: ['La ', t('polarizacion'), ' ', t('HH'), ' es la que mejor resalta el agua: el agua abierta aparece oscura por la reflexión de espejo, y la vegetación inundada aparece brillante por el doble rebote.'],
    otra: ['Cambia a ', t('HV'), ' para comparar: responde sobre todo al follaje, y el contraste del agua es menor.'],
  },
  hipotesis: {
    titulo: 'Qué podría explicar lo que se ve',
    parrafos: [
      ['En este escenario de demostración, una hipótesis de ejemplo es que las lluvias de la temporada lluviosa de la Costa llenan el humedal y lo desbordan hacia los terrenos bajos; al avanzar la temporada seca, el agua se retira y las zonas oscuras se reducen.'],
      ['En este escenario de demostración, otra hipótesis ilustrativa es que un desborde de los cauces vecinos alimenta las zonas de vegetación inundada, las que se ven brillantes por el doble rebote, y que estas se secan más despacio que el agua abierta.'],
      ['En este escenario de demostración, un impulsor humano de ejemplo es la expansión agrícola: campos que reemplazan al humedal cambian la rugosidad y la humedad del suelo, y con ello su señal de radar, aunque llueva lo mismo.'],
    ],
  },
  aplicaciones: {
    titulo: 'Aplicaciones futuras y qué haría falta',
    parrafos: [
      ['Con observaciones de NISAR, esta misma lectura podría servir para vigilar humedales y cartografiar inundaciones aunque haya nubes, y para apoyar a quienes gestionan el agua, el riesgo y la agricultura. Qué cobertura y cuántas pasadas habrá sobre la Costa de Ecuador está pendiente de confirmar con la documentación oficial.'],
      ['Para pasar del ejemplo a una conclusión haría falta: una serie larga de pasadas del mismo lugar, que cubra varias temporadas lluviosas y secas; las polarizaciones disponibles en cada pasada; y validación en campo con mediciones del nivel del agua y observaciones de la vegetación. Hasta entonces, esta historia solo ilustra cómo se vería.'],
    ],
  },
}
