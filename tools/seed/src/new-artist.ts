/**
 * Da de alta un artista REAL.
 *
 * Crea el directorio con los tres archivos que el validador exige y con todos
 * los campos presentes pero **vacíos**, marcados con `TODO`. Vacío y no
 * inventado es a propósito: un placeholder verosímil —un precio de ejemplo, una
 * bio "por ahora"— es exactamente cómo un dato inventado llega a producción sin
 * que nadie lo note. Un `TODO` no se publica por accidente; un precio plausible
 * sí.
 *
 * Lo que este comando NO hace: conseguir el consentimiento. Eso es una
 * conversación con una persona, y el archivo que genera es el registro de esa
 * conversación, no su reemplazo. Ver content-policy §2.
 *
 * Uso:
 *   npm run content:new -- --slug ana-perez --name "Ana Pérez"
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { STYLES, isKnownLocation, LOCATIONS } from '@mesh/domain'

const ROOT = join(fileURLToPath(import.meta.url), '../../../..')
const ARTISTS = join(ROOT, 'content/artists')

function arg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

const slug = arg('slug')
const name = arg('name')
const location = arg('location') ?? 'caba'

if (slug == null || name == null) {
  console.error(
    'Uso: npm run content:new -- --slug <slug> --name "<nombre>" [--location <slug>]\n' +
      '\n' +
      `Ciudades: ${LOCATIONS.filter((l) => l.kind === 'city')
        .map((l) => l.slug)
        .join(', ')}\n` +
      `\nBarrios de CABA — usá el barrio, no "caba", si lo sabés:\n  ` +
      LOCATIONS.filter((l) => l.parentSlug === 'caba')
        .map((l) => l.slug)
        .join(', '),
  )
  process.exit(1)
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error(`✗ "${slug}" no es un slug válido: minúsculas y guiones.`)
  process.exit(1)
}

if (slug.startsWith('fixture-')) {
  console.error(
    `✗ El prefijo "fixture-" está reservado para registros de prueba. Este\n` +
      `  comando es para artistas reales. Ver content-policy §4.`,
  )
  process.exit(1)
}

if (!isKnownLocation(location)) {
  console.error(
    `✗ "${location}" no está en la taxonomía de ubicaciones.\n` +
      `  Opciones: ${LOCATIONS.map((l) => l.slug).join(', ')}`,
  )
  process.exit(1)
}

if (location === 'caba') {
  // No es un error: alguien puede no saber el barrio todavía. Pero en una V1
  // que es toda CABA, "caba" a secas no distingue nada, y el barrio es
  // justamente lo que hace útil el componente de ubicación.
  console.warn(
    '· Aviso: pusiste "caba" a secas. Si sabés el barrio, usalo — el matching\n' +
      '  ordena por cercanía y "caba" no distingue a nadie de nadie.',
  )
}

const dir = join(ARTISTS, slug)
if (existsSync(dir)) {
  console.error(`✗ ${dir} ya existe. No se pisa nada.`)
  process.exit(1)
}

const hoy = new Date().toISOString().slice(0, 10)
const estilos = STYLES.map((style) => style.slug).join(', ')

mkdirSync(join(dir, 'media'), { recursive: true })

writeFileSync(
  join(dir, 'artist.yaml'),
  `# ${name}
#
# Todo campo con TODO está SIN COMPLETAR. Un campo que falta no renderiza nada
# en la app — eso es correcto y preferible a completarlo con algo plausible.
# Borrá las secciones enteras que no apliquen en vez de dejarlas a medias.

slug: ${slug}
display_name: '${name.replace(/'/g, "''")}'
category: tattoo
location: ${location}

# Con las palabras del artista, no las nuestras. Una o dos frases sobre qué
# hace. Sin superlativos, sin credenciales que no podamos verificar.
bio: >-
  TODO

# proficiency va en (0, 1]. Primario = 1,0; secundario ≈ 0,6.
# Al menos uno primario, como mucho tres.
# Estilos: ${estilos}
styles:
  - { slug: TODO, proficiency: 1.0, primary: true }

# ¿Viaja a trabajar a otras ciudades?
travels: false

# Precio: los cuatro campos o ninguno. En Argentina un precio sin fecha no es
# información, así que priced_at es obligatorio si hay precio.
# Los montos van en centavos: $120.000 son 12000000.
# price:
#   min_cents: TODO
#   max_cents: TODO
#   currency: ARS
#   priced_at: '${hoy}'

# Disponibilidad: open | limited | waitlist | closed, con la fecha en que el
# artista la declaró. Una disponibilidad vieja se marca como vieja en la app.
# availability:
#   status: TODO
#   updated_at: '${hoy}'

# Al menos un canal. WhatsApp en E.164 (+54911…), Instagram como handle pelado
# sin arroba ni URL.
contact:
  instagram: TODO
`,
)

writeFileSync(
  join(dir, 'portfolio.yaml'),
  `# Portafolio de ${name}
#
# Una entrada por pieza. El archivo va en media/ y lo provee el artista.
#
# Los pesos de estilo de cada pieza tienen que sumar 1 (± 0,001). Es lo que hace
# que el gusto sea explicable: si una pieza es 0,7 japonés y 0,3 blackwork, un
# me gusta reparte así.
#
# featured: true marca la pieza que abre el perfil. Una sola.

items:
  - file: 01.jpg
    featured: true
    # year: 2026
    # caption: TODO
    styles:
      - { slug: TODO, weight: 1.0 }
`,
)

writeFileSync(
  join(dir, 'consent.md'),
  `# Consentimiento — ${name}

**Sin este registro completo el artista no se carga.** No es una advertencia:
\`npm run content:validate\` falla y la corrida se aborta antes de escribir nada.

- Fecha: TODO (${hoy} si es hoy)
- Cómo se pidió: TODO — WhatsApp, en persona, mail. Anotá cuál.
- Quién lo pidió: TODO
- Qué se acordó mostrar: TODO — qué piezas, con qué epígrafes.
- Contacto publicado: TODO — qué canales aceptó que se muestren.
- Precio y disponibilidad: TODO — los declaró el artista, con qué fecha.

## Lo que se le dijo

TODO. Dejá acá, con tus palabras, qué le explicaste: que MESH muestra su obra
para que alguien pueda encontrarla, que el contacto va directo a su WhatsApp o
Instagram sin intermediarios, que no hay reservas ni pagos, y que puede pedir
que lo saquemos cuando quiera.

## Retiro

Si pide ser eliminado: despublicar, borrar los objetos de storage y las filas, y
eliminar el directorio — el mismo día hábil. Se conserva solo este registro y se
anota la fecha en \`REMOVED.md\`. Ver content-policy.

## Imágenes

TODO — de dónde salieron. Tienen que venir del artista o de una indicación
explícita suya. **Nada de scraping**, ni de Pinterest, ni de Instagram, ni de
ningún lado: aunque la imagen sea pública, la obra es de alguien y publicarla en
un portafolio ajeno la atribuye mal. Ver content-policy §2.
`,
)

console.log(`✓ ${dir}`)
console.log('')
console.log('Falta, en orden:')
console.log('  1. Conseguir el consentimiento y completar consent.md.')
console.log('  2. Pedirle las imágenes al artista y ponerlas en media/.')
console.log('  3. Completar artist.yaml y portfolio.yaml — todo TODO afuera.')
console.log('  4. npm run content:validate')
