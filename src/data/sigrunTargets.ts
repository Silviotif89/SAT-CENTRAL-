export const SIGRUN_MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'] as const

export type SigrunMonth = typeof SIGRUN_MONTHS[number]

export interface SigrunTarget {
  delegationId: string
  meta: number[]
  cum: number[]
}

// Fuente: ReportListadoDeMetasSoloMetasCumpD (3)(1).xls, programación 2026.
// Cada posición corresponde a enero-diciembre. Los ceros conservan los meses sin CUM oficial.
export const sigrunTargets: SigrunTarget[] = [
  {delegationId:'del-16',meta:[25,50,60,50,50,50,50,50,50,50,50,25],cum:[56,25,88,153,78,85,8,118,0,0,0,0]},
  {delegationId:'del-02',meta:[30,50,60,60,50,50,50,50,50,50,50,50],cum:[47,59,56,43,61,68,29,77,0,0,0,0]},
  {delegationId:'del-03',meta:[30,90,180,90,90,90,90,90,90,90,70,0],cum:[33,112,199,168,90,52,55,100,0,0,0,0]},
  {delegationId:'del-01',meta:[40,50,50,50,50,50,50,50,50,50,45,25],cum:[45,42,64,58,24,26,45,52,0,0,0,0]},
  {delegationId:'del-15',meta:[40,60,30,120,120,120,120,120,100,50,20,0],cum:[48,199,190,76,94,30,37,97,0,0,0,0]},
  {delegationId:'del-07',meta:[50,50,30,30,60,60,60,60,40,40,40,30],cum:[26,21,51,27,17,47,66,15,0,0,0,0]},
  {delegationId:'del-14',meta:[50,50,80,60,60,60,60,60,90,90,80,0],cum:[46,150,55,16,50,20,57,50,0,0,0,0]},
  {delegationId:'del-09',meta:[50,70,80,60,60,60,60,60,60,60,50,0],cum:[94,65,112,50,54,57,134,73,0,0,0,0]},
  {delegationId:'del-06',meta:[50,70,90,40,70,70,70,70,70,70,50,20],cum:[44,56,144,61,78,91,104,127,0,0,0,0]},
  {delegationId:'del-08',meta:[50,75,75,100,100,75,75,100,100,50,50,50],cum:[39,101,139,83,227,150,123,109,0,0,0,0]},
  {delegationId:'del-05',meta:[50,80,80,40,70,60,70,60,60,70,60,20],cum:[22,44,64,25,137,46,80,44,0,0,0,0]},
  {delegationId:'del-04',meta:[50,80,80,50,80,80,70,70,70,70,50,0],cum:[28,89,59,87,49,44,58,63,0,0,0,0]},
  {delegationId:'del-12',meta:[50,80,90,40,90,90,80,90,70,80,70,0],cum:[29,95,248,121,99,56,44,16,0,0,0,0]},
  {delegationId:'del-13',meta:[60,60,60,60,60,60,60,60,60,50,50,30],cum:[57,88,76,72,71,65,108,41,0,0,0,0]},
  {delegationId:'del-17',meta:[70,70,70,70,50,60,60,60,50,40,40,0],cum:[20,102,52,36,47,33,14,77,0,0,0,0]},
  {delegationId:'del-11',meta:[120,110,100,70,70,70,75,45,50,60,50,0],cum:[160,246,184,58,174,91,69,137,0,0,0,0]},
  {delegationId:'del-10',meta:[170,170,180,180,150,170,150,180,100,180,150,120],cum:[200,268,157,168,153,68,120,266,0,0,0,0]},
]
