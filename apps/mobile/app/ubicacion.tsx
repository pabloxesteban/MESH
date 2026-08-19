import { router } from 'expo-router'

import { SearchLocationScreen } from '@/features/location/SearchLocationScreen.tsx'
import { useDeviceLocation } from '@/features/location/useDeviceLocation.ts'
import { useSearchLocation } from '@/features/location/useSearchLocation.ts'

/**
 * Desde dónde mirar.
 *
 * Ruta propia y no una hoja: son cincuenta y ocho opciones con un buscador, y
 * eso es una pantalla. Se llega desde el encabezado de Inicio.
 */
export default function SearchLocationRoute() {
  const searchLocation = useSearchLocation()
  const device = useDeviceLocation()

  return (
    <SearchLocationScreen
      value={searchLocation.value}
      onChange={searchLocation.set}
      onClose={() => router.back()}
      deviceStatus={device.status}
      onRequestDevice={device.request}
    />
  )
}
