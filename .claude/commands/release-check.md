---
description: Puerta previa al release, completa: producto, corrección, seguridad, performance, contenido y analytics.
---

Corré el chequeo de release para **$ARGUMENTS** (por defecto: la rama actual).

Seguí `.claude/workflows/release-check.md` sección por sección, en orden, tomando
el rol de cada agente. No saltees una sección porque "pasó la vez anterior".

Reportá como checklist con ✅ / ❌ / ⚠️, y después:

- **Bloqueantes** — hay que arreglarlos antes del release, con el arreglo
  nombrado
- **Problemas conocidos** — publicamos con esto, y por qué es aceptable
- **Lista de observación** — qué mirar después del lanzamiento, y qué nos haría
  volver atrás

Bloqueantes duros, sin excepciones:

- Cualquier hallazgo de seguridad alto o crítico abierto
- Cualquier tabla de `public` sin RLS habilitado, forzado y con políticas
- Cualquier fila fixture en la base de producción
- Cualquier artista sin registro de consentimiento fechado
- Cualquier contenido inventado, o una razón de match no derivada de un
  componente que aportó
- Cualquier callejón sin salida de UX en el camino crítico
- Cualquier dark pattern
- Un fixture de matching que falla

Terminá con una nota de release corta: qué cambió, qué se midió (números, y el
dispositivo donde se midió), qué está roto y se conoce, y qué vamos a observar. Si
algo no se midió, escribí "no medido" en lugar de una estimación.
