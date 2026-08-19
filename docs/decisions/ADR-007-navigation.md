# ADR-007 — Expo Router y una estructura de cuatro pestañas

**Estado:** Reemplazado por [ADR-014](ADR-014-two-sided.md) en la parte de
pestañas · **Fecha:** 2026-08-17 · **Responsables:** ux-product-designer, mobile-engineer

> **Leé esto antes de implementar nada de acá.** La barra que este documento
> describe —Descubrir · Matches · Proyectos · Vos— **ya no existe**. Quien la
> implemente hoy construye la app equivocada.
>
> Lo que sobrevive y sigue valiendo: la elección de **Expo Router**, el
> razonamiento sobre deep links, y el criterio de **cuatro pestañas y no seis**.
>
> Lo que cambió: las pestañas dependen de a qué vino la persona
> ([ADR-014](ADR-014-two-sided.md)) y hoy son Inicio · Búsqueda · Matches ·
> Perfil para quien busca, e Inicio · Estudio · Chats · Perfil para quien
> ofrece. La búsqueda dejó de ser una pestaña de proyectos.
>
> Un ADR no se edita después de aceptado salvo para cambiar su estado; esta
> nota es exactamente eso, y el contenido de abajo queda como historia.

## Contexto

El brief define dos puntos de entrada iguales: **Descubrir** (exploratorio) y
**Crear un proyecto** (dirigido). También exige que a un usuario dirigido nunca
se lo fuerce a pasar por el onboarding, y que los deep links funcionen
(`mesh://artist/:slug`).

## Problema

¿Qué router, y cómo se organizan las superficies para que ambas intenciones sean
obvias en el primer arranque sin inflar la app?

## Opciones — router

**A. Expo Router.** Basado en archivos, rutas tipadas, deep linking y universal
links incorporados, y los layouts mapean limpio a pestañas y modales.
**B. React Navigation directo.** Más explícito, más configuración, deep linking
armado a mano.

## Opciones — estructura

**W. 3 pestañas** — Descubrir / Matches / Vos, con Proyectos anidado bajo Vos.
**X. 4 pestañas** — Descubrir / Matches / Proyectos / Vos.
**Y. 2 pestañas + un botón central de acción** — Descubrir / Matches con un "+".

## Decisión

**Expo Router**, y **X — cuatro pestañas**: Descubrir · Matches · Proyectos ·
Vos.

Modales para creación de proyecto, contacto, filtros y auth. El perfil de artista
es una pantalla apilada alcanzable desde todas las superficies.

## Por qué

Expo Router está construido sobre React Navigation, así que no se pierde nada, y
da deep linking y rutas tipadas sin configuración mantenida a mano — lo que
importa porque el manejo de parámetros de deep link es una superficie de
seguridad ([modelo de amenazas T7](../security/threat-model.md)) y las configs de
linking armadas a mano son donde viven esos bugs.

Sobre la estructura: el brief trata al usuario dirigido como un caso de primera
clase. La opción W esconde su punto de entrada dos niveles abajo, detrás de una
pestaña nombrada por el *usuario*, que es donde nadie busca "publicar lo que
quiero". El botón central "+" de la opción Y es un gesto de composición prestado
de las apps sociales y se lee como "crear contenido", que es el verbo equivocado
— un proyecto es un brief, no un posteo.

Cuatro pestañas cuesta un espacio horizontal y hace que ambas intenciones sean
visibles en el primer arranque. La pestaña Proyectos vacía no es un placeholder:
**el estado vacío es el punto de entrada para crear un proyecto.**

Matches lleva el resumen de gusto arriba de la gente rankeada, porque el gusto y
los matches son la misma idea a dos niveles de zoom. Separarlos en dos pestañas
obligaría a la persona a armar la conexión que MESH existe para trazar.

## Consecuencias

- Cuatro pestañas está cerca del límite antes de que una barra de pestañas se
  sienta un archivero. Cualquier quinta superficie tiene que desplazar a una de
  estas, no sumarse.
- Esta es la [pregunta abierta Q2](../product/product-spec.md#14-preguntas-abiertas):
  si los `project_started` originados en la pestaña Proyectos son insignificantes
  después de la primera cohorte, colapsar a tres y exponer proyectos desde
  Descubrir.
- Los deep links tienen que validar todos sus parámetros antes de usarlos, y
  nunca pueden mutar estado. Los destinos no autorizados e inexistentes resuelven
  a la misma pantalla de no encontrado, para que los links no puedan sondear
  existencia.
- Ninguna pestaña puede llevar una insignia ni un punto de notificación en V1 —
  eso es carnada de interacción, y el brief lo prohíbe.
