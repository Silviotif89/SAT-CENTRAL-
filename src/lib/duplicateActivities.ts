import type {Activity,NewActivity} from '../types'

type ComparableActivity=Pick<Activity,'delegationId'|'topic'|'date'|'time'|'municipality'|'location'>|NewActivity

const stopWords=new Set(['capacitacion','taller','curso','seminario','charla','de','del','la','las','el','los','en','para','por','y','sector'])
const placeholder=(value:string)=>/pendiente|confirmar|sin definir|por definir|no informado/.test(normalizeActivityText(value))

export const normalizeActivityText=(value:string)=>value
 .normalize('NFD')
 .replace(/\p{Diacritic}/gu,'')
 .toLocaleLowerCase('es')
 .replace(/[^a-z0-9]+/g,' ')
 .trim()
 .replace(/\s+/g,' ')

const topicTokens=(value:string)=>new Set(normalizeActivityText(value).split(' ').filter(token=>token.length>2&&!stopWords.has(token)))
const startTime=(value:string)=>{
 const match=normalizeActivityText(value).match(/\b(\d{1,2})(?:\s+(\d{2}))?\s*(am|pm)\b/)
 if(!match)return ''
 return `${Number(match[1])}:${match[2]??'00'}${match[3]}`
}

const topicLooksEqual=(left:string,right:string)=>{
 const normalizedLeft=normalizeActivityText(left),normalizedRight=normalizeActivityText(right)
 if(normalizedLeft===normalizedRight)return true
 const leftTokens=topicTokens(left),rightTokens=topicTokens(right)
 const shared=[...leftTokens].filter(token=>rightTokens.has(token)).length
 const union=new Set([...leftTokens,...rightTokens]).size
 return shared>=2&&union>0&&shared/union>=.5
}

export const arePotentialDuplicateActivities=(left:ComparableActivity,right:ComparableActivity)=>{
 if(left.delegationId!==right.delegationId||left.date!==right.date||!topicLooksEqual(left.topic,right.topic))return false
 const leftTime=normalizeActivityText(left.time),rightTime=normalizeActivityText(right.time)
 const compatibleTime=leftTime===rightTime||placeholder(left.time)||placeholder(right.time)||(startTime(left.time)!==''&&startTime(left.time)===startTime(right.time))
 const leftPlace=normalizeActivityText(left.location),rightPlace=normalizeActivityText(right.location)
 const compatiblePlace=leftPlace===rightPlace||placeholder(left.location)||placeholder(right.location)||normalizeActivityText(left.municipality)===normalizeActivityText(right.municipality)
 return compatibleTime&&compatiblePlace
}

export const findPotentialDuplicateActivity=(input:NewActivity,activities:Activity[],ignoreId?:string)=>activities.find(activity=>activity.id!==ignoreId&&activity.status!=='CANCELADA'&&arePotentialDuplicateActivities(input,activity))

const completenessScore=(activity:Activity)=>{
 const validAttendance=activity.men!==null&&activity.women!==null&&activity.totalParticipants!==null&&activity.men+activity.women===activity.totalParticipants
 return (activity.status==='DESARROLLADA'?100:0)+(validAttendance?60:0)+(activity.report?50:0)+(!placeholder(activity.time)?12:0)+(!placeholder(activity.location)?12:0)+(activity.weeklyReportStatus==='CONFIRMADA'?8:0)+(activity.planReviewStatus==='CONFIRMADA'?6:0)+(activity.summary.trim()?4:0)
}

export const collapseKnownMatagalpaDuplicate=(activities:Activity[])=>{
 const candidates=activities.filter(activity=>activity.delegationId==='del-12'&&activity.date==='2026-10-07'&&normalizeActivityText(activity.topic).includes('imagen corporativa'))
 if(candidates.length<2||!candidates.some((activity,index)=>candidates.slice(index+1).some(other=>arePotentialDuplicateActivities(activity,other))))return activities
 const keep=[...candidates].sort((left,right)=>completenessScore(right)-completenessScore(left)||right.updatedAt.localeCompare(left.updatedAt))[0]
 if(!keep)return activities
 const removeIds=new Set(candidates.filter(activity=>activity.id!==keep.id&&arePotentialDuplicateActivities(keep,activity)).map(activity=>activity.id))
 return removeIds.size?activities.filter(activity=>!removeIds.has(activity.id)):activities
}
