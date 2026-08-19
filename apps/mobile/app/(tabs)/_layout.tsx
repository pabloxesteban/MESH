import { Tabs } from 'expo-router'

import { HAIRLINE, useTheme } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

/**
 * Cuatro pestañas, y ninguna más.
 *
 * Antes eran seis y ninguna se leía: con seis, la barra pasa a ser un menú que
 * hay que estudiar en vez de un lugar donde la mano ya sabe ir. "Tu gusto" y
 * "Tu estudio" bajaron a Perfil — son cosas que se visitan cada tanto, no
 * cada sesión.
 *
 * El orden no es alfabético ni arbitrario: es el del recorrido. Inicio es
 * donde la app abre y donde se pasa el tiempo; Búsqueda es la intención
 * declarada; Para vos es el resultado; Perfil es lo tuyo.
 *
 * Sin íconos a propósito: MESH no tiene set de íconos propio, y un ícono
 * genérico de librería al lado de la tipografía de marca se lee como pegado.
 * Cuatro etiquetas cortas entran holgadas.
 */
export default function TabsLayout() {
  const theme = useTheme()
  const t = useT()

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
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home') }}
      />
      <Tabs.Screen
        name="buscar"
        options={{ title: t('tabs.search') }}
      />
      <Tabs.Screen
        name="para-vos"
        options={{ title: t('tabs.matches') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: t('tabs.profile') }}
      />
    </Tabs>
  )
}
