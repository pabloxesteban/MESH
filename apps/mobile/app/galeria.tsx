import { useState } from 'react'
import { ScrollView } from 'react-native'
import { STYLES, TASTE_VERSION } from '@mesh/domain'
import {
  Box,
  Button,
  EmptyState,
  FilterChip,
  Input,
  SCREEN_GUTTER,
  Skeleton,
  Tag,
  Text,
  Toast,
  useTheme,
  useThemePreference,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'

/**
 * Galería del design system.
 *
 * Pantalla de verificación de la Fase 3: existe para poder mirar los tokens y
 * los componentes en un dispositivo real, en los dos temas y con el tamaño de
 * tipografía accesible más grande.
 *
 * **Es una herramienta de desarrollo, no una pantalla de producto.** Por eso
 * sus strings no pasan por i18n: no se los lee nadie que no esté construyendo
 * MESH. Cualquier pantalla que sí vea una persona sí pasa por i18n.
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

        <Section title="Tema">
          <ThemeSwitch />
        </Section>

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
          <Box direction="row" gap="xs" wrap>
            {styles.slice(0, 3).map((style) => (
              <Tag key={style.slug} label={style.slug} />
            ))}
          </Box>
          <Box direction="row" gap="xs" wrap>
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
          <Box direction="row" gap="xs" wrap>
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
          <ErrorView cause="offline" onRetry={() => {}} />
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

/**
 * Selector de tema.
 *
 * Los dos temas están completos y un componente que solo funciona en oscuro no
 * está terminado — pero eso no se puede revisar en un dispositivo si el tema lo
 * decide solo el sistema. El ajuste real vive en Ajustes (Fase 18); acá está
 * para poder mirar los dos sin cambiar la configuración del teléfono.
 */
function ThemeSwitch() {
  const { preference, setPreference } = useThemePreference()
  const options = [
    ['system', 'Sistema'],
    ['dark', 'Oscuro'],
    ['light', 'Claro'],
  ] as const

  return (
    <Box direction="row" gap="xs" wrap>
      {options.map(([value, label]) => (
        <FilterChip
          key={value}
          label={label}
          selected={preference === value}
          onToggle={() => setPreference(value)}
        />
      ))}
    </Box>
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
