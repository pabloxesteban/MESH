import { esAR } from './es-AR.ts'
import { en } from './en.ts'
import { resolveLocale, translate } from './index.ts'

/**
 * Devuelve las claves que rompen la regla, no un booleano. Un test que falla
 * con la lista completa de infractores se arregla de una vez; uno que solo dice
 * "false !== true" se arregla de a uno.
 */
function offenders(
  catalog: Readonly<Record<string, string>>,
  breaks: (value: string) => boolean,
): string[] {
  return Object.entries(catalog)
    .filter(([, value]) => breaks(value))
    .map(([key, value]) => `${key}: ${value}`)
}

describe('catálogos', () => {
  it('tienen exactamente las mismas claves', () => {
    // En las dos direcciones: una clave solo en inglés significa que alguien
    // escribió una pantalla en inglés primero, que es el error que esto atrapa.
    expect(Object.keys(en).sort()).toEqual(Object.keys(esAR).sort())
  })

  it('no tiene ningún string vacío', () => {
    expect(
      offenders({ ...esAR, ...en }, (value) => value.length === 0),
    ).toEqual([])
  })

  it('no usa signos de admiración: MESH no festeja lo que hace la persona', () => {
    expect(offenders(esAR, (value) => /[!¡]/.test(value))).toEqual([])
  })

  it('usa voseo, no tuteo, en los imperativos', () => {
    // Muestra chica pero real: si alguien escribe "Prueba de nuevo" en vez de
    // "Probá de nuevo", el producto deja de sonar de acá.
    //
    // Solo al principio de una oración, que es donde vive un imperativo en la
    // UI. Sin eso, "Con una cuenta los llevás" da falso positivo por el
    // sustantivo "cuenta", y un test que grita cuando no pasa nada se termina
    // apagando.
    const tuteo =
      /(^|[.:] )(prueba|elige|guarda|revisa|espera|escribe|mira|busca|toca|desliza|ingresa|selecciona|contacta)\b/i
    expect(offenders(esAR, (value) => tuteo.test(value))).toEqual([])
  })

  it('no le pide a nadie que haga clic en un teléfono', () => {
    expect(offenders(esAR, (value) => /\bclic\w*\b/i.test(value))).toEqual([])
  })

  it('no se disculpa: dice qué pasó y qué hacer', () => {
    // "Lo sentimos" no le devuelve a nadie lo que estaba haciendo. Los errores
    // dicen qué pasó y qué hacer, en ese orden.
    const disculpas = /\b(lo sentimos|perdón|disculp\w+|ups)\b/i
    expect(offenders(esAR, (value) => disculpas.test(value))).toEqual([])
  })

  it('no deja inglés suelto en el catálogo de origen', () => {
    // Dos clases de excepción, y las dos son préstamos ya asentados en el
    // castellano rioplatense — no descuidos.
    //
    // · Los nombres propios de estilo son términos del oficio y se dicen en
    //   inglés también acá.
    // · "Matches", en la etiqueta de la pestaña. Tinder volvió la palabra de
    //   uso corriente y nadie en CABA la lee como inglés. Es la ÚNICA clave
    //   donde se acepta: adentro de la pantalla las bandas siguen diciendo
    //   "Encaje fuerte" / "Buen encaje", que es castellano y es más preciso.
    const permitidos = new Set([
      'style.tattoo.blackwork',
      'style.tattoo.old-school',
      'style.tattoo.lettering',
      'style.tattoo.handpoke',
      'style.tattoo.fine-line',
      'style.tattoo.dotwork',
      'tabs.matches',
    ])
    // Los límites son `\p{L}` y no `\b`: en JavaScript, `\b` trata a una vocal
    // acentuada como si no fuera una letra, así que `\bcancel\b` daba positivo
    // dentro de "canceló". Un guard que grita cuando no pasa nada se termina
    // apagando, y este cuida algo que importa.
    const ingles =
      /(?<!\p{L})(cancel|retry|back|close|continue|save|loading|error|search|settings|profile|match(es)?|tap|swipe)(?!\p{L})/iu
    expect(
      Object.entries(esAR)
        .filter(([key]) => !permitidos.has(key))
        .filter(([, value]) => ingles.test(value))
        .map(([key, value]) => `${key}: ${value}`),
    ).toEqual([])
  })

  it('no usa jerga de producto con la persona', () => {
    // "Onboarding", "feed", "match score" son palabras nuestras, no suyas.
    const jerga = /\b(onboarding|feed|score|engagement|churn|matchear)\b/i
    expect(offenders(esAR, (value) => jerga.test(value))).toEqual([])
  })

  it('no promete un resultado que no podemos sostener', () => {
    const prohibidos =
      /\b(perfecto|perfecta|ideal|garantiz\w*|el mejor|la mejor)\b/i
    expect(offenders(esAR, (value) => prohibidos.test(value))).toEqual([])
  })
})

describe('resolveLocale', () => {
  it('manda cualquier español a es-AR', () => {
    // Alguien con el teléfono en es-MX entiende el voseo mucho mejor que el
    // inglés.
    expect(resolveLocale('es-AR')).toBe('es-AR')
    expect(resolveLocale('es-MX')).toBe('es-AR')
    expect(resolveLocale('ES')).toBe('es-AR')
  })

  it('manda el resto a inglés', () => {
    expect(resolveLocale('en-US')).toBe('en')
    expect(resolveLocale('pt-BR')).toBe('en')
  })

  it('cae en el locale de origen si el sistema no dice nada', () => {
    expect(resolveLocale(undefined)).toBe('es-AR')
    expect(resolveLocale(null)).toBe('es-AR')
  })
})

describe('translate', () => {
  it('devuelve el string del catálogo', () => {
    expect(translate('es-AR', 'common.retry')).toBe('Reintentar')
    expect(translate('en', 'common.retry')).toBe('Try again')
  })

  it('deja el marcador a la vista si falta un parámetro', () => {
    // Un hueco visible se reporta. Un "undefined" se confunde con un dato real.
    expect(translate('es-AR', 'common.retry', {})).toBe('Reintentar')
  })
})
