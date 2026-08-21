# ADR-021 — El asistente: hablar para pedir, no llenar un formulario

**Estado:** Aceptado (2026-08-20) · **Fecha:** 2026-08-20 · **Responsable:** product-architect

## Contexto

El circuito de [ADR-020](ADR-020-brief.md) funciona cuando la persona **sube una
foto**. Pero la mitad de las veces no hay foto: hay una idea a medias, escrita
con las palabras que uno tiene, no con las de la taxonomía. "Algo para mi
viejo", "una frase chiquita en la muñeca", "quiero taparme una cicatriz".

Esa persona hoy tiene dos caminos y los dos son malos:

- **El formulario.** Elegir estilo, zona, tamaño y paleta de cuatro listas. Es
  pedirle el vocabulario del oficio a alguien que vino justamente porque no lo
  tiene.
- **El chat directo.** Escribirle a un tatuador "hola, cuánto sale un tatuaje".
  De ahí salen cuatro días de idas y vueltas para llegar a los mismos cuatro
  datos, y de ahí sale el ghosteo — de los dos lados, porque un mensaje sin
  información no se puede contestar sin trabajo.

El pedido del dueño del producto fue explícito: **que hablen con un asistente y
que al tatuador le llegue el pedido exacto**, para empezar a negociar en el
primer mensaje en vez de en el décimo.

## La decisión de forma, que es la que importa

**El asistente NO vive adentro del chat con el artista.** Vive en su propio
hilo, antes:

```
persona ⟷ asistente        →  pedido revisado  →  [ búsqueda abierta  → propuestas ]
(hilo propio, nadie más lo ve)   (lo confirma ella)  [ chat directo → primer mensaje ]
```

Esto no es un detalle de implementación. Es lo que deja **[ADR-012](ADR-012-chat.md)
intacto**: un chat de MESH sigue siendo entre dos personas. Un bot escribiendo
adentro del hilo humano habría abierto tres agujeros a la vez —el artista no
sabría si le habla la persona o la máquina, el bot podría contestar por la
persona, y "el artista nunca escribe primero" se volvería discutible— y ninguno
de los tres hacía falta para conseguir lo que se pedía.

Del lado del artista **no cambia nada**: le llega una búsqueda con su brief,
como ya le llegaba. Lo que cambia es que ahora ese brief existe aunque no haya
habido una foto.

## Qué se enmienda, con nombre y apellido

El innegociable 1 decía que la IA solo puede *interpretar una entrada ambigua
que la propia persona subió, con vocabulario cerrado, nunca texto libre*. Un
asistente que conversa **es** texto libre generado, así que la excepción se
ensancha y hay que decirlo sin eufemismos.

Lo que **no** se mueve ni un milímetro:

> **El motor de recomendación sigue siendo puro.** Nada de lo que produce el
> asistente entra al ranking como texto. Entra como **slugs de la taxonomía
> real** —los mismos que produce el clasificador de fotos— y de ahí en adelante
> el camino es el determinístico de siempre: `packages/domain/src/matching`,
> versionado, con fixtures. Un modelo nunca decide a quién ves ni en qué orden.

Y lo que se agrega como condición de la excepción, las **siete reglas duras**:

1. **El asistente le habla a una sola persona: su dueña.** El hilo no lo lee
   nadie más — ni el artista, ni otro usuario. Lo impone RLS, no la pantalla.
2. **Nada generado llega a un tercero sin que la persona lo haya leído y
   confirmado.** El asistente *propone* un pedido; la persona lo edita y lo
   aprueba; recién ahí sale. El texto que ve el artista es, formalmente, de
   ella.
3. **El asistente nunca dice un precio.** Ni un rango, ni un "suele salir", ni
   un "es barato". Los precios en MESH los escribe un artista para un trabajo
   concreto ([ADR-020](ADR-020-brief.md)) y llevan su fecha y su firma.
4. **El asistente nunca dice una disponibilidad.** Ni "tiene lugar", ni "suele
   tener", ni "para cuándo lo querés" convertido en promesa. Los huecos salen
   de la agenda real ([ADR-018](ADR-018-availability.md)) o no salen.
