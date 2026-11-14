import type { ContenidoFundamentos } from './contenido.tipos'

// Borrador en kichwa unificado, pendiente de revisión por hablantes (docs/guia-traduccion-kichwa.md, Tarea 15).
const pendiente = 'kamachik panka-wan chiqanyachina kan'

export const contenidoQu: ContenidoFundamentos = {
  pendiente,
  radar: [
    [
      'Shuk radar de apertura sintética (',
      { nombre: 'SAR', explicacion: 'Radarmi ñanpi achka tupuykunata tantachishpa sumak rikchakunata ruran.' },
      ') microondakunata kachan, kutimukta tupun. Chayrayku ',
      { nombre: 'activo', explicacion: 'Pay kikin señalta kachan: intipa kanchaytaka mana minishtinchu.' },
      ' sensormi: punchapipash tutapipash llankan, puyukunatapash chimpan.',
    ],
    [
      'Kutimuk señalka hawapa ',
      { nombre: 'rugosidad', explicacion: 'Hawa ondapa sunimanta imashina mana pakta kashkami.' },
      '-manta shinallatak paypa ',
      { nombre: 'constante dieléctrica', explicacion: 'Shuk ima campo eléctricoman hayk kutichinmi; yakuka achkata charin, chayrayku humedadka kutimukpi rikurin.' },
      '-manta tiyan. Chayrayku radarka yakuta, yaku wicharikta, humedadtapash rikuchin. Ishkay pasadawanka allpapa kuyuytapash tupun, centímetro escalapi.',
    ],
  ],
  fenomenos: [
    { cambio: 'Yaku wicharik, humedalkuna', pol: 'HH, VV ima',
      que_ve: 'Upalla yakuka señalta radarmanta anchuchin, chayrayku yana rikurin. Yaku hawapi yurakuna kakpika, ishkay kuti kutichiyka ashtawan kanchayta rikuchin.' },
    { cambio: 'Sacha tukuchiy, incendiokuna', pol: 'HV',
      que_ve: 'Polarización cruzadaka sachapa estructurata (ramakuna, pankakuna) kutichin; chay chinkakpika señalka uraman shamun.' },
    { cambio: 'Chakrakuna, paykunapa alli kawsay', pol: 'HV, VV ima',
      que_ve: 'Wiñaykaka chakrapa estructurata, humedadtapash tikrachin, chaywan señaltapash tarpuy pacha ukupi.' },
    { cambio: 'Allpapa humedad', pol: 'HH, VV ima',
      que_ve: 'Allpapi yakuka constante dieléctricata yapan, chaywan kutimukta: ashtawan yakuyuk allpaka ashtawan kanchayta rikurin.' },
    { cambio: 'Glaciarkuna, mama kuchapi chullunku', pol: 'Achka',
      que_ve: 'Rugosidad, humedad, kuyuypash chullunkuta yakumanta rakin, chaywan frentepa ñawpaman rishkata katina ushan.' },
    { cambio: 'Allpa kuyuykuna, allpa uraman rishka', pol: 'Ishkay pasadakunapa fase',
      que_ve: 'Ishkay pasadakunapa fasekunata tupachikpika, allpa hayk kuyushkata tupun, centímetro escalapi (interferometría).' },
  ],
  polBandas: [
    { nombre: 'Polarización', explicacion: 'Ondapa kachakpi (ñawpa letra) shinallatak chaskikpi (ishkay kak letra) imashina kashka: H horizontal, V vertical.' },
    '-ka ishkay letrawan shutichishkami: HH, VV (paralelakuna) shinallatak HV (cruzada). Sapa shukka estructurapa mana kikin ladomanta kutichin. ',
    { nombre: 'Banda', explicacion: 'Radarpa frecuenciakunapa rakirimi; ondapa sunika ashtawan kakpi, yurakunata ashtawan chimpan.' },
    '-ka ondapa sunita churan.',
  ],
  bandas: [
    { nombre: 'X', longitud: '≈ 2,4–3,8 cm', nota: 'Ninan ukuta rikuchin; yurakunata mana alli chimpanchu.' },
    { nombre: 'C', longitud: '≈ 3,8–7,5 cm', nota: 'Ashtawan sachapa uma pankakunawan tinkirin.' },
    { nombre: 'S', longitud: '≈ 7,5–15 cm', nota: 'C-wan L-pa chawpimi.' },
    { nombre: 'L', longitud: '≈ 15–30 cm', nota: 'Sachapa ukutaka ashtawan chimpan; tullukunatapash allpatapash rikun.' },
  ],
  mision: [
    `NISARka NASA-pa shinallatak ISRO-pa radar de apertura sintética misiónmi. Paypa kachaykuna pacha, órbita, frecuenciakuna, productokuna, rikuy pachapash ${pendiente}, kay appika mana chiqanta nin.`,
  ],
}
