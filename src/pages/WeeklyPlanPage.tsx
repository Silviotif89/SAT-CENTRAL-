import {AlertCircle,CalendarCheck2,CalendarDays,CheckCircle2,ChevronDown,ChevronLeft,ChevronRight,ChevronUp,Download,FileCheck2,ImageDown} from 'lucide-react'
import {useMemo,useState} from 'react'
import {WeeklyPlanReviewModal} from '../components/WeeklyPlanReviewModal'
import {delegationName,delegations} from '../data/delegations'
import {useActivities} from '../hooks/useActivities'
import {inDateRange,toInputDate,weeklyPlanRange,weekRange} from '../lib/activity'
import {planReviewComplete,planReviewStatus,weeklyPlanMissingFields} from '../lib/weeklyPlanReview'
import {exportWeeklyPlanImage} from '../services/exportWeeklyPlanImage'
import {exportWeeklyPlanWord} from '../services/exportWeeklyPlanWord'
import type {Activity,PlanReviewStatus} from '../types'

const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const parseDate=(value:string)=>new Date(`${value}T12:00:00`)
const fullDate=(value:string)=>{const d=parseDate(value);return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`}
const shortDate=(value:string)=>{const d=parseDate(value);return `${d.getDate()} ${(months[d.getMonth()]??'').slice(0,3)}`}
const weekDays=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const reviewOrder:PlanReviewStatus[]=['CONFIRMADA','REPROGRAMADA','PENDIENTE','CANCELADA']
const monthTitle=(date:Date)=>new Intl.DateTimeFormat('es-NI',{month:'long',year:'numeric'}).format(date)
const statusText:Record<PlanReviewStatus,string>={PENDIENTE:'Pendiente de comprobar',CONFIRMADA:'Confirmada',REPROGRAMADA:'Reprogramada',CANCELADA:'Cancelada'}

export function WeeklyPlanPage(){
 const {activities}=useActivities()
 const [week,setWeek]=useState(()=>weekRange(toInputDate(new Date())).start),[delegation,setDelegation]=useState(''),[reviewVisible,setReviewVisible]=useState(false),[selected,setSelected]=useState<Activity|null>(null),[exportingWord,setExportingWord]=useState(false),[exportingImage,setExportingImage]=useState(false),[exportError,setExportError]=useState('')
 const [calendarOpen,setCalendarOpen]=useState(false),[calendarMonth,setCalendarMonth]=useState(()=>{const today=new Date();return new Date(today.getFullYear(),today.getMonth(),1)})
 const range=weeklyPlanRange(week)
 const calendarDays=useMemo(()=>{const offset=(calendarMonth.getDay()+6)%7,last=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate();return [...Array<number|null>(offset).fill(null),...Array.from({length:last},(_,index)=>index+1)]},[calendarMonth])
 const items=useMemo(()=>activities.filter(a=>inDateRange(a,range.start,range.end)&&(!delegation||a.delegationId===delegation)).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),[activities,range.start,range.end,delegation])
 const itemsByReviewStatus=useMemo(()=>reviewOrder.map(status=>({status,items:items.filter(activity=>planReviewStatus(activity)===status)})).filter(group=>group.items.length>0),[items])
 const reviewed=items.filter(planReviewComplete).length,pending=items.length-reviewed,wordItems=items.filter(a=>planReviewStatus(a)!=='CANCELADA'),ready=items.length>0&&pending===0&&wordItems.length>0
 const generateWord=async()=>{setExportingWord(true);setExportError('');try{await exportWeeklyPlanWord(wordItems,range)}catch(error){setExportError(error instanceof Error?error.message:'No se pudo generar el plan Word.')}finally{setExportingWord(false)}}
 const generateImage=async()=>{setExportingImage(true);setExportError('');try{await exportWeeklyPlanImage(wordItems,range)}catch(error){setExportError(error instanceof Error?error.message:'No se pudo generar la imagen del plan.')}finally{setExportingImage(false)}}
 const selectDate=(value:string)=>{const monday=weekRange(value).start;setWeek(monday);const date=parseDate(monday);setCalendarMonth(new Date(date.getFullYear(),date.getMonth(),1));setCalendarOpen(false);setExportError('')}
 const changeWeek=(days:number)=>{const date=parseDate(week);date.setDate(date.getDate()+days);selectDate(toInputDate(date))}
 const openCalendar=()=>{const date=parseDate(week);setCalendarMonth(new Date(date.getFullYear(),date.getMonth(),1));setCalendarOpen(current=>!current)}
 return <>
  <header className="page-header"><div><p>Planificación y comprobación</p><h1>Plan semanal</h1><span className="subtext">Seleccioná una semana, comprobá cada actividad y descargá el Word o la imagen institucional.</span></div><div className="header-actions"><span className={`preview-badge ${ready?'ready':''}`}>{ready?'Plan comprobado':'Comprobación pendiente'}</span><button className="button export" disabled={!ready||exportingWord||exportingImage} onClick={generateWord}><Download/> {exportingWord?'Generando Word…':'Generar Word'}</button><button className="button image-export" disabled={!ready||exportingWord||exportingImage} onClick={generateImage}><ImageDown/> {exportingImage?'Generando imagen…':'Descargar imagen'}</button></div></header>

  <section className="week-range-panel">
   <div className="week-range-icon"><CalendarCheck2/></div>
   <div className="week-range-copy"><span>Semana de trabajo</span><strong>Lunes {fullDate(range.start)}</strong><b>al</b><strong>Domingo {fullDate(range.end)}</strong></div>
   <div className="week-range-days"><span><b>{shortDate(range.start)}</b>Lunes</span><i/><span><b>{shortDate(range.end)}</b>Domingo</span></div>
  </section>

  <section className="filters compact-filters weekly-plan-filters"><div className="week-field"><span>Lunes de la semana</span><div className="week-date-control"><button type="button" className="week-step" aria-label="Semana anterior" title="Semana anterior" onClick={()=>changeWeek(-7)}><ChevronLeft/></button><div className="week-picker-wrap"><button type="button" className="week-date-display" aria-haspopup="dialog" aria-expanded={calendarOpen} onClick={openCalendar}><span>{fullDate(range.start)}</span><CalendarDays/></button>{calendarOpen&&<div className="week-calendar" role="dialog" aria-label="Seleccionar semana"><header><button type="button" aria-label="Mes anterior" onClick={()=>setCalendarMonth(current=>new Date(current.getFullYear(),current.getMonth()-1,1))}><ChevronLeft/></button><strong className="capitalize">{monthTitle(calendarMonth)}</strong><button type="button" aria-label="Mes siguiente" onClick={()=>setCalendarMonth(current=>new Date(current.getFullYear(),current.getMonth()+1,1))}><ChevronRight/></button></header><div className="week-calendar-labels">{weekDays.map(day=><span key={day}>{day}</span>)}</div><div className="week-calendar-grid">{calendarDays.map((day,index)=>{if(!day)return <span key={`blank-${index}`}/>;const value=toInputDate(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),day));const inWeek=value>=range.start&&value<=range.end;const isMonday=value===range.start;return <button type="button" key={value} className={`${isMonday?'selected ':''}${inWeek?'in-week':''}`} aria-label={`${fullDate(value)}; semana desde el lunes ${fullDate(weekRange(value).start)}`} aria-pressed={isMonday} onClick={()=>selectDate(value)}>{day}</button>})}</div><footer><button type="button" onClick={()=>selectDate(toInputDate(new Date()))}>Semana actual</button><span>Al elegir un día, se selecciona su lunes</span></footer></div>}</div><button type="button" className="week-step" aria-label="Semana siguiente" title="Semana siguiente" onClick={()=>changeWeek(7)}><ChevronRight/></button></div></div><label>Delegación<select value={delegation} onChange={e=>{setDelegation(e.target.value);setExportError('')}}><option value="">Todas</option>{delegations.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><button className="button primary check-plan-button" onClick={()=>setReviewVisible(current=>!current)}><FileCheck2/> Comprobar plan semanal {reviewVisible?<ChevronUp/>:<ChevronDown/>}</button></section>

  <section className="plan-review-summary">
   <article><span>Actividades del período</span><strong>{items.length}</strong></article><article className="reviewed"><span>Comprobadas</span><strong>{reviewed}</strong></article><article className={pending?'pending':'reviewed'}><span>Pendientes</span><strong>{pending}</strong></article><div className="review-progress"><span style={{width:`${items.length?Math.round(reviewed/items.length*100):0}%`}}/><p>{items.length?`${reviewed} de ${items.length} actividades comprobadas`:'No hay actividades en esta semana'}</p></div>
  </section>

  {reviewVisible&&<section className="weekly-checklist" aria-label="Comprobación del plan semanal">
   <div className="panel-title"><div><p>Revisión previa al Word</p><h2>Comprobar actividades</h2></div><span>Hacé clic en cada actividad para revisar o completar sus datos.</span></div>
   {items.length===0?<div className="empty-state"><AlertCircle/><strong>No hay actividades en el rango seleccionado.</strong><span>Elegí otra semana o registrá una nueva actividad.</span></div>:<div className="weekly-review-list">{itemsByReviewStatus.map(group=><section className={`weekly-review-group ${group.status.toLowerCase()}`} key={group.status}><header><span>{statusText[group.status]}</span><strong>{group.items.length} {group.items.length===1?'actividad':'actividades'}</strong></header>{group.items.map(activity=>{const status=planReviewStatus(activity),missing=weeklyPlanMissingFields(activity);return <button key={activity.id} className={`weekly-review-row ${status.toLowerCase()}`} onClick={()=>setSelected(activity)}>
    <span className={`review-status ${status.toLowerCase()}`}>{status==='PENDIENTE'?<AlertCircle/>:<CheckCircle2/>}{statusText[status]}</span>
    <span className="review-activity"><strong>{activity.topic}</strong><small>{delegationName(activity.delegationId)} · {activity.date} · {activity.time}</small></span>
    <span className="review-data">{missing.length?<><b>{missing.length} {missing.length===1?'dato faltante':'datos faltantes'}</b><small>{missing.slice(0,2).join(' · ')}</small></>:<><b>Datos completos</b><small>Lista para confirmar</small></>}</span>
    <span className="review-open">Revisar</span>
   </button>})}</section>)}</div>}
  </section>}

  {!reviewVisible&&<div className="format-note"><strong>Comprobá el plan antes de generar el Word</strong><p>El sistema guardará cada actividad como confirmada, reprogramada o cancelada. El Word se habilita cuando no queden actividades pendientes de comprobar; las canceladas no se incluirán.</p></div>}
  {exportError&&<div className="format-note error-note" role="alert"><strong>No se pudo generar el archivo</strong><p>{exportError}</p></div>}
  {!ready&&items.length>0&&pending===0&&wordItems.length===0&&<div className="format-note error-note"><strong>No hay actividades para incluir</strong><p>Todas las actividades de esta semana están canceladas.</p></div>}
  {selected&&<WeeklyPlanReviewModal key={`${selected.id}-${selected.updatedAt}`} activity={selected} onClose={()=>setSelected(null)}/>} 
 </>
}
