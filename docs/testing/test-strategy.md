# MESH — Estrategia de testing

**Estado:** Propuesto · **Responsable:** qa-engineer

---

## 1. Qué optimizamos

Los tests existen para proteger tres cosas, en este orden:

1. **La corrección de los motores de gusto y matching** — la única afirmación
   original del producto. Tiene que ser demostrable, no observada.
2. **La autorización** — una política rota es una filtración de datos, no un
   bug.
3. **El camino crítico** — arranque → descubrir → gusto → match → perfil →
   contacto. Si ese camino se rompe, MESH no hace nada.

El porcentaje de cobertura no es un objetivo. La cobertura de esas tres cosas
sí.

## 2. Capas

| Capa | Herramienta | Alcance | Velocidad |
|---|---|---|---|
| Unitaria | Vitest | `packages/domain` — gusto, matching, esquemas de contenido, formateadores | ms |
| Contrato | Vitest + Zod | Los archivos de contenido validan; los tipos de la base coinciden con los de `packages/domain` | ms |
| Base de datos / RLS | Vitest contra Supabase local | Políticas, restricciones, triggers, RPCs, acceso cruzado | segundos |
| Componentes | Jest + React Native Testing Library | Primitivos del design system, tarjetas, estados | segundos |
| E2E | Maestro | Flujos críticos en un simulador o dispositivo real | minutos |
| Pasada manual en dispositivo | Checklist | Sensación del gesto, carga de imágenes, hápticos, tipografía dinámica | por release |

Dos runners es una contrapartida deliberada: Vitest es mucho más rápido para
lógica pura y la suite de dominio corre en cada guardado; `jest-expo` sigue
siendo el camino maduro para la capa de componentes de React Native.

## 3. Tests de dominio (`packages/domain`)

La lista completa requerida está en
[`matching.md`](../product/matching.md) §8 y es el criterio de aceptación de las
Fases 9–10. Lo principal:

- Gusto: ponderación de interacciones, reparto multi-estilo, saturación,
  aversión, simetría del deshacer, límite del umbral en `n = 11` vs `n = 12`,
  entrada vacía.
- Matching: coincidencia exacta / parcial / nula, variantes de ubicación,
  variantes de banda de precio, frescura de disponibilidad,
  **renormalización por omisión**, estabilidad del orden, derivación de razones
  y umbrales.
- Basados en propiedades (fast-check): el puntaje siempre en `[0,1]`; agregar un
  me gusta nunca baja el puntaje de un artista que coincide; las razones siempre
  son un subconjunto de los componentes que aportan.

Los fixtures se commitean con sus valores esperados. Cambiar un valor esperado
requiere subir la versión del algoritmo y una justificación documentada — el test
es el mecanismo de enforcement de §9 de la spec de matching.

## 4. Tests de base de datos y RLS

Viven en `supabase/tests/`, en pgTAP, y corren con `npm run db:test` contra
`supabase start`. Cambian de rol con `set local role authenticated` más un claim
`sub`, que es exactamente lo que PostgREST hace con un JWT. **Correrlos como
`postgres`, que tiene BYPASSRLS, los haría pasar siempre** — es la forma más
común de tener una suite de RLS que no prueba nada.

**La garantía genérica** (`00_rls_guarantee.sql`) — ocho tests que recorren el
catálogo de Postgres, no una lista de tablas escrita a mano, así que una tabla
nueva queda cubierta sin que nadie se acuerde de agregarla:

```
para cada tabla del esquema public:
  verificar rowsecurity = true
  verificar forcerowsecurity = true
  verificar que tenga políticas, O ningún grant de cliente
para cada política "for insert":  verificar with_check no es null
para cada política "for update":  verificar using Y with_check
verificar que ninguna política tenga cmd = 'ALL'
verificar que anon no tenga privilegios en public
para cada función security definer:  verificar search_path fijado
```

"Con políticas **o** sin grants" y no "≥1 política" por un caso real:
`audit_events` a propósito no tiene ninguna. Una tabla que ningún rol de cliente
puede tocar es inalcanzable tenga las políticas que tenga, y escribirle políticas
de mentira para satisfacer un test las volvería la documentación equivocada de lo
que hace.

**Tests cruzados por tabla** — para cada tabla de propiedad de usuario
(`interactions`, `taste_profiles`, `projects`, `project_styles`,
`project_references`, `matches`, `profiles`):

- A puede leer y escribir sus propias filas.
- B obtiene **cero filas** al seleccionar las de A (no un error — silencio, para
  no filtrar existencia).
- El UPDATE y el DELETE de B sobre filas de A afectan 0 filas.
- B no puede INSERTAR una fila con `user_id = A`.

**Tests de catálogo:**

- Los profesionales no publicados y sus piezas de portfolio son invisibles para
  los clientes.
- Los `media_assets` de una referencia privada de otro usuario son invisibles.
- `analytics_events` no puede ser seleccionada por ningún rol de cliente.
- `audit_events` es inaccesible para `anon` y `authenticated` por completo.

