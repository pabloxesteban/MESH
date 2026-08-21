/**
 * Borrar la cuenta.
 *
 * Cuatro decisiones, y las cuatro son sobre no engañar a nadie en los dos
 * sentidos — ni que se borre sin querer, ni que crea que no se borró:
 *
 * · **Se dice qué se va, en lista, antes de tocar nada.** Y se dice lo que NO
 *   se va: queda un registro de que la cuenta se borró, con un uuid y una
 *   fecha. Omitirlo sería mentir por la parte que no conviene contar.
 * · **Hay que escribir una palabra.** Es la única confirmación que no se
 *   resuelve con un toque distraído, y esto no tiene deshacer.
 * · **No hay período de gracia.** Quien pide que lo borren pidió eso, no que lo
 *   guardemos treinta días por si cambia de idea.
 * · **El botón dice lo que hace.** «Borrar mi cuenta», no «Continuar».
 *
 * Ver ADR-024.
 */

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { Box, Button, Input, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { deleteAccount } from './deleteAccount.ts'
import { actionErrorKey } from '@/data/actionError.ts'

/** Lo que hay que escribir. Va por i18n: en inglés la palabra es otra. */
const CONFIRM_KEY = 'account.delete.word'

export interface DeleteAccountProps {
  /** Después de borrar no hay a dónde volver: la pantalla de arranque. */
  onDeleted: () => void
  onCancel: () => void
}

export function DeleteAccount({ onDeleted, onCancel }: DeleteAccountProps) {
  const t = useT()

  const [escrito, setEscrito] = useState('')
  const [error, setError] = useState<string | null>(null)

  const palabra = t(CONFIRM_KEY)
  const confirmado =
    escrito.trim().toLocaleLowerCase() === palabra.toLocaleLowerCase()

  const borrar = useMutation({
    mutationFn: deleteAccount,
    onSuccess: onDeleted,
    onError: (err) => setError(t(actionErrorKey(err, 'account.delete.error'))),
  })

  return (
    <Box gap="sm" testID="delete-account">
      <Text role="title">{t('account.delete.title')}</Text>
      <Text role="body" color="textSecondary">
        {t('account.delete.body')}
      </Text>

      <Box gap="xxs">
        {(
          [
            'account.delete.item.profile',
            'account.delete.item.searches',
            'account.delete.item.chats',
            'account.delete.item.reviews',
            'account.delete.item.photos',
            'account.delete.item.studio',
          ] as const
        ).map((key) => (
          <Text key={key} role="body">
            {`· ${t(key)}`}
          </Text>
        ))}
      </Box>

      {/* Lo que NO se va. Va acá y no en una nota al pie: es la parte que no
          conviene contar, y por eso mismo tiene que estar a la vista. */}
      <Text role="label" color="textSecondary">
        {t('account.delete.kept')}
      </Text>

      <Input
        label={t('account.delete.confirm', { palabra })}
        value={escrito}
        onChangeText={(value) => {
          setEscrito(value)
          setError(null)
        }}
        autoCapitalize="none"
        testID="delete-account-confirm"
      />

      {error != null ? (
        <Text
          role="body"
          color="stateNegative"
          accessibilityRole="alert"
          testID="delete-account-error"
        >
          {error}
        </Text>
      ) : null}

      <Button
        label={t('account.delete.submit')}
        disabled={!confirmado}
        loading={borrar.isPending}
        onPress={() => borrar.mutate()}
        fullWidth
        testID="delete-account-submit"
      />
      <Button
        label={t('common.cancel')}
        variant="ghost"
        onPress={onCancel}
        testID="delete-account-cancel"
      />
    </Box>
  )
}
