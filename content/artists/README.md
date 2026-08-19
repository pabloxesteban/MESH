# Contenido de artistas

Un directorio por artista. Todo lo de acá se valida antes de cargarse; el
contenido malformado aborta la corrida **antes** de que se escriba nada.

```
<slug>/
  artist.yaml       identidad, bio, ubicación, estilos, precio, disponibilidad, redes
  portfolio.yaml    una entrada por pieza: archivo, epígrafe, año, estilos + pesos
  consent.md        registro de consentimiento — requerido, sin esto no se carga
  media/            imágenes fuente (en .gitignore — los originales quedan con el artista)
```

Las claves de los YAML están en inglés porque mapean directo a columnas. Los
slugs de estilo son estables y nunca se traducen.

## Reglas que no se negocian

1. **Sin `consent.md` fechado no se carga el artista.** No es una advertencia,
   es una falla dura de la corrida.
2. **Nada de scraping.** Cada imagen la provee el artista o se obtiene con su
   indicación explícita.
3. **Nunca inventar** una bio, un precio, disponibilidad, una reseña o una
   credencial. Un campo que falta no renderiza nada.
4. **Los fixtures son inconfundibles:** `is_fixture: true` y el nombre con
   prefijo de slug `fixture-`, un nombre que no se lea como el de una persona,
   una insignia visible en toda pantalla que los muestre, y el contacto
   bloqueado. La carga a producción falla si hay alguno.

Detalle completo: [`docs/product/content-policy.md`](../../docs/product/content-policy.md).

## Dar de alta un artista

```bash
npm run content:new -- --slug ana-perez --name "Ana Pérez" --location caba
```

Crea el directorio con los tres archivos y todos los campos presentes pero
**vacíos**, marcados con `TODO`. Vacío y no inventado es a propósito: un
placeholder verosímil —un precio de ejemplo, una bio "por ahora"— es exactamente
cómo un dato inventado llega a producción sin que nadie lo note. Un `TODO` no se
publica por accidente: `content:validate` lo rechaza.

Después, en orden: conseguir el consentimiento y completar `consent.md`, pedirle
las imágenes al artista, completar los YAML, validar.

El comando **no** consigue el consentimiento. Eso es una conversación con una
persona, y `consent.md` es el registro de esa conversación, no su reemplazo.

## Borradores

Conseguir contenido real lleva días: hay que hablar con la persona, esperar el
consentimiento, esperar las fotos. Un perfil a medias tiene que poder vivir en el
repo sin romper el build.

Un archivo `DRAFT` en el directorio lo saca de la validación y de la carga.
Escribí adentro qué falta.

```
content/artists/briza-maldonado/DRAFT
```

Cuando esté completo, borrá el archivo y validá.

Mientras tanto, para saber qué falta sin borrar el `DRAFT`:

```bash
npm run content:doctor
```

Corre exactamente los mismos chequeos que la validación real y los muestra como
una lista para ir tachando, más las notas a mano del `DRAFT`. No publica nada:
solo lee. Sin esto se trabaja a ciegas hasta borrar el archivo, y ahí aparecen
todos los errores juntos.

Lo que el doctor **no** puede decirte es lo que ninguna máquina puede verificar:
si la persona dijo que sí, si la bio son sus palabras, y si revisó sus pesos de
estilo. Eso queda escrito en `consent.md` y en las notas del borrador.

El riesgo obvio es que `DRAFT` se vuelva la forma de saltear los chequeos.
Contra eso: los borradores se listan en cada corrida, verde o roja, así que no
se pueden olvidar en silencio.

**Tres cosas leen `content/artists/`, y las tres tienen que saltear los
borradores:** el validador (`content:validate`), el seeder (`content:seed`) y el
generador de datos del preview (`preview:data`). El tercero se olvidó la primera
vez, y el síntoma fue el preview reventando contra una foto que todavía no
existía. Si aparece un cuarto consumidor, este es su recordatorio.

## Verificar antes de commitear

```bash
npm run content:validate
```

Chequea consentimiento, formato E.164 del WhatsApp, handle de Instagram sin URL,
que todo slug de estilo exista en la taxonomía, que los pesos de estilo de cada
pieza sumen 1 ± 0,001, que haya `priced_at` si hay precio, y que cada archivo de
media exista, tenga extensión permitida y no supere 12 MB.

## Retiro

Si un artista pide ser eliminado: despublicar, borrar objetos de storage y
filas, y eliminar este directorio — el mismo día hábil. Se conserva solo el
registro de consentimiento/retiro, y se anota la fecha en `REMOVED.md`.
