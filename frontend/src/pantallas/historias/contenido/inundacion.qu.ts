import { t, type ContenidoHistoria } from './tipos'

// Borrador en kichwa unificado, pendiente de revisión por hablantes (docs/guia-traduccion-kichwa.md, Tarea 8).
/** Redactada como ejemplo ilustrativo: sin cifras ni nombres de eventos, sin años (docs/challenge.md, honestidad). */
export const inundacionQu: ContenidoHistoria = {
  clave: 'inundacion',
  etiqueta: 'Costapi yaku wicharishka',
  titulo: 'Costa uraypi yaku wicharikpi',
  resumen: 'Costapi shuk pampa tamya pachapi yakuwan jundarin, chaymanta chakirin; radarka intita mana minishtin, puyu kakpipash rikun.',
  queCambia: {
    titulo: 'Ima tikrarin, imarayku ministirin',
    parrafos: [
      ['Costa uraypi tamya pachaka humedalkunata, yaku ñankunata shinallatak kuskapi chakrakunata yakuwan jundachin. Chaki pacha shamukpika, yakuka llukshin. Hayk allpa yakuwan pakashka kashkata, maypi kashkata, hayk pachata kashkata yachayka maypi tarpunata, maypi mana wasi rurana kashkata, pikunata willanatapash akllanapak yanapan.'],
      ['Hawa pachamanta rikuyka shuk llaki charin: ashtawan tamyakpi, puyukunami hawata pakan, tukuy kamerakunaka allpata mana rikunchu. Kay willakuyka radarka imashina rikushkata, ima señalkuna yakuta rikuchishkatapash rikuchin.'],
    ],
  },
  queVeElRadar: {
    titulo: 'Radarka ima rikun, imarayku',
    parrafos: [
      ['NISARka NASA-pa shinallatak India espacial agencia (ISRO)-pa ', t('radar'), ' satélite misiónmi; paypa técnico willaykunaka kamachik panka-wan chiqanyachina kan. Kay shina radarka sensor activomi: pay kikin señalta kachan, kutimukta tupun. Chayrayku punchapipash tutapipash llankan, señalka puyukunata chimpan. Sapa puntopi tupushkataka ', t('sigma0'), ' nin, ', t('dB'), '-pi killkan.'],
      ['Kutimuk señalka allpapa ishkay kamaymanta karin: ', t('rugosidad'), ' shinallatak ', t('dielectrica'), '. Mana pakashka upalla yakuka sinchi llampumi: espejo shina señalta satélitemanta anchuchin, chayrayku shuyupi yana rikurin.'],
      ['Yakuwan jundashka mallkikuna o jatun tarpuy ukupika mana shuklla pasan. Señalka yakupi tupan, chaymanta tullupi (o jatun tarpuypa tullunpi) tupan, satélitemanta kutimun (ishkay kuti kutichiy), chaymi chay allpa ñawpamanta yurakyan. ', t('bandaL'), ' ondaka panka ukutapash chimpan, chayrayku chay kutichiyta killkay ushan. Shinallatak radarka ondata shuk ñanta katishpa kachan chaskinpash, chayta ', t('polarizacion'), ' nin, sapa tantachiyka yakutapash yurakunatapash mana shuklla kutichin. NISAR-pa productokuna ima bandakunata shinallatak polarizacionkunata charinka, kamachik panka-wan chiqanyachina kan.'],
    ],
  },
  comparador: {
    titulo: 'Ñawpa shinallatak washa, tupachikpi',
    introduccion: [
      ['Divisorta kuyuchishpa escenariopa «ñawpa» pasadamanta «washa» pasadakama ri. Yanayak o yurakyak kuskakunami tikrashka. Shuk puntota o cuadrantota tupunkapak, kikin escenariota Observatoriopi kichay.'],
    ],
    polarizacion: 'HH',
    porQue: [t('HH'), ' ', t('polarizacion'), 'mi yakuta ashtawan sumakta rikuchin: mana pakashka yakuka espejo shina kutichikmanta yanayan, yakuwan jundashka yurakunaka ishkay kuti kutichiymanta yurakyan.'],
    otra: [t('HV'), '-man tikrapay tupachinkapak: pankakunatalla ashtawan kutichin, yakupa shuyuchishkaka pishimi.'],
  },
  hipotesis: {
    titulo: 'Rikushkata ima willachinman',
    parrafos: [
      ['Kay rikuchiy escenariopi, shuk ejemplo yuyayka kayshinami: Costapa tamya pachapi tamyaka humedalta jundachin shinallatak uray allpakunaman paktachin; chaki pacha ñawpaman rikpi, yakuka llukshin, yanayak kuskakunaka pishiyan.'],
      ['Kay rikuchiy escenariopi, shuk rikuchik yuyayka kayshinami: kuskapi yaku ñankunapa llukshiyka yakuwan jundashka yurakunata mikuchin, ishkay kuti kutichiyrayku yurakyak kuskakunata, shinallatak kaykunaka mana pakashka yakumanta ashtawan mana utka chakin.'],
      ['Kay rikuchiy escenariopi, runakunapa ruray ejemplo kanmi tarpuy mirayka: humedalpa rantipi chakrakuna rurakpi, allpapa rugosidadta shinallatak humedadta, chaywan radar señalta tikrachin, tamyashka shuklla kakpipash.'],
    ],
  },
  aplicaciones: {
    titulo: 'Shamuk pachapi rurana, ima minishtirinka',
    parrafos: [
      ['NISAR rikuykunawan, kay shuk rikuyka humedalkunata cuidanapak shinallatak puyu kakpipash yaku wicharikunata shuyuman churanapak yanapanman, yakuta, riesgota, tarpuytapash kamachikkunata yanapashpa. Ecuador Costapi ima cobertura shinallatak hayk pasada kanka, kamachik panka-wan chiqanyachina kan.'],
      ['Ejemplomanta shuk tukuri yuyayman rinkapak minishtinmi: shuk kikin kuskapi pasadakuna hatun serie, achka tamya pachakunata shinallatak chaki pachakunata pakta; sapa pasadapi ima polarizacionkuna tiyashka; shinallatak kuskapi validación, yaku sayayta tupushka shinallatak yurakunata rikushkawan. Chaykama, kay willakuyka ima shinami rikurinatalla rikuchin.'],
    ],
  },
}
