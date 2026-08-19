# ADR-011 — IA para clasificar la foto de referencia, nunca para el ranking

**Estado:** Aceptado (2026-08-19) · **Fecha:** 2026-08-19 · **Responsable:** product-architect

## Contexto

"Buscar por fotos" le pide a la persona un toque más allá de subir sus fotos:
elegir de qué estilo son. Se probaron dos versiones de ese toque — una lista de
chips de texto, después una grilla de fotos reales para reconocer en vez de
leer — y las dos se rechazaron por la misma razón: seguía siendo una decisión
que la persona tenía que tomar antes de poder buscar. El pedido explícito fue
sacarla: subís las fotos, tocás Buscar, listo.

Sin ningún estilo, el motor de matching (`packages/domain/src/matching`) no
tiene con qué puntuar a nadie — Estilo pesa 0,70 de la fórmula. Alguna parte
del sistema tiene que producir un estilo a partir de la foto.

## Por qué esto no es lo mismo que ADR-005 rechazó

[ADR-005](ADR-005-matching.md) evaluó y rechazó "Ranking por LLM" (opción D:
un modelo decide directamente a quién mostrar) y dejó "similitud por
embeddings" (opción C) como una mejora futura *aditiva*, nunca como reemplazo
del razonamiento explicable. Esa decisión **sigue en pie acá**. Lo que cambia
en esta ADR es un paso antes del matching, no el matching en sí:

```
foto → [clasificación] → slug de estilo → [matching determinístico] → resultado
        ▲ acá entra IA                     ▲ esto sigue siendo packages/domain,
                                              puro, versionado, testeado por fixture
```

La IA interpreta una entrada ambigua (una foto) y la traduce a un término de
un vocabulario cerrado y ya existente — el mismo que un artista usa para
etiquetar su portafolio. No decide el orden de nadie, no inventa una razón, y
no toca ninguna fila de `matches` directamente. El motor que sí decide el
orden sigue siendo exactamente el de ADR-005: determinístico, con las mismas
razones derivadas del mismo conjunto cerrado de plantillas.

## Decisión

`supabase/functions/classify-style` recibe la primera foto subida y la
categoría, y devuelve **un slug de `styles` o `null`** — nunca texto libre.
Implementación:

- **Vocabulario cerrado por `tool_choice` forzado.** El modelo (Claude Haiku,
  llamado desde la Edge Function) solo puede responder eligiendo de la lista
  de estilos activos que la propia base le manda en la llamada — nunca puede
  inventar un slug que no exista, porque el schema de la herramienta no admite
  otra cosa. Una segunda validación (`resolveClassifiedSlug`) descarta
  cualquier respuesta que igual no esté en la lista, por si el contrato de la
  API cambia.
- **`null` es una respuesta válida y esperada**, no un error. Si la foto no
  muestra claramente ninguno de los estilos, el modelo tiene la instrucción
  explícita de decir que no reconoce nada en vez de elegir el más parecido a
  la fuerza. El cliente lo muestra como "no reconocimos el estilo, probá con
  otra foto" — nunca elige un estilo al azar ni el más común para no dejar a
  la persona sin resultado.
- **Corre en el servidor, nunca en el cliente.** La clave de Anthropic es un
  secreto de Edge Function (`ANTHROPIC_API_KEY`), del mismo modo que la
  service-role key nunca toca `apps/mobile`. Ver
  `supabase/.env.example` y `docs/security/security-model.md`.
- **La foto se recodifica antes de mandarse** (`manipulateToJpeg`, ya
  existente para la subida a `references`), así que el EXIF —incluida
  cualquier coordenada GPS— nunca sale hacia un proveedor externo.

## Alternativas descartadas

**A. Embeddings de imagen + similitud coseno contra el portafolio.** Es lo que
ADR-005 dejó como mejora futura. Se descarta acá porque compara la foto
directamente contra piezas de artistas — un paso más cerca de "la IA decide
el match" que "la IA interpreta la entrada", y porque construir y mantener un
índice de embeddings es una pieza de infraestructura nueva que esta necesidad
puntual no justifica todavía.

**B. Dejar la clasificación manual (grilla de fotos, selección única).** Es lo
que se había construido antes de este ADR. Funcionaba y era accesible, pero
seguía siendo un paso que la persona tenía que resolver antes de buscar — el
pedido explícito fue sacarlo, no hacerlo más lindo.

**C. Clasificar sin restringir el vocabulario** (texto libre del modelo,
buscado después contra `styles`). Se descarta: un match parcial de texto
("puntillismo fino" vs. `dotwork`) es exactamente la clase de ambigüedad que
`tool_choice` forzado elimina de raíz.

## Consecuencias

- **CLAUDE.md, Innegociable 1, queda reescrito**: sigue prohibiendo ML/LLM en
  el camino de *recomendación* (puntaje, orden, razones), y ahora permite
  explícitamente IA para *interpretar una entrada* del usuario, acotada a un
  vocabulario cerrado y auditable. La distinción entre las dos cosas es la
  que sostiene el resto de este documento.
- **Costo y latencia por búsqueda.** Cada toque de "Buscar" en este flujo
  cuesta una llamada a la API de Anthropic. Aceptable para un catálogo V1
  curado; si el volumen crece, revisar acá.
- **El resultado ya no es 100% reproducible en un test de fixture** para esta
  primera clasificación — depende de una llamada externa. Se mitiga
  testeando cliente y Edge Function con la llamada inyectada/mockeada, y
  dejando el motor de matching (que sí es puro) con su cobertura de siempre.
- **`get_style_examples()`** (RPC de la versión con grilla, migración
  `20260819000100_style_examples.sql`) queda sin caller en el cliente. No se
  borra — es una migración ya pusheada, y las migraciones no se editan
  después de aplicadas — pero es candidata a remoción en una migración
  posterior si nadie la vuelve a usar.
