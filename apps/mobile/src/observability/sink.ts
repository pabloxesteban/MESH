/**
 * A dónde van los reportes de error.
 *
 * **Hoy no hay proveedor elegido, y por eso no hay ninguna dependencia nueva.**
 * `@sentry/react-native` es un módulo nativo: agregarlo obliga a un dev build y
 * saca a MESH de Expo Go, que es exactamente lo que ADR-009 eligió no hacer.
 * Ver ADR-026 para el costo exacto de esa decisión y cómo se revierte.
 *
 * Mientras tanto: un sumidero HTTP genérico, que sirve para cualquier cosa que
 * acepte un POST con JSON —una función propia, un webhook, un ingestor de
 * logs— y que **no existe hasta que alguien configura la URL**. Sin ella,
 * `httpSink()` devuelve `null` y el reportador ni siquiera encola.
 */

import type { ErrorReport, ErrorSink } from './report.ts'

/** Tope de lo que se manda de una. Un lote más grande no entra en un webhook. */
const MAX_BATCH = 50

/**
 * El sumidero configurado, o `null`.
 *
 * `EXPO_PUBLIC_` porque es una URL de destino, no un secreto — y si alguien
 * pusiera una clave ahí, terminaría en el bundle. Por eso solo se acepta
 * `https://`: un endpoint que necesita autenticación va detrás de una función
 * propia, no de un token en el cliente.
 */
export function httpSink(): ErrorSink | null {
  const url = (process.env['EXPO_PUBLIC_ERROR_SINK_URL'] ?? '').trim()
  if (!url.startsWith('https://')) return null

  return {
    name: 'http',
    send: async (reports: readonly ErrorReport[]) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reports: reports.slice(0, MAX_BATCH) }),
      })
      // Se lanza a propósito: `flushReports` lo toma como "no se envió" y deja
      // el buffer para el próximo ciclo. Tragarlo acá perdería los reportes en
      // silencio, que es la peor forma de perder un reporte de errores.
      if (!response.ok) throw new Error(`sink ${String(response.status)}`)
    },
  }
}