5. **El asistente nunca nombra a un artista.** No recomienda, no descarta, no
   dice "fulano hace eso". Esa es la función de matching, y es determinística.
6. **El asistente nunca da consejo médico, de cicatrización ni de cobertura de
   cicatrices.** Deriva a la conversación con un profesional.
7. **El asistente puede terminar sin nada.** Si la persona no sabe lo que
   quiere, el pedido sale con los campos vacíos y se publica igual. Un modelo
   que rellena para poder cerrar es exactamente el innegociable 2 roto en la
   superficie donde más barato sale romperlo.

Las siete están escritas en el prompt del sistema **y** sostenidas por la forma
de la respuesta: el modelo no contesta con un mensaje, contesta **eligiendo una
de dos herramientas** —`ask_question` o `close_brief`— con `tool_choice`
forzado. Los slugs de `close_brief` son enums que salen de la base. No hay
manera de que devuelva un estilo que no existe, y el único texto libre que
puede producir es la pregunta que le hace a su propia dueña.

## Qué no evita esto

Ser honestos con lo que la forma **no** compra:

- **El texto de la pregunta es libre**, y un modelo puede decir una tontería
  ahí. Se acota con las reglas del prompt y con el largo máximo, pero no hay
  una garantía estructural como la del vocabulario cerrado. Es el precio real
  de esta ADR.
- **El resumen que se manda es prosa.** Lo confirma la persona, y esa
  confirmación es lo que lo hace suyo — pero si aprueba sin leer, aprobó texto
  de un modelo. Por eso la pantalla de confirmación es **editable y no tiene un
  "confirmar todo" de un toque desde el hilo**: hay que pasar por el texto.
- **Un asistente invita a preguntar cualquier cosa.** Van a preguntarle precios
  y van a preguntarle por artistas. Las reglas 3 y 5 hacen que conteste que no
  sabe y para dónde ir; eso frustra, y es preferible a que invente.

## Lo que NO está

- **El asistente adentro del chat con el artista.** Explícitamente descartado
  arriba.
- **Un asistente para el artista.** Redactarle respuestas a un tatuador es
  poner texto generado del lado de quien tiene que responder con su criterio.
  Otra ADR, si alguna vez.
- **Memoria entre hilos.** Cada pedido arranca de cero. Un asistente que
  "se acuerda" necesita un perfil de gustos guardado, que es justamente lo que
  [D-010](../design/MESH-DESIGN-DECISIONS.md) desenchufó.
- **Que el asistente publique solo.** Nunca. El último toque es de la persona.
- **Voz.** Se escribe.

## Consecuencias

- El hilo del asistente es **borrable por su dueña**, y borrarlo se lleva los
  turnos. Es lo mínimo que se le debe a alguien que contó qué se quiere tatuar
  y por qué.
- Los turnos son **inmutables** —sin UPDATE, sin DELETE por fila— igual que
  `messages`: no se edita a mitad de camino lo que dijo ninguna de las dos
  partes.
- Hay un **tope de turnos por hilo**. No es una cuota de producto: es que una
  conversación que no cierra en 40 turnos no va a cerrar, y sin tope el costo
  por hilo no tiene techo.
- El brief confirmado se guarda en `projects.description`, que ya existía y que
  el artista ya ve por `get_open_searches`. No hizo falta una columna nueva.

## Dónde vive cada parte

| Qué | Dónde |
|---|---|
| El hilo y sus turnos | `supabase/migrations/20260820000600_assistant.sql` |
| Las siete reglas, en el prompt | `supabase/functions/brief-assistant/index.ts` |
| La conversación | `apps/mobile/src/features/assistant/AssistantScreen.tsx` |
| La confirmación editable | `apps/mobile/src/features/assistant/BriefReview.tsx` |
| El pedido como primer mensaje | `apps/mobile/src/features/assistant/briefMessage.ts` |

## Referencias

- [ADR-011](ADR-011-photo-classification.md) — la excepción original de IA
- [ADR-012](ADR-012-chat.md) — el chat humano, que esto no toca
- [ADR-020](ADR-020-brief.md) — el brief y la propuesta con precio
- [ADR-022](ADR-022-reply-habit.md) — la otra mitad del ghosteo: quién contesta
- `supabase/tests/53_assistant.sql`
