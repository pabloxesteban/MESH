# ADR-025 — Mayoría de edad: una pregunta, ninguna fecha de nacimiento

**Estado:** Aceptado (2026-08-21) · **Fecha:** 2026-08-21 · **Responsable:** product-architect

## Contexto

Hasta [ADR-018](ADR-018-availability.md), MESH mostraba gente. Desde ADR-018,
**arregla turnos**.

Un turno de tatuaje para un menor de edad sin consentimiento de sus padres es
ilegal en Argentina, y una app que lo arregla sin preguntar nada es la que se lo
puso fácil. No es un detalle de cumplimiento: es la única parte de MESH con una
consecuencia física del otro lado.

## Decisión

**Una pregunta, sí o no, antes de todo lo demás. Y nada más que eso.**

### 1. No se pide la fecha de nacimiento

Con una fecha de nacimiento tendríamos un dato personal sensible de cada persona
para calcular un booleano que ya nos dieron. Con un documento tendríamos un
problema mucho más grande que el que vinimos a resolver.

Se guarda **cuándo lo declaró**, y nada más. Es una declaración y como toda
declaración se puede mentir; lo que hace es correr la responsabilidad y dejar
rastro con fecha. La verificación de verdad la hace el tatuador en persona, que
es donde tiene sentido hacerla.

### 2. Decir que no, no se guarda

Un `null` es "no lo confirmó", y ahí caen por igual quien dijo que no y quien
todavía no contestó.

Guardar «declaró ser menor» sería armar un **registro de menores de edad**, que
es justo lo que no queremos tener. El precio es que la pregunta vuelve en la
próxima sesión; es un precio bajo comparado con esa tabla.

### 3. Decir que no, no cierra la app

Se puede seguir mirando obra y guardando lo que gusta. Lo único que no se puede
es cerrar un turno.

Un muro completo empuja a mentir, que es el resultado exactamente contrario al
buscado. Alguien de dieciséis que puede mirar tranquilo no tiene por qué
declarar una edad falsa; alguien a quien la app le cierra la puerta, sí.

### 4. Se chequea en el servidor, y sobre la persona correcta

La puerta vive adentro de `schedule_appointment()`, no en la pantalla, porque una
pantalla se saltea.

Y verifica a **la persona que se va a tatuar**, no a quien llama. Quien llama es
el artista —es él quien asigna el turno desde el chat, ver ADR-018— así que
preguntar por `auth.uid()` habría verificado la edad del tatuador, que no es el
punto. Hay un test que falla exactamente si alguien confunde eso.

### 5. La declaración no se mueve ni se deshace

`confirm_adult()` es idempotente: la primera declaración es la que vale y la que
quedó con su hora. Si volver a llamarla moviera la fecha, bastaría con tocar el
botón de nuevo para borrar el rastro de cuándo se dijo.

Y no hay función para desdecirse: desdecirse sería borrar ese rastro. Quien se
equivocó borra la cuenta, que sí se puede ([ADR-024](ADR-024-account-deletion.md)).

### 6. Un SQLSTATE propio

`M0018`, y no `42501`. Ese código ya significa "esta conversación no es tuya", y
el artista necesita leer dos cosas distintas: una la arregla él, la otra la tiene
que arreglar la persona. La clase `M0` no colisiona con ninguna estándar de
Postgres.

## Lo que NO está

- **Verificación real de edad.** Ni documento, ni tarjeta, ni un proveedor de
  identidad. Sería más dato del que estamos dispuestos a guardar, y no evita el
  caso que importa: el tatuador ve a la persona antes de tatuarla.
- **Bloquear el chat.** Un menor preguntando cuánto sale un tatuaje no está
  haciendo nada ilegal. Lo que se bloquea es cerrar el turno.
- **Preguntar la edad al artista.** Si un menor abre un perfil profesional, eso
  es un problema laboral y de habilitación, no de esta puerta.

## Consecuencias

- Los tests de turnos que ya existían empezaron a fallar el día que esto entró,
  porque ninguno declaraba edad. Se arreglaron en el fixture, con un comentario
  que dice por qué — no aflojando la puerta.
- Quien tocó «todavía no» en el arranque tiene una fila en Perfil para
  declararlo después. Sin eso, descubriría el bloqueo recién cuando un artista
  no le puede dar un turno, que es el peor momento posible.

## Dónde vive cada parte

| Qué | Dónde |
|---|---|
| La columna, la RPC y la puerta | `supabase/migrations/20260821000300_age_gate.sql` |
| Que la puerta corte | `supabase/tests/57_age_gate.sql` |
| La pregunta | `apps/mobile/src/features/onboarding/AgeScreen.tsx` |
| Declararlo después | `apps/mobile/src/features/account/AccountScreen.tsx` |

## Referencias

- [ADR-018](ADR-018-availability.md) — los turnos, que son lo que esto protege
- [ADR-024](ADR-024-account-deletion.md) — la única forma de deshacer una declaración
- `docs/legal/terms.md`
