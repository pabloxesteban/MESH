/**
 * La obra que crece hasta ser el perfil.
 *
 * Es la interacción firma de MESH y lo único que hace es sostener una promesa
 * espacial: **la obra que tocaste no desapareció, se convirtió en esto.** Sin
 * ella, tocar una obra es un corte y la persona tiene que volver a buscar con
 * la mirada qué está viendo; con ella, el ojo no suelta el objeto.
 *
 * Implementación propia y no la transición nativa de expo-router, por lo que
 * dice [D-007](../../../../docs/design/MESH-DESIGN-DECISIONS.md): la nativa es
 * alpha, solo iOS, y con ~1s de demora declarada en la documentación de Expo.
 *
 * **Qué NO hace, a propósito:** no es un elemento compartido de verdad. Es una
 * copia de la obra dibujada por encima de todo, que arranca exactamente donde
 * estaba la original y termina exactamente donde va el hero. El original queda
 * tapado por la pantalla nueva y el hero real aparece recién cuando la copia
 * termina, así que nunca se ven los dos. La diferencia con un elemento
 * compartido nativo no se puede ver; la diferencia en fragilidad, sí.
 *
 * Se animan `left/top/width/height` y no `transform`. Un transform sería más
 * barato, pero con escala no uniforme —que es lo que pasa cuando la tarjeta de
 * origen y el hero no comparten relación de aspecto, como en el carrusel de
 * Inicio— deforma la imagen y el radio de las esquinas. Es una sola vista
 * animada durante 280ms: el costo se paga y la deformación no.
 *
 * **Sirve para las dos direcciones.** Al ir, `from` es la tarjeta y `to` el
 * hero; al volver, al revés. Nada más cambia: el componente no sabe —ni
 * necesita saber— hacia dónde va la navegación.
 */

import { Image } from 'expo-image'
import { useEffect } from 'react'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { easing, radius, useMotion, useTheme } from '@/design-system/index.ts'

import { interpolateRect, type Rect } from './geometry.ts'

export interface GrowingArtworkProps {
  from: Rect
  to: Rect
  /** URL ya resuelta de la imagen. */
  source: string
  blurhash: string | null
  /** Cuántos milisegundos dura. Sale de un token; el llamador lo resuelve. */
  durationMs: number
  /** Se llama cuando la obra llegó: recién ahí el hero real puede aparecer. */
  onArrived: () => void
  testID?: string
}

export function GrowingArtwork({
  from,
  to,
  source,
  blurhash,
  durationMs,
  onArrived,
  testID,
}: GrowingArtworkProps) {
  const theme = useTheme()
  const { reduceMotion } = useMotion()
  const progress = useSharedValue(0)

  useEffect(() => {
    // Con movimiento reducido no hay recorrido: la obra ya está en su lugar
    // final y lo único que queda es avisar. No se anima "más rápido" — se
    // llega, que es lo que pidió quien configuró el sistema así.
    if (reduceMotion) {
      progress.value = 1
      onArrived()
      return
    }

    progress.value = withTiming(
      1,
      {
        duration: durationMs,
        // La curva de entrada del design system, construida acá: los tokens
        // guardan los cuatro puntos de control y no un objeto de Reanimated,
        // para no arrastrar su stack nativo a cualquier archivo que toque un
        // token. Ver tokens/motion.ts.
        easing: Easing.bezier(...easing.out),
      },
      (finished) => {
        // `finished` es falso si alguien desmontó la pantalla a mitad de
        // camino. Ahí no hay a quién avisarle.
        if (finished === true) runOnJS(onArrived)()
      },
    )
  }, [durationMs, onArrived, progress, reduceMotion])

  // El radio sale del tamaño y no de la dirección: el rectángulo grande usa el
  // radio grande, sea el origen o el destino. Así la vuelta se ve bien sin que
  // el componente sepa que es una vuelta.
  const radiusFrom = from.width >= to.width ? radius.lg : radius.md
  const radiusTo = from.width >= to.width ? radius.md : radius.lg

  const animatedStyle = useAnimatedStyle(() => {
    const rect = interpolateRect(from, to, progress.value)
    return {
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
      // El radio también viaja: la tarjeta de la grilla y el hero del perfil
      // no tienen el mismo, y dejarlo fijo delata que son dos cosas distintas
      // justo cuando la animación está diciendo que son la misma.
      borderRadius:
        radiusFrom + (radiusTo - radiusFrom) * Math.min(progress.value, 1),
    }
  })

  return (
    <Animated.View
      // No intercepta toques: durante la transición no hay nada que tocar, y
      // un overlay que come el primer toque de la pantalla nueva se siente
      // como que la app se colgó.
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          position: 'absolute',
          overflow: 'hidden',
          backgroundColor: theme.surfaceRaised,
          zIndex: 1,
        },
        animatedStyle,
      ]}
      testID={testID}
    >
      <Image
        source={source}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        {...(blurhash != null ? { placeholder: { blurhash } } : {})}
        // Sin fundido de entrada: la imagen ya estaba en pantalla y en caché
        // desde la grilla. Un fundido acá la haría parpadear justo cuando la
        // transición promete continuidad.
        transition={0}
        accessible={false}
      />
    </Animated.View>
  )
}
