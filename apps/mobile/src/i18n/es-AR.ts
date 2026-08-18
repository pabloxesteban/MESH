/**
 * Español rioplatense. **Este archivo es el origen.**
 *
 * Todo string de cara al usuario nace acá y se traduce desde acá — nunca al
 * revés. El mercado es CABA; escribir primero en inglés y traducir produce
 * castellano que suena traducido, que es exactamente lo que le avisa a alguien
 * que el producto no se hizo para él.
 *
 * Reglas de voz, de docs/design/visual-language.md:
 *   - Voseo. "Elegí", "guardá", "contale", nunca "elige" ni "guarda".
 *   - Sin signos de admiración. MESH no festeja lo que hace la persona.
 *   - Sin promesas que no podemos sostener: nada de "el artista perfecto".
 *   - Los errores dicen qué pasó y qué hacer, en ese orden.
 */

export const esAR = {
  // --- común -----------------------------------------------------------------
  'common.cancel': 'Cancelar',
  'common.retry': 'Reintentar',
  'common.back': 'Volver',
  'common.close': 'Cerrar',
  'common.continue': 'Seguir',
  'common.save': 'Guardar',
  'common.loading': 'Cargando',

  // --- errores ---------------------------------------------------------------
  // Un conjunto chico de causas visibles. Los mensajes crudos de Postgres o de
  // Supabase nunca se le muestran a nadie. Ver data/errors.ts.
  'error.offline.title': 'Sin conexión',
  'error.offline.body': 'Revisá tus datos o el wifi y probá de nuevo.',
  'error.server.title': 'Algo se rompió de nuestro lado',
  'error.server.body': 'No es culpa tuya. Probá de nuevo en un momento.',
  'error.notFound.title': 'No encontramos esto',
  'error.notFound.body': 'Puede que ya no exista.',
  'error.permission.title': 'No encontramos esto',
  'error.permission.body': 'Puede que ya no exista.',
  'error.unknown.title': 'Algo salió mal',
  'error.unknown.body': 'Probá de nuevo.',

  // --- auth ------------------------------------------------------------------
  'auth.account.title': 'Tu cuenta',
  'auth.account.anonymous.title': 'Estás sin cuenta',
  'auth.account.anonymous.body':
    'Lo que guardaste y tu gusto viven solo en este teléfono. Con una cuenta los llevás a cualquier otro.',
  'auth.account.email': 'Correo',
  'auth.account.signOut': 'Cerrar sesión',
  'auth.account.signOut.confirm':
    'Vas a volver a empezar sin cuenta en este teléfono. Lo que guardaste sigue en tu cuenta.',

  'auth.signUp.title': 'Crear cuenta',
  'auth.signUp.body':
    'Guardamos tu gusto y tus guardados para que estén en cualquier teléfono.',
  'auth.signUp.submit': 'Crear cuenta',
  'auth.signUp.toSignIn': 'Ya tengo cuenta',

  'auth.signIn.title': 'Entrar',
  'auth.signIn.submit': 'Entrar',
  'auth.signIn.toSignUp': 'Crear una cuenta',
  'auth.signIn.forgot': 'Olvidé mi contraseña',

  'auth.reset.title': 'Recuperar contraseña',
  'auth.reset.body':
    'Te mandamos un enlace al correo con el que creaste la cuenta.',
  'auth.reset.submit': 'Mandar enlace',
  'auth.reset.sent':
    'Si ese correo tiene una cuenta, le llega un enlace en unos minutos.',

  'auth.field.email': 'Correo',
  'auth.field.email.placeholder': 'vos@ejemplo.com',
  'auth.field.password': 'Contraseña',
  'auth.field.password.hint': 'Mínimo 10 caracteres',

  // Los errores de auth no distinguen "no existe ese correo" de "la contraseña
  // está mal": esa diferencia le confirma a cualquiera si una persona tiene
  // cuenta.
  'auth.error.credentials': 'El correo o la contraseña no coinciden.',
  'auth.error.emailInvalid': 'Ese correo no parece válido.',
  'auth.error.passwordShort': 'La contraseña necesita al menos 10 caracteres.',
  'auth.error.emailTaken': 'Ese correo ya tiene una cuenta. Probá entrar.',
  'auth.error.rateLimited': 'Demasiados intentos. Esperá un minuto.',

  // --- descubrimiento --------------------------------------------------------
  'discovery.title': 'Descubrí',
  'discovery.empty.title': 'Viste todo lo que hay',
  'discovery.empty.body':
    'Por ahora no queda obra nueva. Vamos sumando artistas de a poco, y preferimos pocos y buenos.',
  'discovery.empty.action': 'Buscar de nuevo',
  'discovery.action.like': 'Me gusta',
  'discovery.action.save': 'Guardar',
  'discovery.action.pass': 'Paso',
  'discovery.action.undo': 'Deshacer',
  'discovery.saved': 'Guardado',
  'discovery.passed': 'Pasaste este trabajo',

  // --- gusto -----------------------------------------------------------------
  'taste.progress.title': 'Todavía te estamos conociendo',
  'taste.progress.body':
    'Con {faltan} decisiones más podemos armar tu perfil. Van {total} en total, y no es un número al azar: menos que eso no alcanza para decir nada honesto.',
  'taste.progress.empty.title': 'Tu perfil todavía no existe',
  'taste.progress.empty.body':
    'Se arma solo con lo que marcás. No hay cuestionario ni test de personalidad.',
  'taste.progress.action': 'Seguir explorando',
  'taste.ready.title': 'Tu gusto',
  'taste.ready.body':
    'Esto salió de {n} decisiones tuyas. Debajo de cada estilo está de dónde salió.',
  'taste.evidence.likes': '{n} me gusta',
  'taste.evidence.saves': '{n} guardados',
  'taste.strength.high': 'Muy presente en lo que elegís',
  'taste.strength.medium': 'Presente en lo que elegís',
  'taste.strength.low': 'Apenas presente en lo que elegís',
  'taste.reset.explanation':
    'Podés borrar todo lo que aprendimos. Se van tus decisiones y tu perfil, y el mazo arranca de cero.',
  'taste.reset.action': 'Borrar mi gusto',
  'taste.reset.confirm': 'Tocá de nuevo para borrarlo',

  // --- taxonomía -------------------------------------------------------------
  'category.tattoo': 'Tatuaje',

  'style.tattoo.fine-line': 'Línea fina',
  'style.tattoo.blackwork': 'Blackwork',
  'style.tattoo.dotwork': 'Puntillismo',
  'style.tattoo.old-school': 'Old school',
  'style.tattoo.traditional': 'Tradicional',
  'style.tattoo.neo-traditional': 'Neotradicional',
  'style.tattoo.realism': 'Realismo',
  'style.tattoo.black-and-grey': 'Negro y gris',
  'style.tattoo.watercolor': 'Acuarela',
  'style.tattoo.ornamental': 'Ornamental',
  'style.tattoo.japanese': 'Japonés',
  'style.tattoo.lettering': 'Lettering',
  'style.tattoo.minimalist': 'Minimalista',
  'style.tattoo.fileteado-porteno': 'Fileteado porteño',
  'style.tattoo.handpoke': 'Handpoke',
} as const

export type TranslationKey = keyof typeof esAR
