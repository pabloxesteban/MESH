# MESH — Lenguaje visual y marca

**Estado:** Propuesto · **Responsable:** brand-designer

---

## 1. La idea

MESH se trata de **conexión e intersección** — gente, gusto, habilidades, ideas
y trabajo entramándose. Dos cosas que estaban separadas que se cruzan y siguen
como una.

La marca nunca puede apoyarse en iconografía de tatuaje. Agujas, máquinas, rosas
y calaveras harían de MESH una app de tatuajes, y MESH no es una app de tatuajes
— es un producto que hoy empieza por tatuaje.

## 2. Posicionamiento de la identidad visual

| Somos | No somos |
|---|---|
| Editorial | Neón |
| Artístico | Gamificado |
| Táctil | SaaS genérico |
| Premium | Cripto |
| Calmo | Startup de IA |
| Seguro | App de citas |

Las referencias son un libro de arte bien hecho, la ficha de sala de una
galería, y una lámina de revista impresa — no un dashboard, no un feed.

**La decisión de marca más fuerte: el trabajo es el diseño.** La interfaz de
MESH es un marco. Aporta silencio, márgenes generosos y tipografía precisa, y
después se corre del camino de las imágenes. Cualquier elemento de UI que
compita con una obra por la atención está mal.

## 3. La marca gráfica

**Concepto: dos trazos que se cruzan y siguen.**

Un símbolo monolínea en el que dos caminos se acercan desde direcciones
distintas, se cruzan y continúan — dejando una pequeña abertura en la
intersección. De un vistazo se lee como una **M** abstracta. Mirado en serio se
lee como dos cosas que se encuentran. La abertura en el cruce es el único detalle
distintivo de la marca: el punto donde el gusto se encuentra con una persona.

Construido y verificado en la Fase 2. Geometría final, hoja de uso y criterios
de verificación: [`brand/README.md`](../../brand/README.md).

| | Display (≥32px) | Ícono (≤24px, app, favicon) |
|---|---|---|
| viewBox | 112 × 94 | 112 × 94 |
| Trazo | 12 | 14 |
| Fin de diagonales | 38 / 74 | 45 / 67 |
| Cruce | (56, 66.3) — 70% de la altura | (56, 72.3) — 77% |

La corrección óptica que importa no resultó ser el grosor sino **el vuelo por
debajo del cruce**. Con el vuelo completo, la base tiene cuatro terminaciones
seguidas; a 16px los huecos entre ellas caen por debajo de un píxel, se funden,
y la marca se lee como una mancha. Acortar el vuelo junta las dos del medio en
un solo vértice y devuelve la M a 16px. Esto se descubrió mirando la marca
renderizada a tamaño real, no razonándolo.

Requisitos que la marca tiene que cumplir:

- Un solo grosor de trazo, sin rellenos, sin degradados — para que sobreviva a
  16px, en un solo color, bordada, estampada o grabada.
- Legible como ícono de app a 60×60pt con los trazos en peso óptico (más grueso
  que la versión escalada matemáticamente — un ícono chico necesita trazos más
  gruesos que un logo grande; se producen dos tamaños ópticos).
- Funciona tinta-sobre-papel (`#0C0C0E` sobre `#F4EFE6`) y papel-sobre-tinta,
  idéntico.
- Funciona con el logotipo y completamente sin él.
- Se anima como un único trazo continuo — se usa como marca de carga, una sola
  vez, ~600ms, nunca en loop agresivo.

Explícitamente rechazados: diagramas de red de nodos y aristas (los tiene toda
empresa de SaaS B2B), mallas o grillas literales (se leen como textil o como
"cargando"), un símbolo de infinito, un nudo, y cualquier M figurativa hecha con
herramientas de tatuaje.

**Logotipo:** `MESH` en Fraunces (wght 600, opsz 144, SOFT 0, WONK 0),
mayúsculas, tracking +0,12em. Las formas de las letras llevan la personalidad;
el logotipo no necesita ninguna customización más allá del tracking. Se entrega
**en curvas**: un SVG con `font-family` depende de que Fraunces esté instalada
donde se abra, y en cualquier otra máquina deja de ser el logotipo.

