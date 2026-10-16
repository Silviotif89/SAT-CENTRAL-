-- Base de datos para la votación del equipo Outstrip.
-- Ejecutar una vez en Supabase > SQL Editor.
-- Usa objetos exclusivos con prefijo rally_; no modifica las tablas de SAT.

create or replace function public.rally_scores_are_valid(value jsonb)
returns boolean
language sql
immutable
as $$
  select case when jsonb_typeof(value) = 'object' then
       (select count(*) = 9 from jsonb_object_keys(value))
       and value ?& array['1','2','3','4','5','6','7','8','9']
       and not exists (
         select 1
         from jsonb_each_text(value) as item(key, score)
         where item.key not in ('1','2','3','4','5','6','7','8','9')
            or item.score !~ '^(10|[1-9])$'
       )
     else false end;
$$;

create table if not exists public.rally_evaluations (
  evaluator_name text primary key,
  scores jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rally_evaluations_member_check check (evaluator_name in (
    'Liliana Dominga Pérez Rivera',
    'Ariel Rolando Talavera Urroz',
    'Kevin Gabriel Flores Aburto',
    'Samantha Paola Pérez Estrada',
    'Willian Alberto Pérez Martínez',
    'Dannia María Pérez Rivera',
    'Sebastián Ernesto Potoy',
    'Mentor/a'
  )),
  constraint rally_evaluations_scores_check check (public.rally_scores_are_valid(scores))
);

alter table public.rally_evaluations enable row level security;

drop policy if exists "Rally evaluations readable" on public.rally_evaluations;
drop policy if exists "Rally evaluations insertable" on public.rally_evaluations;
drop policy if exists "Rally evaluations updatable" on public.rally_evaluations;

create policy "Rally evaluations readable"
  on public.rally_evaluations for select
  to anon, authenticated
  using (true);

create policy "Rally evaluations insertable"
  on public.rally_evaluations for insert
  to anon, authenticated
  with check (true);

create policy "Rally evaluations updatable"
  on public.rally_evaluations for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.rally_evaluations to anon, authenticated;
