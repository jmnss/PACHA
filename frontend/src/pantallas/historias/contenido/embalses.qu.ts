import { t, type ContenidoHistoria } from './tipos'

// Borrador en kichwa unificado, pendiente de revisión por hablantes (ver docs/guia-traduccion-kichwa.md).
export const embalsesQu: ContenidoHistoria = {
  clave: 'embalses',
  historiaApi: 'embalse',
  sitios: ['mazar', 'daule-peripa'],
  etiqueta: 'Embalsekuna, tamyapash',
  titulo: 'Embalsekuna, tamyapash',
  resumen: 'Shuk embalse mashna yakuta wakaychin, phuyukunata yallik radar imashina rikun.',
  polarizacion: 'HH',
  pasos: {
    datos: {
      titular: 'Embalsepi mashna yaku tiyan',
      frase: 'Sapa pasadapi yaku maypi kashkata killkan; chaymanta embalsepa hatunkay llukshin.',
      cifra: '{fecha} punchapi yakupa hatunkay',
      vista: 'Sapa punchapa yaku máscara: ankas kakka yakumi.',
      detalle: [
        ['Máscaraka sapa píxelta «yaku», «mana yaku» nishpa rakin. Hatunkayka embalsepa muyuntin ukupi yaku píxelkunata yapashkami.'],
        ['Kay rikuchiy escenariopi máscaraka sintético rantinmi, chiqan allpa hawapi rurashka; mana rikushkachu.'],
      ],
      porLlegar: ['Embalsepa willay panka, pukyuwan: hatunkay, potencia, imapak, tamya.'],
    },
    satelite: {
      titular: 'Kasilla yakuka yanami rikurin',
      frase: 'Llampu yakuka radarpa willayta karuman kachan, chaymanta mana imapash kutimunchu.',
      cifra: '{fecha} punchapi yakupa hatunkay',
      vista: '{pol} radarpa willay, ñawpa, washa: astawan yana = llampu yaku.',
      detalle: [
        ['Shuk ', t('radar'), ' paypa willayta kachan, imalla kutimuktapash tupun, punchapi, tutapi, phuyukunata yallishpapash. Sapa pushtumanta kutimukka ', t('dB'), ' nishkapi tupurin.'],
        [t('bandaL'), ' antaka sunimi. Kasilla yakupi rirpu shina wakmanta rin; patapi allpa, yurakuna willayta chikchinchin, wakin kutimun. Chaymantami yakupa patataka ', t('HH'), ', ', t('HV'), ' ukupi sumakta rikunchik (', t('polarizacion'), ').'],
      ],
      porLlegar: [],
    },
    simular: {
      titular: 'Ashtawan, ashalla tamyakpi ima tukunman',
      frase: 'Kaypimi wakin killakunapa tamyata akllanki, yaku wicharikta, urakuktapash rikunki.',
      cifra: 'Embalsepa simulado nivel',
      vista: 'Kipa yaku máscara: simulaciónpa kallari.',
      detalle: [
        ['Embalsepa simulaciónka killapa tamyata, allpata hapishpa mashna yaku yaykun, llukshin yachachinka. Rikuchiy shinallami kanka.'],
      ],
      porLlegar: ['Embalsepa simulación: kallari killa, tamya, unaykay.'],
    },
    impactos: {
      titular: 'Yakupa pata mashna tikrarka',
      frase: 'Kay rikuchiy escenariopi yakupa hatunkayka ishkay punchakunapi tikrarin, patatapash llatanman sakin.',
      cifra: 'Ishkay punchakunapi yakupa hatunkay tikray',
      vista: 'Ñawpa, washa yaku máscara: mana ankas tukuyka llatan patami.',
      detalle: [
        ['Tikrayka APImi ishkay máscarakunawan yupan. Chiqan datokunawanka embalsepa kamakwan rikuna hipótesismi kanman.'],
      ],
      porLlegar: [
        'Energía, electricidadpa shinchikay (rikuchiy shina).',
        'Mazar – Daule-Peripa tupachiy: ima kikin, ima shikan.',
      ],
    },
  },
}
