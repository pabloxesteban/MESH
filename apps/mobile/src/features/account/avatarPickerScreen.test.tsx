/**
 * `AvatarPickerScreen`: elegir origen, recortar, subir.
 *
 * El recorte en sí (`AvatarCropper`) ya tiene su propio archivo. Acá se
 * cubren los pasos alrededor: elegir galería o cámara, el permiso de cámara
 * denegado con su salida, y el estado de subida (deshabilitado sin recorte,
 * error con reintentar, éxito).
 *
 * `expo-image`, en este entorno de test, no dispara `onLoad` solo — el
 * decodificador real no corre en Jest. Para llegar al estado donde el
 * recorte ya está interactivo se invoca el prop `onLoad` directamente sobre
 * el nodo de imagen, que es la misma señal que dispararía el decodificador
 * real. Confirmado que RNTL expone la función en `node.props.onLoad`.
 */

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import * as ImagePicker from 'expo-image-picker'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { AvatarPickerScreen } from './AvatarPickerScreen.tsx'
import { uploadAvatar } from './uploadAvatar.ts'
import { fetchOwnedProfessional } from '@/features/artist/queries.ts'

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}))
jest.mock('./uploadAvatar.ts', () => ({
  uploadAvatar: jest.fn(),
}))
jest.mock('@/features/artist/queries.ts', () => ({
  fetchOwnedProfessional: jest.fn(),
}))

const requestGalleryMock = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
const requestCameraMock = ImagePicker.requestCameraPermissionsAsync as jest.Mock
const launchGalleryMock = ImagePicker.launchImageLibraryAsync as jest.Mock
const launchCameraMock = ImagePicker.launchCameraAsync as jest.Mock
const uploadMock = uploadAvatar as jest.Mock
const fetchOwnedProfessionalMock = fetchOwnedProfessional as jest.Mock

function Wrapper({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { gcTime: 0 },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">{children}</I18nProvider>
    </QueryClientProvider>
  )
}

function renderScreen(
  props: Partial<React.ComponentProps<typeof AvatarPickerScreen>> = {},
) {
  return renderWithProviders(
    <Wrapper>
      <AvatarPickerScreen userId="u1" onBack={jest.fn()} onDone={jest.fn()} {...props} />
    </Wrapper>,
  )
}

/** Simula que el decodificador real terminó: llama el `onLoad` del `Image`. */
function finishImageLoad() {
  const nodo = screen.UNSAFE_root.findAll(
    (n) => String(n.type) === 'ViewManagerAdapter_ExpoImage' && typeof n.props.onLoad === 'function',
  )[0]
  if (nodo == null) throw new Error('no se encontró la imagen del recorte')
  act(() =>
    nodo.props.onLoad({
      nativeEvent: { source: { url: 'foto.jpg', width: 1200, height: 800 }, cacheType: 'none' },
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  fetchOwnedProfessionalMock.mockResolvedValue(null)
  requestGalleryMock.mockResolvedValue({ granted: true })
  requestCameraMock.mockResolvedValue({ granted: true })
  uploadMock.mockResolvedValue({ mediaId: 'm1', path: 'avatars/u1/m1.jpg' })
})

it('arranca eligiendo origen: galería o cámara', () => {
  renderScreen()
  expect(screen.getByTestId('avatar-picker-choose')).toBeTruthy()
  expect(screen.getByTestId('avatar-picker-gallery')).toBeTruthy()
  expect(screen.getByTestId('avatar-picker-camera')).toBeTruthy()
})

it('cámara sin permiso: ofrece el fallback a la galería, no un callejón', async () => {
  requestCameraMock.mockResolvedValue({ granted: false })
  renderScreen()

  fireEvent.press(screen.getByTestId('avatar-picker-camera'))
  await waitFor(() => expect(screen.getByTestId('avatar-picker-camera-denied')).toBeTruthy())
  expect(screen.getByTestId('avatar-picker-fallback-gallery')).toBeTruthy()
})

it('elegir de la galería sin permiso no abre nada', async () => {
  requestGalleryMock.mockResolvedValue({ granted: false })
  renderScreen()

  fireEvent.press(screen.getByTestId('avatar-picker-gallery'))
  await waitFor(() => expect(launchGalleryMock).not.toHaveBeenCalled())
  expect(screen.getByTestId('avatar-picker-choose')).toBeTruthy()
})

it('con permiso, la cámara también lleva al recorte', async () => {
  launchCameraMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'selfie.jpg', width: 900, height: 900 }],
  })
  renderScreen()

  fireEvent.press(screen.getByTestId('avatar-picker-camera'))
  await waitFor(() => expect(screen.getByTestId('avatar-picker-cropping')).toBeTruthy())
  expect(launchCameraMock).toHaveBeenCalled()
})

