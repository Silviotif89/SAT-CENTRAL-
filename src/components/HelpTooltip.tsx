import {useEffect,useRef,useState,type FocusEvent,type PointerEvent,type ReactNode} from 'react'

type TooltipState={text:string;left:number;top:number;below:boolean}

const interactiveSelector='[data-tooltip],button,input,select,textarea'

function tooltipText(element:HTMLElement){
 const explicit=element.dataset.tooltip?.trim()
 if(explicit)return explicit
 const described=element.getAttribute('aria-label')?.trim()||element.getAttribute('title')?.trim()
 if(described)return described
 if(element instanceof HTMLInputElement){
  if(element.type==='month')return 'Seleccione el mes que desea consultar.'
  if(element.type==='date')return 'Seleccione la fecha correspondiente.'
  if(element.type==='number')return 'Ingrese el valor numérico solicitado.'
  return element.placeholder?.trim()||'Ingrese la información solicitada.'
 }
 if(element instanceof HTMLSelectElement)return 'Abra la lista para seleccionar una opción.'
 if(element instanceof HTMLTextAreaElement)return element.placeholder?.trim()||'Escriba aquí la información complementaria.'
 const label=element.innerText.replace(/\s+/g,' ').trim()
 if(!label)return ''
 if(/descargar|exportar/i.test(label))return 'Genera y descarga el archivo con la información mostrada.'
 if(/editar/i.test(label))return 'Permite corregir o actualizar la información registrada.'
 if(/reportar/i.test(label))return 'Abre el formulario para registrar los resultados de la actividad.'
 if(/reprogramar/i.test(label))return 'Permite asignar una nueva fecha a la actividad.'
 if(/cancelar/i.test(label))return 'Permite registrar la cancelación y su motivo.'
 return `Seleccione esta opción para ${label.toLocaleLowerCase('es-NI')}.`
}

export function HelpTooltip({children}:{children:ReactNode}){
 const [tooltip,setTooltip]=useState<TooltipState|null>(null),timer=useRef<number|null>(null)
 const hide=()=>{if(timer.current!==null)window.clearTimeout(timer.current);timer.current=null;setTooltip(null)}
 const show=(target:EventTarget|null)=>{
  if(!(target instanceof Element))return
  const element=target.closest<HTMLElement>(interactiveSelector)
  if(!element)return
  const text=tooltipText(element)
  if(!text)return
  const rect=element.getBoundingClientRect(),below=rect.top<90
  if(timer.current!==null)window.clearTimeout(timer.current)
  setTooltip({text,left:Math.max(150,Math.min(window.innerWidth-150,rect.left+rect.width/2)),top:below?rect.bottom+10:rect.top-10,below})
  timer.current=window.setTimeout(()=>setTooltip(null),4000)
 }
 const pointerOver=(event:PointerEvent<HTMLDivElement>)=>{
  const element=(event.target as Element).closest?.(interactiveSelector)
  if(element&&event.relatedTarget instanceof Node&&element.contains(event.relatedTarget))return
  show(event.target)
 }
 const pointerOut=(event:PointerEvent<HTMLDivElement>)=>{
  const element=(event.target as Element).closest?.(interactiveSelector)
  if(element&&event.relatedTarget instanceof Node&&element.contains(event.relatedTarget))return
  hide()
 }
 const focus=(event:FocusEvent<HTMLDivElement>)=>show(event.target)
 const blur=(event:FocusEvent<HTMLDivElement>)=>{if(!event.currentTarget.contains(event.relatedTarget))hide();else hide()}
 useEffect(()=>()=>{if(timer.current!==null)window.clearTimeout(timer.current)},[])
 return <div onPointerOver={pointerOver} onPointerOut={pointerOut} onFocusCapture={focus} onBlurCapture={blur}>
  {children}
  {tooltip&&<div role="tooltip" className={`help-tooltip${tooltip.below?' below':''}`} style={{left:tooltip.left,top:tooltip.top}}>{tooltip.text}</div>}
 </div>
}
