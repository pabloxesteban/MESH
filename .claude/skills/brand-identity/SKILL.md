---
name: brand-identity
description: La identidad visual de MESH — la marca gráfica, el color, la tipografía, la voz, y lo que nunca puede aparecer. Usala al crear assets de marca, al evaluar una decisión visual, o al escribir copy de nivel marca.
---

# Identidad de marca

## Propósito

Mantener a MESH reconocible, independiente y honesto — un marco alrededor del
trabajo de otras personas, no un competidor de ese trabajo.

## Cuándo usarla

Al crear o evaluar el logo, el ícono de app o cualquier asset de marca. Al
decidir si una elección visual se ve como MESH. Al escribir copy de nivel marca.

## La idea

Conexión e intersección. Dos cosas que estaban separadas que se cruzan y siguen
como una. Gente + gusto + habilidades + ideas + trabajo, entramándose.

**El trabajo es el diseño.** MESH aporta silencio, márgenes y tipografía precisa.
Cualquier cosa que compita con una obra está mal.

## Reglas

1. **Nada de iconografía de tatuaje, nunca.** El tatuaje es el primer vertical,
   no la marca.
2. **Nada de diagramas de red de nodos y aristas.** Ese es el logo de todas las
   empresas de SaaS B2B.
3. La marca se lee a **16px**, en **un solo color**, **sin logotipo**. Si
   necesita tamaño o color, falló.
4. Funciona tinta-sobre-papel (`#0C0C0E` sobre `#F4EFE6`) e invertida, idéntico.
5. El arte a tamaño de ícono está **corregido ópticamente**, no escalado
   matemáticamente — los tamaños chicos necesitan trazos más gruesos.
6. `signal` rojo aparece **como máximo una vez por pantalla**.
7. Las obras nunca se tiñen, ni se superponen con color de marca, ni reciben un
   borde de color.
8. La serif nunca por debajo de 24px. La sans nunca por encima de 20px.

## Color, con la corrección de accesibilidad

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#0C0C0E` | Superficie oscura, texto sobre papel |
| `paper` | `#F4EFE6` | Superficie clara, texto sobre tinta |
| `signal` | `#9C2D40` | Rellenos; texto **solo sobre claro** (≈6,4:1) |
| `signal-raised` | `#C4485C` | Texto e íconos **sobre oscuro** (≈5,1:1) |
| `on-signal` | `#F4EFE6` | Texto sobre un relleno signal (≈5,6:1) |

`signal` sobre `ink` es ≈3,0:1 y **no pasa AA para texto**. Por eso existe
`signal-raised`. No lo "arregles" usando `signal` igual.

Los neutros son mezclas de `ink` y `paper`, nunca gris puro — el sistema se
mantiene cálido.

## Tipografía

**Fraunces** (variable, `wonk: 0`, `soft: 0`) para momentos editoriales, títulos,
la revelación del gusto y los nombres de artistas. **Instrument Sans** para toda
la UI funcional. Las dos de licencia abierta, variables, empaquetables con Expo.

## Voz

Español rioplatense, *vos*. Directo, cálido, sin apuro, nunca vendedor.

Bien: "Empecemos por lo que te gusta." · "Encontrá a tu gente." · "Detrás de cada
trabajo hay alguien." · "¿Quién hizo esto?" · "Hagámoslo realidad."

Prohibido: "deslizá a la derecha", "como Tinder", "con IA", "revolucionario",
"seamless", "desbloqueá", "subí de nivel", cualquier urgencia falsa.

## Anti-patrones

Degradados en la marca · Una marca que necesita un fondo específico · Dos colores
de acento · Neón · Violeta de startup · Sombras para dar profundidad · Elementos
de marca sobre fotografías · Filtros o corrección de color sobre el trabajo de
los artistas · Un logotipo que necesita letras customizadas para ser interesante ·
Imágenes de banco, de cualquier tipo.

## Checklist de calidad

- [ ] Legible a 16px y como ícono de app de 60pt
- [ ] Funciona sin el logotipo
- [ ] Funciona en un solo color, en las dos polaridades
- [ ] No confundible con Wi-Fi, infinito, un nudo, una cadena o un grafo de nodos
- [ ] Corrección óptica aplicada a tamaño de ícono
- [ ] Contraste verificado para cada par de tokens usado
- [ ] `signal` usado como máximo una vez en la pantalla
- [ ] Ninguna imagen específica de tatuaje en ningún lado
