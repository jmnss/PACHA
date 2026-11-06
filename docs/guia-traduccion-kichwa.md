# Guía de traducción al kichwa

## Propósito

La app se ofrece en español (fuente de verdad), inglés y **kichwa unificado** (`qu`, `lang="qu-EC"`).
El kichwa de los catálogos (`frontend/src/idioma/catalogos/qu/`) es un **borrador**: lo escribió el equipo
sin revisión de hablantes. Mientras no esté validado, la app lo dice con el aviso que va bajo la banda de
demostración («Traducción en revisión por hablantes · N de M textos validados»).

Criterios del borrador:

- Kichwa unificado; frases cortas y llanas.
- **No se inventan neologismos.** Un término técnico sin equivalente asentado se deja en español y se
  anota en la tabla de abajo.
- No se traducen nombres propios de lugares, unidades (km², ha, dB, %, m, h) ni siglas (HH, HV, VV, VH,
  SAR, NISAR, NASA, ISRO, ASF).
- La banda «DATOS DE DEMOSTRACIÓN», los sellos de origen y «pendiente de confirmar con la documentación
  oficial» tienen en kichwa el mismo peso que en español.

## Cómo validar

1. Un hablante revisa un área del catálogo (`catalogos/qu/<área>.ts`) frente a su original en
   `catalogos/es/<área>.ts`, en la app con el idioma Kichwa activo.
2. Las correcciones se escriben en el archivo `qu` del área.
3. Cada clave aprobada se añade a `VALIDADAS_QU` en `frontend/src/idioma/catalogos/validadas.ts`; el
   aviso cuenta esas claves.
4. Cuando también se hayan validado los textos largos (relatos de Historias, explicaciones),
   `CONTENIDO_LARGO_QU_VALIDADO` pasa a `true`. Con todo validado, el aviso desaparece.
5. Los términos de la tabla que reciban un equivalente asentado se traducen y se borran de la tabla.

## Términos dejados en español

| Término | Dónde aparece | Motivo |
|---|---|---|
| Nombres de los meses (Enero…Diciembre) y de los días | `catalogos/qu/fecha.ts` | Sin forma asentada confirmada por hablantes; ver «Dudas abiertas». |

## Dudas abiertas

- **Código de idioma:** se usa `qu-EC` (quechua de Ecuador) para el atributo `lang`. Pendiente de
  confirmar con hablantes y con el uso en lectores de pantalla si conviene `qu-EC`, `qug` (kichwa de la
  Sierra) u otro código.
- **Plurales:** el borrador usa el sufijo `-kuna` para varios («1 capa», «3 capakuna»). Falta confirmar
  si, con una cifra delante, el kichwa omite `-kuna` (una sola forma para todos los números).
- **Nombres de los meses:** se dejaron en español; falta decidir si se usan los nombres kichwa
  tradicionales (por ejemplo, de calendario agrícola) o los préstamos del español.
- **«Capa» (capa de mapa):** se dejó «capa», préstamo del español; pendiente de un término asentado.
- **«Cargando…»:** el borrador dice «Chaskishka…», que significa más bien «recibido»; necesita revisión.
