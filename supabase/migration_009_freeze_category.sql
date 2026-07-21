-- ============================================================
-- Simplification demandée : on retire la bascule automatique vers
-- la catégorie suivante. Tant qu'une nouvelle salle n'a pas ses
-- équipements définis dans gym_equipment, la progression reste
-- plafonnée dans la catégorie actuelle (Garage, 10 niveaux pour
-- l'instant) : l'XP excédentaire est mise en banque sans rien
-- débloquer de plus, au lieu de basculer vers une salle vide.
--
-- Quand une nouvelle salle sera prête (ses équipements ajoutés
-- dans gym_equipment), il suffira de faire passer manuellement les
-- comptes concernés à la catégorie suivante avec une petite requête
-- dédiée (je la fournirai à ce moment-là) — plus de bascule surprise.
--
-- Corrige aussi les comptes déjà avancés à tort vers une catégorie
-- vide suite aux tests précédents (ton compte inclus).
--
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- ============================================================

create or replace function apply_xp_and_levelup(p_user_id uuid, p_xp int)
returns table(leveled_up boolean, new_level int, new_category_id int, pending_choices int)
language plpgsql security definer as $$
declare
  v_prog record;
  v_needed int;
  v_available_equipment int;
  v_leveled boolean := false;
begin
  insert into user_progression (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_prog from user_progression where user_id = p_user_id for update;

  v_prog.xp_into_level := v_prog.xp_into_level + p_xp;
  v_prog.total_xp := v_prog.total_xp + p_xp;

  select count(*) into v_available_equipment
  from gym_equipment where category_id = v_prog.category_id;

  -- Tant que la catégorie actuelle a des équipements non débloqués,
  -- on monte de niveau normalement. Une fois tous obtenus (ou si la
  -- catégorie n'a encore aucun équipement défini), on s'arrête net :
  -- pas de bascule automatique, l'XP en trop reste en banque.
  while v_prog.level_in_category < v_available_equipment loop
    v_needed := xp_required_for_level(v_prog.level_in_category + 1);
    exit when v_prog.xp_into_level < v_needed;

    v_prog.xp_into_level := v_prog.xp_into_level - v_needed;
    v_prog.level_in_category := v_prog.level_in_category + 1;
    v_prog.pending_choices := v_prog.pending_choices + 1;
    v_leveled := true;
  end loop;

  update user_progression set
    xp_into_level = v_prog.xp_into_level,
    total_xp = v_prog.total_xp,
    level_in_category = v_prog.level_in_category,
    pending_choices = v_prog.pending_choices,
    updated_at = now()
  where user_id = p_user_id;

  return query select v_leveled, v_prog.level_in_category, v_prog.category_id, v_prog.pending_choices;
end;
$$;


-- ------------------------------------------------------------
-- Réparation des comptes coincés dans une catégorie sans
-- équipement (suite aux tests d'avant ce correctif) : on les
-- ramène dans la dernière catégorie qui a réellement des
-- équipements définis, avec un niveau recalculé d'après ce qu'ils
-- ont vraiment débloqué.
-- ------------------------------------------------------------
with fallback_category as (
  select gc.id, gc.order_index
  from gym_categories gc
  where (select count(*) from gym_equipment ge where ge.category_id = gc.id) > 0
  order by gc.order_index desc
  limit 1
)
update user_progression up
set category_id = fc.id,
    level_in_category = coalesce((
      select count(*)
      from user_equipment_unlocked ueu
      join gym_equipment ge on ge.id = ueu.equipment_id
      where ueu.user_id = up.user_id and ge.category_id = fc.id
    ), 0)
from fallback_category fc
where (select count(*) from gym_equipment ge where ge.category_id = up.category_id) = 0;

select clamp_pending_choices(user_id) from user_progression;

-- Tant qu'on y est : la salle ne doit afficher que les équipements
-- de la catégorie ACTUELLEMENT affichée, pas tout ce que l'utilisateur
-- a débloqué toutes catégories confondues (sinon, dès qu'une 2e salle
-- existera, ses équipements pollueront l'affichage de la 1ère).
create or replace function get_room_state(p_user_id uuid)
returns json
language plpgsql security definer as $$
declare
  v_result json;
begin
  insert into user_progression (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  perform clamp_pending_choices(p_user_id);

  select json_build_object(
    'category_slug', gc.slug,
    'category_name', gc.display_name,
    'room_image_path', gc.room_image_path,
    'level_in_category', up.level_in_category,
    'max_level', (select count(*) from gym_equipment where category_id = up.category_id),
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
      where ueu.user_id = p_user_id and ge.category_id = up.category_id
    ), '[]'::json)
  ) into v_result
  from user_progression up
  join gym_categories gc on gc.id = up.category_id
  where up.user_id = p_user_id;

  return v_result;
end;
$$;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
