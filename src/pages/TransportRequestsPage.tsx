import {CalendarDays,CheckCircle2,ChevronLeft,ChevronRight,Download,MapPin,Truck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {delegationName} from '../data/delegations'
import {useActivities} from '../hooks/useActivities'
import {inDateRange,toInputDate,weekRange} from '../lib/activity'
import {exportTransportRequestsWord,transportRequestComplete,type TransportRequest} from '../services/exportTransportRequestsWord'
import {TRANSPORT_REQUEST_STORAGE_KEY} from '../services/localBackup'
import type {Activity} from '../types'

const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const parseDate=(value:string)=>new Date(`${value}T12:00:00`)
const fullDate=(value:string)=>{const date=parseDate(value);return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`}
const splitTime=(value:string)=>{const source=value.trim(),range=source.match(/^(.+?)(?:\s*[-–—]\s*|\s+a(?:l)?\s+)(.+)$/i);return {start:range?.[1]?.trim()||source,end:range?.[2]?.trim()||''}}
const destination=(activity:Activity)=>{const place=activity.location.trim(),municipality=activity.municipality.trim();if(!place)return municipality;if(!municipality||place.toLocaleLowerCase('es').includes(municipality.toLocaleLowerCase('es')))return place;return `${place}, ${municipality}.`}
const loadDrafts=()=>{try{return JSON.parse(localStorage.getItem(TRANSPORT_REQUEST_STORAGE_KEY)??'{}') as Record<string,TransportRequest>}catch{return {}}}

function defaultRequest(activity:Activity):TransportRequest{
 const times=splitTime(activity.time)
 return {activityId:activity.id,included:true,requestDate:toInputDate(new Date()),organizationalUnit:'Departamento de Acompañamiento Técnico',vehicle:'Camioneta',driver:true,fuel:true,departureDate:activity.date,departureTime:times.start,returnDate:activity.date,returnTime:times.end,publicServant:activity.ddtFacilitator.trim()||activity.responsible.trim(),destination:destination(activity),reason:`${activity.topic}\n\n${activity.time}`,internalRoute:'Salida INTUR Central',requestedBy:'Silvio Rodríguez Tiffer',requesterUnit:'Departamento de Acompañamiento Técnico'}
}

export function TransportRequestsPage(){
 const {activities}=useActivities()
 const [week,setWeek]=useState(()=>weekRange(toInputDate(new Date())).start),[drafts,setDrafts]=useState<Record<string,TransportRequest>>(loadDrafts),[exporting,setExporting]=useState(false),[error,setError]=useState('')
 const range=weekRange(week)
 const items=useMemo(()=>activities.filter(activity=>activity.trainingProvider==='DDT (INTUR)'&&activity.status!=='CANCELADA'&&inDateRange(activity,range.start,range.end)&&parseDate(activity.date).getDay()>=1&&parseDate(activity.date).getDay()<=5).sort((a,b)=>`${a.date}${a.time}${a.topic}`.localeCompare(`${b.date}${b.time}${b.topic}`,'es')),[activities,range.start,range.end])
 const requests=items.map(activity=>drafts[activity.id]??defaultRequest(activity))
 const validForWeek=(request:TransportRequest)=>request.departureDate>=range.start&&request.departureDate<=range.end&&request.returnDate>=range.start&&request.returnDate<=range.end
 const requestReady=(request:TransportRequest)=>transportRequestComplete(request)&&validForWeek(request)
 const selected=requests.filter(request=>request.included),complete=selected.filter(requestReady).length,ready=selected.length>0&&complete===selected.length
 useEffect(()=>{localStorage.setItem(TRANSPORT_REQUEST_STORAGE_KEY,JSON.stringify(drafts))},[drafts])
 const update=<K extends keyof TransportRequest>(request:TransportRequest,key:K,value:TransportRequest[K])=>{setError('');setDrafts(current=>({...current,[request.activityId]:{...request,[key]:value}}))}
 const selectWeek=(value:string)=>{setWeek(weekRange(value).start);setError('')}
 const changeWeek=(days:number)=>{const date=parseDate(range.start);date.setDate(date.getDate()+days);selectWeek(toInputDate(date))}
 const generate=async()=>{setExporting(true);setError('');try{await exportTransportRequestsWord(requests,range)}catch(reason){setError(reason instanceof Error?reason.message:'No se pudo generar el documento.')}finally{setExporting(false)}}
 return <>
  <header className="page-header transport-page-header"><div><p>Gestión de transporte</p><h1>Solicitudes de transporte semanal</h1><span className="subtext">Completá los datos de cada actividad DDT y descargá todas las solicitudes en un solo Word.</span></div><button className="button export" disabled={!ready||exporting} onClick={generate}><Download/>{exporting?'Generando Word…':`Generar Word (${selected.length})`}</button></header>
  <section className="transport-week-panel"><button type="button" aria-label="Semana anterior" onClick={()=>changeWeek(-7)}><ChevronLeft/></button><div><span>Semana seleccionada · lunes a viernes</span><strong>Lunes {fullDate(range.start)} al viernes {fullDate(range.end)}</strong></div><label><CalendarDays/><input type="date" aria-label="Lunes de la semana" value={range.start} onChange={event=>event.target.value&&selectWeek(event.target.value)}/></label><button type="button" aria-label="Semana siguiente" onClick={()=>changeWeek(7)}><ChevronRight/></button></section>
  <section className="transport-summary"><article><span>Actividades DDT</span><strong>{items.length}</strong></article><article><span>Incluidas en Word</span><strong>{selected.length}</strong></article><article className={ready?'complete':'pending'}><span>Solicitudes completas</span><strong>{complete}/{selected.length}</strong></article><p><CheckCircle2/> Los cambios se guardan automáticamente en este equipo.</p></section>
  {items.length===0?<div className="empty-state"><Truck/><strong>No hay actividades DDT en esta semana.</strong><span>Elegí otra semana o registrá una actividad impartida por DDT (INTUR).</span></div>:<div className="transport-request-list">{items.map((activity,index)=>{const request=requests[index]!,isComplete=requestReady(request);return <article className={`transport-request-card ${request.included?'':'excluded'}`} key={activity.id}>
   <header className="transport-card-head"><div className="transport-card-number"><span>{index+1}</span><Truck/></div><div><small>{delegationName(activity.delegationId)} · {fullDate(activity.date)}</small><h2>{activity.topic}</h2><p><MapPin/>{activity.location||activity.municipality}</p></div><label className="transport-include"><input type="checkbox" checked={request.included} onChange={event=>update(request,'included',event.target.checked)}/><span>Incluir en Word</span></label><b className={isComplete?'complete':'pending'}>{isComplete?'Completa':'Faltan datos'}</b></header>
   <div className="transport-form-grid">
    <label>Fecha de solicitud *<input type="date" value={request.requestDate} onChange={event=>update(request,'requestDate',event.target.value)}/></label>
    <label className="span-2">Unidad organizativa solicitante *<input value={request.organizationalUnit} onChange={event=>update(request,'organizationalUnit',event.target.value)}/></label>
    <label>Vehículo solicitado *<input value={request.vehicle} onChange={event=>update(request,'vehicle',event.target.value)}/></label>
    <label className="transport-check"><input type="checkbox" checked={request.driver} onChange={event=>update(request,'driver',event.target.checked)}/><span>Solicitar conductor</span></label>
    <label className="transport-check"><input type="checkbox" checked={request.fuel} onChange={event=>update(request,'fuel',event.target.checked)}/><span>Solicitar combustible</span></label>
    <label>Fecha de salida *<input type="date" min={range.start} max={range.end} value={request.departureDate} onChange={event=>update(request,'departureDate',event.target.value)}/></label>
    <label>Hora de salida *<input value={request.departureTime} onChange={event=>update(request,'departureTime',event.target.value)} placeholder="Ej. 8:00 a.m."/></label>
    <label>Fecha de regreso *<input type="date" min={range.start} max={range.end} value={request.returnDate} onChange={event=>update(request,'returnDate',event.target.value)}/></label>
    <label>Hora de regreso *<input value={request.returnTime} onChange={event=>update(request,'returnTime',event.target.value)} placeholder="Ej. 12:00 m.d."/></label>
    <label className="span-2">Nombre del servidor público *<input value={request.publicServant} onChange={event=>update(request,'publicServant',event.target.value)}/></label>
    <label className="span-2">Lugar de destino *<textarea rows={2} value={request.destination} onChange={event=>update(request,'destination',event.target.value)}/></label>
    <label className="span-2">Motivo y horario *<textarea rows={3} value={request.reason} onChange={event=>update(request,'reason',event.target.value)}/></label>
    <label className="span-2">Recorrido interno *<input value={request.internalRoute} onChange={event=>update(request,'internalRoute',event.target.value)}/></label>
    <label>Responsable solicitante *<input value={request.requestedBy} onChange={event=>update(request,'requestedBy',event.target.value)}/></label>
    <label>Área o cargo del responsable *<input value={request.requesterUnit} onChange={event=>update(request,'requesterUnit',event.target.value)}/></label>
   </div>
  </article>})}</div>}
  {!ready&&selected.length>0&&<div className="format-note"><strong>Completá los campos marcados con *</strong><p>El botón para generar el Word se habilitará cuando todas las solicitudes incluidas estén completas.</p></div>}
  {error&&<div className="format-note error-note" role="alert"><strong>No se pudo generar el archivo</strong><p>{error}</p></div>}
 </>
}
