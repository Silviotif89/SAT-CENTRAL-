import { STATUS_CLASS,STATUS_LABEL } from '../lib/activity'
import type { ActivityStatus } from '../types'
export function StatusBadge({status}:{status:ActivityStatus}){return <span className={`status ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>}
