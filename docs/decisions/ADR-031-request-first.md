# ADR-031 — El pedido es la puerta de entrada

**Estado:** Aceptado (2026-08-21) · **Fecha:** 2026-08-21 · **Responsable:** product-architect

## Contexto

El pedido que originó esta decisión no fue una feature: fue un diagnóstico.

> *"Siento que la app todavía no soluciona un problema real, no encuentro
> motivos por el cual las personas nos elegirían."*

De ahí salió [por-que-mesh.md](../product/por-que-mesh.md), que buscó la
respuesta adentro del repositorio en vez de inventarla. Lo que encontró:

**La tesis de V1 se borró el 2026-08-19 y nadie escribió otra.** `product-spec.md`
§2 decía que MESH existe para aprender el gusto visual y recomendar en base a
eso. [D-010](../design/MESH-DESIGN-DECISIONS.md) desenchufó exactamente eso, y
tuvo razón: con quince artistas, un encaje puntuado es una promesa que no se
puede cumplir sin inventar, y eso rompe el innegociable 2.

Pero D-010 cierra con *"una grilla de artistas no promete nada que no
muestre"*. Arregló el sobre-prometer y dejó **cero promesa**. Desde entonces se
construyeron unas quince features, casi todas mesa de entrada: lo necesario
para no ser peor que los demás. Ninguna es un motivo para elegirnos.

Y una consecuencia que nadie notó: `metrics.md` §2 sigue midiendo
`taste_profile_generated` y `match_viewed`, dos eventos que salen de motores
apagados. **El embudo tiene el medio borrado**, así que MESH hoy no podría
saber si funciona ni aunque tuviera usuarios.

## Problema

¿Qué hace MESH que Instagram estructuralmente no pueda hacer, y por qué eso no
está pasando aunque esté construido?

## La respuesta ya estaba en el repositorio

Instagram gana en catálogo, en frescura y en prueba social, y va a seguir
ganando. Lo que no puede hacer es tomar un pedido, porque **un feed no tiene la
forma de un pedido** — y su negocio es que te quedes mirando, no que resuelvas
y te vayas.

MESH tiene la cadena entera construida:

| Pieza | Dónde |
|---|---|
| Describir la idea una vez, con palabras | [ADR-021](ADR-021-brief-assistant.md) |
| …o con una foto | [ADR-011](ADR-011-photo-classification.md) |
| Convertirla en un pedido estructurado, con estilo y rasgos de la taxonomía | [ADR-020](ADR-020-brief.md) |
| Mandárselo a los artistas que efectivamente hacen eso | [ADR-014](ADR-014-two-sided.md) |
| Que contesten con un rango de precio y cantidad de sesiones | [ADR-020](ADR-020-brief.md) |
| Y que se vea quién suele contestar y quién no | [ADR-022](ADR-022-reply-habit.md) |

Eso es una primitiva de mercado, no de feed. **Y no existía en el producto**,
por tres decisiones razonables por separado que juntas la apagaban:

1. Vivía a dos toques adentro de la segunda pestaña.
2. Inicio decía otra cosa: "acá están los artistas cerca tuyo" — la promesa con
   forma de Instagram, en la primera pantalla.
3. El interruptor que hace que un pedido le llegue a alguien arrancaba
   apagado, y en una app sin usuarios nadie lo iba a prender.

## Decisión

**La tesis de MESH pasa a ser:**

> MESH existe para que decir lo que querés tatuarte cueste **una sola vez**, y
> para que la respuesta incluya **un precio**.

Dicho al usuario: *contá tu idea una vez; te contestan los que la pueden hacer,
con precio.*

Y las tres consecuencias, que son esta decisión y no un plan aparte:

**1. Inicio abre con tu pedido.** `RequestBand` va arriba de todo, con cuatro
estados: sin pedido (la invitación, con los dos caminos), cerrado (no le llegó
a nadie, y se puede abrir), abierto sin respuestas, y con propuestas. La grilla
de artistas **no se va**: deja de ser la puerta de entrada y queda un
desplazamiento abajo, con su búsqueda por nombre y su encabezado de ubicación
intactos.

**2. Publicar un pedido termina en el pedido.** Los dos caminos —foto y
palabras— vuelven a Inicio. El de la foto antes terminaba en Explorar filtrado
por el estilo detectado (D-010), lo que dejaba a la persona mirando obra sin
ninguna pantalla que le dijera qué pasó con lo que acababa de publicar. El
estilo no se pierde: la tarjeta del pedido lleva a Explorar filtrado con un
toque.

**3. Que los tatuadores lo vean deja de tener default.** Ni encendido ni
apagado: **es una elección obligatoria**, dos botones sin estado normal, y no
se publica sin contestar. Decir que no es una respuesta legítima y lleva su
costo escrito al lado.

