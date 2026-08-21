# MESH — Design system

**Estado:** Construido en la Fase 3 (2026-08-17), 120 tests · **Responsable:** design-system-engineer
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
  contrast.ts       WCAG puro, sin React — lo usa el test de contraste
  tokens/
    palette.ts      escalas literales — el único archivo con valores hex
    theme.ts        tokens semánticos, oscuro + claro
    typography.ts   familias, escala, roles
    layout.ts       espaciado 4 8 12 16 24 32 48 64 · radios 4 12 20 999 ·
                    área táctil mínima · grosor de borde
    motion.ts       duraciones, easings como puntos de Bézier, resortes
    haptics.ts      intenciones hápticas con nombre
  primitives/       Text, Box, Pressable
  components/       el catálogo de abajo
  providers/        ThemeProvider, MotionProvider
  test-utils.tsx    renderWithProviders, para correr cada test en los dos temas
```

Espaciado y radios viven juntos en `layout.ts` y no en dos archivos: son la
misma decisión (la grilla) y separarlos solo agregaba un import más. La
elevación tampoco tiene archivo propio — se expresa con `background` y `border`
en `Box`, porque no hay sombras que parametrizar.

**Los tokens de movimiento son datos puros, sin dependencias.** Los easings son
los cuatro puntos de control de una curva de Bézier, no objetos `Easing` de
Reanimated: importar Reanimated ahí arrastraba su stack nativo a cualquier
archivo que tocara un token, incluido el test de contraste, que no tiene nada
que ver con animaciones.

`ThemeProvider` resuelve oscuro/claro desde el sistema con una anulación del
usuario. `MotionProvider` lee una sola vez el ajuste de reducción de movimiento
del sistema operativo y lo expone; cada componente animado se lo pregunta a él en
lugar de chequearlo por su cuenta.

## 3. Catálogo de componentes (V1)

Marcados ✅ los construidos en la Fase 3; el resto llega en la fase que lo
necesita, porque un componente sin consumidor no se puede evaluar.

**Primitivos** — ✅ `Text` (prop de rol, **sin prop `fontSize`**), ✅ `Box`
(espaciados por token, sin números), ✅ `Pressable` (expansión del área táctil,
estado presionado, intención háptica) · `Icon` · `Image` (envuelve `expo-image`
con blurhash, dimensionado y defaults de reciclado — Fase 8).

**Controles** — ✅ `Button` (variantes: primary, secondary, ghost, destructive;
tamaños: sm, md, lg; estados: normal, presionado, deshabilitado, cargando) ·
✅ `FilterChip` · ✅ `Tag` · ✅ `Input` (etiqueta, ayuda, error, contador) ·
`IconButton` · `Stepper`.

**Contenido** — `ArtworkCard` (la tarjeta del mazo) · `ProfessionalCard` ·
`MatchCard` (profesional + banda + hasta 3 razones) · `MatchBadge` (banda, nunca
un número pelado) · ✅ `Avatar` (circular, **nunca inicial generada** — sin foto
dibuja una silueta genérica, es una regla de producto y no una preferencia
visual) · `PortfolioGrid` · ✅ `StaggeredGrid` (grilla escalonada de N columnas,
estática — comparte el reparto por altura de `ArtworkGrid` sin heredar su
respiración animada; ver §9) · ✅ `CollectionTile` (nombre, cantidad y mosaico de
hasta 4 portadas — variantes de carga y de colección vacía de portadas
incluidas) · ✅ `NoticeRow` (una línea + acción opcional + descartar, para avisos
puntuales apilables) · `StyleMeter` (la barra de gusto) · `PriceRange` ·
`AvailabilityPill` (no renderiza nada cuando la disponibilidad está vieja — la
regla de frescura vive en el componente para que no se pueda olvidar).

**Superficies** — `BottomSheet` · `Modal` · `Scrim`.

**Estados** — ✅ `Skeleton` (no pulsa con movimiento reducido; el alto acepta
número o porcentaje, para los casos donde el skeleton vive dentro de un
contenedor con `aspectRatio` propio) · ✅ `EmptyState` (la acción es una prop
**requerida**: un estado vacío sin salida es un callejón, y hacerlo un tipo
requerido es más fuerte que documentarlo) · ✅ `ErrorState` (causa de un
conjunto cerrado; `permission` y `notFound` dicen lo mismo para no filtrar
existencia) · ✅ `Toast` · `ProgressIndicator` (Fase 8).

**Estructura** — `ScreenHeader` · `TabBarIcon` · ✅ `SectionHeader`
(`accessibilityRole="header"` — la regla que resuelve es que un lector de
pantalla que navega por encabezados encuentre las secciones de una pantalla
larga como Configuración) · `Divider`.

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

## 9. `ArtworkGrid` y `StaggeredGrid`: mismo reparto, coreografía distinta

Explorar (`ArtworkGrid`, D-013) y una colección propia necesitan la misma
cuenta — repartir obras en columnas balanceadas por altura acumulada, no
alternando — pero **no la misma sensación**. D-013 fue explícito en que la
respiración vertical de Explorar (las columnas subiendo y bajando solas,
desfasadas) es de descubrimiento; una superficie de administración personal
como Guardados o una colección no la hereda — un movimiento perpetuo ahí
compite con lo que la persona vino a hacer, que es ordenar sus cosas.

Por eso **no es un componente con una prop `animated`**. Son dos:

- `balanceColumns(items, columns, weightOf)` — la cuenta pura, sin React,
  exportada por `StaggeredGrid.tsx`. `ArtworkGrid.splitIntoColumns` es hoy un
  envoltorio de una línea sobre esto, para que las dos grillas no puedan
  divergir en silencio sobre cómo se reparte.
- `StaggeredGrid` — el componente estático, N columnas (dos por defecto),
  sin reloj ni desfasaje. Lo usa la grilla de dos columnas dentro de una
  colección.
- `ArtworkGrid` sigue siendo dueña de su propia respiración: vive en
  `features/discovery/`, no en el design system, porque es coreografía
  específica de una pantalla y no una regla que otra superficie deba heredar.

Antes de esto, `ProfileScreen.tsx` y `SavedScreen.tsx` ya resolvían su propia
grilla de dos columnas a mano —con `columnWidth` calculado con
`useWindowDimensions` y `aspectRatio` fijo en 1, para evitar que la grilla
saltara mientras cargan las fotos—, duplicada entre las dos pantallas.
`StaggeredGrid` no las reemplazó en este pase: son consumidores candidatos,
no consumidores obligados, porque migrarlas de un recorte cuadrado fijo a la
relación de aspecto real de cada obra es una decisión de UX aparte, no una
consecuencia automática de tener el componente disponible.
