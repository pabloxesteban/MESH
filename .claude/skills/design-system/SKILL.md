---
name: design-system
description: Convenciones de tokens, componentes, movimiento y hápticos en apps/mobile/src/design-system. Usala al agregar un componente o un token, o cuando una pantalla necesita un valor de diseño.
---

# Design system

## Propósito

Un único lugar donde se toman las decisiones visuales, para que las pantallas
sean composición y nada más.

## Cuándo usarla

Al agregar o cambiar un componente. Al agregar un token. Cada vez que una
pantalla quiere un color, un espaciado, un tamaño de fuente o una duración.

## Reglas

1. **`tokens/palette.ts` es el único archivo con un valor hex.** En cualquier otro
   lado es un error de lint.
2. **Semántico, no literal.** Los componentes consumen `text-secondary`, nunca
   `ink-500`. Necesitar un literal significa que falta un token semántico.
3. **`Text` no tiene prop `fontSize`.** Toma un `role` de una unión cerrada. El
   espaciado funciona igual. Sacá las escotillas de escape en vez de documentar
   que no se deben usar.
4. **Un componente se gana su lugar** al usarse dos veces, o al codificar una
   regla que no se debe volver a decidir (contraste, área táctil,
   desactualización, movimiento).
5. **Los componentes interactivos vienen con:** soporte de etiqueta de
   accesibilidad, área táctil de ≥44×44pt, estados deshabilitado, presionado, y
   de carga (si disparan trabajo).
6. **Los componentes de datos vienen con:** variantes de skeleton, vacío y error.
7. **Los dos temas.** Siempre.
8. **El contraste se verifica en un test**, nunca a ojo.

## Movimiento

Solo tokens con nombre: `instant` 120ms · `quick` 200ms · `standard` 280ms
resorte · `deck` resorte que conserva velocidad · `reveal` 500ms escalonado. Nada
supera los 500ms. El arrastre mismo no tiene easing — la física arranca cuando el
dedo se levanta. `MotionProvider` lee la reducción de movimiento una sola vez; los
componentes se lo preguntan a él.

## Hápticos

Solo confirmación de una decisión. Me gusta → `impactLight`. Guardar →
`impactMedium`. Paso → **ninguno**. Lista de matches → `notificationSuccess`, una
vez. Nunca al hacer scroll, nunca por frame, nunca al entrar.

## Convenciones

- Archivos: `components/<Nombre>/<Nombre>.tsx`, `<Nombre>.test.tsx`, `index.ts`.
- Las variantes son props de una unión cerrada, nunca una sopa de booleanos
  (`variant="primary"`, no `isPrimary` + `isGhost`).
- Todo componente se agrega al catálogo de `docs/design/design-system.md` en el
  **mismo commit**.
- Los componentes nunca traen datos. Reciben datos y un estado.

## Ejemplo

```tsx
// ✅
<Text role="title">{professional.displayName}</Text>
<Box padding="lg" gap="sm">
<Button variant="primary" size="lg" loading={isSubmitting}
        accessibilityLabel={t('contact.cta', { name })} />

// ❌ cada una de estas es un error de lint o un rechazo en revisión
<Text style={{ fontSize: 24, color: '#F4EFE6' }} />
<View style={{ padding: 24 }} />
<Button style={{ backgroundColor: '#9C2D40' }} />
<Animated.View style={{ transitionDuration: 340 }} />
```

## Anti-patrones

Anulaciones de `style` pasadas desde una pantalla a un componente del design
system · Una duración en línea "porque quedaba mejor" · Sombras para jerarquía ·
Verde/rojo para me gusta/paso · Skeletons que no coinciden con la forma del
contenido · Un componente que renderiza `null` ante un error · Un componente
nuevo ausente del catálogo · Un token agregado sin intención documentada.

## Checklist de calidad

- [ ] Construido enteramente con tokens
- [ ] Todos los estados presentes (carga/vacío/error si trae datos;
      deshabilitado/presionado si es interactivo)
- [ ] Soporte de etiqueta de accesibilidad y área táctil de ≥44pt
- [ ] Verificado en los dos temas
- [ ] Camino de reducción de movimiento verificado si está animado
- [ ] Test de componente que cubre los estados
- [ ] Agregado al catálogo en el mismo commit
