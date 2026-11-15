import { t, type ContenidoHistoria } from './tipos'

export const casitaguaEn: ContenidoHistoria = {
  clave: 'incendio',
  historiaApi: 'incendio',
  sitios: ['casitagua'],
  etiqueta: 'Fire in the Sierra',
  titulo: 'Fire on Casitagua hill',
  resumen: 'What the slope loses when it burns and how a radar that sees through smoke notices it.',
  polarizacion: 'HV',
  pasos: {
    datos: {
      titular: 'Two passes, before and after the fire',
      frase: 'The radar passed over the hill before and after the fire; the two images are compared point by point.',
      cifra: 'Fire start',
      vista: 'Radar signal in {pol}, before and after the fire.',
      detalle: [
        ['Both images cover the same place, so they can be compared point by point.'],
        ['They are from NISAR (GCOV product, ', t('bandaL'), '), processed by the PACHA team. The fire date and the published area come from the press, with their link.'],
      ],
    },
    satelite: {
      titular: 'What burned loses signal',
      frase: 'When fire consumes branches and trunks, less signal should return to the satellite, especially in HV.',
      cifra: 'Signal in {pol} inside the marked area on {fecha} (median)',
      vista: 'Radar signal in {pol}, before and after: darker = fewer branches and trunks.',
      detalle: [
        ['A ', t('radar'), ' sends out its own signal, so it sees through smoke. What returns from each point is called ', t('gamma0'), ' and is measured in ', t('dB'), '.'],
        ['The ', t('bandaL'), ' wave goes through the leaves and reaches branches and trunks. The ', t('HV'), ' ', t('polarizacion'), ' responds to that wood: when it burns, the signal is expected to drop. In ', t('HH'), ' the change is less visible.'],
      ],
    },
    simular: {
      titular: 'Start your own fire',
      frase: 'In the Simulator you can light an example fire and see how far it spreads.',
      cifra: '',
      vista: 'Radar signal in {pol}: compare it with what you simulate.',
      detalle: [
        ['The Simulator generates radar images with a simple physical model. It helps to understand what changes in the signal; its figures do not describe this fire.'],
      ],
    },
    impactos: {
      titular: 'How much the team marked as burned',
      frase: 'The team’s mask marks the burned area; the ΔRFDI layer shows where vegetation changed.',
      cifra: 'Area marked as burned on {fecha}',
      vista: 'After the fire: the team’s burn mask or the ΔRFDI.',
      detalle: [
        ['The ', t('rfdi'), ' compares the signal in ', t('HH'), ' and in ', t('HV'), '. ΔRFDI is the RFDI before minus the RFDI after: according to the team, a positive value means less vegetation.'],
        ['The figures below are hypotheses to be checked: the API compares them with the published area.'],
      ],
    },
  },
}
