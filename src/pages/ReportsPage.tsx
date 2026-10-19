import {Award,BarChart3,CalendarRange,ChevronLeft,ChevronRight,Download,Globe2,MapPinned,Target,TrendingUp,UsersRound,X} from 'lucide-react'
import {useMemo,useState,type KeyboardEvent,type MouseEvent} from 'react'
import {delegations} from '../data/delegations'
import {nicaraguaMap} from '../data/nicaraguaMap'
import {sigrunTargets} from '../data/sigrunTargets'
import {useActivities} from '../hooks/useActivities'
import {currentMonthKey,STATUS_LABEL,toInputDate,wasRescheduled} from '../lib/activity'
import {exportActivitiesExcel} from '../services/exportActivitiesExcel'
import type {Activity} from '../types'

const monthNames=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const shortMonths=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
type Tooltip={id:string;x:number;y:number}|null
type View='month'|'global'
type MonthActivitySummary={total:number;programmed:number;reported:number;pendingReport:number;rescheduled:number;cancelled:number;men:number;women:number;protagonists:number}
type ReportRow={delegation:(typeof delegations)[number];meta:number;updated:number;percentage:number|null;pending:number;source:string;monthItems:Activity[];monthSummary:MonthActivitySummary}

const performanceClass=(percentage:number|null)=>percentage===null?'neutral':percentage>=100?'met':percentage>=95?'almost':percentage>=85?'near':percentage>=70?'progress':'critical'
const mapPerformanceClass=(percentage:number|null)=>percentage===null?'neutral':percentage>=100?'map-dark-green':percentage>=95?'map-light-green':percentage>=85?'map-yellow':percentage>=70?'map-orange':'map-red'
const progressWidth=(percentage:number|null)=>`${Math.min(Math.max(percentage??0,0),100)}%`
const statusText=(percentage:number|null)=>percentage===null?'Sin meta aplicable':percentage>95?'Avance destacado':percentage>=80?'Avance alto':percentage>50?'Avance intermedio':'Requiere atención'
const validAttendance=(activity:Activity)=>activity.status==='DESARROLLADA'&&activity.men!==null&&activity.women!==null&&activity.totalParticipants!==null&&activity.men+activity.women===activity.totalParticipants

