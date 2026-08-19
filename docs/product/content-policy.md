# MESH — Política de contenido y datos reales

**Estado:** Vinculante · **Responsables:** content-engineer + product-architect

Todo el valor de MESH descansa en que la persona crea lo que se le muestra. Esta
política no es una guía sugerida.

---

## 1. Nunca inventar

MESH nunca puede generar, inventar, estimar ni inferir:

- Reseñas, ratings, testimonios
- Cantidad de reservas o de clientes, "X personas contactaron a este artista"
- Disponibilidad o tiempos de espera
- Precios que el artista no publicó
- Credenciales, premios, años de experiencia
- Prueba social de cualquier tipo
- Razones de match que no deriven de términos que aportaron al puntaje
  (ver [`matching.md`](matching.md) §4.5)
- Contenido en un mensaje de contacto precargado que la persona no proveyó
  (ver [`product-spec.md`](product-spec.md) §10)

Si falta un campo, la sección no se renderiza. Una sección ausente es honesta;
una suposición verosímil es una mentira con mejor tipografía.

## 2. El consentimiento es requisito de inclusión

Un artista solo puede aparecer en MESH después de dar consentimiento explícito y
registrado que cubra:

- Mostrar su nombre, ciudad, bio y handles de redes
- Mostrar las imágenes de portfolio específicas provistas
- Ser contactado por usuarios de MESH por el canal o canales que designó
- Las etiquetas de estilo aplicadas a él y a su trabajo (puede corregirlas)
- Retiro a pedido, atendido dentro de las 48 horas

El consentimiento se registra en `content/artists/<slug>/consent.md` —fecha,
medio, alcance y quién lo obtuvo— y es **requerido por el validador del seed**.
Un archivo de artista sin registro de consentimiento no se carga. Esto es una
falla dura, no una advertencia.

**Nada de scraping.** Ni Instagram, ni sitios de artistas, ni agregadores. Cada
imagen la provee el artista o se obtiene con su indicación explícita. El
scraping es a la vez una violación de términos de servicio y un problema de
derechos de autor, y envenenaría la confianza de la que depende el producto.

## 3. Atribución y derechos

- Cada `portfolio_item` remite a exactamente un `professional` que es la persona
  responsable del trabajo.
- Las imágenes siguen siendo del artista. MESH las guarda y las muestra; no
  reclama nada.
- Cuando la foto de un tatuaje la sacó un tercero, el artista confirma que tiene
  derecho a compartirla.
- Se evitan las imágenes que identifican al cliente (caras, contexto
  distintivo); si una pieza está sobre una persona identificable, se excluye
  salvo que el artista confirme que esa persona consintió.

## 4. Fixtures

Pueden existir fixtures de desarrollo para poder construir la app antes de que
llegue el contenido real, pero tienen que ser inconfundibles:

1. `is_fixture = true` en `professionals` y `portfolio_items`.
2. **El slug** usa un prefijo reservado — `fixture-…` — y el `display_name`
   nunca puede leerse como el nombre de una persona. El validador rechaza las
   dos cosas.
3. **Toda superficie que renderiza un fixture monta una insignia visible.** No
   solo el perfil: la tarjeta del mazo y la de encajes también. Esto es una
   garantía de renderizado, no una recomendación — una pantalla nueva que
   muestre profesionales y no la monte está incompleta.
4. **Un fixture no se puede contactar.** La pantalla de contacto lo corta antes
   de armar el mensaje. Los números de contacto de los fixtures son además
   reservados y no ruteables.
5. La carga en producción **falla** si alguna fila tiene `is_fixture = true`.
   Impuesto en el CLI del seed y verificado por un test.
6. Las imágenes fixture son placeholders abstractos, no tatuajes reales sacados
   de ningún lado, y llevan "FIXTURE" impreso.

### El artista sube su propia obra

Hasta 2026-08-18 el catálogo lo escribía **solo** el service role desde
`tools/seed`. Ahora un artista puede subir y sacar piezas de su propio
portafolio desde la app.

