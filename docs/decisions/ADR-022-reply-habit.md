# ADR-022 — Con qué frecuencia contesta, dicho con palabras

**Estado:** Aceptado (2026-08-20) · **Fecha:** 2026-08-20 · **Responsable:** product-architect

## Contexto

El ghosteo es el problema real del rubro, y tiene dos mitades. La primera —que
el pedido llegue incompleto y el tatuador no pueda cotizar sin hacer cinco
preguntas— la resuelven [ADR-020](ADR-020-brief.md) y
[ADR-021](ADR-021-brief-assistant.md).

La segunda es más simple y más incómoda: **algunos no contestan**. Alguien
escribe a cuatro tatuadores, tres nunca responden, y la conclusión que se lleva
no es "estos tres estaban ocupados" sino "esta app no sirve". Y quien sí
contesta rápido no gana nada por hacerlo, porque no se ve.

## Decisión

En el perfil, arriba del almanaque, **una línea de texto** con una de tres
frases, o nada:

- «Suele contestar en el día»
- «Suele contestar en unos días»
- «Suele tardar en contestar»

Debajo, siempre, de dónde sale: *«Calculado con sus conversaciones de los
últimos 90 días.»*

Se calcula al leer, en `get_reply_habit()`, sobre la mediana del tiempo entre el
primer mensaje de cada persona y la primera respuesta del artista. No se guarda
en ninguna columna, igual que el promedio de reseñas.

## Las cuatro reglas que lo mantienen honesto

1. **Una de las tres frases es mala.** Un indicador que solo puede decir cosas
   buenas es publicidad, y no sirve para decidir nada. Si la tercera frase no
   existiera, las otras dos tampoco tendrían por qué creerse.

2. **Una conversación sin contestar cuenta, y cuenta lenta.** Si se promediaran
   solo las contestadas, alguien que responde una de cada diez —rápido— se
   vería impecable: el ghosteo premiado exactamente por la métrica que existe
   para mostrarlo. Es la decisión que hace que esto signifique algo.

3. **Pero recién a las 72 horas.** Un mensaje de esta mañana sin responder no
   dice nada de nadie. Contarlo sería castigar a alguien por no haber leído
   todavía.

4. **Con menos de tres conversaciones no se dice nada.** Dos no son una
   costumbre, son una anécdota. Y `null` se dibuja como **nada** — ni un guion,
   ni un «sin datos»: una línea vacía igual ocupa lugar y sugiere que falta
   algo.

## Por qué esto no rompe los innegociables

**El 2 (nunca inventar).** No se inventa: sale de mensajes que ocurrieron, con
las fechas que tienen, y cuando no alcanza no se muestra. Es el mismo criterio
que ya se aplicó al promedio de reseñas.

**El 3 (nada de dark patterns).** Lo prohibido son las rachas, los puntos, los
niveles, las medallas y *cualquier número cuyo propósito sea que alguien vuelva
a entrar*. Esto no es un número: son tres palabras, no acumula, no sube ni baja
a la vista de nadie, **no ordena a nadie** —ni Inicio ni Explorar lo usan para
rankear— y no le pide a nadie que vuelva.

Donde sí roza el límite es en la presión sobre el artista, y hay que decirlo:
esto empuja a contestar. Se acepta porque contestar es el trabajo, no una
métrica de compromiso — y se acota con la regla 3, que le da 72 horas a
cualquiera antes de que nada cuente.

## Lo que se resigna

- **El artista no lo puede apagar.** Es la decisión más discutible de esta ADR.
  Un indicador apagable se apaga justamente en los perfiles donde importaría,
  y entonces "no lo muestra" pasa a significar lo mismo que la tercera frase,
  pero sin haberlo dicho. A cambio, **el artista lo ve en su Estudio**: un
  indicador público sobre una persona que esa persona no puede ver sería una
  calificación a sus espaldas.
- **No distingue "no contestó" de "contestó por Instagram".** Alguien que
  contesta afuera de MESH se ve lento acá. Es una limitación real y no tiene
  arreglo bueno: MESH no puede leer otro canal, y preguntar "¿contestaste por
  otro lado?" sería un dato declarado, o sea inventado.
- **No dice cuántas conversaciones tiene.** A propósito: el tamaño de la
  muestra es un dato sobre su negocio, y la función devuelve un solo valor de un
  enum de tres para que nadie pueda reconstruirlo llamándola en loop.

## Lo que NO está

- Un porcentaje, un puntaje o una cantidad de mensajes.
- Ordenar, filtrar o destacar por esto en ninguna pantalla.
- Notificarle a nadie que su indicador cambió. Sería exactamente la
  notificación carnada que el innegociable 3 sigue prohibiendo.
- Mostrarlo en fixtures: un registro de prueba no tiene conversaciones.

## Referencias

- `supabase/migrations/20260820000700_reply_habit.sql`
- `supabase/tests/54_reply_habit.sql`
- [ADR-012](ADR-012-chat.md) — el chat del que salen estos datos
- [ADR-019](ADR-019-reviews.md) — el mismo criterio, aplicado a las reseñas
- [ADR-021](ADR-021-brief-assistant.md) — la otra mitad del ghosteo
