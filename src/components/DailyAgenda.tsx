import {CalendarDays,Check,ChevronLeft,ChevronRight,Clock3,Plus,RotateCcw,Trash2} from 'lucide-react'
import {useMemo,useState,type FormEvent} from 'react'
import {useDailyTasks} from '../hooks/useDailyTasks'
import {toInputDate} from '../lib/activity'

const parseDate=(value:string)=>new Date(`${value}T12:00:00`)
const dateLabel=(value:string)=>new Intl.DateTimeFormat('es-NI',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(parseDate(value))

export function DailyAgenda(){
 const today=toInputDate(new Date()),[date,setDate]=useState(today),[title,setTitle]=useState('')
 const {tasks,add,toggle,defer,remove}=useDailyTasks()
 const items=useMemo(()=>tasks.filter(task=>task.date===date).sort((a,b)=>Number(a.status==='REALIZADO')-Number(b.status==='REALIZADO')||b.createdAt.localeCompare(a.createdAt)),[tasks,date])
 const done=items.filter(task=>task.status==='REALIZADO').length,pending=items.length-done
 const moveDate=(days:number)=>{const next=parseDate(date);next.setDate(next.getDate()+days);setDate(toInputDate(next))}
 const submit=(event:FormEvent)=>{event.preventDefault();if(!title.trim())return;add(title,date);setTitle('')}
 return <section className="daily-agenda panel" aria-label="Agenda diaria">
  <div className="daily-agenda-header"><div><span>Agenda diaria</span><h2>Pendientes del día</h2><p className="capitalize">{dateLabel(date)}</p></div><div className="daily-date-nav"><button type="button" aria-label="Día anterior" onClick={()=>moveDate(-1)}><ChevronLeft/></button><input type="date" aria-label="Fecha de la agenda" value={date} onChange={event=>event.target.value&&setDate(event.target.value)}/><button type="button" aria-label="Día siguiente" onClick={()=>moveDate(1)}><ChevronRight/></button>{date!==today&&<button type="button" className="daily-today" onClick={()=>setDate(today)}>Hoy</button>}</div></div>
  <div className="daily-agenda-stats"><article><Clock3/><span>Pendientes</span><strong>{pending}</strong></article><article><Check/><span>Realizados</span><strong>{done}</strong></article><article><CalendarDays/><span>Total del día</span><strong>{items.length}</strong></article></div>
  <form className="daily-task-form" onSubmit={submit}><input value={title} onChange={event=>setTitle(event.target.value)} maxLength={160} placeholder="Escribí un pendiente para este día" aria-label="Nuevo pendiente"/><button type="submit" disabled={!title.trim()}><Plus/> Agregar</button></form>
  <div className="daily-task-list">{items.length?items.map(task=><article className={`daily-task ${task.status==='REALIZADO'?'done':''}`} key={task.id}><button type="button" className="daily-check" aria-label={task.status==='REALIZADO'?'Marcar como pendiente':'Confirmar como realizado'} aria-pressed={task.status==='REALIZADO'} onClick={()=>toggle(task.id)}><Check/></button><div><strong>{task.title}</strong><span>{task.status==='REALIZADO'?'Realizado':'Pendiente'}{task.deferredCount>0?` · Pasado ${task.deferredCount} ${task.deferredCount===1?'vez':'veces'}`:''}</span></div>{task.status==='PENDIENTE'&&<button type="button" className="daily-defer" title="Pasar al día siguiente" aria-label={`Pasar ${task.title} al día siguiente`} onClick={()=>defer(task.id)}><RotateCcw/><span>Mañana</span></button>}<button type="button" className="daily-delete" title="Eliminar" aria-label={`Eliminar ${task.title}`} onClick={()=>{if(window.confirm(`¿Eliminar el pendiente “${task.title}”?`))remove(task.id)}}><Trash2/></button></article>):<div className="daily-agenda-empty"><CalendarDays/><strong>No hay pendientes para esta fecha</strong><span>Agregá el primero en el campo de arriba.</span></div>}</div>
 </section>
}
