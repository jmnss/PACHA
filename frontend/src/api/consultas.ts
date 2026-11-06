import { keepPreviousData, QueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { ErrorApi, llamar } from './cliente'
import type { components } from './tipos'

type S = components['schemas']
export type Salud = S['Salud']
export type Escenario = S['Escenario']
export type TipoCambio = S['TipoCambio']
export type CapaDto = S['CapaDto']
export type ResultadoCambio = S['ResultadoCambioDto']
export type Medicion = S['MedicionDto']
export type Contexto = S['ContextoDto']
export type PeticionCambio = S['PeticionCambio']
export type PeticionMedicion = S['PeticionMedicion']
export type PeticionEscenario = S['PeticionEscenario']
export type PeticionFotogramas = S['PeticionFotogramas']

const MAX_REINTENTOS = 2

/** Reintenta solo errores reintentables (5xx y red caída); 4xx no. */
export function debeReintentar(intentos: number, error: unknown): boolean {
  return error instanceof ErrorApi && error.reintentable && intentos < MAX_REINTENTOS
}

export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: debeReintentar,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
      },
      mutations: { retry: false },
    },
  })
}

const e = encodeURIComponent

export const useSalud = () =>
  useQuery({ queryKey: ['salud'], queryFn: () => llamar<Salud>('/api/salud'), staleTime: 30_000 })

export const useEscenarios = () =>
  useQuery({ queryKey: ['escenarios'], queryFn: () => llamar<Escenario[]>('/api/escenarios') })

export const useEscenario = (id: string | undefined) =>
  useQuery({
    queryKey: ['escenario', id],
    queryFn: () => llamar<Escenario>(`/api/escenarios/${e(id!)}`),
    enabled: !!id,
  })

export const useTipos = () =>
  useQuery({ queryKey: ['tipos'], queryFn: () => llamar<TipoCambio[]>('/api/tipos') })

export interface ParamsCapa {
  adquisicion: string
  variable: string
  polarizacion?: string | null
}

export const useCapa = (id: string | undefined, p: ParamsCapa | undefined) =>
  useQuery({
    queryKey: ['capa', id, p],
    queryFn: () => {
      const q = new URLSearchParams({ adquisicion: p!.adquisicion, variable: p!.variable })
      if (p!.polarizacion) q.set('polarizacion', p!.polarizacion)
      return llamar<CapaDto>(`/api/escenarios/${e(id!)}/capa?${q}`)
    },
    enabled: !!id && !!p,
  })

/** Query (no mutación): el resultado se cachea por petición y así cuenta para la banda de demostración. */
export const useCambio = (id: string | undefined, p: PeticionCambio | undefined, conservar = false) =>
  useQuery({
    // `conservar`: mientras llega la petición nueva se sigue mostrando el resultado anterior (sin desmontar nada).
    placeholderData: conservar ? keepPreviousData : undefined,
    queryKey: ['cambio', id, p],
    queryFn: () => llamar<ResultadoCambio>(`/api/escenarios/${e(id!)}/cambio`, p),
    enabled: !!id && !!p,
  })

export const useMedicion = (id: string | undefined, p: PeticionMedicion | undefined) =>
  useQuery({
    queryKey: ['medicion', id, p],
    queryFn: () => llamar<Medicion>(`/api/escenarios/${e(id!)}/medicion`, p),
    enabled: !!id && !!p,
  })

export const useContexto = (lat: number | undefined, lon: number | undefined, fecha?: string) =>
  useQuery({
    queryKey: ['contexto', lat, lon, fecha],
    queryFn: () => {
      const q = new URLSearchParams({ lat: String(lat), lon: String(lon) })
      if (fecha) q.set('fecha', fecha)
      return llamar<Contexto | null>(`/api/contexto?${q}`)
    },
    enabled: lat !== undefined && lon !== undefined,
  })

/** Mutación: cada simulación es una acción del usuario; su dato se detecta en el caché de mutaciones. */
export const useSimular = () =>
  useMutation({
    mutationKey: ['simular'],
    mutationFn: (p: PeticionEscenario) => llamar<Escenario>('/api/simulacion/escenario', p),
  })

export const useFotogramas = (p: PeticionFotogramas | undefined) =>
  useQuery({
    queryKey: ['fotogramas', p],
    queryFn: () => llamar<CapaDto[]>('/api/simulacion/fotogramas', p),
    enabled: !!p,
  })

export type Impacto = S['ImpactoDto']

/** Resumen de impacto (solo inundaciones e incendios). */
export const useImpacto = (id: string | undefined, antes: string | undefined, despues: string | undefined, polarizacion?: string, habilitado = true) =>
  useQuery({
    queryKey: ['impacto', id, antes, despues, polarizacion],
    queryFn: () => llamar<Impacto>(`/api/escenarios/${e(id!)}/impacto?antes=${e(antes!)}&despues=${e(despues!)}${polarizacion ? `&polarizacion=${e(polarizacion)}` : ''}`),
    enabled: habilitado && !!id && !!antes && !!despues && antes !== despues,
    staleTime: Infinity,
  })
