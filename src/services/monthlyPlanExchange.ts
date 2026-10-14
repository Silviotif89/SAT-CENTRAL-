import { delegations } from '../data/delegations'
import type { Activity, NewActivity } from '../types'

const EXCHANGE_FORMAT = 'sat-intur-monthly-plan'

type RecordValue = Record<string, unknown>
export interface MonthlyPlanImport { period: string; activities: NewActivity[] }

const isRecord = (value: unknown): value is RecordValue => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('es-NI')
const number = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0

export function importFingerprint(activity: Pick<Activity, 'delegationId' | 'date' | 'topic'>) {
  return `${activity.delegationId}|${activity.date}|${normalize(activity.topic)}`
}

export function parseMonthlyPlanExchange(content: string): MonthlyPlanImport {
  let raw: unknown
  try { raw = JSON.parse(content) } catch { throw new Error('El archivo no contiene un JSON válido.') }
  if (!isRecord(raw) || raw.format !== EXCHANGE_FORMAT || raw.version !== 1 || !Array.isArray(raw.activities)) throw new Error('El archivo no fue generado por SAT Plan Capacitaciones.')
  const period = text(raw.period)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('El archivo no indica un mes válido.')
  const result: NewActivity[] = raw.activities.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`La capacitación ${index + 1} no tiene un formato válido.`)
    const delegation = delegations.find(item => normalize(item.name) === normalize(text(entry.delegation)))
    const topic = text(entry.topic), date = text(entry.date)
    if (!delegation || !topic || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !date.startsWith(period)) throw new Error(`La capacitación ${index + 1} tiene delegación, tema o fecha inválidos.`)
    return {
      delegationId: delegation.id, topic, activityType: text(entry.activityType) || 'Capacitación', date, time: text(entry.time), municipality: text(entry.municipality), location: text(entry.location),
      responsible: text(entry.responsible), institution: text(entry.institution), modality: text(entry.modality) || 'Presencial', trainingProvider: text(entry.trainingProvider),
      ddtFacilitator: text(entry.ddtFacilitator), projectedParticipants: number(entry.projectedParticipants), observations: text(entry.observations),
    }
  })
  if (!result.length) throw new Error('El archivo no contiene capacitaciones enviadas.')
  return { period, activities: result }
}
