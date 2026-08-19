/**
 * Laboratorio de la transición obra → artista.
 *
 * Es la interacción firma de MESH y la que [D-007] decidió construir a mano en
 * vez de usar la transición nativa de expo-router (alpha, solo iOS, ~1s de
 * demora declarada). D-007 también dice que se prototipa acá antes de tocar
 * producción, y esto es eso.
 *
 * A diferencia de `SwipePhysicsLab`, que reimplementa lo que prueba, este
 * laboratorio usa el **componente real** —`GrowingArtwork`— con la geometría
 * real. Lo único simulado es de dónde salen los rectángulos: acá los mide de
 * una grilla de juguete, en producción los mide la grilla de Explorar.
 *
 * Lo que hay que mirar, en este orden:
 *
 * 1. **¿El ojo no suelta la obra?** Es lo único que la transición promete. Si
 *    en algún momento parece que apareció otra cosa, falló.
 * 2. **¿Aterriza clavada en el hero?** El hero de juguete está dibujado en el
 *    rectángulo que devuelve `heroRect`, no en el flujo: si la copia no cae
 *    exactamente encima, la geometría se separó de `ProfileScreen`.
 * 3. **¿280ms se siente bien?** El control de duración está para poder
 *    discutirlo con la mano, no con la intuición.
 *
 * **Coordenadas.** `GrowingArtwork` se posiciona respecto de su padre. En
 * producción el padre es la raíz de una pantalla a pantalla completa, así que
 * "respecto del padre" y "respecto de la ventana" son lo mismo; acá no, porque
 * el laboratorio vive a mitad del playground. Entonces el escenario de abajo
 * **es** la pantalla del laboratorio: se mide el origen contra él y se calcula
 * el hero contra él, con `insetTop: 0` porque un escenario no tiene muesca. Lo
 * que se verifica —que la copia aterrice clavada en lo que devuelve
 * `heroRect`— es lo mismo. El término del inset lo cubre el test unitario de
 * la geometría.
 *
 * [D-007]: ../../../../../docs/design/MESH-DESIGN-DECISIONS.md
 */

import { useRef, useState } from 'react'
import { View, useWindowDimensions } from 'react-native'

import {
  Box,
  Button,
  Pressable,
  SCREEN_GUTTER,
  Text,
  duration,
  radius,
  spacing,
  useMotion,
  useTheme,
} from '@/design-system/index.ts'
import { GrowingArtwork } from '@/features/transitions/GrowingArtwork.tsx'
import {
  heroRect,
  isUsableRect,
  isWorthAnimating,
  type Rect,
} from '@/features/transitions/geometry.ts'

/**
 * Un PNG de un píxel, estirado.
 *
 * El laboratorio prueba **movimiento**, no fotografía: un bloque de color
 * sólido deja ver el recorrido, el radio de las esquinas y el aterrizaje mucho
 * mejor que una foto, donde el detalle tapa el error. Y no hay red acá.
 */
const BLOQUE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGO4dnwTAATGAlD1M7POAAAAAElFTkSuQmCC'

/**
 * Alto del escenario.
 *
 * Tiene que entrar el hero más alto que se pueda pedir acá: con el ancho de un
 * teléfono típico menos las márgenes, la obra más vertical de la grilla de
 * juguete (0,8) da unos 437pt. Si alguien agrega una obra más vertical, esto
 * sube — o el aterrizaje se ve recortado y parece un error que no es.
 */
const ALTO_ESCENARIO = 460

/** Las relaciones de aspecto de la grilla de juguete. Desparejas a propósito. */
const OBRAS = [
  { id: 'a', ratio: 0.8 },
  { id: 'b', ratio: 1.4 },
  { id: 'c', ratio: 1 },
  { id: 'd', ratio: 1.2 },
] as const

type Estado =
  | { fase: 'grilla' }
  | { fase: 'creciendo'; from: Rect; to: Rect; ratio: number }
  | { fase: 'perfil'; to: Rect; ratio: number }

