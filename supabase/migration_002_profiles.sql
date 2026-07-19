-- ============================================================
-- Migration : profils utilisateurs (pseudo + avatar personnalisable)
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- ============================================================

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null unique,
  avatar jsonb not null default '{
    "skinTone": "light",
    "hairstyle": "short",
    "hairColor": "brown",
    "glasses": false,
    "facialHair": "none",
    "outfit": 0,
    "shoeColor": "white"
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contrainte de format simple sur le pseudo : 3 à 20 caractères, lettres/chiffres/_/-
alter table profiles add constraint pseudo_format check (pseudo ~ '^[a-zA-Z0-9_-]{3,20}$');

alter table profiles enable row level security;

-- Chacun ne peut lire/modifier que son propre profil.
-- (L'unicité du pseudo est garantie par la contrainte UNIQUE ci-dessus,
-- pas besoin de pouvoir lire les profils des autres pour la vérifier :
-- une tentative sur un pseudo pris renvoie simplement une erreur.)
create policy "own profile" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
