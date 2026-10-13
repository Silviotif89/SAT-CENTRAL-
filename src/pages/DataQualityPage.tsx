import {AlertTriangle,CheckCircle2,Download,FileWarning,RotateCcw,ShieldCheck,Upload} from 'lucide-react'
import {useMemo,useRef,useState,type ChangeEvent} from 'react'
import {delegationName} from '../data/delegations'
import {useActivities} from '../hooks/useActivities'
import {currentMonthKey,toInputDate} from '../lib/activity'
import {activityQualityIssues,type QualityIssueType} from '../lib/dataQuality'
import {downloadLocalBackup,parseLocalBackup,restoreLocalBackup,type SatLocalBackup} from '../services/localBackup'
import type {Activity} from '../types'

const issueMeta:Record<QualityIssueType,{label:string;help:string}>={
 ATTENDANCE:{label:'Asistencia',help:'Desarrolladas con asistencia incompleta o cuyo total no coincide.'},
 OVERDUE:{label:'Pendientes',help:'Programadas o reprogramadas cuya fecha ya pasó.'},
 MISSING:{label:'Datos faltantes',help:'Registros que no tienen uno o más campos obligatorios.'},
 DUPLICATE:{label:'Duplicados',help:'Registros de la misma delegación y fecha con tema, hora, municipio o lugar iguales o muy similares.'},
 MULTIDATE:{label:'Varias fechas',help:'Actividades cuya fecha principal no coincide con la primera fecha indicada en observaciones.'},
}

export function DataQualityPage({onSelect}:{onSelect:(activity:Activity)=>void}){
 const {activities}=useActivities(),fileInput=useRef<HTMLInputElement>(null)
 const [month,setMonth]=useState(currentMonthKey()),[type,setType]=useState<QualityIssueType|'ALL'>('ALL'),[candidate,setCandidate]=useState<SatLocalBackup|null>(null),[message,setMessage]=useState(''),[error,setError]=useState('')
 const scoped=useMemo(()=>activities.filter(activity=>!month||activity.date.startsWith(month)),[activities,month])
 const issues=useMemo(()=>activityQualityIssues(scoped,toInputDate(new Date())),[scoped])
 const visible=type==='ALL'?issues:issues.filter(issue=>issue.type===type)
 const count=(issueType:QualityIssueType)=>issues.filter(issue=>issue.type===issueType).length
 const chooseFile=async(event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value='';setCandidate(null);setMessage('');setError('');if(!file)return;try{const backup=parseLocalBackup(await file.text());setCandidate(backup);setMessage(`Respaldo válido: ${backup.data.activities.length} actividades, ${backup.data.dailyTasks.length} pendientes de agenda y ${Object.keys(backup.data.transportDrafts).length} borradores de transporte.`)}catch(reason){setError(reason instanceof Error?reason.message:'No se pudo leer el respaldo.')}}
 const restore=()=>{if(!candidate)return;if(!window.confirm('¿Restaurar este respaldo? Primero se descargará automáticamente una copia de los datos actuales.'))return;restoreLocalBackup(candidate);window.location.reload()}
 return <>
  <header className="page-header"><div><p>Protección y revisión local</p><h1>Calidad y respaldo</h1><span className="subtext">Protegé la información guardada en este equipo y corregí registros antes de consolidar resultados.</span></div></header>
  <section className="backup-panel panel">
   <div className="backup-copy"><ShieldCheck/><div><span>Seguridad de los datos locales</span><h2>Respaldo y restauración</h2><p>La copia incluye actividades, agenda diaria y borradores de transporte. No contiene contraseñas.</p></div></div>
   <div className="backup-actions"><button className="button export" onClick={()=>{downloadLocalBackup();setMessage('Se descargó una copia de seguridad de los datos actuales.');setError('')}}><Download/>Descargar respaldo</button><button className="button ghost" onClick={()=>fileInput.current?.click()}><Upload/>Revisar respaldo</button><input ref={fileInput} className="visually-hidden" type="file" accept=".json,application/json" onChange={chooseFile}/>{candidate&&<button className="button warning" onClick={restore}><RotateCcw/>Restaurar datos</button>}</div>
   {message&&<div className="backup-message success-message" role="status"><CheckCircle2/>{message}</div>}{error&&<div className="backup-message error-message" role="alert"><AlertTriangle/>{error}</div>}
  </section>
  <section className="quality-toolbar"><div><span>Período revisado</span><input aria-label="Mes de calidad" type="month" value={month} onChange={event=>setMonth(event.target.value)}/><button className="button ghost compact" onClick={()=>setMonth('')}>Toda la base</button></div><strong>{issues.length} alertas en {scoped.length} actividades</strong></section>
  <section className="quality-stats"><button className={type==='ALL'?'active':''} onClick={()=>setType('ALL')}><FileWarning/><span>Todas</span><strong>{issues.length}</strong></button>{(Object.keys(issueMeta) as QualityIssueType[]).map(issueType=><button key={issueType} className={type===issueType?'active':''} title={issueMeta[issueType].help} onClick={()=>setType(issueType)}><span>{issueMeta[issueType].label}</span><strong>{count(issueType)}</strong></button>)}</section>
  {visible.length?<section className="quality-list">{visible.map((issue,index)=><button key={`${issue.activity.id}-${issue.type}-${index}`} onClick={()=>onSelect(issue.activity)}><span className={`quality-tag ${issue.type.toLowerCase()}`}>{issueMeta[issue.type].label}</span><div><strong>{issue.activity.topic||'Actividad sin tema'}</strong><span>{delegationName(issue.activity.delegationId)} · {issue.activity.date}</span><p>{issue.detail}</p></div></button>)}</section>:<div className="empty-state quality-empty"><CheckCircle2/><strong>No se encontraron alertas en el período.</strong><span>Los registros revisados cumplen las reglas básicas de calidad del SAT.</span></div>}
 </>
}
