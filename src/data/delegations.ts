import type { Delegation } from '../types'

const names = ['Boaco','Carazo','Chinandega','Chontales','Estelí','Granada','Jinotega','León','Madriz','Managua','Masaya','Matagalpa','Nueva Segovia','Río San Juan','Rivas','RACCN','RACCS']
export const delegations: Delegation[] = names.map((name, index) => ({ id:`del-${String(index+1).padStart(2,'0')}`, name }))
export const delegationName = (id:string) => delegations.find(d=>d.id===id)?.name ?? 'Sin delegación'
