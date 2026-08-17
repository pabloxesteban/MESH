# MESH — Plan de construcción

**Estado:** Propuesto · **Responsable:** product-architect

Cada fase sigue: **PLANIFICAR → IMPLEMENTAR → TESTEAR → REVISAR → CORREGIR →
DOCUMENTAR → VERIFICAR**. Una fase no arranca hasta que la anterior cumple sus
criterios de salida. Ninguna fase acumula código sin tests.

---

| Fase | Entregable | Criterios de salida |
|---|---|---|
| **0. Auditoría y plan** ✅ | Auditoría del repo, docs, ADRs, agentes, skills, workflows, comandos | Este conjunto de documentos existe y está aprobado |
| **1. Fundaciones** ✅ | Workspaces, tsconfig, eslint (con las reglas de enforcement), pipeline de CI, esqueleto de `packages/domain` con taxonomía y tipos | `npm run check` en verde sobre un código vacío; el CI corre en cada push |
| **2. Marca** | SVG del símbolo (dos tamaños ópticos), lockup, set de íconos de app, ícono adaptativo, favicon, hoja de uso | La marca es legible a 16px, funciona tinta-sobre-papel e invertida, el ícono revisado en la home de un dispositivo |
| **3. Design system** | Tokens, `ThemeProvider`, `MotionProvider`, primitivos, Button/Tag/Chip/Input, componentes de estado (Skeleton/Empty/Error/Toast) | El test de contraste pasa para todo par de tokens en ambos temas; las reglas de lint bloquean un hex crudo; los tests de componentes cubren los estados |
| **4. Base de datos** | Migraciones de todas las tablas, enums, restricciones, índices, RPCs; seed de referencia (categorías, estilos, ubicaciones) | `supabase db reset` limpio; los tipos TS generados coinciden con `packages/domain`; pasan los tests de restricciones |
| **5. Seguridad** | Políticas RLS de todas las tablas, políticas de storage, triggers de cuota | Pasa el test de garantía genérica de RLS; pasan los tests cruzados en todas las tablas de propiedad de usuario; escritura cruzada en storage bloqueada |
| **6. Autenticación** | Arranque de sesión anónima, upgrade de cuenta, ingreso/salida, recuperación, guardado seguro de tokens, layout raíz con sesión | Pasa el flujo 3 de la suite E2E; ningún token fuera de `expo-secure-store`; escaneo de secretos del bundle limpio |
| **7. Contenido** | Esquemas de contenido, CLI de seed (validar → redimensionar → blurhash → subir → upsert), 2–3 artistas reales de punta a punta | La carga es idempotente; el contenido malformado aborta antes de insertar; la falta de consentimiento bloquea la corrida; los fixtures se rechazan en modo producción |
| **8. Descubrimiento** | RPC del feed, mazo, `ArtworkCard`, gestos, botones, deshacer, prefetch, detalle de obra, los cuatro estados | 60fps sostenidos en un Android de gama media; camino solo-botones completo; la cola offline sobrevive al modo avión |
| **9. Motor de gusto** | Motor de gusto en `packages/domain`, persistencia, pantalla de gusto, vista de evidencia, reset | Pasan todos los tests de gusto de `matching.md` §8; el umbral es correcto; la revelación respeta reducción de movimiento |
| **10. Matching** | Motor de match, bandas, derivación de razones, pantalla de matches, estados vacíos honestos | Pasan todos los tests de matching, incluidos renormalización por omisión y estabilidad de orden; ninguna razón referencia un componente omitido |
| **11. Perfiles** | Perfil profesional, grilla de portfolio, hero, pill de disponibilidad, precio, estilos, redes | Hero pintado en < 800ms en caliente; los campos faltantes no renderizan nada en vez de un placeholder; la grilla no salta |
| **12. Proyectos** | Flujo de creación, subida de referencias (con EXIF removido), matching por proyecto, detalle de proyecto | Pasan los tests de matching por proyecto; cuotas impuestas del lado del servidor; borradores abandonados recuperables |
| **13. Contacto** | Compositor de mensaje, vista previa editable, traspaso a WhatsApp/Instagram | Test golden: el mensaje compuesto no contiene nada que la persona no haya provisto; la falta de canal cambia el CTA en vez de fingir uno |
| **14. Analytics** | `track()`, unión tipada de eventos, buffer MMKV, ajuste de opt-out | Cada evento del catálogo se dispara una vez en la corrida E2E; sin texto libre en ninguna propiedad; el opt-out no encola nada |
| **15. QA** | Suite E2E, cobertura de estados de componentes, casos borde | Los seis flujos E2E en verde, incluidos el de solo accesibilidad y el offline |
| **16. Auditoría de seguridad** | Revisión completa contra el checklist del modelo de seguridad; modelo de amenazas revisitado | Todos los ítems tildados; `npm audit` sin alto/crítico; ningún hallazgo abierto |
| **17. Performance** | Pasada de medición en dispositivo, verificación del pipeline de imágenes, auditoría de round trips | Todos los presupuestos de la estrategia de testing §7 cumplidos y registrados con el nombre del dispositivo |
| **18. Pulido de UX** | Pasada de copy en `es-AR`, barrido de callejones sin salida, tipografía dinámica, pasada de VoiceOver/TalkBack, ambos temas | Ninguna pantalla sin acción hacia adelante; el lector de pantalla completa el flujo 1; el tamaño de tipografía accesible más grande no recorta |
| **19. Listo para publicar** | Assets de tienda, declaraciones de privacidad, recorrida con los artistas, plan de rollback | Los artistas vieron y aprobaron sus propios perfiles; el procedimiento de retiro fue probado; release check completo |

