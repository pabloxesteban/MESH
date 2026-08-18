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

  // --- matches ---------------------------------------------------------------
  'matches.title': 'Para vos',
  'matches.band.strong': 'Encaje fuerte',
  'matches.band.good': 'Buen encaje',
  'matches.band.possible': 'Posible encaje',
  'matches.notReady.title': 'Todavía no',
  'matches.notReady.body':
    'Nos faltan {faltan} decisiones tuyas para poder decir algo que valga. Antes de eso sería adivinar.',
  'matches.notReady.action': 'Ir al mazo',
  'matches.empty.title': 'Todavía no encontramos a alguien que encaje',
  'matches.empty.body':
    'Seguí explorando y vamos a ir entendiendo mejor tu gusto. Preferimos una lista corta y honesta a una rellenada.',
  'matches.empty.action': 'Seguir explorando',

  // Plantillas de razón. Conjunto cerrado: una razón solo existe si el
  // componente que la respalda efectivamente aportó al puntaje.
  'match.reason.markedStyle': 'Marcaste varios trabajos de {termino}',
  'match.reason.worksBoth': 'Trabaja {termino} y {termino2}',
  'match.reason.location': 'En {termino}',
  'match.reason.price': 'Su rango entra en tu presupuesto',
  'match.reason.availability': 'Está tomando turnos',

  // --- perfil ----------------------------------------------------------------
  'profile.styles': 'Trabaja',
  'profile.price': 'Rango de precio',
  'profile.price.range': '{min} a {max}',
  'profile.price.asOf': 'Declarado el {fecha}',
  'profile.availability': 'Agenda',
  'profile.availability.open': 'Tomando turnos',
  'profile.availability.limited': 'Agenda acotada',
  'profile.availability.waitlist': 'Lista de espera',
  'profile.availability.closed': 'Agenda cerrada',
  'profile.availability.asOf': 'Según el artista, el {fecha}',
  'profile.availability.stale': 'Sin novedades desde el {fecha}',
  'profile.travels': 'Viaja',
  'profile.portfolio': 'Obra',
  'profile.contact': 'Escribirle',
  'profile.fixture': 'Registro de prueba. No es una persona real.',
  'common.fixture': 'Ficticio',

  // --- contacto --------------------------------------------------------------
  'contact.title': 'Escribirle a {nombre}',
  'contact.body':
    'Este es el mensaje. Leelo y cambiá lo que quieras antes de mandarlo — se manda desde tu cuenta, no desde MESH.',
  'contact.edit': 'Mensaje',
  'contact.whatsapp': 'Abrir WhatsApp',
  'contact.instagram': 'Abrir Instagram',
  'contact.instagram.note':
    'Instagram no deja mandar el mensaje escrito de antemano. Lo copiamos para que lo pegues.',
  'contact.copied': 'Mensaje copiado',
  'contact.fixture.title': 'Este es un registro de prueba',
  'contact.fixture.body':
    'No es una persona real y el número de contacto no existe. Está acá para ' +
    'poder construir y mostrar la app antes de que llegue el contenido real.',
  'contact.fixture.action': 'Volver al perfil',
  'contact.noChannel.title': 'No podemos escribirle desde acá',
  'contact.noChannel.body':
    'Este artista no publicó ningún canal de contacto. No inventamos uno.',
  'contact.noChannel.action': 'Volver al perfil',

  // Plantillas del mensaje. Son lo ÚNICO que aporta MESH: todo lo demás lo
  // escribe la persona.
  'contact.message.greeting': 'Hola, te escribo por un tatuaje.',
  'contact.message.styles': 'Estilos:',
  'contact.message.budget': 'Presupuesto:',
  'contact.message.timing': 'Cuándo:',
  'contact.message.references': 'Te mando algunas referencias aparte.',
  'contact.message.closing': '¿Te sirve? Cualquier cosa avisame. Gracias.',

  // --- proyectos -------------------------------------------------------------
  'projects.title': 'Tus proyectos',
  'projects.empty.title': 'Todavía no tenés ningún proyecto',
  'projects.empty.body':
    'Un proyecto es una idea concreta: qué querés hacerte, más o menos cuándo, y cuánto podés gastar. Sirve para buscar con eso en la mano en vez de solo con tu gusto.',
  'projects.empty.action': 'Crear un proyecto',
  'projects.new': 'Nuevo proyecto',
  'projects.form.title': 'Qué querés hacerte',
  'projects.form.title.placeholder': 'Rama de olivo en el antebrazo',
  'projects.form.description': 'Contalo con tus palabras',
  'projects.form.description.hint':
    'Opcional. Tamaño, lugar del cuerpo, lo que se te ocurra.',
  'projects.form.styles': 'Estilos que te gustan para esto',
  'projects.form.budget': 'Cuánto podés gastar',
  'projects.form.budget.hint':
    'Opcional. Solo lo usamos para no mostrarte gente fuera de tu alcance.',
  'projects.form.budget.min': 'Desde',
  'projects.form.budget.max': 'Hasta',
  'projects.form.timing': 'Para cuándo',
  'projects.form.timing.asap': 'Lo antes posible',
  'projects.form.timing.weeks': 'En las próximas semanas',
  'projects.form.timing.months': 'En los próximos meses',
  'projects.form.timing.flexible': 'Sin apuro',
  'projects.form.submit': 'Guardar proyecto',
  'projects.references': 'Referencias',
  'projects.references.add': 'Agregar una imagen',
  'projects.references.hint':
    'Las guardamos privadas y les sacamos la información de ubicación antes de subirlas.',
  'projects.references.count': '{n} de {max}',
  'projects.references.full': 'Llegaste al máximo de {max} imágenes',
  'projects.archive': 'Archivar proyecto',
  'projects.archive.confirm': 'Tocá de nuevo para archivarlo',
  'projects.matches': 'Ver quién encaja',

  // --- ajustes ---------------------------------------------------------------
  'settings.analytics.title': 'Datos de uso',
  'settings.analytics.body':
    'Guardamos qué pantallas se usan y qué botones se tocan, para saber qué funciona. Nunca lo que escribís, ni lo que buscás, ni tus estilos. Podés apagarlo y no se guarda nada.',
  'settings.analytics.on': 'Está encendido',
  'settings.analytics.off': 'Está apagado',
  'settings.analytics.toggle.on': 'Apagar',
  'settings.analytics.toggle.off': 'Encender',

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
