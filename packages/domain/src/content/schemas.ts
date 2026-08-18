/**
 * Esquemas de validación del contenido de artistas.
 *
 * El contenido malformado aborta la corrida de carga ANTES de insertar nada. El
 * seeder nunca aplica un lote parcialmente y nunca saltea en silencio un
 * registro inválido. Ver docs/product/content-policy.md §5.
 *
 * Las claves de los archivos YAML están en inglés porque mapean directo a
 * columnas.
 */

import { z } from 'zod'
import { isKnownLocation } from '../taxonomy/locations.ts'
import { isKnownStyle, type CategorySlug } from '../taxonomy/taxonomy.ts'

/** Suma de pesos tolerada al validar los estilos de una pieza. */
export const STYLE_WEIGHT_TOLERANCE = 0.001

/**
 * Prefijo reservado de los SLUGS fixture. Ver content-policy §4.
 *
 * Antes esto marcaba el `display_name` (`[Fixture] Irezumi`). Se movió al slug
 * porque el nombre es lo que se ve y el slug es lo que se verifica: un prefijo
 * en el nombre ensucia cada captura, cada mensaje de contacto y cada evento de
 * analytics, mientras que el slug no se muestra nunca, no se traduce nunca y no
 * lo puede "arreglar" alguien que quiere que la demo se vea linda.
 *
 * La garantía de que un fixture no se confunde con una persona real no la da
 * este prefijo sola: la dan las tres cosas juntas de content-policy §4 — el
 * slug, la insignia visible en TODA superficie que renderiza un fixture, y el
 * bloqueo del contacto.
 */
export const FIXTURE_SLUG_PREFIX = 'fixture-'

const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Debe ser un slug en minúscula con guiones',
  )

/**
 * ¿Este nombre se lee como "Nombre Apellido"?
 *
 * Dos o más palabras capitalizadas seguidas, sin nexos. "Tinta Negra" y "Vieja
 * Escuela" pasarían, así que además se exige que ninguna palabra sea una
 * palabra común del vocabulario de tatuaje que usan los fixtures. La lista es
 * corta a propósito: no intenta ser un detector de nombres, intenta que nadie
 * llame "Sofía Ramírez" a un registro de prueba sin que el build lo note.
 */
const FIXTURE_VOCABULARY = new Set([
  'tinta',
  'negra',
  'negro',
  'aguja',
  'fina',
  'fino',
  'punto',
  'linea',
  'línea',
  'acuarela',
  'irezumi',
  'retrato',
  'vieja',
  'escuela',
  'caligrafia',
  'caligrafía',
  'fileteado',
  'mano',
  'sombra',
  'trazo',
  'color',
  'prueba',
  'demo',
  'fixture',
])

function looksLikeAPersonName(displayName: string): boolean {
  const words = displayName.split(/\s+/u).filter((word) => word.length > 0)
  const capitalized = words.filter((word) => /^\p{Lu}\p{L}+$/u.test(word))
  if (capitalized.length < 2) return false
  return capitalized.every(
    (word) => !FIXTURE_VOCABULARY.has(word.toLocaleLowerCase('es-AR')),
  )
}

const categorySlug = z.literal('tattoo')

/** E.164: '+' seguido de 8 a 15 dígitos, sin espacios ni guiones. */
const whatsappE164 = z
  .string()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    'WhatsApp debe estar en formato E.164, ej. +5491155551234',
  )

/** Handle pelado de Instagram — nunca una URL. */
const instagramHandle = z
  .string()
  .regex(
    /^[a-zA-Z0-9._]{1,30}$/,
    'Instagram debe ser el handle solo, sin URL ni @',
  )

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser una fecha ISO (AAAA-MM-DD)')

const currency = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Debe ser un código de moneda ISO-4217, ej. ARS')

export const priceSchema = z
  .object({
    min_cents: z.number().int().nonnegative(),
    max_cents: z.number().int().nonnegative(),
    currency,
    // Requerido: en Argentina un precio sin fecha no es información.
    priced_at: isoDate,
  })
  .refine((p) => p.min_cents <= p.max_cents, {
    message: 'El precio mínimo no puede ser mayor que el máximo',
    path: ['min_cents'],
  })

export const availabilitySchema = z.object({
  status: z.enum(['open', 'limited', 'waitlist', 'closed']),
  // Requerido: sin fecha no podemos saber si está vieja, y afirmar una
  // disponibilidad que no podemos sostener es la misma clase de error que
  // inventar una reseña. Ver ADR-005.
  updated_at: isoDate,
})

export const contactSchema = z
  .object({
    instagram: instagramHandle.optional(),
    whatsapp: whatsappE164.optional(),
  })
  .refine((c) => c.instagram != null || c.whatsapp != null, {
    message:
      'Un profesional publicado necesita al menos un canal de contacto — un ' +
      'perfil al que no se puede contactar es un callejón sin salida',
  })

export const artistStyleSchema = z.object({
  slug,
  proficiency: z.number().gt(0).lte(1),
  primary: z.boolean(),
})

