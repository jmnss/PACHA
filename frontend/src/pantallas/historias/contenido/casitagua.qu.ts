import { t, type ContenidoHistoria } from './tipos'

// Borrador en kichwa unificado, pendiente de revisión por hablantes (ver docs/guia-traduccion-kichwa.md).
export const casitaguaQu: ContenidoHistoria = {
  clave: 'incendio',
  historiaApi: 'incendio',
  sitios: ['casitagua'],
  etiqueta: 'Sierrapi nina',
  titulo: 'Casitagua urkupi nina',
  resumen: 'Rupakpi urku ima chinkachin, kushnita yallik radar imashina riparan.',
  polarizacion: 'HV',
  pasos: {
    datos: {
      titular: 'Kutin kutin yallik radar',
      frase: 'Escenarioka urku hawapi satélitepa pasadakunata tantachin, nina ñawpa, washapash.',
      cifra: 'Escenariopi pasadakuna',
      vista: '{pol} radarpa willay, nina ñawpa, washa.',
      detalle: [
        ['Sapa pasadaka kikin pushtupa rikchaymi, kikin ñanmanta hapishka; chaymanta pushtumanta pushtu tupachinchik.'],
        ['Kay rikuchiy escenariopi pasadakunaka sintéticomi, urkupa chiqan allpa hawapi rurashka.'],
      ],
      porLlegar: ['Pushtupa willay panka, pukyuwan: willashka rupashka hatunkay.'],
    },
    satelite: {
      titular: 'Rupashkaka willayta chinkachin',
      frase: 'Nina kallmakunata, kaspikunata mikukpi, ashalla willaymi satéliteman kutimun.',
      cifra: 'Radar rikushka rupashka hatunkay',
      vista: '{pol} radarpa willay, ñawpa, washa: astawan yana = ashalla kallma, kaspi.',
      detalle: [
        ['Shuk ', t('radar'), ' paypa willayta kachan, chaymanta kushnita yallishpa rikun. Sapa pushtumanta kutimukka ', t('sigma0'), ' shutimi, ', t('dB'), ' nishkapi tupurin.'],
        [t('bandaL'), ' antaka pankakunata yallin, kallmakunaman, kaspikunaman chayan. ', t('HV'), ' ', t('polarizacion'), ' chay kaspiman kutichin: rupakpi willay urakun. ', t('HH'), ' ukupi tikrayka ashallami.'],
      ],
      porLlegar: [],
    },
    simular: {
      titular: 'Kikinpa ninata rurai',
      frase: 'Simuladorpi rikuchiy ninata hapichinki, mashnakaman chayakta rikunki.',
      cifra: 'Simulado rupashka hatunkay (sintético chiqan)',
      vista: '{pol} radarpa willay: simulashkawan tupachiy.',
      detalle: [
        ['Sintético chiqanka rikuchiy generadorpa rurashka muyuntinmi. Ñawpa paso detectorpa allí kayta tupunkapakmi.'],
      ],
      porLlegar: ['Casitaguapi simulación, impactokunata wakmanta yupashka.'],
    },
    impactos: {
      titular: 'Ninawan ima chinkarka',
      frase: 'Kay rikuchiy escenariopi rupashka yurakunaka wayraman carbono tukun.',
      cifra: 'Llukshishka CO₂ (yuyashka)',
      vista: '{pol} radarpa willay: yana pushtumi biomasata chinkachirka.',
      detalle: [
        ['APIka rupashka hatunkaywan chinkashka biomasata yupan, chaymanta CO₂ta. Rikuchiy yupaykunami: chiqan datokunawanka rikuna hipótesismi kanman.'],
      ],
      porLlegar: ['Wayrapa allí kay, emisión factorkuna, paykunapa citawan.'],
    },
  },
}
