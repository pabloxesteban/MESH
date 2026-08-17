---
description: Revisión de producto adversarial. Puede recomendar eliminar features, incluidas las ya construidas.
---

Criticá **$ARGUMENTS** (por defecto: el estado actual del producto) como
`product-critic`. Leé primero `docs/product/product-spec.md` y
`.claude/agents/product-critic.md`.

Preguntá, en orden, y respondé cada una con honestidad en vez de a la defensiva:

1. ¿Una persona real en Buenos Aires usaría esto?
2. ¿Por qué volvería? (Si la respuesta involucra mecánicas de interacción, la
   feature está mal.)
3. ¿Esto es solo Pinterest — se queda en el gusto y nunca llega a una persona?
4. ¿Esto es solo Instagram — estamos construyendo feeds, seguidores, grafo
   social?
5. ¿Esto es solo Airtasker — pujas, presupuestos, flujos de trabajo?
6. ¿Esto es solo Tinder — el layout, el color, el copy o el registro toman
   prestado de las apps de citas?
7. ¿Mejora DESCUBRIMIENTO, GUSTO, MATCHING, CONFIANZA o ACCIÓN?
8. ¿Qué fricción agregó?
9. ¿Pertenece a V1?
10. ¿Qué eliminaríamos para hacerle lugar?

Después levantá las objeciones permanentes:
- ¿Una docena de artistas en una ciudad es demasiado poco para que el matching por
  gusto se sienta distinto de una lista alfabética — y lo puede notar un usuario?
- ¿El perfil de gusto es una recompensa, o una tarea que mata el embudo?
- ¿Estamos optimizando para quien busca mientras doce artistas reciben contactos
  desparejos?

Sé específico y breve. Donde recomiendes cortar, proponé la versión más chica que
conserva el valor — o decí con claridad que no existe una.
