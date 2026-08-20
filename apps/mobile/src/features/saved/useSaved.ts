/**
 * El estado del corazón.
 *
 * **Optimista, y con vuelta atrás.** Tocar un corazón tiene que pintarse en el
 * mismo cuadro: esperar la red para llenar un corazón hace que la app se sienta
 * rota justo en el gesto más liviano que tiene. Si la escritura falla, el
 * corazón vuelve a como estaba — no se deja pintado prometiendo algo que no se
 * guardó.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchSavedIds, savePiece, unsavePiece } from './queries.ts'

export interface SavedState {
  readonly isSaved: (portfolioItemId: string) => boolean
  readonly toggle: (portfolioItemId: string) => void
  /** Todavía no se sabe qué está guardado. El corazón se dibuja vacío. */
  readonly isLoading: boolean
}

export function useSaved(userId: string | null): SavedState {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  // Para no pisar el estado de un componente que ya se fue.
  const vivo = useRef(true)

  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  useEffect(() => {
    if (userId == null) {
      setIsLoading(false)
      return
    }
    let cancelado = false
    void fetchSavedIds()
      .then((guardados) => {
        if (!cancelado) setIds(guardados)
      })
      // Que falle leer los guardados no puede romper el perfil: los corazones
      // quedan vacíos y tocarlos vuelve a intentar.
      .catch(() => undefined)
      .finally(() => {
        if (!cancelado) setIsLoading(false)
      })
    return () => {
      cancelado = true
    }
  }, [userId])

  const toggle = useCallback(
    (portfolioItemId: string) => {
      if (userId == null) return
      const estaba = ids.has(portfolioItemId)

      setIds((previos) => {
        const siguiente = new Set(previos)
        if (estaba) siguiente.delete(portfolioItemId)
        else siguiente.add(portfolioItemId)
        return siguiente
      })

      const escritura = estaba
        ? unsavePiece(portfolioItemId)
        : savePiece(userId, portfolioItemId)

      void escritura.catch(() => {
        if (!vivo.current) return
        // Vuelta atrás: el corazón dice la verdad o no dice nada.
        setIds((previos) => {
          const siguiente = new Set(previos)
          if (estaba) siguiente.add(portfolioItemId)
          else siguiente.delete(portfolioItemId)
          return siguiente
        })
      })
    },
    [ids, userId],
  )

  return {
    isSaved: useCallback(
      (portfolioItemId: string) => ids.has(portfolioItemId),
      [ids],
    ),
    toggle,
    isLoading,
  }
}
