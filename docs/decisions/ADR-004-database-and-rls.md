# ADR-004 — Postgres + RLS como única capa de autorización

**Estado:** Propuesto · **Fecha:** 2026-08-17 · **Responsables:** backend-engineer, security-reviewer

## Contexto

El cliente le habla directamente a Supabase con una anon key publicable. No hay
ningún servidor de aplicación entre la app y la base. La app guarda el gusto de
las personas, sus trabajos guardados, sus briefs de proyecto, sus imágenes de
referencia, y los datos de contacto de los artistas.

## Problema

¿Dónde vive la autorización, y cómo garantizamos que nunca publiquemos una tabla
accidentalmente legible por cualquiera?

## Opciones

**A. Autorización en las consultas del cliente.** Cada consulta filtra por el
usuario actual. Rápido de escribir, y un `.eq()` olvidado es una filtración.

**B. Una capa de servidor entre la app y la base.** Familiar, y reintroduce el
servidor que elegimos Supabase para evitar — más su propia autenticación,
despliegue y escalado.

**C. RLS como único límite.** Las políticas en Postgres deciden qué puede ver
cada pedido, sin importar qué pida el cliente.

**D. RLS más una capa de servidor.** Las dos. La más fuerte, y aproximadamente
el doble de trabajo.

## Decisión

**Opción C**, con estas reglas hechas obligatorias y verificadas por máquina:

1. Toda tabla de `public` tiene RLS **habilitado y forzado**.
2. `revoke all` de `anon` y `authenticated`, y después grants explícitos por
   verbo.
3. Políticas por comando; **ninguna política `for all`**.
4. Toda política `for insert` tiene un `with check`.
5. La propiedad siempre es `auth.uid()` — nunca un id provisto por el cliente.
6. `SECURITY DEFINER` solo donde haga falta, con `set search_path = ''` y sin
   identificadores interpolados.
7. **El CI falla** si alguna tabla de `public` tiene RLS apagado, force apagado,
   o cero políticas.
8. Existen tests de acceso cruzado para cada tabla de propiedad de usuario.

## Por qué

El cliente no es confiable y no lo podemos modificar: cualquiera puede leer el
bundle, tomar la anon key y llamar a PostgREST directamente. Bajo la opción A, la
seguridad de los datos de todas las personas depende de la corrección de cada
consulta que se haya escrito jamás — una garantía que se degrada con cada commit.
Bajo la opción C, un filtro olvidado en el cliente es un bug de *corrección*: la
consulta devuelve las filas propias de esa persona en lugar del subconjunto que
se pretendía, y no se filtra nada.

`FORCE ROW LEVEL SECURITY` se incluye deliberadamente: sin eso, el dueño de la
tabla saltea sus propias políticas, lo que haría pasar tests que deberían fallar.

La regla 7 es la que sostiene todo. Enumerar políticas a mano en el momento de
revisión no escala más allá de unas pocas tablas y falla exactamente cuando
alguien está apurado. Un test sobre `pg_tables` y `pg_policies` hace que "una
tabla sin políticas" sea impublicable.

La opción D se descartó por costo, no por mérito — para una sola persona, la
segunda capa sería más superficial y menos testeada que la primera, y una segunda
capa superficial genera falsa confianza.

## Consecuencias

- Algunas lecturas necesitan RPCs `SECURITY INVOKER` (el feed de descubrimiento)
  para mantenerse en un round trip. Esas funciones se revisan con el mismo
  cuidado que las políticas.
- Los predicados de las políticas aparecen en los planes de consulta; las
  subconsultas `EXISTS` de `media_assets` y de las políticas de portfolio tienen
  que estar indexadas, o cada lectura de imagen las paga.
- Los archivos de migración son más largos, porque cada uno lleva sus propias
  políticas. Ese es el punto: el esquema y su autorización llegan juntos o no
  llegan.
- El desarrollo local requiere Docker para `supabase start`, porque los tests de
  RLS necesitan una base de datos real.
