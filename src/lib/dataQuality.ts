import {multiDateScheduleFirstDate} from './activity'
import {arePotentialDuplicateActivities} from './duplicateActivities'
import type {Activity} from '../types'

export type QualityIssueType='ATTENDANCE'|'OVERDUE'|'MISSING'|'DUPLICATE'|'MULTIDATE'
export interface QualityIssue{type:QualityIssueType;activity:Activity;title:string;detail:string}

const requiredMissing=(activity:Activity)=>{
 const missing:string[]=[]
 if(!activity.topic.trim())missing.push('tema')
 if(!activity.date)missing.push('fecha')
 if(!activity.time.trim())missing.push('hora')
 if(!activity.municipality.trim())missing.push('municipio')
 if(!activity.location.trim())missing.push('lugar')
 if(!activity.responsible.trim())missing.push('responsable')
 if(!activity.trainingProvider.trim())missing.push('institución que imparte')
 if(activity.trainingProvider==='DDT (INTUR)'&&!activity.ddtFacilitator.trim())missing.push('persona facilitadora')
 return missing
}

export const activityQualityIssues=(activities:Activity[],today:string):QualityIssue[]=>{
 return activities.flatMap(activity=>{
  const issues:QualityIssue[]=[]
  if(activity.status==='DESARROLLADA'&&(activity.men===null||activity.women===null||activity.totalParticipants===null||activity.men+activity.women!==activity.totalParticipants))issues.push({type:'ATTENDANCE',activity,title:'Asistencia incompleta o inconsistente',detail:'La actividad desarrollada no puede incluirse correctamente en los resultados.'})
  if((activity.status==='PROGRAMADA'||activity.status==='REPROGRAMADA')&&activity.date<today)issues.push({type:'OVERDUE',activity,title:'Reporte pendiente',detail:`La fecha ${activity.date} ya pasó y la actividad continúa pendiente.`})
  const missing=requiredMissing(activity)
  if(missing.length)issues.push({type:'MISSING',activity,title:'Información obligatoria faltante',detail:`Falta: ${missing.join(', ')}.`})
  const duplicate=activities.find(other=>other.id!==activity.id&&other.status!=='CANCELADA'&&arePotentialDuplicateActivities(activity,other))
  if(duplicate)issues.push({type:'DUPLICATE',activity,title:'Posible actividad duplicada',detail:`Coincide en delegación y fecha con “${duplicate.topic}”; la hora, el municipio o el tema son iguales o muy similares.`})
  const firstDate=multiDateScheduleFirstDate(activity.observations,activity.date)
  if(firstDate&&activity.date!==firstDate)issues.push({type:'MULTIDATE',activity,title:'Fecha principal incorrecta',detail:`El curso tiene varias fechas y debe registrarse una sola vez en su primera fecha: ${firstDate}.`})
  return issues
 })
}
