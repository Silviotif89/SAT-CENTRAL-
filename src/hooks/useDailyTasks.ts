import {useEffect,useMemo,useState} from 'react'
import {dailyTaskRepository,type DailyTask} from '../services/dailyTaskRepository'

const nextDate=(value:string)=>{const date=new Date(`${value}T12:00:00`);date.setDate(date.getDate()+1);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}

export function useDailyTasks(){
 const [tasks,setTasks]=useState<DailyTask[]>(()=>dailyTaskRepository.list())
 useEffect(()=>dailyTaskRepository.save(tasks),[tasks])
 return useMemo(()=>({
  tasks,
  add(title:string,date:string){const value=title.trim();if(!value)return;const now=new Date().toISOString();setTasks(current=>[{id:crypto.randomUUID(),title:value,date,status:'PENDIENTE',createdAt:now,completedAt:null,deferredCount:0,previousDates:[]},...current])},
  toggle(id:string){setTasks(current=>current.map(task=>task.id!==id?task:{...task,status:task.status==='PENDIENTE'?'REALIZADO':'PENDIENTE',completedAt:task.status==='PENDIENTE'?new Date().toISOString():null}))},
  defer(id:string){setTasks(current=>current.map(task=>task.id!==id?task:{...task,date:nextDate(task.date),status:'PENDIENTE',completedAt:null,deferredCount:task.deferredCount+1,previousDates:[...task.previousDates,task.date]}))},
  remove(id:string){setTasks(current=>current.filter(task=>task.id!==id))},
 }),[tasks])
}
