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

**Logotipo:** `MESH` en la serif editorial, en mayúsculas, con tracking amplio
(+0,12em). Las formas de las letras llevan la personalidad; el logotipo no
necesita ninguna customización más allá del tracking y el espaciado óptico del
par `M`/`E`.

**Área de resguardo:** la altura de la `M` en todos los lados. Tamaños mínimos:
símbolo 16px; lockup 88px de ancho.

Entregables en la Fase 2: `brand/logo/mesh-symbol.svg`,
`mesh-symbol-icon.svg` (óptico), `mesh-lockup.svg`, variantes monocromas, set de
íconos de app, ícono adaptativo de Android, favicon y una hoja de uso de una
página.

## 4. Color

Anclado en la paleta del brief, refinado por contraste.

### Base

| Token | Hex | Rol |
|---|---|---|
| `ink` | `#0C0C0E` | Casi negro. Superficie principal en oscuro, texto principal sobre papel. |
| `paper` | `#F4EFE6` | Papel cálido. Superficie principal en claro, texto principal sobre tinta. |
| `signal` | `#9C2D40` | Rojo tinta. Acento, usado con mucha moderación. |

### Por qué la paleta necesita más de tres valores

`signal` sobre `ink` mide ≈ 3,0:1 — **no pasa WCAG AA para texto.** Usar el rojo
del brief para cualquier cosa textual sobre una superficie oscura sería un
defecto de accesibilidad. Así que el acento existe en dos valores:

| Token | Hex | Uso |
|---|---|---|
| `signal` | `#9C2D40` | Rellenos y trazos sobre superficies claras; texto sobre papel (≈6,4:1 ✅) |
| `signal-raised` | `#C4485C` | Texto e íconos sobre superficies oscuras (≈5,1:1 ✅) |
| `on-signal` | `#F4EFE6` | Texto sobre un relleno `signal` (≈5,6:1 ✅) |

### Neutros

Derivados mezclando `ink` y `paper` — no gris, así todo el sistema se mantiene
cálido.

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
accent             accent-contrast
overlay-scrim
state-positive     state-negative     state-warning
```

Los valores `state-*` son para feedback del sistema (una subida fallida) y nada
más. **Me gusta y paso nunca se colorean de verde y rojo.** Verde/rojo es una UI
de juicio y pertenece a las apps de citas; el me gusta y el paso de MESH son
neutros, pesados por tipografía y movimiento en lugar de por color.

### Disciplina

- `signal` aparece **como máximo una vez por pantalla**. Marca la única acción
  más importante, o la única cosa que hay que notar. Cuando todo tiene acento,
  nada lo tiene.
- Las obras nunca se tiñen, ni se superponen con un color de marca, ni reciben
  un borde de color.
- Los velos sobre imágenes son `ink` con opacidad medida, nunca coloreados.

### Tema

El oscuro (superficie `ink`) es el predeterminado: es el marco correcto para la
fotografía y es lo que hace una galería. El claro (`paper`) está soportado por
completo y no es una ocurrencia tardía — todo token tiene los dos valores, y el
diseño se revisa en ambos.

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
