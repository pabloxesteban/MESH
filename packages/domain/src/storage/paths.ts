/**
 * Rutas de storage y validación de subidas.
 *
 * Vive en `packages/domain` porque las usan los dos lados: el seeder al cargar
 * el catálogo y la app al subir una referencia. Una ruta armada de dos formas
 * distintas es una política de storage que protege una de las dos.
 *
 * **La ruta ES la política.** Las políticas de `references` y `avatars`
 * comparan `(storage.foldername(name))[1]` contra `auth.uid()`, así que el
 * primer segmento tiene que ser el id de quien sube, siempre. Si alguien arma
 * una ruta sin ese prefijo, storage la rechaza — y este módulo existe para que
 * eso no pase por accidente.
 *
 * Nada acá genera ids ni lee el reloj: `packages/domain` tiene prohibido
 * `Math.random()` y `Date.now()` por lint, para que todo sea reproducible en un
 * test. Los UUID los provee quien llama.
 */

/** MIME aceptados al subir. Sin SVG: un SVG es un documento ejecutable. */
export const UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
] as const

export type UploadMimeType = (typeof UPLOAD_MIME_TYPES)[number]

/** Tope por archivo, en bytes. También está impuesto a nivel bucket. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

/** Cuota total por persona, en bytes. La impone un trigger de Postgres. */
export const MAX_USER_STORAGE_BYTES = 50 * 1024 * 1024

/** Máximo de imágenes de referencia por proyecto. */
export const MAX_PROJECT_REFERENCES = 10

/** Máximo de proyectos sin archivar por persona. */
export const MAX_LIVE_PROJECTS = 20

export type Bucket = 'portfolio' | 'references' | 'avatars'

/**
 * Extensión canónica por MIME. La extensión se deriva del content-type
 * declarado, nunca del nombre que trajo el archivo: un `.jpg` que en realidad es
 * otra cosa no debería poder elegir cómo se guarda.
 */
const EXTENSION_BY_MIME: Readonly<Record<UploadMimeType, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/heic': 'heic',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Tamaños derivados del catálogo. El mazo nunca baja una imagen de 1600px. */
export const PORTFOLIO_SIZES = ['sm', 'md', 'lg'] as const
export type PortfolioSize = (typeof PORTFOLIO_SIZES)[number]

export class StoragePathError extends Error {}

function requireUuid(value: string, label: string): void {
  if (!UUID.test(value)) {
    throw new StoragePathError(`${label} tiene que ser un UUID, no "${value}"`)
  }
}

function requireSlug(value: string, label: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new StoragePathError(
      `${label} tiene que ser un slug en minúscula, no "${value}"`,
    )
  }
}

/**
 * Ruta de una imagen del catálogo.
 *
 * No lleva id de usuario porque no tiene dueño: el bucket es de lectura pública
 * y solo lo escribe el service role.
 */
export function portfolioPath(
  professionalSlug: string,
  portfolioItemId: string,
  size: PortfolioSize,
): string {
  requireSlug(professionalSlug, 'El slug del profesional')
  requireUuid(portfolioItemId, 'El id de la pieza')
  return `${professionalSlug}/${portfolioItemId}/${size}.webp`
}

/** Ruta de una imagen de referencia de proyecto. Privada, del dueño. */
export function referencePath(
  userId: string,
  mediaId: string,
  mimeType: UploadMimeType,
): string {
  requireUuid(userId, 'El id de usuario')
  requireUuid(mediaId, 'El id de la media')
  return `${userId}/${mediaId}.${EXTENSION_BY_MIME[mimeType]}`
}

/** Ruta del avatar de una persona. */
export function avatarPath(
  userId: string,
  mediaId: string,
  mimeType: UploadMimeType,
): string {
  requireUuid(userId, 'El id de usuario')
  requireUuid(mediaId, 'El id de la media')
  return `${userId}/${mediaId}.${EXTENSION_BY_MIME[mimeType]}`
}

/**
 * Verifica que una ruta caiga bajo la carpeta de una persona.
 *
 * Es el mismo predicado que evalúa la política de storage, escrito en
 * TypeScript para poder fallar antes de gastar una subida — no para
 * reemplazarlo. Lo que impone es Postgres.
 */
export function isOwnedPath(path: string, userId: string): boolean {
  const [first, ...rest] = path.split('/')
  return rest.length > 0 && first === userId
}

export interface UploadCandidate {
  readonly mimeType: string
  readonly byteSize: number
}

/**
 * Rechazos de una subida, en orden de aparición. Vacío = aceptable.
 *
 * Devuelve una lista y no lanza: la pantalla de subida quiere mostrar todo lo
 * que está mal de una vez, no descubrirlo de a un error por intento.
 */
export function validateUpload(candidate: UploadCandidate): string[] {
  const errors: string[] = []

  if (!isUploadMimeType(candidate.mimeType)) {
    errors.push(
      `Tipo de archivo no aceptado: ${candidate.mimeType}. ` +
        `Aceptamos ${UPLOAD_MIME_TYPES.join(', ')}.`,
    )
  }

  if (!Number.isInteger(candidate.byteSize) || candidate.byteSize <= 0) {
    errors.push('El archivo está vacío o su tamaño no es válido')
  } else if (candidate.byteSize > MAX_UPLOAD_BYTES) {
    errors.push(
      `El archivo pesa ${(candidate.byteSize / 1024 / 1024).toFixed(1)} MB y ` +
        `el tope es ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`,
    )
  }

  return errors
}

export function isUploadMimeType(value: string): value is UploadMimeType {
  return (UPLOAD_MIME_TYPES as readonly string[]).includes(value)
}

/**
 * Metadatos que una imagen NO puede conservar después de recodificarse.
 *
 * Una foto de referencia sacada en casa lleva las coordenadas de esa casa.
 * Recodificar la imagen borra el EXIF como efecto secundario, y el test de
 * `apps/mobile` verifica que efectivamente no quede ninguno de estos campos.
 */
export const FORBIDDEN_EXIF_TAGS = [
  'GPSLatitude',
  'GPSLongitude',
  'GPSAltitude',
  'GPSTimeStamp',
  'DateTimeOriginal',
  'Make',
  'Model',
  'Software',
  'Artist',
  'Copyright',
] as const
