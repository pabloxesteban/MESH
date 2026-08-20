import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { View } from 'react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { AuthForm } from './AuthForm.tsx'
import { NewPasswordScreen } from './NewPasswordScreen.tsx'
import { SessionProvider, useSession } from './SessionProvider.tsx'
import {
  ensureSession,
  requestPasswordReset,
  signIn,
  signOut,
  upgradeToAccount,
} from './queries.ts'

// El cliente de Supabase se mockea entero. Estos tests son sobre NUESTRA
// lógica: qué se valida antes de salir a la red, qué error se muestra, y qué
// pasa con la sesión. Que GoTrue funcione no es algo que nos toque verificar.
const mockAuth = {
  getSession: jest.fn(),
  signInAnonymously: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  updateUser: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  onAuthStateChange: jest.fn(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  })),
}

// Dos detalles, los dos necesarios:
//   - el prefijo `mock` es lo que le permite a la fábrica ver la variable;
//   - el getter la lee TARDE. jest.mock() se iza por encima del `const`, así
//     que leerla en el cuerpo de la fábrica la agarra en zona muerta temporal
//     y el mock queda con `auth: undefined`.
jest.mock('../../data/supabase.ts', () => ({
  get supabase() {
    return { auth: mockAuth }
  },
}))

const SIN_SESION = { data: { session: null }, error: null }
const CON_SESION = {
  data: {
    session: {
      user: { id: 'user-1', is_anonymous: true, email: null },
    },
  },
  error: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.getSession.mockResolvedValue(SIN_SESION)
  mockAuth.signInAnonymously.mockResolvedValue({ error: null })
  mockAuth.signInWithPassword.mockResolvedValue({ error: null })
  mockAuth.signOut.mockResolvedValue({ error: null })
  mockAuth.updateUser.mockResolvedValue({ error: null })
  mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null })
})

describe('ensureSession', () => {
  it('abre una sesión anónima cuando no hay ninguna', async () => {
    expect(await ensureSession()).toEqual({ ok: true })
    expect(mockAuth.signInAnonymously).toHaveBeenCalledTimes(1)
  })

  it('no crea un usuario nuevo si ya hay sesión', async () => {
    // Se llama en cada arranque. Sin esta guarda, cada arranque en frío dejaría
    // un usuario huérfano en mockAuth.users.
    mockAuth.getSession.mockResolvedValue(CON_SESION)
    expect(await ensureSession()).toEqual({ ok: true })
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled()
  })
})

describe('validación antes de salir a la red', () => {
  it('rechaza un correo mal formado sin llamar a Supabase', async () => {
    const result = await signIn('no-es-un-correo', 'contraseña-larga')
    expect(result).toEqual({
      ok: false,
      messageKey: 'auth.error.emailInvalid',
    })
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('rechaza una contraseña corta al crear cuenta', async () => {
    const result = await upgradeToAccount('vos@ejemplo.com', 'corta')
    expect(result).toEqual({
      ok: false,
      messageKey: 'auth.error.passwordShort',
    })
    expect(mockAuth.updateUser).not.toHaveBeenCalled()
  })

  it('NO valida el largo al entrar', async () => {
    // Una cuenta vieja puede tener una contraseña más corta que el mínimo de
    // hoy. Bloquearla en el cliente la dejaría afuera de su propia cuenta.
    await signIn('vos@ejemplo.com', 'corta')
    expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(1)
  })
})

describe('mensajes de error', () => {
  it('no distingue "no existe ese correo" de "contraseña incorrecta"', async () => {
    // Distinguirlos le confirma a cualquiera si una persona tiene cuenta en
    // MESH, y "tengo tatuajes" no es información de nadie más.
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials', status: 400 },
    })
    const credencialesMal = await signIn('vos@ejemplo.com', 'contraseña-larga')

    mockAuth.signInWithPassword.mockResolvedValue({
      error: { code: 'user_not_found', status: 400 },
    })
    const usuarioInexistente = await signIn(
      'otro@ejemplo.com',
      'contraseña-larga',
    )

    expect(credencialesMal).toEqual(usuarioInexistente)
  })

  it('nunca devuelve el texto del servidor', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: {
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      },
    })
    const result = await signIn('vos@ejemplo.com', 'contraseña-larga')
    expect(result).toEqual({ ok: false, messageKey: 'auth.error.credentials' })
  })

  it('traduce el límite de tasa, que sí es accionable', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: { status: 429 } })
    const result = await signIn('vos@ejemplo.com', 'contraseña-larga')
    expect(result).toEqual({ ok: false, messageKey: 'auth.error.rateLimited' })
  })
})

describe('upgradeToAccount', () => {
  it('actualiza el usuario en vez de crear uno nuevo', async () => {
    // Es la razón de ser de ADR-002: el mockAuth.uid() no cambia, así que no hay
    // ninguna rutina de fusión que migre interacciones, gusto y matches.
    await upgradeToAccount('vos@ejemplo.com', 'contraseña-larga')
    expect(mockAuth.updateUser).toHaveBeenCalledWith({
      email: 'vos@ejemplo.com',
      password: 'contraseña-larga',
    })
  })
})

