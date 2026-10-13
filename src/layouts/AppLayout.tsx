import { BarChart3,CalendarDays,ChevronRight,ClipboardCheck,ClipboardList,FileBarChart,Home,MapPinned,Menu,NotebookTabs,PanelLeftClose,Settings,ShieldCheck,Target,Truck,X } from 'lucide-react'
import { useState,type ReactNode } from 'react'
import {HelpTooltip} from '../components/HelpTooltip'
import {SAT_LAST_UPDATED,SAT_VERSION} from '../config/version'
export type PageKey='dashboard'|'calendar'|'activities'|'weekly-plan'|'transport-requests'|'weekly-report'|'monthly-plan'|'department-summary'|'sigrun'|'reports'|'data-quality'
const items:{key:PageKey;label:string;help:string;icon:typeof Home}[]=[
 {key:'dashboard',label:'Inicio',help:'Muestra el resumen y los resultados del mes seleccionado.',icon:Home},
 {key:'calendar',label:'Calendario',help:'Consulta las capacitaciones organizadas por fecha y estado.',icon:CalendarDays},
 {key:'activities',label:'Actividades',help:'Busca, filtra y revisa todas las actividades registradas.',icon:ClipboardList},
 {key:'weekly-plan',label:'Plan semanal',help:'Prepara y descarga la programación de una semana.',icon:NotebookTabs},
 {key:'transport-requests',label:'Solicitudes transporte',help:'Completa y genera las solicitudes semanales de transporte para actividades DDT.',icon:Truck},
 {key:'weekly-report',label:'Informe semanal',help:'Genera el informe de las actividades desarrolladas en la semana.',icon:ClipboardCheck},
 {key:'monthly-plan',label:'Plan mensual',help:'Consulta y descarga la planificación consolidada del mes.',icon:BarChart3},
 {key:'department-summary',label:'Resumen departamental',help:'Compara resultados y actividades por delegación.',icon:MapPinned},
 {key:'sigrun',label:'SIGRUN',help:'Da seguimiento a las metas y al cumplimiento institucional.',icon:Target},
 {key:'reports',label:'Reportes',help:'Consulta resultados consolidados y exporta la base completa.',icon:FileBarChart},
 {key:'data-quality',label:'Calidad y respaldo',help:'Revisa alertas de datos y protege la información guardada en este equipo.',icon:ShieldCheck}
]
export function AppLayout({page,onNavigate,children,onNew}:{page:PageKey;onNavigate:(p:PageKey)=>void;children:ReactNode;onNew:()=>void}){const [open,setOpen]=useState(false);const go=(p:PageKey)=>{onNavigate(p);setOpen(false)};return <HelpTooltip><div className="app-shell"><aside className={open?'sidebar open':'sidebar'}><div className="brand"><img src="/logo-intur-nicaragua.png" alt="Instituto Nicaragüense de Turismo"/><span>Sistema de Acompañamiento Técnico</span></div><nav>{items.map(({key,label,help,icon:Icon})=><button key={key} data-tooltip={help} className={page===key?'active':''} onClick={()=>go(key)}><Icon/>{label}{page===key&&<ChevronRight className="nav-arrow"/>}</button>)}</nav><div className="future"><span>Próximamente</span><strong><Settings/> Administración</strong><small>Usuarios, roles y permisos</small></div></aside>{open&&<button className="scrim" onClick={()=>setOpen(false)} aria-label="Cerrar menú"/>}<main><div className="topbar"><button className="menu-button" data-tooltip="Abre o cierra el menú principal." onClick={()=>setOpen(v=>!v)}>{open?<X/>:<Menu/>}</button><div className="workspace-label"><PanelLeftClose/><span>INTUR · Gestión territorial</span></div><button className="button primary compact" data-tooltip="Abre el formulario para programar una nueva actividad." onClick={onNew}>+ Nueva actividad</button></div><div className="page-content">{children}</div><footer className="app-footer"><span>Desarrollado por <strong>Silvio Rodríguez</strong> · 87011340</span><span>SAT versión <strong>{SAT_VERSION}</strong> · Última actualización: {SAT_LAST_UPDATED}</span></footer></main></div></HelpTooltip>}
