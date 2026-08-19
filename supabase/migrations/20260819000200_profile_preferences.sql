-- Preferencias del perfil: qué vino a hacer la persona, y hasta dónde busca.
--
-- --- por qué "intención" y no "rol" ---------------------------------------
--
-- `profiles` dice desde su primera migración que ser profesional NO es una
-- columna de acá: es una fila en `professionals` con `owner_user_id`, y los
-- roles no son excluyentes — alguien puede tatuar y además usar MESH como
-- cliente. Eso sigue siendo cierto y esta columna no lo cambia.
--
-- Lo que sí necesitamos es saber qué mostrarle primero a alguien que recién
-- se registra, porque preguntárselo es más honesto que adivinar. Por eso la
-- columna se llama `onboarding_intent` y no `role`: es una preferencia de
-- arranque —qué pantalla abrís primero— y no una identidad. Elegir "ofrezco"
-- te lleva a canjear tu código de artista; no te da de alta como profesional.
-- El catálogo sigue siendo curado (ver `professional_claims`).
--
-- NULL = todavía no contestó. Es el estado con el que nace todo perfil, y es
-- lo que hace que la pregunta aparezca una sola vez.

create type public.onboarding_intent as enum ('offering', 'looking');

alter table public.profiles
  add column onboarding_intent public.onboarding_intent;

comment on column public.profiles.onboarding_intent is
  'Qué eligió hacer primero al registrarse. Preferencia de arranque, NO un rol excluyente: nadie deja de poder buscar por haber elegido "ofrezco". NULL = no contestó todavía.';

-- --- radio de búsqueda -----------------------------------------------------
--
-- En kilómetros, NULL = sin límite (el valor por defecto, y el que deja ver
-- el catálogo entero).
--
-- El filtro se aplica del lado del cliente, sobre distancias reales calculadas
-- con las coordenadas que las dos partes dieron. Lo que la base garantiza acá
-- es solo que el número guardado tenga sentido — un radio de 0 km o de 40.000
-- no es una preferencia, es un bug.
--
-- Qué NO hace este radio: descartar a un profesional que no publicó las
-- coordenadas de su estudio. Sin coordenadas no hay distancia que comparar, y
-- un dato faltante nunca puede parecer una mala respuesta (misma regla que la
-- omisión de componentes en `docs/product/matching.md` §4.2).

alter table public.profiles
  add column search_radius_km integer check (
    search_radius_km is null or search_radius_km between 1 and 200
  );

comment on column public.profiles.search_radius_km is
  'Radio de búsqueda en km. NULL = sin límite. Nunca descarta a un profesional sin coordenadas publicadas.';
