/**
 * Genera `supabase/seed.sql` a partir de la taxonomía de `packages/domain`.
 *
 * Por qué generado y no escrito a mano: la taxonomía existe dos veces por
 * necesidad —como constantes de TypeScript, porque el motor de gusto y el
 * validador la necesitan sin base de datos; y como filas, porque el esquema no
 * puede tener los estilos hardcodeados—. Dos copias escritas a mano se separan.
 * Una generada de la otra, con `--check` en CI, no puede.
 *
 * Uso:
 *   node --experimental-strip-types src/reference.ts          escribe el archivo
 *   node --experimental-strip-types src/reference.ts --check  falla si difiere
 *
 * NO usa la service-role key ni la red: es una transformación de texto.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CATEGORIES, LOCATIONS, STYLES } from '@mesh/domain'

const HERE = dirname(fileURLToPath(import.meta.url))
const SEED_PATH = resolve(HERE, '../../../supabase/seed.sql')

/** Literal de string SQL. Duplicar la comilla simple es el escape del estándar. */
function sql(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function sqlTextArray(values: readonly string[]): string {
  if (values.length === 0) return `'{}'::text[]`
  return `array[${values.map(sql).join(', ')}]::text[]`
}

function render(): string {
  const lines: string[] = []

  lines.push(
    '-- GENERADO — no editar a mano.',
    '--',
    '-- Fuente: packages/domain/src/taxonomy/. Regenerar con:',
    '--   npm run db:reference',
    '--',
    '-- Datos de referencia solamente: categorías, estilos y ubicaciones. Los',
    '-- artistas NO van acá — los carga tools/seed desde content/artists/, con',
    '-- consentimiento verificado. Ver docs/product/content-policy.md.',
    '--',
    '-- Idempotente: `supabase db reset` lo corre en cada reinicio, y agregar una',
    '-- fila no puede romper las que ya existen ni cambiarles el id.',
    '',
  )

  lines.push('-- --- categories ---', '')
  for (const category of CATEGORIES) {
    lines.push(
      'insert into public.categories (slug, name_key, sort_order, is_active)',
      `values (${sql(category.slug)}, ${sql(category.nameKey)}, ${category.sortOrder}, ${category.isActive})`,
      'on conflict (slug) do update set',
      '  name_key = excluded.name_key,',
      '  sort_order = excluded.sort_order,',
      '  is_active = excluded.is_active;',
      '',
    )
  }

  lines.push('-- --- styles ---', '')
  for (const style of STYLES) {
    lines.push(
      'insert into public.styles (',
      '  category_id, slug, name_key, description_key, aliases, sort_order, is_active',
      ')',
      'select',
      `  c.id, ${sql(style.slug)}, ${sql(style.nameKey)},`,
      `  ${sql(style.descriptionKey)}, ${sqlTextArray(style.aliases)},`,
      `  ${style.sortOrder}, ${style.isActive}`,
      `from public.categories c where c.slug = ${sql(style.categorySlug)}`,
      'on conflict (category_id, slug) do update set',
      '  name_key = excluded.name_key,',
      '  description_key = excluded.description_key,',
      '  aliases = excluded.aliases,',
      '  sort_order = excluded.sort_order,',
      '  is_active = excluded.is_active;',
      '',
    )
  }

  // Las ciudades primero: un barrio referencia a su ciudad por parent_id, así
  // que si se insertaran mezclados el orden decidiría si la carga funciona.
  lines.push('-- --- locations: ciudades ---', '')
  for (const location of LOCATIONS.filter((l) => l.kind === 'city')) {
    lines.push(...locationInsert(location))
  }

  lines.push('-- --- locations: barrios ---', '')
  for (const location of LOCATIONS.filter((l) => l.kind === 'neighborhood')) {
    lines.push(...locationInsert(location))
  }

  return lines.join('\n')
}

const generated = render()
const check = process.argv.includes('--check')

if (check) {
  let current = ''
  try {
    current = readFileSync(SEED_PATH, 'utf8')
  } catch {
    console.error(`✗ Falta ${SEED_PATH}. Corré: npm run db:reference`)
    process.exit(1)
  }

  if (current !== generated) {
    console.error(
      '✗ supabase/seed.sql no coincide con la taxonomía de packages/domain.\n' +
        '  Alguien cambió una sin la otra. Corré: npm run db:reference',
    )
    process.exit(1)
  }

  console.log('✓ supabase/seed.sql al día con la taxonomía')
} else {
  writeFileSync(SEED_PATH, generated)
  console.log(
    `✓ ${SEED_PATH}\n` +
      `  ${CATEGORIES.length} categoría(s) · ${STYLES.length} estilo(s) · ` +
      `${LOCATIONS.length} ubicación(es)`,
  )
}

/**
 * El insert de una ubicación.
 *
 * `parent_id` se resuelve por subconsulta contra el slug del padre en vez de
 * llevar el uuid: los uuid los genera la base, y el archivo de referencia tiene
 * que poder correrse sobre cualquier instancia.
 */
function locationInsert(location: {
  slug: string
  countryCode: string
  adminArea: string
  city: string
  metroKey: string
  kind: string
  parentSlug: string | null
  groupKey: string | null
}): string[] {
  const parent =
    location.parentSlug == null
      ? 'null'
      : `(select id from public.locations where slug = ${sql(location.parentSlug)})`

  return [
    'insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)',
    `values (${sql(location.slug)}, ${sql(location.countryCode)}, ${sql(location.adminArea)}, ${sql(location.city)}, ${sql(location.metroKey)}, ${sql(location.kind)}, ${parent}, ${location.groupKey == null ? 'null' : sql(location.groupKey)})`,
    'on conflict (slug) do update set',
    '  country_code = excluded.country_code,',
    '  admin_area = excluded.admin_area,',
    '  city = excluded.city,',
    '  metro_key = excluded.metro_key,',
    '  kind = excluded.kind,',
    '  parent_id = excluded.parent_id,',
    '  group_key = excluded.group_key;',
    '',
  ]
}
