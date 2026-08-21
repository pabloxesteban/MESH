import { Tabs } from 'expo-router'

import { HAIRLINE, useTheme } from '@/design-system/index.ts'
import { useOnboardingIntent } from '@/features/account/useIntent.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

/**
 * Cuatro pestañas, y no las mismas cuatro para todos.
 *
 * | | Busca | Ofrece |
 * |---|---|---|
 * | Inicio | Artistas cerca tuyo | Búsquedas de gente |
 * | Segunda | Explorar — toda la obra | Tu estudio |
 * | Tercera | Chats | Chats |
 * | Cuarta | Perfil | Perfil |
 *
 * **Matches ya no existe.** MESH dejó de recomendar gente: ahora muestra quién
 * tatúa cerca tuyo y toda la obra que hay. Ver
 * docs/design/MESH-DESIGN-DECISIONS.md D-010.
 *
 * Las pestañas que no corresponden se ocultan con `href: null` en vez de
 * borrarse: la ruta sigue existiendo y se puede llegar por enlace directo, así
 * que alguien que eligió "busco" y además tatúa entra a su estudio desde Perfil
 * sin que le sobre una pestaña que casi nunca toca.
 *
 * Sin íconos a propósito: MESH no tiene set de íconos propio, y un ícono
 * genérico de librería al lado de la tipografía de marca se lee como pegado.
 */
export default function TabsLayout() {
  const theme = useTheme()
  const t = useT()
  const intent = useOnboardingIntent()
  const ofrece = intent === 'offering'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.surface },
        // ADR-032: acento de estado, recurrente — el tab activo es uno de los
        // ejemplos nombrados explícitamente en la tabla del ADR. `accent`
        // (texto/ícono), no `accentFill`: el ícono/label del tab es chico,
        // `accentFill` es para relleno de botón. Contraste verificado en
        // theme.test.ts (['accent', 'surface']).
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: HAIRLINE,
          borderTopColor: theme.borderSubtle,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen
        name="explorar"
        options={{
          title: t('tabs.explore'),
          ...(ofrece ? { href: null } : {}),
        }}
      />
      <Tabs.Screen
        name="estudio"
        options={{
          title: t('tabs.studio'),
          ...(ofrece ? {} : { href: null }),
        }}
      />
      <Tabs.Screen name="para-vos" options={{ title: t('tabs.chats') }} />
      <Tabs.Screen name="perfil" options={{ title: t('tabs.profile') }} />
      {/*
        Buscar por fotos deja de ser pestaña y sigue siendo ruta: se llega desde
        Explorar. Es la misma intención —encontrar obra parecida a una idea— y
        no merecía un lugar permanente en la barra.
      */}
      <Tabs.Screen name="buscar" options={{ href: null }} />
    </Tabs>
  )
}
