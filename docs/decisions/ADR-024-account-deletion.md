# ADR-024 — Borrar la cuenta, de verdad y desde la app

**Estado:** Aceptado (2026-08-21) · **Fecha:** 2026-08-21 · **Responsable:** security-reviewer

## Contexto

MESH no tenía forma de borrar una cuenta. Ni desde la app, ni escribiendo a
nadie: no había un camino.

Eso es tres cosas a la vez:

- **Un rechazo automático en la App Store.** La guía 5.1.1(v) exige borrado de
  cuenta desde adentro de la app, sin excepciones, desde 2022.
- **Un derecho incumplido.** La Ley 25.326 de Protección de Datos Personales
  reconoce el derecho de supresión, y no depende de que la app sea gratis.
- **Un bug esperando.** Ver abajo.

## El bug que apareció al escribir esto

Borrar un usuario que tuviera un perfil de artista **fallaba**.
`professionals.owner_user_id` es `on delete set null`, y la tabla tiene un check
que exige `(claimed_at is null) = (owner_user_id is null)`: al vaciar el dueño,
`claimed_at` quedaba lleno y la restricción rechazaba el borrado entero.

Nadie lo había visto porque nunca se había borrado una cuenta. Es exactamente la
clase de bug que aparece el día que alguien ejerce un derecho, y por eso está
cubierto por un test que falla si alguien vuelve a romperlo.

## Decisión

**Inmediato, completo, y sin período de gracia.**

### 1. Sin período de gracia

No hay "cuenta desactivada", no hay treinta días, no hay "te extrañamos".
Alguien que pide que lo borren pidió eso, no que lo guardemos por si cambia de
idea.

Lo que cuesta: alguien que se arrepiente perdió todo. Se acepta. Un período de
gracia es cómodo para nosotros y es exactamente la clase de fricción amable que
el innegociable 3 prohíbe en todas las demás superficies.

### 2. El perfil de artista se va con la persona, siempre

Aunque MESH lo haya curado. La fila lleva su nombre, sus fotos y su Instagram:
dejarla publicada porque "la armamos nosotros" sería retener justamente lo que
la persona pidió que no retengamos.

Volver a cargar un perfil curado es una corrida del seeder, y solo con un
consentimiento nuevo.

### 3. Los archivos primero, la base después

Es la decisión menos obvia y la que evita el peor final. En Supabase, borrar la
fila de `storage.objects` deja el archivo huérfano en el bucket: los archivos se
borran con la API de storage, no con SQL. Así que hay dos mitades, y el orden
importa:

- **Archivos → base:** si falla a mitad de camino, la cuenta sigue viva y se
  puede reintentar.
- **Base → archivos:** si falla a mitad de camino, quedan fotos de alguien que
  ya no existe **y nadie con sesión para pedir que se vayan**.

### 4. La Edge Function no usa la service key para borrar la cuenta

Usa la service key **solo** para los archivos. El borrado de la base lo hace
`delete_own_account()`, una función `security definer` que **no recibe a quién
borrar**: saca el id de `auth.uid()`.

Con la service key, un error de programación en esa llamada borra a cualquiera.
Con `auth.uid()`, el peor error posible es que alguien se borre a sí mismo.

### 5. Sobrevive el registro de que se borró

Una fila en `audit_events`: el uuid, la fecha, y si tenía perfil de artista.
Sin correo, sin nombre, sin nada de lo que había adentro.

`audit_events.actor_user_id` ya estaba sin clave foránea desde el primer día, y
el comentario de esa migración explicaba por qué: *"un CASCADE haría que borrar
la cuenta borrara la evidencia de haberla borrado"*. Esta ADR es la primera que
lo usa.

Está dicho en la pantalla de borrado, no en una nota al pie: es la parte que no
conviene contar, y por eso tiene que estar a la vista.

## Lo que NO está

- **Exportar tus datos antes de borrarlos.** La Ley 25.326 reconoce el derecho
  de acceso, y hoy se satisface porque todo está a la vista en la app. Un ZIP
  descargable es mejor y no está. Anotado.
- **Borrar por pedido escrito.** No hace falta: está el botón. Si alguien perdió
  el acceso a su cuenta y quiere borrarla, hoy no hay camino. Anotado.
- **Anonimizar en vez de borrar.** Se descartó: "anonimizado" es una promesa que
  no se puede verificar desde afuera, y borrado sí.

## Consecuencias

- Un turno que ya pasó se lleva su reseña, porque `reviews.appointment_id`
  cascadea. Una reseña sin autora no tendría cómo probar que hubo un turno.
- El artista del otro lado pierde la conversación entera. Es correcto: la
  conversación cuelga del `user_id` de la persona.
- La función se puede llamar dos veces sin daño: la segunda no encuentra nada.

## Dónde vive cada parte

| Qué | Dónde |
|---|---|
| El borrado de la base | `supabase/migrations/20260821000200_account_deletion.sql` |
| Que se borre todo, y que sobreviva el registro | `supabase/tests/56_account_deletion.sql` |
| Los archivos, y el orden | `supabase/functions/delete-account/index.ts` |
| La pantalla | `apps/mobile/src/features/account/DeleteAccount.tsx` |

## Referencias

- [ADR-002](ADR-002-authentication.md) — la sesión anónima, que también se borra
- [ADR-013](ADR-013-artist-self-signup.md) — los perfiles que ahora hay que poder borrar
- `docs/legal/privacy.md`
