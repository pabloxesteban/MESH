# MESH — Design system

**Estado:** Propuesto · **Responsable:** design-system-engineer
**Ubicación:** `apps/mobile/src/design-system/`

---

## 1. Reglas

1. **Ningún valor crudo en pantallas ni features.** Ni colores hex, ni
   espaciados numéricos, ni tamaños de fuente, ni duraciones, ni curvas de
   easing. Importá un token. Impuesto por una regla de ESLint, no por revisión.
2. **Los tokens son semánticos, no literales.** Los componentes consumen
   `text-secondary`, nunca `ink-500`. La escala literal existe únicamente dentro
   de la definición del tema.
3. **Todo componente interactivo viene con:** una etiqueta de accesibilidad o
   una prop `accessibilityLabel`, un área táctil de ≥44×44pt, un estado
   deshabilitado, un estado presionado, y un estado de carga si puede disparar
   trabajo.
4. **Todo componente de datos viene con:** variantes de carga (skeleton), vacío
   y error. Un componente que solo sabe renderizar el éxito no está terminado.
5. **Un componente se gana su lugar cuando se usa dos veces**, o cuando codifica
   una regla que no se debe volver a decidir (contraste, tamaño de área táctil,
   movimiento). Si no, se queda local a su feature.

## 2. Estructura de tokens

```
design-system/
  tokens/
    palette.ts      escalas literales — el único archivo con valores hex
    theme.ts        tokens semánticos, oscuro + claro
    typography.ts   familias, escala, roles
    spacing.ts      4 8 12 16 24 32 48 64
    radius.ts       4 12 20 999
    motion.ts       duraciones, resortes, variantes de reducción de movimiento
    haptics.ts      intenciones hápticas con nombre
    elevation.ts    recetas de superficie + borde de un píxel
  primitives/       Text, Box, Pressable, Icon, Image
  components/       el catálogo de abajo
  providers/        ThemeProvider, MotionProvider (consciente de reducción de movimiento)
```

`ThemeProvider` resuelve oscuro/claro desde el sistema con una anulación del
usuario. `MotionProvider` lee una sola vez el ajuste de reducción de movimiento
del sistema operativo y lo expone; cada componente animado se lo pregunta a él en
lugar de chequearlo por su cuenta.

## 3. Catálogo de componentes (V1)

**Primitivos** — `Text` (prop de rol, nunca un tamaño crudo), `Box`, `Pressable`
(maneja la expansión del área táctil, el estado presionado y la intención
háptica), `Icon`, `Image` (envuelve `expo-image` con blurhash, dimensionado y
defaults de reciclado).

**Controles** — `Button` (variantes: primary, secondary, ghost, destructive;
tamaños: sm, md, lg; estados: normal, presionado, deshabilitado, cargando) ·
`IconButton` · `FilterChip` · `Tag` · `Input` (etiqueta, ayuda, error, contador
de caracteres) · `Stepper`.

**Contenido** — `ArtworkCard` (la tarjeta del mazo) · `ProfessionalCard` ·
`MatchCard` (profesional + banda + hasta 3 razones) · `MatchBadge` (banda, nunca
un número pelado) · `Avatar` · `PortfolioGrid` · `StyleMeter` (la barra de
gusto) · `PriceRange` · `AvailabilityPill` (no renderiza nada cuando la
disponibilidad está vieja — la regla de frescura vive en el componente para que
no se pueda olvidar).

**Superficies** — `BottomSheet` · `Modal` · `Scrim`.

