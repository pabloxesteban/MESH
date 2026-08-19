/**
 * Desde dónde mirar.
 *
 * Tres opciones, y ninguna es el premio ni el castigo de las otras: el GPS,
 * un barrio elegido a mano, o nada. Ver `useSearchLocation.ts` para qué
 * significa cada una.
 *
 * **Cada opción dice qué hace con la lista**, y no en abstracto: el GPS ordena
 * por distancia real y muestra kilómetros; el barrio ordena por cercanía de
 * barrio y **no** muestra kilómetros; sin ubicación no ordena por cercanía. Un
 * selector que solo dice "Palermo / Boedo / Caballito" obliga a probar para
 * entender qué cambia.
 *
 * Y lo que ninguna hace: esconder a nadie. Está dicho una vez arriba, porque es
 * lo que más se malinterpreta de un control de ubicación — en casi todas las
 * apps, elegir un lugar filtra.
 */

import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  LOCATIONS,
  neighborhoodsOf,
  type LocationDefinition,
} from '@mesh/domain'

import {
  Box,
  Button,
  HAIRLINE,
  Input,
  MIN_TOUCH_TARGET,
  Pressable,
  SCREEN_GUTTER,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import type { DeviceLocationStatus } from './useDeviceLocation.ts'
import type { SearchLocation } from './useSearchLocation.ts'

/** La ciudad del V1. Cuando MESH salga de CABA, esto sale de acá. */
const CITY = 'caba'

export interface SearchLocationScreenProps {
  value: SearchLocation
  onChange: (next: SearchLocation) => void
  onClose: () => void
  /** Para poder decir que el permiso está denegado en vez de fallar callado. */
  deviceStatus: DeviceLocationStatus
  /** Pide el permiso del sistema. */
  onRequestDevice: () => void
}

export function SearchLocationScreen({
  value,
  onChange,
  onClose,
  deviceStatus,
  onRequestDevice,
}: SearchLocationScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')

  const places = useMemo(() => {
    // Los barrios de CABA primero y después el resto del AMBA: alguien de
    // Buenos Aires piensa en su barrio, no en su partido.
    const barrios = neighborhoodsOf(CITY)
    const alrededores = LOCATIONS.filter(
      (place) => place.kind === 'city' && place.slug !== CITY,
    )
    return [...barrios, ...alrededores]
  }, [])

  const visible = useMemo(() => {
    const needle = normalize(query)
    if (needle === '') return places
    return places.filter((place) => normalize(nameOf(place)).includes(needle))
  }, [places, query])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      keyboardShouldPersistTaps="handled"
      testID="screen-search-location"
    >
      <Box gap="xs" paddingX="lg">
        <Text role="titleLg">{t('searchLocation.title')}</Text>
        {/* Lo que más se malinterpreta de un control de ubicación: en casi
            todas las apps, elegir un lugar filtra. Acá no. */}
        <Text role="body" color="textSecondary">
          {t('searchLocation.hint')}
        </Text>
      </Box>

      <Box gap="xxs" paddingX="lg" paddingTop="md">
        <Option
          label={t('searchLocation.device')}
          hint={
            deviceStatus === 'denied'
              ? t('searchLocation.device.denied')
              : t('searchLocation.device.hint')
          }
          selected={value.mode === 'device'}
          onPress={() => {
            if (deviceStatus === 'unrequested') onRequestDevice()
            onChange({ mode: 'device', neighborhoodSlug: null })
          }}
          testID="search-location-device"
        />
        <Option
          label={t('searchLocation.none')}
          hint={t('searchLocation.none.hint')}
          selected={value.mode === 'none'}
          onPress={() => {
            onChange({ mode: 'none', neighborhoodSlug: null })
          }}
          testID="search-location-none"
        />
      </Box>

      <Box gap="xxs" paddingX="lg" paddingTop="lg">
        <Text role="label" color="textSecondary">
          {t('searchLocation.neighborhoods')}
        </Text>
        {/* `label` y no `micro`: micro va siempre en mayúsculas —es para
            antetítulos y etiquetas de estilo— y una oración de dos líneas en
            versalitas no se lee, se descifra. */}
        <Text role="label" color="textTertiary">
          {t('searchLocation.neighborhoods.hint')}
        </Text>
      </Box>

      <Box paddingX="lg" paddingTop="xs">
        <Input
          label={t('searchLocation.search')}
          value={query}
          onChangeText={setQuery}
          testID="search-location-query"
        />
      </Box>

      {visible.length === 0 ? (
        <Box paddingX="lg" paddingTop="md">
          <Text
            role="body"
            color="textSecondary"
            testID="search-location-empty"
          >
            {t('searchLocation.empty')}
          </Text>
        </Box>
      ) : (
        <View style={{ paddingTop: spacing.xs }}>
          {visible.map((place) => (
            <Option
              key={place.slug}
              label={nameOf(place)}
              selected={
                value.mode === 'neighborhood' &&
                value.neighborhoodSlug === place.slug
              }
              onPress={() => {
                onChange({
                  mode: 'neighborhood',
                  neighborhoodSlug: place.slug,
                })
              }}
              testID={`search-location-${place.slug}`}
            />
          ))}
        </View>
      )}

      <Box paddingX="lg" paddingTop="lg">
        <Button
          label={t('searchLocation.close')}
          onPress={onClose}
          fullWidth
          testID="search-location-close"
        />
      </Box>
    </ScrollView>
  )
}

/**
 * Una opción de la lista.
 *
 * Lo elegido se marca con un punto y **además** con `accessibilityState`: un
 * lector de pantalla no ve el punto, y una lista de cincuenta opciones donde no
 * se puede saber cuál está activa no es una lista, es una adivinanza.
 */
function Option({
  label,
  hint,
  selected,
  onPress,
  testID,
}: {
  label: string
  hint?: string
  selected: boolean
  onPress: () => void
  testID?: string
}) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: MIN_TOUCH_TARGET,
        paddingVertical: spacing.xs,
        paddingHorizontal: hint == null ? SCREEN_GUTTER : spacing.sm,
        borderRadius: radius.md,
        borderWidth: hint == null ? 0 : HAIRLINE,
        borderColor: theme.borderSubtle,
      }}
    >
      <View
        style={{
          width: spacing.xs,
          height: spacing.xs,
          borderRadius: radius.full,
          backgroundColor: selected ? theme.accentFill : 'transparent',
          borderWidth: selected ? 0 : HAIRLINE,
          borderColor: theme.borderStrong,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text role="body">{label}</Text>
        {hint != null ? (
          <Text role="label" color="textTertiary">
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

function nameOf(place: LocationDefinition): string {
  return place.neighborhood ?? place.city
}

/** Sin acentos y en minúscula: nadie escribe "Villa Devoto" con la tilde justa. */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
