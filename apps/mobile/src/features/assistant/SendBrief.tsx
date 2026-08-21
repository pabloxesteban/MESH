/**
 * Mandar el pedido armado como primer mensaje de un chat.
 *
 * Aparece **solo en un chat vacío**, y solo del lado de quien busca. Es el
 * momento exacto en que sirve: después del primer mensaje, la conversación ya
 * arrancó y un botón que vuelca un bloque de texto es ruido.
 *
 * El texto lo arma `briefMessage()`, que es una plantilla pura — el resumen lo
 * escribió la persona en la pantalla de revisión y las etiquetas son slugs
 * traducidos. Nada generado cruza hacia el artista sin haber pasado por su mano.
 * Ver ADR-021.
 *
 * Y se **previsualiza antes de mandar**: es su primer mensaje a un desconocido,
 * así que tiene que poder ver qué dice antes de que salga.
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Box, Button, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { briefMessage } from './briefMessage.ts'
import { fetchOwnBrief } from './queries.ts'

export interface SendBriefProps {
  userId: string
  onSend: (body: string) => void
  sending?: boolean
}

export function SendBrief({ userId, onSend, sending = false }: SendBriefProps) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)

  const pedido = useQuery({
    queryKey: ['own-brief', userId],
    queryFn: () => fetchOwnBrief(userId),
  })

  const brief = pedido.data
  if (brief == null) return null

  // Estilo primero y después los rasgos, en el orden en que se leen. Las claves
  // salen de los slugs, así que un slug sin traducción se ve como su clave —
  // preferible a esconderlo, porque así se nota y se agrega.
  const labels = [
    ...(brief.styleSlug != null
      ? [t(`style.tattoo.${brief.styleSlug}` as TranslationKey)]
      : []),
    ...brief.traitSlugs.map((slug) =>
      t(`trait.tattoo.${slug}` as TranslationKey),
    ),
  ]

  const body = briefMessage({ summary: brief.summary, labels })
  if (body == null) return null

  return (
    <Box gap="xxs" testID="send-brief">
      <Text role="label" color="textSecondary">
        {t('sendBrief.title')}
      </Text>

      {abierto ? (
        <Box
          gap="xxs"
          padding="sm"
          radius="md"
          border="borderSubtle"
          testID="send-brief-preview"
        >
          <Text role="body">{body}</Text>
        </Box>
      ) : (
        <Text role="label" color="textTertiary">
          {t('sendBrief.body')}
        </Text>
      )}

      <Box direction="row" gap="xxs">
        <Button
          label={t(abierto ? 'sendBrief.send' : 'sendBrief.preview')}
          variant={abierto ? 'primary' : 'secondary'}
          size="sm"
          loading={abierto && sending}
          onPress={() => {
            if (!abierto) {
              setAbierto(true)
              return
            }
            onSend(body)
          }}
          testID="send-brief-action"
        />
        {abierto ? (
          <Button
            label={t('common.cancel')}
            variant="ghost"
            size="sm"
            onPress={() => setAbierto(false)}
            testID="send-brief-cancel"
          />
        ) : null}
      </Box>
    </Box>
  )
}
