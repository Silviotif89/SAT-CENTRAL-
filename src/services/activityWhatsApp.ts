import {delegationName} from '../data/delegations'
import type {Activity} from '../types'
import {weeklyPlanDates} from './exportWeeklyPlanWord'

const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const clean=(value:string)=>value.trim()||'Pendiente de confirmar'
const parseDate=(value:string)=>new Date(`${value}T12:00:00`)
const fullDayLabel=(value:string)=>{const date=parseDate(value);return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`}

function weeklyPlanLocation(activity:Activity){
 const department=clean(delegationName(activity.delegationId))
 const municipality=clean(activity.municipality)
 const location=clean(activity.location||activity.municipality)
 return `${department}, ${municipality}, ${location}`
}

function activityLines(activity:Activity,number:number){
 const lines=[
  `${number}. ${clean(activity.topic)}`,
  `Hora: ${clean(activity.time)}`,
  `Lugar: ${weeklyPlanLocation(activity)}`,
  `Participan: ${clean(activity.institution)}`,
  `Proyección de Participantes: ${Number.isFinite(activity.projectedParticipants)&&activity.projectedParticipants>=0?`${activity.projectedParticipants} protagonistas.`:'Pendiente de confirmar'}`,
 ]
 const person=activity.trainingProvider==='DDT (INTUR)'&&activity.ddtFacilitator.trim()?activity.ddtFacilitator:activity.responsible||activity.trainingProvider
 lines.push(`Responsable: ${clean(person)}`)
 const dates=weeklyPlanDates(activity.observations)
 if(dates)lines.push(dates)
 return lines
}

/** Plain-text details for following up on one training by WhatsApp. */
export function createActivityWhatsAppText(activity:Activity){
 return [fullDayLabel(activity.date),...activityLines(activity,1)].join('\n')
}
