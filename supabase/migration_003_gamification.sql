-- ============================================================
-- Migration : gamification (succès + salle de sport évolutive)
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- Dépend de : auth.users, sessions (déjà existantes dans schema.sql)
-- ============================================================


-- ============================================================
-- 1. CATÉGORIES DE SALLE
-- ============================================================
create table gym_categories (
  id serial primary key,
  slug text unique not null,           -- 'garage' | 'salle_perso' | 'grande_salle' | 'complexe_franchise'
  display_name text not null,
  order_index int not null,            -- 1,2,3,4 : ordre de progression entre catégories
  max_level int not null,              -- niveau max = nb d'équipements de la catégorie (10/20/30/40)
  equipment_count int not null,
  room_image_path text                 -- image de fond de la salle vide, ex: '/rooms/garage_empty.png'
);

insert into gym_categories (slug, display_name, order_index, max_level, equipment_count, room_image_path) values
  ('garage', 'Garage', 1, 10, 10, '/rooms/garage_empty.png'),
  ('salle_perso', 'Salle perso', 2, 20, 20, null),
  ('grande_salle', 'Grande salle', 3, 30, 30, null),
  ('complexe_franchise', 'Complexe franchisé', 4, 40, 40, null);


-- ============================================================
-- 2. CATALOGUE D'ÉQUIPEMENTS
-- ============================================================
-- x_px / y_px / w_px / h_px : rectangle de placement exact du PNG
-- (calque déjà pré-recadré avec sa propre marge), sur un canvas de
-- référence de canvas_size x canvas_size pixels. Le front doit donc
-- toujours afficher room + équipements sur un carré de ce ratio,
-- puis mettre à l'échelle uniformément.
create table gym_equipment (
  id serial primary key,
  category_id int not null references gym_categories(id),
  slug text not null,
  display_name text not null,
  image_path text,                     -- ex: '/equipment/garage/dumbbells.png'
  canvas_size int not null default 1400,
  x_px int, y_px int, w_px int, h_px int,
  flip_h boolean not null default false,
  unique(category_id, slug)
);

-- Les 10 équipements du Garage, avec leurs coordonnées exactes
-- (extraites du PowerPoint de positionnement, puis mises à l'échelle
-- sur un canvas de référence de 1400x1400 — les PNG livrés dans
-- public/equipment/garage/ et public/rooms/garage_empty.png sont
-- déjà à cette échelle).
insert into gym_equipment (category_id, slug, display_name, image_path, x_px, y_px, w_px, h_px, flip_h)
select gc.id, v.slug, v.display_name, '/equipment/garage/' || v.slug || '.png', v.x, v.y, v.w, v.h, v.flip
from gym_categories gc, (values
  ('dumbbells',  'Haltères',         727, 801, 226, 226, false),
  ('pullupbar',  'Barre de traction',737, 461, 272, 420, false),
  ('bench',      'Banc',             670, 672, 242, 238, false),
  ('barbell',    'Barre chargée',    895, 934, 226, 182, false),
  ('plates',     'Disques',          546, 635, 127, 130, false),
  ('kettlebell', 'Kettlebell',       1097,877, 164, 154, false),
  ('rope',       'Corde à sauter',   483, 934, 174, 122, false),
  ('radio',      'Radio / boombox',  422, 661, 127, 128, true),
  ('mirror',     'Miroir',           914, 363, 261, 337, true),
  ('mat',        'Tapis',            516, 742, 169, 132, true)
) as v(slug, display_name, x, y, w, h, flip)
where gc.slug = 'garage';

-- Les 3 autres salles (20/30/40 équipements) : à compléter plus tard
-- avec le même pattern insert une fois leurs PPTX de positionnement faits.


