import type { Terminos } from './tipos'

// Borrador en kichwa unificado, pendiente de revisión por hablantes (docs/guia-traduccion-kichwa.md, Tarea 8).
// Los nombres de los términos técnicos se dejan en español: no tienen equivalente asentado.
export const terminosQu: Terminos = {
  radar: {
    nombre: 'radar de apertura sintética',
    explicacion: 'Satélitepi kak radarmi; kuyukushpa allpapa sumak rikuykunata rurashka. Pay kikin señalta kachan, chayrayku intipa kanchayta mana minishtinchu.',
  },
  sigma0: {
    nombre: 'σ⁰',
    explicacion: 'Allpapa sapa puntomanta satéliteman hayk señal kutimun. Llampu yakuka pishita kutichin; mallkikunapa umakunaka achkata.',
  },
  dB: {
    nombre: 'dB',
    explicacion: 'Decibelios: achka mana kikin yupaykunata pishiyachik escalami. Sapa 3 dB mana kikin kayka, yapa ishkay kuti o chawpi señal kan.',
  },
  HH: { nombre: 'HH', explicacion: 'Ondaka horizontalmi kachashka shinallatak chaskishka.' },
  HV: { nombre: 'HV', explicacion: 'Horizontalmi kachashka, verticalmi chaskishka.' },
  polarizacion: {
    nombre: 'polarización',
    explicacion: 'Radar ondapa kachashka shinallatak chaskishka ñan. Sapa tantachiyka yakuta, yurakunata, allpatapash mana kikinta kutichin.',
  },
  bandaL: {
    nombre: 'banda L',
    explicacion: 'Suni radar ondakunapa shuk rakirimi. Suni ondakunaka pankakunatapash ramakunatapash pishi ondakunamanta ashtawan alli chimpan.',
  },
  dielectrica: {
    nombre: 'constante dieléctrica',
    explicacion: 'Shuk ima radar ondaman hayk kutichinmi. Yakuka achkata charin: chayrayku yakuyuk allpa chaki allpamanta rakirin.',
  },
  rugosidad: {
    nombre: 'rugosidad',
    explicacion: 'Shuk hawa ondapa sunimanta imashina sinchi kashkami. Llampu hawaka espejo shina ruran; sinchi hawaka señalta tukuy ladoman kachan.',
  },
}