**El lockup tiene una trampa.** Con el símbolo a la altura de mayúsculas y poca
separación se lee "MMESH" — la marca es una M y queda pegada a la M del
logotipo. Se resuelve poniendo el símbolo a 1,35× la altura de mayúsculas, con
separación amplia: que no se pueda confundir con una letra es lo que lo saca de
la lectura. Hay además un lockup apilado para contextos cuadrados.

**Área de resguardo:** la altura de la `M` en todos los lados. Tamaños mínimos:
símbolo 16px; lockup 88px de ancho.

Entregables en la Fase 2: `brand/logo/mesh-symbol.svg`,
`mesh-symbol-icon.svg` (óptico), `mesh-lockup.svg`, variantes monocromas, set de
íconos de app, ícono adaptativo de Android, favicon y una hoja de uso de una
página.

## 4. Color

**MESH tiene color, y el color quiere decir algo.** No es una app en blanco y
negro con un acento: es un sistema de once familias cromáticas donde cada una
identifica una familia de estilo de tatuaje. Un chip turquesa siempre es línea
fina. Uno violeta siempre es blackwork. Cuando alguien ya aprendió a leerlos,
reconoce un estilo de un vistazo, antes de leer la palabra.

Lo que el color **no** hace nunca es cargar el significado solo. La etiqueta
dice el estilo en palabras; el color acelera el reconocimiento de quien ya sabe
leerlo. Alguien que no distingue los tonos pierde velocidad, no información.

### La paleta está generada, no elegida

`palette.ts` lo produce `tools/brand/src/build-palette.mjs`. Cada familia se
define por su **tono en OKLCH**, y el generador busca la luminosidad exacta a la
que ese tono alcanza el contraste que necesita contra la superficie donde va a
vivir. El hex es una salida, no una decisión.

Existe porque elegir a ojo ya nos metió dos veces un token que se veía bien y
medía 2,6:1. `npm run brand:palette:check` corre en CI: editar `palette.ts` a
mano rompe el build.

### Tres roles por familia, y por qué son tres

| Rol | Contra | Mínimo | Para qué |
|---|---|---|---|
| `<familia>OnDark` | `ink800` (la superficie elevada, la más exigente) | 4,5:1 | **Texto** e íconos sobre oscuro |
| `<familia>OnLight` | `paper100` | 4,5:1 | **Texto** e íconos sobre papel |
| `<familia>Vivid` | — | 4,5:1 con su texto encima | **Relleno**: barras, puntos, degradados, chips llenos |

Los roles de texto se resuelven **buscando la luminosidad** a la que el tono
llega a 4,5:1 contra su fondo, y para llegar ahí un tono tiene que aclararse —
lo que le saca saturación. Es física, no gusto. El rol de relleno hace lo
contrario: fija la luminosidad en 0,62 y **empuja la croma al borde del gamut**,
que es donde el color realmente se ve. Después se verifica que aguante su texto
encima con 4,5:1; si no llega, la familia usa `deepVivid`.

Usar `onDark` como relleno deja la interfaz lavada; usar `vivid` como texto la
deja ilegible.

Hay un cuarto rol, `deepVivid`: el relleno para tema claro en las familias cuyo
`vivid` es demasiado luminoso para sostener texto oscuro sobre papel. Lleva
`paper100` encima.

### Las once familias

| Familia | Estilos | Tono |
|---|---|---|
| `brand` | — (el acento de MESH) | 12° rosa |
| `line` | fine-line, minimalist | 195° turquesa |
| `shade` | blackwork, black-and-grey | 295° violeta |
| `dot` | dotwork, ornamental | 75° ámbar |
| `classic` | old-school, traditional, neo-traditional | 32° bermellón |
| `real` | realism | 255° azul |
| `flow` | watercolor | 340° magenta |
| `east` | japanese | 20° rojo |
| `letter` | lettering | 130° verde |
| `gold` | fileteado-porteno | 95° oro |
| `hand` | handpoke | 160° esmeralda |

Un test recorre la taxonomía en las dos direcciones: un estilo nuevo sin familia
rompe el build, y una familia sin estilos también.

### Neutros

Derivados mezclando `ink` y `paper` — no gris, así todo el sistema se mantiene
cálido, y sobre un neutro cálido la fotografía de piel se ve como piel.

