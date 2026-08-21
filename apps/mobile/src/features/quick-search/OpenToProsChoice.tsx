/**
 * ¿Que los tatuadores lo vean? — la única pregunta que decide si un pedido
 * existe para alguien más que su dueña.
 *
 * **Dos botones y ningún default.** Hasta el 2026-08-21 esto era un
 * interruptor apagado. La pregunta estaba —ADR-014 pide una decisión
 * explícita y la pantalla la hacía— pero quien no la miraba confirmaba igual
 * y su pedido no le llegaba a nadie. Un pedido que no sale no es un pedido.
 *
 * Forzar la elección respeta ADR-014 **más** de lo que la respetaba el
 * default: un interruptor apagado es una decisión solo para quien lo nota.
 * Acá no se puede publicar sin contestar, y no contestar no equivale a que sí.
 *
 * Un interruptor además sugiere que hay un estado normal y una excepción. Acá
 * no lo hay: mandarlo es el producto, y no mandarlo es una decisión legítima
 * de quien no quiere que su foto la vea nadie. Las dos opciones dicen **qué
 * pasa**, no qué son.
 */

import { Box, Button, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

export interface OpenToProsChoiceProps {
  /** `null` = todavía no eligió. No es `false` disfrazado. */
  value: boolean | null
  onChange: (value: boolean) => void
  /** Prefijo; los botones son `${testID}-yes` y `${testID}-no`. */
  testID: string
}

export function OpenToProsChoice({
  value,
  onChange,
  testID,
}: OpenToProsChoiceProps) {
  const t = useT()

  return (
    <Box gap="xs" testID={testID}>
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('quickSearch.open.title')}
        </Text>
        <Text role="body" color="textSecondary">
          {t('quickSearch.open.body')}
        </Text>
      </Box>

      <Button
        label={t('quickSearch.open.choose.yes')}
        variant={value === true ? 'primary' : 'secondary'}
        onPress={() => onChange(true)}
        fullWidth
        testID={`${testID}-yes`}
      />
      <Button
        label={t('quickSearch.open.choose.no')}
        variant={value === false ? 'primary' : 'secondary'}
        onPress={() => onChange(false)}
        fullWidth
        testID={`${testID}-no`}
      />

      {value === false ? (
        // Elegir que no lo vean es válido, pero no puede ser silencioso: el
        // pedido queda guardado y no le llega a nadie, y eso hay que decirlo
        // antes y no después de esperar una semana.
        <Text role="label" color="textTertiary" testID={`${testID}-note`}>
          {t('quickSearch.open.choose.noNote')}
        </Text>
      ) : null}
    </Box>
  )
}
