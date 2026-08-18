/**
 * Procesamiento de imágenes: derivados, blurhash y limpieza de metadatos.
 *
 * Tres tamaños por pieza para que el mazo nunca baje una imagen de 1600px por
 * una tarjeta de 400. La diferencia en 4G no es de milisegundos.
 *
 * **La recodificación borra el EXIF como efecto secundario, y eso no es un
 * detalle.** Una foto de un tatuaje sacada en el estudio lleva las coordenadas
 * del estudio. `sharp` descarta todos los metadatos salvo que se le pida
 * conservarlos, así que la limpieza sale de no pedirla — pero un test la
 * verifica igual, porque "sale sola" es exactamente el tipo de garantía que se
 * rompe en una actualización sin que nadie se entere.
 */

import { encode } from 'blurhash'
import sharp from 'sharp'

import { PORTFOLIO_SIZES, type PortfolioSize } from '@mesh/domain'

/** Ancho máximo de cada derivado, en píxeles. */
export const SIZE_WIDTHS: Readonly<Record<PortfolioSize, number>> = {
  sm: 400,
  md: 900,
  lg: 1600,
}

/**
 * Calidad de WebP. 82 es donde la curva se aplana: por encima el archivo crece
 * bastante más rápido que la calidad percibida, y esto es fotografía de
 * tatuajes, no arte lineal.
 */
const WEBP_QUALITY = 82

export interface Derivative {
  readonly size: PortfolioSize
  readonly bytes: Buffer
  readonly width: number
  readonly height: number
}

export interface ProcessedImage {
  readonly derivatives: readonly Derivative[]
  readonly blurhash: string
  /** Dimensiones del original, para la relación de aspecto de la tarjeta. */
  readonly width: number
  readonly height: number
  /** SHA-256 del original. Es lo que hace idempotente a la carga. */
  readonly checksum: string
}

export async function processImage(
  input: Buffer,
  checksum: string,
): Promise<ProcessedImage> {
  const source = sharp(input, { failOn: 'error' })
  const metadata = await source.metadata()

  const width = metadata.width ?? 0
  const height = metadata.height ?? 0
  if (width === 0 || height === 0) {
    throw new Error('La imagen no declara dimensiones')
  }

  const derivatives: Derivative[] = []
  for (const size of PORTFOLIO_SIZES) {
    // `withoutEnlargement`: si el original es más chico que el objetivo, no se
    // agranda. Una foto de 800px estirada a 1600 no tiene más información, solo
    // más peso.
    const pipeline = sharp(input)
      .rotate()
      .resize({ width: SIZE_WIDTHS[size], withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
    derivatives.push({
      size,
      bytes: data,
      width: info.width,
      height: info.height,
    })
  }

  return {
    derivatives,
    blurhash: await computeBlurhash(input),
    width,
    height,
    checksum,
  }
}

/**
 * Blurhash del placeholder.
 *
 * 4×3 componentes: suficiente para que se lea la composición mientras carga, y
 * lo bastante corto para que el string entre en la fila sin pesar. Más
 * componentes producen un placeholder que se parece tanto a la foto que la
 * transición se vuelve confusa.
 */
export async function computeBlurhash(input: Buffer): Promise<string> {
  const { data, info } = await sharp(input)
    .rotate()
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: 'inside' })
    .toBuffer({ resolveWithObject: true })

  return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3)
}

/**
 * Metadatos que quedaron en un archivo procesado.
 *
 * Devuelve las claves EXIF/GPS/ICC/XMP que sobrevivieron. Vacío es lo correcto.
 * Existe para el test: la limpieza sale de no pedirle a sharp que conserve
 * metadatos, y una garantía implícita necesita una afirmación explícita.
 */
export async function remainingMetadata(input: Buffer): Promise<string[]> {
  const metadata = await sharp(input).metadata()
  const leaks: string[] = []
  if (metadata.exif != null) leaks.push('exif')
  if (metadata.icc != null) leaks.push('icc')
  if (metadata.iptc != null) leaks.push('iptc')
  if (metadata.xmp != null) leaks.push('xmp')
  return leaks
}
