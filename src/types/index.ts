export type ActivityStatus = 'PROGRAMADA' | 'DESARROLLADA' | 'CANCELADA' | 'REPROGRAMADA'
export type PlanReviewStatus = 'PENDIENTE' | 'CONFIRMADA' | 'REPROGRAMADA' | 'CANCELADA'
export type WeeklyReportStatus = 'PENDIENTE' | 'CONFIRMADA' | 'EXCLUIDA'
export type UserRole = 'ADMIN' | 'NIVEL_CENTRAL' | 'DELEGADO'

export interface Delegation { id: string; name: string }
export interface ActivityReport { id:string; activityId:string; men:number; women:number; totalParticipants:number; summary:string; observations:string; reportedAt:string }
export interface ActivityStatusHistory { id:string; activityId:string; from:ActivityStatus; to:ActivityStatus; reason?:string; changedAt:string }
export interface UserProfile { id:string; fullName:string; role:UserRole; delegationId?:string }

export interface Activity {
  id:string; delegationId:string; topic:string; activityType:string; date:string; time:string;
  municipality:string; location:string; responsible:string; institution:string; modality:string;
  trainingProvider:string; ddtFacilitator:string;
  projectedParticipants:number; status:ActivityStatus; men:number|null; women:number|null;
  totalParticipants:number|null; summary:string; observations:string; cancellationReason:string;
  rescheduleReason:string; originalDate:string|null; createdAt:string; updatedAt:string; isDemo?:boolean;
  report?:ActivityReport; statusHistory:ActivityStatusHistory[];
  planReviewStatus?:PlanReviewStatus; planReviewedAt?:string;
  weeklyReportStatus?:WeeklyReportStatus; weeklyReportReviewedAt?:string;
}

export type NewActivity = Pick<Activity,'delegationId'|'topic'|'activityType'|'date'|'time'|'municipality'|'location'|'responsible'|'institution'|'modality'|'trainingProvider'|'ddtFacilitator'|'projectedParticipants'|'observations'>
