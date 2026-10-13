declare const __SAT_VERSION__:string
declare const __SAT_BUILD_TIME__:string

export const SAT_VERSION=__SAT_VERSION__
export const SAT_LAST_UPDATED=new Intl.DateTimeFormat('es-NI',{
  day:'2-digit',
  month:'2-digit',
  year:'numeric',
  hour:'2-digit',
  minute:'2-digit',
  hour12:true,
}).format(new Date(__SAT_BUILD_TIME__))
