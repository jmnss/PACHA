import { clavesApi, valorMetrica } from './clavesApi'
import type { MetricaApi } from './MetricaApi'
import type { ContextoIdioma } from './useT'

/** Etiqueta de una métrica de la API como texto plano en el idioma activo (para informes y CSV). */
export function etiquetaMetricaTexto(m: MetricaApi, ctx: ContextoIdioma): string {
  return ctx.textoApi(m.etiqueta, clavesApi.metrica(m.clave_texto, 'etiqueta'), m.valores_texto).texto
}

/** Valor de una métrica de la API como texto plano: con clave, sus cifras a la manera del idioma; si no, tal cual. */
export function valorMetricaTexto(m: MetricaApi, ctx: ContextoIdioma): string {
  if (!m.clave_texto) return m.valor
  return valorMetrica(m.valor, m.valores_texto, ctx.formatoNumero, { mil: ctx.t('api.valor.mil'), personas: ctx.t('api.valor.personas') })
}

/** Cifras en español con coma decimal («0,81», «12,3 km²») reescritas con el formato del idioma activo. */
export function cifrasEnIdioma(textoEs: string, ctx: ContextoIdioma): string {
  return valorMetrica(textoEs, { valor: 0 }, ctx.formatoNumero, { mil: ctx.t('api.valor.mil'), personas: ctx.t('api.valor.personas') })
}

/** Unidad de una métrica (las que llevan palabras se traducen si hay clave; los símbolos quedan igual). */
export function unidadTexto(unidad: string, ctx: ContextoIdioma): string {
  return /\p{L}{3,}/u.test(unidad) ? ctx.textoApi(unidad, clavesApi.unidad(unidad)).texto : unidad
}
