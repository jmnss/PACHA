import { t, type ContenidoHistoria } from './tipos'

// Borrador en kichwa unificado, pendiente de revisión por hablantes (docs/guia-traduccion-kichwa.md, Tarea 8).
/** Redactada como ejemplo ilustrativo: sin cifras ni nombres de eventos, sin años (docs/challenge.md, honestidad). */
export const incendioQu: ContenidoHistoria = {
  clave: 'incendio',
  etiqueta: 'Sierrapi nina',
  titulo: 'Sierrapi sacha rupakpi',
  resumen: 'Sierrapi shuk urku ladera sacha chaki pachapi rupan; radarka humotapash puyukunatapash chimpashpa rikun.',
  queCambia: {
    titulo: 'Ima tikrarin, imarayku ministirin',
    parrafos: [
      ['Sierrapi chaki pachaka sachatapash pastokunatapash chakichin, shinallatak ninaka mana achka punchakunapi pankakunata, ramakunata, tullukunapa shuk rakitapash tukuchin. Hayk allpa rupashkata shinallatak hayk yurakuna illakushkata yachayka restauracionta ruranata, mayukunata cuidanata shinallatak llakita yupanata yanapan.'],
      ['Ninapi, humo shinallatak puyukunaka óptico satélitekunapa rikuyta pakan. Kay willakuyka sacha shayayninta tukuchikpi, radarpa señalpi ima tikrashkata rikuchin.'],
    ],
  },
  queVeElRadar: {
    titulo: 'Radarka ima rikun, imarayku',
    parrafos: [
      ['NISARka NASA-pa shinallatak India espacial agencia (ISRO)-pa ', t('radar'), ' satélite misiónmi; paypa técnico willaykunaka kamachik panka-wan chiqanyachina kan. Kay shina radarka sensor activomi: pay kikin señalta kachan, kutimukta tupun. Chayrayku punchapipash tutapipash llankan, señalka humotapash puyukunatapash chimpan. Sapa puntopi tupushkataka ', t('sigma0'), ' nin, ', t('dB'), '-pi killkan.'],
      ['Kutimuk señalka allpapa ', t('rugosidad'), ' shinallatak ', t('dielectrica'), 'manta karin. Sachaka ramakunapa tullukunapa tantachiymi, paykunaka señalta tukuy ladoman kachan; ashtawan kaspi shinallatak panka kakpi, ashtawan señal kutimun, shinapash mana tukuy ladopi: achka biomasa kakpi señalka saturakun, mana ashtawan wiñanchu.'],
      ['Shuk ', t('bandaL'), ' ondaka suni, pankakunata chimpashpa ramakunamanpash tullukunamanpash chayan. Ninaka paykunata tukuchikpi, chay señal kachayka illakun, señalka urmarin. Shinallatak radarka ondata shuk ñanta katishpa kachan chaskinpash, chayta ', t('polarizacion'), ' nin, sapa tantachiyka ramakunata, allpata, humedadtapash mana shuklla kutichin. NISAR-pa productokuna ima bandakunata shinallatak polarizacionkunata charinka, kamachik panka-wan chiqanyachina kan.'],
    ],
  },
  comparador: {
    titulo: 'Ñawpa shinallatak washa, tupachikpi',
    introduccion: [
      ['Divisorta kuyuchishpa escenariopa «ñawpa» pasadamanta «washa» pasadakama ri. Yanayak kuskaka shayayninta tukuchishkami. Shuk puntota o cuadrantota tupunkapak, kikin escenariota Observatoriopi kichay.'],
    ],
    polarizacion: 'HV',
    porQue: [t('HV'), ' ', t('polarizacion'), 'mi rupashka sachata ashtawan sumakta rikuchin: ramakunapa tullukunapa señal kachayman kutichin, chay shayay tukurikpi urmarin.'],
    otra: [t('HH'), '-man tikrapay tupachinkapak: allpamanpash humedadmanpash kutichin, sacha tikraymi ashtawan mana rikurin.'],
  },
  hipotesis: {
    titulo: 'Rikushkata ima willachinman',
    parrafos: [
      ['Kay rikuchiy escenariopi, shuk ejemplo yuyayka kayshinami: chaki pachaka combustibleta (chusku panka, pasto, chaki ramakuna) rupankapak allichin, wayra wayrakpika nina urku hawaman ashtawan utka rin.'],
      ['Kay rikuchiy escenariopi, shuk rikuchik yuyayka kayshinami: rupashka kuskaka ashtawan biomasa kuskakunawan tupan: maypi ashtawan rama shinallatak tullu tiyan, chaypi ashtawan combustible tiyan, chayrayku HV señalka ashtawan sinchi urmarin.'],
      ['Kay rikuchiy escenariopi, runakunapa ruray ejemplo kanmi chakra rupay: tarpuy allpata chuyayachinkapak ninata churakpi, allpapash pastopash chakishka kakpi, kuskapi sachaman escapanmanmi.'],
    ],
  },
  aplicaciones: {
    titulo: 'Shamuk pachapi rurana, ima minishtirinka',
    parrafos: [
      ['NISAR rikuykunawan, kay rikuyka humo o puyu kakpipash rupashka kuskakunata shuyuman churanapak, hayk biomasa illakushkata yupanapakpash yanapanman, sachata shinallatak restauracionta kamachikkunata yanapashpa. Sierrapi ima cobertura shinallatak hayk pasada kanka, kamachik panka-wan chiqanyachina kan.'],
      ['Ejemplomanta shuk tukuri yuyayman rinkapak minishtinmi: ninamanta ñawpa shinallatak washa pasadakuna kikin kuskapi; sapa shukpi ima polarizacionkuna tiyashka; shinallatak kuskapi validación, tupushka rupashka parcelakunawan shinallatak sapallapa cicatriz shuyukunawan. Chaykama, kay willakuyka ima shinami rikurinatalla rikuchin.'],
    ],
  },
}