`ink-900 #0C0C0E` · `ink-800 #1A1A1D` · `ink-700 #2C2B2E` ·
`ink-500 #56545A` · `ink-300 #8C8A90` ·
`paper-300 #C9C2B6` · `paper-200 #E2DCD1` · `paper-100 #F4EFE6` ·
`paper-050 #FAF7F1`

### Tokens semánticos

Las pantallas usan solo estos. Se resuelven según el tema.

```
surface            surface-raised     surface-sunken
text-primary       text-secondary     text-tertiary
border-subtle      border-strong
accent             accent-fill        accent-contrast
accent-alt         accent-alt-fill
overlay-scrim
state-positive     state-negative     state-warning
```

`accent` / `accentFill` son la familia `brand` (rosa): dicen *esto es MESH*.
`accentAlt` / `accentAltFill` son la familia `shade` (violeta): dicen *esto es
tuyo* — aparecen en el gusto, en los guardados y en los degradados de los
momentos de revelación.

Los colores de familia de estilo **no** son tokens del tema, porque no son roles
semánticos: se resuelven con `styleColor(slug, theme)`, y `Text` los recibe por
la prop `tint`, que existe solo para eso.

Los valores `state-*` son para feedback del sistema (una subida fallida) y nada
más. **Me gusta y paso nunca se colorean de verde y rojo.** Verde/rojo es una UI
de juicio y pertenece a las apps de citas; el me gusta y el paso de MESH son
neutros, pesados por tipografía y movimiento en lugar de por color. Por la misma
razón las bandas de encaje no son un semáforo: fuerte es rosa de marca, bueno es
violeta, posible es neutro con borde. Un encaje posible no es un error ni una
advertencia.

### Disciplina

- **El acento de marca aparece como máximo una vez por pantalla.** Marca la
  única acción más importante, o la única cosa que hay que notar. Esta regla es
  sobre `accent`, no sobre el color en general — los colores de estilo pueden
  aparecer muchas veces, porque no compiten por la atención: la reparten.
  *(Antes esta regla decía "el acento aparece como máximo una vez por pantalla"
  a secas, escrita cuando el sistema tenía un solo color. La reemplaza esta.)*
- Un color de estilo solo aparece **donde ese estilo está siendo nombrado**. No
  se usa como decoración ni para dar variedad.
- Las obras nunca se tiñen, ni se superponen con un color de marca, ni reciben
  un borde de color. El color vive en el cromo alrededor de la imagen, nunca
  encima.
- Los velos sobre imágenes son `ink` con opacidad medida, nunca coloreados.

### Tema

El oscuro (superficie `ink`) es el predeterminado: es el marco correcto para la
fotografía y es lo que hace una galería. El claro (`paper`) está soportado por
completo y no es una ocurrencia tardía — todo token tiene los dos valores, todo
color de familia tiene su par, y el diseño se revisa en ambos.

## 5. Tipografía

Dos familias. Las dos variables, de licencia abierta, y empaquetables con Expo.

**Serif editorial — Fraunces.** Momentos de marca, frases emocionales, títulos
mayores, la revelación del gusto, y los nombres en los perfiles. Variable, con
ejes de tamaño óptico y `soft`/`wonk`; se usa con `wonk: 0`, `soft: 0` para que
se lea contemporánea y no anticuada, con el tamaño óptico ajustado por escalón.

**Sans moderna — Instrument Sans.** Navegación, botones, metadatos, etiquetas,
filtros, toda la UI funcional. Neutra sin ser anónima como Helvetica, y hace
pareja con Fraunces por construcción.

### Escala

| Token | Familia | Tamaño / interlínea | Uso |
|---|---|---|---|
| `display` | Serif | 40 / 44 | Revelación del gusto, momentos de marca |
| `title-lg` | Serif | 30 / 36 | Títulos de pantalla, nombre del artista en el perfil |
| `title` | Serif | 24 / 30 | Encabezados de sección |
| `body-lg` | Sans | 17 / 26 | Bios, descripciones de proyecto |
| `body` | Sans | 15 / 22 | Por defecto |
| `label` | Sans | 13 / 18 | Metadatos, epígrafes |
| `micro` | Sans | 11 / 14, +0,08em | Etiquetas, antetítulos — en mayúsculas |

Reglas: la serif nunca se usa por debajo de 24px, y la sans nunca por encima de
20px. Esa única restricción mantiene a las dos familias en su rol sin discutir el
manual de estilo en cada pantalla.