export const artistSchema = z
  .object({
    slug,
    display_name: z.string().min(1).max(80),
    category: categorySlug,
    location: slug,
    bio: z.string().min(1).max(1000).optional(),
    styles: z.array(artistStyleSchema).min(1).max(8),
    travels: z.boolean().optional(),
    price: priceSchema.optional(),
    availability: availabilitySchema.optional(),
    contact: contactSchema,
    is_fixture: z.boolean().optional(),
  })
  .superRefine((artist, ctx) => {
    // Un fixture tiene que ser inconfundible, y el slug es donde se verifica.
    // Ver docs/product/content-policy.md §4.
    if (
      artist.is_fixture === true &&
      !artist.slug.startsWith(FIXTURE_SLUG_PREFIX)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message:
          `El slug de un fixture tiene que empezar con ` +
          `"${FIXTURE_SLUG_PREFIX}". Es lo que hace que un registro de prueba ` +
          `sea reconocible por una máquina y no solo a ojo.`,
      })
    }
    if (
      artist.is_fixture !== true &&
      artist.slug.startsWith(FIXTURE_SLUG_PREFIX)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['is_fixture'],
        message:
          `El slug empieza con "${FIXTURE_SLUG_PREFIX}" pero is_fixture no es ` +
          `true. La carga a producción rechaza fixtures, y esta fila pasaría.`,
      })
    }
    // El nombre de un fixture no puede parecer el de una persona. La heurística
    // es deliberadamente tosca — dos o más palabras capitalizadas seguidas es
    // la forma de "Nombre Apellido" — y por eso solo se aplica a fixtures,
    // donde un falso positivo cuesta renombrar un archivo de prueba y un falso
    // negativo cuesta que alguien le escriba a una persona que no existe.
    if (
      artist.is_fixture === true &&
      looksLikeAPersonName(artist.display_name)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['display_name'],
        message:
          `"${artist.display_name}" se lee como el nombre de una persona. Un ` +
          `fixture tiene que llamarse por lo que muestra ("Irezumi", "Tinta ` +
          `Negra"), no como alguien a quien se le podría escribir.`,
      })
    }

    if (!isKnownLocation(artist.location)) {
      ctx.addIssue({
        code: 'custom',
        path: ['location'],
        message:
          `La ubicación "${artist.location}" no existe. Agregar una requiere ` +
          `una fila en packages/domain/src/taxonomy/locations.ts y regenerar ` +
          `supabase/seed.sql.`,
      })
    }

    artist.styles.forEach((style, index) => {
      if (!isKnownStyle(artist.category, style.slug)) {
        ctx.addIssue({
          code: 'custom',
          path: ['styles', index, 'slug'],
          message:
            `El estilo "${style.slug}" no existe en la taxonomía de ` +
            `"${artist.category}". Agregarlo requiere una migración y revisión ` +
            `de content-engineer.`,
        })
      }
    })

    const primaries = artist.styles.filter((s) => s.primary)
    if (primaries.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['styles'],
        message: 'Un artista necesita al menos un estilo primario',
      })
    }
    if (primaries.length > 3) {
      ctx.addIssue({
        code: 'custom',
        path: ['styles'],
        message:
          'Como mucho 3 estilos primarios — si todo es primario, nada lo es',
      })
    }

    const slugs = artist.styles.map((s) => s.slug)
    if (new Set(slugs).size !== slugs.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['styles'],
        message: 'Estilo duplicado',
      })
    }
  })

export const portfolioItemSchema = z
  .object({
    file: z.string().min(1),
    caption: z.string().max(280).optional(),
    year: z.number().int().gte(1900).lte(2100).optional(),
    featured: z.boolean().optional(),
    styles: z
      .array(z.object({ slug, weight: z.number().gt(0).lte(1) }))
      .min(1)
      .max(4),
  })
  .superRefine((item, ctx) => {
    const total = item.styles.reduce((sum, s) => sum + s.weight, 0)
    if (Math.abs(total - 1) > STYLE_WEIGHT_TOLERANCE) {
      ctx.addIssue({
        code: 'custom',
        path: ['styles'],
        message:
          `Los pesos de estilo tienen que sumar 1 (suman ${total.toFixed(3)}). ` +
          `Así una pieza con cuatro etiquetas no pesa más que una enfocada. ` +
          `Ver docs/product/matching.md §3.2.`,
      })
    }

    const slugs = item.styles.map((s) => s.slug)
    if (new Set(slugs).size !== slugs.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['styles'],
        message: 'Estilo duplicado en la pieza',
      })
    }
  })

export const portfolioSchema = z.object({
  items: z.array(portfolioItemSchema).min(1).max(60),
})

export type ArtistContent = z.infer<typeof artistSchema>
export type PortfolioContent = z.infer<typeof portfolioSchema>
export type PortfolioItemContent = z.infer<typeof portfolioItemSchema>

/**
 * Valida los estilos de una pieza contra la taxonomía de la categoría del
 * artista. Se hace aparte de `portfolioItemSchema` porque el archivo de
 * portfolio no lleva la categoría — la hereda del artista.
 */
export function validatePortfolioStyles(
  portfolio: PortfolioContent,
  categorySlug: CategorySlug,
): string[] {
  const errors: string[] = []
  portfolio.items.forEach((item, index) => {
    for (const style of item.styles) {
      if (!isKnownStyle(categorySlug, style.slug)) {
        errors.push(
          `items[${index}] (${item.file}): el estilo "${style.slug}" no existe ` +
            `en la taxonomía de "${categorySlug}"`,
        )
      }
    }
  })
  return errors
}
