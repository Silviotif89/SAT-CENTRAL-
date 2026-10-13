import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Download, List, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { ActivityList } from '../components/ActivityList'
import { StatusBadge } from '../components/StatusBadge'
import { delegations } from '../data/delegations'
import { useActivities } from '../hooks/useActivities'
import { currentMonthKey } from '../lib/activity'
import { exportActivitiesExcel } from '../services/exportActivitiesExcel'
import { exportMonthlyReportExcel, monthlyReportedActivities } from '../services/exportMonthlyReportExcel'
import type { Activity } from '../types'

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function MonthlyPlanPage({ onSelect }: { onSelect: (a: Activity) => void }) {
  const { activities } = useActivities()
  const initialMonth = currentMonthKey()
  const [month, setMonth] = useState(initialMonth)
  const [pickerYear, setPickerYear] = useState(Number(initialMonth.slice(0, 4)))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [delegation, setDelegation] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const [yearText, monthText] = month.split('-')
  const monthIndex = Math.max(0, Math.min(11, Number(monthText) - 1))
  const monthName = monthNames[monthIndex] ?? 'Mes'
  const year = Number(yearText)
  const monthItems = activities.filter(a => a.date.startsWith(month) && a.status !== 'CANCELADA').sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  const items = monthItems.filter(a => (!delegation || a.delegationId === delegation) && (!fromDate || a.date >= fromDate) && (!toDate || a.date <= toDate))
  const reported = monthlyReportedActivities(activities, month)
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const calendarDays = Array.from({ length: Math.ceil((firstDay + lastDay) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1
    return day >= 1 && day <= lastDay ? day : null
  })
  const hasFilters = Boolean(delegation || fromDate || toDate)

  function selectMonth(index: number) {
    setMonth(`${pickerYear}-${String(index + 1).padStart(2, '0')}`)
    setPickerOpen(false)
    setFromDate('')
    setToDate('')
    setError('')
  }

  function moveMonth(delta: number) {
    const next = new Date(year, monthIndex + delta, 1)
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
    setPickerYear(next.getFullYear())
    setFromDate('')
    setToDate('')
    setError('')
  }

  async function downloadReport() {
    setError(''); setExporting(true)
    try { await exportMonthlyReportExcel(activities, month) }
    catch { setError('No se pudo descargar el informe mensual. Intenta nuevamente.') }
    finally { setExporting(false) }
  }

  return <>
    <header className="page-header">
      <div><p>Consolidado mensual</p><h1>Plan mensual</h1></div>
      <div className="monthly-export-actions">
        <button className="button export" disabled={!month} onClick={() => exportActivitiesExcel(activities, 'month', `${month}-01`, '', 'monthly-plan')}><Download /> Descargar Excel</button>
        <button className="button export" disabled={exporting || !reported.length} onClick={downloadReport}><Download /> {exporting ? 'Generando informe…' : 'Informe de gestión'}</button>
      </div>
    </header>

    <section className="monthly-controls" aria-label="Controles del plan mensual">
      <div className="monthly-period-row">
        <div className="report-month-field monthly-month-field">
          <span>Mes</span>
          <div className="monthly-month-control">
            <button type="button" className="monthly-step" onClick={() => moveMonth(-1)} aria-label="Mes anterior"><ChevronLeft /></button>
            <button type="button" className="report-month-trigger" aria-haspopup="dialog" aria-expanded={pickerOpen} onClick={() => { setPickerYear(year); setPickerOpen(open => !open) }}><CalendarRange /><strong>{monthName}</strong><small>{year}</small></button>
            <button type="button" className="monthly-step" onClick={() => moveMonth(1)} aria-label="Mes siguiente"><ChevronRight /></button>
          </div>
          {pickerOpen && <div className="report-month-popover" role="dialog" aria-label="Seleccionar mes" onKeyDown={event => { if (event.key === 'Escape') setPickerOpen(false) }}>
            <header><button type="button" aria-label="Año anterior" onClick={() => setPickerYear(value => value - 1)}><ChevronLeft /></button><strong>{pickerYear}</strong><button type="button" aria-label="Año siguiente" onClick={() => setPickerYear(value => value + 1)}><ChevronRight /></button></header>
            <div>{monthNames.map((name, index) => <button type="button" key={name} className={pickerYear === year && index === monthIndex ? 'selected' : ''} aria-current={pickerYear === year && index === monthIndex ? 'date' : undefined} onClick={() => selectMonth(index)}>{name}</button>)}</div>
          </div>}
        </div>
        <div className="monthly-view-switch" role="group" aria-label="Vista del plan mensual">
          <button type="button" className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}><List /> Lista</button>
          <button type="button" className={view === 'calendar' ? 'active' : ''} aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}><CalendarDays /> Calendario</button>
        </div>
      </div>
      <div className="monthly-filter-row">
        <label>Delegación<select value={delegation} onChange={event => setDelegation(event.target.value)}><option value="">Todas las delegaciones</option>{delegations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Desde<input type="date" value={fromDate} min={`${month}-01`} max={`${month}-${String(lastDay).padStart(2, '0')}`} onChange={event => setFromDate(event.target.value)} /></label>
        <label>Hasta<input type="date" value={toDate} min={`${month}-01`} max={`${month}-${String(lastDay).padStart(2, '0')}`} onChange={event => setToDate(event.target.value)} /></label>
        {hasFilters && <button type="button" className="monthly-clear" onClick={() => { setDelegation(''); setFromDate(''); setToDate('') }}><RotateCcw /> Limpiar filtros</button>}
      </div>
      <p className="monthly-count" aria-live="polite">{items.length} {items.length === 1 ? 'actividad visible' : 'actividades visibles'} en {monthName.toLowerCase()} de {year}{hasFilters ? ' con los filtros aplicados' : ''}.</p>
    </section>

    {error && <p role="alert">{error}</p>}
    <div className="format-note"><strong>Plan e informe de gestión mensual</strong><p>El botón Descargar Excel conserva las capacitaciones programadas, reprogramadas y desarrolladas del mes; solo excluye las canceladas. El botón Informe de gestión genera el formato institucional con el avance POA y la territorialización de las actividades reportadas con asistencia válida.</p><p>Informe de gestión: {reported.length ? `${reported.length} actividades reportadas con asistencia completa y validada para este mes.` : 'No hay actividades reportadas con asistencia completa y validada para este mes.'}</p></div>

    {view === 'list' ? <ActivityList items={items} onSelect={onSelect} /> : <section className="monthly-calendar" aria-label={`Calendario de ${monthName} de ${year}`}>
      <div className="monthly-calendar-weekdays">{weekdays.map(day => <strong key={day}>{day}</strong>)}</div>
      <div className="monthly-calendar-grid">{calendarDays.map((day, index) => {
        const date = day ? `${month}-${String(day).padStart(2, '0')}` : ''
        const dayItems = items.filter(activity => activity.date === date)
        return <div className={`monthly-calendar-day${day ? '' : ' blank'}`} key={`${index}-${day ?? 'empty'}`}>
          {day && <><span className="monthly-day-number">{day}</span><div className="monthly-day-events">{dayItems.map(activity => <button type="button" key={activity.id} onClick={() => onSelect(activity)} title={activity.topic}><span>{activity.time}</span><strong>{activity.topic}</strong><StatusBadge status={activity.status} /></button>)}</div></>}
        </div>
      })}</div>
      {!items.length && <p className="monthly-calendar-empty">No hay actividades para los filtros seleccionados.</p>}
    </section>}
  </>
}
