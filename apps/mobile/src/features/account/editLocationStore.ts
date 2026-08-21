/**
 * El barrio elegido en la hoja de ubicación de Perfil, de vuelta hacia el
 * header que la abrió.
 *
 * `app/perfil/ubicacion.tsx` es una ruta empujada encima de Perfil, no un
 * modal con callback: expo-router no tiene forma de devolver un valor a quien
 * empujó la ruta. Un store chico de Zustand es exactamente la herramienta que
 * `docs/architecture/system-architecture.md` §5 nombra para "estado de sesión
 * entre pantallas" — este es ese caso, y nada más grande hace falta.
 *
 * Vive solo mientras el header de Perfil está en modo edición: se lee y se
 * limpia en el mismo efecto, así que una vuelta a la pantalla de ubicación en
 * una sesión de edición futura no hereda la elección de esta.
 */

import { create } from 'zustand'

export interface PendingProfileLocation {
  /** `null` = "Sin ubicación", elegido a propósito. */
  readonly locationId: string | null
  readonly slug: string | null
}

interface EditLocationState {
  pending: PendingProfileLocation | null
  setPending: (value: PendingProfileLocation | null) => void
}

export const useEditLocationStore = create<EditLocationState>((set) => ({
  pending: null,
  setPending: (value) => set({ pending: value }),
}))
