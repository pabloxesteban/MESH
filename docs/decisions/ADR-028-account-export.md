# ADR-028 — Llevarte lo tuyo, antes de irte

**Estado:** Aceptado (2026-08-21) · **Fecha:** 2026-08-21 · **Responsable:** product-architect

## Contexto

[ADR-024](ADR-024-account-deletion.md) dejó el hueco escrito:

> **Exportar tus datos antes de borrarlos.** La Ley 25.326 reconoce el derecho
> de acceso, y hoy se satisface porque todo está a la vista en la app. Un ZIP
> descargable es mejor y no está.

Pero hay algo peor que "mejor y no está", y es un problema de **orden**: borrar
la cuenta es inmediato y no tiene marcha atrás. Sin una forma de llevarse las
cosas antes, **el derecho de supresión y el de acceso se pisan** — ejercer uno
destruye la posibilidad de ejercer el otro, y nadie se entera hasta que ya pasó.

## Decisión

Una función que arma un JSON con todo lo tuyo, y una pantalla **pegada arriba de
borrar la cuenta**.

### 1. La regla que decide qué entra

**Lo que escribiste vos, y lo que te pasó a vos. Lo que escribieron otros, no.**

Concretamente: el export lleva tus mensajes pero **no las respuestas del
artista**, y lleva que alguien respondió a tu búsqueda pero no el precio que te
pasó.

Es la decisión más discutible de esta ADR, así que vale escribir las dos
posturas:

- **En contra:** una conversación exportada a medias es un monólogo, y esos
  mensajes te llegaron a vos. La mayoría de las apps exportan el hilo entero.
- **A favor:** un archivo se comparte y se reenvía. Es una superficie de
  distribución **nueva** para palabras que otra persona escribió en un chat
  privado — incluido el precio que le puso a un trabajo, que es información
  comercial suya. Que vos puedas leerlas en la app no es lo mismo que ponerlas
  en un archivo que sale del teléfono.
- **Lo que lo desempata:** no se pierde nada. Todo eso sigue siendo legible en
  la app, y el derecho de acceso es sobre **tus** datos personales.

La excepción es el asistente: del otro lado no hay una persona, así que sus
turnos también son tuyos y van completos.

### 2. Una sola función, no doce consultas

`export_own_account()` arma el JSON entero del lado de Postgres.

Podría haber sido una docena de consultas del cliente pasando por RLS —más
puro— pero hay una ventaja que importa más: **hay un solo lugar donde mirar qué
entra y qué no**. Doce consultas repartidas por la app son doce lugares donde
alguien agrega un campo sin que nadie lo revise.

Es `security definer` por una sola cosa concreta: leer tu correo de
`auth.users`, que ninguna política de cliente alcanza. Y lleva el candado de
siempre: **no recibe a quién exportar**, saca el id de `auth.uid()`.

### 3. Las fotos son enlaces que vencen

Un `jsonb` con imágenes adentro sería un archivo imposible de abrir. La función
devuelve **rutas**; la app las cambia por enlaces firmados de una semana antes
de escribir el archivo.

Y el archivo **dice que vencen**. Un export que promete fotos para siempre
miente: el enlace muere y la persona se entera cuando abre el archivo un año
después.

Si firmar falla, el export sale igual con las rutas. Perder los enlaces no puede
costar el archivo entero.

### 4. Un archivo, no una pantalla

`expo-file-system` escribe el `.json` en la caché y `expo-sharing` abre la hoja
del sistema. **En la caché y no en documentos**: es un archivo para llevarse
ahora, no para que MESH lo guarde.

Los dos módulos son de la SDK de Expo y vienen en Expo Go, así que esto **no
rompe** [ADR-009](ADR-009-almacenamiento-local.md) — a diferencia de Sentry en
[ADR-026](ADR-026-observability.md), que sí es un módulo nativo.

Donde no hay hoja para compartir —la web, por ejemplo— queda copiar al
portapapeles. Perder el archivo no puede costar el acceso a los datos.

### 5. Se cuenta qué hay adentro antes de entregarlo

La pantalla dice «adentro hay: 3 búsquedas, 2 conversaciones, 1 turno». Un
archivo que aparece sin decir qué trae no es acceso a nada — es un archivo.

Y dice **qué no trae**, antes de que alguien lo descubra abriéndolo.

Las secciones vacías no se listan: una lista de ceros no informa nada.

### 6. Las claves del JSON están en español

`busquedas`, `tus_mensajes`, `lo_que_pediste`. El archivo lo abre una persona,
no un programa. Un export con claves en inglés y snake_case es un volcado de
base de datos con otro nombre.

Es la única parte de MESH donde se rompe la regla de *código en inglés*, y es a
propósito: esto no es código, es un documento de cara a la persona — como los
strings de i18n.

## Lo que NO está

- **Un ZIP con las fotos adentro.** Empaquetar binarios necesita otra
  dependencia y un archivo de decenas de megabytes. Los enlaces firmados
  resuelven el mismo problema.
- **Exportar por correo.** Necesita infraestructura de mail que MESH no tiene.
- **Exportar si perdiste el acceso a la cuenta.** Mismo hueco que
  [ADR-024](ADR-024-account-deletion.md) para el borrado, y sigue abierto.
- **Un formato legible tipo PDF.** JSON es feo y es completo. Un PDF lindo que
  omite campos sería peor.

## Consecuencias

- Dos dependencias nuevas, las dos de la SDK de Expo: `expo-file-system` (ya
  estaba de forma transitiva, ahora declarada) y `expo-sharing`.
- El export crece con el esquema. Cada tabla nueva con datos de personas debería
  entrar acá, y `docs/legal/privacy.md` lo dice.
- La pantalla está **pegada arriba de borrar la cuenta**, no en otra sección.
  Ese es todo el punto.

## Dónde vive cada parte

| Qué | Dónde |
|---|---|
| Qué entra y qué no | `supabase/migrations/20260821000500_account_export.sql` |
| Que no entre lo de otros | `supabase/tests/59_account_export.sql` |
| El archivo y los enlaces | `apps/mobile/src/features/account/exportAccount.ts` |
| La pantalla | `apps/mobile/src/features/account/ExportAccount.tsx` |

## Referencias

- [ADR-024](ADR-024-account-deletion.md) — el borrado, que esto tiene que preceder
- [ADR-009](ADR-009-almacenamiento-local.md) — Expo Go, que esto no rompe
- `docs/legal/privacy.md`
