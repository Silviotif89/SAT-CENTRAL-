import type { Activity, ActivityStatus } from '../types'
export const STATUS_LABEL:Record<ActivityStatus,string>={PROGRAMADA:'Programada',DESARROLLADA:'Desarrollada',CANCELADA:'Cancelada',REPROGRAMADA:'Reprogramada'}
export const STATUS_CLASS:Record<ActivityStatus,string>={PROGRAMADA:'programmed',DESARROLLADA:'developed',CANCELADA:'cancelled',REPROGRAMADA:'rescheduled'}
export const totalParticipants=(men:number,women:number)=>Math.max(0,men)+Math.max(0,women)
export const wasRescheduled=(a:Activity)=>Boolean(a.originalDate)||(a.statusHistory??[]).some(change=>change.to==='REPROGRAMADA')
export const inDateRange=(a:Activity,start:string,end:string)=>a.date>=start&&a.date<=end
export const currentMonthKey=()=>new Date().toISOString().slice(0,7)
export const toInputDate=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
export const weekRange=(value:string)=>{const start=new Date(`${value}T12:00:00`);const day=(start.getDay()+6)%7;start.setDate(start.getDate()-day);const end=new Date(start);end.setDate(start.getDate()+4);return {start:toInputDate(start),end:toInputDate(end)}}
export const inWorkWeek=(activity:Activity,value:string)=>{const range=weekRange(value);return inDateRange(activity,range.start,range.end)}

const MONTH_NUMBER:Record<string,number>={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12}
const MULTI_DATE_PREFIX=/^(?:Actividad programada (?:para (?:el|los días)|del)|Curso (?:realizado (?:los días|del)|con encuentros los días)|(?:Fechas|Días)(?: de (?:la actividad|realización|encuentros))?:)\s*/i

// Multi-day INATEC courses remain one activity. The first explicit date is
// the primary date used by reports; later meetings stay in observations.
export const multiDateScheduleFirstDate=(observations:string,fallbackDate:string)=>{
 const part=observations.split(/[;·\n]|\.\s+/).map(value=>value.trim()).find(value=>MULTI_DATE_PREFIX.test(value))
 if(!part)return null
 const schedule=part.replace(MULTI_DATE_PREFIX,'')
 const days=[...schedule.matchAll(/\b(0?[1-9]|[12]\d|3[01])\b/g)].map(match=>Number(match[1]))
 if(days.length<2)return null
 const normalized=schedule.toLocaleLowerCase('es'),monthName=Object.keys(MONTH_NUMBER).find(month=>normalized.includes(month))
 const fallback=parseDateValue(fallbackDate),month=(monthName?MONTH_NUMBER[monthName]:undefined)??fallback.month,year=Number(schedule.match(/\b(20\d{2})\b/)?.[1]??fallback.year)
 const date=new Date(year,month-1,days[0],12)
 if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==days[0])return null
 return toInputDate(date)
}

const parseDateValue=(value:string)=>{const [year,month]=value.split('-').map(Number);return {year:year||new Date().getFullYear(),month:month||new Date().getMonth()+1}}
