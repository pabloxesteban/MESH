/**
 * Tests del pipeline de imágenes.
 *
 * Corren con el runner de Node (`node --test`): esta herramienta no tiene
 * React ni entorno de navegador, así que no necesita Jest ni Vitest.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'

import { SIZE_WIDTHS, processImage, remainingMetadata } from './media.ts'
import { deterministicPieceId } from './upsert.ts'

/** Una imagen con EXIF, incluidas coordenadas. Es el caso que importa. */
async function fotoConExif(): Promise<Buffer> {
  return sharp({
    create: {
      width: 2000,
      height: 1400,
      channels: 3,
      background: { r: 40, g: 40, b: 48 },
    },
  })
    .withExif({
      IFD0: {
        Make: 'FabricanteDePrueba',
        Model: 'ModeloDePrueba',
        Software: 'SoftwareDePrueba',
      },
      // Los tipos de sharp no declaran el bloque GPS, pero exiftool lo escribe
      // igual — y GPS es justamente el metadato que más importa borrar.
      GPS: {
        GPSLatitudeRef: 'S',
        GPSLatitude: '34/1 36/1 1300/100',
        GPSLongitudeRef: 'W',
        GPSLongitude: '58/1 22/1 1900/100',
      },
    } as never)
    .jpeg()
    .toBuffer()
}

test('el original de prueba efectivamente trae EXIF', async () => {
  // Sin esto, el test de limpieza pasaría con una imagen que nunca tuvo nada
  // y no probaría absolutamente nada.
  const original = await fotoConExif()
  assert.ok(
    (await remainingMetadata(original)).includes('exif'),
    'la imagen de prueba debería traer EXIF',
  )
})

test('los derivados no conservan EXIF, ICC ni GPS', async () => {
  // Una foto de un tatuaje sacada en el estudio lleva las coordenadas del
  // estudio. La recodificación las borra como efecto secundario — y esto es la
  // afirmación explícita de una garantía que si no queda implícita.
  const original = await fotoConExif()
  const processed = await processImage(original, 'checksum-de-prueba')

  for (const derivative of processed.derivatives) {
    assert.deepEqual(
      await remainingMetadata(derivative.bytes),
      [],
      `el derivado ${derivative.size} conservó metadatos`,
    )
  }
})

test('produce los tres tamaños, en WebP y sin agrandar', async () => {
  const original = await sharp({
    create: { width: 600, height: 800, channels: 3, background: '#333' },
  })
    .jpeg()
    .toBuffer()

  const processed = await processImage(original, 'x')
  assert.equal(processed.derivatives.length, 3)

  const bySize = new Map(processed.derivatives.map((d) => [d.size, d]))
  assert.equal(bySize.get('sm')?.width, SIZE_WIDTHS.sm)
  // El original mide 600 de ancho: `lg` no lo estira a 1600. Una foto agrandada
  // no tiene más información, solo más peso.
  assert.equal(bySize.get('lg')?.width, 600)

  for (const derivative of processed.derivatives) {
    assert.equal(
      (await sharp(derivative.bytes).metadata()).format,
      'webp',
      `el derivado ${derivative.size} no es WebP`,
    )
  }
})

test('el blurhash es corto y estable', async () => {
  const original = await sharp({
    create: { width: 400, height: 400, channels: 3, background: '#7a3b2a' },
  })
    .jpeg()
    .toBuffer()

  const primero = await processImage(original, 'x')
  const segundo = await processImage(original, 'x')

  assert.equal(primero.blurhash, segundo.blurhash)
  assert.ok(
    primero.blurhash.length < 40,
    'el blurhash debería entrar en la fila',
  )
})

test('el id de una pieza es estable entre corridas', async () => {
  // Si cambiara, la ruta de storage cambiaría en cada carga y cada corrida
  // dejaría una copia huérfana del objeto anterior.
  const a = deterministicPieceId('fixture-aguja-fina', '01.jpg')
  const b = deterministicPieceId('fixture-aguja-fina', '01.jpg')
  assert.equal(a, b)
  assert.match(
    a,
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    'tiene que ser un UUID válido: la columna lo es',
  )
})

test('dos piezas distintas no comparten id', () => {
  assert.notEqual(
    deterministicPieceId('fixture-aguja-fina', '01.jpg'),
    deterministicPieceId('fixture-aguja-fina', '02.jpg'),
  )
  assert.notEqual(
    deterministicPieceId('fixture-aguja-fina', '01.jpg'),
    deterministicPieceId('fixture-tinta-negra', '01.jpg'),
  )
})
