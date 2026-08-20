# ADR-019 — Reseñas: una por turno, y el artista no las toca

**Estado:** Aceptado (2026-08-20) · **Fecha:** 2026-08-20 · **Responsable:** product-architect

## Contexto

Tatuarse es caro, duele y no se deshace. La decisión de escribirle a un
desconocido para que te haga algo permanente en el cuerpo se toma con muy poca
información: hoy, en MESH, con la obra que subió y nada más.

El pedido fue explícito: *"vamos a crear una sección de reseñas donde los
clientes puedan dejar una review, un comentario, una foto y estrellas. Esto es
para dar garantía a futuros clientes que estén evaluando la posibilidad de
tatuarse."*

Y una segunda decisión, tomada por separado: **solo reseña quien tuvo un turno
confirmado.**

Lo que hay que evitar es conocido, porque es lo que le pasó a todas las
plataformas de reseñas: reseñas compradas, reseñas de venganza de gente que
nunca fue, y artistas que se limpian las malas. Las tres se resuelven en el
esquema o no se resuelven.

## Decisión

### 1. Una reseña cuelga de un TURNO

`reviews.appointment_id` es `not null unique` con `on delete cascade`. No hay
forma de escribir una reseña que no salga de un turno.

Es lo que convierte esto en evidencia en vez de opinión: la fila existe porque
hubo un turno, ese turno tenía fecha, y esa fecha ya pasó. Sin el turno de por
medio, "reseñas" es un formulario público, y un formulario público sobre
personas es donde termina peleándose gente que nunca se conoció.

**Una por turno, no una por artista.** Quien se tatuó tres veces con la misma
artista deja tres reseñas. Son tres experiencias distintas y contarlas una sola
vez borraría dos.

### 2. El candado está en la política, no en la app

```sql
create policy reviews_insert_after_appointment on public.reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.appointments a
      where a.id = reviews.appointment_id
        and a.user_id = (select auth.uid())
        and a.professional_id = reviews.professional_id
        and a.status = 'scheduled'
        and a.ends_at < now()
    )
    ...
  );
```

Cuatro condiciones y todas hacen falta: el turno es suyo, es con ese artista, no
está cancelado, y **ya pasó**. "Ya pasó" es `ends_at < now()` porque no existe
un estado "completado" — ver [ADR-018](ADR-018-availability.md): un estado que
nadie marca queda para siempre en su valor inicial, mintiendo.

La app no repite el predicado. Para dibujar el botón pregunta
`get_reviewable_appointments()`, que consulta la misma regla. Una segunda copia
en TypeScript es una copia que se desactualiza.

### 3. Un turno que ya pasó no se cancela

**Esto enmienda [ADR-018](ADR-018-availability.md)**, que no lo había previsto.

Sin esta condición, un artista con una reseña de una estrella la hace
desaparecer cancelando el turno del que nació: el `cascade` borra la fila. La
puerta de atrás no era evidente hasta que existieron las reseñas.

Además es correcto por sí solo. Cancelar es liberar un horario, y un horario que
ya pasó no se libera.

### 4. La reseña es del cliente, y el artista no la toca

El artista no aparece en ninguna política de escritura de `reviews`: no la
escribe, no la edita, no la borra. Tampoco lee la tabla.

La autora sí puede editar la suya, y **la pantalla dice "Editada"**. Una reseña
que se puede reescribir sin que se note es peor evidencia que una que no se
puede editar. Las columnas que atan la reseña a su turno las congela un trigger:
editar es cambiar lo que dijo, no mover la reseña a otro perfil.

### 5. Se muestra que pasó, no quién

`reviews` lleva `user_id`, así que la política de SELECT de la tabla es **solo
lo propio**. Lo público sale de `get_reviews()`, que devuelve columnas elegidas
a mano y ninguna identifica a nadie — mismo patrón que `get_busy_slots` y
`get_top_saved`.

La reseña de un tatuaje dice dónde estuvo una persona y qué se hizo en el
cuerpo. Firmarla con su nombre tiene que ser una decisión suya, y nadie la
tomó. Lo que un futuro cliente necesita saber es que **hubo un turno**, y eso se
muestra: cada reseña lleva la fecha del turno, no la de la reseña.

Que el artista pueda deducir quién fue mirando su propia agenda es cierto y no
cambia nada: esconderlo de él sería teatro, y publicarlo para el resto de CABA
es otra cosa.

### 6. El promedio se calcula al leer

`get_review_summary()` hace `round(avg(rating), 1)`. No hay ninguna columna
`rating_average` ni ningún contador.

Un agregado denormalizado se desincroniza en silencio, y el número que MESH
muestra sobre una persona tiene que ser cierto. Con cero reseñas devuelve `null`
y la pantalla lo dice con palabras: cinco estrellas vacías se leen como una
puntuación de cero, y un "5,0" sobre cero reseñas es una mentira redonda.

### 7. Las estrellas son lo único obligatorio

Comentario y foto son opcionales. La foto es la parte más útil de una reseña de
tatuaje —es el trabajo ya hecho, y es lo más difícil de falsificar— pero pedirla
obliga a inventar, igual que un comentario obligatorio se llena con "todo bien".

El bucket `reviews` es de **lectura pública**, y por eso la pantalla lo dice
antes de subir nada: *"la foto se va a ver en el perfil del artista, junto con
tu reseña"*. Después de subirla ya no sirve avisar.

## Lo que NO está

- **La respuesta del artista.** Es lo que más se pide después de tener reseñas,
  y es su propia decisión: una respuesta cambia el balance de la sección, y mal
  hecha convierte la reseña en una discusión. Va con su ADR.
- **Reportar una reseña.** Hoy no hay moderación de nada en MESH. Cuando exista,
  es un sistema y no un botón.
- **Ordenar por "más útil" ni destacar ninguna.** De la más nueva a la más
  vieja. Cualquier orden con criterio propio es el lugar donde después se
  esconde la mala.
- **Reseñas del artista sobre el cliente.** MESH no le pone puntaje a la gente
  que busca.
- **Reseñas en los registros de prueba.** Los quince perfiles ficticios no
  tuvieron turnos, así que no pueden tener reseñas, y el perfil ni siquiera
  dibuja la sección para ellos. Ver `docs/product/content-policy.md`.

## Consecuencias

- **Quien se tatuó antes de MESH no puede reseñar.** Es el costo de la decisión
  y es real: un artista con veinte años de trabajo arranca en cero. La
  alternativa —dejar reseñar sin turno— hace que la primera reseña falsa
  aparezca la primera semana.
- Un turno cancelado no habilita a reseñar, aunque la persona haya ido igual.
  Si el turno se cargó y después se canceló, para el sistema no pasó.
- Borrar una cuenta borra sus reseñas (`on delete cascade` desde `profiles`).
  El promedio del artista cambia, y eso es correcto: la reseña era de esa
  persona.
- La foto de una reseña cuenta contra la cuota de storage de quien la subió,
  igual que el resto.

## Referencias

- `supabase/migrations/20260820000400_reviews.sql`
- `supabase/tests/51_reviews.sql` — el candado y el borrado por la ventana de
  atrás, como tests
- `apps/mobile/src/features/reviews/` — las dos pantallas
- [ADR-018](ADR-018-availability.md) — el almanaque, que esto enmienda
