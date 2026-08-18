# Benchmark de UX — referencia rápida

Se actualiza con cada `/research-pattern`. Un patrón por fila. Fuente completa
y razonamiento en el documento enlazado, no acá — esta tabla es para escanear,
no para leer de corrido.

| Producto | Patrón | Problema que resuelve | Fortaleza | Debilidad | Adaptación MESH | Fuente | Investigado | Confianza |
|---|---|---|---|---|---|---|---|---|
| Apple HIG / Material | Hoja inferior con puntos de ajuste | Mostrar detalle sin perder contexto de la pantalla de atrás | Componente que la plataforma ya enseñó | Sin tirador visible, el contenido extra pasa desapercibido | Detalle de estilo, "por qué matcheó", filtros — no contacto ni proyecto | [Mobbin](https://mobbin.com/glossary/bottom-sheet), [Apple HIG](https://www.nadcab.com/blog/apple-human-interface-guidelines-explained) | 2026-08-18 | Alta |
| Expo Router / Reanimated | Transición de elemento compartido | Continuidad espacial entre miniatura y detalle | Sensación de "mismo objeto" sin explicación | Solo funciona con Stack, no Tabs/Drawer; API en beta en SDK 55/57 | Pieza del mazo → imagen grande del perfil | [Reanimated docs](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/) | 2026-08-18 | Media |
| MESH (ya construido) | Física de arrastre sin easing hasta soltar, resorte con impulso conservado al salir | Que el gesto se sienta físico, no animado | Coincide con el patrón observado en productos reales sin haberlos copiado | — | Ninguna: ya está en `SwipeCard.tsx` | [Quibi card swipe — Reanimated](https://www.thewidlarzgroup.com/blog/recreating-quibis-cards-swipe-animation-with-react-native-and-reanimated) | 2026-08-18 | Alta |
| Bumble / Hinge / Tinder (2026) | Abandono del swipe como mecánica central, reemplazado por matching dirigido por IA | Sensación de "barajar fotos al azar" sin criterio | Reduce fatiga de decisión | El reemplazo (IA conversacional) es exactamente lo que `CLAUDE.md` prohíbe | Confirma la posición ya tomada por `product-critic`: el swipe es entrada, no identidad | [Tinder Alternatives 2026](https://appmakersla.com/blog/popular-apps/tinder-alternatives/) | 2026-08-18 | Alta (dirección) / N/A (solución no aplicable) |
| Nike onboarding / formularios conversacionales | Una pregunta por pantalla | Reduce carga cognitiva de un formulario largo | Cada pantalla se optimiza sola | Más pantallas si se fragmenta de más; el patrón por sí solo no reduce fricción, depende del tamaño de la división | Separar el paso de estilos del formulario de proyecto, medir antes de dividir el resto | [UXPin — Progressive Disclosure](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/) | 2026-08-18 | Media |
| Apple HIG / WCAG | Pestañas inferiores, objetivo táctil ≥44pt | Alcance del pulgar en uso con una mano | Estándar entre plataformas | — | Ya implementado en toda la app | [UXCam Mobile UX 2026](https://uxcam.com/blog/mobile-ux/) | 2026-08-18 | Alta |
| WCAG 2.5.1/2.5.4/2.5.7 | Alternativa sin gesto obligatoria, movimiento reducido | Que un gesto complejo no sea la única forma de actuar | Es requisito normativo, no solo buena práctica | — | Ya implementado: todo gesto de MESH tiene botón equivalente | [WCAG 2.5.4](https://dockaccess.org/documentation/wcag-success-criteria/wcag254/) | 2026-08-18 | Alta |

Filas nuevas se agregan al final. No se borran filas viejas aunque la
recomendación cambie — se agrega una fila nueva con la fecha nueva y se anota
en la columna de adaptación que reemplaza a la anterior.
