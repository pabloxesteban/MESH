/**
 * MESH UX PLAYGROUND — inicio.
 *
 * No es parte de la experiencia de producción. Es un laboratorio para probar
 * interacciones antes de integrarlas a la app real. Nada de acá se promueve a
 * producción automáticamente: promoverlo necesita el visto bueno de
 * `design-system-engineer`, `mobile-engineer` y `product-critic` — ver
 * docs/research/MESH-UX-STRATEGY.md § "El UX Playground".
 */

import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  SCREEN_GUTTER,
  Text,
  spacing,
  useTheme,
} from '@/design-system/index.ts'

import { PLAYGROUND_ENTRIES, type PlaygroundEntry } from './index.ts'

const CATEGORY_LABEL: Record<PlaygroundEntry['category'], string> = {
  direction: 'DIRECCIÓN VISUAL',
  discovery: 'DESCUBRIMIENTO',
  taste: 'GUSTO',
  matching: 'MATCHING',
  motion: 'MOVIMIENTO',
}

export function PlaygroundHome() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState<PlaygroundEntry | null>(null)

  if (open != null) {
    const Component = open.component
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.surface }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        testID={`playground-${open.id}`}
      >
        <Box padding="md" gap="sm">
          <Button
            label="← Volver al índice"
            variant="ghost"
            onPress={() => setOpen(null)}
            testID="playground-back"
          />
          <Text role="titleLg">{open.name}</Text>
          <Detail label="Propósito" value={open.purpose} />
          <Detail label="Interacción" value={open.interaction} />
          <Detail label="Accesibilidad" value={open.accessibility} />
          <Detail label="Notas" value={open.notes} />
        </Box>
        {Component != null ? <Component /> : <NotBuilt />}
      </ScrollView>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        padding: SCREEN_GUTTER,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      testID="screen-playground"
    >
      <Box gap="lg">
        <Box gap="xxs">
          <Text role="micro" color="textSecondary">
            SOLO DESARROLLO — NUNCA EN UN BUILD DE RELEASE
          </Text>
          <Text role="display">UX Playground</Text>
          <Text role="body" color="textSecondary">
            Laboratorio de interacción. Ver docs/research/MESH-UX-STRATEGY.md
            para qué se construyó y por qué.
          </Text>
        </Box>

        {(
          Object.keys(CATEGORY_LABEL) as Array<PlaygroundEntry['category']>
        ).map((category) => (
          <Box key={category} gap="sm">
            <Text role="label" color="textSecondary">
              {CATEGORY_LABEL[category]}
            </Text>
            {PLAYGROUND_ENTRIES.filter(
              (entry) => entry.category === category,
            ).map((entry) => (
              <Button
                key={entry.id}
                label={
                  entry.component != null
                    ? entry.name
                    : `${entry.name} (sin construir)`
                }
                variant={entry.component != null ? 'secondary' : 'ghost'}
                onPress={() => setOpen(entry)}
                fullWidth
                testID={`playground-entry-${entry.id}`}
              />
            ))}
          </Box>
        ))}
      </Box>
    </ScrollView>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box gap="xxs">
      <Text role="label" color="textSecondary">
        {label.toUpperCase()}
      </Text>
      <Text role="body">{value}</Text>
    </Box>
  )
}

function NotBuilt() {
  return (
    <Box padding="md">
      <Text role="body" color="textTertiary">
        Sin construir todavía. Ver la nota de arriba para el motivo.
      </Text>
    </Box>
  )
}
