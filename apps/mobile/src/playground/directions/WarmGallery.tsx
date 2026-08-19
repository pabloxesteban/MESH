/**
 * DIRECCIÓN B — WARM GALLERY.
 *
 * La misma marca, invertida: papel hueso de fondo, tinta encima. La obra deja
 * de sangrar y pasa a estar **enmarcada**, con un passepartout de aire
 * alrededor y una ficha de sala debajo. La referencia declarada de
 * `visual-language.md` es "la ficha de sala de una galería"; esta dirección la
 * toma literal en vez de citarla.
 *
 * **La apuesta:** que el fondo claro haga que el trabajo se lea como obra y no
 * como contenido. Una pared de galería es blanca por una razón, y esa razón no
 * es estética.
 *
 * **El riesgo, y es grande:** el tema oscuro está elegido en `ThemeProvider`
 * con un argumento explícito — "es el marco correcto para la fotografía y es
 * lo que hace una galería". Esta dirección contradice esa decisión a propósito,
 * para poder discutirla con algo a la vista en lugar de en abstracto. El
 * segundo riesgo es de contraste: la paleta de familias de estilo tiene
 * valores distintos para claro y oscuro, y sobre papel los rellenos claros
 * pierden.
 *
 * Corre bajo `ThemeProvider initialPreference="light"` — sin eso no se estaría
 * evaluando esta dirección sino la anterior con otro layout.
 */

import { View } from 'react-native'

import {
  Box,
  HAIRLINE,
  Text,
  ThemeProvider,
  radius,
  spacing,
  styleColor,
  useTheme,
} from '@/design-system/index.ts'

import { ArtworkSlot, DirectionCanvas, Vignette } from './parts.tsx'
import { ARTISTA, GUSTO, MOTIVOS, PROYECTO_OPCIONES } from './fixtures.ts'

export function WarmGallery() {
  return (
    <ThemeProvider initialPreference="light">
      <DirectionCanvas>
        <Descubrir />
        <Perfil />
        <Gusto />
        <Match />
        <Proyecto />
      </DirectionCanvas>
    </ThemeProvider>
  )
}

/**
 * Descubrir: pared de galería.
 *
 * Dos columnas desparejas, cada obra con su ficha debajo. El aire entre obras
 * es más ancho que en cualquier grilla de producto — es lo que hace que dos
 * trabajos distintos no se lean como una sola mancha.
 */
function Descubrir() {
  return (
    <Vignette
      surface="DESCUBRIR"
      probe="Sobre papel, ¿la obra se lee como obra? ¿O el fondo claro se come el trabajo de trazo fino?"
    >
      <Box direction="row" gap="md" paddingX="md">
        <Box flex={1} gap="lg">
          <Framed slug="fine-line" ratio={1.3} pie="Línea fina · Palermo" />
          <Framed slug="dotwork" ratio={1} pie="Puntillismo · Chacarita" />
        </Box>
        <Box flex={1} gap="lg" paddingTop="xl">
          <Framed slug="blackwork" ratio={0.9} pie="Blackwork · Almagro" />
          <Framed slug="minimalist" ratio={1.2} pie="Minimalista · Villa Crespo" />
        </Box>
      </Box>
    </Vignette>
  )
}

/**
 * Perfil: catálogo de exposición.
 *
 * Nombre grande en serif arriba, obra debajo en grilla pareja, ficha técnica
 * al final. El orden es el inverso al de la dirección A a propósito: acá la
 * persona se presenta y después muestra; allá la obra atrae y la persona
 * aparece después.
 */
function Perfil() {
  const theme = useTheme()

  return (
    <Vignette
      surface="PERFIL DE ARTISTA"
      probe="¿Presentar a la persona ANTES de la obra ayuda a confiar, o pide confianza antes de darla?"
    >
      <Box paddingX="md" gap="md">
        <Box gap="xxs">
          <Text role="display">{ARTISTA.nombre}</Text>
          <Text role="micro" color="textSecondary">
            {ARTISTA.barrio.toUpperCase()} · LÍNEA FINA, MINIMALISTA, PUNTILLISMO
          </Text>
        </Box>

        <Box direction="row" gap="xs">
          <ArtworkSlot styleSlug="fine-line" ratio={1.2} radius="sm" />
          <ArtworkSlot styleSlug="minimalist" ratio={1.2} radius="sm" />
        </Box>

        {/* Ficha técnica: filas etiqueta/valor, como una cartela. Solo lo que
            el artista declaró — un campo vacío se omite, no se rellena con
            "consultar". */}
        <View
          style={{
            borderTopWidth: HAIRLINE,
            borderTopColor: theme.borderSubtle,
            paddingTop: spacing.sm,
          }}
        >
          <Ficha etiqueta="Técnica" valor="Aguja simple" />
          <Ficha etiqueta="Sesión" valor="Una, de 2 a 4 horas" />
          <Ficha etiqueta="Agenda" valor="Tomando citas" />
          <Ficha etiqueta="Por qué encaja" valor={`Marcaste ${String(ARTISTA.marcadas)} trabajos suyos de línea fina`} />
        </View>

        <QuietAction label="Escribirle" />
      </Box>
    </Vignette>
  )
}

