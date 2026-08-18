# Decisión — la física de arrastre existente no se rediseña

**Fecha:** 2026-08-18 · **Contexto:** `mobile-patterns.md §Física de arrastre
de tarjetas`.

## La pregunta

¿La física de `SwipeCard.tsx` (sin easing durante el arrastre, resorte con
velocidad conservada al soltar, umbral por fracción del ancho de pantalla más
un umbral de velocidad para un flick corto) coincide con lo que se ve en
productos reales, o se está perdiendo algo?

## La decisión

Coincide. No se toca el código de producción. Lo único que se agrega es un
prototipo en el playground (`SwipePhysicsLab`) con los parámetros —
`COMMIT_RATIO`, `FLICK_VELOCITY`, la curva de rotación, el rango de escala de
la tarjeta de atrás— expuestos como controles en vivo, para que alguien pueda
*sentir* si esos números son los correctos probando con la mano, no solo
leyendo el valor en el código.

## Por qué no rediseñar

Tres fuentes independientes (Medium/Reanimated de terceros, no relacionadas
entre sí) describen el mismo patrón que ya está implementado. Rediseñar algo
que ya coincide con la evidencia sería trabajo sin beneficio — el riesgo real
no es la física, es si los *números* (qué tan lejos hay que arrastrar, qué
tan rápido cuenta como flick) son los correctos para el tamaño de tarjeta y el
tipo de contenido de MESH específicamente. Eso se prueba con las manos, no
leyendo investigación.
