/**
 * Estrellas: para mostrar una puntuación y para elegirla.
 *
 * Un solo componente en dos modos, porque son el mismo dibujo y separarlos
 * garantiza que en algún momento se vean distinto.
 *
 * **Se eligen tocando, no arrastrando.** Un gesto de arrastre sobre cinco
 * objetos de 44pt es preciso en el dedo de quien lo diseñó y no en el resto; y
 * el innegociable 6 pide que todo gesto tenga su botón. Acá cada estrella ES un
 * botón.
 *
 * El glifo es texto (★ / ☆) y no un ícono: escala con la tipografía accesible
 * sin que haya que mantener cinco tamaños de asset.
 */

import { View } from 'react-native'

import { Pressable, Text, spacing } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

/** De 1 a 5. La escala vive acá y en el check de la tabla. */
export const MAX_STARS = 5

export interface StarsProps {
  /** Cuántas estrellas están llenas. */
  value: number
  /** Si se puede tocar para cambiar. Sin esto, es solo un dibujo. */
  onChange?: (value: number) => void
  testID?: string
}

export function Stars({ value, onChange, testID }: StarsProps) {
  const t = useT()
  const estrellas = Array.from({ length: MAX_STARS }, (_, i) => i + 1)

  if (onChange == null) {
    return (
      <Text
        role="body"
        color="accent"
        // El dibujo por sí solo no dice nada a un lector de pantalla: cinco
        // glifos se leen como "estrella estrella estrella".
        accessibilityLabel={t('reviews.stars.value', { n: String(value) })}
        testID={testID}
      >
        {estrellas.map((n) => (n <= value ? '★' : '☆')).join(' ')}
      </Text>
    )
  }

  return (
    <View
      style={{ flexDirection: 'row', gap: spacing.xxs }}
      accessibilityRole="radiogroup"
      testID={testID}
    >
      {estrellas.map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          accessibilityRole="radio"
          accessibilityState={{ selected: n === value }}
          accessibilityLabel={t('reviews.stars.pick', { n: String(n) })}
          hapticIntent="like"
          testID={`star-${String(n)}`}
          // 44pt, como todo lo que se toca. Cinco estrellas apretadas en una
          // línea es el caso clásico de "le puse tres y quería cuatro".
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text role="titleLg" color={n <= value ? 'accent' : 'textTertiary'}>
            {n <= value ? '★' : '☆'}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
