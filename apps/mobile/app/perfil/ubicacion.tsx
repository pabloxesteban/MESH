import { useLocalSearchParams, router } from 'expo-router'
import { useState } from 'react'

import { resolveLocationId } from '@/features/account/queries.ts'
import { useEditLocationStore } from '@/features/account/editLocationStore.ts'
import { readDeviceGps } from '@/features/artist/gps.ts'
import { SearchLocationScreen } from '@/features/location/SearchLocationScreen.tsx'
import type { DeviceLocationStatus } from '@/features/location/useDeviceLocation.ts'
import type { SearchLocation } from '@/features/location/useSearchLocation.ts'

/**
 * "Dónde vivís", elegido desde el header de Perfil en edición.
 *
 * Ruta propia y no una hoja verdadera, por el mismo motivo que `/ubicacion`:
 * cincuenta y ocho opciones con buscador es una pantalla. Distinta de
 * `/ubicacion` en lo que importa — esa escribe la preferencia de DISPOSITIVO
 * (`useSearchLocation`, D-012); esta escribe `profiles.city_location_id`, que
 * es un dato de la cuenta y viaja con ella. Confundirlas sería justo el error
 * que ADR-030 marca explícitamente que no hay que cometer.
 *
 * El valor elegido vuelve a Perfil por `useEditLocationStore`, no por route
 * params: expo-router no tiene forma de devolver un valor a quien empujó esta
 * ruta.
 */
export default function PerfilUbicacionRoute() {
  const params = useLocalSearchParams<{ slug?: string }>()
  const setPending = useEditLocationStore((state) => state.setPending)

  const [value, setValue] = useState<SearchLocation>(
    params.slug != null && params.slug !== ''
      ? { mode: 'neighborhood', neighborhoodSlug: params.slug }
      : { mode: 'none', neighborhoodSlug: null },
  )
  const [deviceStatus, setDeviceStatus] =
    useState<DeviceLocationStatus>('unrequested')

  async function apply(next: SearchLocation): Promise<void> {
    setValue(next)

    if (next.mode === 'none') {
      setPending({ locationId: null, slug: null })
      return
    }
    if (next.mode === 'neighborhood' && next.neighborhoodSlug != null) {
      const locationId = await resolveLocationId(next.neighborhoodSlug)
      setPending({ locationId, slug: next.neighborhoodSlug })
    }
    // `device` sin barrio resuelto todavía: `onRequestDevice` es quien
    // completa el pending cuando el GPS responde.
  }

  return (
    <SearchLocationScreen
      value={value}
      onChange={(next) => void apply(next)}
      onClose={() => router.back()}
      deviceStatus={deviceStatus}
      onRequestDevice={() => {
        void (async () => {
          const reading = await readDeviceGps()
          if (!reading.granted) {
            setDeviceStatus('denied')
            return
          }
          setDeviceStatus('granted')
          if (reading.neighborhoodSlug != null) {
            const locationId = await resolveLocationId(reading.neighborhoodSlug)
            setPending({ locationId, slug: reading.neighborhoodSlug })
          }
        })()
      }}
    />
  )
}
