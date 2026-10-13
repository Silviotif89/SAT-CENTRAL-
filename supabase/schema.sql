-- Estructura inicial de referencia. Revisar en un proyecto de pruebas antes de producción.
create type public.user_role as enum ('ADMIN','NIVEL_CENTRAL','DELEGADO');
create type public.activity_status as enum ('PROGRAMADA','DESARROLLADA','CANCELADA','REPROGRAMADA');

create table public.delegations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  delegation_id uuid references public.delegations(id),
  constraint delegate_has_delegation check (role <> 'DELEGADO' or delegation_id is not null)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(), delegation_id uuid not null references public.delegations(id),
  topic text not null, activity_type text not null, activity_date date not null, activity_time time not null,
  municipality text not null, location text not null, responsible text not null, institution text, modality text not null,
  training_provider text not null check (training_provider in ('MIFIC','MINSA','SETEC','BOMBEROS','POLICÍA','INATEC','DDT (INTUR)')),
  ddt_facilitator text,
  constraint ddt_facilitator_required check (training_provider <> 'DDT (INTUR)' or nullif(trim(ddt_facilitator),'') is not null),
  projected_participants integer not null check (projected_participants >= 0), status public.activity_status not null default 'PROGRAMADA',
  summary text, observations text, cancellation_reason text, reschedule_reason text, original_date date,
  created_by uuid references public.user_profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.activity_reports (
  id uuid primary key default gen_random_uuid(), activity_id uuid not null unique references public.activities(id) on delete cascade,
  men integer not null check (men >= 0), women integer not null check (women >= 0),
  total_participants integer generated always as (men + women) stored,
  summary text not null, observations text, reported_at timestamptz not null default now()
);

create table public.activity_status_history (
  id uuid primary key default gen_random_uuid(), activity_id uuid not null references public.activities(id) on delete cascade,
  from_status public.activity_status not null, to_status public.activity_status not null, reason text,
  changed_by uuid references public.user_profiles(id), changed_at timestamptz not null default now()
);

alter table public.delegations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.activities enable row level security;
alter table public.activity_reports enable row level security;
alter table public.activity_status_history enable row level security;

-- Las políticas completas deben probarse con usuarios reales. Regla central prevista:
-- ADMIN y NIVEL_CENTRAL acceden a todas las delegaciones; DELEGADO solo a filas donde
-- activities.delegation_id = user_profiles.delegation_id. Nunca depender solo de la UI.
