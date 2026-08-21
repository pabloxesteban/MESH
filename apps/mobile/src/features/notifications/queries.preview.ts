/**
 * La bandeja en el preview: dos avisos horneados, sin red.
 *
 * Uno de denuncia resuelta y uno de turno, que son los dos que hacen falta
 * mirar: el primero cierra el hueco que dejó ADR-023, y el segundo es el caso
 * normal.
 */

import type { Notification } from './queries.ts'

let bandeja: Notification[] = [
  {
    id: 'preview-notif-1',
    kind: 'report_reviewed',
    outcome: 'actioned',
    createdAt: '2026-08-21T10:00:00.000Z',
    read: false,
  },
  {
    id: 'preview-notif-2',
    kind: 'appointment_scheduled',
    outcome: null,
    createdAt: '2026-08-20T18:30:00.000Z',
    read: false,
  },
]

export async function fetchNotifications(): Promise<readonly Notification[]> {
  return bandeja
}

export async function markNotificationsRead(): Promise<void> {
  bandeja = bandeja.map((aviso) => ({ ...aviso, read: true }))
}

export async function dismissNotification(id: string): Promise<void> {
  bandeja = bandeja.filter((aviso) => aviso.id !== id)
}
