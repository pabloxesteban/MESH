/**
 * Toda feature con `queries.preview.ts` tiene que estar en la lista del swap.
 *
 * La lista de `metro.config.js` se mantiene **a mano**, y una feature nueva que
 * trae su versión de preview sin anotarse ahí no falla: sigue hablando con
 * Supabase de verdad. En el preview web eso significa que la escritura se
 * rechaza y la interfaz revierte sola, que es exactamente lo que pasó al
 * agregar guardados — el corazón se llenaba y se vaciaba al instante, sin
 * ningún error a la vista.
 *
 * Es un defecto invisible en tests, invisible en tipos y difícil de leer en
 * pantalla. Por eso está acá.
 */

/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Este test lee el árbol de archivos, que es lo único que puede verificar lo
// que verifica. El `tsconfig` de la app no trae los tipos de Node porque la app
// no corre en Node — de ahí la referencia de arriba, acotada a este archivo.
const RAIZ = join(__dirname, '..')
const FEATURES = join(__dirname, 'features')

/** Los archivos listados en `PREVIEW_TARGETS` de metro.config.js. */
function listados(): ReadonlySet<string> {
  const config = readFileSync(join(RAIZ, 'metro.config.js'), 'utf8')
  const bloque = config.slice(
    config.indexOf('PREVIEW_TARGETS'),
    config.indexOf('].map((relative)'),
  )
  return new Set(
    [...bloque.matchAll(/'(src\/features\/[^']+)'/g)].map(
      (m) => m[1] as string,
    ),
  )
}

/** Los `*.preview.ts` que existen en el árbol. */
function conVersionDePreview(): readonly string[] {
  const encontrados: string[] = []
  for (const feature of readdirSync(FEATURES)) {
    const dir = join(FEATURES, feature)
    if (!existsSync(dir)) continue
    for (const archivo of readdirSync(dir)) {
      if (!archivo.endsWith('.preview.ts')) continue
      const original = archivo.replace('.preview.ts', '.ts')
      encontrados.push(`src/features/${feature}/${original}`)
    }
  }
  return encontrados.sort()
}

describe('el swap del preview', () => {
  it('no se olvida de ninguna feature', () => {
    const enLaLista = listados()
    const faltantes = conVersionDePreview().filter(
      (ruta) => !enLaLista.has(ruta),
    )

    expect({
      faltanEnMetroConfig: faltantes,
      comoSeArregla:
        'Agregalo a PREVIEW_TARGETS en apps/mobile/metro.config.js.',
    }).toEqual({
      faltanEnMetroConfig: [],
      comoSeArregla:
        'Agregalo a PREVIEW_TARGETS en apps/mobile/metro.config.js.',
    })
  })

  it('y no lista nada que no exista', () => {
    // Un archivo listado que ya no está es una línea muerta que alguien va a
    // copiar la próxima vez.
    const huerfanos = [...listados()].filter(
      (ruta) => !existsSync(join(RAIZ, ruta.replace('.ts', '.preview.ts'))),
    )
    expect(huerfanos).toEqual([])
  })
})
