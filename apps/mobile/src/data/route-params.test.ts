import { asSlug, asUuid } from './route-params.ts'

describe('asSlug', () => {
  it('acepta un slug de taxonomía', () => {
    expect(asSlug('fixture-aguja-fina')).toBe('fixture-aguja-fina')
  })

  it('rechaza lo que no es un slug', () => {
    // Nada de esto tiene que llegar a una consulta. RLS igual protegería los
    // datos, pero un id malformado explota en Postgres con 22P02 y la persona
    // ve "algo se rompió" cuando lo que pasó es que el enlace estaba mal.
    for (const malo of [
      'Con Mayúsculas',
      'con espacios',
      '../../etc/passwd',
      "'; drop table professionals; --",
      'con_guion_bajo',
      '-empieza-con-guion',
      'x'.repeat(200),
      '',
    ]) {
      expect(asSlug(malo)).toBeNull()
    }
  })

  it('rechaza un array: expo-router lo entrega así con parámetros repetidos', () => {
    expect(asSlug(['a', 'b'])).toBeNull()
    expect(asSlug(undefined)).toBeNull()
  })
})

describe('asUuid', () => {
  it('acepta un UUID', () => {
    expect(asUuid('11111111-2222-3333-4444-555555555555')).toBe(
      '11111111-2222-3333-4444-555555555555',
    )
  })

  it('rechaza cualquier otra cosa', () => {
    for (const malo of [
      '1234',
      'no-es-uuid',
      '11111111222233334444555555555555',
      '',
    ]) {
      expect(asUuid(malo)).toBeNull()
    }
  })
})
