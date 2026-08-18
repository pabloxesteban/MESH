# Qué está pasando en diseño en 2026, y qué de eso le sirve a MESH

Investigación pedida el 2026-08-18. La segunda mitad —"que la navegación sea más
adictiva"— choca con el innegociable 3 de `CLAUDE.md`, así que este documento
separa deliberadamente **dos cosas que se suelen mezclar**: lo que hace que una
interfaz se sienta viva, y lo que hace que una persona no pueda soltarla.

## 0. La distinción, primero

Hay dos maneras de que alguien vuelva a una app.

**Que valga la pena volver.** La app responde rápido, el movimiento confirma lo
que hiciste, encontrar algo se siente como encontrar algo. La persona vuelve
porque le sirve.

**Que cueste no volver.** Rachas que se pierden, escasez inventada, insignias,
notificaciones carnada. La persona vuelve porque irse tiene un costo fabricado.

La segunda funciona en las métricas de corto plazo y erosiona la confianza: la
investigación sobre patrones oscuros muestra que **suben conversión y CTR y bajan
confianza y satisfacción** ([Deceptive by Design](https://www.researchgate.net/publication/392519249_Deceptive_by_Design_Assessing_the_Impact_of_UX_Dark_Patterns_on_Engagement_and_Trust_in_Digital_Products),
[Toptal](https://www.toptal.com/designers/ux/dark-patterns)). Para MESH eso es
particularmente caro: el producto vive de que alguien confíe lo suficiente como
para escribirle a un tatuador por WhatsApp. La confianza *es* la conversión.

Todo lo que sigue está del lado bueno de esa línea. Es bastante.

## 1. Lo que la investigación dice que sí mueve la aguja

Las micro-interacciones —el acuse de recibo inmediato de que el sistema
registró lo que hiciste— aparecen como el factor de retención con mejor
relación esfuerzo/resultado. Reducen frustración y tickets de soporte porque
comunican estado, y hay reportes de industria de mejoras grandes en engagement,
satisfacción y tasa de error ([Lantern](https://lanternstudios.com/insights/blog/the-power-of-micro-interactions-boosting-user-engagement-and-usability/),
[Acodez](https://acodez.in/micro-interactions-motion-design/),
[MoldStud](https://moldstud.com/articles/p-the-role-of-microinteractions-in-enhancing-user-experience)).

**Advertencia honesta sobre esos números:** los porcentajes que circulan
("+50% de engagement", "+23-400% de retención a 30 días") vienen de blogs de
agencias, no de estudios controlados. La dirección es creíble y consistente
entre fuentes; las magnitudes no las tomaría como presupuesto. Lo que sí es
sólido y no necesita estadística: una interfaz que no confirma lo que hiciste se
siente rota.

La otra pieza sólida: las tendencias que mejoran retención en 2026 comparten que
**están al servicio de la experiencia de la persona, no del portfolio del
diseñador** ([Workspacein](https://workspacein.com/blog/web-design/ux-design-trends)).

## 2. Tendencias visuales 2026

### Oscuro + color saturado (esto es exactamente lo que hicimos)

La tendencia dominante es fondo profundo con **acentos vívidos y brillos
sutiles**: no oscuro monocromo, sino oscuro como marco para que el color pegue.
Se lo llama "Dark Mode 3.0", optimizado para OLED con negros reales y neón como
micro-acento ([Lounge Lizard](https://www.loungelizard.com/blog/web-design-color-trends/),
[Recursion](https://www.recursion.agency/blog/ui-color-trends-2026),
[Envato](https://elements.envato.com/learn/color-scheme-trends-in-mobile-app-design)).

MESH ya estaba en oscuro por la razón correcta —es el marco de una galería— y le
faltaba justamente la otra mitad. El sistema de once familias la trae.

### Gradientes, pero cinematográficos

Vuelven los gradientes, en versión **mesh / soft-glow / luz ambiente**, no arcoíris
duro ([Figma](https://www.figma.com/resource-library/web-design-trends/),
[BINUS](https://international.binus.ac.id/graphic-design/2026/05/25/top-web-design-trends-for-2026/)).
El uso recomendado es estratégico: acento fuerte contra fondo neutro, un
gradiente en el hero que se apaga hacia el contenido limpio.

Aplicado: el encabezado de Gusto y las barras por estilo. No las tarjetas de
obra.

### Tipografía grande y cinética

Tipos variables que cambian de peso o se estiran con el scroll; titulares
sobredimensionados ([Elinext](https://www.elinext.com/services/ui-ux-design/trends/key-mobile-app-ui-ux-design-trends/),
[Midrocket](https://midrocket.com/en/guides/ui-design-trends-2026/)).
Fraunces es variable y ya está empaquetada — el eje de tamaño óptico está
disponible sin sumar peso.

### Liquid glass / profundidad espacial

Superficies translúcidas con desenfoque y profundidad reactiva a la luz. La
distinción útil: **glassmorphism es visual, liquid glass es de comportamiento**
—responde en tiempo real ([OpenForge](https://openforge.io/what-is-ios-liquid-glass-design/),
[Sanjay Dey](https://www.sanjaydey.com/mobile-ui-trends-2026-glassmorphism-spatial-computing/)).

**Para MESH lo dejaría casi afuera.** Un panel translúcido sobre una foto de
tatuaje es ruido sobre el contenido, y nuestra regla es que las obras no se
tiñen ni se cubren. Cabe, como mucho, en la barra de pestañas.

### Lo que los sitios premiados tienen en común

Los ganadores de Awwwards de este año no ganan por extremos sino **por ser
parejos**: puntúan bien en UX, contenido y performance móvil a la vez
([Hon Tran](https://www.hontran.dev/blog/best-award-winning-websites-2026),
[Awwwards](https://www.awwwards.com/websites/)).

## 3. Lo que sí vamos a hacer

Ordenado por relación valor/esfuerzo. Nada de esto viola el innegociable 3.

1. **Que cada gesto se sienta.** Háptico en me gusta / guardar / paso, resorte en
   la carta que sale, la siguiente que ya está abajo y sube. Ya tenemos tokens de
   movimiento y de háptico.
2. **Que la revelación del gusto sea un momento.** Cuando el vector queda listo,
   la pantalla de Gusto se gana una entrada real: barras que crecen escalonadas,
   el gradiente que aparece. Es información que la persona construyó — mostrarla
   con peso es honesto, no manipulador.
3. **Carga optimista en todos lados.** El me gusta se ve aplicado antes de que el
   servidor conteste. La cola offline ya existe.
4. **Skeletons con la forma real**, nunca un spinner centrado.
5. **Transiciones compartidas** de la obra al perfil: la imagen que tocaste es la
   que crece. Es lo que hace que navegar se sienta continuo en vez de a saltos.
6. **Color como orientación**, que es lo que ya construimos: reconocer un estilo
   sin leer es velocidad de navegación real.

## 4. Lo que no vamos a hacer, y por qué

| Patrón | Por qué se descarta |
|---|---|
| Rachas, puntos, niveles, insignias | Innegociable 3. Además falsifica el problema: encontrar un tatuador no es una práctica diaria. |
| "3 personas están viendo este perfil" | Innegociable 2 y 3 a la vez. Sería inventado. |
| Límite diario de swipes con espera | Escasez artificial. |
| Notificaciones para traer gente de vuelta sin novedad real | Notificación carnada. |
| Auto-reproducción infinita sin fin visible | Es el patrón que hace que la gente se quede sin decidir quedarse. El mazo de MESH tiene fondo, y eso está bien. |

**El desacuerdo, dicho una vez:** una app que ayuda a elegir a alguien para que
te tatúe la piel para siempre no debería competir por tiempo de pantalla. El
éxito acá es que alguien entre, encuentre a la persona indicada y **se vaya a
escribirle**. Una sesión corta que termina en un WhatsApp enviado vale más que
veinte minutos de scroll. Si en algún momento medimos esto, que sea contactos
iniciados y no tiempo en la app.

## 5. Fuentes

- [Deceptive by Design: Dark Patterns on Engagement and Trust](https://www.researchgate.net/publication/392519249_Deceptive_by_Design_Assessing_the_Impact_of_UX_Dark_Patterns_on_Engagement_and_Trust_in_Digital_Products)
- [Beyond Dark Patterns: A Concept-Based Framework for Ethical Software Design](https://arxiv.org/pdf/2310.02432)
- [The Danger of Dark Patterns — Toptal](https://www.toptal.com/designers/ux/dark-patterns)
- [Designing with Integrity — Raw.Studio](https://raw.studio/blog/designing-with-integrity-the-ethical-designers-handbook-on-dark-patterns/)
- [UI/UX Design Trends That Actually Improve User Retention](https://workspacein.com/blog/web-design/ux-design-trends)
- [Top Web Design Trends for 2026 — Figma](https://www.figma.com/resource-library/web-design-trends/)
- [2026 Web Design Color Trends — Lounge Lizard](https://www.loungelizard.com/blog/web-design-color-trends/)
- [The Modern Color Palette: UI/UX Color Trends 2026 — Recursion](https://www.recursion.agency/blog/ui-color-trends-2026)
- [Mobile App Color Scheme Trends 2026 — Envato](https://elements.envato.com/learn/color-scheme-trends-in-mobile-app-design)
- [Top Web Design Trends 2026 — BINUS](https://international.binus.ac.id/graphic-design/2026/05/25/top-web-design-trends-for-2026/)
- [Mobile App UI/UX Design Trends 2026 — Elinext](https://www.elinext.com/services/ui-ux-design/trends/key-mobile-app-ui-ux-design-trends/)
- [UI Design Trends for 2026 — Midrocket](https://midrocket.com/en/guides/ui-design-trends-2026/)
- [What Is Liquid Glass — OpenForge](https://openforge.io/what-is-ios-liquid-glass-design/)
- [Mobile UI Trends 2026: Glassmorphism to Spatial Computing](https://www.sanjaydey.com/mobile-ui-trends-2026-glassmorphism-spatial-computing/)
- [10 Award-Winning Websites of 2026, Judged — Hon Tran](https://www.hontran.dev/blog/best-award-winning-websites-2026)
- [Awwwards — Winning websites](https://www.awwwards.com/websites/)
- [The Power of Micro Interactions — Lantern](https://lanternstudios.com/insights/blog/the-power-of-micro-interactions-boosting-user-engagement-and-usability/)
- [Micro-Interactions & Motion Design 2026 — Acodez](https://acodez.in/micro-interactions-motion-design/)
- [The Role of Microinteractions — MoldStud](https://moldstud.com/articles/p-the-role-of-microinteractions-in-enhancing-user-experience)
