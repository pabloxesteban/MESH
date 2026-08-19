/**
 * Desde dónde se está mirando, dicho arriba de la lista.
 *
 * La lista de Inicio está ordenada por algo, y hasta acá ese algo era invisible.
 * Un orden que no se puede leer ni corregir no es un orden: es una caja negra
 * que a veces acierta.
 *
 * Es una línea y un control, no una tarjeta: no está compitiendo con la obra,
 * está rotulando la lista.
 */

import { View } from 'react-native'

import { locationLabel } from '@mesh/domain'

import {
  MIN_TOUCH_TARGET,
  Pressable,
  SCREEN_GUTTER,
  Text,
  spacing,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import type { SearchLocation } from './useSearchLocation.ts'

export interface SearchLocationHeaderProps {
  value: SearchLocation
  /** El barrio que resolvió el GPS, cuando lo resolvió. */
  deviceNeighborhoodSlug: string | null
  /** `false` cuando el modo es `device` pero no hay permiso todavía. */
  deviceReady: boolean
  onChange: () => void
}

export function SearchLocationHeader({
  value,
  deviceNeighborhoodSlug,
  deviceReady,
  onChange,
}: SearchLocationHeaderProps) {
  const t = useT()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.xs,
        paddingHorizontal: SCREEN_GUTTER,
        paddingBottom: spacing.xs,
      }}
      testID="search-location-header"
    >
      <Text role="label" numberOfLines={1} testID="search-location-label">
        {label(value, deviceNeighborhoodSlug, deviceReady, t)}
      </Text>

      <Pressable
        onPress={onChange}
        accessibilityRole="button"
        accessibilityLabel={t('searchLocation.title')}
        testID="search-location-change"
        style={{
          minHeight: MIN_TOUCH_TARGET,
          justifyContent: 'center',
          paddingLeft: spacing.xs,
        }}
      >
        <Text role="label" color="textSecondary">
          {t('searchLocation.header.action')}
        </Text>
      </Pressable>
    </View>
  )
}

/**
 * Qué dice el rótulo.
 *
 * El caso que importa es el cuarto: **modo GPS sin permiso**. Ahí no se dice
 * "cerca de donde estás", porque no se sabe dónde está — se dice sin ubicación,
 * que es la verdad, y el aviso de abajo explica qué falta.
 */
export function label(
  value: SearchLocation,
  deviceNeighborhoodSlug: string | null,
  deviceReady: boolean,
  t: (key: TranslationKey, params?: Record<string, string>) => string,
): string {
  if (value.mode === 'none') return t('searchLocation.header.none')

  if (value.mode === 'neighborhood') {
    const nombre =
      value.neighborhoodSlug == null
        ? null
        : locationLabel(value.neighborhoodSlug)
    // Sin nombre para el slug no se inventa uno: se cae a la forma genérica.
    return nombre == null
      ? t('searchLocation.header.none')
      : t('searchLocation.header.neighborhood', { barrio: nombre })
  }

  if (!deviceReady) return t('searchLocation.header.none')

  const barrio =
    deviceNeighborhoodSlug == null
      ? null
      : locationLabel(deviceNeighborhoodSlug)

  // Con el barrio resuelto se lo dice; sin él, se dice que es tu ubicación sin
  // ponerle nombre. El GPS da coordenadas, no siempre un barrio conocido.
  return barrio == null
    ? t('searchLocation.header.device')
    : t('searchLocation.header.deviceAt', { barrio })
}