export function ReportsPage(){
 const {activities}=useActivities(),initial=currentMonthKey(),[period,setPeriod]=useState(initial),[tooltip,setTooltip]=useState<Tooltip>(null),[view,setView]=useState<View>('month'),[pickerOpen,setPickerOpen]=useState(false),[pickerYear,setPickerYear]=useState(Number(initial.slice(0,4)))
 const [selectedId,setSelectedId]=useState(''),[rankingHoverId,setRankingHoverId]=useState('')
 const [year,monthText]=period.split('-'),month=Math.max(0,Math.min(11,Number(monthText)-1))
 const rows=useMemo<ReportRow[]>(()=>delegations.map(delegation=>{
  const target=sigrunTargets.find(item=>item.delegationId===delegation.id)
  const months=monthNames.map((_,index)=>{
   const key=`${year}-${String(index+1).padStart(2,'0')}`,meta=year==='2026'?(target?.meta[index]??0):0,official=year==='2026'?(target?.cum[index]??0):0
   const reported=activities.filter(activity=>activity.delegationId===delegation.id&&activity.date.startsWith(key)&&activity.status==='DESARROLLADA'&&activity.men!==null&&activity.women!==null&&activity.totalParticipants!==null&&activity.men+activity.women===activity.totalParticipants).reduce((sum,activity)=>sum+(activity.totalParticipants??0),0)
   return {meta,official,reported,updated:official>0?official:reported}
  })
  const selected=months[month]!,annualMeta=months.reduce((sum,item)=>sum+item.meta,0),accumulated=months.slice(0,month+1).reduce((sum,item)=>sum+item.updated,0)
  const meta=view==='month'?selected.meta:annualMeta,updated=view==='month'?selected.updated:accumulated,percentage=meta>0?updated/meta*100:null
  const selectedKey=`${year}-${String(month+1).padStart(2,'0')}`
  const monthItems=activities.filter(activity=>activity.delegationId===delegation.id&&activity.date.startsWith(selectedKey)).sort((first,second)=>first.date.localeCompare(second.date)||first.time.localeCompare(second.time))
  const validMonthItems=monthItems.filter(validAttendance),men=validMonthItems.reduce((sum,activity)=>sum+(activity.men??0),0),women=validMonthItems.reduce((sum,activity)=>sum+(activity.women??0),0)
  const monthSummary={total:monthItems.length,programmed:monthItems.filter(activity=>activity.status==='PROGRAMADA').length,reported:validMonthItems.length,pendingReport:monthItems.filter(activity=>activity.status==='DESARROLLADA'&&!validAttendance(activity)).length,rescheduled:monthItems.filter(wasRescheduled).length,cancelled:monthItems.filter(activity=>activity.status==='CANCELADA').length,men,women,protagonists:men+women}
  return {delegation,meta,updated,percentage,pending:Math.max(meta-updated,0),source:view==='global'?`CUM acumulado hasta ${shortMonths[month]}`:selected.official>0?'CUM oficial SIGRUN':'SAT: solo reportes con asistencia válida',monthItems,monthSummary}
 }),[activities,month,view,year])
 const rankedRows=[...rows].sort((a,b)=>(b.percentage??-1)-(a.percentage??-1)||a.delegation.name.localeCompare(b.delegation.name,'es'))
 const totals=rows.reduce((sum,row)=>({meta:sum.meta+row.meta,updated:sum.updated+row.updated,met:sum.met+Number(row.percentage!==null&&row.percentage>=100)}),{meta:0,updated:0,met:0})
 const percentage=totals.meta>0?totals.updated/totals.meta*100:0,hovered=tooltip?rows.find(row=>row.delegation.id===tooltip.id):null,selectedRow=rows.find(row=>row.delegation.id===selectedId)??null
 const selectedRank=selectedRow?rankedRows.findIndex(row=>row.delegation.id===selectedRow.delegation.id)+1:0
 const showTooltip=(id:string,event:MouseEvent<SVGElement>)=>{const svg=event.currentTarget.ownerSVGElement,bounds=svg?.getBoundingClientRect();if(bounds)setTooltip({id,x:event.clientX-bounds.left,y:event.clientY-bounds.top})}
 const selectMonth=(index:number)=>{setPeriod(`${pickerYear}-${String(index+1).padStart(2,'0')}`);setPickerOpen(false);setTooltip(null)}
 const selectRegion=(id:string)=>{setSelectedId(current=>current===id?'':id);setTooltip(null)}
 const regionKey=(event:KeyboardEvent<SVGGElement>,id:string)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectRegion(id)}}
 const global=view==='global',periodLabel=global?`Avance global ${year} a ${monthNames[month]}`:`Seguimiento de ${monthNames[month]} de ${year}`
 const nationalGap=Math.max(totals.meta-totals.updated,0)
 return <>
  <header className="page-header executive-report-header"><div><p>Inteligencia territorial</p><h1>Reportes ejecutivos</h1><span className="subtext">Lectura estratégica del cumplimiento SIGRUN por delegación</span></div><div className="report-map-actions"><div className="report-month-field"><span>Mes del mapa</span><button type="button" className="report-month-trigger" aria-haspopup="dialog" aria-expanded={pickerOpen} onClick={()=>{setPickerYear(Number(year));setPickerOpen(current=>!current)}}><CalendarRange/><strong>{monthNames[month]}</strong><small>{year}</small></button>{pickerOpen&&<div className="report-month-popover" role="dialog" aria-label="Seleccionar mes"><header><button type="button" aria-label="Año anterior" onClick={()=>setPickerYear(current=>current-1)}><ChevronLeft/></button><strong>{pickerYear}</strong><button type="button" aria-label="Año siguiente" onClick={()=>setPickerYear(current=>current+1)}><ChevronRight/></button></header><div>{monthNames.map((name,index)=><button type="button" className={pickerYear===Number(year)&&index===month?'selected':''} key={name} onClick={()=>selectMonth(index)}>{name}</button>)}</div></div>}</div><button className="button export" onClick={()=>exportActivitiesExcel(activities,'all',toInputDate(new Date()))}><Download/> Exportar base</button></div></header>
  <section className="report-view-tabs executive-view-tabs" aria-label="Vista del reporte"><button className={!global?'active':''} onClick={()=>{setView('month');setTooltip(null)}}><CalendarRange/> Por mes</button><button className={global?'active':''} onClick={()=>{setView('global');setTooltip(null)}}><Globe2/> Global anual</button></section>
  <section className="report-map-stats executive-report-stats"><article><Target/><span>{global?'Meta anual nacional':'Meta nacional del mes'}</span><strong>{totals.meta.toLocaleString('es-NI')}</strong><small>Objetivo SIGRUN</small></article><article><UsersRound/><span>{global?`CUM acumulado a ${shortMonths[month]}`:'CUM actualizado'}</span><strong>{totals.updated.toLocaleString('es-NI')}</strong><small>Resultado consolidado</small></article><article className={percentage>=100?'met':'below'}><TrendingUp/><span>{global?'Avance de meta anual':'Cumplimiento mensual'}</span><strong>{percentage.toFixed(1)}%</strong><small>{nationalGap?`Brecha: ${nationalGap.toLocaleString('es-NI')}`:'Meta nacional alcanzada'}</small></article><article><MapPinned/><span>Delegaciones en meta</span><strong>{totals.met}<small> / 17</small></strong><small>Cobertura territorial</small></article></section>

  <section className="nicaragua-map-panel executive-map-panel">
   <div className="report-map-heading executive-map-heading"><div><span>{periodLabel}</span><h2>{global?'Mapa de avance anual SIGRUN':'Mapa de desempeño territorial'}</h2><p>Seleccioná una delegación para abrir su lectura ejecutiva.</p></div></div>
   <div className="executive-map-layout">
    <div className="executive-map-canvas">
     <div className="nicaragua-map-wrap"><svg className="nicaragua-map" viewBox="0 0 780 580" role="img" aria-label={`Mapa de Nicaragua. ${periodLabel}`}>{nicaraguaMap.map(region=>{const row=rows.find(item=>item.delegation.id===region.delegationId)!,status=mapPerformanceClass(row.percentage),selected=selectedId===region.delegationId,emphasized=rankingHoverId===region.delegationId;return <g className={`map-region ${status}${selected?' selected':''}${emphasized?' emphasized':''}`} key={region.delegationId} tabIndex={0} role="button" aria-pressed={selected} aria-label={`${region.name}: meta SIGRUN ${row.meta}, resultado usado ${row.updated}, ${row.percentage===null?'sin porcentaje':`${row.percentage.toFixed(1)} por ciento`}`} onClick={()=>selectRegion(region.delegationId)} onKeyDown={event=>regionKey(event,region.delegationId)} onMouseEnter={event=>showTooltip(region.delegationId,event)} onMouseMove={event=>showTooltip(region.delegationId,event)} onMouseLeave={()=>setTooltip(null)} onFocus={()=>setTooltip({id:region.delegationId,x:region.labelX,y:region.labelY})} onBlur={()=>setTooltip(null)}><path d={region.path}/><text x={region.labelX} y={region.labelY} style={{fontSize:region.name.length>10?9:11}}>{region.name}</text></g>})}</svg>{hovered&&tooltip&&<div className={`map-tooltip executive-map-tooltip ${mapPerformanceClass(hovered.percentage)}`} style={{left:`${Math.min(tooltip.x+14,620)}px`,top:`${Math.max(tooltip.y-30,8)}px`}}><span>Delegación INTUR</span><strong>{hovered.delegation.name}</strong><dl><div><dt>{global?'Meta anual':'Meta SIGRUN'}</dt><dd>{hovered.meta}</dd></div><div><dt>{global?'Acumulado':'Resultado válido'}</dt><dd>{hovered.updated}</dd></div><div><dt>Avance</dt><dd>{hovered.percentage===null?'—':`${hovered.percentage.toFixed(1)}%`}</dd></div></dl><small>{hovered.source}{hovered.pending>0?` · Brecha ${hovered.pending}`:' · Meta alcanzada'}</small></div>}</div>
     <section className="executive-map-legend" aria-labelledby="executive-map-legend-title"><h3 id="executive-map-legend-title">Meta de cumplimiento</h3><div className="executive-map-legend-items"><span><i className="met"/><span><strong>≥ 100%</strong><small>Meta alcanzada</small></span></span><span><i className="almost"/><span><strong>95%–99.9%</strong><small>Muy cerca de la meta</small></span></span><span><i className="near"/><span><strong>85%–94.9%</strong><small>Avance moderado</small></span></span><span><i className="progress"/><span><strong>70%–84.9%</strong><small>Requiere atención</small></span></span><span><i className="critical"/><span><strong>&lt; 70%</strong><small>Desempeño crítico</small></span></span></div></section>
     <p className="map-source-note">{global?`La meta corresponde a todo ${year}; el avance consolida el CUM desde enero hasta ${monthNames[month]}. `:'El CUM oficial prevalece; donde aún no existe, se usa el reporte SAT con asistencia validada. '}Verde indica meta alcanzada; los tonos rojos muestran distintos niveles por debajo de la meta.</p>
    </div>
    <aside className={`executive-map-detail ${performanceClass(selectedRow?.percentage??(totals.meta?percentage:null))}`} aria-live="polite">
     {selectedRow?<>
      <button type="button" className="executive-detail-close" aria-label="Volver al panorama nacional" onClick={()=>setSelectedId('')}><X/></button>
      <span className="executive-detail-kicker"><MapPinned/> Delegación seleccionada</span>
      <div className="executive-detail-title"><div><small>Posición nacional</small><b>#{selectedRank}</b></div><h3>{selectedRow.delegation.name}</h3></div>
      <div className="executive-percentage"><strong>{selectedRow.percentage===null?'—':selectedRow.percentage.toFixed(1)}<small>{selectedRow.percentage===null?'':'%'}</small></strong><span>{statusText(selectedRow.percentage)}</span></div>
      <div className="executive-progress"><span style={{width:progressWidth(selectedRow.percentage)}}/></div>
      <div className="executive-detail-metrics"><div><span>{global?'Meta anual':'Meta SIGRUN del mes'}</span><strong>{selectedRow.meta.toLocaleString('es-NI')}</strong></div><div><span>{global?'CUM acumulado':'Resultado válido del mes'}</span><strong>{selectedRow.updated.toLocaleString('es-NI')}</strong></div><div><span>Brecha</span><strong>{selectedRow.pending.toLocaleString('es-NI')}</strong></div></div>
      {!global&&<div className="executive-month-mini"><span>Actividad del mes</span><strong>{selectedRow.monthSummary.total} registros</strong><small>{selectedRow.monthSummary.reported} con reporte válido · {selectedRow.monthSummary.cancelled} canceladas</small></div>}
      <p><BarChart3/>{selectedRow.source}</p>
     </>:<>
      <span className="executive-detail-kicker"><Award/> Panorama nacional</span>
      <div className="executive-national-title"><small>{periodLabel}</small><h3>Desempeño consolidado</h3></div>
      <div className="executive-percentage"><strong>{percentage.toFixed(1)}<small>%</small></strong><span>{statusText(totals.meta?percentage:null)}</span></div>
      <div className="executive-progress"><span style={{width:progressWidth(percentage)}}/></div>
      <div className="executive-detail-metrics"><div><span>Meta</span><strong>{totals.meta.toLocaleString('es-NI')}</strong></div><div><span>CUM</span><strong>{totals.updated.toLocaleString('es-NI')}</strong></div><div><span>Brecha</span><strong>{nationalGap.toLocaleString('es-NI')}</strong></div></div>
      <p><MapPinned/>{totals.met} de 17 delegaciones alcanzaron la meta</p>
     </>}
    </aside>
   </div>
  </section>

  {selectedRow&&!global&&<section className="delegation-month-detail" aria-label={`Resumen mensual de ${selectedRow.delegation.name}`}>
   <header><div><span>Detalle operativo verificable</span><h2>{selectedRow.delegation.name} · {monthNames[month]} de {year}</h2><p>Este bloque usa únicamente las actividades del mes seleccionado. Las canceladas aparecen para control, pero no suman protagonistas ni cumplimiento.</p></div><div className="month-meta-explanation"><small>Meta SIGRUN del mes</small><strong>{selectedRow.meta.toLocaleString('es-NI')}</strong><span>No es cantidad de actividades</span></div></header>
   <div className="delegation-month-stats">{[
    ['Registros del mes',selectedRow.monthSummary.total,'all'],
    ['Programadas',selectedRow.monthSummary.programmed,'programmed'],
    ['Con reporte válido',selectedRow.monthSummary.reported,'reported'],
    ['Pendientes de reporte',selectedRow.monthSummary.pendingReport,'pending'],
    ['Reprogramadas',selectedRow.monthSummary.rescheduled,'rescheduled'],
    ['Canceladas',selectedRow.monthSummary.cancelled,'cancelled'],
    ['Hombres / Mujeres',`${selectedRow.monthSummary.men} / ${selectedRow.monthSummary.women}`,'gender'],
    ['Protagonistas válidos',selectedRow.monthSummary.protagonists,'people'],
   ].map(([label,value,tone])=><article className={String(tone)} key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div>
   <div className="delegation-month-list"><div className="delegation-month-list-head"><span>Fecha y actividad</span><span>Estado</span><span>Aporte al resultado</span></div>{selectedRow.monthItems.length?selectedRow.monthItems.map(activity=>{const valid=validAttendance(activity);return <article key={activity.id}><div><strong>{activity.topic}</strong><span>{activity.date} · {activity.time} · {activity.municipality}</span></div><b className={`month-status ${activity.status.toLowerCase()}`}>{STATUS_LABEL[activity.status]}</b><p>{valid?<><strong>{activity.totalParticipants}</strong> protagonistas · {activity.men} H / {activity.women} M</>:activity.status==='CANCELADA'?'No contabilizada: actividad cancelada.':activity.status==='DESARROLLADA'?'No contabilizada: asistencia pendiente o inconsistente.':'No contabilizada hasta que sea ejecutada y reportada.'}</p></article>}):<div className="empty-state compact-empty">No hay actividades registradas para esta delegación en el mes seleccionado.</div>}</div>
  </section>}

  <section className="executive-ranking-section"><div className="executive-ranking-heading"><div><span>Comparativo territorial</span><h2>Ranking de cumplimiento</h2></div><p>Pulsá una delegación para localizarla en el mapa y revisar su brecha.</p></div><div className="map-delegation-grid executive-ranking-grid" aria-label="Ranking de cumplimiento por delegación">{rankedRows.map((row,index)=>{const status=performanceClass(row.percentage),selected=selectedId===row.delegation.id;return <button type="button" className={`executive-ranking-card ${status}${selected?' selected':''}`} key={row.delegation.id} onClick={()=>selectRegion(row.delegation.id)} onMouseEnter={()=>setRankingHoverId(row.delegation.id)} onMouseLeave={()=>setRankingHoverId('')} onFocus={()=>setRankingHoverId(row.delegation.id)} onBlur={()=>setRankingHoverId('')}><span className="delegation-rank">#{index+1}</span><div><strong>{row.delegation.name}</strong><small>{row.source}</small></div><p><b>{row.updated}</b><small> / {row.meta}</small></p><em>{row.percentage===null?'Sin meta':`${row.percentage.toFixed(1)}%`}</em><span className="executive-rank-progress"><i style={{width:progressWidth(row.percentage)}}/></span></button>})}</div></section>
 </>
}
