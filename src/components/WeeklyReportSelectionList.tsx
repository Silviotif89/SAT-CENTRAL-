import {Check,CheckCircle2,ClipboardCopy,Clock3,Eye,FileX2} from 'lucide-react'
import {useState} from 'react'
import {delegationName} from '../data/delegations'
import {wasRescheduled} from '../lib/activity'
import {createActivityWhatsAppText} from '../services/activityWhatsApp'
import type {Activity,WeeklyReportStatus} from '../types'
import {StatusBadge} from './StatusBadge'

type ReportGroup='reported'|'pending'|'cancelled'
const validAttendance=(activity:Activity)=>activity.status==='DESARROLLADA'&&activity.men!==null&&activity.women!==null&&activity.totalParticipants!==null&&activity.men+activity.women===activity.totalParticipants
const reportGroup=(activity:Activity):ReportGroup=>activity.status==='CANCELADA'?'cancelled':validAttendance(activity)?'reported':'pending'
const groupOrder:ReportGroup[]=['reported','pending','cancelled']
const groupTitle:Record<ReportGroup,string>={reported:'Desarrolladas y reportadas',pending:'Programadas o pendientes de reporte',cancelled:'Canceladas · fuera del informe'}
const reportStatus=(activity:Activity):WeeklyReportStatus=>activity.status==='CANCELADA'?'EXCLUIDA':activity.weeklyReportStatus??'PENDIENTE'

export function WeeklyReportSelectionList({items,onSelect,onStatus}:{items:Activity[];onSelect:(activity:Activity)=>void;onStatus:(id:string,status:WeeklyReportStatus)=>void}){
 const [copyStatus,setCopyStatus]=useState<{id:string;message:string;text?:string}|null>(null)
 const copyForWhatsApp=async(activity:Activity)=>{
  const text=createActivityWhatsAppText(activity)
  setCopyStatus(null)
  const fallbackCopy=()=>{const field=document.createElement('textarea');field.value=text;field.setAttribute('readonly','');field.style.position='fixed';field.style.left='-9999px';document.body.appendChild(field);field.select();const copied=document.execCommand('copy');field.remove();return copied}
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text)
   else if(!fallbackCopy())throw new Error('clipboard unavailable')
   setCopyStatus({id:activity.id,message:'Copiado. Ya podés pegarlo en WhatsApp.'})
  }catch{
   if(fallbackCopy())setCopyStatus({id:activity.id,message:'Copiado. Ya podés pegarlo en WhatsApp.'})
   else setCopyStatus({id:activity.id,message:'No se pudo copiar automáticamente. Seleccioná el texto para copiarlo.',text})
  }
 }
 if(!items.length)return <div className="empty-state"><FileX2/><strong>No hay actividades en esta vista.</strong><span>Consultá “Totales” para revisar todas las actividades de la semana.</span></div>
 const groups=groupOrder.map(group=>({group,items:items.filter(activity=>reportGroup(activity)===group)})).filter(({items:groupItems})=>groupItems.length)
 return <section className="weekly-report-selection">
  <div className="weekly-report-selection-header"><span>Actividad</span><span>Delegación</span><span>Fecha</span><span>Decisión para el Word</span></div>
  {groups.map(({group,items:groupItems})=><section className={`weekly-report-result-group ${group}`} key={group}><header><strong>{groupTitle[group]}</strong><span>{groupItems.length} {groupItems.length===1?'actividad':'actividades'}</span></header>{groupItems.map(activity=>{const selection=reportStatus(activity),rescheduled=wasRescheduled(activity),cancelled=activity.status==='CANCELADA';return <article className={`weekly-report-selection-row ${selection.toLocaleLowerCase('es')}`} key={activity.id}>
   <button type="button" className="weekly-report-open" onClick={()=>onSelect(activity)} aria-label={`Ver detalle de ${activity.topic}`}>
    <span className="weekly-report-activity"><strong>{activity.topic}</strong><small>{activity.municipality} · {activity.location}</small><StatusBadge status={activity.status}/></span>
    <span>{delegationName(activity.delegationId)}</span>
    <span className="weekly-report-date">{rescheduled&&activity.originalDate?<><small>Original: {activity.originalDate}</small><strong>Nueva: {activity.date}</strong></>:<><strong>{activity.date}</strong><small>{activity.time}</small></>}</span>
   </button>
   <div className="weekly-report-decision">
    <span className={`report-selection-status ${selection.toLocaleLowerCase('es')}`}>{selection==='CONFIRMADA'?<CheckCircle2/>:selection==='EXCLUIDA'?<FileX2/>:<Clock3/>}{selection==='CONFIRMADA'?'Confirmada':selection==='EXCLUIDA'?'Fuera del informe':'Pendiente de decidir'}</span>
    <div>
     {!cancelled&&<><button type="button" className={`report-decision-button confirm ${selection==='CONFIRMADA'?'active':''}`} aria-pressed={selection==='CONFIRMADA'} onClick={()=>onStatus(activity.id,'CONFIRMADA')}><CheckCircle2/> Confirmar</button>
     <button type="button" className={`report-decision-button exclude ${selection==='EXCLUIDA'?'active':''}`} aria-pressed={selection==='EXCLUIDA'} onClick={()=>onStatus(activity.id,'EXCLUIDA')}><FileX2/> Eliminar del informe</button>
     {selection!=='PENDIENTE'&&<button type="button" className="report-decision-button reset" onClick={()=>onStatus(activity.id,'PENDIENTE')}><Clock3/> Dejar pendiente</button>}</>}
     {group==='pending'&&!cancelled&&<button type="button" className="report-copy-button" aria-label={`Copiar datos de ${activity.topic} para WhatsApp`} onClick={()=>void copyForWhatsApp(activity)}>{copyStatus?.id===activity.id&&copyStatus.text===undefined?<><Check/> Copiado</>:<><ClipboardCopy/> Copiar</>}</button>}
     <button type="button" className="report-detail-button" onClick={()=>onSelect(activity)}><Eye/> Detalle</button>
    </div>
    {copyStatus?.id===activity.id&&<div className="report-copy-feedback" role="status" aria-live="polite"><span>{copyStatus.message}</span>{copyStatus.text&&<textarea aria-label={`Texto para WhatsApp: ${activity.topic}`} readOnly value={copyStatus.text} onFocus={event=>event.currentTarget.select()}/>}</div>}
   </div>
  </article>})}</section>)}
 </section>
}
