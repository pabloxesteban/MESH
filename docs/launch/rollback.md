# Plan de retroceso

Qué hacer cuando algo sale mal después de publicar. Escrito **antes** de
necesitarlo, que es la única forma en que sirve.

## Principio

**El contenido y el código retroceden por caminos distintos.** Un problema de
contenido —un artista que quiere salir, una imagen equivocada— se resuelve en
minutos sin tocar la app. Un problema de código depende de las tiendas y tarda.
Confundirlos hace que un problema de minutos se trate como uno de días.

---

## Caso 1 — Un artista quiere salir

**Tiempo objetivo: el mismo día hábil. Sin release.**

1. `update professionals set is_published = false where slug = '…'` — sale del
   mazo y de los matches al instante, porque RLS filtra por `is_published`.
2. Borrar los objetos de storage de ese artista. **No alcanza con despublicar:**
   el bucket `portfolio` es de lectura pública, así que los objetos siguen
   alcanzables por URL directa hasta que se borren. Es el hallazgo 2 de la
   auditoría del 2026-08-18.
3. Borrar las filas: `portfolio_items`, `professional_styles`, `professionals`.
4. Borrar `content/artists/<slug>/` y anotar la fecha en `REMOVED.md`.
5. Escribir el `audit_event` de retiro.

Los matches ya calculados que apuntan a ese artista quedan con una FK en
cascada, así que desaparecen solos.

## Caso 2 — Contenido equivocado (imagen, precio, bio)

**Tiempo objetivo: una hora. Sin release.**

Corregir el YAML en `content/artists/`, correr `npm run content:validate` y
después `npm run content:seed`. La carga es idempotente y hace upsert sobre la
clave natural, así que solo cambia lo que cambió.

## Caso 3 — Un bug en el matching o en el gusto

**Sin release, si el bug es de datos. Con release, si es del motor.**

Los motores corren **en el cliente**, así que un bug en `packages/domain` está
en el bundle instalado y solo se arregla publicando. Lo que sí se puede hacer
sin release:

- **Despublicar** a los artistas involucrados, si el problema es que aparece
  quien no debería.
- `MATCHING_VERSION` y `TASTE_VERSION` quedan en cada fila de `matches` y
  `taste_profiles`, así que se puede saber exactamente qué versión produjo qué
  — y a quién avisarle.

## Caso 4 — Un problema de seguridad

**Tiempo objetivo: inmediato.**

1. **Si se filtró la service-role key:** rotarla en el panel de Supabase
   **antes** de arreglar el código. La clave rotada invalida a la vieja al
   instante; arreglar primero el código deja la ventana abierta mientras se
   arregla.
2. **Si una política de RLS está mal:** corregirla con una migración y
   aplicarla. No hace falta release — las políticas viven en la base.
3. **Si el problema está en el cliente:** despublicar el catálogo entero es la
   palanca más grande que existe sin release. Deja la app funcionando pero
   vacía, con el estado vacío honesto, mientras se prepara el arreglo.

## Caso 5 — Un release roto

**Tiempo objetivo: horas, y no depende de nosotros.**

- **iOS:** no se puede desinstalar un release. Sí se puede **quitar de la
  venta** desde App Store Connect y enviar un build de arreglo con revisión
  expedita. Quien ya lo instaló sigue con la versión rota hasta que actualice.
- **Android:** se puede **frenar el despliegue** en Play Console si es
  escalonado, y volver a un porcentaje menor. Es la razón por la que el primer
  release va escalonado.

**Consecuencia de diseño:** por eso el catálogo se puede despublicar desde la
base. Es la única palanca que funciona en minutos sobre una app ya instalada.

---

## Antes de publicar

- [ ] El despliegue de Android es escalonado, no al 100%.
- [ ] Alguien tiene acceso al panel de Supabase **y** a las dos tiendas.
- [ ] El procedimiento de retiro de un artista se probó de punta a punta con un
      fixture, cronometrado.
- [ ] La service-role key está en un solo lugar y se sabe cuál.
