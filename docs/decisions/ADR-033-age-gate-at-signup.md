# ADR-033 — La pregunta de edad se muda del arranque a crear cuenta

**Estado:** Aceptado (2026-08-22) · **Fecha:** 2026-08-22 · **Responsable:** product-architect
**Enmienda a:** [ADR-025](ADR-025-age-gate.md), que sigue vigente en todo lo demás.

## Contexto

ADR-025 puso la pregunta de edad **antes que todo lo demás**, en el arranque
frío, justo después de instalar la app y antes incluso de elegir "busco" u
"ofrezco". La razón que dio fue real: es la única parte de MESH con una
consecuencia física del otro lado, y quien la descubre recién al pedir un turno
la descubre en el peor momento posible.

El dueño de producto probó esa pantalla y pidió sacarla, con un argumento
distinto: *"el usuario tiene que verificar su edad cuando se registra en la
app, entonces cuando la use nosotros ya sabemos qué edad tiene."* Vale la pena
decir dónde ese argumento no calza con cómo es hoy MESH, y qué se decidió en su
lugar.

**Lo que no es cierto todavía:** hoy no existe ningún paso de "registro" que
pregunte edad. La sesión arranca anónima (ADR-002) y crear una cuenta
—`upgradeToAccount()`— es simplemente convertir esa sesión anónima en una con
correo y contraseña, o vincularla a Google (ADR-015). Ninguno de los dos
caminos toca `adultConfirmedAt`. Si se saca la pregunta del arranque y no se la
pone en ningún otro lado, nadie la contesta nunca, y `schedule_appointment()`
—que es donde vive el candado real, sin cambios— rechaza cada turno para
siempre. Eso no es lo que se pidió; es lo que pasaría si se toma el pedido a la
letra sin resolver el "entonces dónde".

## Decisión

**La pregunta se muda del arranque a crear cuenta, y se queda ahí — nunca
antes de saber a qué vino la persona.**

Se dispara en `onDone` de crear cuenta (`app/cuenta/crear.tsx`), tanto por
correo como por Google — es el mismo callback en los dos caminos. **No** se
dispara al iniciar sesión con una cuenta existente: esa cuenta ya pasó por acá
una vez, o todavía no, y volver a preguntar en cada inicio de sesión sería
justo el "en cada pantalla" que ADR-025 §3 y D-012 (para otro permiso, mismo
principio) ya rechazan.

Todas las demás reglas de ADR-025 siguen intactas, sin excepción:

- Sigue siendo una sola pregunta, sin fecha de nacimiento.
- Decir que no **sigue sin guardar nada**, y sigue sin bloquear la cuenta
  recién creada — se termina de crear igual, declarada o no.
- El candado real sigue en `schedule_appointment()`, verificando a quien se va
  a tatuar. Nada de esto cambia: lo único que cambia es cuándo se ofrece la
  cortesía de preguntar antes de que haga falta.
- La fila en Configuración para declararlo después (`ConfiguracionScreen.tsx`)
  sigue existiendo — es el camino de quien creó la cuenta y dijo "todavía no",
  y también el único camino para quien nunca pasa por crear cuenta.

## Qué cambia en la práctica

- **Quien nunca crea una cuenta** —sigue siendo posible navegar, guardar y
  chatear entero en sesión anónima— nunca ve esta pregunta hasta que la
  declara a mano en Configuración, o hasta que un artista intenta darle un
  turno sin que la haya declarado, momento en el que `schedule_appointment()`
  frena igual que frenaba antes. No es una regresión: ADR-025 nunca prometió
  que la pregunta llegara antes de que hiciera falta para quien nunca se
  registra — prometía que no haría falta un documento, y eso sigue.
- **Quien crea una cuenta** la ve una vez, ahí, y no antes. Es el momento que
  el dueño de producto señaló como el correcto, y es coherente con que MESH ya
  trata "crear cuenta" como el punto donde se piden las cosas que sirven para
  algo (ADR-002 lo dice para el gusto; esto es lo mismo para la edad).
- **El arranque frío queda con una sola pregunta**, "busco o ofrezco", que es
  la que `IntentScreen` ya hacía. `OnboardingGate` deja de mostrar `AgeScreen`
  en ningún caso.

## Por qué no se descartó del todo

Sacarla de encima de `OnboardingGate` sin ponerla en ningún lado —la lectura
más literal del pedido— habría dejado a `schedule_appointment()` rechazando
turnos para siempre, incluidos los de personas mayores que jamás pasaron por
declarar nada. Eso reemplaza un problema de fricción por uno de producto roto,
y no es lo que nadie quiere. Mudarla a crear cuenta es la versión del pedido
que sigue siendo real.

## Dónde vive cada parte (actualiza la tabla de ADR-025)

| Qué | Dónde |
|---|---|
| La columna, la RPC y la puerta | `supabase/migrations/20260821000300_age_gate.sql` — sin cambios |
| Que la puerta corte | `supabase/tests/57_age_gate.sql` — sin cambios |
| La pregunta | `apps/mobile/src/features/onboarding/AgeScreen.tsx` — mismo componente, se monta desde un lugar distinto |
| Dónde se dispara | `apps/mobile/app/cuenta/crear.tsx`, ruta nueva `apps/mobile/app/cuenta/edad.tsx` |
| Declararlo después | `apps/mobile/src/features/account/ConfiguracionScreen.tsx` — sin cambios |

## Referencias

- [ADR-025](ADR-025-age-gate.md) — la decisión que esto enmienda, y que sigue rigiendo todo lo demás
- [ADR-002](ADR-002-authentication.md) — sesión anónima primero, cuenta cuando sirve para algo
- [ADR-018](ADR-018-availability.md) — los turnos, que son lo que la puerta protege
