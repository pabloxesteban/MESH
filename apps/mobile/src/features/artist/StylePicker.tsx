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

/**
 * Cuántos estilos declara un artista para sí.
 *
 * Tres y no más porque tres es lo que la base marca como primarios
 * (`enforce_primary_style_cap`): con un cuarto, el cuarto entraría al perfil
 * sin ser primario y la pantalla no tendría forma de mostrar esa diferencia
 * sin explicar el esquema. Ver supabase/migrations/20260817000500_professionals.sql.
 */
export const MAX_OWN_STYLES = 3

export interface StylePickerProps {
  selected: readonly string[]
  max: number
  onChange: (next: readonly string[]) => void
  /**
   * Prefijo de los testID. Hay dos selectores en la misma pantalla —los
   * estilos del artista y los de la pieza que está subiendo— y sin esto los
   * dos responderían al mismo identificador.
   */
  testIDPrefix?: string
}

export function StylePicker({
  selected,
  max,
  onChange,
  testIDPrefix = 'studio-style',
}: StylePickerProps) {
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
              testID={`${testIDPrefix}-${style.slug}`}
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
