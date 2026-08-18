/**
 * Estado de error, ya traducido.
 *
 * El puente entre `data/errors.ts` (qué salió mal) y el `ErrorState` del design
 * system (cómo se ve). Existe para que ninguna pantalla tenga que acordarse de
 * traducir un error, y para que ninguna pueda mostrar el mensaje crudo aunque
 * quiera.
 */

import { ErrorState, type ErrorStateProps } from '@/design-system/index.ts'

import {
  describe as describeCause,
  toVisibleError,
  type ErrorCause,
} from '@/data/errors.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

export interface ErrorViewProps {
  /** Lo que sea que se atrapó. No se muestra: se clasifica. */
  error?: unknown
  /** O directamente la causa, cuando ya se sabe. */
  cause?: ErrorCause
  onRetry?: () => void
  onBack?: () => void
  testID?: string
}

export function ErrorView({
  error,
  cause,
  onRetry,
  onBack,
  testID,
}: ErrorViewProps) {
  const t = useT()
  const visible = cause != null ? describeCause(cause) : toVisibleError(error)

  // `unknown` no es una causa del design system: se ve igual que un error de
  // servidor, que es lo que casi siempre resulta ser.
  const displayCause: ErrorStateProps['cause'] =
    visible.cause === 'unknown' ? 'server' : visible.cause

  return (
    <ErrorState
      cause={displayCause}
      title={t(visible.titleKey)}
      body={t(visible.bodyKey)}
      {...(onRetry != null
        ? { retry: { label: t('common.retry'), onPress: onRetry } }
        : {})}
      {...(onBack != null
        ? { back: { label: t('common.back'), onPress: onBack } }
        : {})}
      {...(testID != null ? { testID } : {})}
    />
  )
}
