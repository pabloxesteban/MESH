/**
 * DIRECCIÓN D — CREATIVE MINIMAL.
 *
 * La única de las cuatro que apuesta a **densidad**. Masonry apretado, tipo
 * chica, y todo el color reservado para un solo lugar por pantalla.
 *
 * **La apuesta, y es la más incómoda:** que descubrir bien no es contemplar
 * una obra por vez sino **comparar muchas rápido**. Es lo que Airbnb hace de
 * verdad —una pantalla de Airbnb muestra varios alojamientos, no uno— y lo que
 * Pinterest hace mejor que nadie. Si el brief dice que MESH está más cerca de
 * Airbnb que de Tinder, esta dirección es la que se toma esa frase en serio.
 *
 * **El riesgo:** que se vea como Pinterest, que es exactamente lo que el brief
 * prohíbe. La defensa acá es tipográfica y cromática, no estructural — la
 * grilla se parece, pero la serif editorial, el fondo casi negro y la ausencia
 * total de cromo flotante no. Si al mirarla igual se lee como Pinterest, la
 * dirección falla y hay que decirlo.
 *
 * El segundo riesgo es de identidad: "denso y contenido" es también la
 * descripción de Linear, y Linear es una herramienta, no una galería.
 */

import { View } from 'react-native'

import {
  Box,
  HAIRLINE,
  MIN_TOUCH_TARGET,
  Text,
  radius,
  spacing,
  styleColor,
  useTheme,
} from '@/design-system/index.ts'

import { ArtworkSlot, DirectionCanvas, Vignette } from './parts.tsx'
import {
  ARTISTA,
  GUSTO,
  MOTIVOS,
  OBRAS,
  PROYECTO_OPCIONES,
} from './fixtures.ts'

export function CreativeMinimal() {
  return (
    <DirectionCanvas>
      <Descubrir />
      <Perfil />
      <Gusto />
      <Match />
      <Proyecto />
    </DirectionCanvas>
  )
}

/**
 * Descubrir: masonry de dos columnas, sin pie en cada obra.
 *
 * El nombre del artista NO va debajo de cada trabajo. Es la decisión más
 * discutible de esta dirección y es a propósito: con un pie por obra la grilla
 * pasa a ser una lista de gente, y lo que se está probando es descubrir por el
 * trabajo. El nombre aparece al tocar.
 *
 * Arriba, una fila de filtros que se desplaza — la única concesión a "sé lo
 * que busco" dentro de la superficie de "mostrame".
 */
function Descubrir() {
  const izquierda = OBRAS.filter((_, indice) => indice % 2 === 0)
  const derecha = OBRAS.filter((_, indice) => indice % 2 === 1)

  return (
    <Vignette
      surface="DESCUBRIR"
      probe="Ocho obras en una pantalla: ¿comparar rápido gana más de lo que pierde la contemplación? ¿Y se ve como Pinterest?"
    >
      <View>
        <Box direction="row" gap="xxs" paddingX="md" paddingBottom="xs" wrap>
          {['Todo', 'Línea fina', 'Blackwork', 'Cerca'].map((f, indice) => (
            <Filter key={f} label={f} activo={indice === 0} />
          ))}
        </Box>

        <Box direction="row" gap="xxs" paddingX="xxs">
          <Box flex={1} gap="xxs">
            {izquierda.map((obra) => (
              <ArtworkSlot
                key={obra.id}
                styleSlug={obra.styleSlug}
                ratio={obra.ratio}
                radius="sm"
              />
            ))}
          </Box>
          <Box flex={1} gap="xxs">
            {derecha.map((obra) => (
              <ArtworkSlot
                key={obra.id}
                styleSlug={obra.styleSlug}
                ratio={obra.ratio}
                radius="sm"
              />
            ))}
          </Box>
        </Box>
      </View>
    </Vignette>
  )
}

/**
 * Perfil: cabecera compacta, portafolio inmediato.
 *
 * Todo lo que hay que saber de la persona entra en cuatro líneas, y a partir
 * del quinto píxel hay obra. Es lo contrario de la dirección B, que se toma
 * media pantalla para presentar.
 */
function Perfil() {
  const theme = useTheme()

  return (
    <Vignette
      surface="PERFIL DE ARTISTA"
      probe="¿Cuatro líneas alcanzan para confiar en alguien, si abajo hay obra suficiente?"
    >
      <View>
        <Box paddingX="md" paddingBottom="sm" gap="xxs">
          <Box direction="row" justify="space-between" align="center">
            <Text role="title">{ARTISTA.nombre}</Text>
            <Text role="micro" color="textTertiary">
              ENCAJE FUERTE
            </Text>
          </Box>
          <Text role="micro" color="textSecondary">
            {ARTISTA.barrio.toUpperCase()} · 2,4 KM · TOMANDO CITAS
          </Text>
          <Box direction="row" gap="xxs" wrap>
            {ARTISTA.estilos.map((slug) => {
              const color = styleColor(slug, theme)
              return (
                <Text key={slug} role="micro" tint={color.text}>
                  {slug.replace('-', ' ').toUpperCase()}
                </Text>
              )
            })}
          </Box>
          <Text role="body" color="textSecondary">
            Marcaste {String(ARTISTA.marcadas)} trabajos suyos de línea fina.
          </Text>
        </Box>

        <Box direction="row" gap="xxs" paddingX="xxs">
          <Box flex={1} gap="xxs">
            <ArtworkSlot styleSlug="fine-line" ratio={1.2} radius="sm" />
            <ArtworkSlot styleSlug="dotwork" ratio={0.85} radius="sm" />
          </Box>
          <Box flex={1} gap="xxs">
            <ArtworkSlot styleSlug="minimalist" ratio={0.85} radius="sm" />
            <ArtworkSlot styleSlug="fine-line" ratio={1.2} radius="sm" />
          </Box>
        </Box>

        {/* La acción se queda abajo mientras el portafolio corre. Es el CTA
            persistente de Airbnb, sin su barra blanca. */}
        <Box paddingX="md" paddingTop="sm">
          <StickyAction label="Escribirle" />
        </Box>
      </View>
    </Vignette>
  )
}

