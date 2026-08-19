import { Tabs } from 'expo-router'

import { HAIRLINE, useTheme } from '@/design-system/index.ts'
import { useOnboardingIntent } from '@/features/account/useIntent.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

/**
 * Cuatro pestañas, y ninguna más. Pero no las mismas cuatro para todos.
 *
 * MESH tiene dos lados y no eran dos apps: un tatuador abría Inicio y veía un
 * mazo con la obra de otros tatuadores, que es exactamente lo que no necesita.
 * Ahora la barra depende de a qué vino la persona (ver ADR-014):
 *
 * | | Busca | Ofrece |
 * |---|---|---|
 * | Inicio | El mazo de obra | El mazo de búsquedas de gente |
 * | Segunda | Búsqueda por fotos | Tu estudio |
 * | Tercera | Matches, con los chats | Chats |
 * | Cuarta | Perfil | Perfil |
 *
 * Cuatro y no seis: con seis, la barra pasa a ser un menú que hay que estudiar
 * en vez de un lugar donde la mano ya sabe ir.
 *
 * Las pestañas que no corresponden se ocultan con `href: null` en vez de
 * borrarse: la ruta sigue existiendo y se puede llegar por enlace directo, así
 * que alguien que eligió "busco" y además tatúa entra a su estudio desde
 * Perfil sin que le sobre una pestaña que casi nunca toca.
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
        tabBarActiveTintColor: theme.textPrimary,
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
        name="buscar"
        options={{
          title: t('tabs.search'),
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
      <Tabs.Screen
        name="para-vos"
        options={{ title: ofrece ? t('tabs.chats') : t('tabs.matches') }}
      />
      <Tabs.Screen name="perfil" options={{ title: t('tabs.profile') }} />
    </Tabs>
  )
}
