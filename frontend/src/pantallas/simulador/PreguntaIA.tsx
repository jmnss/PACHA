import { useState } from 'react'
import { Boton } from '../../diseno/Boton'
import { useT } from '../../idioma/useT'
import { copiarTexto } from './portapapeles'

/** «Pregúntale a tu IA»: copia el prompt ya armado; si el navegador no deja copiar, lo muestra para copiarlo a mano.
 * No llama a ninguna API: el usuario lo pega en el asistente que prefiera. */
export function PreguntaIA({ prompt }: { prompt: string }) {
  const { t } = useT()
  const [estado, setEstado] = useState<'inicial' | 'copiado' | 'manual'>('inicial')
  const copiar = async () => setEstado((await copiarTexto(prompt)) ? 'copiado' : 'manual')
  return (
    <div className="pregunta-ia">
      <div className="pregunta-ia__fila">
        <Boton variante="secundario" onClick={() => void copiar()}>{t('sim.acc.ia.boton')}</Boton>
        <p className="pregunta-ia__nota">{t('sim.acc.ia.nota')}</p>
      </div>
      {estado === 'copiado' && <p className="pregunta-ia__estado" role="status">{t('sim.acc.ia.copiado')}</p>}
      {estado === 'manual' && (
        <>
          <p className="pregunta-ia__estado" role="status">{t('sim.acc.ia.manual')}</p>
          <label className="pregunta-ia__manual">
            <span>{t('sim.acc.ia.texto')}</span>
            <textarea readOnly value={prompt} rows={8} onFocus={(e) => e.currentTarget.select()} />
          </label>
        </>
      )}
    </div>
  )
}