---

## Notas de secuencia

**Seguridad (5) precede a autenticación (6), que precede a contenido (7).**
Las políticas existen antes de que haya datos que proteger, y el contenido se
carga en un esquema que ya está cerrado. Ponerle RLS a una base ya poblada es la
forma en que las tablas quedan abiertas.

**Marca (2) precede al design system (3)**, que precede a toda pantalla. Tokens
derivados de una identidad terminada le ganan a tokens inventados por pantalla y
reconciliados después.

**Gusto (9) precede a matching (10)**, y ambos preceden a perfiles (11) — una
pantalla de perfil sin una razón para llegar a ella no se puede evaluar.

**Contenido (7) precede a descubrimiento (8).** Construir el mazo contra fixtures
te enseña cómo se comportan los fixtures, no cómo se comporta la fotografía real
de tatuajes — otras relaciones de aspecto, otros rangos tonales, otros tamaños de
archivo.

## Qué podría reordenar esto

- Si la recolección de consentimiento y media es lenta, la Fase 7 aterriza con
  2–3 artistas reales y el resto llega durante la Fase 11. El descubrimiento
  nunca se construye únicamente contra fixtures.
- Si la sensación del mazo resulta más difícil de lo esperado en la Fase 8, se
  le da su propio timebox y un spike antes del resto de la fase — es el mayor
  riesgo de producto y el menos arreglable después.

## Estado de la Fase 1

Cerrada el 2026-08-17. Lo que quedó en pie:

- Tres workspaces npm (`apps/mobile`, `packages/domain`, `tools/seed`), sin
  orquestador.
- Expo SDK 57 con Expo Router, esquema `mesh://`, rutas tipadas.
- Las tres reglas de lint de ADR-008 y system-architecture §3, **verificadas
  contra un archivo que las viola a propósito** — no se asumió que funcionaran.
- `packages/domain`: taxonomía (1 categoría, 15 estilos), tipos centrales,
  esquemas Zod de contenido, `TASTE_VERSION` / `MATCHING_VERSION`. 24 tests.
- Validador de contenido real, ejercitado contra contenido roto: consentimiento
  faltante, E.164 inválido, URL de Instagram, estilo fuera de taxonomía, pesos
  que no suman 1, SVG, archivo faltante, archivo sobre 12 MB.
- Escaneo de secretos y gate de `npm audit` con excepciones fechadas.
- CI en tres jobs paralelos que cubren los ocho pasos de la estrategia de
  testing §8.
- `supabase init` con auth anónima habilitada (ADR-002), contraseña mínima de
  10, y `mesh://auth/callback` como única URL de redirección.
- Bundle de Android exportado: Metro resuelve `@mesh/domain` desde el workspace
  y la taxonomía viaja en el bundle.

**Sin verificar en este entorno:** `supabase start` y `supabase db reset`. El
entorno remoto de desarrollo no puede correrlos — los contenedores no confían en
la CA del proxy saliente y el runtime no puede setear rlimits. Postgres 17
levanta y el esquema inicializa; falla el paso que necesita salir a npm desde
adentro de un contenedor. Hay que correrlos en una máquina local antes de
empezar la Fase 4. El job `database` del CI sí los corre en GitHub Actions.

## Primeras tareas de implementación (Fase 1)

1. Inicializar workspaces npm: `apps/mobile`, `packages/domain`, `tools/seed`.
2. `tsconfig.base.json` raíz, `eslint.config.mjs` con las reglas de capas y de
   valores de diseño, Prettier, `.editorconfig`.
3. `npx create-expo-app` dentro de `apps/mobile` con el SDK actual y TypeScript;
   Expo Router; verificar que arranca en un dispositivo.
4. `packages/domain`: taxonomía de categorías/estilos como datos, tipos
   TypeScript centrales, esquemas Zod de contenido, constantes
   `TASTE_VERSION`/`MATCHING_VERSION`, Vitest configurado con un test que pasa.
5. `supabase init`; verificar `supabase start` y `supabase db reset` localmente.
6. Workflow de CI que implemente los nueve pasos de la
   [estrategia de testing §8](../testing/test-strategy.md).
7. `.env.example` para la app y para la herramienta de seed, con un comentario
   que explique qué claves son públicas por diseño y cuáles nunca salen de la
   máquina del operador.
