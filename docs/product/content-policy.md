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
2. Los nombres usan un prefijo reservado y evidente — `[Fixture] …` — nunca un
   nombre humano verosímil.
3. Los builds no productivos muestran una insignia visible de fixture en
   cualquier registro fixture.
4. La carga en producción **falla** si alguna fila tiene `is_fixture = true`.
   Impuesto en el CLI del seed y verificado por un test.
5. Las imágenes fixture son placeholders abstractos, no tatuajes reales sacados
   de ningún lado.

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
