---
description: Investigar un problema de UX contra fuentes reales antes de diseñar la solución, y guardar el hallazgo en docs/research/.
---

Investigá este problema de UX: **$ARGUMENTS**

Tomá el rol de `ux-researcher`. Seguí este orden:

1. **Nombrá el problema con precisión.** No "¿cómo hacemos onboarding?" sino
   "¿cómo confirmamos que alguien entendió el gesto de guardar sin agregar un
   tutorial que se interponga?".
2. Buscá fuentes actuales — priorizá Nivel 1 y 2 (ver la jerarquía de fuentes
   del agente). Compará al menos 5 ejemplos reales cuando sea posible, no
   capturas de pantalla sueltas.
3. Identificá el patrón común entre esos ejemplos.
4. Identificá al menos una excepción interesante — un producto que resuelve
   esto distinto y por qué le funciona.
5. Marcá cualquier problema de accesibilidad que el patrón traiga.
6. Nombrá la oportunidad específica para MESH — no genérica ("mejora el
   onboarding") sino concreta ("el primer arrastre puede confirmar sin texto
   si el resorte de `spring.deck` alcanza para que se sienta físico").
7. Recomendá: **Usar** / **Adaptar** / **Rechazar**, con el filtro de cinco
   condiciones del agente aplicado explícitamente.
8. Guardá el hallazgo en `docs/research/` con el formato del agente (PATRÓN /
   POR QUÉ IMPORTA / PRODUCTOS REALES / FORTALEZAS / DEBILIDADES / APLICACIÓN
   A MESH / RIESGO PARA MESH / RECOMENDACIÓN / CONFIANZA).

No toques ningún archivo de `apps/mobile/src/` fuera de
`apps/mobile/src/playground/`. Este comando produce evidencia, no
implementación.
