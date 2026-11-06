import {delegationName} from '../data/delegations'
import {inDateRange} from '../lib/activity'
import type {Activity} from '../types'
import {weeklyPlanDates} from './exportWeeklyPlanWord'

type WeekRange={start:string;end:string}
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const clean=(value:string)=>value.trim()||'Pendiente de confirmar'
const parseDate=(value:string)=>new Date(`${value}T12:00:00`)
const dayLabel=(value:string)=>{const date=parseDate(value);return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`}
const timeOrder=(value:string)=>{
 const match=value.toLocaleLowerCase('es').match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)/)
 if(!match)return Number.MAX_SAFE_INTEGER
 let hour=Number(match[1]);const minute=Number(match[2]??0)
 if(match[3]?.startsWith('p')&&hour<12)hour+=12
 if(match[3]?.startsWith('a')&&hour===12)hour=0
 return hour*60+minute
}

function periodLabel(range:WeekRange){
 const start=parseDate(range.start),end=parseDate(range.end)
 return `${start.getDate()} DE ${months[start.getMonth()]}${start.getFullYear()!==end.getFullYear()?` DEL ${start.getFullYear()}`:''} AL ${end.getDate()} DE ${months[end.getMonth()]} DEL ${end.getFullYear()}`.toUpperCase()
}

function weeklyPlanLocation(activity:Activity){
 const department=clean(delegationName(activity.delegationId))
 const municipality=clean(activity.municipality)
 const location=clean(activity.location||activity.municipality)
 return `${department}, ${municipality}, ${location}`
}

/** Matches the weekly Word plan's activity order and field sequence. */
export function createWeeklyPlanWhatsAppText(items:Activity[],range:WeekRange){
 const ordered=items
  .filter(activity=>activity.status!=='CANCELADA'&&inDateRange(activity,range.start,range.end))
  .sort((first,second)=>first.date.localeCompare(second.date)||timeOrder(first.time)-timeOrder(second.time)||first.topic.localeCompare(second.topic,'es'))
 const lines=[`PLAN DE CAPACITACIÓN DEL ${periodLabel(range)}`]
 if(!ordered.length)return `${lines[0]}\n\nNo hay capacitaciones registradas para el período y la delegación seleccionados.`
 let previousDate='',number=0
 for(const activity of ordered){
  if(previousDate!==activity.date){lines.push('',dayLabel(activity.date));previousDate=activity.date}
  lines.push(`${++number}. ${clean(activity.topic)}`)
  lines.push(`Hora: ${clean(activity.time)}`)
  lines.push(`Lugar: ${weeklyPlanLocation(activity)}`)
  lines.push(`Participan: ${clean(activity.institution)}`)
  lines.push(`Proyección de Participantes: ${Number.isFinite(activity.projectedParticipants)&&activity.projectedParticipants>=0?`${activity.projectedParticipants} protagonistas.`:'Pendiente de confirmar'}`)
  const person=activity.trainingProvider==='DDT (INTUR)'&&activity.ddtFacilitator.trim()?activity.ddtFacilitator:activity.responsible||activity.trainingProvider
  lines.push(`Responsable: ${clean(person)}`)
  const dates=weeklyPlanDates(activity.observations)
  if(dates)lines.push(dates)
 }
 return lines.join('\n').trim()
}
