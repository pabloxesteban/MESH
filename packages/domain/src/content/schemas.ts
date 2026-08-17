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

const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Debe ser un slug en minúscula con guiones',
  )

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
