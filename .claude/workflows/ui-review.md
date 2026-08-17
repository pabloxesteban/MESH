# Workflow — Revisión de UI

Para cualquier pantalla nueva o modificada.

**Participan:** `ux-product-designer` (conduce), `design-system-engineer`,
`brand-designer`, `product-critic`.

## 1. Propósito — `ux-product-designer`

- ¿Para qué es esta pantalla? ¿Se entiende en dos segundos?
- ¿Qué se puede sacar sin perder eso?
- ¿A dónde va la persona después, desde **cada** estado, incluida la falla?

Una pantalla cuya única salida es el gesto de atrás del sistema operativo es un
callejón sin salida y falla acá.

## 2. Estados

- [ ] Carga — un skeleton con la forma del contenido, no un spinner
- [ ] Vacío — dice qué es cierto y qué hacer después; no solo se disculpa; no
      está rellenado para verse poblado
- [ ] Error — causa mapeada más un reintento que funciona
- [ ] Éxito
- [ ] Degradado, si es una superficie de descubrimiento

## 3. Interacción

- [ ] Todo gesto tiene un botón con etiqueta a ≥44pt, siempre visible
- [ ] Existe deshacer para las acciones decisivas
- [ ] `accessibilityActions` expuestas donde los gestos son el camino rápido
- [ ] Nada importante está detrás de una pulsación larga o un gesto oculto

## 4. Accesibilidad

- [ ] El orden del lector de pantalla tiene sentido: obra → artista → estilos →
      acciones
- [ ] El tamaño de tipografía dinámica más grande envuelve en vez de recortar
- [ ] El contraste se sostiene para cada par de tokens usado (verificado, no
      mirado a ojo)
- [ ] Camino de reducción de movimiento verificado
- [ ] El color nunca es el único portador de significado
- [ ] Todo el flujo se completa solo con botones

## 5. Design system — `design-system-engineer`

- [ ] Ningún hex, número de espaciado, tamaño de fuente o duración crudos en la
      pantalla
- [ ] Ninguna anulación de `style` pasada a componentes del design system
- [ ] Los componentes nuevos justificados (usados dos veces, o codifican una
      regla) y agregados al catálogo en el mismo commit
- [ ] Funciona en **los dos** temas

## 6. Marca — `brand-designer`

- [ ] La obra domina; nada compite con ella
- [ ] `signal` rojo usado como máximo una vez
- [ ] Las obras sin teñir, sin superposiciones, sin borde de color de marca
- [ ] Serif ≥24px, sans ≤20px
- [ ] Ninguna iconografía de tatuaje
- [ ] El copy está en `es-AR`, con la voz correcta, sin frases prohibidas

## 7. Crítica — `product-critic`

- ¿Esta pantalla termina en una persona, o en un callejón sin salida?
- ¿Esto es Pinterest / Instagram / Airtasker / Tinder?
- ¿Qué fricción agregó?
- ¿Hay algo en pantalla que sea inferido, generado o inventado?

## 8. Pasada en dispositivo

Captura o grabación en un dispositivo real, en los dos temas, con tamaño de
tipografía por defecto y con el más grande. Las capturas de simulador no cierran
este paso.
