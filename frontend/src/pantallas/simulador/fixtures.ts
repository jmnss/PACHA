import type { EventoDto, MundoDto } from '../../api/simulador'

export const ORIGEN = { tipo: 'sintetico', fuente: 'Simulador de eventos', generador: 'datos/simulador.py', version: '1', fecha_generacion: '2026-11-05T00:00:00Z' } as const
const rejilla = { filas: 2, columnas: 2, vmin: -30, vmax: -8, bbox: [-79.3, -4.1, -79.2, -4.0] as [number, number, number, number], datos_b64: btoa(String.fromCharCode(1, 80, 160, 255)) }
const panel = (variable: string, polarizacion: string | null, paleta = 'gris') => ({
  escenario_id: 'simulador:abc', adquisicion_id: null, variable, polarizacion, unidad: 'dB', paleta, leyenda: null, instante: null, rejilla, origen: ORIGEN,
})

export const MUNDO = {
  id: 'abc', n: 128, bbox: [-79.3, -4.1, -79.2, -4.0], region: 'Sierra', fuente_dem: 'terreno sintético', pixel_m: 234, habitantes: 197215,
  humedad_suelo_pct: 50, humedad_combustible_defecto: 0.15, temporada: 'Seca', prec_anual_mm: 900, relieve_png_b64: 'AAAA', marcas: [], origen: ORIGEN,
} as unknown as MundoDto

export const INCENDIO = {
  herramienta: 'incendio', titulo: 'Incendio forestal', celda: [60, 60], lat: -4.05, lon: -79.25, tiempos: ['0 h', '24 h'],
  cuadros_png_b64: ['AAAA', 'AAAA'], capas: [], metricas: [{ etiqueta: 'Área quemada', valor: '12,3 km²', ayuda: 'Superficie' }, { etiqueta: 'Expuestos', valor: '1 200', ayuda: '' }],
  tabla: { columnas: ['Cobertura', 'Área (km²)'], filas: [['Bosque seco', 8.2], ['Cultivo', 4.1]] }, notas: ['Nota del modelo.'], modelos: ['Rothermel (1972)'],
  paneles: [panel('panel_0', 'HV'), panel('panel_1', 'HV'), panel('panel_2', null, 'divergente')],
  titulos_paneles: ['σ⁰ HV antes (dB)', 'σ⁰ HV después (dB)', 'Razón logarítmica HV después/antes'],
  comparable: true, polarizacion: 'HV', metricas_radar: [{ etiqueta: 'Acierto del detector (verdad sintética)', valor: '0,81', ayuda: '' }],
  espera_radar: { ciclo_dias: 12, minimo_dias: 0, maximo_dias: 12, medio_dias: 6, duracion_evento_h: 24, verificado: false },
  resumen: { area_km2: 12.3, expuestos: 1200, victimas: null, perdidas_usd: 3_500_000 }, origen: ORIGEN,
} as unknown as EventoDto

export const TERREMOTO = {
  ...INCENDIO, herramienta: 'terremoto', titulo: 'Terremoto Mw 7,8', comparable: false, polarizacion: null,
  titulos_paneles: ['Deformación vertical (cm)', 'Desplazamiento este (cm)', 'Desplazamiento norte (cm)'],
  paneles: [{ ...INCENDIO.paneles[0], variable: 'panel_0', paleta: 'divergente' }, { ...INCENDIO.paneles[1], variable: 'panel_1', paleta: 'divergente', rejilla: { ...INCENDIO.paneles[1].rejilla, vmin: -5, vmax: 5 } }],
  espera_radar: { ...INCENDIO.espera_radar, duracion_evento_h: null },
} as unknown as EventoDto
