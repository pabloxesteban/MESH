-- Con qué frecuencia contesta un artista, calculado de sus conversaciones.
--
-- Ver ADR-022.
--
-- ## Por qué esto no rompe el innegociable 2
--
-- No se inventa nada y no se guarda nada: se calcula al leer, igual que el
-- promedio de reseñas. Sale de mensajes que ocurrieron, con las fechas que
-- tienen. Un perfil sin datos suficientes **no muestra nada** en vez de mostrar
-- un valor por default — que es exactamente la diferencia entre informar y
-- adornar.
--
-- ## Por qué esto no es un dark pattern
--
-- No es un puntaje, no es una medalla, no es un porcentaje y no ordena a nadie.
-- Son tres palabras, y una de las tres es mala. Un indicador que solo puede
-- decir cosas buenas es publicidad; este puede decir "suele tardar", y por eso
-- sirve para decidir.
--
-- ## Las dos decisiones difíciles
--
-- 1. **Una conversación sin respuesta cuenta como lenta**, no se descarta. Si
--    solo se promediaran las contestadas, alguien que contesta una de cada diez
--    —rápido— se vería impecable. Eso sería el ghosteo premiado por la métrica
--    que existe para mostrarlo.
--
-- 2. **Pero solo después de 72 horas.** Una conversación de esta mañana todavía
--    no dice nada: se excluye. Contarla como lenta castigaría a alguien por no
--    haber contestado un mensaje que llegó recién.

create type public.reply_habit as enum ('same_day', 'few_days', 'slower');

comment on type public.reply_habit is
  'Con qué frecuencia contesta un artista. Tres tramos, uno de ellos malo. Ver ADR-022.';

/**
 * El hábito de respuesta de un artista, o `null` si todavía no se puede decir.
 *
 * `security definer` porque cruza conversaciones de personas distintas, y RLS
 * —correctamente— solo le deja ver a cada una la suya. Lo que devuelve es un
 * único valor de un enum de tres: ninguna fecha, ningún conteo, ninguna
 * identidad. Alguien que llamara esto en loop no puede reconstruir con quién
 * habló el artista ni cuántas conversaciones tiene.
 */
create or replace function public.get_reply_habit(p_professional_id uuid)
returns public.reply_habit
language sql
stable
security definer
set search_path = ''
as $$
  with duenio as (
    select p.owner_user_id
    from public.professionals p
    where p.id = p_professional_id
  ),
  preguntas as (
    -- La primera vez que la persona escribió en cada conversación.
    select
      c.id as conversation_id,
      min(m.created_at) as preguntado_a_las
    from public.conversations c
    join public.messages m
      on m.conversation_id = c.id
     and m.sender_user_id = c.user_id
    where c.professional_id = p_professional_id
      and c.created_at > now() - interval '90 days'
    group by c.id
  ),
  respuestas as (
    select
      q.conversation_id,
      q.preguntado_a_las,
      (
        select min(m.created_at)
        from public.messages m, duenio d
        where m.conversation_id = q.conversation_id
          and m.sender_user_id = d.owner_user_id
          and m.created_at > q.preguntado_a_las
      ) as contestado_a_las
    from preguntas q
  ),
  demoras as (
    select
      case
        when contestado_a_las is not null
          then extract(epoch from contestado_a_las - preguntado_a_las)
        -- Sin respuesta y con más de 72 horas encima: cuenta, y cuenta lenta.
        -- El número es un centinela grande, no una medición.
        else 86400 * 999
      end as segundos
    from respuestas
    where contestado_a_las is not null
       or preguntado_a_las < now() - interval '72 hours'
  ),
  mediana as (
    select
      count(*) as n,
      percentile_cont(0.5) within group (order by segundos) as p50
    from demoras
  )
  select case
    -- Menos de tres conversaciones no es una costumbre, es una anécdota.
    when (select n from mediana) < 3 then null
    when (select p50 from mediana) < 86400 then 'same_day'
    when (select p50 from mediana) < 86400 * 3 then 'few_days'
    else 'slower'
  end::public.reply_habit;
$$;

revoke all on function public.get_reply_habit(uuid) from public, anon;
grant execute on function public.get_reply_habit(uuid) to authenticated;

comment on function public.get_reply_habit is
  'Tres tramos calculados al leer, o null si no hay datos suficientes. Nunca un número, nunca un orden. Ver ADR-022.';
