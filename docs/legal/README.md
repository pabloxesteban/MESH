# Textos legales

Tres documentos, y **ninguno de los tres se puede publicar como está**.

Cada uno tiene marcadores `[[ASÍ ]]` en los lugares donde va un dato que solo
puede completar el dueño del producto: la razón social, el domicilio, el correo
de contacto, la jurisdicción. **No los inventé a propósito.** Un texto legal con
una razón social inventada no es un borrador incompleto: es un documento falso,
y encima uno que la gente lee creyendo que dice la verdad.

| Documento | Qué es | Quién lo exige |
|---|---|---|
| [`privacy.md`](privacy.md) | Qué datos se guardan, para qué, cuánto tiempo, y cómo se borran | Ley 25.326 (arts. 6 y 14 a 16); App Store 5.1.1; Google Play |
| [`terms.md`](terms.md) | Qué es MESH, qué no es, y qué pasa si alguien rompe las reglas | App Store 1.2 (EULA para apps con contenido de usuarios) |
| [`moderation.md`](moderation.md) | Qué se denuncia, qué hacemos, en cuánto tiempo | App Store 1.2; es también lo que la gente pregunta al denunciar |

## Antes de publicar

1. Completar todos los `[[ ]]`. Un `grep -rn '\[\[' docs/legal/` tiene que
   volver vacío.
2. **Que los mire un abogado.** Escribí lo que el producto hace de verdad,
   verificado contra el esquema y las políticas; no escribí lo que la ley
   argentina exige decir, porque eso no lo sé y no se adivina.
3. Publicarlos en una URL estable. Apple pide un enlace a la política de
   privacidad en la ficha de la App Store, y tiene que estar accesible **sin
   iniciar sesión**.
4. Registrar la base de datos ante la AAIP si corresponde. La Ley 25.326 lo
   pide para bases de datos personales; si aplica a MESH, es un trámite y no
   una decisión de producto.

## Por qué están en el repo y no en un Google Doc

Porque describen el comportamiento del código, y el código cambia. Cada vez que
una migración agrega una tabla con datos de personas, `privacy.md` queda
desactualizado en el mismo commit — y acá se nota en la revisión.
