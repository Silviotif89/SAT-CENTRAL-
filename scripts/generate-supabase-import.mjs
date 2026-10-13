import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [inputPath, outputPath] = process.argv.slice(2)
if (!inputPath || !outputPath) {
  throw new Error('Uso: node scripts/generate-supabase-import.mjs <respaldo.json> <instalacion.sql>')
}

const backup = JSON.parse(await readFile(resolve(inputPath), 'utf8'))
if (backup?.format !== 'sat-intur-local-backup' || !Array.isArray(backup?.data?.activities)) {
  throw new Error('El archivo no es un respaldo local válido del SAT.')
}

// El delimitador se genera de forma determinista y se valida para que el JSON
// pueda permanecer íntegro dentro de un literal SQL de dólar.
let tag = 'SAT_BACKUP_JSON'
while (JSON.stringify(backup).includes(`$${tag}$`)) tag += '_X'
const json = JSON.stringify(backup)
const label = `respaldo-local-${backup.exportedAt ?? 'sin-fecha'}`.replace(/'/g, "''")

const sql = `-- SAT INTUR · instalación y recuperación desde respaldo local
-- Generado a partir del respaldo: ${backup.exportedAt ?? 'fecha no disponible'}
-- Este archivo NO borra tablas ni registros existentes. Es seguro ejecutarlo otra vez.
-- Ejecutar completo en Supabase: SQL Editor > New query > Run.

begin;

create extension if not exists pgcrypto;

create table if not exists public.sat_backup_imports (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  exported_at timestamptz,
  payload jsonb not null,
  imported_at timestamptz not null default now()
);

create table if not exists public.sat_delegations (
  id text primary key,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.sat_activities (
  id text primary key,
  delegation_id text not null references public.sat_delegations(id),
  topic text not null,
  activity_type text not null,
  activity_date date not null,
  activity_time text not null default '',
  municipality text not null default '',
  location text not null default '',
  responsible text not null default '',
  institution text not null default '',
  modality text not null default '',
  training_provider text not null default '',
  ddt_facilitator text not null default '',
  projected_participants integer not null default 0 check (projected_participants >= 0),
  status text not null check (status in ('PROGRAMADA','DESARROLLADA','CANCELADA','REPROGRAMADA')),
  men integer check (men is null or men >= 0),
  women integer check (women is null or women >= 0),
  total_participants integer check (total_participants is null or total_participants >= 0),
  summary text not null default '',
  observations text not null default '',
  cancellation_reason text not null default '',
  reschedule_reason text not null default '',
  original_date date,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb not null,
  migrated_at timestamptz not null default now()
);

create table if not exists public.sat_activity_reports (
  id text primary key,
  activity_id text not null unique references public.sat_activities(id) on delete cascade,
  men integer not null check (men >= 0),
  women integer not null check (women >= 0),
  total_participants integer not null check (total_participants >= 0),
  summary text not null default '',
  observations text not null default '',
  reported_at_text text,
  payload jsonb not null,
  migrated_at timestamptz not null default now()
);

create table if not exists public.sat_daily_tasks (
  id text primary key,
  task_date date not null,
  title text not null,
  status text not null check (status in ('PENDIENTE','REALIZADO')),
  completed_at timestamptz,
  deferred_count integer not null default 0 check (deferred_count >= 0),
  previous_dates jsonb not null default '[]'::jsonb,
  payload jsonb not null,
  migrated_at timestamptz not null default now()
);

create table if not exists public.sat_transport_drafts (
  activity_id text primary key references public.sat_activities(id) on delete cascade,
  payload jsonb not null,
  migrated_at timestamptz not null default now()
);

create or replace function public.import_sat_local_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  draft_key text;
  draft jsonb;
  imported_activities integer := 0;
  imported_reports integer := 0;
  imported_tasks integer := 0;
  imported_drafts integer := 0;
begin
  if p_backup->>'format' <> 'sat-intur-local-backup' then
    raise exception 'Formato de respaldo SAT no válido';
  end if;

  for item in select value from jsonb_array_elements(coalesce(p_backup->'data'->'activities', '[]'::jsonb)) loop
    if nullif(item->>'id', '') is null or nullif(item->>'delegationId', '') is null then
      raise exception 'Actividad sin id o delegación: %', item;
    end if;
    insert into sat_delegations (id)
    values (item->>'delegationId')
    on conflict (id) do nothing;

    insert into sat_activities (
      id, delegation_id, topic, activity_type, activity_date, activity_time, municipality, location,
      responsible, institution, modality, training_provider, ddt_facilitator, projected_participants,
      status, men, women, total_participants, summary, observations, cancellation_reason,
      reschedule_reason, original_date, created_at, updated_at, payload
    ) values (
      item->>'id', item->>'delegationId', coalesce(item->>'topic',''), coalesce(item->>'activityType',''),
      (item->>'date')::date, coalesce(item->>'time',''), coalesce(item->>'municipality',''), coalesce(item->>'location',''),
      coalesce(item->>'responsible',''), coalesce(item->>'institution',''), coalesce(item->>'modality',''),
      coalesce(item->>'trainingProvider',''), coalesce(item->>'ddtFacilitator',''), coalesce((item->>'projectedParticipants')::integer,0),
      coalesce(item->>'status','PROGRAMADA'), nullif(item->>'men','')::integer, nullif(item->>'women','')::integer,
      nullif(item->>'totalParticipants','')::integer, coalesce(item->>'summary',''), coalesce(item->>'observations',''),
      coalesce(item->>'cancellationReason',''), coalesce(item->>'rescheduleReason',''), nullif(item->>'originalDate','')::date,
      nullif(item->>'createdAt','')::timestamptz, nullif(item->>'updatedAt','')::timestamptz, item
    ) on conflict (id) do update set
      delegation_id=excluded.delegation_id, topic=excluded.topic, activity_type=excluded.activity_type,
      activity_date=excluded.activity_date, activity_time=excluded.activity_time, municipality=excluded.municipality,
      location=excluded.location, responsible=excluded.responsible, institution=excluded.institution,
      modality=excluded.modality, training_provider=excluded.training_provider, ddt_facilitator=excluded.ddt_facilitator,
      projected_participants=excluded.projected_participants, status=excluded.status, men=excluded.men, women=excluded.women,
      total_participants=excluded.total_participants, summary=excluded.summary, observations=excluded.observations,
      cancellation_reason=excluded.cancellation_reason, reschedule_reason=excluded.reschedule_reason,
      original_date=excluded.original_date, created_at=excluded.created_at, updated_at=excluded.updated_at,
      payload=sat_activities.payload || excluded.payload, migrated_at=now();
    imported_activities := imported_activities + 1;

    if jsonb_typeof(item->'report') = 'object' then
      insert into sat_activity_reports (id, activity_id, men, women, total_participants, summary, observations, reported_at_text, payload)
      values (
        item->'report'->>'id', item->>'id', coalesce((item->'report'->>'men')::integer, 0),
        coalesce((item->'report'->>'women')::integer, 0), coalesce((item->'report'->>'totalParticipants')::integer, 0),
        coalesce(item->'report'->>'summary',''), coalesce(item->'report'->>'observations',''),
        item->'report'->>'reportedAt', item->'report'
      ) on conflict (id) do update set
        activity_id=excluded.activity_id, men=excluded.men, women=excluded.women,
        total_participants=excluded.total_participants, summary=excluded.summary, observations=excluded.observations,
        reported_at_text=excluded.reported_at_text, payload=sat_activity_reports.payload || excluded.payload,
        migrated_at=now();
      imported_reports := imported_reports + 1;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_backup->'data'->'dailyTasks', '[]'::jsonb)) loop
    insert into sat_daily_tasks (id, task_date, title, status, completed_at, deferred_count, previous_dates, payload)
    values (
      item->>'id', (item->>'date')::date, coalesce(item->>'title',''), coalesce(item->>'status','PENDIENTE'),
      nullif(item->>'completedAt','')::timestamptz, coalesce((item->>'deferredCount')::integer,0),
      case when jsonb_typeof(item->'previousDates')='array' then item->'previousDates' else '[]'::jsonb end, item
    ) on conflict (id) do update set
      task_date=excluded.task_date, title=excluded.title, status=excluded.status, completed_at=excluded.completed_at,
      deferred_count=excluded.deferred_count, previous_dates=excluded.previous_dates,
      payload=sat_daily_tasks.payload || excluded.payload, migrated_at=now();
    imported_tasks := imported_tasks + 1;
  end loop;

  for draft_key, draft in select key, value from jsonb_each(coalesce(p_backup->'data'->'transportDrafts', '{}'::jsonb)) loop
    if exists (select 1 from sat_activities where id = draft_key) then
      insert into sat_transport_drafts (activity_id, payload) values (draft_key, draft)
      on conflict (activity_id) do update set payload=sat_transport_drafts.payload || excluded.payload, migrated_at=now();
      imported_drafts := imported_drafts + 1;
    end if;
  end loop;

  return jsonb_build_object('activities',imported_activities,'reports',imported_reports,'dailyTasks',imported_tasks,'transportDrafts',imported_drafts);
end;
$$;

-- La app no podrá leer ni modificar datos hasta que se conecte con autenticación y políticas específicas.
alter table public.sat_backup_imports enable row level security;
alter table public.sat_delegations enable row level security;
alter table public.sat_activities enable row level security;
alter table public.sat_activity_reports enable row level security;
alter table public.sat_daily_tasks enable row level security;
alter table public.sat_transport_drafts enable row level security;

insert into public.sat_backup_imports (label, exported_at, payload)
values ('${label}', ${(backup.exportedAt ? `'${backup.exportedAt.replace(/'/g, "''")}'::timestamptz` : 'null')}, $${tag}$${json}$${tag}$::jsonb)
on conflict (label) do update set payload=excluded.payload, exported_at=excluded.exported_at, imported_at=now();

select public.import_sat_local_backup(payload)
from public.sat_backup_imports
where label='${label}';

-- Comprobación esperada: 113 actividades, 45 reportes individuales, 6 tareas y 9 borradores.
select
  (select count(*) from public.sat_activities) as activities,
  (select count(*) from public.sat_activity_reports) as reports,
  (select count(*) from public.sat_daily_tasks) as daily_tasks,
  (select count(*) from public.sat_transport_drafts) as transport_drafts;

commit;
`

await writeFile(resolve(outputPath), sql, 'utf8')
console.log(`Archivo creado: ${resolve(outputPath)} (${backup.data.activities.length} actividades).`)
