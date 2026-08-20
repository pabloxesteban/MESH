/**
 * Los tatuadores que levantaron la mano ante una búsqueda tuya.
 *
 * Va arriba de los matches y debajo de los chats: los matches son quienes MESH
 * te recomienda, esto es quién te vio a vos. Es la única lista de la app donde
 * la iniciativa vino del otro lado, y por eso dice de qué búsqueda se trata —
 * sin eso, "a Fulano le interesás" no se sabe por qué.
 *
 * Lo que NO hace: contar. Nada de "3 tatuadores interesados" en grande, ni
 * insignia, ni aviso. Es una lista de personas, y cada una se abre o se
 * descarta. Ver los innegociables: nada de rachas ni de números para inflar.
 *
 * Si no hay ninguno no se muestra nada. Un encabezado vacío arriba de los
 * matches sería ruido permanente para quien nunca abrió una búsqueda.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  Box,
  MIN_TOUCH_TARGET,
  Pressable,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useI18n } from '@/i18n/I18nProvider.tsx'

import { formatMoney } from '../profile/format.ts'

import { dismissInterest, fetchSearchInterests } from './interests.ts'

export function InterestList({
  onOpenProfile,
}: {
  onOpenProfile: (professionalSlug: string) => void
}) {
  const { t, locale } = useI18n()
  const theme = useTheme()
  const client = useQueryClient()

  const interests = useQuery({
    queryKey: ['search-interests'],
    queryFn: () => fetchSearchInterests(),
  })

  const dismiss = useMutation({
    mutationFn: (interestId: string) => dismissInterest(interestId),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['search-interests'] }),
  })

  const items = interests.data ?? []
  if (items.length === 0) return null

  return (
    <Box gap="xs" testID="interest-list">
      <Text role="label" color="textSecondary">
        {t('proposal.title')}
      </Text>

      {items.map((interest) => (
        <Box
          key={interest.interestId}
          direction="row"
          align="center"
          gap="xs"
          background="surfaceRaised"
          radius="md"
          paddingX="sm"
          paddingY="xs"
          testID={`interest-${interest.interestId}`}
        >
          <Pressable
            onPress={() => onOpenProfile(interest.professionalSlug)}
            accessibilityRole="button"
            accessibilityLabel={t('demand.interests.open', {
              nombre: interest.professionalName,
            })}
            testID={`interest-open-${interest.interestId}`}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH_TARGET,
              justifyContent: 'center',
            }}
          >
            <Text role="body">{interest.professionalName}</Text>
            {/* **El número, arriba de todo lo demás.** Es el dato por el que
                esta persona va a escribir o no. Antes acá había un nombre y una
                lista de nombres no se puede comparar. Ver ADR-020. */}
            <Text role="body" testID={`interest-price-${interest.interestId}`}>
              {t('proposal.range', {
                min: formatMoney(
                  interest.priceMinCents,
                  interest.priceCurrency,
                  locale,
                ),
                max: formatMoney(
                  interest.priceMaxCents,
                  interest.priceCurrency,
                  locale,
                ),
              })}
              {' · '}
              {t(
                interest.sessions === 1
                  ? 'proposal.sessions.one'
                  : 'proposal.sessions',
                { n: String(interest.sessions) },
              )}
            </Text>
            {interest.note != null ? (
              <Text role="micro" color="textSecondary" numberOfLines={2}>
                {interest.note}
              </Text>
            ) : null}
            <Text role="micro" color="textTertiary" numberOfLines={1}>
              {interest.projectTitle}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => dismiss.mutate(interest.interestId)}
            accessibilityRole="button"
            accessibilityLabel={t('demand.interests.dismiss', {
              nombre: interest.professionalName,
            })}
            testID={`interest-dismiss-${interest.interestId}`}
            style={{
              minHeight: MIN_TOUCH_TARGET,
              minWidth: MIN_TOUCH_TARGET,
              paddingHorizontal: spacing.xs,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.surface,
            }}
          >
            <Text role="micro" color="textSecondary">
              {t('demand.interests.dismiss.short')}
            </Text>
          </Pressable>
        </Box>
      ))}
    </Box>
  )
}
