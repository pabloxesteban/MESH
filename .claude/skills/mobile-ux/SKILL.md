---
name: mobile-ux
description: Diseño de interacción, flujos, estados, copy y convenciones de accesibilidad para las pantallas de MESH. Usala al diseñar o revisar cualquier pantalla, estado vacío, estado de error o string de cara al usuario.
---

# UX móvil

## Propósito

Que MESH se sienta como un producto nativo, calmo y editorial, que nunca deja a
nadie atrapado ni le miente.

## Cuándo usarla

Al diseñar una pantalla. Al revisar una pantalla. Al escribir cualquier string de
cara al usuario. Al agregar un estado. En cualquier cosa que involucre gestos.

## Reglas

1. **Cuatro estados o no está diseñado:** carga (skeleton con la forma del
   contenido), vacío (qué es cierto + qué hacer después), error (causa +
   reintentar), éxito. Descubrimiento suma degradado.
2. **Toda pantalla tiene una acción hacia adelante desde todos sus estados.** Una
   pantalla cuya única salida es el gesto de atrás del sistema operativo es un
   defecto.
3. **El swipe nunca es el único camino.** Botones con etiqueta a ≥44pt, siempre
   visibles, más `accessibilityActions`. El camino por botones se testea de punta
   a punta.
4. **Existe deshacer** para las acciones decisivas. La gente se equivoca;
   castigarla por eso es un dark pattern.
5. **Tipografía dinámica hasta el tamaño accesible más grande.** El texto envuelve;
   nunca se recorta. Los layouts fluyen; no usan alturas fijas.
6. **Los dos temas.** El oscuro es el predeterminado; el claro no es una
   ocurrencia tardía.
7. **Reducción de movimiento** respetada globalmente, nunca chequeada ad hoc.
8. **Español rioplatense primero**, *vos*. El inglés es la traducción.

## Convenciones de copy

- Decí qué es cierto y qué hacer después.
- Enmarcá la inferencia como inferencia: "Esto es lo que estamos leyendo de tus
  elecciones", nunca "Sos 82% Fine Line".
- Mayúscula solo al inicio. Una idea por línea. Sin apilar exclamaciones.
- Prohibidos: "deslizá a la derecha", "con IA", "desbloqueá", "subí de nivel",
  "seamless", "no te lo pierdas", "¡Ups!", "revolucionario".
- Los estados vacíos nunca se limitan a pedir disculpas.

## Anti-patrones

Carruseles de onboarding · Muros de registro antes del valor · Pedidos de permiso
sin contexto · Modales que interrumpen en vez de responder · Acciones principales
solo con ícono · Texto placeholder como etiqueta · Pantallas de confirmación sin
información nueva · Spinners donde corresponden skeletons · Toasts para errores
que requieren una decisión · Insignias y puntos de notificación · Contadores de
actividad · Verde/rojo para me gusta/paso · Barras de progreso hacia una meta que
la persona nunca eligió.

## Convenciones

- Los modales son para tareas enfocadas y descartables (crear proyecto,
  contacto, filtros, auth). Todo lo demás es una pantalla apilada.
- Después de una acción de creación, aterrizá en el resultado, no en una
  confirmación.
- Devolvé a la persona de donde vino — el modal de contacto cierra al perfil, no
  al mazo.
- Los errores se mapean a causas (offline / servidor / no encontrado / permiso).
  Nunca muestres un string de error crudo.
- Las acciones destructivas confirman una vez, con claridad, nombrando la
  consecuencia.

## Ejemplo — un estado vacío honesto

```
Todavía no encontramos a alguien que encaje.

Seguí explorando y vamos a ir entendiendo mejor tu gusto.

[ Seguir explorando ]     [ Ver todos los artistas ]
```

Cierto, sin disculpas teatrales, con dos caminos hacia adelante. Lo que **no**
tiene que hacer: mostrar una lista rellenada de artistas con puntaje bajo para
que la pantalla se vea poblada.

## Checklist de calidad

- [ ] Los cuatro estados implementados y testeados
- [ ] Acción hacia adelante desde todos los estados, incluida la falla
- [ ] Todo gesto tiene un botón equivalente de ≥44pt con etiqueta
- [ ] El lector de pantalla completa el flujo en un orden sensato
- [ ] El tamaño de tipografía dinámica más grande no recorta
- [ ] Camino de reducción de movimiento verificado
- [ ] Los dos temas verificados
- [ ] El copy está en `es-AR`, en la voz aprobada, sin frases prohibidas
- [ ] Nada en pantalla es inferido, generado ni inventado
