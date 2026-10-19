import { delegationName } from '../data/delegations'
import type { Activity } from '../types'

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'
const GOOGLE_CALENDAR_EVENTS = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const TIME_ZONE = 'America/Managua'
const GREEN_EVENT_COLOR = '10'
const RED_EVENT_COLOR = '11'

interface GoogleTokenResponse { access_token?: string; error?: string; error_description?: string }
interface GoogleTokenClient { requestAccessToken(config?: { prompt?: string }): void }
interface GoogleEvent { id?: string; extendedProperties?: { private?: Record<string, string> } }
interface GoogleEventList { items?: GoogleEvent[]; nextPageToken?: string }
interface GoogleIdentity {
  accounts: { oauth2: { initTokenClient(config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback?: (error: { type?: string }) => void
  }): GoogleTokenClient } }
}

declare global {
  interface Window { google?: GoogleIdentity }
}

export interface CalendarSyncResult { created: number; updated: number; removed: number; total: number }

let identityScriptPromise: Promise<void> | null = null

function loadGoogleIdentity() {
  if (window.google?.accounts.oauth2) return Promise.resolve()
  if (identityScriptPromise) return identityScriptPromise
  identityScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`)
    const script = existing ?? document.createElement('script')
    const loaded = () => window.google?.accounts.oauth2 ? resolve() : reject(new Error('Google no inició correctamente.'))
    script.addEventListener('load', loaded, { once: true })
    script.addEventListener('error', () => reject(new Error('No se pudo cargar el acceso seguro de Google.')), { once: true })
    if (!existing) { script.src = GOOGLE_IDENTITY_SCRIPT; script.async = true; script.defer = true; document.head.appendChild(script) }
  })
  return identityScriptPromise
}

export function prepareGoogleCalendar() {
  return loadGoogleIdentity().catch(() => undefined)
}

async function requestAccessToken(clientId: string) {
  await loadGoogleIdentity()
  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_SCOPE,
      callback: response => response.access_token
        ? resolve(response.access_token)
        : reject(new Error(response.error_description || response.error || 'Google no autorizó el acceso al calendario.')),
      error_callback: error => reject(new Error(error.type === 'popup_closed'
        ? 'Se cerró la ventana de Google antes de enlazar el calendario.'
        : 'No se pudo completar el acceso a Google Calendar.')),
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

async function googleRequest<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(detail?.error?.message || `Google Calendar respondió con el error ${response.status}.`)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

function isCentralTraining(activity: Activity) {
  const provider = `${activity.trainingProvider} ${activity.institution}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  return provider.includes('DDT') || provider.includes('INTUR CENTRAL') || provider.includes('NIVEL CENTRAL')
}

function facilitator(activity: Activity) {
  return isCentralTraining(activity)
    ? activity.ddtFacilitator || activity.responsible || 'Facilitador pendiente'
    : activity.responsible || activity.trainingProvider || 'Responsable pendiente'
}

function clockMinutes(hourText: string, minuteText: string | undefined, markerText: string) {
  let hour = Number(hourText)
  const marker = markerText.toLowerCase().replace(/[.\s]/g, '')
  if (marker === 'am' && hour === 12) hour = 0
  if ((marker === 'pm' || marker === 'md' || marker === 'm') && hour < 12) hour += 12
  return hour * 60 + Number(minuteText || 0)
}

function activityTimes(value: string) {
  const range = value.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*[-–a]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*\.?\s*$/i)
  if (range) {
    const [, startHour, startMinute, endHour, endMinute, period] = range
    if (!startHour || !endHour || !period) return null
    const marker = period.toLowerCase()
    const startMarker = marker === 'pm' && Number(endHour) === 12 && Number(startHour) < 12 ? 'am' : marker
    return {
      start: clockMinutes(startHour, startMinute, startMarker),
      end: clockMinutes(endHour, endMinute, marker),
    }
  }
  const matches = [...value.matchAll(/(\d{1,2})(?::(\d{2}))?\s*\.?\s*(a\s*\.?\s*m\.?|p\s*\.?\s*m\.?|m\s*\.?\s*d\.?|m\.?)(?![a-z])/gi)]
  const [first, second] = matches
  if (!first) return null
  const start = clockMinutes(first[1] ?? '0', first[2], first[3] ?? 'am')
  let end = second ? clockMinutes(second[1] ?? '0', second[2], second[3] ?? 'am') : start + 120
  if (end <= start) end += 12 * 60
  return { start, end }
}

