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
}
