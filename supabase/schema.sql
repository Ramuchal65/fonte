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

-- Groupes d'exercices d'un jour donné : soit "classique" (1 exercice répété
-- sur plusieurs séries), soit "circuit" (plusieurs exercices enchaînés, répétés
-- sur plusieurs tours).
create table exercise_groups (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days(id) on delete cascade,
  position int not null default 0,
  type text not null check (type in ('classique', 'circuit')),
  rounds int not null default 3,       -- nb de séries (classique) ou de tours (circuit)
  rest_seconds int not null default 90 -- repos après chaque série / après chaque tour complet
);

-- Exercice(s) composant un groupe : un seul pour "classique", plusieurs pour "circuit"
create table group_exercises (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references exercise_groups(id) on delete cascade,
  position int not null default 0,
  name text not null,
  target_reps text not null default '8-12',
  target_weight_kg numeric
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
alter table exercise_groups enable row level security;
alter table group_exercises enable row level security;
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

create policy "own sessions" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own logged_sets" on logged_sets
  for all using (
    exists (select 1 from sessions s where s.id = logged_sets.session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from sessions s where s.id = logged_sets.session_id and s.user_id = auth.uid())
  );
