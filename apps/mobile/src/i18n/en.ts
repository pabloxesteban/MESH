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
    'What you saved and your taste live only on this phone. With an account you take them anywhere.',
  'auth.account.email': 'Email',
  'auth.account.signOut': 'Sign out',
  'auth.account.signOut.confirm':
    "You'll start over without an account on this phone. What you saved stays in your account.",

  'auth.signUp.title': 'Create account',
  'auth.signUp.body':
    'We keep your taste and your saves so they work on any phone.',
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

  'auth.error.credentials': "That email and password don't match.",
  'auth.error.emailInvalid': "That email doesn't look valid.",
  'auth.error.passwordShort': 'The password needs at least 10 characters.',
  'auth.error.emailTaken': 'That email already has an account. Try signing in.',
  'auth.error.rateLimited': 'Too many attempts. Wait a minute.',

  'discovery.title': 'Discover',
  'discovery.empty.title': "You've seen everything there is",
  'discovery.empty.body':
    'There is no new work right now. We add artists slowly, and we would rather have few and good ones.',
  'discovery.empty.action': 'Look again',
  'discovery.action.like': 'Like',
  'discovery.action.save': 'Save',
  'discovery.action.pass': 'Pass',
  'discovery.action.undo': 'Undo',
  'discovery.saved': 'Saved',
  'discovery.passed': 'You passed on this work',

  'taste.progress.title': "We're still getting to know you",
  'taste.progress.body':
    'With {faltan} more decisions we can build your profile. {total} in total, and that is not an arbitrary number: fewer than that is not enough to say anything honest.',
  'taste.progress.empty.title': 'Your profile does not exist yet',
  'taste.progress.empty.body':
    'It is built only from what you mark. There is no questionnaire and no personality test.',
  'taste.progress.action': 'Keep exploring',
  'taste.ready.title': 'Your taste',
  'taste.ready.body':
    'This came from {n} of your decisions. Under each style is where it came from.',
  'taste.evidence.likes': '{n} likes',
  'taste.evidence.saves': '{n} saves',
  'taste.strength.high': 'Very present in what you choose',
  'taste.strength.medium': 'Present in what you choose',
  'taste.strength.low': 'Barely present in what you choose',
  'taste.reset.explanation':
    'You can delete everything we learned. Your decisions and your profile go, and the deck starts over.',
  'taste.reset.action': 'Delete my taste',
  'taste.reset.confirm': 'Tap again to delete it',

  'matches.title': 'For you',
  'matches.band.strong': 'Strong fit',
  'matches.band.good': 'Good fit',
  'matches.band.possible': 'Possible fit',
  'matches.notReady.title': 'Not yet',
  'matches.notReady.body':
    'We need {faltan} more decisions from you before we can say anything worth saying. Before that it would be guessing.',
  'matches.notReady.action': 'Go to the deck',
  'matches.empty.title': "We haven't found anyone who fits yet",
  'matches.empty.body':
    'Keep exploring and we will understand your taste better. We would rather have a short honest list than a padded one.',
  'matches.empty.action': 'Keep exploring',

  'match.reason.markedStyle': 'You marked several {termino} pieces',
  'match.reason.worksBoth': 'Works {termino} and {termino2}',
  'match.reason.location': 'In {termino}',
  'match.reason.price': 'Their range fits your budget',
  'match.reason.availability': 'Taking appointments',

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
  'profile.contact': 'Write to them',
  'profile.fixture': 'Test record. Not a real person.',
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
  'studio.claim.title': 'Claim your profile',
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
    'If we built your profile, your code lets you manage your portfolio.',
  'studio.entry.action': 'Go to my studio',
  'studio.location.title': 'Your studio location',
  'studio.location.body':
    "This way people who search for you see how many kilometers away you are. Nobody sees the exact point on a map, only the distance.",
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
    "Upload up to 4 photos of something you like. Tell us the style, and we'll point you to people nearby who do it.",
  'quickSearch.photos': 'Photos',
  'quickSearch.photo.add': 'Add photo',
  'quickSearch.photo.remove': 'Remove photo {n}',
  'quickSearch.styles': 'What style is it',
  'quickSearch.styles.hint': 'Tap the photos that look like what you want',
  'quickSearch.styles.error': "We couldn't load the examples. Try again.",
  'quickSearch.location': 'Your neighbourhood',
  'quickSearch.location.hint': 'Optional. If you pick it, we rank by distance.',
  'quickSearch.submit': 'Search',
  'quickSearch.error': "Couldn't run the search. Try again.",
  'quickSearch.uploadsFailed':
    'We uploaded {ok} of {total} photos. Searching with what we have.',
  'matches.notReady.searchByPhotos': 'Or search by photos',
  'matches.empty.searchByPhotos': 'Try different photos',
  'matches.location.prompt.title': 'How far away are they?',
  'matches.location.prompt.body':
    'Turn on your location and we\'ll show the real distance to each published studio.',
  'matches.location.prompt.action': 'Turn on location',
  'matches.location.prompt.denied':
    "We couldn't use your location. You can turn it on in Settings anytime.",
  'matches.distance': '≈{km} km',
}
