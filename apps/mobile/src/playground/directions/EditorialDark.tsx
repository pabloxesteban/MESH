/**
 * DIRECCIÓN A — EDITORIAL DARK.
 *
 * La evolución de lo que MESH ya es, llevada hasta el final en vez de
 * reemplazada. Fondo casi negro, obra a sangre, momentos serif grandes, y una
 * interfaz que se corre del camino hasta casi desaparecer.
 *
 * **La apuesta:** que el producto se distinga por lo que NO tiene. Sin
 * tarjetas flotando sobre tarjetas, sin sombras, sin cromo permanente. La obra
 * ocupa el ancho completo y el texto vive en los márgenes.
 *
 * **El riesgo, y hay que mirarlo de frente:** una pantalla de una obra por vez
 * es hermosa y es lenta. Airbnb no muestra un alojamiento por pantalla, y no
 * es por falta de gusto — es porque comparar es parte de decidir. Esta
 * dirección apuesta a que en MESH el descubrimiento es más contemplativo que
 * comparativo, y esa apuesta puede estar mal.
 *
 * Referencias de principio, no de estética: Cosmos (composición editorial,
 * aire), Are.na (interfaz callada, contenido primero).
 */

import { View } from 'react-native'

import {
  Box,
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
import {
  ARTISTA,
  GUSTO,
  MOTIVOS,
  OBRAS,
  PROYECTO_OPCIONES,
} from './fixtures.ts'

export function EditorialDark() {
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
 * Descubrir: una obra a sangre, y el ritmo editorial debajo.
 *
 * La primera obra ocupa todo el ancho sin margen ni radio — el borde de la
 * pantalla es el borde de la obra. Debajo entra el ritmo: dos obras chicas,
 * el artista, y sigue. Es scroll, no swipe: el gesto de deslizar se conserva
 * para el mazo, que es otra superficie.
 */
function Descubrir() {
  const theme = useTheme()

  return (
    <Vignette
      surface="DESCUBRIR"
      probe="¿Una obra a sangre por vez alcanza para descubrir, o obliga a scrollear demasiado para comparar?"
    >
      <View>
        <ArtworkSlot
          styleSlug={OBRAS[0]?.styleSlug ?? 'fine-line'}
          ratio={1.15}
          radius="none"
          overlay={
            // El texto va sobre la obra pero en el borde inferior, sobre un
            // velo de tinta — nunca sobre el centro, que es donde está el
            // trabajo. Ver visual-language: el velo tiñe, no colorea.
            <View
              style={{
                backgroundColor: theme.overlayScrim,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Text role="title" numberOfLines={1}>
                {ARTISTA.nombre}
              </Text>
              <Text role="micro" color="textSecondary">
                LÍNEA FINA · {ARTISTA.barrio.toUpperCase()}
              </Text>
            </View>
          }
        />

        <Box direction="row" gap="xxs" paddingY="xxs">
          <ArtworkSlot styleSlug="blackwork" ratio={1} radius="none" />
          <ArtworkSlot styleSlug="dotwork" ratio={1} radius="none" />
        </Box>

        {/* El único texto largo de la pantalla, y va en serif: es un momento
            de marca, no una etiqueta de interfaz. */}
        <Box paddingX="md" paddingY="md" gap="xxs">
          <Text role="titleLg">Línea fina en Buenos Aires</Text>
          <Text role="body" color="textSecondary">
            Nueve artistas trabajando el trazo mínimo, esta semana.
          </Text>
        </Box>

        <ArtworkSlot styleSlug="japanese" ratio={0.9} radius="none" />
      </View>
    </Vignette>
  )
}

/**
 * Perfil: la obra sigue siendo la protagonista, el nombre entra después.
 *
 * El orden es el de Airbnb —foto, persona, detalle, confianza, acción— pero
 * sin su densidad: acá cada bloque respira. La acción no flota sobre el
 * contenido: aparece al final, donde la decisión ya está tomada.
 */
function Perfil() {
  const theme = useTheme()

  return (
    <Vignette
      surface="PERFIL DE ARTISTA"
      probe="¿La obra puede abrir el perfil sin que el nombre se pierda?"
    >
      <View>
        <ArtworkSlot styleSlug="fine-line" ratio={0.85} radius="none" />

        <Box paddingX="md" paddingY="md" gap="sm">
          <Box gap="xxs">
            <Text role="display" numberOfLines={2}>
              {ARTISTA.nombre}
            </Text>
            <Text role="micro" color="textSecondary">
              {ARTISTA.barrio.toUpperCase()} · A 2,4 KM
            </Text>
          </Box>

          <Box direction="row" gap="xxs" wrap>
            {ARTISTA.estilos.map((slug) => (
              <StyleWord key={slug} slug={slug} />
            ))}
          </Box>

          <Text role="body" color="textSecondary">
            Trabaja con aguja simple. Toma citas de una sesión.
          </Text>

          {/* La razón del encaje va acá, no en un badge: es una frase, no un
              puntaje, y una frase necesita una línea entera. */}
          <View
            style={{
              borderLeftWidth: 2,
              borderLeftColor: theme.accent,
              paddingLeft: spacing.sm,
            }}
          >
            <Text role="body">
              Marcaste {String(ARTISTA.marcadas)} trabajos de línea fina.
            </Text>
          </View>
        </Box>

        <Box direction="row" gap="xxs" paddingBottom="xxs">
          <ArtworkSlot styleSlug="minimalist" ratio={1} radius="none" />
          <ArtworkSlot styleSlug="dotwork" ratio={1} radius="none" />
          <ArtworkSlot styleSlug="fine-line" ratio={1} radius="none" />
        </Box>

        <Box paddingX="md" paddingTop="sm">
          <FullWidthAction label="Escribirle" />
        </Box>
      </View>
    </Vignette>
  )
}

/**
 * Gusto: una frase antes que un gráfico.
 *
 * Lo primero que se lee es qué aprendió MESH, en castellano. Los números
 * vienen después y con su sustento al lado — un porcentaje sin "de cuántas
 * decisiones" es una afirmación sin respaldo.
 */
function Gusto() {
  const theme = useTheme()

  return (
    <Vignette
      surface="GUSTO"
      probe="¿Se entiende qué aprendió MESH sin leer un solo número?"
    >
      <Box paddingX="md" gap="md">
        <Text role="titleLg">
          Tu gusto se inclina a la línea limpia y a las formas contenidas.
        </Text>

        <Box gap="sm">
          {GUSTO.map((entrada) => {
            const color = styleColor(entrada.styleSlug, theme)
            return (
              <Box key={entrada.styleSlug} gap="xxs">
                <Box direction="row" justify="space-between" align="center">
                  <Text role="body">{entrada.label}</Text>
                  <Text role="micro" color="textTertiary">
                    {String(entrada.support)} DECISIONES
                  </Text>
                </Box>
                <View
                  style={{
                    height: spacing.xxs,
                    backgroundColor: theme.surfaceRaised,
                    borderRadius: radius.full,
                  }}
                >
                  <View
                    style={{
                      width: percentWidth(entrada.score),
                      height: '100%',
                      backgroundColor: color.vivid,
                      borderRadius: radius.full,
                    }}
                  />
                </View>
              </Box>
            )
          })}
        </Box>

        <Text role="body" color="textSecondary">
          Descubrí gente que trabaja así.
        </Text>
      </Box>
    </Vignette>
  )
}

/**
 * Match: sin revelación, sin celebración.
 *
 * La obra primero, la persona después, las razones abajo. Nada de "¡es un
 * match!" — MESH no festeja lo que hace la persona, y un encaje no es un
 * premio, es una respuesta.
 */
function Match() {
  return (
    <Vignette
      surface="MATCH"
      probe="¿Un encaje puede leerse como una respuesta y no como un premio?"
    >
      <View>
        <Box direction="row" gap="xxs">
          <ArtworkSlot styleSlug="fine-line" ratio={1.2} radius="none" />
          <ArtworkSlot styleSlug="minimalist" ratio={1.2} radius="none" />
        </Box>

        <Box paddingX="md" paddingY="md" gap="sm">
          <Box gap="xxs">
            <Text role="micro" color="textSecondary">
              ENCAJE FUERTE
            </Text>
            <Text role="titleLg">{ARTISTA.nombre}</Text>
          </Box>

          <Box gap="xxs">
            {MOTIVOS.map((motivo) => (
              <Text key={motivo} role="body" color="textSecondary">
                {motivo}
              </Text>
            ))}
          </Box>

          <FullWidthAction label="Ver su obra" />
        </Box>
      </View>
    </Vignette>
  )
}

/**
 * Proyecto: una pregunta por pantalla, en serif.
 *
 * No es un formulario con cinco campos: es una conversación de a un paso. La
 * pregunta va grande porque es lo único que hay que leer, y las opciones son
 * palabras, no íconos — "algo con historia" no tiene ícono honesto.
 */
function Proyecto() {
  return (
    <Vignette
      surface="PROYECTO"
      probe="¿Una pregunta por pantalla se siente conversación o se siente lento?"
    >
      <Box paddingX="md" gap="lg">
        <Text role="display">¿Qué tenés en la cabeza?</Text>

        <Box gap="xs">
          {PROYECTO_OPCIONES.map((opcion) => (
            <ChoiceRow key={opcion} label={opcion} />
          ))}
        </Box>
      </Box>
    </Vignette>
  )
}

// --- piezas de esta dirección -------------------------------------------------

/** El estilo como palabra en color, no como chip con borde. */
function StyleWord({ slug }: { slug: string }) {
  const theme = useTheme()
  const color = styleColor(slug, theme)
  return (
    <Text role="micro" tint={color.text}>
      {slug.replace('-', ' ').toUpperCase()}
    </Text>
  )
}

/** La acción, del ancho del contenido y con el acento de marca. */
function FullWidthAction({ label }: { label: string }) {
  const theme = useTheme()
  return (
    <View
      style={{
        backgroundColor: theme.accentFill,
        borderRadius: radius.md,
        paddingVertical: spacing.sm,
        alignItems: 'center',
      }}
    >
      <Text role="label" tint={theme.accentContrast}>
        {label}
      </Text>
    </View>
  )
}

/** Una opción del armador: una línea entera, sin caja. */
function ChoiceRow({ label }: { label: string }) {
  const theme = useTheme()
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: theme.borderSubtle,
        paddingVertical: spacing.sm,
      }}
    >
      <Text role="bodyLg">{label}</Text>
    </View>
  )
}
