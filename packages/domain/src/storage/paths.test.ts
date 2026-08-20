import { describe, expect, it } from 'vitest'

import {
  MAX_UPLOAD_BYTES,
  avatarPath,
  isOwnedPath,
  isUploadMimeType,
  portfolioPath,
  referencePath,
  reviewPath,
  StoragePathError,
  validateUpload,
} from './paths.ts'

const USER = '11111111-2222-3333-4444-555555555555'
const MEDIA = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

describe('rutas de storage', () => {
  it('pone el id de usuario como primer segmento en los buckets del dueño', () => {
    // Es el predicado de la política: (storage.foldername(name))[1] = auth.uid()
    expect(referencePath(USER, MEDIA, 'image/webp')).toBe(
      `${USER}/${MEDIA}.webp`,
    )
    expect(avatarPath(USER, MEDIA, 'image/jpeg')).toBe(`${USER}/${MEDIA}.jpg`)
    expect(reviewPath(USER, MEDIA, 'image/jpeg')).toBe(`${USER}/${MEDIA}.jpg`)
  })

  it('la foto de una reseña también se rechaza si el id no es un UUID', () => {
    expect(() => reviewPath('../otro', MEDIA, 'image/jpeg')).toThrow(
      StoragePathError,
    )
  })

  it('deriva la extensión del MIME, no del nombre que trajo el archivo', () => {
    expect(referencePath(USER, MEDIA, 'image/heic')).toMatch(/\.heic$/)
    expect(referencePath(USER, MEDIA, 'image/png')).toMatch(/\.png$/)
  })

  it('el catálogo no lleva id de usuario: no tiene dueño', () => {
    expect(portfolioPath('ana-suarez', MEDIA, 'md')).toBe(
      `ana-suarez/${MEDIA}/md.webp`,
    )
  })

  it('rechaza cualquier cosa que no sea un UUID', () => {
    // Sin esto, un nombre provisto por el usuario podría contener `../`.
    expect(() => referencePath('../otro', MEDIA, 'image/webp')).toThrow(
      StoragePathError,
    )
    expect(() =>
      referencePath(USER, 'foto de mi casa.jpg', 'image/webp'),
    ).toThrow(StoragePathError)
    expect(() => portfolioPath('Ana Suárez', MEDIA, 'md')).toThrow(
      StoragePathError,
    )
  })
})

describe('isOwnedPath', () => {
  it('acepta la carpeta propia y rechaza la ajena', () => {
    expect(isOwnedPath(`${USER}/x.webp`, USER)).toBe(true)
    expect(isOwnedPath(`${MEDIA}/x.webp`, USER)).toBe(false)
  })

  it('rechaza una ruta sin carpeta', () => {
    expect(isOwnedPath('suelta.webp', USER)).toBe(false)
  })

  it('rechaza un prefijo que solo empieza igual', () => {
    expect(isOwnedPath(`${USER}-otro/x.webp`, USER)).toBe(false)
  })
})

describe('validateUpload', () => {
  it('acepta una imagen razonable', () => {
    expect(
      validateUpload({ mimeType: 'image/jpeg', byteSize: 400_000 }),
    ).toEqual([])
  })

  it('rechaza SVG', () => {
    // Un SVG es un documento ejecutable servido desde nuestro dominio.
    expect(isUploadMimeType('image/svg+xml')).toBe(false)
    expect(
      validateUpload({ mimeType: 'image/svg+xml', byteSize: 1000 }),
    ).toHaveLength(1)
  })

  it('rechaza un archivo por encima del tope', () => {
    expect(
      validateUpload({
        mimeType: 'image/jpeg',
        byteSize: MAX_UPLOAD_BYTES + 1,
      }),
    ).toHaveLength(1)
  })

  it('acepta exactamente el tope', () => {
    expect(
      validateUpload({ mimeType: 'image/jpeg', byteSize: MAX_UPLOAD_BYTES }),
    ).toEqual([])
  })

  it('rechaza un archivo vacío', () => {
    expect(
      validateUpload({ mimeType: 'image/jpeg', byteSize: 0 }),
    ).toHaveLength(1)
  })

  it('junta todos los rechazos en vez de parar en el primero', () => {
    // La pantalla de subida quiere mostrar todo lo que está mal de una vez.
    expect(
      validateUpload({ mimeType: 'application/pdf', byteSize: 0 }),
    ).toHaveLength(2)
  })
})
