import { ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { StatusBadge } from '../components/StatusBadge'
import { useActivities } from '../hooks/useActivities'
import { exportCalendarActivitiesExcel } from '../services/exportCalendarExcel'
import type { Activity, ActivityStatus } from '../types'

const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const statuses: ActivityStatus[] = ['PROGRAMADA', 'DESARROLLADA', 'REPROGRAMADA', 'CANCELADA']

export function CalendarPage({ onSelect, focusDate }: { onSelect: (a: Activity) => void; focusDate?: string | null }) {
  const { activities, archiveMonthlyPlan } = useActivities()
  const [cursor, setCursor] = useState(() => {
    const date = focusDate ? new Date(`${focusDate}T12:00:00`) : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [exporting, setExporting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [archiveMessage, setArchiveMessage] = useState('')
  const [archiveError, setArchiveError] = useState('')

  useEffect(() => {
    if (focusDate) {
      const date = new Date(`${focusDate}T12:00:00`)
      setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }, [focusDate])

  const days = useMemo(() => {
    const first = (cursor.getDay() + 6) % 7
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    return [...Array(first).fill(null), ...Array.from({ length: last }, (_, index) => index + 1)]
  }, [cursor])
  const title = new Intl.DateTimeFormat('es-NI', { month: 'long', year: 'numeric' }).format(cursor)
  const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
  const plannedCount = activities.filter(activity =>
    activity.date.startsWith(`${monthKey}-`)
      && (activity.status === 'PROGRAMADA' || activity.status === 'REPROGRAMADA')
      && !activity.report
      && !activity.isArchived,
  ).length

  function move(delta: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1))
    setArchiveMessage('')
    setArchiveError('')
  }

  async function download() {
    setExporting(true)
    try {
      await exportCalendarActivitiesExcel(activities, monthKey)
    } finally {
      setExporting(false)
    }
  }

  async function clearPlan() {
    if (!plannedCount || archiving) return
    const confirmed = window.confirm(
      `¿Borrar el plan de ${title}? Se quitarán ${plannedCount} capacitaciones programadas o reprogramadas de este mes. Las desarrolladas, canceladas o con reporte se conservarán. Después podrás cargar la versión actualizada desde Plan mensual.`,
    )
    if (!confirmed) return

    setArchiveError('')
    setArchiveMessage('')
    setArchiving(true)
    try {
      const archived = await archiveMonthlyPlan(monthKey)
      setArchiveMessage(
        archived
          ? `${archived} capacitaciones de ${title} se quitaron del calendario. Ya podés cargar el plan actualizado desde Plan mensual.`
          : 'No hay capacitaciones programadas para borrar en este mes.',
      )
    } catch (reason) {
      setArchiveError(reason instanceof Error ? reason.message : 'No se pudo borrar el plan. Intentá nuevamente.')
    } finally {
      setArchiving(false)
    }
  }

  return <>
    <header className="page-header calendar-heading">
      <div>
        <p>Vista mensual</p>
        <h1 className="capitalize">{title}</h1>
        <span className="subtext">Descargá el Excel para que ChatGPT cree los eventos con bolita roja para DDT y verde para las demás instituciones.</span>
      </div>
      <div>
        <button className="button danger" disabled={!plannedCount || archiving} onClick={clearPlan} title={`Quitar del calendario las capacitaciones pendientes de ${title}`}>
          <Trash2 />{archiving ? 'Borrando…' : 'Borrar plan'}
        </button>
        <button className="button export" disabled={exporting} onClick={download}>
          <Download />{exporting ? 'Generando…' : 'Descargar calendario'}
        </button>
        <button className="icon-button" onClick={() => move(-1)} aria-label="Mes anterior"><ChevronLeft /></button>
        <button className="button ghost" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoy</button>
        <button className="icon-button" onClick={() => move(1)} aria-label="Mes siguiente"><ChevronRight /></button>
      </div>
    </header>

    {(archiveMessage || archiveError) && <p className={`calendar-sync-message ${archiveError ? 'error-message' : 'success-message'}`} role={archiveError ? 'alert' : 'status'}>
      {archiveError || archiveMessage}
    </p>}

    <div className="legend">{statuses.map(status => <StatusBadge key={status} status={status} />)}</div>
    <section className="calendar">
      <div className="weekday-row">{labels.map(label => <strong key={label}>{label}</strong>)}</div>
      <div className="calendar-grid">
        {days.map((day, index) => {
          const key = day ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
          const events = activities.filter(activity => activity.date === key)
          return <div className={`calendar-day ${day ? '' : 'blank'} ${focusDate === key ? 'focused-date' : ''}`} key={`${index}-${day ?? 'x'}`}>
            {day && <span>{day}</span>}
            {events.map(activity => <button key={activity.id} className={`calendar-event ${activity.status.toLowerCase()}`} onClick={() => onSelect(activity)} title={activity.originalDate ? `${activity.topic}. Fecha original: ${activity.originalDate}` : activity.topic}>
              <b>{activity.time} · {activity.topic}</b>
              {activity.originalDate && <small>Original: {activity.originalDate}</small>}
            </button>)}
          </div>
        })}
      </div>
    </section>
  </>
}