## Por qué

**Esto no cambia lo que hay, cambia el orden.** No se construyó ninguna
capacidad nueva: el pedido, la clasificación, el asistente, el mazo del artista
y la propuesta con precio ya existían y estaban testeados. Lo que cambió es qué
es lo primero que se ve y qué decisión se obliga a tomar. Esa es exactamente la
clase de cambio que un diagnóstico honesto produce — y la razón por la que el
diagnóstico se escribió antes de tocar código.

**Forzar la elección respeta [ADR-014](ADR-014-two-sided.md) más de lo que la
respetaba el default.** Lo que ese ADR protege es que nadie publique sin
querer, no que casi nadie publique. Un interruptor apagado es una decisión solo
para quien lo nota; quien no lo miraba se quedaba con un pedido guardado que no
le llegaba a nadie, sin saberlo. Ahora la pregunta se contesta o no se publica,
y la respuesta se puede cambiar después — `setProjectOpen`, que es la vuelta
atrás que ADR-014 nunca tuvo.

**No se toca el innegociable 1.** El motor de matching sigue apagado y sigue
siendo puro, determinístico y versionado. Reenchufarlo sigue siendo una
decisión de producto pendiente, y esta no la toma.

**Y no se inventa nada para llenar el hueco.** El estado "abierto y sin
respuestas" es el más incómodo del producto y es el que más tentación da de
adornar: *"suelen contestar en 24 horas"*, *"le llegó a 12 tatuadores"*, *"¡se
van a olvidar de vos!"*. Nada de eso existe. Se dice lo que pasó —lo pueden ver
quienes tatúan ese estilo, todavía no contestó nadie— y nada más. Una espera
estimada es disponibilidad inventada (innegociable 2) y un número cuyo
propósito es que alguien vuelva está prohibido por el innegociable 3.

## Consecuencias

**Quien viene solo a mirar paga un desplazamiento.** Alguien que abre MESH sin
una idea, a ver quién tatúa cerca, ahora ve primero una invitación a contar una
idea que no tiene. Es el costo de tener una promesa, y está acotado: la
invitación dice, con todas las letras, que la grilla sigue abajo.

**Tres pantallas muertas se van.** `/proyectos`, `/proyectos/nuevo` y el
formulario largo de proyecto. No se llegaba a ninguna desde ninguna pestaña, y
`ProjectsScreen` navegaba a `/proyectos/[id]/matches`, una ruta que no existe
desde que se fueron los encajes. Con eso se pierde la única forma de cargar
presupuesto y tiempos a mano; hoy no la usaba nadie porque no se llegaba.

**Las propuestas se mudan de Chats a Inicio.** Una propuesta es la respuesta a
un pedido, no una conversación. Chats queda con conversaciones nada más.

**El embudo sigue roto y este ADR no lo arregla.** `metrics.md` §2 mide dos
eventos que no se disparan. Cambiar los objetivos es trabajo aparte y se hace
en `metrics.md`, no acá.

**Cómo se cierra.** Sacarle el `header` a `ArtistsScreen` devuelve Inicio a lo
que era, sin migrar nada. La elección obligatoria se revierte volviendo el
estado a `useState(false)`. Las dos son de una línea, a propósito.

**Lo que esta decisión NO prueba.** Que la gente quiera escribir un pedido en
vez de mirar fotos, y que los artistas quieran dar un precio sin ver a la
persona. Las dos son hipótesis, están escritas como tales en
[por-que-mesh.md §5](../product/por-que-mesh.md), y se falsean con veinte
conversaciones, no con código. Este ADR pone el producto en la forma que hace
falta para poder preguntarlas.

## Verificación

`apps/mobile/src/features/request/request.test.tsx` — 6 tests. Los que deciden
si esto sirve: que el estado "sin respuestas" no diga ni una hora ni un día ni
una semana, y que un pedido cerrado lo diga y se pueda abrir.

`apps/mobile/src/features/quick-search/QuickSearchScreen.test.tsx` y
`apps/mobile/src/features/assistant/assistant.test.tsx` — publicar deshabilitado
mientras no se contestó si lo ven los tatuadores, en los dos caminos.

`apps/mobile/src/screens.a11y.test.tsx` — los tres estados de la banda pasan el
barrido de accesibilidad, con tipografía grande y con mayúsculas.

`scripts/build-web-preview.mjs` — un canario nuevo: si Inicio vuelve a abrir sin
la banda del pedido, el preview no se entrega. Es lo único de esta lista que
prueba la decisión y no la implementación.

Los cuatro se verificaron rompiéndolos a mano.