-- ============================================================
-- 3. PROGRESSION DE L'UTILISATEUR (XP, niveau, catégorie actuelle)
-- ============================================================
create table user_progression (
  user_id uuid primary key references auth.users(id) on delete cascade,
  category_id int not null references gym_categories(id) default 1,
  level_in_category int not null default 0,   -- 0 = aucun équipement débloqué pour l'instant
  xp_into_level int not null default 0,       -- XP accumulée depuis le dernier niveau
  total_xp bigint not null default 0,         -- XP cumulée depuis toujours (stat affichable)
  pending_choices int not null default 0,     -- nb de choix d'équipement en attente (montées de niveau non résolues)
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 4. ÉQUIPEMENTS DÉBLOQUÉS PAR L'UTILISATEUR
-- ============================================================
-- La salle finale est identique pour tous dans une catégorie donnée ;
-- seul unlock_order (l'ordre d'obtention) varie d'un utilisateur à l'autre.
create table user_equipment_unlocked (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  equipment_id int not null references gym_equipment(id),
  unlock_order int not null,
  unlocked_at timestamptz not null default now(),
  unique(user_id, equipment_id)
);


-- ============================================================
-- 5. HISTORIQUE DES GAINS D'XP (audit / affichage courbe de progression)
-- ============================================================
create table xp_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  sets_logged int not null,
  xp_earned int not null,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 6. SUCCÈS (ACHIEVEMENTS)
-- ============================================================
create table achievements (
  id serial primary key,
  slug text unique not null,
  category text not null,              -- 'assiduite' | 'performance' | 'programme' | 'avatar' | 'salle'
  title text not null,
  description text not null,
  icon text,
  condition_type text not null,        -- logique de détection gérée côté appli
  condition_value int
);

create table user_achievements (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id int not null references achievements(id),
  unlocked_at timestamptz not null default now(),
  unique(user_id, achievement_id)
);

-- Table prête, vide pour l'instant : renvoie-moi la liste de succès
-- déjà rédigée et je l'insère ici en une passe.


-- ============================================================
-- 7. SÉCURITÉ (Row Level Security)
-- ============================================================
alter table user_progression enable row level security;
alter table user_equipment_unlocked enable row level security;
alter table xp_events enable row level security;
alter table user_achievements enable row level security;
alter table gym_categories enable row level security;
alter table gym_equipment enable row level security;
alter table achievements enable row level security;

create policy "own progression" on user_progression
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own equipment" on user_equipment_unlocked
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own xp events" on xp_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own achievements" on user_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "public read categories" on gym_categories for select using (true);
create policy "public read equipment" on gym_equipment for select using (true);
create policy "public read achievements" on achievements for select using (true);


-- ============================================================
-- 8. LOGIQUE MÉTIER (fonctions SQL)
-- ============================================================

create or replace function xp_required_for_level(level_n int)
returns int language sql immutable as $$
  select level_n * 150;
$$;


-- À appeler juste après avoir marqué une séance comme terminée
-- (sessions.finished_at renseigné). Gère l'XP, la montée de niveau,
-- et le passage automatique à la catégorie suivante une fois la
-- catégorie en cours entièrement complétée. Ne débloque PAS
-- l'équipement automatiquement : incrémente pending_choices, à
-- résoudre ensuite via choose_equipment().
create or replace function add_xp_and_check_levelup(p_user_id uuid, p_sets_logged int, p_session_id uuid default null)
returns table(leveled_up boolean, new_level int, new_category_id int, pending_choices int)
language plpgsql security definer as $$
declare
  v_xp_gained int := p_sets_logged * 10;
  v_prog record;
  v_needed int;
  v_max_level int;
  v_next_cat int;
  v_leveled boolean := false;
begin
  insert into user_progression (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_prog from user_progression where user_id = p_user_id for update;

  insert into xp_events (user_id, session_id, sets_logged, xp_earned)
  values (p_user_id, p_session_id, p_sets_logged, v_xp_gained);

  v_prog.xp_into_level := v_prog.xp_into_level + v_xp_gained;
  v_prog.total_xp := v_prog.total_xp + v_xp_gained;

  loop
    select max_level into v_max_level from gym_categories where id = v_prog.category_id;
    exit when v_prog.level_in_category >= v_max_level;

    v_needed := xp_required_for_level(v_prog.level_in_category + 1);
    exit when v_prog.xp_into_level < v_needed;

    v_prog.xp_into_level := v_prog.xp_into_level - v_needed;
    v_prog.level_in_category := v_prog.level_in_category + 1;
    v_prog.pending_choices := v_prog.pending_choices + 1;
    v_leveled := true;

    if v_prog.level_in_category >= v_max_level then
      select id into v_next_cat from gym_categories
        where order_index = (select order_index + 1 from gym_categories where id = v_prog.category_id);
      if v_next_cat is not null then
        v_prog.category_id := v_next_cat;
        v_prog.level_in_category := 0;
      end if;
    end if;
  end loop;

  update user_progression set
    xp_into_level = v_prog.xp_into_level,
    total_xp = v_prog.total_xp,
    level_in_category = v_prog.level_in_category,
    category_id = v_prog.category_id,
    pending_choices = v_prog.pending_choices,
    updated_at = now()
  where user_id = p_user_id;

  return query select v_leveled, v_prog.level_in_category, v_prog.category_id, v_prog.pending_choices;
end;
$$;


-- Tire 2 équipements au hasard parmi ceux pas encore obtenus
-- dans la catégorie actuelle de l'utilisateur.
create or replace function get_equipment_choices(p_user_id uuid)
returns table(id int, slug text, display_name text, image_path text)
language sql stable security definer as $$
  select ge.id, ge.slug, ge.display_name, ge.image_path
  from gym_equipment ge
  join user_progression up on up.category_id = ge.category_id
  where up.user_id = p_user_id
    and ge.id not in (
      select equipment_id from user_equipment_unlocked where user_id = p_user_id
    )
  order by random()
  limit 2;
$$;


-- Valide le choix de l'utilisateur entre les 2 équipements proposés
create or replace function choose_equipment(p_user_id uuid, p_equipment_id int)
returns void language plpgsql security definer as $$
declare
  v_order int;
begin
  select coalesce(max(unlock_order), 0) + 1 into v_order
  from user_equipment_unlocked where user_id = p_user_id;

  insert into user_equipment_unlocked (user_id, equipment_id, unlock_order)
  values (p_user_id, p_equipment_id, v_order);

  update user_progression
  set pending_choices = pending_choices - 1
  where user_id = p_user_id and pending_choices > 0;
end;
$$;


-- Vue pratique : tout ce qu'il faut en un seul appel pour afficher
-- "Ma salle" (catégorie active, XP, salle vide, équipements débloqués
-- avec leurs coordonnées de placement).
create or replace function get_room_state(p_user_id uuid)
returns json
language sql stable security definer as $$
  select json_build_object(
    'category_slug', gc.slug,
    'category_name', gc.display_name,
    'room_image_path', gc.room_image_path,
    'level_in_category', up.level_in_category,
    'max_level', gc.max_level,
    'total_xp', up.total_xp,
    'xp_into_level', up.xp_into_level,
    'xp_needed_for_next', xp_required_for_level(up.level_in_category + 1),
    'pending_choices', up.pending_choices,
    'unlocked_equipment', coalesce((
      select json_agg(json_build_object(
        'slug', ge.slug,
        'display_name', ge.display_name,
        'image_path', ge.image_path,
        'canvas_size', ge.canvas_size,
        'x_px', ge.x_px, 'y_px', ge.y_px, 'w_px', ge.w_px, 'h_px', ge.h_px,
        'unlock_order', ueu.unlock_order
      ))
      from user_equipment_unlocked ueu
      join gym_equipment ge on ge.id = ueu.equipment_id
      where ueu.user_id = p_user_id
    ), '[]'::json)
  )
  from user_progression up
  join gym_categories gc on gc.id = up.category_id
  where up.user_id = p_user_id;
$$;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
