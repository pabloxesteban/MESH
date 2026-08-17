import { useState } from 'react'
import { ScrollView } from 'react-native'
import { STYLES, TASTE_VERSION } from '@mesh/domain'
import {
  Box,
  Button,
  EmptyState,
  ErrorState,
  FilterChip,
  Input,
  SCREEN_GUTTER,
  Skeleton,
  Tag,
  Text,
  Toast,
  useTheme,
} from '@/design-system/index.ts'

/**
 * Galería del design system.
 *
 * Pantalla de verificación de la Fase 3: existe para poder mirar los tokens y
 * los componentes en un dispositivo real, en los dos temas y con el tamaño de
 * tipografía accesible más grande. La pantalla de intro real es la Fase 18.
 *
 * No hay ni un valor de diseño crudo acá: todo sale del design system. Si
 * alguno se colara, el lint rompería el build.
 */
export default function DesignSystemGallery() {
  const theme = useTheme()
  const [selected, setSelected] = useState<string[]>(['fine-line'])
  const [title, setTitle] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const styles = STYLES.slice(0, 6)

  return (
    <ScrollView
      style={{ backgroundColor: theme.surface }}
      contentContainerStyle={{ padding: SCREEN_GUTTER }}
    >
      <Box gap="xl" paddingBottom="xxl">
        <Box gap="xxs">
          <Text role="display">Tu gusto</Text>
          <Text role="body" color="textSecondary">
            Esto es lo que estamos leyendo de tus elecciones.
          </Text>
          <Text role="micro" color="textTertiary">
            {`${TASTE_VERSION} · design system`}
          </Text>
        </Box>

        <Section title="Tipografía">
          <Text role="titleLg">Encontrá a tu gente</Text>
          <Text role="title">¿Quién hizo esto?</Text>
          <Text role="bodyLg">
            Trabajo fine line y botánico, en negro, con foco en composiciones
            chicas.
          </Text>
          <Text role="label" color="textSecondary">
            Marcaste varios trabajos de Fine Line
          </Text>
        </Section>

        <Section title="Etiquetas y filtros">
          <Box direction="row" gap="xs">
            {styles.slice(0, 3).map((style) => (
              <Tag key={style.slug} label={style.slug} />
            ))}
          </Box>
          <Box direction="row" gap="xs">
            {styles.map((style) => (
              <FilterChip
                key={style.slug}
                label={style.slug}
                selected={selected.includes(style.slug)}
                onToggle={() =>
                  setSelected((current) =>
                    current.includes(style.slug)
                      ? current.filter((s) => s !== style.slug)
                      : [...current, style.slug],
                  )
                }
              />
            ))}
          </Box>
        </Section>

        <Section title="Botones">
          <Button
            label="Hablá con Luna"
            variant="primary"
            hapticIntent="like"
          />
          <Button label="Ver portfolio" variant="secondary" />
          <Button label="Seguir explorando" variant="ghost" />
          <Button label="Borrar mi gusto" variant="destructive" />
          <Button label="Enviando" loading />
          <Button label="No disponible" disabled />
        </Section>

        <Section title="Campo">
          <Input
            label="Título del proyecto"
            placeholder="Tatuaje botánico chico"
            hint="Cómo lo llamarías"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            showCounter
          />
          <Input label="Con error" error="No puede estar vacío" />
        </Section>

        <Section title="Carga">
          <Skeleton height={220} radius="lg" />
          <Box direction="row" gap="xs">
            <Skeleton height={16} width="40%" radius="sm" />
            <Skeleton height={16} width="25%" radius="sm" />
          </Box>
        </Section>

        <Section title="Vacío">
          <EmptyState
            title="Todavía no encontramos a alguien que encaje"
            body="Seguí explorando y vamos a ir entendiendo mejor tu gusto."
            action={{ label: 'Seguir explorando', onPress: () => {} }}
            secondaryAction={{
              label: 'Ver todos los artistas',
              onPress: () => {},
            }}
          />
        </Section>

        <Section title="Error">
          <ErrorState cause="offline" onRetry={() => {}} />
        </Section>

        <Section title="Aviso">
          <Button label="Mostrar aviso" onPress={() => setToastVisible(true)} />
          {toastVisible ? (
            <Toast
              message="Pasaste este trabajo"
              action={{
                label: 'Deshacer',
                onPress: () => setToastVisible(false),
              }}
              onDismiss={() => setToastVisible(false)}
            />
          ) : null}
        </Section>
      </Box>
    </ScrollView>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Box gap="sm">
      <Text role="micro" color="textTertiary">
        {title}
      </Text>
      <Box gap="sm" align="flex-start">
        {children}
      </Box>
    </Box>
  )
}