function localDateTime(date: string, minutes: number) {
  const timestamp = new Date(`${date}T00:00:00Z`).getTime() + minutes * 60_000
  return `${new Date(timestamp).toISOString().slice(0, 19)}-06:00`
}

function nextDate(date: string) {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

function eventResource(activity: Activity, month: string) {
  const central = isCentralTraining(activity)
  const person = facilitator(activity)
  const times = activityTimes(activity.time)
  const timing = times
    ? { start: { dateTime: localDateTime(activity.date, times.start), timeZone: TIME_ZONE }, end: { dateTime: localDateTime(activity.date, times.end), timeZone: TIME_ZONE } }
    : { start: { date: activity.date }, end: { date: nextDate(activity.date) } }
  return {
    summary: `[${person}] ${activity.topic}`,
    location: [activity.location, activity.municipality].filter(Boolean).join(', '),
    description: [
      `Capacitación SAT · ${central ? 'DDT / INTUR Central' : 'Territorial'}`,
      `Delegación: ${delegationName(activity.delegationId)}`,
      `Imparte: ${activity.trainingProvider || 'Pendiente de definir'}`,
      `Facilitador o responsable: ${person}`,
      `Horario registrado: ${activity.time || 'Pendiente de confirmar'}`,
      `Estado: ${activity.status}`,
      activity.observations ? `Observaciones: ${activity.observations}` : '',
    ].filter(Boolean).join('\n'),
    colorId: central ? RED_EVENT_COLOR : GREEN_EVENT_COLOR,
    ...timing,
    extendedProperties: { private: { satSource: 'monthly-plan', satActivityId: activity.id, satMonth: month } },
  }
}

async function existingSatEvents(token: string) {
  const result: GoogleEvent[] = []
  let pageToken = ''
  do {
    const query = new URLSearchParams({ privateExtendedProperty: 'satSource=monthly-plan', maxResults: '2500', showDeleted: 'false' })
    if (pageToken) query.set('pageToken', pageToken)
    const page = await googleRequest<GoogleEventList>(token, `${GOOGLE_CALENDAR_EVENTS}?${query}`)
    result.push(...(page.items || []))
    pageToken = page.nextPageToken || ''
  } while (pageToken)
  return result
}

export async function syncGoogleCalendarMonth(activities: Activity[], month: string): Promise<CalendarSyncResult> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  if (!clientId) throw new Error('Falta configurar VITE_GOOGLE_CLIENT_ID para enlazar Google Calendar.')
  const selected = activities.filter(activity => activity.date.startsWith(month) && activity.status !== 'CANCELADA')
  const cancelledIds = new Set(activities.filter(activity => activity.date.startsWith(month) && activity.status === 'CANCELADA').map(activity => activity.id))
  const token = await requestAccessToken(clientId)
  const existing = await existingSatEvents(token)
  const byActivityId = new Map(existing.flatMap(event => {
    const activityId = event.extendedProperties?.private?.satActivityId
    return activityId && event.id ? [[activityId, event] as const] : []
  }))
  let created = 0; let updated = 0; let removed = 0
  for (const activity of selected) {
    const current = byActivityId.get(activity.id)
    const resource = eventResource(activity, month)
    if (current?.id) {
      await googleRequest(token, `${GOOGLE_CALENDAR_EVENTS}/${encodeURIComponent(current.id)}?sendUpdates=none`, { method: 'PATCH', body: JSON.stringify(resource) })
      updated += 1
    } else {
      await googleRequest(token, `${GOOGLE_CALENDAR_EVENTS}?sendUpdates=none`, { method: 'POST', body: JSON.stringify(resource) })
      created += 1
    }
  }
  for (const activityId of cancelledIds) {
    const current = byActivityId.get(activityId)
    if (current?.id) {
      await googleRequest(token, `${GOOGLE_CALENDAR_EVENTS}/${encodeURIComponent(current.id)}?sendUpdates=none`, { method: 'DELETE' })
      removed += 1
    }
  }
  return { created, updated, removed, total: selected.length }
}
