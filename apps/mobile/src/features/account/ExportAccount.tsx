/**
 * Llevarte lo tuyo.
 *
 * Ver ADR-028. Está **arriba de borrar la cuenta y no en otro lado** por una
 * razón concreta: borrar es inmediato y no tiene marcha atrás, así que el
 * derecho de acceso y el de supresión se pisan — ejercer uno destruye la
 * posibilidad de ejercer el otro. Ponerlos juntos, en ese orden, es lo único
 * que evita que alguien se entere tarde.
 *
 * Tres decisiones de la pantalla:
 *
 * · **Primero se cuenta qué hay adentro**, y recién después se comparte. Un
 *   archivo que aparece sin decir qué trae no es acceso a nada.
 * · **Se dice qué NO trae.** Las respuestas de la otra persona no están, y eso
 *   se escribe antes de que alguien lo descubra abriendo el archivo.
 * · **Si no hay hoja para compartir, queda copiar.** Perder el archivo no puede
 *   costar el acceso a los datos.
 */

import { useMutation } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'

import { Box, Button, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { exportAccount, type ExportResult } from './exportAccount.ts'
import { actionErrorKey } from '@/data/actionError.ts'

/**
 * Qué contar del archivo, y con qué clave.
 *
 * Las claves del JSON están en español porque el archivo lo abre una persona,
 * no un programa. Ver el comentario de `export_own_account()`.
 */
const SECCIONES: readonly { campo: string; key: TranslationKey }[] = [
  { campo: 'busquedas', key: 'export.count.searches' },
  { campo: 'conversaciones', key: 'export.count.chats' },
  { campo: 'turnos', key: 'export.count.appointments' },
  { campo: 'resenas_que_escribiste', key: 'export.count.reviews' },
  { campo: 'obra_guardada', key: 'export.count.saved' },
  { campo: 'asistente', key: 'export.count.assistant' },
]

function contar(json: string, campo: string): number {
  try {
    const datos = JSON.parse(json) as Record<string, unknown>
    const valor = datos[campo]
    return Array.isArray(valor) ? valor.length : 0
  } catch {
    return 0
  }
}

export function ExportAccount() {
  const t = useT()
  const [listo, setListo] = useState<ExportResult | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const armar = useMutation({
    mutationFn: exportAccount,
    onSuccess: (result) => {
      setListo(result)
      setError(null)
    },
    onError: (err) => setError(t(actionErrorKey(err, 'export.error'))),
  })

  return (
    <Box gap="xs" testID="export-account">
      <Text role="label" color="textSecondary">
        {t('export.title')}
      </Text>
      <Text role="body" color="textSecondary">
        {t('export.body')}
      </Text>
      {/* Lo que NO trae, antes de que alguien lo descubra abriendo el archivo. */}
      <Text role="label" color="textTertiary">
        {t('export.notIncluded')}
      </Text>

      {listo != null ? (
        <Box gap="xxs" testID="export-summary">
          <Text role="body">{t('export.ready')}</Text>
          {SECCIONES.map(({ campo, key }) => {
            const cuantos = contar(listo.json, campo)
            if (cuantos === 0) return null
            // MESH no tiene motor de plurales: la variante `.one` es el
            // mismo patrón que ya usan las reseñas y los huecos libres. Sin
            // esto dice "1 búsquedas".
            const frase =
              cuantos === 1
                ? t(`${key}.one` as TranslationKey)
                : t(key, { n: String(cuantos) })

            return (
              <Text key={campo} role="body" color="textSecondary">
                {`· ${frase}`}
              </Text>
            )
          })}
        </Box>
      ) : null}

      {error != null ? (
        <Text
          role="body"
          color="stateNegative"
          accessibilityRole="alert"
          testID="export-error"
        >
          {error}
        </Text>
      ) : null}

      <Button
        label={t(listo == null ? 'export.action' : 'export.again')}
        loading={armar.isPending}
        variant="secondary"
        onPress={() => {
          setCopiado(false)
          armar.mutate()
        }}
        fullWidth
        testID="export-account-action"
      />

      {/* Solo si no se pudo compartir: en un teléfono la hoja ya resolvió el
          problema, y un segundo botón sería ruido. */}
      {listo != null && !listo.shared ? (
        <Button
          label={t(copiado ? 'export.copied' : 'export.copy')}
          variant="ghost"
          size="sm"
          onPress={() => {
            void Clipboard.setStringAsync(listo.json).then(() =>
              setCopiado(true),
            )
          }}
          testID="export-account-copy"
        />
      ) : null}
    </Box>
  )
}
