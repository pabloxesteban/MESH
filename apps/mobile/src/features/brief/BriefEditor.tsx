/**
 * Lo que la IA leyó de la foto, para revisar antes de publicar.
 *
 * **Es una lectura, no un veredicto.** Todo lo que el modelo eligió viene
 * marcado y se cambia con un toque, y todo lo que no pudo leer viene vacío en
 * vez de adivinado. Esa es la diferencia entre una app que entiende lo que
 * subiste y una que te dice qué querés.
 *
 * Por qué se muestra antes de publicar y no después: el brief es lo que un
 * artista va a leer para ponerle un precio. Un tamaño equivocado le cambia el
 * número a alguien, y descubrirlo cuando ya llegaron cinco propuestas es tarde.
 *
 * El vocabulario sale de la tabla `traits` — la misma lista que puede devolver
 * el clasificador. Ver ADR-020.
 */

import { ScrollView } from 'react-native'

import { Box, FilterChip, Text, spacing } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import type { Trait } from './queries.ts'

/**
 * El orden en que se preguntan las dimensiones.
 *
 * De la más concreta a la más opinable: dónde va es un hecho, el tamaño se
 * negocia, y la paleta es gusto. Si la primera pregunta fuera la más difícil,
 * la pantalla se abandonaría en la primera.
 */
const ORDEN: readonly { dimension: string; titleKey: TranslationKey }[] = [
  { dimension: 'body_area', titleKey: 'brief.bodyArea' },
  { dimension: 'size', titleKey: 'brief.size' },
  { dimension: 'palette', titleKey: 'brief.palette' },
]

export interface BriefEditorProps {
  traits: readonly Trait[]
  /** Los slugs elegidos. Los que leyó la IA vienen ya adentro. */
  selected: ReadonlySet<string>
  onToggle: (slug: string) => void
  /** Cuántos rasgos leyó el modelo. Se dice, para no atribuirse lo que eligió la persona. */
  readCount?: number
}

export function BriefEditor({
  traits,
  selected,
  onToggle,
  readCount = 0,
}: BriefEditorProps) {
  const t = useT()

  return (
    <Box gap="md" testID="brief-editor">
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('brief.title')}
        </Text>
        {/* Se dice cuánto salió de la foto y cuánto falta. Sin esto, un campo
            vacío se lee como un error de la app en vez de como "esto la foto no
            lo dice". */}
        <Text role="micro" color="textTertiary">
          {readCount === 0
            ? t('brief.readNone')
            : t('brief.read', { n: String(readCount) })}
        </Text>
      </Box>

      {ORDEN.map(({ dimension, titleKey }) => {
        const deLaDimension = traits.filter(
          (trait) => trait.dimension === dimension,
        )
        if (deLaDimension.length === 0) return null

        return (
          <Box key={dimension} gap="xxs">
            <Text role="label" color="textSecondary">
              {t(titleKey)}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xxs }}
            >
              {deLaDimension.map((trait) => (
                <FilterChip
                  key={trait.id}
                  label={t(trait.nameKey as TranslationKey)}
                  selected={selected.has(trait.slug)}
                  onToggle={() => onToggle(trait.slug)}
                  testID={`trait-${trait.slug}`}
                />
              ))}
            </ScrollView>
          </Box>
        )
      })}
    </Box>
  )
}
