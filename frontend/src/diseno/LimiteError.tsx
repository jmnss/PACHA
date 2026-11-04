import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorBloque } from './Estados'

interface Props {
  children: ReactNode
  /** Por defecto recarga la página: una carga perezosa fallida queda en caché y solo se rehace así. */
  alReintentar?: () => void
}

/** Límite de error sencillo para las pantallas de carga perezosa. */
export class LimiteError extends Component<Props, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() { return { fallo: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info.componentStack) }
  render() {
    if (!this.state.fallo) return this.props.children
    return (
      <ErrorBloque
        mensaje="No se pudo cargar la pantalla."
        onReintentar={() => (this.props.alReintentar ?? (() => window.location.reload()))()}
      />
    )
  }
}
