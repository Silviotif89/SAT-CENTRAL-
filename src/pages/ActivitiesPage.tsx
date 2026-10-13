import {Search} from 'lucide-react'
import {useMemo,useState} from 'react'
import {ActivityList} from '../components/ActivityList'
import {delegations} from '../data/delegations'
import {useActivities} from '../hooks/useActivities'
import {wasRescheduled} from '../lib/activity'
import type {Activity,ActivityStatus} from '../types'
import type {DashboardMetric} from './DashboardPage'

export interface DepartmentDrilldown {delegationId:string;start:string;end:string}

const metricMeta:Record<DashboardMetric,{title:string;status:ActivityStatus;unit:string}>={
 programmed:{title:'Actividades programadas',status:'PROGRAMADA',unit:'actividades'},
 developed:{title:'Actividades desarrolladas',status:'DESARROLLADA',unit:'actividades'},
 rescheduled:{title:'Actividades reprogramadas',status:'REPROGRAMADA',unit:'actividades'},
 cancelled:{title:'Actividades canceladas',status:'CANCELADA',unit:'actividades'},
 total:{title:'Total de protagonistas',status:'DESARROLLADA',unit:'protagonistas'},
 men:{title:'Hombres capacitados',status:'DESARROLLADA',unit:'hombres'},
 women:{title:'Mujeres capacitadas',status:'DESARROLLADA',unit:'mujeres'},
}

const completeAttendance=(activity:Activity)=>activity.status==='DESARROLLADA'&&activity.men!==null&&activity.women!==null&&activity.totalParticipants!==null&&activity.men+activity.women===activity.totalParticipants

export function ActivitiesPage({onSelect,drilldown,departmentDrilldown,onClearDrilldown}:{onSelect:(activity:Activity)=>void;drilldown:{metric:DashboardMetric;month:string}|null;departmentDrilldown:DepartmentDrilldown|null;onClearDrilldown:()=>void}){
 const {activities}=useActivities()
 const [search,setSearch]=useState(''),[delegation,setDelegation]=useState(''),[status,setStatus]=useState<ActivityStatus|''>(''),[month,setMonth]=useState('')
 const activeStatus=departmentDrilldown?'PROGRAMADA':drilldown&&drilldown.metric!=='rescheduled'?metricMeta[drilldown.metric].status:status,activeMonth=drilldown?.month??month,activeDelegation=departmentDrilldown?.delegationId??delegation
 const filtered=useMemo(()=>activities.filter(activity=>(!search||`${activity.topic} ${activity.location} ${activity.municipality}`.toLowerCase().includes(search.toLowerCase()))&&(!activeDelegation||activity.delegationId===activeDelegation)&&(!activeStatus||activity.status===activeStatus)&&(!activeMonth||activity.date.startsWith(activeMonth))&&(!departmentDrilldown||activity.date>=departmentDrilldown.start&&activity.date<=departmentDrilldown.end)&&(!drilldown||drilldown.metric!=='rescheduled'||wasRescheduled(activity))&&(!drilldown||!['developed','total','men','women'].includes(drilldown.metric)||completeAttendance(activity))).sort((a,b)=>a.date.localeCompare(b.date)||a.topic.localeCompare(b.topic)),[activities,search,activeDelegation,activeStatus,activeMonth,departmentDrilldown,drilldown])
 const metricValue=drilldown?filtered.reduce((sum,activity)=>sum+(drilldown.metric==='total'?(activity.totalParticipants??0):drilldown.metric==='men'?(activity.men??0):drilldown.metric==='women'?(activity.women??0):1),0):filtered.length
 const departmentTitle=departmentDrilldown?delegations.find(item=>item.id===departmentDrilldown.delegationId)?.name:''
 const changeDelegation=(value:string)=>{onClearDrilldown();setDelegation(value)}
 const changeStatus=(value:ActivityStatus|'')=>{onClearDrilldown();setStatus(value)}
 const changeMonth=(value:string)=>{onClearDrilldown();setMonth(value)}
 return <>
  <header className="page-header"><div><p>{departmentDrilldown?'Programación territorial':drilldown?'Desglose del tablero':'Gestión de registros'}</p><h1>{departmentDrilldown?`Programadas · ${departmentTitle}`:drilldown?metricMeta[drilldown.metric].title:'Actividades'}</h1><span className="subtext">{departmentDrilldown?`${filtered.length} actividades · del ${departmentDrilldown.start} al ${departmentDrilldown.end}`:drilldown?`${metricValue} ${metricMeta[drilldown.metric].unit} · ${filtered.length} registros que componen el cuadro`:`${filtered.length} resultados`}</span></div>{(drilldown||departmentDrilldown)&&<button className="button ghost" onClick={onClearDrilldown}>Ver todas las actividades</button>}</header>
  {drilldown&&<div className="format-note metric-note"><strong>Detalle verificable del indicador</strong><p>Se muestran únicamente los registros que forman el valor seleccionado para {drilldown.month}. Puedes abrir cualquier actividad para revisar su información completa.</p></div>}
  {departmentDrilldown&&<div className="format-note metric-note"><strong>Actividades programadas por delegación</strong><p>Este detalle corresponde a la Delegación INTUR {departmentTitle} en el período seleccionado. Puedes abrir cada actividad para revisar fecha, lugar, responsable y proyección.</p></div>}
  <section className="filters"><label className="search"><Search/><input aria-label="Buscar actividades" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar tema, lugar o municipio"/></label><select aria-label="Filtrar por delegación" value={activeDelegation} onChange={event=>changeDelegation(event.target.value)}><option value="">Todas las delegaciones</option>{delegations.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filtrar por estado" value={activeStatus} onChange={event=>changeStatus(event.target.value as ActivityStatus|'')}><option value="">Todos los estados</option><option>PROGRAMADA</option><option>DESARROLLADA</option><option>REPROGRAMADA</option><option>CANCELADA</option></select><input aria-label="Filtrar por mes" type="month" value={activeMonth} onChange={event=>changeMonth(event.target.value)}/></section>
  <ActivityList items={filtered} onSelect={onSelect} showAttendance={Boolean(drilldown)}/>
 </>
}
