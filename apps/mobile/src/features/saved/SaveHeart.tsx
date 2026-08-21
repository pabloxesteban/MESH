/**
 * El corazón.
 *
 * Un glifo y no un ícono importado: la app no tiene librería de íconos y meter
 * una entera para un corazón sería cargar un kilo para llevar un gramo. `♥` y
 * `♡` existen en toda fuente del sistema.
 *
 * Tres cosas que no son opcionales acá:
 *
 * 1. **Área táctil de 44pt.** El glifo se ve chico; lo que se toca no lo es.
 *    Ver el innegociable 6 de CLAUDE.md.
 * 2. **La etiqueta accesible cambia con el estado.** Un lector de pantalla no
 *    ve relleno ni contorno: si la etiqueta dijera siempre "guardar", quien lo
 *    usa nunca sabría si ya está guardado.
 * 3. **Fondo propio.** El corazón vive sobre una foto, y una foto puede ser
 *    blanca o negra. Sin el disco detrás, la mitad de las veces desaparece.
 * 4. **Los colores son los del velo, no los del tema.** El disco es siempre
 *    oscuro —un velo sobre una foto no cambia con el tema— así que lo de
 *    arriba tampoco puede cambiar. Usar `textInverse` acá dejaba el corazón
 *    negro sobre negro en el tema oscuro, que es el de arranque: la feature
 *    entera era invisible y ningún test lo veía. Ahora va `overlayContent`
 *    (17:1 sobre el velo) y `accentOnScrim` para el lleno (13,71:1, invariante
 *    por tema como el propio velo — a diferencia de `accentFill`, que desde
 *    ADR-031 sí cambia por tema para distinguirse de PAPEL, no de `ink900`).
 */

import {
  MIN_TOUCH_TARGET,
  Pressable,
  Text,
  radius,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

export interface SaveHeartProps {
  isSaved: boolean
  onToggle: () => void
  testID?: string
}

export function SaveHeart({ isSaved, onToggle, testID }: SaveHeartProps) {
  const t = useT()
  const theme = useTheme()

  return (
    <Pressable
      onPress={onToggle}
      // Solo al guardar. Un háptico al desguardar convierte arrepentirse en un
      // evento, y arrepentirse no es un logro. Va por `hapticIntent` del
      // design system y no llamando a expo-haptics de costado: el helper
      // respeta el interruptor de Ajustes y nunca puede tumbar el gesto.
      hapticIntent={isSaved ? 'none' : 'save'}
      accessibilityRole="button"
      accessibilityState={{ selected: isSaved }}
      accessibilityLabel={t(isSaved ? 'saved.remove' : 'saved.add')}
      testID={testID}
      style={{
        minWidth: MIN_TOUCH_TARGET,
        minHeight: MIN_TOUCH_TARGET,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
        backgroundColor: theme.overlayScrim,
      }}
    >
      <Text role="bodyLg" color={isSaved ? 'accentOnScrim' : 'overlayContent'}>
        {isSaved ? '♥' : '♡'}
      </Text>
    </Pressable>
  )
}
