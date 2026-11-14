import { useQuery } from '@tanstack/react-query'
import { llamar } from './cliente'
import type { components } from './tipos'

type S = components['schemas']
export type Catalogo = S['CatalogoDto']
export type Herramienta = S['HerramientaDto']
export type Control = S['ControlDto']
export type MundoDto = S['MundoDto']
export type EventoDto = S['EventoDto']
export type PeticionMundo = S['PeticionMundo']
export type PeticionEvento = S['PeticionEvento']

export const useCatalogo = () =>
  useQuery({ queryKey: ['sim-catalogo'], queryFn: () => llamar<Catalogo>('/api/simulador/catalogo'), staleTime: Infinity })

/** Query (no mutación) para que el origen sintético cuente en la banda de demostración. */
export const useMundo = (p: PeticionMundo | undefined) =>
  useQuery({
    queryKey: ['sim-mundo', p],
    queryFn: () => llamar<MundoDto>('/api/simulador/mundo', p),
    enabled: !!p,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
  })

export const useEvento = (p: PeticionEvento | undefined) =>
  useQuery({
    queryKey: ['sim-evento', p],
    queryFn: () => llamar<EventoDto>('/api/simulador/evento', p),
    enabled: !!p,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  })

export const fundarCiudad = (cuerpo: { mundo: PeticionMundo; celda: [number, number]; nombre: string; habitantes: number }) =>
  llamar<PeticionMundo>('/api/simulador/ciudad', cuerpo)
