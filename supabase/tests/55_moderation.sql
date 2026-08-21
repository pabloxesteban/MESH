-- Denunciar y bloquear: qué corta un bloqueo, y qué no ve el denunciado.
--
-- Cuatro garantías, y las dos del medio son las que hacen que esto sirva:
--
-- 1. **Una denuncia solo la ve quien la hizo.** El denunciado no sabe que
--    existe. Una denuncia visible es una denuncia que se responde.
--
-- 2. **Un bloqueo corta de verdad, del lado de la base.** No se abre un chat,
--    no se escribe en uno ya abierto, no llega una propuesta. Un bloqueo que
--    solo esconde se evade abriendo la app en otro lado.
--
-- 3. **Y corta en las dos direcciones.** Da igual quién bloqueó a quién.
--
-- 4. **Nadie puede preguntar si alguien más está bloqueado.** `is_blocked_pair`
--    es `security definer`, así que sin candado sería un oráculo público de
--    "¿fulano bloqueó a mengano?".
--
-- Ver ADR-023.

begin;
select plan(20);

-- --- fixtures (como postgres) ------------------------------------------------

delete from public.professionals;

insert into auth.users (id, email)
select ('aaaaaaaa-0000-0000-0000-0000000000e' || n)::uuid,
       'mod' || n || '@example.test'
from generate_series(1, 5) as n;

insert into public.profiles (id)
select ('aaaaaaaa-0000-0000-0000-0000000000e' || n)::uuid
from generate_series(1, 5) as n
on conflict (id) do nothing;

-- e1 busca · e2 es dueño de "Tinta Vieja" · e3 busca y no bloquea a nadie
-- e4 es dueño de "Otra Aguja" · e5 es un tercero curioso
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000e1', id, 'tinta-vieja', 'Tinta Vieja',
       'tintavieja', true, 'aaaaaaaa-0000-0000-0000-0000000000e2', now()
from public.categories where slug = 'tattoo';

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000e2', id, 'otra-aguja', 'Otra Aguja',
       'otraaguja', true, 'aaaaaaaa-0000-0000-0000-0000000000e4', now()
from public.categories where slug = 'tattoo';

-- Una conversación ya abierta entre e1 y Tinta Vieja: el caso normal es
-- bloquear DESPUÉS de haber hablado.
insert into public.conversations (id, user_id, professional_id) values
  ('dddddddd-0000-0000-0000-0000000000e1',
   'aaaaaaaa-0000-0000-0000-0000000000e1',
   'cccccccc-0000-0000-0000-0000000000e1');

insert into public.messages (id, conversation_id, sender_user_id, body) values
  ('11111111-0000-0000-0000-0000000000e1',
   'dddddddd-0000-0000-0000-0000000000e1',
   'aaaaaaaa-0000-0000-0000-0000000000e1', 'hola, cuánto sale algo chico');

-- Una búsqueda abierta de e1, con un estilo que Tinta Vieja hace.
insert into public.professional_styles (professional_id, style_id, proficiency, is_primary)
select 'cccccccc-0000-0000-0000-0000000000e1', id, 1.0, true
from public.styles where slug = 'fine-line';

insert into public.projects
  (id, user_id, category_id, title, status, is_open_to_professionals)
select 'ffffffff-0000-0000-0000-0000000000e1',
       'aaaaaaaa-0000-0000-0000-0000000000e1', id, 'Algo de línea fina',
       'active', true
from public.categories where slug = 'tattoo';

insert into public.project_styles (project_id, style_id, weight)
select 'ffffffff-0000-0000-0000-0000000000e1', id, 1
from public.styles where slug = 'fine-line';

-- --- somos e1, que denuncia --------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e1","role":"authenticated"}';

select throws_ok(
  $$insert into public.reports (reporter_user_id, target_kind, reason)
    values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'professional', 'spam')$$,
  '42501',
  null,
  'una denuncia sin objetivo no entra'
);

select lives_ok(
  $$insert into public.reports
      (reporter_user_id, target_kind, reason, professional_id, note)
    values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'professional',
            'stolen_work', 'cccccccc-0000-0000-0000-0000000000e1',
            'sube obra de otra persona')$$,
  'con objetivo, sí'
);

select throws_ok(
  $$insert into public.reports
      (reporter_user_id, target_kind, reason, professional_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'professional',
            'spam', 'cccccccc-0000-0000-0000-0000000000e1')$$,
  '23505',
  null,
  'pero no dos veces sobre lo mismo: denunciar diez veces no lo hace más urgente'
);

-- **El test que impide la sonda de existencia.**
select throws_ok(
  $$insert into public.reports
      (reporter_user_id, target_kind, reason, message_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'message', 'harassment',
            '11111111-0000-0000-0000-0000000000ff')$$,
  '42501',
  null,
  'ni un mensaje que no le llegó, ni para averiguar si ese id existe'
);

