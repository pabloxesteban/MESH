-- Reseñas: quién puede escribir una, y quién no puede hacerla desaparecer.
--
-- Una reseña es lo único en MESH que una persona dice sobre otra en público. Si
-- el candado falla, pasa una de dos cosas y las dos son graves: alguien reseña
-- a un artista con el que nunca estuvo, o un artista se limpia las reseñas
-- malas.
--
-- Los tres que sostienen todo el archivo:
--
--   · «sin turno no hay reseña»
--   · «el artista no puede tocar la reseña que le dejaron»
--   · «un turno que ya pasó no se cancela» — que suena de almanaque y es de
--     acá: cancelar el pasado borraría la reseña por `on delete cascade`.
--
-- Ver ADR-019.

begin;
select plan(20);

-- --- fixtures (como postgres) ------------------------------------------------

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000e1', 'se-tatuo@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000e2', 'no-se-tatuo@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000e3', 'artista-resenado@example.test');

insert into public.profiles (id) values
  ('aaaaaaaa-0000-0000-0000-0000000000e1'),
  ('aaaaaaaa-0000-0000-0000-0000000000e2'),
  ('aaaaaaaa-0000-0000-0000-0000000000e3')
on conflict (id) do nothing;

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000e1', id, 'resenable', 'Reseñable',
       'resenable', true, 'aaaaaaaa-0000-0000-0000-0000000000e3', now()
from public.categories where slug = 'tattoo';

-- Los turnos se insertan directo y no por `schedule_appointment`: la función
-- rechaza el pasado, y el pasado es justamente lo que hace falta acá.
insert into public.appointments
  (id, professional_id, user_id, starts_at, ends_at) values
  -- Ya pasó: este habilita.
  ('11111111-0000-0000-0000-0000000000e1',
   'cccccccc-0000-0000-0000-0000000000e1',
   'aaaaaaaa-0000-0000-0000-0000000000e1',
   now() - interval '10 days', now() - interval '10 days' + interval '2 hours'),
  -- Todavía no pasó: este no.
  ('11111111-0000-0000-0000-0000000000e2',
   'cccccccc-0000-0000-0000-0000000000e1',
   'aaaaaaaa-0000-0000-0000-0000000000e1',
   now() + interval '10 days', now() + interval '10 days' + interval '2 hours'),
  -- Otro que ya pasó, para el segundo tatuaje de la misma persona.
  ('11111111-0000-0000-0000-0000000000e3',
   'cccccccc-0000-0000-0000-0000000000e1',
   'aaaaaaaa-0000-0000-0000-0000000000e1',
   now() - interval '40 days', now() - interval '40 days' + interval '3 hours');

-- Cancelado y pasado: tampoco habilita. Se escribe a mano por el mismo motivo.
insert into public.appointments
  (id, professional_id, user_id, starts_at, ends_at, status, cancelled_at)
values
  ('11111111-0000-0000-0000-0000000000e4',
   'cccccccc-0000-0000-0000-0000000000e1',
   'aaaaaaaa-0000-0000-0000-0000000000e1',
   now() - interval '20 days', now() - interval '20 days' + interval '1 hour',
   'cancelled', now() - interval '25 days');

-- Una foto que es del artista, no de quien reseña.
insert into public.media_assets (id, bucket, path, mime_type, owner_user_id)
values (
  '22222222-0000-0000-0000-0000000000e1', 'reviews',
  'aaaaaaaa-0000-0000-0000-0000000000e3/22222222-0000-0000-0000-0000000000e1.jpg',
  'image/jpeg', 'aaaaaaaa-0000-0000-0000-0000000000e3'
);

-- --- somos quien NO se tatuó -------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e2","role":"authenticated"}';

-- **El test que sostiene todo lo demás.**
select throws_ok(
  $$insert into public.reviews
      (appointment_id, professional_id, user_id, rating, body)
    values ('11111111-0000-0000-0000-0000000000e1',
            'cccccccc-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e2', 5, 'Ni lo conozco')$$,
  '42501',
  null,
  'sin turno propio no se puede reseñar'
);

-- Ni robándole el turno a otra persona: `user_id` tiene que ser quien pregunta.
select throws_ok(
  $$insert into public.reviews
      (appointment_id, professional_id, user_id, rating)
    values ('11111111-0000-0000-0000-0000000000e1',
            'cccccccc-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e1', 1)$$,
  '42501',
  null,
  'ni reseñando a nombre del que sí fue'
);

-- --- somos quien SÍ se tatuó -------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e1","role":"authenticated"}';

select throws_ok(
  $$insert into public.reviews
      (appointment_id, professional_id, user_id, rating)
    values ('11111111-0000-0000-0000-0000000000e2',
            'cccccccc-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e1', 5)$$,
  '42501',
  null,
  'un turno que todavía no pasó no habilita a reseñar'
);

select throws_ok(
  $$insert into public.reviews
      (appointment_id, professional_id, user_id, rating)
    values ('11111111-0000-0000-0000-0000000000e4',
            'cccccccc-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e1', 1)$$,
  '42501',
  null,
  'un turno cancelado tampoco: no pasó'
);

