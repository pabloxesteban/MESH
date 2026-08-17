# Workflow — Revisión de seguridad

Correr antes de cada release, y ante cualquier cambio que toque datos, auth,
subidas, deep links o secretos.

**Conduce:** `security-reviewer`. **Apoyan:** `backend-engineer`,
`mobile-engineer`.

## 1. Inspeccionar

- `supabase/migrations/` — cada tabla, política, grant y función
- `apps/mobile/src/data/` — cliente, manejo de sesión, mapeo de errores
- Cualquier camino de subida
- Cualquier handler de deep link
- `.env.example`, configuración de CI, `tools/seed/`
- `docs/security/threat-model.md` para lo que el cambio introduzca

## 2. Base de datos

- [ ] Toda tabla de `public`: RLS habilitado **y** forzado
- [ ] `revoke all` y después grants explícitos por verbo
- [ ] Políticas por comando; **ninguna `for all`**
- [ ] Toda política `for insert` tiene un `with check`
- [ ] Las políticas de update protegen `using` **y** `with check`
- [ ] La propiedad siempre es `auth.uid()`, nunca provista por el cliente
- [ ] Las funciones `SECURITY DEFINER` fijan `search_path = ''`, usan nombres
      completamente calificados, sin identificadores interpolados
- [ ] Los tests cruzados pasan en toda tabla de propiedad de usuario
- [ ] `media_assets` no expone las rutas de referencias privadas de otra persona
- [ ] `audit_events` es inalcanzable para `anon` y `authenticated`

## 3. Storage

- [ ] Los buckets escribibles por el dueño verifican
      `(storage.foldername(name))[1] = auth.uid()::text`
- [ ] La lista blanca de MIME excluye SVG; el tope de tamaño se impone en el
      bucket
- [ ] Los nombres de archivo son UUIDs generados por el servidor; la entrada del
      usuario nunca llega a una ruta
- [ ] EXIF eliminado antes de subir en las referencias de usuario (un test lo
      verifica)
- [ ] URLs firmadas de vida corta, nunca logueadas ni persistidas

## 4. Cliente

- [ ] Tokens de sesión solo en `expo-secure-store`
- [ ] Cerrar sesión limpia el caché de queries y todos los namespaces de MMKV con
      datos de usuario
- [ ] Ningún string `service_role` en el bundle compilado (chequeo de CI en
      verde)
- [ ] Solo se lee `EXPO_PUBLIC_*` desde el código de la app
- [ ] Parámetros de deep link validados; ningún link que mute; no autorizado e
      inexistente resuelven ambos a no encontrado
- [ ] Los errores crudos de base de datos nunca se muestran ni se loguean
- [ ] Ningún texto libre en las propiedades de analytics

## 5. Integridad (T9 — tratada como cuestión de seguridad)

- [ ] Ninguna reseña, precio, disponibilidad ni estadística inventada en ningún
      lado
- [ ] Toda razón de match mapea a un componente que efectivamente aportó
- [ ] Ninguna razón referencia un componente omitido
- [ ] La disponibilidad vieja (>45 días) omitida del puntaje y de la pantalla
- [ ] El mensaje de contacto compuesto no contiene nada que la persona no haya
      provisto (test golden en verde)
- [ ] Los fixtures están marcados, señalizados y bloqueados en la carga a
      producción

## 6. Cadena de suministro

- [ ] `npm audit` limpio en alto/crítico
- [ ] Lockfiles commiteados
- [ ] Dependencias nuevas justificadas; ninguna agregada a `tools/seed` sin
      revisión

## 7. Reportar

Por cada hallazgo: qué es, el camino concreto de explotación, el radio de
explosión, el arreglo. Ordenados por lo que el atacante efectivamente gana. **Sin
relleno de problemas teóricos** — una lista larga de ruido de severidad baja
entierra el único hallazgo que importa.

Actualizá `docs/security/threat-model.md` si el cambio introduce un vector nuevo
o retira uno viejo.
