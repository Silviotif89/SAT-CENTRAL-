import { Download } from 'lucide-react'
import { useMemo,useState } from 'react'
import { delegations } from '../data/delegations'
import { useActivities } from '../hooks/useActivities'
import { inDateRange,toInputDate,wasRescheduled,weekRange } from '../lib/activity'
import { exportActivitiesExcel } from '../services/exportActivitiesExcel'
import type { Activity } from '../types'
import type { DepartmentDrilldown } from './ActivitiesPage'

type Period='week'|'month'|'year'
const aggregate=(items:Activity[])=>({
 total:items.length,
 developed:items.filter(a=>a.status==='DESARROLLADA').length,
 pending:items.filter(a=>a.status==='PROGRAMADA').length,
 rescheduled:items.filter(wasRescheduled).length,
 cancelled:items.filter(a=>a.status==='CANCELADA').length,
 men:items.reduce((sum,a)=>sum+(a.status==='DESARROLLADA'?(a.men??0):0),0),
 women:items.reduce((sum,a)=>sum+(a.status==='DESARROLLADA'?(a.women??0):0),0),
})

export function DepartmentSummaryPage({onOpenProgrammed}:{onOpenProgrammed:(drilldown:DepartmentDrilldown)=>void}){
 const {activities}=useActivities(),[period,setPeriod]=useState<Period>('week'),[reference,setReference]=useState(toInputDate(new Date()))
 const range=useMemo(()=>{if(period==='week')return weekRange(reference);const [year,month]=reference.split('-').map(Number);if(period==='year')return {start:`${year}-01-01`,end:`${year}-12-31`};return {start:`${year}-${String(month).padStart(2,'0')}-01`,end:toInputDate(new Date(year!,month!,0))}},[period,reference])
 const rows=useMemo(()=>delegations.map(delegation=>{const items=activities.filter(a=>a.delegationId===delegation.id&&inDateRange(a,range.start,range.end));return {delegation,...aggregate(items)}}),[activities,range.start,range.end])
 const totals=aggregate(activities.filter(a=>inDateRange(a,range.start,range.end)))
 return <><header className="page-header"><div><p>Consolidado territorial</p><h1>Resumen departamental</h1><span className="subtext">Del {range.start} al {range.end} · 17 delegaciones INTUR</span></div><button className="button export" onClick={()=>exportActivitiesExcel(activities,period,reference,'','department-summary')}><Download/> Descargar Excel</button></header>
  <section className="department-controls"><div className="period-tabs" role="group" aria-label="Período del resumen"><button className={period==='week'?'active':''} onClick={()=>setPeriod('week')}>Resumen semanal</button><button className={period==='month'?'active':''} onClick={()=>setPeriod('month')}>Resumen mensual</button><button className={period==='year'?'active':''} onClick={()=>setPeriod('year')}>Resumen anual</button></div><label>Fecha de referencia<input type="date" value={reference} onChange={e=>setReference(e.target.value)}/></label></section>
  <section className="report-summary department-totals">{[['Actividades',totals.total],['Desarrolladas',totals.developed],['Pendientes',totals.pending],['Hombres',totals.men],['Mujeres',totals.women],['Protagonistas',totals.men+totals.women]].map(([label,value])=><div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</section>
  <section className="department-table"><div className="department-row department-header"><span>Delegación INTUR</span><span>Actividades</span><span>Desarrolladas</span><span>Pendientes</span><span>Reprogramadas</span><span>Canceladas</span><span>H / M</span><span>Protagonistas</span></div>{rows.map(row=><button type="button" className="department-row department-link" key={row.delegation.id} onClick={()=>onOpenProgrammed({delegationId:row.delegation.id,start:range.start,end:range.end})} aria-label={`Ver actividades programadas de ${row.delegation.name}`}><strong>Delegación Departamental INTUR {row.delegation.name}</strong><span data-label="Actividades">{row.total}</span><span data-label="Desarrolladas">{row.developed}</span><span data-label="Pendientes">{row.pending}</span><span data-label="Reprogramadas">{row.rescheduled}</span><span data-label="Canceladas">{row.cancelled}</span><span data-label="H / M">{row.men} / {row.women}</span><span data-label="Protagonistas"><b>{row.men+row.women}</b></span></button>)}</section>
 </>
}
