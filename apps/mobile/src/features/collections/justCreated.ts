/**
 * La señal de "esta colección se acaba de crear".
 *
 * Mismo criterio arquitectónico que el pasamanos obra → artista de
 * `features/transitions/sharedArtwork.ts`: un valor que se reclama una vez y
 * se borra, no estado persistente ni un parámetro de query string permanente.
 * Sin esto, volver a entrar a la misma colección en otra sesión —o
 * simplemente navegar afuera y adentro de nuevo— repetiría la animación de
 * aterrizaje en una colección que ya no es nueva para nadie.
 *
 * A diferencia del pasamanos de obra, acá no hace falta vencimiento: entre
 * crear la colección y que `CollectionDetailScreen` la reclame no hay más que
 * una navegación de `router.replace`, y no hay una posición de pantalla que
 * pueda quedar vieja.
 */

let justCreatedId: string | null = null

/** La pantalla de creación deja la marca antes de aterrizar. */
export function offerJustCreated(collectionId: string): void {
  justCreatedId = collectionId
}

/**
 * `CollectionDetailScreen` pregunta si la colección que está montando es la
 * que se acaba de crear.
 *
 * Se borra pase lo que pase: reclamada o no, no tiene que quedar esperando a
 * la próxima vez que alguien entre a esta colección.
 */
export function claimJustCreated(collectionId: string): boolean {
  const matches = justCreatedId === collectionId
  justCreatedId = null
  return matches
}

/** Solo para tests: deja el módulo como recién importado. */
export function __resetJustCreated(): void {
  justCreatedId = null
}
