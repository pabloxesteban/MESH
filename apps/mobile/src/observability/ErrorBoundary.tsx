/**
 * La red que evita la pantalla en blanco.
 *
 * Sin esto, un error de render en cualquier pantalla deja a la persona mirando
 * el fondo del tema, sin nada que tocar y sin forma de volver. Es el peor
 * estado posible de una app: no dice qué pasó, no ofrece salida, y no nos
 * enteramos.
 *
 * Tres decisiones:
 *
 * · **Reintentar vuelve a montar, no recarga la app.** El estado se limpia y la
 *   pantalla se arma de nuevo; si el error era de datos, se arregla solo.
 * · **Se reporta como `fatal`.** Un error de render es distinto de una consulta
 *   que falló: la diferencia importa al mirar la cola.
 * · **Se muestra el mismo `ErrorView` que el resto de la app.** Una pantalla de
 *   crash con otro aspecto le avisa a la persona que algo se rompió de verdad,
 *   y no hace falta: ya lo sabe.
 *
 * Es un componente de clase porque `componentDidCatch` no tiene equivalente en
 * hooks. Es el único de la app.
 *
 * Ver ADR-026.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

import { ErrorView } from '@/components/ErrorView.tsx'

import { reportError } from './report.ts'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Dónde está puesta esta red. Va tal cual al reporte. */
  surface: string
}

interface State {
  readonly failed: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // `info.componentStack` NO se manda: son nombres de componentes, sí, pero
    // en un bundle de producción vienen minificados y no dicen nada que la pila
    // ya redactada no diga mejor.
    void info
    reportError(error, { surface: this.props.surface, fatal: true })
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children

    return (
      <ErrorView
        cause="unknown"
        onRetry={() => this.setState({ failed: false })}
        testID="error-boundary"
      />
    )
  }
}