describe('signOut', () => {
  it('deja una sesión anónima nueva, no una app sin sesión', async () => {
    // "Sin sesión" no es un estado que la app sepa mostrar: sin mockAuth.uid()
    // toda consulta devuelve vacío por RLS.
    expect(await signOut()).toEqual({ ok: true })
    expect(mockAuth.signOut).toHaveBeenCalledTimes(1)
    expect(mockAuth.signInAnonymously).toHaveBeenCalledTimes(1)
  })
})

describe('requestPasswordReset', () => {
  it('dice que sí aunque el correo no tenga cuenta', async () => {
    // Si distinguiera, la pantalla sería un verificador de quién está
    // registrado en MESH.
    mockAuth.resetPasswordForEmail.mockResolvedValue({
      error: { code: 'user_not_found', status: 400 },
    })
    expect(await requestPasswordReset('nadie@ejemplo.com')).toEqual({
      ok: true,
    })
  })

  it('sí reporta el límite de tasa', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: { status: 429 } })
    expect(await requestPasswordReset('vos@ejemplo.com')).toEqual({
      ok: false,
      messageKey: 'auth.error.rateLimited',
    })
  })

  it('el enlace vuelve a donde la app corre, no a `mesh://` fijo', async () => {
    // Estaba escrito a mano como 'mesh://auth/callback'. En Expo Go ese
    // esquema no existe todavía, así que el correo llevaba a la nada — justo
    // cuando la persona ya no puede entrar de otra forma.
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null })
    await requestPasswordReset('vos@ejemplo.com')

    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
      'vos@ejemplo.com',
      { redirectTo: 'exp://192.168.0.10:8081/--/auth/callback' },
    )
  })
})

describe('AuthForm', () => {
  function render(onSubmit = jest.fn().mockResolvedValue({ ok: true })) {
    const onDone = jest.fn()
    renderWithProviders(
      <I18nProvider locale="es-AR">
        <AuthForm
          titleKey="auth.signIn.title"
          submitKey="auth.signIn.submit"
          onSubmit={onSubmit}
          onDone={onDone}
        />
      </I18nProvider>,
    )
    return { onSubmit, onDone }
  }

  it('mantiene el botón deshabilitado hasta que el formulario sirve', () => {
    render()
    const submit = screen.getByTestId('auth-submit')
    expect(submit.props.accessibilityState.disabled).toBe(true)

    fireEvent.changeText(screen.getByTestId('auth-email'), 'vos@ejemplo.com')
    fireEvent.changeText(
      screen.getByTestId('auth-password'),
      'contraseña-larga',
    )
    expect(submit.props.accessibilityState.disabled).toBe(false)
  })

  it('muestra el error traducido y no navega', async () => {
    const { onDone } = render(
      jest.fn().mockResolvedValue({
        ok: false,
        messageKey: 'auth.error.credentials',
      }),
    )

    fireEvent.changeText(screen.getByTestId('auth-email'), 'vos@ejemplo.com')
    fireEvent.changeText(
      screen.getByTestId('auth-password'),
      'contraseña-larga',
    )
    fireEvent.press(screen.getByTestId('auth-submit'))

    await waitFor(() => {
      expect(
        screen.getByText('El correo o la contraseña no coinciden.'),
      ).toBeTruthy()
    })
    expect(onDone).not.toHaveBeenCalled()
  })

  it('sigue adelante cuando sale bien', async () => {
    const { onDone } = render()
    fireEvent.changeText(screen.getByTestId('auth-email'), 'vos@ejemplo.com')
    fireEvent.changeText(
      screen.getByTestId('auth-password'),
      'contraseña-larga',
    )
    fireEvent.press(screen.getByTestId('auth-submit'))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  })
})

