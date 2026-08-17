# ADR-006 — Almacenamiento y entrega de media

**Estado:** Propuesto · **Fecha:** 2026-08-17 · **Responsables:** backend-engineer, performance-engineer

## Contexto

MESH es un producto de imágenes. El mazo de descubrimiento muestra una fotografía
a pantalla completa cada uno o dos segundos, sobre redes móviles en Buenos Aires,
y la calidad percibida de toda la app es la calidad percibida de la carga de
imágenes. La media incluye portfolios curados de artistas (públicos) y
referencias de proyecto subidas por usuarios (privadas).

## Problema

¿Dónde viven los bytes, cuántas variantes generamos, y cómo evita el cliente
descargar más de lo que necesita?

## Opciones

**A. Bytes en Postgres (`bytea`).** Descartada de plano: infla la base, destruye
los tiempos de backup, no se puede cachear en CDN, y encarece cada lectura de
fila.

**B. Storage, un solo original por imagen.** El pipeline más simple; el mazo
después descarga 2–4 MB por tarjeta. Inaceptable con datos móviles.

**C. Storage con tamaños derivados generados en el seed.** Más pipeline, muchos
menos bytes en la red.

**D. Storage con transformaciones al vuelo** en el momento del pedido
(transformaciones de imagen de Supabase o una CDN).

## Decisión

**C**, con **D** como camino de actualización.

- Dos buckets: `portfolio` (lectura pública, escritura con service role) y
  `references` (privado, rutas acotadas al dueño). `avatars` se agrega cuando los
  usuarios tengan avatar.
- El seeder recodifica cada imagen fuente a **WebP** en tres tamaños de lado
  mayor: `sm` 400px, `md` 900px, `lg` 1600px.
- Se calcula un **blurhash** en el seed y se guarda en `media_assets` junto con
  dimensiones, tamaño en bytes, mime type y checksum.
- El cliente elige según la superficie: grillas `sm`, mazo `md`, vista completa
  `lg`.
- `expo-image` con caché en disco, placeholder blurhash, `recyclingKey` y
  `contentFit` explícito.
- El mazo precarga las **3** imágenes siguientes en `md`.
- Las referencias privadas se sirven vía URLs firmadas de vida corta, nunca
  persistidas ni logueadas.

## Por qué

El mazo es la primera impresión del producto y es donde se gasta el ancho de
banda. Descargar una imagen de 1600px para mostrarla a 390pt de ancho desperdicia
aproximadamente el 75% de los bytes y del tiempo de decodificación; tres tamaños
derivados eliminan eso en un solo paso.

Blurhash en vez de un spinner o un cuadrado gris: da los colores dominantes y la
composición correctos de inmediato, así la tarjeta se siente poblada antes de que
llegue la imagen. En una conexión lenta esa es la diferencia entre "cargando" y
"ya casi".

WebP tiene soporte universal en las versiones de plataforma que apuntamos y es
significativamente más chico que JPEG a calidad equivalente.

Guardar las dimensiones en `media_assets` permite que el cliente reserve el
espacio exacto antes de decodificar, lo que elimina el salto de layout en la
grilla de portfolio — un salto en la grilla de las obras de alguien se ve barato.

Generar en el seed en lugar de al vuelo (D) es lo correcto para V1 porque el
catálogo es chico, estático y cargado desde un pipeline controlado: el trabajo
sucede una vez, offline, y no hay costo ni dependencia por pedido. Deja de ser lo
correcto cuando los artistas suban su propio trabajo — momento en el que D mueve
el redimensionado al proveedor y la lógica de tamaños derivados se vuelve un
parámetro de URL.

## Consecuencias

- Storage guarda ~3× las imágenes. Trivial con este tamaño de catálogo.
- Cambiar la escalera de tamaños requiere volver a correr el pipeline. Los
  originales se conservan fuera del repositorio (en el almacenamiento del
  artista) para poder rederivar.
- La herramienta de seed necesita una dependencia de procesamiento de imágenes
  (`sharp` o equivalente) — solo en `tools/seed`, nunca en el árbol de
  dependencias de la app.
- La recodificación elimina el EXIF, incluido el GPS, como efecto secundario.
  Para las referencias subidas por usuarios esto tiene que hacerse **del lado del
  cliente antes de subir**, y está verificado por un test — una foto de
  referencia sacada en casa no puede llevar coordenadas.
- El SVG queda excluido de los tipos MIME permitidos a nivel bucket: es un
  contenedor de scripts, no un formato de imagen.
