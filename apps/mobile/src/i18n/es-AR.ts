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
  // Dice lo que la cuenta conserva DE VERDAD. Antes prometía "tu gusto y tus
  // guardados": el gusto se sacó con D-010 y los guardados nunca se
  // construyeron. Prometer una función que no existe es inventar.
  'auth.account.anonymous.body':
    'Tu perfil, tus búsquedas y tus chats viven solo en este teléfono. Con una cuenta los llevás a cualquier otro.',
  'auth.account.email': 'Correo',
  'auth.account.signOut': 'Cerrar sesión',
  'auth.account.signOut.confirm':
    'Vas a volver a empezar sin cuenta en este teléfono. Tu perfil y tus chats siguen en tu cuenta.',

  'auth.signUp.title': 'Crear cuenta',
  'auth.signUp.body':
    'Tu perfil, tus búsquedas y tus chats dejan de vivir en un solo teléfono.',
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
  'auth.or': 'o',
  'auth.google': 'Continuar con Google',
  'auth.google.hint':
    'Lo que ya hiciste en este teléfono se conserva: entrar con Google no te cambia de usuario.',
  'auth.error.google': 'No se pudo entrar con Google. Probá de nuevo.',
  'auth.error.googleTaken':
    'Esa cuenta de Google ya está asociada a otra cuenta de MESH. Entrá con ella desde acá, o usá otra cuenta de Google.',
  // La vuelta del enlace de recuperación. Tres errores y no uno solo: para
  // quien los vive son problemas distintos, y con un mensaje genérico alguien
  // se queda probando el mismo enlace sin entender por qué no anda.
  'auth.callback.working': 'Abriendo tu enlace',
  'auth.error.link': 'Ese enlace no sirvió. Pedí uno nuevo desde Entrar.',
  'auth.error.linkExpired':
    'Ese enlace ya venció. Los enlaces duran una hora; pedí uno nuevo.',
  'auth.error.otherDevice':
    'Ese enlace tenés que abrirlo en el mismo teléfono donde lo pediste. Pedí uno nuevo desde este.',
  'auth.newPassword.title': 'Elegí una contraseña nueva',
  'auth.newPassword.body':
    'Con esta vas a entrar de ahora en más. La anterior deja de servir.',
  'auth.newPassword.field': 'Contraseña nueva',
  'auth.newPassword.submit': 'Guardar y entrar',
  'auth.error.credentials': 'El correo o la contraseña no coinciden.',
  'auth.error.emailInvalid': 'Ese correo no parece válido.',
  'auth.error.passwordShort': 'La contraseña necesita al menos 10 caracteres.',
  'auth.error.emailTaken': 'Ese correo ya tiene una cuenta. Probá entrar.',
  'auth.error.rateLimited': 'Demasiados intentos. Esperá un minuto.',

  // --- descubrimiento --------------------------------------------------------
  'discovery.empty.title': 'Viste todo lo que hay',
  'discovery.empty.body':
    'Por ahora no queda obra nueva. Vamos sumando artistas de a poco, y preferimos pocos y buenos.',
  'discovery.empty.action': 'Buscar de nuevo',
  'discovery.action.like': 'Me gusta',
  'discovery.action.save': 'Guardar',
  'discovery.action.pass': 'Paso',
  'discovery.action.undo': 'Deshacer',
  // --- artistas cerca tuyo (Inicio) ---
  'artists.card.open': 'Ver el perfil de {nombre}',
  'artists.card.km': 'a {km} km',
  'artists.card.noLocation': 'No publicó su ubicación',
  'artists.location.body':
    'Con tu ubicación activada ordenamos por cercanía y te decimos a cuántos kilómetros está cada uno. Sin eso la lista igual se ve, en otro orden.',
  'artists.location.action': 'Activar mi ubicación',
  // --- desde dónde se mira ---
  'searchLocation.title': 'Desde dónde',
  'searchLocation.hint':
    'Cambia el orden de la lista. Nunca esconde a nadie: quien está lejos aparece igual, más abajo.',
  'searchLocation.header.device': 'Cerca de donde estás',
  'searchLocation.header.deviceAt': 'Cerca de {barrio}',
  'searchLocation.header.neighborhood': 'Cerca de {barrio}',
  'searchLocation.header.none': 'Sin ubicación',
  'searchLocation.header.action': 'Cambiar',
  'searchLocation.device': 'Mi ubicación',
  'searchLocation.device.hint':
    'Ordena por distancia real y te dice a cuántos kilómetros está cada uno.',
  'searchLocation.device.denied':
    'El permiso está denegado. Se activa desde los ajustes del teléfono.',
  'searchLocation.none': 'Sin ubicación',
  'searchLocation.none.hint': 'La lista no se ordena por cercanía.',
  'searchLocation.neighborhoods': 'Elegí un barrio',
  'searchLocation.neighborhoods.hint':
    'Ordena por cercanía de barrio. Sin tu ubicación real no se puede decir a cuántos kilómetros está cada uno, así que no se dice.',
  'searchLocation.search': 'Buscar un barrio',
  'searchLocation.empty': 'Ningún barrio se llama así',
  'searchLocation.close': 'Listo',
  'artists.empty.title': 'Todavía no hay nadie dado de alta',
  'artists.empty.body':
    'Cuando se registren tatuadores, acá vas a ver a los que trabajan cerca tuyo. Mientras tanto podés mirar obra.',
  'artists.empty.action': 'Ir a explorar',
  // --- explorar ---
  'explore.byPhotos': 'Buscar con una foto',
  'explore.title': 'Explorar',
  'explore.subtitle': 'Toda la obra, esté cerca o lejos.',
  'discovery.tile.open': 'Ver la obra de {nombre}',
  'discovery.mode.grid': 'Grilla',
  'discovery.mode.deck': 'De a una',
  'discovery.mode.label': 'Cómo querés mirar',
  'discovery.filter.all': 'Todo',
  'discovery.grid.empty.title': 'Todavía no hay obra para mostrar',
  'discovery.grid.empty.body':
    'Vamos sumando artistas de a poco, y preferimos pocos y buenos.',
  'discovery.grid.empty.action': 'Buscar de nuevo',
  'discovery.grid.filtered.title': 'Nadie está trabajando ese estilo todavía',
  'discovery.grid.filtered.body':
    'Sacá el filtro para ver todo lo que hay, o probá con otro estilo.',
  'discovery.grid.filtered.action': 'Ver todo',
  'discovery.learning':
    'Mientras nos vamos conociendo, esta es la forma que más nos enseña.',
  'discovery.saved': 'Guardado',
  'discovery.passed': 'Pasaste este trabajo',

  // --- gusto -----------------------------------------------------------------

  // --- matches ---------------------------------------------------------------

  // Plantillas de razón. Conjunto cerrado: una razón solo existe si el
  // componente que la respalda efectivamente aportó al puntaje.

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
  'profile.back': 'Volver',
  'profile.contact': 'Escribirle',
  'profile.fixture': 'Registro de prueba. No es una persona real.',
  'profile.fixture.noContact':
    'A un registro de prueba no se le puede escribir. En un perfil real, acá está el botón para empezar la conversación.',

  'saved.title': 'Guardados',
  'saved.add': 'Guardar esta obra',
  'saved.remove': 'Sacar de guardados',
  'saved.empty.title': 'Todavía no guardaste nada',
  'saved.empty.body':
    'El corazón abajo de cada obra la deja acá, para volver a mirarla cuando quieras. Nadie más ve lo que guardás.',
  'saved.empty.action': 'Ir a Explorar',
  'saved.entry': 'Lo que guardaste',
  'saved.count': '{n} obra(s)',
  'ranking.title': 'Lo más guardado',
  'ranking.week': 'Esta semana',
  'ranking.month': 'Este mes',
  'ranking.saves': '{n} guardados',
  'ranking.open': 'Ver a {nombre}, con {n} guardados',
  'studio.saves.title': 'Guardaron tu obra',
  'studio.saves.total': '{n} guardados en total',
  'studio.saves.new': '{n} nuevos desde la última vez que miraste',
  'studio.saves.none': 'Todavía no guardó nadie. Cuando pase, aparece acá.',
  'studio.saves.piece': '{n} guardados',
  'day.mon': 'Lun',
  'day.tue': 'Mar',
  'day.wed': 'Mié',
  'day.thu': 'Jue',
  'day.fri': 'Vie',
  'day.sat': 'Sáb',
  'day.sun': 'Dom',
  'availability.title': 'Tu horario',
  'availability.hint':
    'Elegí un día y cargá los tramos en los que atendés. Quien mire tu perfil ve estos horarios, nunca con quién estás.',
  'availability.closed': 'Ese día no atendés.',
  'availability.pickStart': 'Desde qué hora',
  'availability.pickEnd': 'Hasta qué hora',
  'availability.span': 'De {desde} a {hasta} · {horas} h',
  'availability.remove': 'Sacar',
  'schedule.title': 'Dar un turno',
  'schedule.pickDay': 'Qué día',
  'schedule.pickTime': 'A qué hora',
  'schedule.duration': 'Cuánto dura',
  'schedule.hours': '{n} h',
  'schedule.noSlots': 'Ese día no te queda lugar. Probá con otro.',
  'schedule.confirm': 'Dar el turno',
  'schedule.done': 'Turno dado',
  'schedule.error.taken': 'Ese horario ya está ocupado. Elegí otro.',
  'schedule.error.past': 'Ese horario ya pasó.',
  'schedule.error.notYours': 'No podés dar un turno en esta conversación.',
  'schedule.error.minor':
    'Esta persona todavía no confirmó que es mayor de 18. Sin eso no se puede cerrar un turno.',
  'schedule.error.unknown': 'No se pudo dar el turno. Probá de nuevo.',
  'appointment.title': 'Turno',
  'appointment.when': '{fecha}, de {desde} a {hasta}',
  'appointment.cancel': 'Cancelar el turno',
  'appointment.none': 'Todavía no hay ningún turno en esta conversación.',
  'calendar.title': 'Próximos horarios',
  'calendar.empty': 'Todavía no publicó sus horarios.',
  'calendar.free': '{n} libres',
  'calendar.free.one': '1 libre',

  // --- reseñas ---------------------------------------------------------------
  // Se escriben desde el turno que las habilita, y se leen en el perfil. Ver
  // ADR-019. Nada acá promete nada sobre el artista: lo que hay es lo que
  // alguien dijo después de haber estado.
  'reviews.title': 'Lo que dijeron',
  'reviews.empty':
    'Todavía nadie dejó una reseña. Aparecen acá cuando alguien se tatúa y cuenta cómo fue.',
  'reviews.summary': '{promedio} de 5 · {n} reseñas',
  'reviews.summary.one': '{promedio} de 5 · 1 reseña',
  'reviews.when': 'Turno del {fecha}',
  'reviews.edited': 'Editada',
  'reviews.photo': 'Foto que subió quien dejó la reseña',
  'reviews.stars.value': '{n} de 5 estrellas',
  'reviews.stars.pick': 'Poner {n} estrellas',
  'reviews.leave': 'Dejar una reseña',
  'reviews.leave.title': '¿Cómo fue?',
  'reviews.leave.hint':
    'Lo lee quien esté pensando en tatuarse con esta persona. Las estrellas alcanzan; lo demás suma.',
  'reviews.leave.body': 'Contá cómo fue',
  'reviews.leave.photo': 'Agregar una foto',
  'reviews.leave.photo.public':
    'La foto se va a ver en el perfil del artista, junto con tu reseña.',
  'reviews.leave.photo.attached': 'La foto que vas a publicar',
  'reviews.leave.photo.remove': 'Sacar la foto',
  'reviews.leave.submit': 'Publicar',
  'reviews.error.send': 'No se pudo publicar la reseña. Probá de nuevo.',
  'reviews.error.photo': 'No se pudo subir la foto. Probá con otra.',
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
  'projects.form.location': 'Tu barrio',
  'projects.form.location.hint':
    'Para ordenar por qué tan cerca te queda cada artista. Podés no decirlo.',
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
  // --- estudio (modo artista) ---
  'studio.title': 'Tu estudio',
  'studio.eyebrow': 'TU PERFIL',
  'studio.unpublished': 'Todavía no está publicado. Lo publicamos nosotros.',
  'studio.create.title': 'Creá tu perfil',
  'studio.create.body':
    'Tu nombre y por dónde te escriben. El resto lo cargás después.',
  'studio.create.name': 'Nombre o nombre de tu estudio',
  'studio.create.instagram': 'Instagram',
  'studio.create.whatsapp': 'WhatsApp',
  'studio.create.contact.hint':
    'Con uno alcanza. Es por donde te va a escribir la gente.',
  'studio.create.submit': 'Crear mi perfil',
  'studio.create.failed': 'No se pudo crear el perfil. Probá de nuevo.',
  'studio.styles.title': 'Tus estilos',
  'studio.styles.body':
    'Hasta tres, en orden. Sin esto no aparecés cuando alguien busca lo que hacés.',
  'studio.styles.save': 'Guardar estilos',
  'studio.styles.saved': 'Listo, quedaron guardados',
  'studio.styles.failed': 'No se pudieron guardar. Probá de nuevo.',
  'studio.claim.title': '¿Te pasamos un código?',
  'studio.claim.body':
    'Si armamos tu perfil, te pasamos un código de ocho caracteres. Con eso ' +
    'pasás a manejar tu portafolio desde acá.',
  'studio.claim.label': 'Código',
  'studio.claim.submit': 'Reclamar',
  'studio.claim.invalid': 'Ese código no es válido o ya se usó.',
  'studio.add.styles': 'Estilos de la pieza',
  'studio.add.styles.hint':
    'Tocá en orden: el primero es el que más pesa. Hasta tres.',
  'studio.add.styles.max': 'Ya elegiste {n}. Sacá uno para cambiar.',
  'studio.add.featured.on': 'Va a abrir tu perfil',
  'studio.add.featured.off': 'Que abra mi perfil',
  'studio.add.pick': 'Elegir foto y subir',
  'studio.upload.done': 'Subida',
  'studio.upload.failed': 'No se pudo subir. Probá de nuevo.',
  'studio.empty.title': 'Todavía no subiste nada',
  'studio.empty.body':
    'Tu obra es lo único que alguien ve antes de decidir escribirte.',
  'studio.piece.featured': 'Abre tu perfil',
  'studio.piece.remove': 'Sacar',
  'studio.piece.removed': 'La sacamos',
  'studio.entry.label': '¿Tatuás?',
  'studio.entry.hint':
    'Creá tu perfil y subí tus trabajos para que te encuentren.',
  'studio.entry.action': 'Ir a mi estudio',
  'studio.location.title': 'Ubicación de tu estudio',
  'studio.location.body':
    'Así la gente que te busca ve a cuántos kilómetros estás. Nadie ve el punto exacto en un mapa, solo la distancia.',
  'studio.location.button': 'Usar mi ubicación actual',
  'studio.location.button.update': 'Actualizar ubicación',
  'studio.location.set': 'Tu estudio está publicado',
  'studio.location.confirm.title': '¿Publicamos esta ubicación?',
  'studio.location.confirm.body':
    'Va a quedar visible como la ubicación de tu estudio para cualquiera que te busque en MESH.',
  'studio.location.confirm.submit': 'Sí, publicar',
  'studio.location.confirm.cancel': 'Cancelar',
  'studio.location.error.permission':
    'Necesitamos el permiso de ubicación para esto. Podés activarlo en Ajustes.',
  'studio.location.error.unavailable':
    'No pudimos obtener tu ubicación. Probá de nuevo.',
  'studio.location.error.save': 'No se pudo publicar. Probá de nuevo.',
  // --- buscar por fotos ---
  'quickSearch.title': 'Buscar por fotos',
  'quickSearch.subtitle':
    'Subí hasta 4 fotos de algo que te gusta y te llevamos con la gente cerca tuyo que hace algo parecido.',
  'quickSearch.photos': 'Fotos',
  'quickSearch.photo.add': 'Agregar foto',
  'quickSearch.photo.remove': 'Sacar la foto {n}',
  'quickSearch.location': 'Tu ubicación',
  'quickSearch.location.hint':
    'Activala y buscamos primero cerca tuyo. Opcional: sin ella igual buscamos.',
  'quickSearch.location.action': 'Usar mi ubicación',
  'quickSearch.location.near': 'Buscamos cerca de {barrio}',
  'quickSearch.location.unknown':
    'No reconocimos tu barrio, así que buscamos en toda la ciudad.',
  'quickSearch.location.denied':
    'Sin tu ubicación buscamos en toda la ciudad. Podés activarla en Ajustes.',
  'quickSearch.submit': 'Publicar la búsqueda',
  'quickSearch.read': 'Leer las fotos',

  // --- el brief -------------------------------------------------------------
  // Lo que la IA leyó de la foto, para revisar antes de publicar. Ver ADR-020.
  'brief.title': 'Esto es lo que entendimos',
  'brief.read': 'Salieron {n} de tu foto. Cambiá lo que no sea así.',
  'brief.readNone':
    'De tu foto no pudimos sacar nada con seguridad. Completalo vos.',
  'brief.read.words':
    'Salieron {n} de lo que contaste. Cambiá lo que no sea así.',
  'brief.readNone.words':
    'De lo que contaste no sacamos nada con seguridad. Completalo vos.',
  'brief.style': 'Estilo',
  'brief.bodyArea': 'Dónde va',
  'brief.size': 'Qué tamaño',
  'brief.palette': 'Con qué paleta',

  // El vocabulario de rasgos. Los slugs son estables; esto es lo que se lee.
  'trait.tattoo.antebrazo': 'Antebrazo',
  'trait.tattoo.brazo': 'Brazo',
  'trait.tattoo.hombro': 'Hombro',
  'trait.tattoo.espalda': 'Espalda',
  'trait.tattoo.pecho': 'Pecho',
  'trait.tattoo.costillas': 'Costillas',
  'trait.tattoo.pierna': 'Pierna',
  'trait.tattoo.tobillo': 'Tobillo',
  'trait.tattoo.mano': 'Mano',
  'trait.tattoo.cuello': 'Cuello',
  'trait.tattoo.mini': 'Mini, hasta 5 cm',
  'trait.tattoo.chico': 'Chico, 5 a 10 cm',
  'trait.tattoo.mediano': 'Mediano, 10 a 20 cm',
  'trait.tattoo.grande': 'Grande, más de 20 cm',
  'trait.tattoo.gran-formato': 'Gran formato o manga',
  'trait.tattoo.negro': 'Negro',
  'trait.tattoo.negro-y-gris': 'Negro y gris',
  'trait.tattoo.color': 'Color',

  // --- la propuesta del artista ---------------------------------------------
  'proposal.title': 'Lo que te respondieron',
  'proposal.empty':
    'Todavía no te respondió nadie. Aparecen acá cuando un tatuador manda su propuesta.',
  'proposal.range': '{min} a {max}',
  'proposal.sessions': '{n} sesiones',
  'proposal.sessions.one': '1 sesión',
  'proposal.open': 'Escribirle',
  'proposal.send': 'Responder con una propuesta',
  'proposal.send.title': 'Tu propuesta',
  'proposal.send.hint':
    'El rango y las sesiones son lo que la persona necesita para decidir. Si es estimado, decilo en la nota.',
  'proposal.send.min': 'Desde',
  'proposal.send.max': 'Hasta',
  'proposal.send.sessions': 'Sesiones',
  'proposal.send.note': 'Alguna condición',
  'proposal.send.submit': 'Mandar la propuesta',
  'proposal.error.send': 'No se pudo mandar la propuesta. Probá de nuevo.',
  'proposal.error.range': 'El desde no puede ser mayor que el hasta.',
  'quickSearch.error': 'No pudimos hacer la búsqueda. Probá de nuevo.',
  'quickSearch.unrecognized':
    'No reconocimos el estilo en esa foto. Probá con otra.',
  'quickSearch.uploadsFailed':
    'Subimos {ok} de {total} fotos. Igual buscamos con lo que tenemos.',
  // --- onboarding ---
  'onboarding.title': '¿A qué viniste?',
  'onboarding.body':
    'Lo preguntamos una sola vez. Elijas lo que elijas vas a poder hacer las dos cosas.',
  'onboarding.looking.title': 'Busco a alguien',
  'onboarding.looking.body': 'Querés tatuarte y buscás a la persona indicada.',
  'onboarding.offering.title': 'Ofrezco un servicio',
  'onboarding.offering.body':
    'Tatuás y MESH ya armó tu perfil. Te pedimos tu código para que lo manejes vos.',
  // --- pestañas ---
  'tabs.home': 'Inicio',
  'tabs.search': 'Buscar',
  'tabs.matches': 'Matches',
  'tabs.profile': 'Perfil',
  'tabs.explore': 'Explorar',
  'tabs.studio': 'Estudio',
  'tabs.chats': 'Chats',
  // --- el mazo del artista (búsquedas abiertas) ---
  'demand.title': 'Gente buscando',
  'demand.card.reference': 'Foto de referencia de la búsqueda',
  'demand.card.noPhotos': 'Sin fotos de referencia',
  'demand.card.morePhotos': '+{n}',
  'demand.action.pass': 'Paso',
  'demand.action.interest': 'Me interesa',
  'demand.action.undo': 'Deshacer',
  'demand.empty.title': 'Por ahora no hay búsquedas para vos',
  'demand.empty.body':
    'Acá aparecen las búsquedas de gente que pide algún estilo que hacés, y ' +
    'solo si esa persona eligió mostrarla. Todavía son pocas.',
  'demand.empty.action': 'Buscar de nuevo',
  'demand.noProfile.title': 'Primero creá tu perfil',
  'demand.noProfile.body':
    'Para ver quién está buscando necesitamos saber qué tatuás. Se hace en un ' +
    'minuto desde tu estudio.',
  'demand.noProfile.action': 'Ir a mi estudio',
  'demand.interests.title': 'Le interesa tu búsqueda',
  'demand.interests.open': 'Ver el perfil de {nombre}',
  'demand.interests.dismiss': 'Sacar a {nombre} de la lista',
  'demand.interests.dismiss.short': 'Sacar',
  // --- publicar la búsqueda ---
  'quickSearch.open.title': '¿Que los tatuadores la vean?',
  'quickSearch.open.body':
    'Si lo activás, quienes tatúan lo que buscás pueden ver estas fotos y el ' +
    'estilo, y avisarte que les interesa. No ven tu nombre ni pueden ' +
    'escribirte: el chat lo abrís vos.',
  'quickSearch.open.on': 'La van a ver',
  'quickSearch.open.off': 'No la ve nadie',
  'quickSearch.open.toggle.on': 'Que no la vean',
  'quickSearch.open.toggle.off': 'Que la vean',
  // --- chats del artista ---
  'chat.empty.artist.title': 'Todavía no te escribió nadie',
  'chat.empty.artist.body':
    'Cuando alguien te escriba, la conversación aparece acá. Vos no podés ' +
    'escribir primero: quien busca decide cuándo abrir el chat.',
  'chat.empty.artist.action': 'Ver quién está buscando',
  // --- perfil ---
  'account.title': 'Perfil',
  'account.name': 'Tu nombre',
  'account.intent': '¿A qué venís?',
  'account.intent.hint':
    'Cambia qué ves al abrir la app. No cierra ninguna puerta: podés volver cuando quieras.',
  'account.intent.looking': 'Busco a alguien',
  'account.intent.offering': 'Ofrezco un servicio',
  'account.more': 'Más',
  'account.studio': 'Tu estudio',
  'account.saved': 'Guardado',
  // --- el asistente ---------------------------------------------------------
  // El bot que ayuda a armar el pedido. Ver ADR-021. El texto de apertura y el
  // de límites NO los escribe ningún modelo: son de la app, y dicen las tres
  // cosas que el asistente tiene prohibidas antes de que alguien las pregunte.
  'assistant.title': 'Contame qué querés',
  'assistant.badge': 'Asistente de MESH',
  'assistant.opening':
    'Te hago tres o cuatro preguntas para armar tu pedido. Después lo revisás vos y recién ahí lo ven los tatuadores.',
  'assistant.limits':
    'No sé precios, no sé quién tiene lugar y no te recomiendo a nadie. Eso lo responde cada tatuador.',
  'assistant.placeholder': 'Escribí qué tenés en mente',
  'assistant.send': 'Mandar',
  'assistant.thinking': 'Pensando',
  'assistant.discard': 'Borrar esta conversación',
  'assistant.error': 'No pudimos responderte. Probá de nuevo.',
  'assistant.entry': 'Contame con palabras',
  'assistant.entry.body':
    'Si no tenés una foto, contame la idea y armamos el pedido juntos.',

  // La revisión, que es donde la persona se apropia del pedido.
  'assistant.review.title': 'Revisá tu pedido',
  'assistant.review.body':
    'Esto es lo que va a leer un tatuador. Cambiá lo que no diga lo que querés.',
  'assistant.review.gaps':
    'Quedaron {n} datos sin completar. Se puede publicar igual.',
  'assistant.review.gaps.one':
    'Quedó 1 dato sin completar. Se puede publicar igual.',
  'assistant.review.name': 'Nombre del pedido',
  'assistant.review.summary': 'Tu pedido en palabras',
  'assistant.review.summary.hint':
    'Está escrito con lo que contaste. Editalo hasta que suene tuyo.',
  'assistant.review.publish': 'Publicar el pedido',
  'assistant.review.error': 'No pudimos publicar el pedido. Probá de nuevo.',

  // Con qué frecuencia contesta un artista. Calculado al leer, de sus propias
  // conversaciones. Una de las tres frases es mala a propósito: un indicador
  // que solo puede decir cosas buenas es publicidad. Ver ADR-022.
  'replyHabit.same_day': 'Suele contestar en el día',
  'replyHabit.few_days': 'Suele contestar en unos días',
  'replyHabit.slower': 'Suele tardar en contestar',
  'replyHabit.source':
    'Calculado con sus conversaciones de los últimos 90 días.',
  'replyHabit.own': 'Así se ve tu respuesta en tu perfil',

  // --- mayoría de edad --------------------------------------------------------
  // Ver ADR-025. Se pregunta una sola cosa y no se pide la fecha de nacimiento:
  // con ella tendríamos un dato sensible para calcular un booleano que ya nos
  // dieron.
  'age.title': 'Una sola cosa antes de entrar',
  'age.body':
    'Para arreglar un turno de tatuaje hay que ser mayor de 18. No te pedimos la fecha de nacimiento ni ningún documento.',
  'age.yes': 'Sí, tengo 18 o más',
  'age.no': 'Todavía no',
  'age.back': 'Volver',
  'age.minor.body':
    'Podés seguir mirando obra y guardar lo que te gusta. Lo que no vas a poder es cerrar un turno hasta que cumplas 18.',
  'age.minor.continue': 'Entrar igual',
  'age.blocked':
    'Para cerrar un turno hace falta confirmar que sos mayor de 18. Se hace desde Perfil.',

  // --- llevarte lo tuyo --------------------------------------------------------
  // Ver ADR-028. Va arriba de borrar la cuenta: borrar es inmediato, así que
  // enterarse tarde de que se podía exportar es enterarse cuando ya no sirve.
  'export.title': 'Llevarte lo tuyo',
  'export.body':
    'Armamos un archivo con todo lo que MESH guarda de vos: tus búsquedas, tus mensajes, tus turnos, tus reseñas y lo que le contaste al asistente. Las fotos van con un enlace que dura una semana.',
  'export.notIncluded':
    'Lo que escribieron otras personas no está: eso es de ellas. Lo podés seguir leyendo en la app.',
  'export.action': 'Armar mi archivo',
  'export.again': 'Armarlo de nuevo',
  'export.ready': 'Listo. Adentro hay:',
  'export.count.searches': '{n} búsquedas',
  'export.count.searches.one': '1 búsqueda',
  'export.count.chats': '{n} conversaciones',
  'export.count.chats.one': '1 conversación',
  'export.count.appointments': '{n} turnos',
  'export.count.appointments.one': '1 turno',
  'export.count.reviews': '{n} reseñas que escribiste',
  'export.count.reviews.one': '1 reseña que escribiste',
  'export.count.saved': '{n} obras guardadas',
  'export.count.saved.one': '1 obra guardada',
  'export.count.assistant': '{n} charlas con el asistente',
  'export.count.assistant.one': '1 charla con el asistente',
  'export.copy': 'Copiar el contenido',
  'export.copied': 'Copiado',
  'export.error': 'No pudimos armar el archivo. Probá de nuevo.',

  // --- borrar la cuenta -------------------------------------------------------
  // Ver ADR-024. La lista de lo que se va está entera, y lo que NO se va
  // también: omitirlo sería mentir por la parte que no conviene contar.
  'settings.notifications.title': 'Avisos',
  'settings.notifications.body':
    'Te avisamos cuando pasa algo tuyo: que miramos una denuncia que hiciste, o que te dieron o cancelaron un turno. Nada más que eso, y nunca para que vuelvas a entrar. Si lo apagás, dejamos de escribirlos: no vas a poder verlos después.',
  'settings.notifications.on': 'Están encendidos',
  'settings.notifications.off': 'Están apagados',
  'settings.notifications.toggle.on': 'Apagar',
  'settings.notifications.toggle.off': 'Encender',

  // Reportes de error. Separado de datos de uso a propósito: aquel mide qué
  // hace la persona, este mide si la app funciona. Ver ADR-026.
  'settings.errors.title': 'Cuando algo se rompe',
  'settings.errors.body':
    'Cuando algo se rompe mandamos qué se rompió, en qué pantalla y con qué código. Nunca lo que escribiste, ni tu mail, ni quién sos: un reporte no lleva tu identificador.',
  'settings.errors.on': 'Está encendido',
  'settings.errors.off': 'Está apagado',
  'settings.errors.toggle.on': 'Apagar',
  'settings.errors.toggle.off': 'Encender',

  'legal.privacy': 'Privacidad',
  'legal.terms': 'Términos de uso',
  'legal.moderation': 'Cómo moderamos',

  'legal.note': 'Se abren en el navegador.',

  'account.delete.entry': 'Borrar mi cuenta',
  'account.delete.title': 'Borrar tu cuenta',
  'account.delete.body':
    'Es inmediato y no se puede deshacer. No queda nada desactivado ni guardado por si cambiás de idea.',
  'account.delete.item.profile': 'Tu cuenta y tu perfil',
  'account.delete.item.searches': 'Tus búsquedas y las fotos que subiste',
  'account.delete.item.chats': 'Tus conversaciones, de los dos lados',
  'account.delete.item.reviews': 'Las reseñas que escribiste',
  'account.delete.item.photos': 'Lo que le contaste al asistente',
  'account.delete.item.studio':
    'Tu perfil de artista, si tenías uno, con toda su obra',
  'account.delete.kept':
    'Queda un solo registro: que una cuenta se borró, con su identificador y la fecha. Sin tu mail, sin tu nombre y sin nada de lo que había adentro.',
  'account.delete.word': 'borrar',
  'account.delete.confirm': 'Escribí «{palabra}» para confirmar',
  'account.delete.submit': 'Borrar mi cuenta',
  'account.delete.error': 'No pudimos borrar la cuenta. Probá de nuevo.',

  // --- avisos ------------------------------------------------------------------
  // Ver ADR-027. La frase la arma la app, no la base: por eso un aviso no puede
  // decir "se te escapa". Cada uno corresponde a un hecho que ocurrió.
  'notif.title': 'Lo que pasó',
  'notif.report.actioned': 'Miramos lo que denunciaste y tomamos una medida.',
  'notif.report.dismissed':
    'Miramos lo que denunciaste y no encontramos motivo para actuar.',
  'notif.appointment_scheduled': 'Te dieron un turno.',
  'notif.appointment_cancelled': 'Se canceló un turno tuyo.',
  'notif.dismiss': 'Sacar',
  'notif.dismiss.one': 'Sacar el aviso: {aviso}',

  // --- denunciar y bloquear --------------------------------------------------
  // Ver ADR-023. El texto dice la verdad de lo que pasa después: lo mira una
  // persona, no es automático, y al denunciado no le llega ningún aviso.
  'report.open': 'Denunciar',
  'report.title': '¿Qué pasa con esto?',
  'report.hint':
    'Lo mira alguien del equipo. No es automático y a la otra persona no le llega ningún aviso.',
  'report.reason.stolen_work': 'Obra de otra persona',
  'report.reason.impersonation': 'Se hace pasar por otro',
  'report.reason.harassment': 'Acoso o agresión',
  'report.reason.explicit': 'Contenido explícito',
  'report.reason.spam': 'Spam',
  'report.reason.off_platform': 'Quiere sacarme de MESH',
  'report.reason.other': 'Otra cosa',
  'report.note': 'Contanos más, si querés',
  'report.submit': 'Mandar la denuncia',
  'report.done': 'Listo, la recibimos',
  'report.done.body':
    'La mira alguien del equipo. Si querés dejar de cruzártelo mientras tanto, bloquealo.',
  'report.already': 'Ya habías denunciado esto. Con una vez alcanza.',
  'report.error': 'No pudimos mandar la denuncia. Probá de nuevo.',
  'report.assistant': 'Algo que dijo el asistente está mal',

  'block.do': 'Bloquear',
  'block.undo': 'Desbloquear',
  'block.active':
    'Bloqueado. No se escriben, no te aparece en las grillas y no puede responder a tus búsquedas.',
  'block.list.title': 'Bloqueados',
  'block.list.empty': 'No bloqueaste a nadie.',
  'block.list.undo': 'Desbloquear a {nombre}',

  // Mandar el pedido armado como primer mensaje de un chat. Ver ADR-021.
  'sendBrief.title': 'Tenés un pedido armado',
  'sendBrief.body':
    'Se lo podés mandar como primer mensaje, así puede pasarte un precio sin preguntarte cinco cosas.',
  'sendBrief.preview': 'Ver qué le llega',
  'sendBrief.send': 'Mandar mi pedido',

  // --- chat ---
  'chat.title': 'Mensajes',
  'chat.empty.title': 'Todavía no escribiste a nadie',
  'chat.empty.body':
    'Cuando le escribas a alguien desde su perfil, la conversación aparece acá.',
  'chat.empty.action': 'Ver artistas cerca tuyo',
  'chat.open': 'Abrir chat',
  'chat.send': 'Enviar',
  'chat.placeholder': 'Escribí tu mensaje',
  'chat.unread': 'Sin leer',
  'chat.error': 'No pudimos mandar el mensaje. Probá de nuevo.',
  'chat.unavailable':
    'Esta persona todavía no maneja su perfil en MESH. Escribile por WhatsApp o Instagram.',
  'chat.startedAt': 'Conversación abierta',
} as const

export type TranslationKey = keyof typeof esAR
