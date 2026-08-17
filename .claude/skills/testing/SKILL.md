---
name: testing
description: Qué testear en MESH y cómo — convenciones de tests unitarios, de RLS, de estados de componentes y E2E. Usala al escribir tests o al decidir si una feature está terminada.
---

# Testing

## Propósito

Proteger las tres cosas que importan: el motor de matching, la autorización, y el
camino crítico.

## Cuándo usarla

Al escribir cualquier test. Al decidir si una feature está terminada. Al
investigar una regresión.

## Capas

| Capa | Herramienta | Alcance |
|---|---|---|
| Unitaria | Vitest | `packages/domain` — lógica pura |
| Base / RLS | Vitest contra Supabase local | Políticas, restricciones, triggers, RPCs |
| Componentes | Jest + RNTL | Componentes del design system y de features |
| E2E | Maestro | Seis flujos críticos |

## Los dos tests que sostienen todo

**Garantía genérica de RLS** — enumerar `pg_tables` en `public`; fallar si alguna
tiene RLS apagado, force apagado, o cero políticas; fallar ante cualquier política
`for all` o política de insert sin `with check`. Esto hace impublicable una tabla
insegura, cosa que la revisión de código no puede.

**Test golden contra la fabricación** — dado un perfil de gusto y un proyecto, el
mensaje de contacto compuesto es exactamente el string esperado, sin contener nada
que la persona no haya provisto. Y ninguna razón de match puede referenciar un
componente omitido.

## Patrón de acceso cruzado

```ts
// para cada tabla de propiedad de usuario
const a = await signIn(USER_A)
const b = await signIn(USER_B)

await a.from('projects').insert({ ... })              // ok
const { data } = await b.from('projects').select()     // → [] (silencio, no error)
const { count } = await b.from('projects')
  .update({ title: 'x' }).eq('user_id', USER_A.id)     // → 0 filas afectadas
await expect(
  b.from('projects').insert({ user_id: USER_A.id, ... })
).rejects.toThrow()                                     // violación de política
```

Cero filas en lugar de un error en el SELECT es deliberado — un error filtraría
que la fila existe.

## Cobertura de estados

Todo componente que renderiza datos remotos se testea para **carga, vacío, error
+ reintentar, éxito**. Usá un helper compartido para que escribirlo sea más barato
que saltearlo. Esta es la cobertura que se pudre primero.

## Flujos E2E

1. Primer arranque → 12 interacciones → gusto → matches → perfil → contacto
2. Usuario dirigido → proyecto → matches → perfil
3. Anónimo → upgrade de cuenta → cerrar sesión → ingresar → datos intactos
4. **Flujo 1 usando solo botones, sin deslizar**
5. Offline en medio del mazo → cola → reconexión → persistido exactamente una vez
6. Lista de matches vacía + falla de red forzada → estados correctos → el
   reintento recupera

El E2E cubre flujos, nunca corrección de algoritmos.

## Fixtures

Los fixtures de matching se commitean con sus valores esperados. **Cambiar un
valor esperado requiere subir la versión del algoritmo y una justificación
documentada** — el test es el mecanismo de enforcement, así que nunca "arregles"
un test de matching que falla editando la expectativa.

## Anti-patrones

Testear detalles de implementación en vez de comportamiento · Snapshots
sustituyendo aserciones · Un test intermitente que queda en la suite · Mockear lo
que se está testeando · Evaluar la corrección de un algoritmo visualmente · Editar
un fixture para que un test pase · E2E duplicando la cobertura unitaria hasta que
la suite es demasiado lenta para correrse · Perseguir un porcentaje de cobertura.

## Checklist de calidad

- [ ] La lógica pura nueva tiene tests unitarios en `packages/domain`
- [ ] La tabla nueva tiene tests cruzados de RLS
- [ ] La restricción nueva tiene un test de rechazo
- [ ] Los estados de los componentes están todos testeados
- [ ] Un cambio en el camino crítico vuelve a correr el flujo E2E afectado
- [ ] Ningún test depende del reloj ni de un orden aleatorio
- [ ] Los tests de matching que fallan se investigan, nunca se rebasan
