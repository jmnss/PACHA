import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { llamar } from './cliente'
import type { components } from './tipos'

type S = components['schemas']
export type Nubes = S['NubesDto']
export type RespuestaRadar = S['RespuestaDto']

export const useNubes = (cobertura: number) =>
  useQuery({
    queryKey: ['lab-nubes', cobertura],
    queryFn: () => llamar<Nubes>(`/api/laboratorio/nubes?cobertura=${cobertura}`),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  })

export const useRespuestaRadar = (banda: string, pol: string) =>
  useQuery({
    queryKey: ['lab-respuesta', banda, pol],
    queryFn: () => llamar<RespuestaRadar>(`/api/laboratorio/respuesta?banda=${banda}&pol=${pol}`),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  })
