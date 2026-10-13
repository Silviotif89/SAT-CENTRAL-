import {CalendarCheck2,CalendarDays,CheckCircle2,ChevronLeft,ChevronRight,Download,ListChecks} from 'lucide-react'
import {useMemo,useState} from 'react'
import {WeeklyReportSelectionList} from '../components/WeeklyReportSelectionList'
import {delegations} from '../data/delegations'
import {useActivities} from '../hooks/useActivities'
import {inWorkWeek,toInputDate,wasRescheduled,weekRange} from '../lib/activity'
import {exportWeeklyReportWord} from '../services/exportWeeklyReportWord'
import type {Activity} from '../types'

const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const weekDays=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const parseDate=(value:string)=>new Date(`${value}T12:00:00`)
const fullDate=(value:string)=>{const date=parseDate(value);return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`}
const shortDate=(value:string)=>{const date=parseDate(value);return `${date.getDate()} ${(months[date.getMonth()]??'').slice(0,3)}`}
const monthTitle=(date:Date)=>new Intl.DateTimeFormat('es-NI',{month:'long',year:'numeric'}).format(date)

export function WeeklyReportPage({onSelect}:{onSelect:(activity:Activity)=>void}){
 const {activities,setWeeklyReportStatus}=useActivities()
 const [week,setWeek]=useState(()=>weekRange(toInputDate(new Date())).start),[delegation,setDelegation]=useState(''),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('')
 const [view,setView]=useState<'all'|'confirmed'>('all')
 const [calendarOpen,setCalendarOpen]=useState(false),[calendarMonth,setCalendarMonth]=useState(()=>{const today=new Date();return new Date(today.getFullYear(),today.getMonth(),1)})
 const range=weekRange(week)
 const calendarDays=useMemo(()=>{const offset=(calendarMonth.getDay()+6)%7,last=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate();return [...Array<number|null>(offset).fill(null),...Array.from({length:last},(_,index)=>index+1)]},[calendarMonth])
 const items=activities.filter(activity=>inWorkWeek(activity,range.start)&&(!delegation||activity.delegationId===delegation))
 const confirmedItems=items.filter(activity=>activity.status!=='CANCELADA'&&activity.weeklyReportStatus==='CONFIRMADA')
 const excludedCount=items.filter(activity=>activity.status==='CANCELADA'||activity.weeklyReportStatus==='EXCLUIDA').length
 const pendingDecisionCount=items.length-confirmedItems.length-excludedCount
 const visibleItems=view==='confirmed'?confirmedItems:items
 const sum=items.reduce((current,activity)=>{
  const valid=activity.status==='DESARROLLADA'&&activity.men!==null&&activity.women!==null&&activity.totalParticipants!==null&&activity.men+activity.women===activity.totalParticipants
  return {developed:current.developed+(valid?1:0),pending:current.pending+(activity.status==='PROGRAMADA'||(activity.status==='DESARROLLADA'&&!valid)?1:0),cancelled:current.cancelled+(activity.status==='CANCELADA'?1:0),rescheduled:current.rescheduled+(wasRescheduled(activity)?1:0),men:current.men+(valid?(activity.men??0):0),women:current.women+(valid?(activity.women??0):0)}
 },{developed:0,pending:0,cancelled:0,rescheduled:0,men:0,women:0})
 const metrics=[['Ejecutadas con reporte',sum.developed],['Pendientes de reporte',sum.pending],['No ejecutadas',sum.cancelled],['Reprogramadas',sum.rescheduled],['Hombres',sum.men],['Mujeres',sum.women],['Total protagonistas',sum.men+sum.women]]
 const selectDate=(value:string)=>{const monday=weekRange(value).start;setWeek(monday);const date=parseDate(monday);setCalendarMonth(new Date(date.getFullYear(),date.getMonth(),1));setCalendarOpen(false);setExportError('')}
 const changeWeek=(days:number)=>{const date=parseDate(week);date.setDate(date.getDate()+days);selectDate(toInputDate(date))}
 const openCalendar=()=>{const date=parseDate(week);setCalendarMonth(new Date(date.getFullYear(),date.getMonth(),1));setCalendarOpen(current=>!current)}
 const generate=async()=>{if(!confirmedItems.length){setExportError('Confirmá al menos una actividad antes de generar el informe.');return}setExporting(true);setExportError('');try{await exportWeeklyReportWord([...confirmedItems],range)}catch(error){setExportError(error instanceof Error?error.message:'No se pudo generar el informe Word.')}finally{setExporting(false)}}
 return <>
  <header className="page-header"><div><p>Resultados verificados</p><h1>Informe semanal</h1><span className="subtext">Confirmá qué actividades formarán parte del Word institucional.</span></div><div className="header-actions"><span className={`preview-badge ${confirmedItems.length&&pendingDecisionCount===0?'ready':''}`}>{confirmedItems.length} confirmadas · {pendingDecisionCount} pendientes</span><button className="button export" disabled={exporting||!confirmedItems.length} onClick={generate}><Download/> {exporting?'Generando Word…':'Descargar Word'}</button></div></header>

  <section className="week-range-panel weekly-report-range">
   <div className="week-range-icon"><CalendarCheck2/></div>
   <div className="week-range-copy"><span>Semana del informe</span><strong>Lunes {fullDate(range.start)}</strong><b>al</b><strong>Viernes {fullDate(range.end)}</strong></div>
   <div className="week-range-days"><span><b>{shortDate(range.start)}</b>Lunes</span><i/><span><b>{shortDate(range.end)}</b>Viernes</span></div>
  </section>

  <section className="filters compact-filters weekly-report-filters">
   <div className="week-field"><span>Lunes de la semana</span><div className="week-date-control"><button type="button" className="week-step" aria-label="Semana anterior" title="Semana anterior" onClick={()=>changeWeek(-7)}><ChevronLeft/></button><div className="week-picker-wrap"><button type="button" className="week-date-display" aria-haspopup="dialog" aria-expanded={calendarOpen} onClick={openCalendar}><span>{fullDate(range.start)}</span><CalendarDays/></button>{calendarOpen&&<div className="week-calendar" role="dialog" aria-label="Seleccionar semana del informe"><header><button type="button" aria-label="Mes anterior" onClick={()=>setCalendarMonth(current=>new Date(current.getFullYear(),current.getMonth()-1,1))}><ChevronLeft/></button><strong className="capitalize">{monthTitle(calendarMonth)}</strong><button type="button" aria-label="Mes siguiente" onClick={()=>setCalendarMonth(current=>new Date(current.getFullYear(),current.getMonth()+1,1))}><ChevronRight/></button></header><div className="week-calendar-labels">{weekDays.map(day=><span key={day}>{day}</span>)}</div><div className="week-calendar-grid">{calendarDays.map((day,index)=>{if(!day)return <span key={`blank-${index}`}/>;const value=toInputDate(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),day)),inWeek=value>=range.start&&value<=range.end,isMonday=value===range.start;return <button type="button" key={value} className={`${isMonday?'selected ':''}${inWeek?'in-week':''}`} aria-label={`${fullDate(value)}; informe desde el lunes ${fullDate(weekRange(value).start)}`} aria-pressed={isMonday} onClick={()=>selectDate(value)}>{day}</button>})}</div><footer><button type="button" onClick={()=>selectDate(toInputDate(new Date()))}>Semana actual</button><span>Al elegir un día, se selecciona su lunes</span></footer></div>}</div><button type="button" className="week-step" aria-label="Semana siguiente" title="Semana siguiente" onClick={()=>changeWeek(7)}><ChevronRight/></button></div></div>
   <label>Delegación<select value={delegation} onChange={event=>{setDelegation(event.target.value);setExportError('')}}><option value="">Todas</option>{delegations.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
  </section>

  <section className="report-summary weekly-report-summary">{metrics.map(([label,value],index)=><div className={index===0?'valid':index===1?'pending':index===2?'cancelled':''} key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</section>
  {exportError&&<div className="format-note error-note"><strong>No se pudo generar el archivo</strong><p>{exportError}</p></div>}
  <div className="format-note"><strong>Selección para el informe semanal</strong><p>El listado se ordena por resultado: desarrolladas con reporte, pendientes de reporte y canceladas. Las canceladas quedan automáticamente fuera del Word. “Eliminar del informe” excluye otros registros de este documento, pero no los borra del SAT.</p></div>
  <section className="weekly-report-view-controls">
   <div className="weekly-report-tabs" role="tablist" aria-label="Actividades del informe"><button type="button" role="tab" aria-selected={view==='all'} className={view==='all'?'active':''} onClick={()=>setView('all')}><ListChecks/> Totales <b>{items.length}</b></button><button type="button" role="tab" aria-selected={view==='confirmed'} className={view==='confirmed'?'active':''} onClick={()=>setView('confirmed')}><CheckCircle2/> A reportar en informe <b>{confirmedItems.length}</b></button></div>
   <div className="weekly-report-decision-summary"><span><i className="confirmed"/>{confirmedItems.length} confirmadas</span><span><i className="pending"/>{pendingDecisionCount} pendientes</span><span><i className="excluded"/>{excludedCount} fuera del informe</span></div>
  </section>
  <WeeklyReportSelectionList key={`${range.start}-${range.end}-${delegation}-${view}`} items={[...visibleItems].filter(activity=>activity.date>=range.start&&activity.date<=range.end).sort((first,second)=>first.date.localeCompare(second.date)||first.time.localeCompare(second.time))} onSelect={onSelect} onStatus={(id,status)=>{setWeeklyReportStatus(id,status);setExportError('')}}/>
 </>
}
