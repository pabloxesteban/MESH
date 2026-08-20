# ADR-002 — Autenticación anónima primero

**Estado:** Aceptado (2026-08-17) · **Fecha:** 2026-08-17 · **Responsable:** product-architect

## Contexto

El valor de MESH recién se hace visible después de que la persona reacciona a una
docena de trabajos. El brief pide registro, ingreso, persistencia de sesión y
pantallas protegidas. También pide que a un usuario dirigido nunca se lo fuerce a
pasar por el onboarding, y que la primera pregunta del onboarding sea visual.

## Problema

Pedir una cuenta antes del mazo pone un formulario entre alguien que llega por
primera vez y lo único que podría convencerlo. No pedir ninguna cuenta hace que
el gusto viva solo en el dispositivo y vuelve ambiguo el modelo de propiedad de
todas las tablas.

## Opciones

**A. Muro de registro.** Cuenta primero, después la app. Simple, convencional, y
pierde una parte grande de los usuarios nuevos antes de que vean nada.

**B. Todo local hasta el registro.** El gusto se guarda en MMKV y se sube al
crear la cuenta. Sin complejidad de auth al principio — pero crea un segundo
camino de datos sin autenticar, un problema de fusión al registrarse, y un
esquema donde `user_id` a veces no existe.

**C. Sesión anónima de Supabase en el primer arranque, upgrade a demanda.** Toda
persona tiene un `auth.uid()` real desde el arranque. Crear una cuenta real
vincula la misma fila de `auth.users`; no migra nada.

## Decisión

**Opción C.** Ingreso anónimo en el primer arranque. Upgrade con email +
contraseña (o magic link) propuesto en el primer momento en que le sirve a la
persona — crear un proyecto que quiere conservar, o querer su gusto en otro
dispositivo. Descartable, y nunca bloqueante para descubrimiento, gusto, matching
ni contacto.

## Por qué

El argumento decisivo no es de conversión, es arquitectónico: con C **no existe
ningún camino de lectura sin autenticar en el esquema**. Toda política se basa en
`auth.uid()`, no hay una rama "pública" de RLS que se pueda hacer mal, y no hay
rutina de fusión al registrarse — el código menos testeable de la opción B y el
lugar donde un perfil de gusto se perdería en silencio.

El argumento de producto es el mismo que hace el brief en §10: la primera
pregunta debería ser visual. Un formulario de registro no es visual.

## Consecuencias

- Las cuentas anónimas son baratas de crear. Mitigado con límites de tasa del
  proveedor sobre el ingreso anónimo, tratamiento idéntico de RLS, y cuotas por
  usuario del lado del servidor sobre proyectos y subidas (ver modelo de
  seguridad §6).
- Algunas filas anónimas nunca van a ser reclamadas. Una limpieza programada
  borra usuarios anónimos con cero interacciones después de 30 días.
- La revisión de la App Store a veces cuestiona la auth anónima; la app es
  plenamente funcional sin crear cuenta, que es el resultado que los revisores
  efectivamente quieren.
- Apple exige Sign in with Apple **si** se ofrece ingreso social de terceros. V1
  ofrece solo email/contraseña, así que no aplica — pero agregar Google más
  adelante lo dispara, y ese costo pertenece a esa decisión.
  **Actualizado (2026-08-20):** se agregó Google, así que ese costo ya se
  disparó. Ver [ADR-015](ADR-015-social-sign-in.md), que además extiende la
  regla de esta ADR al camino social: con sesión anónima se usa
  `linkIdentity()`, que es a OAuth lo que `updateUser()` es al correo.
- Los tokens de sesión tienen que estar en `expo-secure-store` desde el día uno,
  porque ahora existe una sesión antes de que la persona haya creado nada
  conscientemente.
