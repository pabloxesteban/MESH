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
  'artists.location.body':
    'With your location on we sort by distance and tell you how far each one is. Without it the list still shows, in another order.',
  'artists.location.action': 'Turn on my location',
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
  'studio.add.styles': 'Styles for this piece',
  'studio.add.styles.hint':
    'Tap in order: the first one weighs most. Up to three.',
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
  'quickSearch.submit': 'Search',
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
