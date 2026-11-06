// Área «simulador»: `sim.<componente>.*`. Los textos que escribe la API (títulos de evento, etiquetas de
// métricas, controles, notas del modelo) no están aquí: pasan por TextoApi hasta que lleven clave (Bloque 4).
export const simulador = {
  // — Pantalla —
  'sim.pantalla.titulo': 'Simulador de eventos',
  'sim.pantalla.hallazgo': 'Provoca un incendio, una tormenta, una crecida, un terremoto o una erupción sobre el relieve de Ecuador y mira cómo lo vería un radar como NISAR. Todo es una simulación.',
  'sim.pantalla.cargando_simulador': 'Cargando el simulador…',
  'sim.pantalla.tablero': 'Tablero',
  'sim.pantalla.herramienta': 'Herramienta',
  'sim.pantalla.creando_mundo': 'Creando el mundo: la primera vez se descarga el relieve, unos segundos.',
  'sim.pantalla.datos_mundo': 'Datos del mundo',
  'sim.pantalla.relieve': 'Relieve',
  'sim.pantalla.celda': 'Celda {m} m',
  'sim.pantalla.habitantes': '{n} habitantes',
  'sim.pantalla.temporada': 'Temporada',
  'sim.pantalla.simulando': 'Simulando {herramienta}… puede tardar unos segundos.',
  'sim.pantalla.animacion': 'Animación del evento',
  'sim.pantalla.instante': 'Instante del evento',
  'sim.pantalla.nota_ciudad': 'Pulsa el tablero para fundar una ciudad; el mundo se vuelve a poblar con ella.',
  'sim.pantalla.nota_evento': 'Pulsa el tablero (o muévete con las flechas y pulsa Enter) para desatar el evento en esa celda.',
  'sim.pantalla.mundo': 'Mundo',
  'sim.pantalla.parametros': 'Parámetros',
  'sim.pantalla.quitar_ciudades': 'Quitar las ciudades fundadas',

  // — Tablero —
  'sim.tablero.aria': 'Tablero del simulador. Pulsa una celda, o mueve el cursor con las flechas (Mayús avanza de diez en diez) y pulsa Enter, para desatar el evento.',

  // — Panel del mundo —
  'sim.mundo.lugar': 'Lugar',
  'sim.mundo.propio': 'Coordenadas propias',
  'sim.mundo.latitud': 'Latitud',
  'sim.mundo.longitud': 'Longitud',
  'sim.mundo.lado': 'Lado del mundo',
  'sim.mundo.km': '{k} km',
  'sim.mundo.fecha': 'Fecha (fija la temporada)',
  'sim.mundo.relieve_real': 'Relieve real (SRTM)',
  'sim.mundo.creando': 'Creando el mundo…',
  'sim.mundo.crear': 'Crear el mundo',

  // — Gemelo del radar —
  'sim.gemelo.titulo': 'Lo que vería un radar como NISAR',
  'sim.gemelo.nota': 'Es una simulación de un radar como NISAR sobre el evento simulado, no una observación. Desliza el divisor para pasar de «antes» a «después».',
  'sim.gemelo.por_que_hv': 'La polarización HV (emite en horizontal y recibe en vertical) responde a la estructura del dosel y a su biomasa: se oscurece donde el fuego consume la vegetación.',
  'sim.gemelo.por_que_hh': 'La polarización HH responde con fuerza al agua abierta, que se ve oscura por la reflexión especular, y a la vegetación inundada, que se ve brillante por el doble rebote.',
  'sim.gemelo.deteccion_aria': 'Detección del radar frente a la verdad sintética',

  // — Espera del radar —
  'sim.espera.titulo': '¿Cuándo lo vería el radar?',
  'sim.espera.duracion': 'Duración del evento',
  'sim.espera.duracion_corta': 'Evento',
  'sim.espera.media': 'Espera media hasta la primera imagen',
  'sim.espera.media_corta': 'Espera media',
  'sim.espera.maxima': 'Espera máxima hasta la primera imagen',
  'sim.espera.maxima_corta': 'Espera máx.',
  'sim.espera.grafico': 'Duración del evento y espera hasta la primera imagen (horas)',
  'sim.espera.intro_verificado': 'Con un ciclo de repetición supuesto de {ciclo} días (verificado), un radar como NISAR tardaría entre {min} y {max} días en volver a pasar por este lugar; en promedio, {medio} días.',
  'sim.espera.intro_pendiente': 'Con un ciclo de repetición supuesto de {ciclo} días (pendiente de confirmar con la documentación oficial), un radar como NISAR tardaría entre {min} y {max} días en volver a pasar por este lugar; en promedio, {medio} días.',
  'sim.espera.instantaneo': 'Este evento es instantáneo: la imagen siempre llega después de que ocurre.',
  'sim.espera.dura_antes': 'Este evento dura {dur} h: lo más probable es que ocurra y termine antes de la primera imagen.',
  'sim.espera.dura_durante': 'Este evento dura {dur} h: la primera imagen podría llegar durante el evento.',

  // — Resultados —
  'sim.res.copiar': 'Copiar enlace',
  'sim.res.informe': 'Informe de una página (PNG)',
  'sim.res.enlace_copiado': 'Enlace copiado.',
  'sim.res.enlace_error': 'No se pudo copiar: copia la dirección del navegador.',
  'sim.res.informe_error': 'No se pudo generar el informe.',
  'sim.res.detalle': 'Detalle de los efectos: {titulo}',
  'sim.res.modelos': 'Modelos usados',

  // — Bitácora —
  'sim.bitacora.titulo': 'Bitácora de eventos',
  'sim.bitacora.tabla': 'Eventos simulados en este navegador',
  'sim.bitacora.descargar': 'Descargar CSV',
  'sim.bitacora.vaciar': 'Vaciar la bitácora',
  'sim.bitacora.col_evento': 'Evento',
  'sim.bitacora.col_lugar': 'Lugar',
  'sim.bitacora.col_temporada': 'Temporada',
  'sim.bitacora.col_area': 'Área (km²)',
  'sim.bitacora.col_expuestos': 'Expuestos',
  'sim.bitacora.col_victimas': 'Víctimas',
  'sim.bitacora.col_perdidas': 'Pérdidas (M USD)',
  'sim.bitacora.col_deteccion': 'Detección del radar',

  // — Coordenadas e informe —
  'sim.coords': '{lat}° {ns}, {lon}° {eo}',
  'sim.coords.norte': 'N',
  'sim.coords.sur': 'S',
  'sim.coords.oeste': 'O',
  'sim.informe.temporada': 'temporada {temporada}',
  'sim.informe.aviso': 'Simulación con modelos físicos publicados: no son observaciones reales de NISAR.',
  'sim.informe.error_imagen': 'No se pudo cargar la imagen del informe.',
  'sim.informe.error_lienzo': 'No se pudo crear el lienzo del informe.',
}
