/** Id del panel que gobierna la pestaña `id`: el contenedor lleva `role="tabpanel"` y este id (o `propsPanel`). */
export const idPanelPestana = (id: string) => `panel-${id}`

/** Atributos para el contenedor del contenido de la pestaña activa (tabpanel enlazado con su pestaña). */
export const propsPanel = (activa: string) => ({
  role: 'tabpanel' as const,
  id: idPanelPestana(activa),
  'aria-labelledby': `pestana-${activa}`,
})

