---
name: database-design
description: Convenciones de esquema para MESH — nombres, claves, restricciones, enums, índices, comportamiento de borrado y migraciones. Usala al agregar o cambiar cualquier tabla, columna o índice.
---

# Diseño de base de datos

## Propósito

Un esquema que se mantiene agnóstico de categoría, impone sus propias reglas, y
nunca le deja la autorización al cliente.

## Cuándo usarla

Cualquier migración. Cualquier entidad, columna, índice o restricción nueva.

## Reglas

1. **Ninguna columna específica de categoría.** Nada `tattoo_*`. El test de
   aceptación: agregar *fotografía* necesita filas en `categories`/`styles` y
   archivos de contenido — sin migración.
2. **Claves primarias UUID v4** (`gen_random_uuid()`). Los enteros secuenciales
   filtran el tamaño del catálogo y habilitan enumeración.
3. **Toda clave foránea declara el comportamiento de borrado explícitamente.**
   `cascade` para hijos poseídos, `restrict` para datos de referencia que no
   pueden desaparecer bajo filas vivas, `set null` para vínculos opcionales.
4. **Las restricciones van en la base, no en TypeScript.** Si el cliente es lo
   único que impide un estado inválido, ese estado es alcanzable.
5. **Enums para conjuntos cerrados** (`availability_status`,
   `interaction_verdict`, `project_status`). **Tablas para conjuntos abiertos**
   (estilos, categorías, ubicaciones).
6. **Todo índice tiene una consulta con nombre detrás.** Nada de índices
   especulativos.
7. **`created_at` en todo**, `updated_at` en todo lo mutable vía un trigger
   compartido.
8. **Sin borrado lógico.** `is_published` cubre el caso real; un `deleted_at` en
   cada tabla duplica las formas en que cada política y cada consulta pueden
   estar mal.
9. **Las políticas RLS van en la misma migración que la tabla.**

## Nombres

`snake_case`, tablas en plural, columnas en singular. Las tablas de unión son
`<a>_<b>` con PK compuesta (`professional_styles`, `portfolio_item_styles`). Los
booleanos se leen como afirmaciones (`is_published`, `is_saved`). El dinero es
`*_cents integer` más `*_currency char(3)` — nunca `float`.

Todo en inglés: nombres de tablas, columnas, enums, índices y funciones.

## Ejemplos de restricciones

```sql
-- guardar no puede coexistir con un paso
check (not (is_saved and verdict = 'pass'))

-- un profesional publicado tiene que ser contactable
check (not is_published or whatsapp_e164 is not null or instagram_handle is not null)

-- sanidad de precio, y una fecha para saber qué tan viejo está
check (price_min_cents is null or price_max_cents is null
       or price_min_cents <= price_max_cents)
check (price_min_cents is null or priced_at is not null)

-- la disponibilidad tiene que llevar su propia frescura
check (availability_status is null or availability_updated_at is not null)

-- E.164
check (whatsapp_e164 is null or whatsapp_e164 ~ '^\+[1-9]\d{7,14}$')
```

## Migraciones

Numeradas, solo hacia adelante, un asunto por archivo. Nunca se editan después de
aplicarse a staging. Los datos de referencia se cargan de forma idempotente
(`on conflict do update`). Toda migración se verifica con `supabase db reset`
localmente antes de salir de la máquina.

## Anti-patrones

Una tabla agregada "para después" · Una partición 1:1 sin diferencia de
comportamiento · Dos representaciones del mismo hecho · Contadores
desnormalizados sin plan de reconciliación · `float` para dinero · `text` donde
corresponde un enum · Una clave foránea nullable que en realidad es requerida ·
Un índice sin consulta · Editar una migración ya aplicada · Lógica de negocio en
un trigger donde alcanzaba una restricción.

## Checklist de calidad

- [ ] Agnóstico de categoría
- [ ] Comportamiento de borrado explícito en cada FK
- [ ] Invariantes expresados como restricciones
- [ ] Índices justificados por una consulta con nombre
- [ ] RLS habilitado, forzado, políticas en el mismo archivo
- [ ] `supabase db reset` limpio
- [ ] Tipos TS regenerados y coincidiendo con `packages/domain`
- [ ] `docs/architecture/data-model.md` actualizado en el mismo commit
