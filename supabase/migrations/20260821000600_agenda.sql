-- Tu semana: los turnos en un solo lugar.
--
-- Enmienda a ADR-018.
--
-- ## El hueco que esto cierra
--
-- ADR-018 construyó el horario, los huecos, el turno que nace del chat y la
-- restricción que impide que dos se pisen. Lo que nunca construyó es **dónde
-- mira un artista sus turnos**: cada uno vive adentro de la conversación de la
-- que salió, así que alguien con cinco turnos tiene que abrir cinco chats para
-- saber cómo viene su semana.
--
-- Un artista que usa MESH para *conseguir* turnos y otra cosa para
-- *manejarlos* es un artista que en algún momento deja de abrir MESH.
--
-- ## La decisión de privacidad que esto obliga a tomar
--
-- El artista **no puede leer el nombre de la persona**: `profiles` tiene una
-- política de lectura restringida a la fila propia, y con razón. Pero una
-- agenda que dice "un turno el jueves a las 15" sin decir con quién no sirve
-- para nada.
--
-- Así que: **con un turno confirmado, las dos partes ven el nombre para mostrar
-- de la otra.** No es un aflojamiento general — es exactamente el momento en
-- que dejan de ser desconocidos: acordaron una fecha para verse en persona.
-- Nadie puede correr un turno de tatuaje contra un identificador anónimo.
--
-- Lo que NO se abre: el correo, la foto, ni nada de `profiles` que no sea el
-- nombre que esa persona eligió mostrar. Y si no puso ninguno, no se inventa —
-- la función devuelve `null` y la pantalla lo dice.

/**
 * Los turnos propios que todavía no pasaron, de cualquiera de los dos lados.
 *
 * `security definer` por una sola cosa: leer `profiles.display_name` de la otra
 * parte. Todo lo demás saldría por RLS.
 *
 * El candado son los dos `or` del `where`: solo devuelve filas donde quien
 * llama es **una de las dos partes**. No recibe a quién consultar.
 *
 * Devuelve también `viewer_is_professional`, para que la pantalla sepa de qué
 * lado está sin tener que preguntarlo aparte — y para que no adivine mirando si
 * el nombre vino lleno.
 */
create or replace function public.get_my_appointments()
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  note text,
  conversation_id uuid,
  professional_id uuid,
  viewer_is_professional boolean,
  -- El nombre para mostrar de la OTRA parte. `null` si no puso ninguno.
  counterpart_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.starts_at,
    a.ends_at,
    a.note,
    a.conversation_id,
    a.professional_id,
    pro.owner_user_id = (select auth.uid()) as viewer_is_professional,
    case
      when pro.owner_user_id = (select auth.uid())
        then (select pr.display_name from public.profiles pr where pr.id = a.user_id)
      else pro.display_name
    end as counterpart_name
  from public.appointments a
  join public.professionals pro on pro.id = a.professional_id
  where a.status = 'scheduled'
    -- Solo lo que viene. Un turno que ya pasó es historia, y la agenda es para
    -- planificar; lo pasado se ve en el chat, donde además se puede reseñar.
    and a.ends_at >= now()
    and (
      a.user_id = (select auth.uid())
      or pro.owner_user_id = (select auth.uid())
    )
  order by a.starts_at;
$$;

revoke all on function public.get_my_appointments() from public, anon;
grant execute on function public.get_my_appointments() to authenticated;

comment on function public.get_my_appointments is
  'Los turnos propios que vienen, con el nombre de la otra parte. Enmienda a ADR-018.';
