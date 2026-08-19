/**
 * DIRECCIÓN C — SPATIAL APPLE.
 *
 * Los principios espaciales de iOS reinterpretados con la identidad de MESH,
 * que es la parte difícil: aplicarlos tal cual da una app que se ve como iOS,
 * no como MESH.
 *
 * Lo que se toma: **navegación flotante** (una píldora que sobrevuela el
 * contenido en vez de una barra que le come 56pt), **capas** (el contenido
 * corre por debajo de los controles), **hojas contextuales** (más información
 * sobre lo que ya estás mirando, sin cambiar de pantalla) y **continuidad
 * espacial** (lo que tocás crece desde donde estaba).
 *
 * Lo que NO se toma: el material translúcido en todos lados. El brief lo dice
 * y coincide con lo que ya está escrito en `visual-language.md` — sobre una
 * superficie oscura cálida, el vidrio esmerilado se lee como suciedad. Acá la
 * translucidez aparece **una sola vez**, en la navegación, y en ningún otro
 * lugar.
 *
 * **La apuesta:** que devolverle a la obra los 56pt de la barra de pestañas
 * cambie de verdad la sensación de la app.
 *
 * **El riesgo:** una píldora flotante tapa contenido. Es menos superficie que
 * una barra, pero está *encima* en vez de al lado, y en una app cuyo contenido
 * es imagen eso puede ser peor. Y hay un riesgo de accesibilidad concreto: sin
 * fondo opaco, el contraste del texto de la píldora depende de lo que pase por
 * detrás. Acá se resuelve con un relleno casi opaco, no con vidrio de verdad.
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

import {
  ArtworkSlot,
  DirectionCanvas,
  Vignette,
  percentWidth,
} from './parts.tsx'
import { ARTISTA, GUSTO, MOTIVOS, PROYECTO_OPCIONES } from './fixtures.ts'

export function SpatialApple() {
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
 * Descubrir: el contenido corre por debajo de la navegación.
 *
 * La obra llega hasta abajo de todo; la píldora flota encima con un margen.
 * Lo que se está probando no es si queda linda, es si tapa algo que importa —
 * por eso la obra de abajo tiene contenido justo donde cae la píldora.
 */
function Descubrir() {
  return (
    <Vignette
      surface="DESCUBRIR"
      probe="La píldora flotante devuelve 56pt de imagen. ¿Los devuelve, o solo los tapa desde arriba?"
    >
      <View>
        <Box direction="row" gap="xxs" paddingX="xxs">
          <Box flex={1} gap="xxs">
            <ArtworkSlot styleSlug="fine-line" ratio={1.3} radius="md" />
            <ArtworkSlot styleSlug="dotwork" ratio={0.9} radius="md" />
          </Box>
          <Box flex={1} gap="xxs">
            <ArtworkSlot styleSlug="blackwork" ratio={0.9} radius="md" />
            <ArtworkSlot
              styleSlug="japanese"
              ratio={1.3}
              radius="md"
              overlay={
                <Box paddingX="xs" paddingY="xs">
                  <Text role="micro">NOMBRE INVENTADO</Text>
                </Box>
              }
            />
          </Box>
        </Box>

        {/* La píldora, superpuesta sobre el borde inferior del contenido. */}
        <View
          style={{
            marginTop: -(MIN_TOUCH_TARGET + spacing.sm),
            paddingHorizontal: spacing.xl,
          }}
        >
          <FloatingNav />
        </View>
      </View>
    </Vignette>
  )
}

/**
 * Perfil: hoja contextual sobre la obra.
 *
 * La obra queda arriba, a tamaño completo, y la información sube desde abajo
 * en una hoja que no la tapa del todo. Es el patrón de Airbnb —el detalle
 * llega sin sacarte de donde estabas— con la diferencia de que acá lo que
 * queda visible arriba es una obra, no un mapa.
 */
function Perfil() {
  const theme = useTheme()

  return (
    <Vignette
      surface="PERFIL DE ARTISTA"
      probe="¿La hoja da más contexto sin robarle la pantalla a la obra?"
    >
      <View>
        <ArtworkSlot styleSlug="fine-line" ratio={0.72} radius="none" />

        <View
          style={{
            marginTop: -spacing.lg,
            backgroundColor: theme.surfaceRaised,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            borderTopWidth: HAIRLINE,
            borderColor: theme.borderSubtle,
            paddingTop: spacing.xs,
          }}
        >
          {/* El tirador: dice "esto se arrastra" sin escribirlo. */}
          <View style={{ alignItems: 'center', paddingBottom: spacing.sm }}>
            <View
              style={{
                width: spacing.xl,
                height: spacing.xxs,
                borderRadius: radius.full,
                backgroundColor: theme.borderStrong,
              }}
            />
          </View>

          <Box paddingX="md" paddingBottom="md" gap="sm">
            <Box direction="row" justify="space-between" align="center">
              <Box gap="xxs">
                <Text role="title">{ARTISTA.nombre}</Text>
                <Text role="micro" color="textSecondary">
                  {ARTISTA.barrio.toUpperCase()} · A 2,4 KM
                </Text>
              </Box>
              <Text role="micro" color="textSecondary">
                ENCAJE FUERTE
              </Text>
            </Box>

            <Box direction="row" gap="xxs" wrap>
              {ARTISTA.estilos.map((slug) => (
                <Pill key={slug} slug={slug} />
              ))}
            </Box>

            <Text role="body" color="textSecondary">
              Marcaste {String(ARTISTA.marcadas)} trabajos suyos.
            </Text>
          </Box>

          {/* La acción persistente: se queda mientras la hoja se arrastra. */}
          <Box paddingX="md" paddingBottom="md">
            <SolidAction label="Escribirle" />
          </Box>
        </View>
      </View>
    </Vignette>
  )
}