**Estados** — `Skeleton` · `EmptyState` (espacio para ilustración, mensaje,
acción) · `ErrorState` (mensaje mapeado a la causa + reintentar) · `Toast` ·
`ProgressIndicator` (el progreso honesto del onboarding: sin conteos, sin "¡ya
casi!").

**Estructura** — `ScreenHeader` · `TabBarIcon` · `SectionHeader` · `Divider`.

Deliberadamente ausentes: `Card` (demasiado genérico — hay tres tarjetas
específicas en su lugar), `Badge` (solo las bandas de match necesitan una),
`Carousel`, `Accordion`, `Tooltip`. Ninguno hace falta y cada uno atraería mal
uso.

## 4. El mazo (`ArtworkCard` + `Deck`)

El componente de mayor riesgo. Requisitos:

- Como mucho 3 tarjetas montadas. La de atrás con `scale 0.96` y 8pt de
  desplazamiento — un indicio de profundidad, no una pila 3D.
- El gesto corre enteramente en el hilo de UI (worklets de Reanimated +
  `react-native-gesture-handler`). Nunca estado de React por frame.
- El umbral de descarte es **sensible a la velocidad**: un envión rápido más
  allá del 25% del ancho descarta; un arrastre lento necesita 45%. Un arrastre
  lento que se detiene vuelve por resorte.
- La rotación es sutil — máximo 6° a desplazamiento completo, con pivote debajo
  de la tarjeta para que gire con naturalidad.
- Los indicadores de dirección son tipográficos y neutros, y aparecen a ~15% de
  desplazamiento — una palabra, no un tilde verde y una cruz roja.
- El háptico se dispara en el punto de compromiso, no al soltar.
- `recyclingKey={portfolioItemId}` para que `expo-image` recicle en vez de
  remontar.
- Precargar las 3 imágenes siguientes en `md` cuando el mazo avanza.

**Camino accesible (igual, no alternativo):** los botones Me gusta / Paso /
Guardar / Deshacer están debajo de la tarjeta a ≥44pt, siempre visibles.
`accessibilityActions` sobre la tarjeta expone las mismas operaciones a los
lectores de pantalla. Todo flujo E2E se corre una vez usando solo botones (ver
[estrategia de testing](../testing/test-strategy.md) §6.4).

## 5. Línea base de accesibilidad

- Contraste: 4,5:1 para texto de cuerpo, 3:1 para texto grande e íconos
  significativos. Verificado por par de tokens en un test, no juzgado a ojo.
- Áreas táctiles: mínimo 44×44pt, expandidas con `hitSlop` cuando el elemento
  visual es más chico.
- Tipografía dinámica respetada hasta el tamaño accesible más grande. El texto
  puede envolver; nunca puede recortarse. Los layouts de tarjeta usan flujo, no
  alturas fijas.
- Reducción de movimiento respetada globalmente vía `MotionProvider`.
- Orden del lector de pantalla por tarjeta: obra → artista → estilos → acciones.
- El color nunca es el único portador de significado. Las bandas de match llevan
  una palabra.
- El foco se maneja al entrar a una pantalla o a un modal.

## 6. Temas

El oscuro es el predeterminado. Los dos temas están completos, y ningún
componente puede asumir un tema — un diseño que solo funciona en oscuro no está
terminado. La revisión se hace en ambos.

## 7. Agregar un componente

1. ¿Se usa dos veces, o codifica una regla? Si no es ninguna de las dos, dejalo
   local.
2. Construilo con tokens; no agregues ningún token nuevo sin aprobación de
   design-system-engineer.
3. Entregá las variantes de carga / vacío / error si renderiza datos remotos.
4. Entregá etiqueta de accesibilidad, área táctil, y estados deshabilitado y
   presionado si es interactivo.
5. Agregalo a este catálogo en el mismo commit.
6. Agregá un test de componente para los estados.

## 8. Anti-patrones

- Pasar anulaciones de `style` desde una pantalla a un componente del design
  system para "ajustarlo un poquito". Agregá una variante o no lo hagas.
- Hardcodear una duración de animación porque "quedaba mejor" — poné el valor en
  `motion.ts` con un nombre.
- Verde/rojo para me gusta/paso.
- Sombras para crear jerarquía — usá valor de superficie y bordes de un píxel.
- Acciones principales solo con ícono.
- Skeletons que no coinciden con la forma del contenido que reemplazan.
- Un componente que renderiza `null` ante un error en vez de un `ErrorState`.
