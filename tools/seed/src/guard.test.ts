/**
 * Tests de los guards de la carga.
 *
 * Los dos que están acá existen por defectos que solo aparecen con contenido
 * real, y por eso ninguno se había encontrado en meses de construir con
 * fixtures:
 *
 * 1. **El camino de producción estaba inusable.** Abortaba ante el primer
 *    fixture, y el repositorio tiene diez que van a seguir ahí.
 * 2. **`--publish` publicaba todo lo de la corrida**, así que alguien
 *    despublicado a mano —porque pidió salir— volvía a aparecer en la
 *    siguiente carga.
 *
 * El segundo es el que importa: en un producto que se sostiene sobre
 * consentimiento, resucitar a alguien que pidió salir no es un bug de
 * ergonomía.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { partitionFixtures, selectSlugs } from './guard.ts'

interface Bundle {
  readonly slug: string
  readonly fixture: boolean
}

const CATALOGO: readonly Bundle[] = [
  { slug: 'fixture-uno', fixture: true },
  { slug: 'briza-maldonado', fixture: false },
  { slug: 'fixture-dos', fixture: true },
]

const esFixture = (bundle: Bundle) => bundle.fixture

test('en producción los fixtures se saltean, no abortan la corrida', () => {
  // Es lo que volvía inusable el camino: cargar a la primera artista real
  // habría exigido borrar los diez fixtures del repositorio.
  const { loadable, skipped } = partitionFixtures(
    'production',
    CATALOGO,
    esFixture,
  )

  assert.deepEqual(
    loadable.map((b) => b.slug),
    ['briza-maldonado'],
  )
  assert.deepEqual(
    skipped.map((b) => b.slug),
    ['fixture-uno', 'fixture-dos'],
  )
})

test('ninguna fila fixture queda cargable en producción', () => {
  // La garantía que el cambio no puede perder, dicha directamente.
  const { loadable } = partitionFixtures('production', CATALOGO, esFixture)
  assert.equal(
    loadable.some(esFixture),
    false,
    'un fixture quedó en la lista de carga a producción',
  )
})

test('los salteados se devuelven para poder nombrarlos', () => {
  // Saltear en silencio sería el defecto que este cambio podría introducir: la
  // corrida tiene que decir a quién dejó afuera.
  const { skipped } = partitionFixtures('production', CATALOGO, esFixture)
  assert.equal(skipped.length, 2)
})

test('fuera de producción no se saltea nada', () => {
  // Los fixtures son con lo que se construye la app: en local se cargan.
  const { loadable, skipped } = partitionFixtures('local', CATALOGO, esFixture)
  assert.equal(loadable.length, 3)
  assert.equal(skipped.length, 0)
})

test('sin --only se carga todo el catálogo', () => {
  const conocidos = CATALOGO.map((b) => b.slug)
  assert.equal(selectSlugs(CATALOGO, [], conocidos).length, 3)
})

test('--only acota la corrida a quien se nombra', () => {
  // Es lo que hace que publicar sea un acto sobre personas nombradas y no
  // sobre "todo lo que había en la carpeta".
  const conocidos = CATALOGO.map((b) => b.slug)
  assert.deepEqual(
    selectSlugs(CATALOGO, ['briza-maldonado'], conocidos).map((b) => b.slug),
    ['briza-maldonado'],
  )
})

test('un slug que no existe falla duro y no carga nada', () => {
  // Un typo que carga en silencio a nadie es peor que un error: parece que
  // funcionó.
  assert.throws(
    () => selectSlugs(CATALOGO, ['briza-maldonda'], ['briza-maldonado']),
    /briza-maldonda/,
  )
})

test('nombrar un borrador no es un error de tipeo', () => {
  // El borrador existe, solo que no se carga. Decir "no existe" mandaría a
  // buscar un typo que no está.
  const conocidos = ['briza-maldonado', 'fixture-uno', 'fixture-dos']
  assert.doesNotThrow(() => selectSlugs([], ['briza-maldonado'], conocidos))
})

test('los dos guards se componen: --only sobre un fixture, en producción', () => {
  // El caso completo: se pidió un fixture y el destino es producción. No se
  // carga, y se sabe por qué.
  const pedidos = selectSlugs(
    CATALOGO,
    ['fixture-uno'],
    CATALOGO.map((b) => b.slug),
  )
  const { loadable, skipped } = partitionFixtures(
    'production',
    pedidos,
    esFixture,
  )

  assert.equal(loadable.length, 0)
  assert.deepEqual(
    skipped.map((b) => b.slug),
    ['fixture-uno'],
  )
})