**Tests de restricciones** (`10_constraints.sql`) — uno de rechazo por
restricción. Un test que solo verifica el camino feliz no prueba nada sobre una
restricción: prueba que no molesta. Cubre precio incompleto, precio min > max,
disponibilidad sin fecha, publicado sin canal de contacto, reclamado sin dueño,
Instagram como URL, WhatsApp fuera de E.164, un cuarto estilo primario, pericia
cero, dos piezas sobre la misma imagen, SVG, path absoluto, `is_saved` con
`verdict = 'pass'`, interacción duplicada, y las dos formas de una razón de match
sin fundamento. Los pesos de estilo de una pieza los rechaza el validador de
contenido, no la base.

**Tests del feed** (`30_discovery_feed.sql`) — sin sesión viene vacío; la obra de
un profesional sin publicar no aparece; nunca dos piezas consecutivas del mismo
profesional; dos llamadas idénticas devuelven el mismo orden; dos páginas de 6
reconstruyen el feed sin repetir ni saltear; lo ya visto no vuelve, y el orden
del resto no se mueve.

**Tests de storage:** el usuario B no puede escribir en `references/{A}/…`;
subida de SVG rechazada; subida sobre el tope rechazada.

## 5. Tests de componentes

Para todo componente que trae o muestra datos remotos, verificar que rendericen
los cuatro estados: **carga, vacío, error (con reintento), éxito**. Es mecánico y
es lo que más confiablemente se pudre.

Además:
- Los primitivos del design system renderizan desde tokens (un snapshot atrapa un
  hex crudo que se cuela; una regla de lint lo impide de entrada).
- Los controles interactivos exponen una etiqueta de accesibilidad y un área
  táctil de ≥44pt — verificado, no mirado a ojo.
- El mazo expone acciones de accesibilidad para me gusta / paso / guardar.
- El compositor del mensaje de contacto, dado un perfil de gusto y un proyecto,
  produce exactamente el string esperado y **nada más** — un test golden contra
  la fabricación.

## 6. Flujos E2E (Maestro)

1. **Primer arranque → contacto.** Instalación limpia → intro → mazo → 12
   interacciones → revelación de gusto → matches → abrir perfil → abrir contacto
   → verificar el contenido del mensaje precargado (la URL de WhatsApp se
   verifica, no se abre).
2. **Usuario dirigido.** Instalación limpia → ir a Proyectos → crear un proyecto
   → recibir matches → abrir un perfil.
3. **Upgrade de cuenta.** Sesión anónima con gusto → crear cuenta → cerrar
   sesión → ingresar → gusto y guardados intactos.
4. **Camino de accesibilidad.** Completar el flujo 1 usando solo botones, sin
   deslizar.
5. **Offline.** Modo avión en medio del mazo → las interacciones se encolan →
   reconectar → las interacciones se persisten exactamente una vez.
6. **Vacío y error.** La lista de matches vacía muestra el estado vacío honesto;
   una falla de red forzada muestra error + reintento, y el reintento recupera.

El E2E cubre flujos, nunca corrección de algoritmos — de eso se ocupa §3.

## 7. Tests de performance

No automatizados en V1; un checklist medido por release en un Android real de
gama media, build de release:

- Arranque en frío → primera obra pintada: **< 2,5s** en 4G
- Gesto del mazo: 60fps sostenidos, sin frames caídos en 20 swipes
- Abrir perfil → hero pintado: **< 800ms** con caché caliente
- Memoria después de 100 tarjetas: sin crecimiento sin límite
- Query del feed, del perfil y de matches: **1 round trip cada una**, verificado
  en el log de red

Los números se registran en el release check con el nombre del dispositivo. Un
número no registrado no es una medición.

## 8. CI

En cada push:

1. Chequeo de tipos en todos los workspaces
2. Lint (incluidas las reglas de no-valores-de-diseño-crudos y
   no-supabase-en-pantallas)
3. Tests unitarios de `packages/domain`
4. Validación de contenido sobre `content/artists/**`
5. Levantar Supabase local → aplicar migraciones → tests de RLS y restricciones
6. Tests de componentes
7. Escaneo de secretos en el bundle
8. `npm audit` (falla en alto/crítico)

El E2E corre a demanda y antes de un release, no en cada push.

## 9. Definición de terminado para una feature

- [ ] Los tipos pasan, el lint pasa
- [ ] Tests unitarios para la lógica nueva en `packages/domain`
- [ ] Tests de RLS para cualquier tabla o política nueva
- [ ] Estados de carga / vacío / error / reintento implementados **y** testeados
- [ ] Accesibilidad: etiquetas, áreas táctiles, camino sin gestos
- [ ] Ningún valor de diseño crudo en las pantallas
- [ ] Eventos de analytics agregados al catálogo en el mismo commit
- [ ] Documentación actualizada (spec, ADR o skill)
- [ ] Pasada manual en dispositivo para todo lo que toque gestos o imágenes
