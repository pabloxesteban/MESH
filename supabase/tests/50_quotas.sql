-- Cuotas. Un límite que solo vive en el cliente no es un límite.
--
-- Los tres se prueban desde el rol `authenticated`, que es desde donde se
-- intentaría evadirlos.

begin;
select plan(6);

insert into auth.users (id, email)
values ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@example.test');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';

-- --- 20 proyectos ------------------------------------------------------------

insert into public.projects (user_id, category_id, title)
select
  'aaaaaaaa-0000-0000-0000-00000000000a',
  (select id from public.categories where slug = 'tattoo'),
  'Proyecto ' || n
from generate_series(1, 20) as n;

select throws_ok(
  $$
    insert into public.projects (user_id, category_id, title)
    values (
      'aaaaaaaa-0000-0000-0000-00000000000a',
      (select id from public.categories where slug = 'tattoo'),
      'El 21'
    )
  $$,
  23514,
  null,
  'El proyecto 21 se rechaza del lado del servidor'
);

update public.projects set status = 'archived'
where title = 'Proyecto 1';

select lives_ok(
  $$
    insert into public.projects (user_id, category_id, title)
    values (
      'aaaaaaaa-0000-0000-0000-00000000000a',
      (select id from public.categories where slug = 'tattoo'),
      'Después de archivar'
    )
  $$,
  'Archivar libera lugar — la cuota no es una trampa sin puerta'
);

-- --- 10 referencias por proyecto ---------------------------------------------

insert into public.media_assets (bucket, path, mime_type, byte_size, owner_user_id)
select
  'references',
  'aaaaaaaa-0000-0000-0000-00000000000a/ref-' || n || '.webp',
  'image/webp', 1024, 'aaaaaaaa-0000-0000-0000-00000000000a'
from generate_series(1, 11) as n;

insert into public.project_references (project_id, media_id)
select
  (select id from public.projects where title = 'Proyecto 2'),
  id
from public.media_assets
where owner_user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'
order by path
limit 10;

select throws_ok(
  $$
    insert into public.project_references (project_id, media_id)
    select
      (select id from public.projects where title = 'Proyecto 2'),
      id
    from public.media_assets
    where owner_user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'
      and path like '%ref-9.webp'
  $$,
  23514,
  null,
  'La referencia 11 de un proyecto se rechaza'
);

select lives_ok(
  $$
    insert into public.project_references (project_id, media_id)
    select
      (select id from public.projects where title = 'Proyecto 3'),
      id
    from public.media_assets
    where owner_user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'
      and path like '%ref-9.webp'
  $$,
  'La cuota es por proyecto, no por persona'
);

-- --- 50 MB por persona -------------------------------------------------------

insert into public.media_assets (bucket, path, mime_type, byte_size, owner_user_id)
values (
  'references', 'aaaaaaaa-0000-0000-0000-00000000000a/grande.webp',
  'image/webp', 52400000, 'aaaaaaaa-0000-0000-0000-00000000000a'
);

select throws_ok(
  $$
    insert into public.media_assets (bucket, path, mime_type, byte_size, owner_user_id)
    values (
      'references', 'aaaaaaaa-0000-0000-0000-00000000000a/pasada.webp',
      'image/webp', 1048576, 'aaaaaaaa-0000-0000-0000-00000000000a'
    )
  $$,
  23514,
  null,
  'Pasarse de 50 MB se rechaza'
);

reset role;

select lives_ok(
  $$
    insert into public.media_assets (bucket, path, mime_type, byte_size)
    values ('portfolio', 'curada/gigante.webp', 'image/webp', 209715200)
  $$,
  'La media curada no tiene cuota — la sube el seeder, no una persona'
);

select * from finish();
rollback;