**Desde 2026-08-19 esto ya no es un catálogo exclusivamente curado.** Un
artista puede darse de alta solo desde la app, sin que nadie le entregue nada.
Ver [ADR-013](../decisions/ADR-013-artist-self-signup.md): qué se pierde al
abrirlo, qué falta antes de lanzarlo (moderación, denuncia, despublicación) y
cómo se vuelve a cerrar.

Lo que sigue es el **otro** camino, el que no se tocó: para un perfil que
armamos nosotros, con su consentimiento registrado acá, le entregamos un código
de ocho caracteres:

```bash
npm run content:claim -- --slug briza-maldonado
```

El código se muestra una sola vez, vive en `professional_claims` —una tabla que
el cliente **no puede leer**— y se consume al canjearse. La diferencia con el
seeder es quién opera, no quién decide: seguimos eligiendo a quién invitamos.

Qué habilita el código, y nada más:

| Puede | No puede |
|---|---|
| Subir piezas a **su** portafolio | Crear un profesional |
| Etiquetarlas con hasta tres estilos | Publicarse solo |
| Sacar una pieza suya | Tocar el perfil de otro |
| | Escribir en la carpeta de storage de otro |

Las cuatro negativas las impone RLS, no la interfaz, y cada una tiene un test
que falla si la política se afloja: `supabase/tests/25_artist_ownership.sql` y
`tests/integration/src/artist.test.ts`.

**El consentimiento de las piezas subidas es el acto de subirlas**, hecho por una
persona autenticada que canjeó un código que le dimos en mano. Eso es un
registro más fuerte que un archivo de texto escrito por nosotros. Lo que el
`consent.md` sigue cubriendo es todo lo demás: el precio, la disponibilidad, los
canales de contacto publicados y el acuerdo de retiro.

**Las fotos se limpian antes de subirse.** La app recodifica la imagen desde los
píxeles, así que lo que llega al bucket no tiene EXIF, ni GPS, ni marca de
cámara. No es una optimización: el bucket `portfolio` es de lectura pública, y
una foto sacada en el estudio lleva las coordenadas del estudio.

**Lo que esto abre y hay que mirar:** contenido en un bucket público escrito por
alguien que no somos nosotros. Con diez artistas invitados a mano y códigos
entregados uno por uno, la accountability es total — sabemos exactamente quién
subió qué. Eso deja de alcanzar mucho antes de lo que parece: el día que haya
cincuenta artistas hace falta una cola de revisión, o al menos una forma de
despublicar rápido. No está construido, y es lo primero que hay que construir
antes de abrir el código a alguien que no conocemos.

### Borradores

Un directorio con un archivo `DRAFT` no se valida ni se carga. Existe porque
conseguir contenido real lleva días —consentimiento, fotos, confirmaciones— y un
perfil a medias tiene que poder vivir en el repo sin romper el build ni tentar a
nadie a completarlo con datos plausibles.

No es una excepción a ninguna regla de arriba: es lo contrario de una excepción.
Un borrador **no se puede publicar**, y en el momento en que se le saca el
marcador tiene que pasar la validación entera. El seeder lo saltea incluso con
`--publish`.

Para que no se vuelva la forma de esquivar los chequeos, tanto el validador como
el seeder los nombran en cada corrida, verde o roja.

### Por qué la marca se movió del nombre a la superficie

Hasta 2026-08-18 la regla 2 marcaba el `display_name`: los fixtures se llamaban
`[Fixture] Irezumi`. Era efectivo y tenía un costo que se hizo visible al usar
la app de verdad: el prefijo viaja con el string, así que aparecía en cada
captura, en cada evento de analytics y —lo peor— dentro del mensaje de contacto
precargado.

La marca se movió al slug, que no se muestra nunca y no se traduce nunca, y la
protección de cara al usuario pasó a ser el renderizado. El saldo es **más**
estricto que antes: el prefijo lo podía borrar cualquiera editando un YAML,
mientras que `is_fixture` viene de la base y la carga a producción lo rechaza.
Y la regla 4 tapa una brecha que el prefijo cubría solo de casualidad — antes el
mensaje decía "Hola [Fixture] Irezumi" y era impensable mandarlo; ahora el
contacto está cortado explícitamente.

