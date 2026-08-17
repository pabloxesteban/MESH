---
description: Correr la suite de tests de MESH en el orden correcto y reportar qué falló realmente.
---

Corré la suite de tests para **$ARGUMENTS** (por defecto: todo lo afectado por el
diff actual).

Orden — pará y reportá en la primera capa que falle, porque las capas siguientes
dependen de ella:

1. `npm run typecheck` (todos los workspaces)
2. `npm run lint` — incluidas las reglas de capas y de valores de diseño crudos
3. `npm test -w packages/domain` — gusto, matching, esquemas de contenido
4. Validación de contenido sobre `content/artists/**`
5. `supabase start` → aplicar migraciones → tests de RLS y restricciones
6. Tests de componentes (`jest-expo`)
7. E2E (Maestro) — solo cuando cambió el camino crítico o antes de un release

Reglas de reporte:

- Citá la salida real de la falla. No resumas una falla en una suposición.
- Ante un **fixture de matching** que falla: investigá el algoritmo. Nunca
  rebases el valor esperado — ese test es el mecanismo de enforcement de la regla
  de versionado de `docs/product/matching.md` §9.
- Ante un **test de RLS** que falla: tratalo como un hallazgo de seguridad, no
  como un bug de test.
- Ante un test intermitente: arreglalo o borralo. No lo dejes y reintentes.
- Si se salteó una capa (sin Docker, sin dispositivo), decilo explícitamente en
  vez de reportar verde.