## 6. Layout

- Escala de espaciado de 8pt: 4, 8, 12, 16, 24, 32, 48, 64.
- Margen de pantalla 20pt. El contenido es generoso antes que denso — este es un
  producto sobre mirar una cosa, no sobre escanear muchas.
- Radios: 4 (chips), 12 (tarjetas, hojas), 20 (tarjetas del mazo), 999
  (píldoras). Las esquinas de las obras van con radio 12 — suavizadas, no
  redondeadas.
- La elevación se expresa con cambios de valor de superficie y bordes de un
  píxel, no con sombras. Las sombras sobre una superficie oscura cálida parecen
  suciedad.
- Tarjeta de descubrimiento: obra a sangre con los metadatos debajo, no encima,
  de la imagen. Texto sobre la obra implica un velo, y un velo es una concesión
  sobre el trabajo.

## 7. Movimiento

El movimiento comunica dirección, confirmación, conexión y jerarquía. Lo que no
comunique alguna de esas cuatro no se publica.

| Token | Especificación | Uso |
|---|---|---|
| `instant` | 120ms, ease-out | Cambios de estado, presiones |
| `quick` | 200ms, ease-out | Fundidos, cambios de chip |
| `standard` | 280ms, resorte (damping 22, stiffness 220) | Transiciones de pantalla, hojas |
| `deck` | resorte (damping 18, stiffness 180), conserva velocidad | Descarte de tarjeta |
| `reveal` | 500ms escalonado 60ms | Solo la revelación del gusto |

Reglas:

- Nada supera los 500ms.
- El mazo sigue al dedo exactamente — sin retardo, sin easing sobre el arrastre
  mismo. La física arranca cuando el dedo se levanta.
- La dirección del descarte sigue al envión. La tarjeta se va por donde la
  empujaron.
- La reducción de movimiento reemplaza toda transición basada en transformación
  por un fundido cruzado de 120ms, y la revelación del gusto aparece de una vez.
  Nada queda inalcanzable.
- Sin confeti, sin partículas, sin animaciones de reposo en loop, sin UI que
  rebota.

## 8. Hápticos

Con moderación, y solo como confirmación de una decisión que tomó la persona.

| Acción | Háptico |
|---|---|
| Me gusta | `impactLight` |
| Guardar | `impactMedium` |
| Paso | ninguno — pasar no es un logro |
| Aparece la lista de matches | `notificationSuccess`, una vez |
| Confirmación destructiva | `impactHeavy` |
| Error | `notificationError` |

Nunca al hacer scroll, nunca por frame, nunca al entrar una tarjeta. Respetar el
ajuste de hápticos del sistema; ofrecer un interruptor dentro de la app.

## 9. Iconografía

Monolínea, 1,5px a 24px, terminaciones redondeadas, coincidiendo con la
construcción de la marca. Feather o Lucide como base, y cualquier ícono que no
encaje se redibuja en vez de importarse. Los íconos nunca son la única etiqueta
de una acción principal.

## 10. Voz

Español rioplatense primero — *vos*, no *tú*. Directo, cálido, sin apuro, nunca
vendedor.

**Bien:**
"Empecemos por lo que te gusta." · "Encontrá a tu gente." ·
"Detrás de cada trabajo hay alguien." · "¿Quién hizo esto?" ·
"Hagámoslo realidad."

**Prohibido:** "deslizá a la derecha", "como Tinder", "con IA", "revolucionario",
"seamless", "desbloqueá", "subí de nivel", "no te lo pierdas", cualquier
apilamiento de signos de exclamación, cualquier urgencia falsa.

**Los estados vacíos dicen qué es cierto y qué hacer después**, y nunca se
disculpan de forma teatral: "Todavía no hay coincidencias. Seguí explorando y
vamos a ir entendiendo tu gusto."

## 11. Fotografía y presentación del contenido

- Las obras se muestran sin recortar cuando la relación de aspecto lo permite;
  cuando hay que recortar, el recorte es centrado y la imagen completa está a un
  toque.
- Sin filtros, sin corrección de color, sin viñetas sobre el trabajo de los
  artistas.
- La atribución siempre está junto a la obra — el nombre del artista nunca está a
  más de un vistazo de su pieza. Esto es una posición de marca: MESH existe para
  volver a poner a la persona al lado del trabajo.
