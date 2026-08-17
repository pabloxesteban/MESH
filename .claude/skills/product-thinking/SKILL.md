---
name: product-thinking
description: Cómo decidir qué construye MESH y qué se niega a construir. Usala antes de empezar cualquier feature, cuando el alcance crece a mitad de camino, o cuando un pedido entra en conflicto con los principios de producto.
---

# Pensamiento de producto

## Propósito

Evitar que MESH se vuelva mediocre por acumulación. Toda feature tiene que pagar
su propia existencia en valor para el usuario, y V1 tiene que quedarse lo
bastante chico como para efectivamente responder su pregunta.

## Cuándo usarla

Antes de empezar cualquier feature. Cuando una tarea crece más allá de lo pedido.
Cuando un pedido contradice un principio. En cada hito.

## Reglas

1. **Toda feature sirve al menos a uno de:** DESCUBRIMIENTO, GUSTO, MATCHING,
   CONFIANZA, ACCIÓN. Si a ninguno, no se publica.
2. **V1 es un instrumento de validación**, no una plataforma. La pregunta es:
   *¿la gente descubre artistas mejor cuando MESH aprende su gusto?* Todo lo que
   no ayude a responder eso está fuera de alcance, por razonable que suene.
3. **Descubrimiento antes que administración.** Nada se interpone entre alguien
   que llega por primera vez y la primera obra.
4. **Trabajo visual antes que metadatos.** La imagen es el elemento más grande de
   cualquier pantalla que tenga una.
5. **Gente antes que tareas.** Todo camino termina en una persona, no en un
   listado.
6. **Explicable antes que ingenioso.** Si no podemos decir por qué, no lo
   decimos.
7. **Confianza antes que monetización.** No hay monetización en V1, ni ningún
   patrón que nos daría vergüenza si un usuario viera el código.
8. **Nada de dark patterns.** Ni uno, ni chiquito, ni "solo para la demo".

## El loop de crítica

Preguntá, en orden: ¿Una persona real usaría esto? ¿Por qué volvería? ¿Esto es
Pinterest / Instagram / Airtasker / Tinder? ¿Mejora alguno de los cinco? ¿Qué
fricción agrega? ¿Pertenece a V1? ¿Qué eliminaríamos para hacerle lugar?

Si "por qué volvería" se responde con cualquier cosa sobre mecánicas de
interacción, la feature está mal.

## Anti-patrones

- Construir el caso general antes de que funcione el específico.
- Una feature que existe porque es interesante de construir.
- "La vamos a necesitar después" como justificación de estructura hoy.
- Agregar una pantalla para resolver un problema que se resuelve mejor sacando
  una.
- Medir tiempo en la app, swipes o duración de sesión como éxito.
- Resolver un problema de oferta con pulido del lado de la demanda.

## Convenciones

- Los cambios de alcance se registran en `docs/product/product-spec.md`,
  incluyendo qué se cortó y por qué. Los cortes son decisiones que vale la pena
  conservar.
- Todo lo difícil de revertir lleva un ADR.
- Las preguntas abiertas van a la tabla de preguntas abiertas de la spec, con
  responsable y fase — no quedan implícitas.

## Ejemplo

> "¿Agregamos seguir/dejar de seguir artistas?"

¿Sirve a DESCUBRIMIENTO? No — la persona ya llega a los artistas por el gusto.
¿GUSTO? No. ¿MATCHING? No. ¿CONFIANZA? No. ¿ACCIÓN? Marginalmente, como marcador
— que `save` ya cubre.
Es la pregunta de Instagram (#4 del loop de crítica), crea un grafo social que
después habría que mantener y moderar, y convierte a MESH en un feed.
**Rechazar.** Si la necesidad real es "volver a este artista después", eso es una
fila de artista guardado, no un seguir.

## Checklist de calidad

- [ ] Nombra a cuál de los cinco sirve
- [ ] Existiría igual si la hipótesis resulta cierta (o sea, no es una cobertura)
- [ ] No agrega fricción al camino del primer arranque
- [ ] No contiene contenido inventado ni ninguna afirmación inferida
- [ ] No contiene ninguna mecánica de interacción
- [ ] La lista de cortes se actualizó si desplazó algo
