/**
 * Hápticos.
 *
 * Solo como confirmación de una decisión que tomó la persona. **Nunca al hacer
 * scroll, nunca por frame, nunca al entrar una tarjeta.**
 *
 * Pasar no lleva háptico: pasar no es un logro, y premiarlo con una vibración
 * empieza a convertir el mazo en una máquina tragamonedas.
 *
 * Se respeta el ajuste del sistema operativo; además hay un interruptor propio
 * en Ajustes (Fase 18), porque alguien puede querer hápticos en el teclado y no
 * en MESH.
 */

import * as Haptics from 'expo-haptics'

export type HapticIntent =
  'like' | 'save' | 'match' | 'destructive' | 'error' | 'none'

let enabled = true

/** Lo usa el ajuste de Ajustes. Por defecto encendido. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value
}

export function hapticsEnabled(): boolean {
  return enabled
}

/**
 * Dispara el háptico de una intención.
 *
 * No devuelve la promesa a propósito: un háptico nunca puede bloquear un gesto
 * ni hacer fallar una interacción. Si el dispositivo no puede vibrar, no pasa
 * nada.
 */
export function haptic(intent: HapticIntent): void {
  if (!enabled || intent === 'none') return

  switch (intent) {
    case 'like':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      return
    case 'save':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      return
    case 'match':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      return
    case 'destructive':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      return
    case 'error':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
  }
}