export function SharedGrowLab() {
  const theme = useTheme()
  const { reduceMotion } = useMotion()
  const { width } = useWindowDimensions()

  const [estado, setEstado] = useState<Estado>({ fase: 'grilla' })
  const [durationMs, setDurationMs] = useState<number>(duration.standard)
  const [medido, setMedido] = useState<string | null>(null)

  const raiz = useRef<View | null>(null)
  const obras = useRef<Record<string, View | null>>({})

  function abrir(id: string, ratio: number) {
    const vista = obras.current[id]
    const contenedor = raiz.current
    if (vista == null || contenedor == null) return

    contenedor.measureInWindow((escenarioX, escenarioY) => {
      vista.measureInWindow((x, y, w, h) => {
        // Todo al espacio del escenario. En producción esta resta no existe:
        // el padre del overlay ya está en el origen de la ventana.
        const origen: Rect = {
          x: x - escenarioX,
          y: y - escenarioY,
          width: w,
          height: h,
        }
        const destino = heroRect({
          screenWidth: width,
          insetTop: 0,
          aspectRatio: ratio,
          gutter: SCREEN_GUTTER,
          topSpacing: spacing.md,
        })

        setMedido(`${rect(origen)}  →  ${rect(destino)}`)

        // Las mismas dos preguntas que hace producción: ¿el origen sirve? ¿y
        // vale la pena moverse? Si alguna da que no, se entra sin animación,
        // que es honesto — no una animación desde un lugar inventado.
        if (!isUsableRect(origen) || !isWorthAnimating(origen, destino)) {
          setEstado({ fase: 'perfil', to: destino, ratio })
          return
        }

        setEstado({ fase: 'creciendo', from: origen, to: destino, ratio })
      })
    })
  }

  const enPerfil = estado.fase === 'perfil' || estado.fase === 'creciendo'

  return (
    <Box gap="md" padding="md">
      <Text role="body" color="textSecondary">
        Tocá una obra. La copia crece desde donde estaba hasta donde va el hero
        del perfil. El destino no se mide: se calcula con las mismas constantes
        que usa ProfileScreen, porque el perfil llega por red y el hero no
        existe durante los primeros fotogramas.
      </Text>

      {reduceMotion ? (
        <Text role="micro" color="stateWarning">
          Movimiento reducido activo: la obra aparece en su lugar final, sin
          recorrido. Es lo correcto, no una degradación.
        </Text>
      ) : null}

      <Box direction="row" gap="xxs" wrap>
        {[duration.quick, duration.standard, duration.reveal].map((valor) => (
          <Button
            key={valor}
            label={`${String(valor)} ms`}
            variant={durationMs === valor ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => setDurationMs(valor)}
          />
        ))}
      </Box>

      {/* El escenario. Alto fijo y `position: relative` implícito: es el
          espacio de coordenadas contra el que se dibujan la copia y el hero. */}
      <View
        ref={raiz}
        style={{ height: ALTO_ESCENARIO, overflow: 'hidden' }}
        testID="lab-escenario"
      >
        {enPerfil ? (
          // El hero de juguete, en el rectángulo exacto que calcula heroRect.
          // Invisible mientras la copia viaja: si los dos se vieran a la vez,
          // la transición mostraría el truco.
          <View
            style={{
              position: 'absolute',
              left: estado.to.x,
              top: estado.to.y,
              width: estado.to.width,
              height: estado.to.height,
              borderRadius: radius.lg,
              backgroundColor: theme.surfaceRaised,
              opacity: estado.fase === 'creciendo' ? 0 : 1,
            }}
            testID="lab-hero"
          />
        ) : (
          <Box direction="row" gap="xxs">
            {[0, 1].map((columna) => (
              <Box key={columna} flex={1} gap="xxs">
                {OBRAS.filter((_, index) => index % 2 === columna).map(
                  (obra) => (
                    <Pressable
                      key={obra.id}
                      ref={(vista) => {
                        obras.current[obra.id] = vista
                      }}
                      onPress={() => abrir(obra.id, obra.ratio)}
                      accessibilityLabel={`Abrir la obra ${obra.id}`}
                      style={{
                        aspectRatio: obra.ratio,
                        borderRadius: radius.md,
                        backgroundColor: theme.surfaceRaised,
                      }}
                      testID={`lab-obra-${obra.id}`}
                    />
                  ),
                )}
              </Box>
            ))}
          </Box>
        )}

        {estado.fase === 'creciendo' ? (
          <GrowingArtwork
            from={estado.from}
            to={estado.to}
            source={BLOQUE}
            blurhash={null}
            durationMs={durationMs}
            onArrived={() =>
              setEstado({ fase: 'perfil', to: estado.to, ratio: estado.ratio })
            }
            testID="lab-growing"
          />
        ) : null}
      </View>

      {enPerfil ? (
        <Button
          label="Volver a la grilla"
          variant="secondary"
          onPress={() => setEstado({ fase: 'grilla' })}
        />
      ) : null}

      {medido != null ? (
        <Text role="micro" color="textTertiary">
          {medido}
        </Text>
      ) : null}
    </Box>
  )
}

function rect(value: Rect): string {
  const n = (number: number) => String(Math.round(number))
  return `${n(value.x)},${n(value.y)} ${n(value.width)}×${n(value.height)}`
}
