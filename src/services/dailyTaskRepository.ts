export type DailyTaskStatus='PENDIENTE'|'REALIZADO'

export interface DailyTask{
 id:string
 title:string
 date:string
 status:DailyTaskStatus
 createdAt:string
 completedAt:string|null
 deferredCount:number
 previousDates:string[]
}

export const DAILY_TASK_STORAGE_KEY='sat-intur-daily-agenda-v1'

const validTask=(value:unknown):value is DailyTask=>{
 if(!value||typeof value!=='object')return false
 const task=value as Partial<DailyTask>
 return typeof task.id==='string'&&typeof task.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(task.date??'')&&(task.status==='PENDIENTE'||task.status==='REALIZADO')
}

export const dailyTaskRepository={
 list():DailyTask[]{
  try{const stored=JSON.parse(localStorage.getItem(DAILY_TASK_STORAGE_KEY)??'[]') as unknown;return Array.isArray(stored)?stored.filter(validTask).map(task=>({...task,deferredCount:task.deferredCount??0,previousDates:Array.isArray(task.previousDates)?task.previousDates:[]})):[]}
  catch{return []}
 },
 save(tasks:DailyTask[]){localStorage.setItem(DAILY_TASK_STORAGE_KEY,JSON.stringify(tasks))},
}
