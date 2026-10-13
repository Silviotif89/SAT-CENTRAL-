import type {Activity,PlanReviewStatus} from '../types'

const pending=(value:string)=>!value.trim()||/(pendiente|por confirmar|sin definir|no reportado)/i.test(value.trim())

export function weeklyPlanMissingFields(activity:Activity){
 const missing:string[]=[]
 if(pending(activity.topic))missing.push('tema')
 if(!activity.date)missing.push('fecha')
 if(pending(activity.time))missing.push('hora o duración')
 if(pending(activity.municipality))missing.push('municipio')
 if(pending(activity.location))missing.push('lugar')
 if(pending(activity.institution))missing.push('participantes o instituciones')
 if(pending(activity.responsible))missing.push('responsable')
 if(pending(activity.trainingProvider))missing.push('institución que impartirá')
 if(activity.trainingProvider==='DDT (INTUR)'&&pending(activity.ddtFacilitator))missing.push('persona facilitadora de DDT')
 if(!Number.isFinite(activity.projectedParticipants)||activity.projectedParticipants<=0)missing.push('proyección de participantes')
 return missing
}

export function planReviewStatus(activity:Activity):PlanReviewStatus{
 if(activity.planReviewStatus)return activity.planReviewStatus
 if(activity.status==='CANCELADA')return 'CANCELADA'
 if(activity.status==='REPROGRAMADA')return 'REPROGRAMADA'
 return 'PENDIENTE'
}

export const planReviewComplete=(activity:Activity)=>planReviewStatus(activity)!=='PENDIENTE'
