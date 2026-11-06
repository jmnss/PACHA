import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ContextoIdiomaReact } from '../idioma/useT'
import { ErrorBloque } from './Estados'

interface Props {
  children: ReactNode
  /** Por defecto recarga la página: una carga perezosa fallida queda en caché y solo se rehace así. */
  alReintentar?: () => void
}

/** Límite de error sencillo para las pantallas de carga perezosa. */
export class LimiteError extends Component<Props, { fallo: boolean }> {
  static contextType = ContextoIdiomaReact
  declare context: React.ContextType<typeof ContextoIdiomaReact>
  state = { fallo: false }
  static getDerivedStateFromError() { return { fallo: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info.componentStack) }
  render() {
    if (!this.state.fallo) return this.props.children
    return (
      <ErrorBloque
        mensaje={this.context.t('estructura.limite_error.mensaje')}
        onReintentar={() => (this.props.alReintentar ?? (() => window.location.reload()))()}
      />
    )
  }
}