/**
 * Gusto: cartela de sala.
 *
 * El gusto escrito como el texto de pared de una muestra: un párrafo que se
 * lee, y los estilos como un pie de foto. Sin barras — la apuesta es que una
 * frase bien escrita comunica más que tres porcentajes.
 */
function Gusto() {
  const theme = useTheme()

  return (
    <Vignette
      surface="GUSTO"
      probe="Sin barras ni porcentajes, ¿la persona entiende igual qué aprendió MESH?"
    >
      <Box paddingX="md" gap="md">
        <View
          style={{
            borderWidth: HAIRLINE,
            borderColor: theme.borderStrong,
            padding: spacing.md,
          }}
        >
          <Box gap="sm">
            <Text role="micro" color="textSecondary">
              TU GUSTO, SEGÚN 17 DECISIONES
            </Text>
            <Text role="title">
              Trazo limpio, formas orgánicas, composiciones contenidas.
            </Text>
            <Box direction="row" gap="xs" wrap>
              {GUSTO.map((entrada) => {
                const color = styleColor(entrada.styleSlug, theme)
                return (
                  <Text
                    key={entrada.styleSlug}
                    role="micro"
                    tint={color.text}
                  >
                    {entrada.label.toUpperCase()} · {String(entrada.support)}
                  </Text>
                )
              })}
            </Box>
          </Box>
        </View>
      </Box>
    </Vignette>
  )
}

/** Match: la obra enmarcada y las razones como cartela. */
function Match() {
  return (
    <Vignette
      surface="MATCH"
      probe="¿El encaje puede presentarse como una atribución de museo — obra, autor, procedencia?"
    >
      <Box paddingX="md" gap="md">
        <Framed slug="fine-line" ratio={0.9} pie={ARTISTA.nombre} />
        <Box gap="xxs">
          {MOTIVOS.map((motivo) => (
            <Text key={motivo} role="body" color="textSecondary">
              {motivo}
            </Text>
          ))}
        </Box>
        <QuietAction label="Ver su obra" />
      </Box>
    </Vignette>
  )
}

/** Proyecto: el formulario como página de catálogo. */
function Proyecto() {
  const theme = useTheme()

  return (
    <Vignette
      surface="PROYECTO"
      probe="¿Elegir sobre papel se siente más liviano que elegir sobre negro?"
    >
      <Box paddingX="md" gap="md">
        <Text role="titleLg">¿Qué tenés en la cabeza?</Text>
        <Box gap="xs">
          {PROYECTO_OPCIONES.map((opcion) => (
            <View
              key={opcion}
              style={{
                borderWidth: HAIRLINE,
                borderColor: theme.borderSubtle,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
              }}
            >
              <Text role="bodyLg">{opcion}</Text>
            </View>
          ))}
        </Box>
      </Box>
    </Vignette>
  )
}

// --- piezas de esta dirección -------------------------------------------------

/**
 * Obra enmarcada con su ficha.
 *
 * El pie va debajo y en chico, nunca encima de la obra: en una galería la
 * cartela está al costado, y taparla con el título es exactamente lo que una
 * galería no hace.
 */
function Framed({
  slug,
  ratio,
  pie,
}: {
  slug: string
  ratio: number
  pie: string
}) {
  return (
    <Box gap="xs">
      <ArtworkSlot styleSlug={slug} ratio={ratio} radius="none" />
      <Text role="micro" color="textSecondary" numberOfLines={2}>
        {pie}
      </Text>
    </Box>
  )
}

function Ficha({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const theme = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.xs,
        borderBottomWidth: HAIRLINE,
        borderBottomColor: theme.borderSubtle,
      }}
    >
      <View style={{ width: 96 }}>
        <Text role="micro" color="textTertiary">
          {etiqueta.toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text role="body">{valor}</Text>
      </View>
    </View>
  )
}

/** La acción, contorneada en vez de rellena: sobre papel, un bloque de color pesa. */
function QuietAction({ label }: { label: string }) {
  const theme = useTheme()
  return (
    <View
      style={{
        borderWidth: HAIRLINE,
        borderColor: theme.textPrimary,
        borderRadius: radius.sm,
        paddingVertical: spacing.sm,
        alignItems: 'center',
      }}
    >
      <Text role="label">{label}</Text>
    </View>
  )
}
