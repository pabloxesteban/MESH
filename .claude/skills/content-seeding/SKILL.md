---
name: content-seeding
description: Agregar artistas, validar contenido y correr el pipeline de carga. Usala al agregar o actualizar contenido de artistas, cambiar la taxonomía, o trabajar en tools/seed.
---

# Carga de contenido

## Propósito

Meter artistas reales en MESH de forma confiable, con consentimiento, sin inventar
nada, y sin aplicar nunca un lote roto a medias.

## Cuándo usarla

Al agregar o actualizar un artista. Al cambiar la taxonomía. Ante cualquier cambio
en `tools/seed/` o en `content/`.

## Reglas absolutas

1. **Sin registro de consentimiento, no hay carga.**
   `content/artists/<slug>/consent.md` con fecha, medio, alcance y quién lo
   obtuvo. La falta de consentimiento es una falla dura.
2. **Nada de scraping.** Cada imagen viene del artista o se obtiene con su
   indicación explícita.
3. **Nunca inventes** una bio, un precio, disponibilidad, una reseña o una
   credencial. Un campo faltante no renderiza nada.
4. **Los fixtures son inconfundibles:** `is_fixture = true`, slug `fixture-…`
   en el nombre, insignia visible en builds no productivos. **La carga a
   producción falla si hay algún fixture presente.**
5. **Validá todo antes de escribir nada.** Abortá antes del primer insert. Nunca
   apliques parcialmente; nunca saltees en silencio un registro inválido.

## Estructura de contenido

```
content/artists/<slug>/
  artist.yaml       identidad, bio, ubicación, estilos, precio, disponibilidad, redes
  portfolio.yaml    por pieza: archivo, epígrafe, año, estilos + pesos
  consent.md        requerido
  media/            imágenes fuente (en gitignore — los originales quedan con el artista)
```

## Ejemplo de `artist.yaml`

```yaml
slug: luna-vera
display_name: Luna Vera
category: tattoo
location: caba
bio: |
  Trabajo fine line y botánico, en negro, con foco en composiciones chicas.
styles:
  - { slug: fine-line, proficiency: 1.0, primary: true }
  - { slug: botanical, proficiency: 1.0, primary: true }
  - { slug: minimalist, proficiency: 0.6, primary: false }
price:
  min_cents: 45000
  max_cents: 120000
  currency: ARS
  priced_at: 2026-08-10
availability:
  status: limited
  updated_at: 2026-08-10
contact:
  instagram: lunavera.tattoo
  whatsapp: "+5491155551234"
```

Las claves del archivo están en inglés porque mapean directo a columnas.
`botanical` tiene que existir en la taxonomía de `tattoo`, o la validación falla.

## Checklist de validación (Zod, en `packages/domain/src/content/`)

- Campos requeridos presentes y no vacíos
- `whatsapp` en E.164 válido; `instagram` un handle pelado, no una URL
- Todo slug de estilo existe para esa categoría
- Los pesos de estilo por pieza suman 1 ± 0,001
- `min ≤ max`; moneda ISO-4217; `priced_at` presente si hay precio
- `availability.updated_at` presente si hay estado
- Todo archivo de media existe, es JPEG/PNG/WebP/HEIC, ≤ 12 MB, con dimensiones
  legibles
- Existe registro de consentimiento y está fechado

## Pipeline

```
validar todo → redimensionar (sm 400 / md 900 / lg 1600, WebP) → blurhash
→ subir a Storage → upsert de filas → escribir audit_event
```

Idempotente — volver a correrlo produce el mismo resultado y no duplica media
(checksum en `media_assets`). Usa la service-role key, que existe solo acá. La
herramienta se niega a correr dentro de un contexto de Metro/Expo.

Siempre hacé una corrida en seco local contra `supabase start` antes de tocar un
proyecto hosteado.

## El etiquetado de estilos es un problema de calidad de producto

La calidad del match está acotada por la calidad del etiquetado. Las etiquetas
salen de la propia descripción del artista siempre que se pueda, y los artistas
pueden corregirlas. Los pesos por pieza ponen el estilo primario más arriba para
que una pieza con cinco etiquetas no pese más que una enfocada.

## Retiro

Despublicar de inmediato, borrar objetos de storage y filas, eliminar el
directorio de contenido — el mismo día hábil. Conservar solo el registro de
consentimiento/retiro y una entrada de auditoría.

## Anti-patrones

Bios placeholder que se leen como reales · Fotografía de tatuajes de banco de
imágenes · Un fixture con nombre humano verosímil · Cargar a producción sin
corrida en seco local · Etiquetas de estilo inventadas por quien agregó al
artista · Commitear media fuente · Un lote aplicado a medias · Una advertencia
donde corresponde una falla dura.

## Checklist de calidad

- [ ] Registro de consentimiento presente y fechado
- [ ] Toda la validación pasa localmente
- [ ] Corrida en seco contra Supabase local limpia
- [ ] Volver a correr es idempotente (sin media duplicada, sin filas duplicadas)
- [ ] Ninguna fila fixture en una corrida de producción
- [ ] Etiquetas de estilo revisadas contra la descripción del propio artista
- [ ] Tamaños derivados y blurhash generados
- [ ] `audit_event` escrito
