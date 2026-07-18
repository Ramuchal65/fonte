-- ============================================================
-- Schéma "Fonte" — suivi de musculation piloté par programme IA
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Programmes importés (un programme = un texte ChatGPT parsé)
create table programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_text text, -- texte brut collé, gardé pour référence
  created_at timestamptz not null default now(),
  archived_at timestamptz -- non supprimé, juste archivé quand on change de programme
);

-- Jours d'entraînement dans un programme (ex: "Push", "Pull", "Legs")
create table program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  label text not null,
  position int not null default 0
);

-- Exercices prévus pour un jour donné, avec cibles
create table planned_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days(id) on delete cascade,
  position int not null default 0,
  name text not null,
  target_sets int not null default 3,
  target_reps text not null default '8-12', -- texte car peut être "8-12", "AMRAP", "5"
  target_weight_kg numeric,
  rest_seconds int not null default 90,
  superset_group text -- exercices partageant la même valeur = même superset
);

-- Séances réellement effectuées
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_day_id uuid references program_days(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Séries loggées pendant une séance
create table logged_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_name text not null, -- dénormalisé volontairement : robuste si l'exercice planifié change/disparaît
  set_number int not null,
  reps int,
  weight_kg numeric,
  logged_at timestamptz not null default now()
);

-- Index pour la requête la plus fréquente : "dernière perf sur cet exercice"
create index idx_logged_sets_exercise on logged_sets (exercise_name, logged_at desc);
create index idx_sessions_user on sessions (user_id, started_at desc);

-- ============================================================
-- RLS : chacun ne voit que ses propres données
-- ============================================================
alter table programs enable row level security;
alter table program_days enable row level security;
alter table planned_exercises enable row level security;
alter table sessions enable row level security;
alter table logged_sets enable row level security;

create policy "own programs" on programs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own program_days" on program_days
  for all using (
    exists (select 1 from programs p where p.id = program_days.program_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from programs p where p.id = program_days.program_id and p.user_id = auth.uid())
  );

create policy "own planned_exercises" on planned_exercises
  for all using (
    exists (
      select 1 from program_days d
      join programs p on p.id = d.program_id
      where d.id = planned_exercises.program_day_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from program_days d
      join programs p on p.id = d.program_id
      where d.id = planned_exercises.program_day_id and p.user_id = auth.uid()
    )
  );

create policy "own sessions" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own logged_sets" on logged_sets
  for all using (
    exists (select 1 from sessions s where s.id = logged_sets.session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from sessions s where s.id = logged_sets.session_id and s.user_id = auth.uid())
  );
