/**
 * Inglés. **Traducción, no origen.**
 *
 * Una clave que existe acá y no en `es-AR` es un bug: significa que alguien
 * escribió una pantalla en inglés primero. El test lo verifica en las dos
 * direcciones.
 */

import type { TranslationKey } from './es-AR.ts'

export const en: Readonly<Record<TranslationKey, string>> = {
  'common.cancel': 'Cancel',
  'common.retry': 'Try again',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.continue': 'Continue',
  'common.save': 'Save',
  'common.loading': 'Loading',

  'error.offline.action':
    'No connection. Check your data or wifi and try again.',
  'error.offline.title': 'No connection',
  'error.offline.body': 'Check your data or wifi and try again.',
  'error.server.title': 'Something broke on our side',
  'error.server.body': "It's not your fault. Try again in a moment.",
  'error.notFound.title': "We couldn't find this",
  'error.notFound.body': 'It may no longer exist.',
  'error.permission.title': "We couldn't find this",
  'error.permission.body': 'It may no longer exist.',
  'error.unknown.title': 'Something went wrong',
  'error.unknown.body': 'Try again.',

  'auth.account.title': 'Your account',
  'auth.account.anonymous.title': "You don't have an account",
  'auth.account.anonymous.body':
    'Your profile, your searches and your chats live only on this phone. With an account you take them anywhere.',
  'auth.account.email': 'Email',
  'auth.account.signOut': 'Sign out',
  'auth.account.signOut.confirm':
    "You'll start over without an account on this phone. Your profile and your chats stay in your account.",

  'auth.signUp.title': 'Create account',
  'auth.signUp.body':
    'Your profile, your searches and your chats stop living on a single phone.',
  'auth.signUp.submit': 'Create account',
  'auth.signUp.toSignIn': 'I already have an account',

  'auth.signIn.title': 'Sign in',
  'auth.signIn.submit': 'Sign in',
  'auth.signIn.toSignUp': 'Create an account',
  'auth.signIn.forgot': 'I forgot my password',

  'auth.reset.title': 'Reset password',
  'auth.reset.body': 'We send a link to the email you signed up with.',
  'auth.reset.submit': 'Send link',
  'auth.reset.sent':
    'If that email has an account, a link arrives in a few minutes.',

  'auth.field.email': 'Email',
  'auth.field.email.placeholder': 'you@example.com',
  'auth.field.password': 'Password',
  'auth.field.password.hint': 'At least 10 characters',

  'auth.adult.label': 'I am 18 or older',
  'auth.adult.checked': 'Declared: I am 18 or older. Tap to clear.',
  'auth.adult.unchecked': 'Declare that I am 18 or older',
  'auth.adult.hint':
    'Needed to book an appointment. We do not ask for your date of birth or store it.',
  'auth.or': 'or',
  'auth.google': 'Continue with Google',
  'auth.google.hint':
    'What you already did on this phone is kept: signing in with Google does not switch your user.',
  'auth.error.google': 'Could not sign in with Google. Try again.',
  'auth.error.googleTaken':
    'That Google account is already linked to another MESH account. Sign in with it here, or use a different Google account.',
  'auth.callback.working': 'Opening your link',
  'auth.error.link': 'That link did not work. Request a new one from Sign in.',
  'auth.error.linkExpired':
    'That link has expired. Links last one hour; request a new one.',
  'auth.error.otherDevice':
    'You need to open that link on the same phone where you requested it. Request a new one from this phone.',
  'auth.newPassword.title': 'Choose a new password',
  'auth.newPassword.body':
    "From now on you'll sign in with this one. The previous one stops working.",
  'auth.newPassword.field': 'New password',
  'auth.newPassword.submit': 'Save and sign in',
  'auth.error.credentials': "That email and password don't match.",
  'auth.error.emailInvalid': "That email doesn't look valid.",
  'auth.error.passwordShort': 'The password needs at least 10 characters.',
  'auth.error.emailTaken': 'That email already has an account. Try signing in.',
  'auth.error.rateLimited': 'Too many attempts. Wait a minute.',

  'discovery.empty.title': "You've seen everything there is",
  'discovery.empty.body':
    'There is no new work right now. We add artists slowly, and we would rather have few and good ones.',
  'discovery.empty.action': 'Look again',
  'discovery.action.like': 'Like',
  'discovery.action.save': 'Save',
  'discovery.action.pass': 'Pass',
  'discovery.action.undo': 'Undo',
  'artists.card.open': "Open {nombre}'s profile",
  'artists.card.km': '{km} km away',
  'artists.card.noLocation': 'Location not shared',
  'artists.card.noWork': 'No work uploaded yet',
  'artists.location.body':
    'With your location on we sort by distance and tell you how far each one is. Without it the list still shows, in another order.',
  'artists.location.action': 'Turn on my location',
  'onboardingLocation.title': 'Where should we measure from?',
  'onboardingLocation.body':
    'With your location we sort the list nearest first and tell you how many kilometres away each studio is. Without it the list looks the same, in a different order.',
  'onboardingLocation.privacy':
    'It is only used on your phone, to sort. We do not store it or show it to anyone.',
  'onboardingLocation.allow': 'Use my location',
  'onboardingLocation.skip': 'Not now',
  'searchLocation.title': 'Where from',
  'searchLocation.hint':
    'Changes the order of the list. It never hides anyone: whoever is far away still shows up, further down.',
  'searchLocation.header.device': 'Near where you are',
  'searchLocation.header.deviceAt': 'Near {barrio}',
  'searchLocation.header.neighborhood': 'Near {barrio}',
  'searchLocation.header.none': 'No location',
  'searchLocation.header.action': 'Change',
  'searchLocation.device': 'My location',
  'searchLocation.device.hint':
    'Orders by real distance and tells you how many kilometres away each one is.',
  'searchLocation.device.denied':
    'Permission is denied. You can turn it on from the phone settings.',
  'searchLocation.none': 'No location',
  'searchLocation.none.hint': 'The list is not ordered by proximity.',
  'searchLocation.neighborhoods': 'Pick a neighbourhood',
  'searchLocation.neighborhoods.hint':
    'Orders by neighbourhood proximity. Without your real location we cannot say how many kilometres away each one is, so we do not say it.',
  'searchLocation.search': 'Search a neighbourhood',
  'searchLocation.empty': 'No neighbourhood is called that',
  'searchLocation.close': 'Done',
  'artists.empty.title': 'Nobody has signed up yet',
  'artists.empty.body':
    'Once tattooers register, this is where you will see the ones working near you. In the meantime you can browse work.',
  'artists.empty.action': 'Go explore',
  'artists.search.placeholder': 'Search someone by name',
  'artists.search.label': 'Search an artist by name',
  'artists.search.clear': 'Clear what you typed',
  'artists.search.empty.title': 'Nobody by that name',
  'artists.search.empty.body':
    'They may not be on MESH yet, or they may go by something else. If you do not know the name, Explore gets you there through the work.',
  'artists.search.empty.action': 'Go explore',
  'explore.byPhotos': 'Search with a photo',
  'explore.title': 'Explore',
  'explore.subtitle': 'All the work, near or far.',
  'discovery.tile.open': "Open {nombre}'s work",
  'discovery.mode.grid': 'Grid',
  'discovery.mode.deck': 'One at a time',
  'discovery.mode.label': 'How you want to look',
  'discovery.filter.all': 'All',
  'discovery.grid.empty.title': 'No work to show yet',
  'discovery.grid.empty.body':
    'We add artists slowly, and we would rather have few and good ones.',
  'discovery.grid.empty.action': 'Look again',
  'discovery.grid.filtered.title': 'Nobody is working that style yet',
  'discovery.grid.filtered.body':
    'Clear the filter to see everything, or try another style.',
  'discovery.grid.filtered.action': 'See everything',
  'discovery.learning':
    'While we get to know each other, this is the shape that teaches us most.',
  'discovery.saved': 'Saved',
  'discovery.passed': 'You passed on this work',

  'profile.styles': 'Works',
  'profile.price': 'Price range',
  'profile.price.range': '{min} to {max}',
  'profile.price.asOf': 'Stated on {fecha}',
  'profile.availability': 'Schedule',
  'profile.availability.open': 'Taking appointments',
  'profile.availability.limited': 'Limited schedule',
  'profile.availability.waitlist': 'Waiting list',
  'profile.availability.closed': 'Schedule closed',
  'profile.availability.asOf': 'Per the artist, on {fecha}',
  'profile.availability.stale': 'No update since {fecha}',
  'profile.travels': 'Travels',
  'profile.portfolio': 'Work',
  'profile.back': 'Back',
  'profile.contact': 'Write to them',
  'profile.fixture': 'Test record. Not a real person.',
  'profile.fixture.noContact':
    'You cannot message a test record. On a real profile, the button to start the conversation is here.',

  'saved.title': 'Saved',
  'saved.add': 'Save this piece',
  'saved.remove': 'Remove from saved',
  'saved.empty.title': "You haven't saved anything yet",
  'saved.empty.body':
    'The heart under each piece brings it here, to look at again whenever you want. Nobody else sees what you save.',
  'saved.empty.action': 'Go to Explore',
  'saved.entry': 'What you saved',
  'saved.count': '{n} piece(s)',
  'ranking.title': 'Most saved',
  'ranking.week': 'This week',
  'ranking.month': 'This month',
  'ranking.saves': '{n} saves',
  'ranking.open': 'See {nombre}, with {n} saves',
  'studio.saves.title': 'They saved your work',
  'studio.saves.total': '{n} saves in total',
  'studio.saves.new': '{n} new since you last looked',
  'studio.saves.none':
    'Nobody has saved anything yet. When they do, it shows up here.',
  'studio.saves.piece': '{n} saves',
  'day.mon': 'Mon',
  'day.tue': 'Tue',
  'day.wed': 'Wed',
  'day.thu': 'Thu',
  'day.fri': 'Fri',
  'day.sat': 'Sat',
  'day.sun': 'Sun',
  'availability.title': 'Your hours',
  'availability.hint':
    'Pick a day and add the times you work. Anyone looking at your profile sees these hours, never who you are with.',
  'availability.closed': 'You do not work that day.',
  'availability.pickStart': 'From what time',
  'availability.pickEnd': 'Until what time',
  'availability.span': 'From {desde} to {hasta} · {horas} h',
  'availability.remove': 'Remove',
  'schedule.title': 'Give an appointment',
  'schedule.pickDay': 'Which day',
  'schedule.pickTime': 'What time',
  'schedule.duration': 'How long',
  'schedule.hours': '{n} h',
  'schedule.noSlots': 'No room left that day. Try another one.',
  'schedule.confirm': 'Give the appointment',
  'schedule.done': 'Appointment given',
  'schedule.error.taken': 'That time is already taken. Pick another one.',
  'schedule.error.past': 'That time has already passed.',
  'schedule.error.notYours':
    'You cannot give an appointment in this conversation.',
  'schedule.error.minor':
    'This person has not confirmed they are 18 or older yet. Without that, no appointment can be booked.',
  'schedule.error.unknown': 'Could not give the appointment. Try again.',
  'appointment.title': 'Appointment',
  'appointment.when': '{fecha}, from {desde} to {hasta}',
  'appointment.cancel': 'Cancel the appointment',
  'appointment.none': 'No appointment in this conversation yet.',
  'calendar.title': 'Upcoming hours',
  'calendar.empty': 'They have not published their hours yet.',
  'calendar.free': '{n} free',
  'calendar.free.one': '1 free',

  // --- reviews ---------------------------------------------------------------
  'reviews.title': 'What people said',
  'reviews.empty':
    'No reviews yet. They show up here when someone gets tattooed and tells how it went.',
  'reviews.summary': '{promedio} out of 5 · {n} reviews',
  'reviews.summary.one': '{promedio} out of 5 · 1 review',
  'reviews.when': 'Appointment on {fecha}',
  'reviews.edited': 'Edited',
  'reviews.photo': 'Photo uploaded by the person who left the review',
  'reviews.stars.value': '{n} out of 5 stars',
  'reviews.stars.pick': 'Give {n} stars',
  'reviews.leave': 'Leave a review',
  'reviews.leave.title': 'How did it go?',
  'reviews.leave.hint':
    'Read by anyone considering this artist. The stars are enough; the rest adds.',
  'reviews.leave.body': 'Tell how it went',
  'reviews.leave.photo': 'Add a photo',
  'reviews.leave.photo.public':
    'The photo will show on the artist profile, along with your review.',
  'reviews.leave.photo.attached': 'The photo you are about to publish',
  'reviews.leave.photo.remove': 'Remove the photo',
  'reviews.leave.submit': 'Publish',
  'reviews.error.send': 'Could not publish the review. Try again.',
  'reviews.error.photo': 'Could not upload the photo. Try another one.',
  'common.fixture': 'Test',

  'contact.title': 'Write to {nombre}',
  'contact.body':
    'This is the message. Read it and change whatever you want before sending — it goes from your account, not from MESH.',
  'contact.edit': 'Message',
  'contact.whatsapp': 'Open WhatsApp',
  'contact.instagram': 'Open Instagram',
  'contact.instagram.note':
    'Instagram does not allow sending a pre-written message. We copied it so you can paste it.',
  'contact.copied': 'Message copied',
  'contact.fixture.title': 'This is a test record',
  'contact.fixture.body':
    'Not a real person, and the contact number does not exist. It is here so ' +
    'the app can be built and shown before the real content arrives.',
  'contact.fixture.action': 'Back to profile',
  'contact.noChannel.title': 'We cannot write to them from here',
  'contact.noChannel.body':
    'This artist did not publish any contact channel. We do not invent one.',
  'contact.noChannel.action': 'Back to the profile',

  'contact.message.greeting': 'Hi, I am writing about a tattoo.',
  'contact.message.styles': 'Styles:',
  'contact.message.budget': 'Budget:',
  'contact.message.timing': 'When:',
  'contact.message.references': 'I will send some references separately.',
  'contact.message.closing': 'Does that work? Let me know. Thanks.',

  'projects.title': 'Your projects',
  'projects.empty.title': 'You do not have any project yet',
  'projects.empty.body':
    'A project is a concrete idea: what you want, roughly when, and how much you can spend. It lets you search with that in hand instead of only with your taste.',
  'projects.empty.action': 'Create a project',
  'projects.new': 'New project',
  'projects.form.title': 'What do you want',
  'projects.form.title.placeholder': 'Olive branch on the forearm',
  'projects.form.description': 'Tell it in your own words',
  'projects.form.description.hint':
    'Optional. Size, body placement, whatever comes to mind.',
  'projects.form.styles': 'Styles you like for this',
  'projects.form.budget': 'How much you can spend',
  'projects.form.budget.hint':
    'Optional. We only use it to avoid showing you people out of your reach.',
  'projects.form.budget.min': 'From',
  'projects.form.budget.max': 'To',
  'projects.form.location': 'Your neighbourhood',
  'projects.form.location.hint':
    'Used to rank artists by how close they are to you. You can skip it.',
  'projects.form.timing': 'By when',
  'projects.form.timing.asap': 'As soon as possible',
  'projects.form.timing.weeks': 'In the coming weeks',
  'projects.form.timing.months': 'In the coming months',
  'projects.form.timing.flexible': 'No rush',
  'projects.form.submit': 'Save project',
  'projects.references': 'References',
  'projects.references.add': 'Add an image',
  'projects.references.hint':
    'We keep them private and strip the location data before uploading.',
  'projects.references.count': '{n} of {max}',
  'projects.references.full': 'You reached the maximum of {max} images',
  'projects.archive': 'Archive project',
  'projects.archive.confirm': 'Tap again to archive it',
  'projects.matches': 'See who fits',

  'settings.analytics.title': 'Usage data',
  'settings.analytics.body':
    'We record which screens are used and which buttons are tapped, so we know what works. Never what you write, what you search, or your styles. You can turn it off and nothing is recorded.',
  'settings.analytics.on': "It's on",
  'settings.analytics.off': "It's off",
  'settings.analytics.toggle.on': 'Turn off',
  'settings.analytics.toggle.off': 'Turn on',

  'category.tattoo': 'Tattoo',

  'style.tattoo.fine-line': 'Fine line',
  'style.tattoo.blackwork': 'Blackwork',
  'style.tattoo.dotwork': 'Dotwork',
  'style.tattoo.old-school': 'Old school',
  'style.tattoo.traditional': 'Traditional',
  'style.tattoo.neo-traditional': 'Neo-traditional',
  'style.tattoo.realism': 'Realism',
  'style.tattoo.black-and-grey': 'Black and grey',
  'style.tattoo.watercolor': 'Watercolor',
  'style.tattoo.ornamental': 'Ornamental',
  'style.tattoo.japanese': 'Japanese',
  'style.tattoo.lettering': 'Lettering',
  'style.tattoo.minimalist': 'Minimalist',
  'style.tattoo.fileteado-porteno': 'Fileteado porteño',
  'style.tattoo.handpoke': 'Handpoke',
  // --- studio (artist mode) ---
  'studio.title': 'Your studio',
  'studio.eyebrow': 'YOUR PROFILE',
  'studio.unpublished': 'Not published yet. We publish it.',
  'studio.create.title': 'Create your profile',
  'studio.create.body':
    'Your name and how people reach you. The rest comes later.',
  'studio.create.name': 'Your name or your studio name',
  'studio.create.instagram': 'Instagram',
  'studio.create.whatsapp': 'WhatsApp',
  'studio.create.contact.hint':
    'One is enough. This is how people will write to you.',
  'studio.create.submit': 'Create my profile',
  'studio.create.failed': "Couldn't create the profile. Try again.",
  'studio.styles.title': 'Your styles',
  'studio.styles.body':
    "Up to three, in order. Without this you won't show up when someone looks for what you do.",
  'studio.styles.save': 'Save styles',
  'studio.styles.saved': 'Saved',
  'studio.styles.failed': "Couldn't save them. Try again.",
  'studio.claim.title': 'Did we send you a code?',
  'studio.claim.body':
    'If we built your profile, we send you an eight-character code. That code ' +
    'lets you manage your portfolio from here.',
  'studio.claim.label': 'Code',
  'studio.claim.submit': 'Claim',
  'studio.claim.invalid': 'That code is not valid, or it was already used.',
  'studio.add.title': 'Upload a piece',
  'studio.add.styles.hint':
    'Pick the styles of this piece, up to three, in order: the first one weighs most.',
  'studio.add.styles.max': 'You picked {n}. Remove one to change it.',
  'studio.add.featured.on': 'Will open your profile',
  'studio.add.featured.off': 'Open my profile with this',
  'studio.add.pick': 'Pick a photo and upload',
  'studio.upload.done': 'Uploaded',
  'studio.upload.failed': 'Upload failed. Try again.',
  'studio.empty.title': 'Nothing uploaded yet',
  'studio.empty.body':
    'Your work is the only thing someone sees before deciding to reach out.',
  'studio.piece.featured': 'Opens your profile',
  'studio.piece.remove': 'Remove',
  'studio.piece.removed': 'Removed',
  'studio.entry.label': 'Do you tattoo?',
  'studio.entry.hint':
    'Create your profile and upload your work so people can find you.',
  'studio.entry.action': 'Go to my studio',
  'studio.location.title': 'Your studio location',
  'studio.location.body':
    'This way people who search for you see how many kilometers away you are. Nobody sees the exact point on a map, only the distance.',
  'studio.location.button': 'Use my current location',
  'studio.location.button.update': 'Update location',
  'studio.location.set': 'Your studio is published',
  'studio.location.confirm.title': 'Publish this location?',
  'studio.location.confirm.body':
    "It'll show as your studio's location to anyone searching on MESH.",
  'studio.location.confirm.submit': 'Yes, publish',
  'studio.location.confirm.cancel': 'Cancel',
  'studio.location.error.permission':
    'We need location permission for this. You can turn it on in Settings.',
  'studio.location.error.unavailable':
    "We couldn't get your location. Try again.",
  'studio.location.error.save': "Couldn't publish. Try again.",
  // --- search by photos ---
  'quickSearch.title': 'Search by photos',
  'quickSearch.subtitle':
    "Upload up to 4 photos of something you like and we'll point you to people nearby who do something similar.",
  'quickSearch.photos': 'Photos',
  'quickSearch.photo.add': 'Add photo',
  'quickSearch.photo.remove': 'Remove photo {n}',
  'quickSearch.location': 'Your location',
  'quickSearch.location.hint':
    'Turn it on and we search near you first. Optional: we still search without it.',
  'quickSearch.location.action': 'Use my location',
  'quickSearch.location.near': 'Searching near {barrio}',
  'quickSearch.location.unknown':
    "We didn't recognize your neighbourhood, so we're searching the whole city.",
  'quickSearch.location.denied':
    'Without your location we search the whole city. You can turn it on in Settings.',
  'quickSearch.submit': 'Publish the search',
  'quickSearch.read': 'Read the photos',

  // --- the brief ------------------------------------------------------------
  'brief.title': 'This is what we understood',
  'brief.read': '{n} came from your photo. Change whatever is off.',
  'brief.readNone':
    'We could not read anything from your photo with confidence. Fill it in yourself.',
  'brief.read.words': '{n} came from what you told me. Change anything wrong.',
  'brief.readNone.words':
    "We couldn't pull anything definite from what you told me. Fill it in yourself.",
  'brief.style': 'Style',
  'brief.bodyArea': 'Where it goes',
  'brief.size': 'What size',
  'brief.palette': 'Which palette',

  'trait.tattoo.antebrazo': 'Forearm',
  'trait.tattoo.brazo': 'Arm',
  'trait.tattoo.hombro': 'Shoulder',
  'trait.tattoo.espalda': 'Back',
  'trait.tattoo.pecho': 'Chest',
  'trait.tattoo.costillas': 'Ribs',
  'trait.tattoo.pierna': 'Leg',
  'trait.tattoo.tobillo': 'Ankle',
  'trait.tattoo.mano': 'Hand',
  'trait.tattoo.cuello': 'Neck',
  'trait.tattoo.mini': 'Mini, up to 5 cm',
  'trait.tattoo.chico': 'Small, 5 to 10 cm',
  'trait.tattoo.mediano': 'Medium, 10 to 20 cm',
  'trait.tattoo.grande': 'Large, over 20 cm',
  'trait.tattoo.gran-formato': 'Large scale or sleeve',
  'trait.tattoo.negro': 'Black',
  'trait.tattoo.negro-y-gris': 'Black and grey',
  'trait.tattoo.color': 'Colour',

  // --- the proposal ---------------------------------------------------------
  'proposal.title': 'What they answered',
  'proposal.empty':
    'Nobody has answered yet. Proposals show up here when a tattooer sends one.',
  'proposal.range': '{min} to {max}',
  'proposal.sessions': '{n} sessions',
  'proposal.sessions.one': '1 session',
  'proposal.open': 'Message them',
  'proposal.send': 'Answer with a proposal',
  'proposal.send.title': 'Your proposal',
  'proposal.send.hint':
    'The range and the sessions are what the person needs to decide. If it is an estimate, say so in the note.',
  'proposal.send.min': 'From',
  'proposal.send.max': 'To',
  'proposal.send.sessions': 'Sessions',
  'proposal.send.note': 'Any condition',
  'proposal.send.submit': 'Send the proposal',
  'proposal.error.send': 'Could not send the proposal. Try again.',
  'proposal.error.range': 'The lower end cannot be higher than the upper one.',
  'quickSearch.error': "Couldn't run the search. Try again.",
  'quickSearch.unrecognized':
    "We couldn't recognize the style in that photo. Try another one.",
  'quickSearch.uploadsFailed':
    'We uploaded {ok} of {total} photos. Searching with what we have.',
  'onboarding.title': 'What brings you here?',
  'onboarding.body':
    "We only ask once. Whatever you pick, you'll still be able to do both.",
  'onboarding.looking.title': "I'm looking for someone",
  'onboarding.looking.body':
    'You want a tattoo and you are looking for the right person.',
  'onboarding.offering.title': 'I offer a service',
  'onboarding.offering.body':
    "You tattoo and MESH already built your profile. We'll ask for your code so you can run it.",
  'tabs.home': 'Home',
  'tabs.search': 'Search',
  'tabs.matches': 'Matches',
  'tabs.profile': 'Profile',
  'tabs.explore': 'Explore',
  'tabs.studio': 'Studio',
  'tabs.chats': 'Chats',
  'demand.title': 'People looking',
  'demand.card.reference': 'Reference photo for this search',
  'demand.card.noPhotos': 'No reference photos',
  'demand.card.morePhotos': '+{n}',
  'demand.action.pass': 'Pass',
  'demand.action.interest': "I'm interested",
  'demand.action.undo': 'Undo',
  'demand.empty.title': 'No searches for you right now',
  'demand.empty.body':
    'This is where searches show up when someone asks for a style you do, and ' +
    'only if they chose to share it. There are still very few.',
  'demand.empty.action': 'Look again',
  'demand.noProfile.title': 'Create your profile first',
  'demand.noProfile.body':
    'To show you who is looking we need to know what you tattoo. It takes a ' +
    'minute from your studio.',
  'demand.noProfile.action': 'Go to my studio',
  'demand.interests.title': 'Interested in your search',
  'demand.interests.open': "Open {nombre}'s profile",
  'demand.interests.dismiss': 'Remove {nombre} from the list',
  'demand.interests.dismiss.short': 'Remove',
  'quickSearch.open.title': 'Let tattooers see it?',
  'quickSearch.open.body':
    'If you turn this on, artists who tattoo what you are looking for can see ' +
    'these photos and the style, and let you know they are interested. They ' +
    'cannot see your name or write to you: you open the chat.',
  'quickSearch.open.on': 'They can see it',
  'quickSearch.open.off': 'Nobody sees it',
  'quickSearch.open.toggle.on': 'Hide it again',
  'quickSearch.open.toggle.off': 'Let them see it',
  'chat.empty.artist.title': 'Nobody has written to you yet',
  'chat.empty.artist.body':
    'When someone writes, the conversation shows up here. You cannot write ' +
    'first: the person looking decides when to open the chat.',
  'chat.empty.artist.action': 'See who is looking',
  'account.title': 'Profile',
  'account.name': 'Your name',
  'account.intent': 'What brings you here?',
  'account.intent.hint':
    'Changes what you see when you open the app. It closes no doors: you can switch back whenever you want.',
  'account.intent.looking': "I'm looking for someone",
  'account.intent.offering': 'I offer a service',
  'account.more': 'More',
  'account.studio': 'Your studio',
  'account.saved': 'Saved',
  // The brief assistant. See ADR-021.
  'assistant.title': 'Tell me what you want',
  'assistant.badge': 'MESH assistant',
  'assistant.opening':
    'I ask three or four questions to put your request together. Then you review it, and only then do tattooers see it.',
  'assistant.limits':
    "I don't know prices, I don't know who has openings, and I don't recommend anyone. Each tattooer answers that.",
  'assistant.placeholder': 'Write what you have in mind',
  'assistant.send': 'Send',
  'assistant.thinking': 'Thinking',
  'assistant.discard': 'Delete this conversation',
  'assistant.error': "We couldn't reply. Try again.",
  'assistant.entry': 'Tell me in words',
  'assistant.entry.body':
    "If you don't have a photo, tell me the idea and we'll build the request together.",
  'assistant.review.title': 'Review your request',
  'assistant.review.body':
    "This is what a tattooer will read. Change anything that doesn't say what you want.",
  'assistant.review.gaps':
    '{n} details are still blank. You can publish anyway.',
  'assistant.review.gaps.one':
    '1 detail is still blank. You can publish anyway.',
  'assistant.review.name': 'Request name',
  'assistant.review.summary': 'Your request in words',
  'assistant.review.summary.hint':
    'Written from what you told me. Edit it until it sounds like you.',
  'assistant.review.publish': 'Publish the request',
  'assistant.review.error': "We couldn't publish the request. Try again.",
  'replyHabit.same_day': 'Usually replies the same day',
  'replyHabit.few_days': 'Usually replies within a few days',
  'replyHabit.slower': 'Usually slow to reply',
  'replyHabit.source':
    'Calculated from their conversations in the last 90 days.',
  'replyHabit.source.own':
    'Worked out from your conversations over the last 90 days.',
  'replyHabit.own': 'This is how your replying looks on your profile',

  'age.title': 'One thing before you come in',
  'age.yes': "Yes, I'm 18 or older",
  'age.blocked':
    'Booking an appointment needs you to confirm you are 18 or older. You can do it from your profile.',

  'settings.notifications.title': 'Notices',
  'settings.notifications.body':
    'We tell you when something of yours happens: that we looked at a report you filed, or that an appointment was booked or cancelled. Nothing else, and never to get you to come back. If you turn it off we stop writing them: you will not be able to read them later.',
  'settings.notifications.on': 'Turned on',
  'settings.notifications.off': 'Turned off',
  'settings.notifications.toggle.on': 'Turn off',
  'settings.notifications.toggle.off': 'Turn on',

  'settings.errors.title': 'When something breaks',
  'settings.errors.body':
    'When something breaks we send what broke, on which screen, and with which code. Never what you wrote, never your email, never who you are: a report does not carry your identifier.',
  'settings.errors.on': 'Turned on',
  'settings.errors.off': 'Turned off',
  'settings.errors.toggle.on': 'Turn off',
  'settings.errors.toggle.off': 'Turn on',

  'legal.privacy': 'Privacy',
  'legal.terms': 'Terms of use',
  'legal.moderation': 'How we moderate',

  'legal.note': 'They open in your browser.',

  'export.title': 'Take your data',
  'export.body':
    'We build a file with everything MESH keeps about you: your searches, your messages, your appointments, your reviews and what you told the assistant. Photos come with a link that lasts a week.',
  'export.notIncluded':
    'What other people wrote is not in it: that is theirs. You can still read it in the app.',
  'export.action': 'Build my file',
  'export.again': 'Build it again',
  'export.ready': 'Done. Inside there are:',
  'export.count.searches': '{n} searches',
  'export.count.searches.one': '1 search',
  'export.count.chats': '{n} conversations',
  'export.count.chats.one': '1 conversation',
  'export.count.appointments': '{n} appointments',
  'export.count.appointments.one': '1 appointment',
  'export.count.reviews': '{n} reviews you wrote',
  'export.count.reviews.one': '1 review you wrote',
  'export.count.saved': '{n} saved works',
  'export.count.saved.one': '1 saved work',
  'export.count.assistant': '{n} chats with the assistant',
  'export.count.assistant.one': '1 chat with the assistant',
  'export.copy': 'Copy the contents',
  'export.copied': 'Copied',
  'export.error': "We couldn't build the file. Try again.",

  'account.delete.entry': 'Delete my account',
  'account.delete.title': 'Delete your account',
  'account.delete.body':
    'It is immediate and cannot be undone. Nothing is deactivated or kept in case you change your mind.',
  'account.delete.item.profile': 'Your account and your profile',
  'account.delete.item.searches': 'Your searches and the photos you uploaded',
  'account.delete.item.chats': 'Your conversations, on both sides',
  'account.delete.item.reviews': 'The reviews you wrote',
  'account.delete.item.photos': 'What you told the assistant',
  'account.delete.item.studio':
    'Your artist profile, if you had one, with all its work',
  'account.delete.kept':
    'One record stays: that an account was deleted, with its identifier and the date. No email, no name, nothing of what was inside.',
  'account.delete.word': 'delete',
  'account.delete.confirm': 'Type "{palabra}" to confirm',
  'account.delete.submit': 'Delete my account',
  'account.delete.error': "We couldn't delete the account. Try again.",

  'agenda.title': 'Your week',
  'agenda.noName': 'No name set',
  'agenda.open': 'Open the chat',
  'agenda.open.one': 'Open the chat with {quien}',

  'notif.title': 'What happened',
  'notif.report.actioned': 'We looked at what you reported and took action.',
  'notif.report.dismissed':
    'We looked at what you reported and found no reason to act.',
  'notif.appointment_scheduled': 'You have an appointment.',
  'notif.appointment_cancelled': 'An appointment of yours was cancelled.',
  'notif.dismiss': 'Dismiss',
  'notif.dismiss.one': 'Dismiss the notice: {aviso}',

  'report.open': 'Report',
  'report.title': "What's wrong with this?",
  'report.hint':
    'Someone on the team reads it. It is not automatic, and the other person is not notified.',
  'report.reason.stolen_work': "Someone else's work",
  'report.reason.impersonation': 'Pretending to be someone else',
  'report.reason.harassment': 'Harassment or abuse',
  'report.reason.explicit': 'Explicit content',
  'report.reason.spam': 'Spam',
  'report.reason.off_platform': 'Trying to take me off MESH',
  'report.reason.other': 'Something else',
  'report.note': 'Tell us more, if you want',
  'report.submit': 'Send the report',
  'report.done': 'Got it',
  'report.done.body':
    'Someone on the team will read it. If you want to stop running into them meanwhile, block them.',
  'report.already': 'You already reported this. Once is enough.',
  'report.error': "We couldn't send the report. Try again.",
  'report.assistant': 'The assistant said something wrong',

  'block.do': 'Block',
  'block.undo': 'Unblock',
  'block.active':
    'Blocked. You cannot message each other, they will not show in your grids, and they cannot answer your searches.',
  'block.list.title': 'Blocked',
  'block.list.empty': "You haven't blocked anyone.",
  'block.list.undo': 'Unblock {nombre}',

  'sendBrief.title': 'You have a request ready',
  'sendBrief.body':
    'You can send it as your first message, so they can quote you without asking five things.',
  'sendBrief.preview': 'See what they get',
  'sendBrief.send': 'Send my request',

  'chat.title': 'Messages',
  'chat.empty.title': "You haven't written to anyone yet",
  'chat.empty.body':
    'When you message someone from their profile, the conversation shows up here.',
  'chat.empty.action': 'See artists near you',
  'chat.open': 'Open chat',
  'chat.send': 'Send',
  'chat.placeholder': 'Write your message',
  'chat.unread': 'Unread',
  'chat.error': "Couldn't send the message. Try again.",
  'chat.unavailable':
    "This person doesn't run their MESH profile yet. Message them on WhatsApp or Instagram.",
  'chat.startedAt': 'Conversation open',
}
