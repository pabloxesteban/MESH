/**
 * Los enlaces a los textos legales.
 *
 * **Salen del entorno y no están escritos acá a propósito.** Los textos viven
 * en `docs/legal/` con marcadores sin completar —razón social, domicilio,
 * jurisdicción— y hasta que alguien los publique en una URL real, no hay a
 * dónde enlazar.
 *
 * Sin URL, la fila no se dibuja. Un enlace a una página que no existe es peor
 * que no ofrecerlo: la persona toca, no pasa nada, y aprende que esta app
 * miente en las cosas chicas.
 *
 * Son públicas por diseño (`EXPO_PUBLIC_`): son direcciones de páginas que
 * cualquiera tiene que poder abrir **sin iniciar sesión** — Apple lo exige para
 * la política de privacidad.
 */

export interface LegalLinks {
  readonly privacy: string | null
  readonly terms: string | null
  readonly moderation: string | null
}

function urlOf(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed.startsWith('https://') ? trimmed : null
}

export function legalLinks(): LegalLinks {
  return {
    privacy: urlOf(process.env['EXPO_PUBLIC_LEGAL_PRIVACY_URL']),
    terms: urlOf(process.env['EXPO_PUBLIC_LEGAL_TERMS_URL']),
    moderation: urlOf(process.env['EXPO_PUBLIC_LEGAL_MODERATION_URL']),
  }
}