/**
 * Gusto: una tabla, no una visualización.
 *
 * Tres filas: estilo, sustento, puntaje. Es la versión menos vistosa de las
 * cuatro y la más difícil de discutir — cada número tiene al lado de dónde
 * salió. Si algo así comunica igual que una constelación, la constelación
 * sobra.
 */
function Gusto() {
  const theme = useTheme()

  return (
    <Vignette
      surface="GUSTO"
      probe="Una tabla honesta contra una visualización linda: ¿cuál explica mejor?"
    >
      <Box paddingX="md" gap="sm">
        <Text role="title">Tu gusto</Text>

        <View>
          {GUSTO.map((entrada) => {
            const color = styleColor(entrada.styleSlug, theme)
            return (
              <View
                key={entrada.styleSlug}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderBottomWidth: HAIRLINE,
                  borderBottomColor: theme.borderSubtle,
                }}
              >
                <View
                  style={{
                    width: spacing.xs,
                    height: spacing.xs,
                    borderRadius: radius.full,
                    backgroundColor: color.vivid,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text role="body">{entrada.label}</Text>
                </View>
                <Text role="micro" color="textTertiary">
                  {String(entrada.support)} DECISIONES
                </Text>
              </View>
            )
          })}
        </View>

        <Text role="body" color="textSecondary">
          Trazo limpio, formas orgánicas, composiciones contenidas.
        </Text>
      </Box>
    </Vignette>
  )
}

/**
 * Match: una fila, como cualquier otra fila.
 *
 * Sin revelación, sin pantalla propia, sin animación. Un encaje es un
 * resultado y se lee como un resultado. La apuesta es que eso genera más
 * confianza que una celebración.
 */
function Match() {
  const theme = useTheme()

  return (
    <Vignette
      surface="MATCH"
      probe="Sin revelación ni celebración: ¿un encaje leído como resultado se siente más confiable o más frío?"
    >
      <Box paddingX="md" gap="xs">
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            borderWidth: HAIRLINE,
            borderColor: theme.borderSubtle,
            borderRadius: radius.md,
            padding: spacing.xs,
          }}
        >
          <ArtworkSlot styleSlug="fine-line" ratio={1} radius="sm" width={72} />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text role="body">{ARTISTA.nombre}</Text>
            <Text role="micro" color="textTertiary">
              PALERMO · ENCAJE FUERTE
            </Text>
            {MOTIVOS.slice(0, 2).map((motivo) => (
              <Text key={motivo} role="micro" color="textSecondary">
                {motivo}
              </Text>
            ))}
          </View>
        </View>

        <Text role="micro" color="textTertiary">
          Y OTROS 4 QUE TRABAJAN ASÍ
        </Text>
      </Box>
    </Vignette>
  )
}

/**
 * Proyecto: los cuatro pasos a la vista.
 *
 * Lo contrario de la dirección A: en vez de una pregunta por pantalla, todo el
 * recorrido visible de entrada. Se sabe cuánto falta, que es la queja número
 * uno de cualquier formulario largo.
 */
function Proyecto() {
  const theme = useTheme()

  return (
    <Vignette
      surface="PROYECTO"
      probe="Ver los cuatro pasos de entrada: ¿tranquiliza o abruma?"
    >
      <Box paddingX="md" gap="sm">
        <Box direction="row" gap="xxs" align="center">
          {[0, 1, 2, 3].map((paso) => (
            <View
              key={paso}
              style={{
                flex: 1,
                height: spacing.xxs,
                borderRadius: radius.full,
                backgroundColor:
                  paso === 0 ? theme.accent : theme.surfaceRaised,
              }}
            />
          ))}
        </Box>

        <Text role="title">¿Qué tenés en la cabeza?</Text>

        <Box direction="row" gap="xs" wrap>
          {PROYECTO_OPCIONES.map((opcion) => (
            <Filter key={opcion} label={opcion} activo={false} />
          ))}
        </Box>

        <Text role="micro" color="textTertiary">
          DESPUÉS: ESTILO · REFERENCIAS · ZONA
        </Text>
      </Box>
    </Vignette>
  )
}

// --- piezas de esta dirección -------------------------------------------------

function Filter({ label, activo }: { label: string; activo: boolean }) {
  const theme = useTheme()
  return (
    <View
      style={{
        borderWidth: HAIRLINE,
        borderColor: activo ? theme.textPrimary : theme.borderSubtle,
        backgroundColor: activo ? theme.textPrimary : 'transparent',
        borderRadius: radius.full,
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.sm,
        minHeight: MIN_TOUCH_TARGET - spacing.md,
        justifyContent: 'center',
      }}
    >
      <Text role="micro" color={activo ? 'textInverse' : 'textSecondary'}>
        {label}
      </Text>
    </View>
  )
}

function StickyAction({ label }: { label: string }) {
  const theme = useTheme()
  return (
    <View
      style={{
        backgroundColor: theme.accentFill,
        borderRadius: radius.md,
        minHeight: MIN_TOUCH_TARGET,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text role="label" tint={theme.accentContrast}>
        {label}
      </Text>
    </View>
  )
}