select throws_ok(
  $$insert into public.reviews
      (appointment_id, professional_id, user_id, rating, media_id)
    values ('11111111-0000-0000-0000-0000000000e1',
            'cccccccc-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e1', 5,
            '22222222-0000-0000-0000-0000000000e1')$$,
  '42501',
  null,
  'no se puede colgar de una reseña la foto de otra persona'
);

select throws_ok(
  $$insert into public.reviews
      (appointment_id, professional_id, user_id, rating)
    values ('11111111-0000-0000-0000-0000000000e1',
            'cccccccc-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e1', 6)$$,
  '23514',
  null,
  'seis estrellas no existen'
);

select lives_ok(
  $$insert into public.reviews
      (id, appointment_id, professional_id, user_id, rating, body)
    values ('33333333-0000-0000-0000-0000000000e1',
            '11111111-0000-0000-0000-0000000000e1',
            'cccccccc-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e1', 5,
            'Escuchó lo que quería y lo mejoró')$$,
  'con un turno propio que ya pasó, sí'
);

select throws_ok(
  $$insert into public.reviews
      (appointment_id, professional_id, user_id, rating)
    values ('11111111-0000-0000-0000-0000000000e1',
            'cccccccc-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e1', 1)$$,
  '23505',
  null,
  'pero una sola vez por turno'
);

-- Dos tatuajes son dos experiencias, y las dos se pueden contar.
select lives_ok(
  $$insert into public.reviews
      (id, appointment_id, professional_id, user_id, rating)
    values ('33333333-0000-0000-0000-0000000000e2',
            '11111111-0000-0000-0000-0000000000e3',
            'cccccccc-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e1', 4)$$,
  'otro turno con el mismo artista sí permite otra reseña'
);

-- Editar lo suyo: se puede, y queda marcado.
select lives_ok(
  $$update public.reviews set body = 'Volví y volvería'
    where id = '33333333-0000-0000-0000-0000000000e1'$$,
  'la autora edita lo que escribió'
);

select isnt(
  (select updated_at from public.reviews
   where id = '33333333-0000-0000-0000-0000000000e1'),
  null,
  'y la edición queda marcada, sin que ella tenga que declararla'
);

-- Pero no puede mudar la reseña a otro turno: sería moverla de perfil.
select throws_ok(
  $$update public.reviews
    set appointment_id = '11111111-0000-0000-0000-0000000000e2'
    where id = '33333333-0000-0000-0000-0000000000e1'$$,
  '42501',
  null,
  'una reseña no se puede mover de turno'
);

-- --- somos el artista reseñado -----------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e3","role":"authenticated"}';

-- No lee la fila: la lectura pública pasa por `get_reviews`, que no devuelve
-- `user_id`. Que el artista no pueda leer la tabla es lo que hace que eso sea
-- una garantía y no una convención de la pantalla.
select is(
  (select count(*)::int from public.reviews),
  0,
  'el artista no lee las filas de las reseñas que le dejaron'
);

-- **El test que impide el borrado de la mala.**
with borradas as (
  delete from public.reviews
  where id = '33333333-0000-0000-0000-0000000000e1'
  returning 1
)
select is(
  (select count(*)::int from borradas),
  0,
  'el artista no puede borrar una reseña'
);

with editadas as (
  update public.reviews set rating = 5
  where id = '33333333-0000-0000-0000-0000000000e2'
  returning 1
)
select is(
  (select count(*)::int from editadas),
  0,
  'ni editarla'
);

-- La otra puerta, la de atrás: cancelar el turno del que nació la reseña.
select throws_ok(
  $$select public.cancel_appointment('11111111-0000-0000-0000-0000000000e1')$$,
  '22023',
  null,
  'y no puede cancelar un turno que ya pasó para que la reseña se caiga'
);

-- Lo que sí ve: lo mismo que cualquiera.
select is(
  (select count(*)::int
   from public.get_reviews('cccccccc-0000-0000-0000-0000000000e1')),
  2,
  'las reseñas de un perfil publicado las lee cualquiera'
);

-- El test que sostiene la promesa de privacidad de ADR-019: si algún día
-- alguien agrega `user_id` al `returns table`, esto falla antes de llegar a una
-- pantalla.
select is(
  (select count(*)::int
   from information_schema.columns
   where table_name = 'get_reviews'
     and column_name in ('user_id', 'reviewer', 'email', 'display_name')),
  0,
  'pero una reseña no dice quién la escribió'
);

select is(
  (select average from public.get_review_summary(
     'cccccccc-0000-0000-0000-0000000000e1')),
  4.5,
  'el promedio se calcula de verdad, no se guarda'
);

-- --- somos quien se tatuó, otra vez ------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e1","role":"authenticated"}';

-- Los dos turnos pasados ya están reseñados, así que no queda ninguno por
-- reseñar. Es lo que apaga el botón.
select is(
  (select count(*)::int from public.get_reviewable_appointments()),
  0,
  'un turno ya reseñado deja de ofrecerse para reseñar'
);

reset role;
select * from finish();
rollback;
