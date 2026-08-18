# Patrones de interfaz móvil — hojas, transiciones, física

Investigado 2026-08-18. Cubre tres patrones concretos que aparecen en el pedido
de investigación continua: hojas inferiores, transiciones de elemento
compartido, y física de arrastre de tarjetas.

## Hoja inferior (bottom sheet)

**Qué es.** Un panel que sube desde abajo, elevado sobre el contenido
principal, con puntos de ajuste (*peek* / medio / completo) y un tirador para
arrastrar entre ellos.

**Por qué importa.** Preserva el contexto de la pantalla de atrás — a
diferencia de un modal de pantalla completa, la persona no pierde de vista
dónde estaba.

**Dónde se usa.** Es un componente estándar de las dos guías de plataforma: la
sección Sheets del HIG de Apple cubre configuraciones de "detent" desde iOS 16,
y Material Design las documenta como `sheets-bottom` con las mismas variantes
modal/no-modal. [Bottom Sheet UI Design — Mobbin](https://mobbin.com/glossary/bottom-sheet),
[Apple HIG — Sheets](https://www.nadcab.com/blog/apple-human-interface-guidelines-explained),
[Material Design — Sheets: bottom](https://m2.material.io/components/sheets-bottom/ios/).
Nivel 1.

**Fortalezas.** Un componente que la plataforma ya le enseñó al usuario;
soporta niveles de detalle progresivos (peek → medio → completo) sin abandonar
la pantalla.

**Debilidades.** Sin un tirador visible y un punto de ajuste inicial honesto,
es fácil que la persona no note que hay más contenido debajo del borde
visible. Necesita alternativa sin gesto para cerrar (botón, no solo deslizar
abajo).

**Aplicación a MESH.** Encaja para: detalle de un componente de estilo (qué
significa "fine-line"), la explicación de por qué matcheó un artista (ver
`docs/product/matching.md` §"por qué"), filtros. **No** para el flujo de
contacto ni para el proyecto — esos son pantallas completas porque implican
una decisión, no una consulta rápida.

**Riesgo para MESH.** Bajo. Es un componente de plataforma, no una firma
visual de otro producto.

**Recomendación.** Usar. Prototipo en playground: `BottomSheetLab`.
**Confianza.** Alta.

---

## Transición de elemento compartido

**Qué es.** La miniatura que se toca se transforma directamente en la imagen
de pantalla completa — mismo objeto visual, más fidelidad — en vez de que la
miniatura desaparezca y la imagen grande aparezca por separado.

**Por qué importa.** Comunica continuidad espacial: "esto es lo mismo que
tocaste, ahora más grande", no "cambiaste de pantalla".

**Dónde se usa.** Es un patrón nativo de las dos plataformas (Android lo tiene
desde `ActivityOptions.makeSceneTransitionAnimation`) y Expo Router lo soporta
en beta desde el SDK 55 sobre React Navigation, usando el Stack Navigator.
[Trying Out Shared Element Transitions in Expo SDK 55](https://medium.com/@kgkrool/trying-out-shared-element-transitions-in-expo-sdk-55-beta-dbff1b669053),
[React Native Reanimated — Shared Element Transitions](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/).
Nivel 1/2.

**Fortalezas.** Es la transición con mayor "sensación de mismo objeto" que
existe; no necesita explicación.

**Debilidades documentada explícitamente por la fuente:** en React Navigation
solo funciona con Stack Navigator, no con Tabs ni Drawer — importa para MESH
porque el perfil de artista se abre con `push` desde varios lugares (mazo,
matches), no desde una pestaña.

**Aplicación a MESH.** La pieza que se toca en el mazo → la misma pieza,
grande, en el perfil del artista. Es exactamente el caso de uso que la fuente
describe como el más limpio ("gallery card a detail page").

**Riesgo para MESH.** Bajo — es continuidad espacial honesta, no un efecto
prestado de otro producto.

**Recomendación.** Adaptar. MESH SDK 57 ya trae Expo Router con Stack para el
perfil (`app/artista/[slug].tsx` en la propuesta de navegación); falta
verificar que la versión estable (no beta) del SDK 57 soporte esto sin
inestabilidad. Prototipo primero en playground antes de tocar
`ArtworkCard`/`ProfileScreen`. **Confianza.** Media — depende de estabilidad
de una API en beta al momento de esta investigación.

---

## Física de arrastre de tarjetas

**MESH ya tiene esto construido**, no es un hallazgo nuevo — ver
`apps/mobile/src/features/discovery/SwipeCard.tsx`. Lo que sigue es la
verificación de que el enfoque ya elegido coincide con lo que se ve en
productos reales, no una propuesta de cambio.

**Qué encontramos.** El patrón consistente en fuentes de plataforma: durante
el arrastre, la tarjeta sigue al dedo sin easing (control directo); recién al
soltar entra la física. Cuando el arrastre no cruza el umbral, vuelve al
origen **sin rebote**; cuando sí lo cruza con velocidad, sale con un resorte
que sí tiene algo de rebote — la velocidad del gesto se conserva en la
animación de salida. [Swipe Right on Fun — Tinder-style card animations](https://medium.com/@japeshsinghal/swipe-right-on-fun-creating-tinder-style-card-animations-a845e29601e5),
[Recreating Quibi's card swipe — Reanimated](https://www.thewidlarzgroup.com/blog/recreating-quibis-cards-swipe-animation-with-react-native-and-reanimated).
Nivel 2/3, pero coincide entre fuentes independientes.

**Comparación con lo construido.** `SwipeCard.tsx` ya hace exactamente esto:
`x`/`y` como shared values sin easing durante el gesto, `COMMIT_RATIO` como
umbral, `FLICK_VELOCITY` para que un flick corto pero rápido cuente igual que
un arrastre largo, y `spring.deck` (`damping: 18, stiffness: 180`) para la
salida — un resorte más suelto que el `spring.standard` de UI, que es
justamente lo que le da la sensación de "conservó el impulso". Coincide con el
patrón observado sin haber sido copiado de un producto puntual.

**Aplicación a MESH.** Ninguna acción — ya está. Lo único que vale la pena
prototipar en playground es **ajustar los números** (umbral, curva de
rotación, rango de escala de la tarjeta de atrás) con alguien probándolo en
mano, no solo leyendo el código.

**Recomendación.** Usar lo que ya existe. Prototipo en playground:
`SwipePhysicsLab`, con los tres parámetros expuestos como controles para
ajustar en vivo. **Confianza.** Alta — coincide con fuentes independientes y
ya está en producción.
