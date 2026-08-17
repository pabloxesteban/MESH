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
   prefijo `[Fixture] `. La carga a producción falla si hay alguno.

Detalle completo: [`docs/product/content-policy.md`](../../docs/product/content-policy.md).

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
