import { X } from 'lucide-react'
import type { ReactNode } from 'react'
export function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}){return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}><section className={`modal ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X/></button></header>{children}</section></div>}
