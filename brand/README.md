# MESH — hoja de uso de la marca

Los SVG de `brand/logo/` son la fuente de verdad. Todo PNG del repositorio se
genera desde ellos con `npm run brand:icons`. **No exportes un PNG a mano:** se
desincroniza del logo en cuanto alguien toca la marca, y nadie se entera hasta
que ya se publicó.

Contexto y razonamiento: [`docs/design/visual-language.md`](../docs/design/visual-language.md).

---

## La idea

Dos trazos que se cruzan y siguen.

De un vistazo se lee como una **M**. Mirado en serio, son dos caminos que se
encuentran y continúan. El vértice de la M queda elevado, y lo que los dos
trazos abren por debajo del cruce es un triángulo de papel: esa abertura es el
único detalle distintivo de la marca, y es el punto donde el gusto se encuentra
con una persona.

## Archivos

| Archivo | Qué es | Cuándo |
|---|---|---|
| `logo/mesh-symbol.svg` | Símbolo, óptico de display | 32px o más |
| `logo/mesh-symbol-icon.svg` | Símbolo, óptico de ícono | 24px o menos, ícono de app, favicon |
| `logo/mesh-wordmark.svg` | Logotipo solo, en curvas | Cuando el símbolo ya está presente |
| `logo/mesh-lockup.svg` | Símbolo + logotipo, horizontal | Encabezados, firma, documentos |
| `logo/mesh-lockup-stacked.svg` | Símbolo + logotipo, apilado | Contextos cuadrados: splash, tienda, avatar |

Todos usan `currentColor`, así el mismo archivo sirve tinta-sobre-papel y
papel-sobre-tinta. Ninguno lleva color propio.

## Los dos ópticos, y por qué

Un trazo escalado matemáticamente se afina y se desarma cuando el símbolo es
chico. Pero la corrección importante no es el grosor: es **el vuelo por debajo
del cruce**.

Con el vuelo completo, la base tiene cuatro terminaciones seguidas. A 16px los
huecos entre ellas caen por debajo de un píxel, se funden, y la marca se lee
como una mancha. El óptico de ícono acorta el vuelo hasta que las dos
terminaciones del medio se juntan en un solo vértice: a 16px se lee una M
limpia, y el cruce vuelve a ser visible a partir de 32px.

| | Display | Ícono |
|---|---|---|
| viewBox | 112 × 94 | 112 × 94 |
| Trazo | 12 | 14 |
| Fin de diagonales | 38 / 74 | 45 / 67 |
| Cruce | (56, 66.3) — 70% de la altura | (56, 72.3) — 77% |

Los dos tienen que verse como la misma marca **a su tamaño de uso**. Si al mismo
tamaño se ven distintos, es correcto: están corregidos para tamaños distintos.

Ver `proof/mesh-proof-light.png` y `proof/mesh-proof-dark.png`.

## Área de resguardo y tamaños mínimos

- **Resguardo:** la altura de la M en todos los lados. Nada entra ahí.
- **Símbolo:** mínimo 16px.
- **Lockup horizontal:** mínimo 220px de ancho. Por debajo, símbolo solo.
- **Lockup apilado:** mínimo 120px de ancho.

## Color

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#0C0C0E` | Marca sobre papel; fondo del ícono de app |
| `paper` | `#F4EFE6` | Marca sobre tinta |

La marca es de un solo color, siempre. **Nunca** en `signal` rojo: el acento se
reserva para la única acción más importante de una pantalla, y un logo no es una
acción.

El ícono de app va papel sobre tinta. En una pantalla de inicio llena de íconos
claros y saturados, uno oscuro y quieto se distingue — y es coherente con que el
tema oscuro sea el predeterminado.

## Íconos generados

`npm run brand:icons` escribe en `apps/mobile/assets/`:

| Archivo | Tamaño | Notas |
|---|---|---|
| `icon.png` | 1024 | iOS, opaco, 20% de padding |
| `android-icon-foreground.png` | 1024 | Transparente, 30% de padding |
| `android-icon-background.png` | 1024 | `#0C0C0E` plano |
| `android-icon-monochrome.png` | 1024 | Negro sobre transparente; el sistema lo tiñe |
| `favicon.png` | 196 | Opaco: la barra del navegador puede ser clara u oscura |
| `splash-icon.png` | 512 | Transparente; Expo pinta el fondo |

El padding del adaptativo es el más grande porque Android recorta con la máscara
que elija el fabricante: solo el 66% central está garantizado. La hoja de prueba
dibuja el ícono con la máscara circular, que es la más agresiva.

Ver `proof/mesh-proof-icons.png`.

## Verificar después de cambiar la marca

```bash
npm run brand:icons     # regenera los PNG desde los SVG
npm run brand:proof     # regenera las hojas de prueba
```

Y después **mirá las hojas de prueba**. Los criterios son:

- [ ] Legible a 16px
- [ ] Reconocible sin el logotipo
- [ ] Funciona en un solo color, tinta-sobre-papel y papel-sobre-tinta
- [ ] No se confunde con Wi-Fi, infinito, un nudo, una cadena ni un grafo de nodos
- [ ] El ícono sobrevive la máscara circular de Android
- [ ] El lockup no se lee "MMESH"

Ese último no es una broma. Con el símbolo a la altura de mayúsculas y poca
separación, el lockup se lee "MMESH": la marca es una M y queda pegada a la M
del logotipo. Por eso el símbolo va a 1,35× la altura de mayúsculas y con
separación amplia — que no se pueda confundir con una letra es lo que lo
resuelve.

## Regenerar el logotipo

El logotipo está en curvas, no con `font-family`: un SVG con `font-family`
depende de que Fraunces esté instalada donde se abra, y en cualquier otra
máquina deja de ser el logotipo.

```bash
pip install fonttools brotli
curl -sSL -o /tmp/Fraunces.ttf \
  'https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf'
python3 tools/brand/src/build-wordmark.py /tmp/Fraunces.ttf
```

Fraunces es OFL. Ejes: `wght 600`, `opsz 144`, `SOFT 0`, `WONK 0` — los dos
últimos en cero para que se lea contemporánea y no anticuada.

## Nunca

- Degradados, sombras o contornos en la marca.
- Dos colores.
- Estirar, inclinar, rotar o redibujar el símbolo.
- Encerrarlo en una forma que no sea el cuadro del ícono de app.
- Ponerlo sobre una fotografía o sobre el trabajo de un artista.
- Usar el óptico de display por debajo de 32px.
- Reconstruir el logotipo tipeando "MESH" en Fraunces sin el tracking.
- Iconografía de tatuaje de cualquier tipo. El tatuaje es el primer vertical, no
  la marca.