select lives_ok(
  $$insert into public.reports
      (reporter_user_id, target_kind, reason, message_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'message', 'harassment',
            '11111111-0000-0000-0000-0000000000e1')$$,
  'un mensaje de su propio hilo, sí'
);

select throws_ok(
  $$insert into public.reports
      (reporter_user_id, target_kind, reason, professional_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000e3', 'professional',
            'spam', 'cccccccc-0000-0000-0000-0000000000e2')$$,
  '42501',
  null,
  'y no puede denunciar a nombre de otra persona'
);

-- --- somos el denunciado -----------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e2","role":"authenticated"}';

-- **El test que sostiene la mitad del valor de una denuncia.**
select is(
  (select count(*)::int from public.reports),
  0,
  'el denunciado no sabe que existe una denuncia sobre él'
);

-- Antes de que lo bloqueen, la búsqueda SÍ le aparece en el mazo. Sin este
-- test, el cero de más abajo podría ser cero por cualquier otro motivo.
select is(
  (select count(*)::int from public.get_open_search_feed('tattoo')
   where project_id = 'ffffffff-0000-0000-0000-0000000000e1'),
  1,
  'antes del bloqueo, la búsqueda le aparece en el mazo'
);

-- --- e1 bloquea a Tinta Vieja ------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e1","role":"authenticated"}';

select lives_ok(
  $$insert into public.blocks (blocker_user_id, blocked_professional_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000e1',
            'cccccccc-0000-0000-0000-0000000000e1')$$,
  'la persona bloquea al perfil'
);

-- **El test que hace que un bloqueo signifique algo.**
select throws_ok(
  $$insert into public.messages (conversation_id, sender_user_id, body)
    values ('dddddddd-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e1', 'otra cosa')$$,
  '42501',
  null,
  'y deja de poder escribir en el hilo que ya tenía abierto'
);

select is(
  (select count(*)::int from public.get_artist_grid('tattoo')
   where professional_id = 'cccccccc-0000-0000-0000-0000000000e1'),
  0,
  'a quien bloqueó no lo vuelve a ver en la grilla'
);

-- --- el bloqueado intenta seguir -----------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e2","role":"authenticated"}';

select throws_ok(
  $$insert into public.messages (conversation_id, sender_user_id, body)
    values ('dddddddd-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000e2', 'hola?')$$,
  '42501',
  null,
  'el bloqueado tampoco escribe, y corta en las dos direcciones'
);

-- **El test que evita el oráculo.** El artista no puede leer la tabla de
-- bloqueos, y la función que sí sabe solo le contesta sobre él mismo.
select is(
  (select count(*)::int from public.blocks),
  0,
  'el bloqueado no puede leer la tabla de bloqueos'
);

select is(
  public.is_blocked_pair(
    'aaaaaaaa-0000-0000-0000-0000000000e1',
    'cccccccc-0000-0000-0000-0000000000e1'),
  true,
  'la función se lo dice, porque él es una de las dos partes'
);

-- Su mazo ya no trae la búsqueda de quien lo bloqueó.
select is(
  (select count(*)::int from public.get_open_search_feed('tattoo')
   where project_id = 'ffffffff-0000-0000-0000-0000000000e1'),
  0,
  'ni le aparece en el mazo la búsqueda de esa persona'
);

select throws_ok(
  $$insert into public.project_interests
      (project_id, professional_id, verdict,
       price_min_cents, price_max_cents, price_currency, sessions)
    values ('ffffffff-0000-0000-0000-0000000000e1',
            'cccccccc-0000-0000-0000-0000000000e1', 'interest',
            5000000, 9000000, 'ARS', 1)$$,
  '42501',
  null,
  'ni puede mandarle una propuesta adivinando el id de la búsqueda'
);

-- --- un tercero curioso ----------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e5","role":"authenticated"}';

-- **El test que impide que `security definer` se vuelva un oráculo público.**
select is(
  public.is_blocked_pair(
    'aaaaaaaa-0000-0000-0000-0000000000e1',
    'cccccccc-0000-0000-0000-0000000000e1'),
  false,
  'un tercero no puede averiguar si dos personas se bloquearon'
);

select is(
  (select count(*)::int from public.reports),
  0,
  'ni leer las denuncias de nadie'
);

select is(
  (select count(*)::int from public.blocks),
  0,
  'ni los bloqueos de nadie'
);

-- Y un artista solo bloquea a alguien con quien habló.
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e4","role":"authenticated"}';

select throws_ok(
  $$insert into public.blocks (blocker_user_id, blocked_user_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000e4',
            'aaaaaaaa-0000-0000-0000-0000000000e3')$$,
  '42501',
  null,
  'un artista no bloquea a alguien con quien nunca habló: sería una sonda de existencia'
);

reset role;
select * from finish();
rollback;
