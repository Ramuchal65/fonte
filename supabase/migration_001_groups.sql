-- ============================================================
-- Migration : remplace planned_exercises par un modèle qui distingue
-- séries classiques (1 exercice répété) et circuits (plusieurs
-- exercices enchaînés par tour).
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- Les séances et séries déjà loggées (sessions, logged_sets) ne sont pas touchées.
-- ============================================================

drop table if exists planned_exercises;

create table exercise_groups (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days(id) on delete cascade,
  position int not null default 0,
  type text not null check (type in ('classique', 'circuit')),
  rounds int not null default 3,       -- nb de séries (classique) ou de tours (circuit)
  rest_seconds int not null default 90 -- repos après chaque série / après chaque tour complet
);

create table group_exercises (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references exercise_groups(id) on delete cascade,
  position int not null default 0,
  name text not null,
  target_reps text not null default '8-12',
  target_weight_kg numeric
);

alter table exercise_groups enable row level security;
alter table group_exercises enable row level security;

create policy "own exercise_groups" on exercise_groups
  for all using (
    exists (select 1 from program_days d join programs p on p.id = d.program_id
            where d.id = exercise_groups.program_day_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from program_days d join programs p on p.id = d.program_id
            where d.id = exercise_groups.program_day_id and p.user_id = auth.uid())
  );

create policy "own group_exercises" on group_exercises
  for all using (
    exists (select 1 from exercise_groups g
            join program_days d on d.id = g.program_day_id
            join programs p on p.id = d.program_id
            where g.id = group_exercises.group_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from exercise_groups g
            join program_days d on d.id = g.program_day_id
            join programs p on p.id = d.program_id
            where g.id = group_exercises.group_id and p.user_id = auth.uid())
  );
