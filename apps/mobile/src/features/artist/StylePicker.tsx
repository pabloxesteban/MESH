/**
 * Elegir hasta tres estilos, **en orden**.
 *
 * El orden es información: el primero que se toca es el que más pesa. Por eso
 * cada chip elegido muestra su posición — sin eso, el orden sería un estado
 * invisible que cambia el resultado.
 *
 * Ver `weights.ts` para el reparto exacto y por qué no es parejo.
 */

import { Box, FilterChip, Text } from '@/design-system/index.ts'
import { STYLES } from '@mesh/domain'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

export interface StylePickerProps {
  selected: readonly string[]
  max: number
  onChange: (next: readonly string[]) => void
}

export function StylePicker({ selected, max, onChange }: StylePickerProps) {
  const t = useT()

  return (
    <Box gap="xs">
      <Box direction="row" gap="xxs" wrap>
        {STYLES.map((style) => {
          const index = selected.indexOf(style.slug)
          const isSelected = index !== -1
          const atLimit = !isSelected && selected.length >= max

          return (
            <FilterChip
              key={style.slug}
              // El número va en la etiqueta y no solo en el color: el orden
              // tiene que poder leerse sin distinguir tonos.
              label={
                isSelected
                  ? `${index + 1} · ${t(`style.tattoo.${style.slug}` as TranslationKey)}`
                  : t(`style.tattoo.${style.slug}` as TranslationKey)
              }
              selected={isSelected}
              disabled={atLimit}
              onToggle={() =>
                onChange(
                  isSelected
                    ? selected.filter((slug) => slug !== style.slug)
                    : [...selected, style.slug],
                )
              }
              testID={`studio-style-${style.slug}`}
            />
          )
        })}
      </Box>

      {selected.length >= max ? (
        <Text role="micro" color="textTertiary">
          {t('studio.add.styles.max', { n: String(max) })}
        </Text>
      ) : null}
    </Box>
  )
}