describe('AuthForm con Google', () => {
  function render(onGoogle: jest.Mock) {
    const onDone = jest.fn()
    renderWithProviders(
      <I18nProvider locale="es-AR">
        <AuthForm
          titleKey="auth.signIn.title"
          submitKey="auth.signIn.submit"
          onSubmit={jest.fn().mockResolvedValue({ ok: true })}
          onGoogle={onGoogle}
          onDone={onDone}
        />
      </I18nProvider>,
    )
    return { onDone }
  }

  it('cancelar no deja ningún cartel de error', async () => {
    // El defecto que este test caza: tratar "cerró la pestaña" como una falla.
    // Nada en la pantalla lo distingue de un error de verdad, y le diría a
    // alguien que algo se rompió justo cuando decidió no seguir.
    const onGoogle = jest.fn().mockResolvedValue(null)
    const { onDone } = render(onGoogle)

    fireEvent.press(screen.getByTestId('auth-google'))

    await waitFor(() => expect(onGoogle).toHaveBeenCalledTimes(1))
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('avisa cuando esa cuenta de Google ya es de otro', async () => {
    const { onDone } = render(
      jest.fn().mockResolvedValue('auth.error.googleTaken'),
    )

    fireEvent.press(screen.getByTestId('auth-google'))

    await waitFor(() => {
      expect(screen.getByText(/ya está asociada a otra cuenta/)).toBeTruthy()
    })
    expect(onDone).not.toHaveBeenCalled()
  })

  it('entra cuando sale bien, sin haber pedido correo ni contraseña', async () => {
    // Es el punto del botón: no hay que llenar nada para llegar adentro.
    const { onDone } = render(jest.fn().mockResolvedValue('ok'))
    fireEvent.press(screen.getByTestId('auth-google'))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  })

  it('sin `onGoogle` el botón no existe', () => {
    // Recuperar contraseña comparte este formulario y ahí Google no aplica.
    renderWithProviders(
      <I18nProvider locale="es-AR">
        <AuthForm
          titleKey="auth.reset.title"
          submitKey="auth.reset.submit"
          withPassword={false}
          onSubmit={jest.fn().mockResolvedValue({ ok: true })}
          onDone={jest.fn()}
        />
      </I18nProvider>,
    )
    expect(screen.queryByTestId('auth-google')).toBeNull()
  })
})

describe('contraseña nueva', () => {
  function render(onSubmit = jest.fn().mockResolvedValue({ ok: true })) {
    const onDone = jest.fn()
    renderWithProviders(
      <I18nProvider locale="es-AR">
        <NewPasswordScreen onSubmit={onSubmit} onDone={onDone} />
      </I18nProvider>,
    )
    return { onSubmit, onDone }
  }

  it('no deja guardar una contraseña más corta que el mínimo', () => {
    // El servidor la rechazaría igual; atajarlo acá evita mandar a alguien que
    // ya está bloqueado de su cuenta a un viaje de ida y vuelta para nada.
    render()
    const guardar = screen.getByTestId('new-password-submit')
    expect(guardar.props.accessibilityState.disabled).toBe(true)

    fireEvent.changeText(
      screen.getByTestId('new-password-field'),
      'clave-larga-de-verdad',
    )
    expect(guardar.props.accessibilityState.disabled).toBe(false)
  })

  it('no vuelve a pedir el correo', () => {
    // La sesión ya está abierta por el canje del código: preguntarlo sería
    // pedirle a la persona algo que la app ya sabe.
    render()
    expect(screen.queryByTestId('auth-email')).toBeNull()
  })

  it('sigue adelante cuando se guardó', async () => {
    const { onDone } = render()
    fireEvent.changeText(
      screen.getByTestId('new-password-field'),
      'clave-larga-de-verdad',
    )
    fireEvent.press(screen.getByTestId('new-password-submit'))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  })

  it('muestra el error y no navega', async () => {
    const { onDone } = render(
      jest.fn().mockResolvedValue({
        ok: false,
        messageKey: 'auth.error.passwordShort',
      }),
    )
    fireEvent.changeText(
      screen.getByTestId('new-password-field'),
      'clave-larga-de-verdad',
    )
    fireEvent.press(screen.getByTestId('new-password-submit'))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(onDone).not.toHaveBeenCalled()
  })
})

describe('SessionProvider', () => {
  function Sonda() {
    const { isLoading, isAnonymous, userId, hasError } = useSession()
    return (
      <>
        {isLoading ? <View testID="cargando" /> : null}
        {hasError ? <View testID="error" /> : null}
        {userId != null ? <View testID="uid" /> : null}
        {isAnonymous ? <View testID="anonimo" /> : null}
      </>
    )
  }

  it('expone la sesión anónima después del arranque', async () => {
    mockAuth.getSession
      .mockResolvedValueOnce(SIN_SESION)
      .mockResolvedValueOnce(CON_SESION)

    renderWithProviders(
      <SessionProvider>
        <Sonda />
      </SessionProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('uid')).toBeTruthy())
    expect(screen.getByTestId('anonimo')).toBeTruthy()
    expect(screen.queryByTestId('cargando')).toBeNull()
  })

  it('reporta el error de arranque en vez de quedarse cargando para siempre', async () => {
    mockAuth.signInAnonymously.mockResolvedValue({ error: { status: 503 } })

    renderWithProviders(
      <SessionProvider>
        <Sonda />
      </SessionProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('se suscribe a los cambios de auth antes de arrancar la sesión', async () => {
    // Si se registrara después, el evento del propio ingreso anónimo se
    // perdería y el primer render quedaría sin sesión.
    renderWithProviders(
      <SessionProvider>
        <Sonda />
      </SessionProvider>,
    )
    await waitFor(() => expect(mockAuth.onAuthStateChange).toHaveBeenCalled())
    expect(mockAuth.onAuthStateChange.mock.invocationCallOrder[0]).toBeLessThan(
      mockAuth.getSession.mock.invocationCallOrder[0] ?? Infinity,
    )
  })
})
