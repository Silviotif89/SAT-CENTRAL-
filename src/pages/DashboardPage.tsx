import {Users} from 'lucide-react'
import {useEffect,useMemo,useRef,useState} from 'react'
import {StatusBadge} from '../components/StatusBadge'
import {DailyAgenda} from '../components/DailyAgenda'
import {delegationName} from '../data/delegations'
import {sigrunTargets} from '../data/sigrunTargets'
import {useActivities} from '../hooks/useActivities'
import {currentMonthKey,wasRescheduled} from '../lib/activity'
import type {Activity} from '../types'

export type DashboardMetric='programmed'|'developed'|'rescheduled'|'cancelled'|'total'|'men'|'women'

const isValidMonthKey=(value:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value)

export function DashboardPage({onCalendar,onSelect,onMetric}:{onCalendar:()=>void;onSelect:(a:Activity)=>void;onMetric:(metric:DashboardMetric,month:string)=>void}){
 const {activities}=useActivities()
 const initialMonth=currentMonthKey(),knownSystemMonth=useRef(initialMonth),[defaultMonth,setDefaultMonth]=useState(initialMonth),[month,setMonth]=useState(initialMonth)
 useEffect(()=>{
  const syncWithComputerDate=()=>{const nextMonth=currentMonthKey();if(nextMonth!==knownSystemMonth.current){knownSystemMonth.current=nextMonth;setDefaultMonth(nextMonth);setMonth(nextMonth)}}
  const timer=window.setInterval(syncWithComputerDate,60_000)
  window.addEventListener('focus',syncWithComputerDate)
  document.addEventListener('visibilitychange',syncWithComputerDate)
  return ()=>{window.clearInterval(timer);window.removeEventListener('focus',syncWithComputerDate);document.removeEventListener('visibilitychange',syncWithComputerDate)}
 },[])
 const items=activities.filter(a=>a.date.startsWith(month))
 const stat=(status:string)=>items.filter(a=>a.status===status).length
 const developed=items.filter(a=>a.status==='DESARROLLADA'&&a.men!==null&&a.women!==null&&a.totalParticipants===a.men+a.women)
 const totals=developed.reduce((sum,a)=>({total:sum.total+(a.totalParticipants??0),men:sum.men+(a.men??0),women:sum.women+(a.women??0)}),{total:0,men:0,women:0})
 const reportedCutoff=developed.reduce((latest,a)=>a.date>latest?a.date:latest,'')
 const periodBadge=month===defaultMonth?(reportedCutoff?`Reportes cargados · hasta el ${Number(reportedCutoff.slice(-2))}`:'Mes actual · sin reportes'):'Resumen mensual'
 const today=new Date().toISOString().slice(0,10)
 const upcoming=useMemo(()=>[...items].filter(a=>(month!==defaultMonth||a.date>=today)&&(a.status==='PROGRAMADA'||a.status==='REPROGRAMADA')).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4),[items,today,month,defaultMonth])
 const recent=[...developed].sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt))[0]
 const monthName=new Intl.DateTimeFormat('es-NI',{month:'long',year:'numeric'}).format(new Date(`${month}-01T12:00:00`))
 const [selectedYear,selectedMonth]=month.split('-').map(Number),sigrunMeta=selectedYear===2026?sigrunTargets.reduce((sum,row)=>sum+(row.meta[(selectedMonth??1)-1]??0),0):0
 const stats:[DashboardMetric,string,number,string][]=[['programmed','Actividades programadas',stat('PROGRAMADA'),'blue'],['developed','Desarrolladas',developed.length,'green'],['rescheduled','Reprogramadas',items.filter(wasRescheduled).length,'amber'],['cancelled','Canceladas',stat('CANCELADA'),'red'],['total','Total protagonistas',totals.total,'navy'],['men','Hombres',totals.men,'slate'],['women','Mujeres',totals.women,'violet']]
 const statHelp:Record<DashboardMetric,string>={programmed:'Cantidad de actividades pendientes o programadas en el mes.',developed:'Actividades realizadas con asistencia completa y validada.',rescheduled:'Actividades del mes que cambiaron de fecha.',cancelled:'Actividades canceladas durante el mes.',total:'Total de protagonistas reportados en actividades desarrolladas.',men:'Total de hombres reportados en el mes.',women:'Total de mujeres reportadas en el mes.'}
 return <>
  <header className="page-header"><div><p>Resumen territorial</p><h1 className="capitalize">{monthName}</h1></div><div className="dashboard-period"><label>Mes del resumen<input aria-label="Seleccionar mes del resumen" data-tooltip="Cambia el mes usado en todas las cifras y actividades de esta pantalla." type="month" value={month} onChange={event=>{const nextMonth=event.target.value;if(isValidMonthKey(nextMonth))setMonth(nextMonth)}}/></label><span className="success-badge" data-tooltip="Indica hasta qué día existen reportes cargados para el mes actual.">{periodBadge}</span></div></header>
  <section className="stats-grid">{stats.map(([metric,label,value,tone])=><button type="button" className={`stat ${tone}`} key={metric} data-tooltip={statHelp[metric]} onClick={()=>onMetric(metric,month)} aria-label={`Ver detalle de ${label.toLowerCase()}`}><span>{label}</span><strong>{value}</strong><small>Ver detalle del mes</small></button>)}<article data-tooltip="Compara los protagonistas reportados con la meta SIGRUN del mes." className={`stat sigrun-comparison ${sigrunMeta>0&&totals.total>=sigrunMeta?'met':'below'}`}><span>Meta mensual SIGRUN</span><strong>{sigrunMeta||'—'}</strong>{sigrunMeta>0&&<small>{totals.total>=sigrunMeta?'Meta cumplida o superada':`Faltan ${sigrunMeta-totals.total} protagonistas`}</small>}</article></section>
  <DailyAgenda/>
  <section className="dashboard-grid">
   <article className="panel"><div className="panel-title"><div><span>Agenda territorial</span><h2>{month===defaultMonth?'Próximas actividades':'Actividades pendientes del mes'}</h2></div><button onClick={onCalendar}>Ver calendario</button></div><div className="upcoming">{upcoming.length?upcoming.map(a=><button className="activity-row" key={a.id} onClick={()=>onSelect(a)}><div className="date-tile"><span>{new Date(`${a.date}T12:00:00`).getDate()}</span><span>{new Intl.DateTimeFormat('es',{month:'short'}).format(new Date(`${a.date}T12:00:00`))}</span></div><div><strong>{a.topic}</strong><span>{delegationName(a.delegationId)} · {a.time}</span></div><StatusBadge status={a.status}/></button>):<div className="empty-state compact-empty">No hay actividades pendientes en el mes seleccionado.</div>}</div></article>
   <article className="panel recent"><div className="panel-title"><div><span>Último movimiento</span><h2>Actividad reciente</h2></div><Users/></div>{recent?<button className="recent-card" onClick={()=>onSelect(recent)}><StatusBadge status={recent.status}/><h3>{recent.topic}</h3><p>{delegationName(recent.delegationId)} · {recent.date}</p><div className="people"><div><strong>{recent.totalParticipants}</strong><span>Total</span></div><div><strong>{recent.men}</strong><span>Hombres</span></div><div><strong>{recent.women}</strong><span>Mujeres</span></div></div></button>:<div className="empty-state">Aún no hay actividades desarrolladas.</div>}</article>
  </section>
 </>
}
