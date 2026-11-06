import type { TextoPaso } from './guion.es'

// Borrador en kichwa unificado, pendiente de revisión por hablantes (docs/guia-traduccion-kichwa.md, Tarea 15).
/** Guion del recorrido en kichwa. Mismos id y orden que el español; la ruta y la duración vienen de él. */
export const guionQu: TextoPaso[] = [
  {
    id: 'problema', titulo: 'Shuk mayu wicharin, hayk kama kashkata mana pi rikunchu',
    texto: 'Shuk rikuchiy Ecuadorpa Costa uraypi: yaku wicharikpika, puyukunaka hawa pachata pakan, rikunata ashtawan minishtikpi.',
  },
  {
    id: 'nubes', titulo: 'Puyuka mana harkanchu',
    texto: 'Radarka pay kikin señalta kachan, punchapipash tutapipash. Puyukunata wichachiy: rikuy rikchaka chinkan, radarka yakuwan jundashkata rikushpallami katin.',
  },
  {
    id: 'polarizacion', titulo: 'Sapa polarizaciónmi shuk shuk willayta nin',
    texto: 'Mana pakashka yaku, sachakunapa ukupi yaku, rupashka sachapash mana shuklla kutichin, ondata imashina kachashka, imashina chaskishkamanta.',
  },
  {
    id: 'mapa', titulo: 'Willaymanta tikray shuyukama',
    texto: 'Observatoriopika ishkay pasadakunami ima tikrashkata rikuchik shuyu tukun, pachapa katiyniyuk serieyuk, shuk cuadrota tupushkawan.',
  },
  {
    id: 'incendio', titulo: 'Shuk tikray, shuk señal',
    texto: 'Sierrapi incendio: sacha estructurata chinkachikpi, polarización cruzada (HV) uraman shamun. Ñawpa washa tupachinkapak aysay.',
  },
  {
    id: 'simulador', titulo: 'Cayna shamukpika',
    texto: 'Simulador de eventosmi Ecuadorpa chiqan allpa patapi allpa kuyuyta, volcanpa erupciónta o incendiota rurachin, radar ima rikunatapash rikuchin.',
  },
]
