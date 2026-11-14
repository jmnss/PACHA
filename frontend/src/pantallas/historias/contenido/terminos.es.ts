import type { Terminos } from './tipos'

export const terminosEs: Terminos = {
  radar: {
    nombre: 'radar de apertura sintética',
    explicacion: 'Un radar que va en un satélite y, moviéndose, dibuja imágenes detalladas del suelo. Emite su propia señal, así que no necesita luz del sol.',
  },
  sigma0: {
    nombre: 'σ⁰',
    explicacion: 'Cuánta señal vuelve al satélite desde cada punto del suelo. El agua lisa devuelve poca; las copas de los árboles, mucha.',
  },
  dB: {
    nombre: 'dB',
    explicacion: 'Decibelios: una escala que comprime números muy distintos. Cada 3 dB de diferencia es, más o menos, el doble o la mitad de señal.',
  },
  HH: { nombre: 'HH', explicacion: 'Se emite y se recibe con la onda en horizontal.' },
  HV: { nombre: 'HV', explicacion: 'Se emite en horizontal y se recibe en vertical.' },
  polarizacion: {
    nombre: 'polarización',
    explicacion: 'Orientación de la onda de radar al emitirse y al recibirse. Cada combinación responde distinto al agua, la vegetación y el suelo.',
  },
  bandaL: {
    nombre: 'banda L',
    explicacion: 'Un rango de ondas de radar de longitud larga. Las ondas largas atraviesan mejor las hojas y las ramas que las cortas.',
  },
  dielectrica: {
    nombre: 'constante dieléctrica',
    explicacion: 'Cuánto responde un material a la onda de radar. El agua la tiene alta: por eso un suelo mojado se distingue de uno seco.',
  },
  rugosidad: {
    nombre: 'rugosidad',
    explicacion: 'Qué tan áspera es una superficie comparada con la longitud de la onda. Una superficie lisa actúa como un espejo; una áspera esparce la señal en todas direcciones.',
  },
}
