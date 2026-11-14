# Propuestas de identidad «Tierra viva» (T1 del rediseño)

Tres direcciones visuales para PACHA, cada una aplicada a **Inicio** y al **Simulador**, capturadas a 1440 y
390 px. Son páginas de muestra estáticas (HTML y CSS, sin React): sirven para elegir una dirección, no son código de la app.
Cuando el equipo elija una, `docs/diseno.md` se reescribe como v2 y se actualiza `tokens.css`.

Las tres comparten lo que fija el brief (`docs/rediseno-pacha.md` §2): tema claro y cálido, superficies de
basalto para los mapas, paleta de paisaje ecuatoriano (basalto, páramo, cacao, laguna y un acento ocre o
achiote), serif humanista para títulos con Public Sans para el cuerpo, motivo de curvas de nivel y logo de
curvas de nivel con barrido de radar. Lo que cambia es **el mundo del que sale la composición**.

| | Dirección | Mundo | Firma | Riesgo |
|---|---|---|---|---|
| A | **Carta** | La hoja topográfica del IGM: papel, cuadrícula de coordenadas en el margen, curvas en sepia, hidrografía en verde azulado, la leyenda al margen | Los bordes del lienzo llevan marcas de coordenadas reales (grados) y cada tarjeta es un «recuadro» de la carta | La más familiar: puede leerse como «otro atlas» |
| B | **Perfil** | El *Tableau physique des Andes* de Humboldt (el corte del Chimborazo): un perfil del Ecuador del Pacífico a los Andes, con las cosas puestas a su altura | En Inicio, un corte oeste-este del país con Daule-Peripa en la Costa, Mazar en la Sierra y Casitagua junto a Quito, cada uno en su altura; tocarlos abre la historia | El perfil necesita alturas con fuente (hoy son esquemáticas y así se rotulan) |
| C | **Estratos** | El corte de una carretera andina: capas de ceniza, lahar, limo y suelo que guardan los eventos | «La tierra guarda las marcas» al pie de la letra: cada sección es una capa y los pasos de la historia se apilan como estratos con su fecha | La más arriesgada: si las capas se exageran, el mapa pierde protagonismo |

## Reglas comunes de las tres (no negociables)

- Banda «DATOS DE DEMOSTRACIÓN · no son observaciones reales de NISAR» visible, sin botón de cerrar, integrada en
  la paleta de cada dirección pero inconfundible (contraste AA o mejor). Sellos de origen bajo cada mapa y cada cifra.
- Cuatro destinos con texto: Inicio, Explorar, Simular y Aprender (riel con texto en escritorio, barra inferior con
  texto en móvil). Selector de idioma ES/EN/QU.
- Una sola acción principal por pantalla, con el acento.
- Las rampas de datos siguen siendo las de `frontend/src/diseno/rampas.ts`. La paleta de marca es para la interfaz.
- Sin símbolos andinos sagrados, sin patrones textiles, sin emojis como iconos, sin eyebrows ni números 01/02/03
  decorativos (los pasos del simulador sí son secuencia).
- Datos: el contorno de Ecuador sale de `data/ecuador_provincias.geojson` (geoBoundaries, CC0) → `comun/ecuador.svg`. Las
  posiciones de Mazar, Daule-Peripa y Casitagua salen del centro del `bbox` de sus `sitio.json`. El catálogo del Simulador
  (fenómenos, controles y lugares) es el real de `/api/simulador/catalogo`. Toda cifra lleva la etiqueta «demostración».
  El incendio del Casitagua se nombra sin fecha y con «fuente por añadir» (regla 7 de `CLAUDE.md`).

Cada carpeta (`a-carta/`, `b-perfil/`, `c-estratos/`) tiene `inicio.html`, `simulador.html`, su `estilo.css`, un
`README.md` con la paleta exacta y la tabla de contraste, y `capturas/` con las cuatro capturas.
