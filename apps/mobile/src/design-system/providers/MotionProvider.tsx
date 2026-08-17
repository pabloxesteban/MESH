import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AccessibilityInfo } from 'react-native'
import { REDUCED_DURATION, duration, type Duration } from '../tokens/motion.ts'

/**
 * Lee una sola vez el ajuste de movimiento reducido del sistema y lo expone.
 *
 * Un solo lugar a propósito: si cada componente animado lo chequeara por su
 * cuenta, en algún momento uno se olvidaría, y ese componente sería el único
 * que se mueve para alguien que pidió que nada se mueva.
 */
interface MotionContextValue {
  readonly reduceMotion: boolean
  /** Duración efectiva de un token, ya considerando movimiento reducido. */
  readonly durationOf: (token: Duration) => number
}

const MotionContext = createContext<MotionContextValue | null>(null)

export function MotionProvider({
  children,
  /** Solo para tests: fuerza el valor en lugar de preguntarle al sistema. */
  forceReduceMotion,
}: {
  children: ReactNode
  forceReduceMotion?: boolean
}) {
  const [systemReduceMotion, setSystemReduceMotion] = useState(false)

  useEffect(() => {
    if (forceReduceMotion != null) return

    let cancelled = false
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!cancelled) setSystemReduceMotion(value)
    })

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduceMotion,
    )

    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [forceReduceMotion])

  const reduceMotion = forceReduceMotion ?? systemReduceMotion

  const value = useMemo<MotionContextValue>(
    () => ({
      reduceMotion,
      durationOf: (token) =>
        reduceMotion ? REDUCED_DURATION : duration[token],
    }),
    [reduceMotion],
  )

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  )
}

export function useMotion(): MotionContextValue {
  const context = useContext(MotionContext)
  if (context == null) {
    throw new Error('useMotion necesita estar dentro de <MotionProvider>')
  }
  return context
}
