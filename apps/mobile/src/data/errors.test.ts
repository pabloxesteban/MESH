import { classify, toVisibleError } from './errors.ts'

describe('classify', () => {
  it('mapea el rechazo de RLS a permiso', () => {
    // 42501 es `insufficient_privilege`: lo que devuelve una política.
    expect(classify({ code: '42501' })).toBe('permission')
    expect(classify({ code: 'PGRST301' })).toBe('permission')
  })

  it('mapea 0 filas a no-encontrado', () => {
    expect(classify({ code: 'PGRST116' })).toBe('notFound')
  })

  it('mapea los status HTTP', () => {
    expect(classify({ status: 401 })).toBe('permission')
    expect(classify({ status: 404 })).toBe('notFound')
    expect(classify({ status: 503 })).toBe('server')
  })

  it('reconoce la falta de conexión por el mensaje de fetch', () => {
    // Es el único caso donde hay que mirar el texto: fetch no trae código.
    expect(classify(new TypeError('Network request failed'))).toBe('offline')
  })

  it('cae en desconocido antes que adivinar', () => {
    expect(classify(null)).toBe('unknown')
    expect(classify('un string')).toBe('unknown')
    expect(classify({ code: 'XX999' })).toBe('unknown')
  })
})

describe('toVisibleError', () => {
  it('nunca devuelve texto: devuelve claves de i18n', () => {
    // El mensaje crudo de Postgres no puede llegar a la pantalla ni por
    // accidente, porque lo que sale de acá no lo contiene.
    const visible = toVisibleError({
      code: '42501',
      message: 'new row violates row-level security policy for table "matches"',
    })
    expect(visible).toEqual({
      cause: 'permission',
      titleKey: 'error.permission.title',
      bodyKey: 'error.permission.body',
    })
  })

  it('permiso y no-encontrado no se distinguen desde afuera', () => {
    // Ver docs/security/threat-model.md §T7.
    const permiso = toVisibleError({ code: '42501' })
    const noEncontrado = toVisibleError({ code: 'PGRST116' })
    expect(permiso.titleKey).not.toBe(noEncontrado.titleKey)
    // Distintas claves, mismo texto. El texto se compara en el test de i18n.
  })
})
