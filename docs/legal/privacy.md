# Política de privacidad de MESH

**Última actualización:** [[FECHA DE PUBLICACIÓN]]
**Responsable de la base de datos:** [[RAZÓN SOCIAL]], [[DOMICILIO]], CABA,
Argentina.
**Contacto:** [[CORREO DE CONTACTO]]

> Este documento está redactado contra el código real de MESH: cada dato que se
> menciona existe en una tabla, y cada borrado que se promete está probado en
> `supabase/tests/`. Lo que está entre `[[ ]]` todavía no se completó.

## Lo más importante, en cinco líneas

- MESH guarda lo que vos escribís y subís, y nada más. No compra datos, no
  vende datos y no tiene publicidad.
- **No pedimos tu fecha de nacimiento ni ningún documento.**
- **No hay ningún perfilado automático que decida por vos.** El orden en que ves
  a los tatuadores lo calcula una función determinística que se puede leer.
- Podés borrar tu cuenta desde la app, sin escribirle a nadie, y se borra todo.
- Tus búsquedas son privadas salvo que vos las abras.

## Qué datos guardamos, y por qué

| Qué | Para qué | De dónde sale |
|---|---|---|
| Tu correo, si creás una cuenta | Que puedas entrar desde otro teléfono y recuperar la contraseña | Lo escribís vos |
| Un identificador de sesión anónima | Que la app funcione antes de que tengas cuenta | Lo genera el sistema |
| Tu nombre para mostrar, si lo ponés | Que un tatuador sepa con quién habla | Lo escribís vos |
| Tus búsquedas y las fotos de referencia | Encontrar a quién le podés escribir | Las subís vos |
| Tus mensajes | El chat | Los escribís vos |
| Lo que le contás al asistente | Armar tu pedido | Lo escribís vos |
| Tus reseñas | Que otra persona pueda decidir | Las escribís vos |
| Lo que guardaste con el corazón | La pantalla de Guardados | Lo tocás vos |
| Que declaraste ser mayor de 18, con la fecha en que lo dijiste | Que no se arreglen turnos de tatuaje para menores | Lo declarás vos |
| Tu ubicación aproximada, **si la activás** | Ordenar por cercanía | El GPS del teléfono, con tu permiso |
| Denuncias y bloqueos que hiciste | Que podamos revisarlos y que el bloqueo funcione | Los hacés vos |
| Eventos de uso, **solo si lo activás** | Entender qué pantallas sirven | La app, y se puede apagar desde Perfil |

Si además ofrecés un servicio: tu perfil público, tus estilos, tu obra, tu
horario semanal y tus datos de contacto. Eso es público a propósito — es el
producto.

## Lo que no hacemos

- **No vendemos ni cedemos datos personales a terceros** con fines comerciales.
- **No hay publicidad**, ni propia ni de terceros, ni identificadores de
  seguimiento publicitario.
- **No perfilamos tu comportamiento para decidir qué ves.** Hoy la app no ejecuta
  ningún motor de gusto: el orden de la grilla es por cercanía y nada más.
- **No leemos tus chats.** Solo vemos un mensaje si alguien lo denuncia.
- **No guardamos tu fecha de nacimiento.** Guardamos que dijiste ser mayor, y
  cuándo.

## Dónde están los datos

En servidores de [[PROVEEDOR DE INFRAESTRUCTURA — hoy Supabase]], ubicados en
[[REGIÓN]]. Eso implica una transferencia internacional de datos: al usar MESH
la aceptás. Ver [[BASE LEGAL DE LA TRANSFERENCIA]].

Si algo se rompe en la app, mandamos un **reporte de error** a
[[PROVEEDOR DE REPORTES DE ERROR — hoy ninguno configurado]]. Ese reporte lleva
qué se rompió, en qué pantalla, con qué código, la versión de la app y un
identificador de sesión aleatorio que se descarta al cerrar. **No lleva tu
identificador de usuario, ni tu correo, ni nada de lo que escribiste**: el
mensaje del error pasa antes por un filtro que reemplaza cualquier cosa con
forma de correo, teléfono, identificador o texto citado. Se puede apagar desde
Perfil.

Las conversaciones con el asistente se procesan con un modelo de
[[PROVEEDOR DEL MODELO — hoy Anthropic]], del lado del servidor. Solo se le
manda el texto de esa conversación. No se le manda tu correo, tu nombre ni tu
ubicación.

## Cuánto tiempo

Mientras tengas la cuenta. Cuando la borrás, se borra todo lo de la tabla de
arriba, incluidas las fotos.

Queda **un solo registro**: que una cuenta se borró, con su identificador
interno y la fecha. Sin tu correo, sin tu nombre y sin nada de lo que había
adentro. Existe para poder demostrar que cumplimos, y por eso no se borra con
la cuenta.

## Tus derechos

Podés, en cualquier momento:

- **Acceder** a tus datos. Están todos a la vista en la app.
- **Rectificarlos.** Todo lo que escribiste se edita desde donde lo escribiste.
- **Suprimirlos.** Perfil → Borrar mi cuenta. Es inmediato y no hay período de
  gracia.
- **Oponerte** a la medición de uso. Perfil → el interruptor de datos de uso, y
  el de reportes de error, que son dos cosas distintas y se apagan por separado.
- **Reclamar** ante la Agencia de Acceso a la Información Pública, que es la
  autoridad de control de la Ley 25.326 (argentina.gob.ar/aaip).

Para cualquiera de estos, o si algo no te cierra: [[CORREO DE CONTACTO]].
Contestamos dentro de [[PLAZO — la ley fija 10 días corridos para acceso y 5
hábiles para rectificación o supresión]].

## Menores

MESH es para mayores de 18. Al entrar se pregunta una sola vez, y sin esa
declaración **no se puede cerrar un turno**. Si nos enteramos de que una cuenta
es de un menor, la borramos.

## Si esto cambia

Avisamos en la app antes de que un cambio entre en vigencia. La versión vigente
siempre está en [[URL PÚBLICA]].