it('cancelar el selector deja la pantalla como estaba', async () => {
  launchGalleryMock.mockResolvedValue({ canceled: true, assets: [] })
  renderScreen()

  fireEvent.press(screen.getByTestId('avatar-picker-gallery'))
  await waitFor(() => expect(launchGalleryMock).toHaveBeenCalled())
  expect(screen.getByTestId('avatar-picker-choose')).toBeTruthy()
})

it('con foto elegida: recorte con esqueleto hasta que la imagen carga, "Usar esta foto" deshabilitado sin recorte', async () => {
  launchGalleryMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'foto.jpg', width: 1200, height: 800 }],
  })
  renderScreen()

  fireEvent.press(screen.getByTestId('avatar-picker-gallery'))
  await waitFor(() => expect(screen.getByTestId('avatar-picker-cropping')).toBeTruthy())
  expect(
    screen.getByTestId('avatar-picker-confirm').props.accessibilityState.disabled,
  ).toBe(true)

  finishImageLoad()
  // La imagen ya cargó, pero todavía no hay recorte reportado hasta el
  // primer gesto o botón de zoom — sigue deshabilitado.
  expect(
    screen.getByTestId('avatar-picker-confirm').props.accessibilityState.disabled,
  ).toBe(true)

  fireEvent.press(screen.getByTestId('avatar-cropper-center'))
  expect(
    screen.getByTestId('avatar-picker-confirm').props.accessibilityState.disabled,
  ).toBe(false)
})

it('confirmar sube la foto y muestra el éxito', async () => {
  launchGalleryMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'foto.jpg', width: 1200, height: 800 }],
  })
  renderScreen()

  fireEvent.press(screen.getByTestId('avatar-picker-gallery'))
  await waitFor(() => expect(screen.getByTestId('avatar-picker-cropping')).toBeTruthy())
  finishImageLoad()
  fireEvent.press(screen.getByTestId('avatar-cropper-center'))
  fireEvent.press(screen.getByTestId('avatar-picker-confirm'))

  await waitFor(() => expect(uploadMock).toHaveBeenCalled())
  await waitFor(() => expect(screen.getByTestId('avatar-picker-toast')).toBeTruthy())
  expect(screen.getByText('Listo, cambiamos tu foto')).toBeTruthy()
})

it('si falla la subida: muestra el error y no pierde el recorte ya hecho', async () => {
  launchGalleryMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'foto.jpg', width: 1200, height: 800 }],
  })
  uploadMock.mockRejectedValue(new Error('sin red'))
  renderScreen()

  fireEvent.press(screen.getByTestId('avatar-picker-gallery'))
  await waitFor(() => expect(screen.getByTestId('avatar-picker-cropping')).toBeTruthy())
  finishImageLoad()
  fireEvent.press(screen.getByTestId('avatar-cropper-center'))
  fireEvent.press(screen.getByTestId('avatar-picker-confirm'))

  await waitFor(() => expect(screen.getByTestId('avatar-picker-upload-error')).toBeTruthy())
  // El recorte sigue ahí: el botón vuelve a estar habilitado para reintentar,
  // no hay que recortar de nuevo desde cero.
  expect(
    screen.getByTestId('avatar-picker-confirm').props.accessibilityState.disabled,
  ).toBe(false)
})

it('cuando esta persona también tiene perfil de artista, sube la foto sincronizada a las dos', async () => {
  fetchOwnedProfessionalMock.mockResolvedValue({
    id: 'pro-1',
    slug: 'x',
    displayName: 'X',
    isPublished: true,
    studioCoordinates: null,
    styleSlugs: [],
    bio: null,
    hasAvatar: false,
  })
  launchGalleryMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'foto.jpg', width: 1200, height: 800 }],
  })
  renderScreen()

  fireEvent.press(screen.getByTestId('avatar-picker-gallery'))
  await waitFor(() => expect(screen.getByTestId('avatar-picker-cropping')).toBeTruthy())
  finishImageLoad()
  fireEvent.press(screen.getByTestId('avatar-cropper-center'))
  fireEvent.press(screen.getByTestId('avatar-picker-confirm'))

  await waitFor(() =>
    expect(uploadMock).toHaveBeenCalledWith(
      'u1',
      'foto.jpg',
      expect.anything(),
      { professionalId: 'pro-1' },
    ),
  )
})