Reemplazar un fixture con contenido real tiene que ser la edición de un solo
archivo más una nueva corrida del seeder — nada en la app puede hardcodear un id
de fixture.

## 5. Estructura del contenido

```
content/
  artists/
    <slug>/
      artist.yaml        identidad, bio, ubicación, estilos, precio, disponibilidad, redes
      portfolio.yaml     una entrada por pieza: archivo, epígrafe, año, estilos + pesos
      consent.md         registro de consentimiento — requerido
      media/             imágenes fuente, en gitignore, subidas a Storage por el seeder
```

`artist.yaml` y `portfolio.yaml` se validan contra esquemas Zod en
`packages/domain/src/content/`. El validador chequea:

- Campos requeridos presentes y no vacíos
- `whatsapp` en E.164 válido; `instagram` un handle pelado, no una URL
- Todo slug de estilo existe en la taxonomía de la categoría del artista
- Los pesos de estilo por pieza suman 1 ± 0,001
- Precio min ≤ max; moneda ISO-4217; `priced_at` presente si hay precio
- `availability_updated_at` presente si hay disponibilidad
- Todo archivo de media referenciado existe, es JPEG/PNG/WebP/HEIC, ≤ 12 MB y
  tiene dimensiones legibles
- Existe un registro de consentimiento y está fechado

El contenido malformado **aborta la corrida antes de cualquier inserción**. El
seeder nunca aplica un lote parcialmente y nunca saltea en silencio un registro
inválido.

## 6. Taxonomía

Los estilos son datos, no strings dentro de componentes. Vocabulario inicial de
tatuaje:

`fine-line`, `blackwork`, `dotwork`, `old-school`, `traditional`,
`neo-traditional`, `realism`, `black-and-grey`, `watercolor`, `ornamental`,
`japanese`, `lettering`, `minimalist`, `fileteado-porteno`, `handpoke`

Notas:

- *Fileteado porteño* está incluido a propósito — es específico de Buenos Aires
  y le señala al usuario local que MESH se construyó para su ciudad, no que se
  tradujo a ella.
- *Old School* y *Traditional* se solapan bastante en la práctica. Se mantienen
  separados porque los artistas usan los dos términos, pero la taxonomía soporta
  un campo `aliases` para poder fusionarlos más adelante sin una migración.
- Los nombres visibles de los estilos se localizan; los slugs son estables, en
  minúscula, y nunca se traducen.

Agregar un estilo requiere una migración (los estilos son filas), una entrada de
taxonomía y revisión de content-engineer — porque todo vector de gusto existente
cambia de significado en silencio cuando cambia el vocabulario.

## 7. Manejo de media

- Se sube a Supabase Storage, nunca a Postgres.
- Bucket `portfolio` — lectura pública, escritura con service role. Bucket
  `references` — privado, rutas por usuario.
- Se redimensiona en el seed a `sm` (400px), `md` (900px), `lg` (1600px) sobre
  el lado mayor, en WebP, más un blurhash guardado en `media_assets`.
- El cliente pide el tamaño más chico que sirva a la superficie. Descubrimiento
  usa `md`, las miniaturas de grilla `sm`, la vista completa `lg`.
- Los originales se conservan fuera del repositorio, en el almacenamiento del
  propio artista, para poder rederivar si cambia el pipeline.

## 8. Retiro

Si un artista pide ser eliminado: poner `is_published = false` (efecto inmediato
vía RLS), borrar sus objetos de storage, borrar las filas y eliminar el
directorio de contenido, el mismo día hábil. Conservar únicamente el registro de
consentimiento/retiro. Documentar la baja en `content/artists/REMOVED.md` con la
fecha — sin detalles, solo un rastro de auditoría de que ocurrió.