/**
 * Gusto: capas, no barras.
 *
 * Cada estilo es una banda cuyo ancho es el puntaje, apiladas con superposición
 * — la metáfora es de profundidad, no de ranking. El sustento va escrito al
 * lado, siempre.
 */
function Gusto() {
  const theme = useTheme()

  return (
    <Vignette
      surface="GUSTO"
      probe="¿Una pila con profundidad comunica mejor que barras, o solo se ve más sofisticada?"
    >
      <Box paddingX="md" gap="md">
        <Text role="titleLg">Tu gusto</Text>

        <View>
          {GUSTO.map((entrada, indice) => {
            const color = styleColor(entrada.styleSlug, theme)
            return (
              <View
                key={entrada.styleSlug}
                style={{
                  width: percentWidth(entrada.score),
                  backgroundColor: color.vivid,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  marginTop: indice === 0 ? 0 : -spacing.xs,
                  borderWidth: HAIRLINE,
                  borderColor: theme.surface,
                }}
              >
                <Text role="label" tint={color.onVivid}>
                  {entrada.label}
                </Text>
                <Text role="micro" tint={color.onVivid}>
                  {String(entrada.support)} DECISIONES
                </Text>
              </View>
            )
          })}
        </View>

        <Text role="body" color="textSecondary">
          Trazo limpio y formas contenidas.
        </Text>
      </Box>
    </Vignette>
  )
}

/**
 * Match: la obra crece y la razón sube.
 *
 * El encaje no es una pantalla nueva: es la misma obra con una hoja encima.
 * Esa es la continuidad espacial que se está probando — "entré al mundo de
 * esta persona", no "abrí otra pantalla".
 */
function Match() {
  const theme = useTheme()

  return (
    <Vignette
      surface="MATCH"
      probe="¿El encaje puede aparecer sobre la obra que lo causó, sin cambiar de pantalla?"
    >
      <View>
        <ArtworkSlot styleSlug="minimalist" ratio={0.8} radius="none" />
        <View
          style={{
            marginTop: -spacing.xxl,
            marginHorizontal: spacing.sm,
            backgroundColor: theme.surfaceRaised,
            borderRadius: radius.lg,
            borderWidth: HAIRLINE,
            borderColor: theme.borderSubtle,
            padding: spacing.md,
          }}
        >
          <Box gap="sm">
            <Text role="title">{ARTISTA.nombre}</Text>
            <Box gap="xxs">
              {MOTIVOS.map((motivo) => (
                <Text key={motivo} role="body" color="textSecondary">
                  {motivo}
                </Text>
              ))}
            </Box>
            <SolidAction label="Conocerla" />
          </Box>
        </View>
      </View>
    </Vignette>
  )
}

/** Proyecto: elección en hoja, sin salir del contexto. */
function Proyecto() {
  const theme = useTheme()

  return (
    <Vignette
      surface="PROYECTO"
      probe="¿Armar un proyecto puede pasar en una hoja, sobre lo que ya estabas mirando?"
    >
      <View>
        <Box direction="row" gap="xxs" paddingX="xxs">
          <ArtworkSlot styleSlug="fine-line" ratio={0.7} radius="md" />
          <ArtworkSlot styleSlug="dotwork" ratio={0.7} radius="md" />
        </Box>

        <View
          style={{
            marginTop: -spacing.lg,
            backgroundColor: theme.surfaceRaised,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <Text role="title">¿Qué tenés en la cabeza?</Text>
          <Box direction="row" gap="xs" wrap>
            {PROYECTO_OPCIONES.map((opcion) => (
              <View
                key={opcion}
                style={{
                  borderWidth: HAIRLINE,
                  borderColor: theme.borderStrong,
                  borderRadius: radius.full,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  minHeight: MIN_TOUCH_TARGET,
                  justifyContent: 'center',
                }}
              >
                <Text role="label">{opcion}</Text>
              </View>
            ))}
          </Box>
        </View>
      </View>
    </Vignette>
  )
}

// --- piezas de esta dirección -------------------------------------------------

/**
 * La navegación flotante.
 *
 * Casi opaca a propósito. Un vidrio de verdad deja el contraste del texto a
 * merced de la obra que pase por detrás, y eso no se puede verificar con un
 * test — así que no se usa. El efecto de "flota" lo dan el radio, el margen y
 * el borde de un píxel, no la transparencia.
 */
function FloatingNav() {
  const theme = useTheme()
  const items = ['Descubrir', 'Guardados', 'Vos']

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.surfaceRaised,
        borderRadius: radius.full,
        borderWidth: HAIRLINE,
        borderColor: theme.borderSubtle,
        padding: spacing.xxs,
        minHeight: MIN_TOUCH_TARGET,
        alignItems: 'center',
      }}
    >
      {items.map((item, indice) => (
        <View
          key={item}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: MIN_TOUCH_TARGET - spacing.xs,
            borderRadius: radius.full,
            backgroundColor: indice === 0 ? theme.surface : 'transparent',
          }}
        >
          <Text
            role="micro"
            color={indice === 0 ? 'textPrimary' : 'textTertiary'}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  )
}

function Pill({ slug }: { slug: string }) {
  const theme = useTheme()
  const color = styleColor(slug, theme)
  return (
    <View
      style={{
        borderRadius: radius.full,
        borderWidth: HAIRLINE,
        borderColor: color.text,
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.xs,
      }}
    >
      <Text role="micro" tint={color.text}>
        {slug.replace('-', ' ').toUpperCase()}
      </Text>
    </View>
  )
}

function SolidAction({ label }: { label: string }) {
  const theme = useTheme()
  return (
    <View
      style={{
        backgroundColor: theme.accentFill,
        borderRadius: radius.full,
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
