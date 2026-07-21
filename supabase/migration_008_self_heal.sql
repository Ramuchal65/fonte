-- ============================================================
-- Correctif définitif : migration_007 empêche un NOUVEAU gain
-- d'XP de créer un choix impossible, mais ne répare pas les
-- pending_choices déjà enregistrés en base suite à un test
-- antérieur (ex: le +15000 XP d'avant le fix).
--
-- Cette migration ajoute un "auto-réparation" : à chaque
-- chargement de "Ma salle", on ramène pending_choices au nombre
-- réel d'équipements encore disponibles dans la catégorie en
-- cours. Si tu retestes un scénario extrême à l'avenir et que ça
-- dérape à nouveau, un simple rechargement de page suffira à
-- corriger l'état — plus besoin de SQL manuel.
--
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- ============================================================

create or replace function clamp_pending_choices(p_user_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_category_id int;
  v_available int;
  v_unlocked_in_category int;
  v_claimable int;
begin
  select category_id into v_category_id from user_progression where user_id = p_user_id;
  if v_category_id is null then
    return;
  end if;

  select count(*) into v_available from gym_equipment where category_id = v_category_id;

  select count(*) into v_unlocked_in_category
  from user_equipment_unlocked ueu
  join gym_equipment ge on ge.id = ueu.equipment_id
  where ueu.user_id = p_user_id and ge.category_id = v_category_id;

  v_claimable := greatest(0, v_available - v_unlocked_in_category);

  update user_progression
  set pending_choices = least(pending_choices, v_claimable)
  where user_id = p_user_id and pending_choices > v_claimable;
end;
$$;

-- Appelée automatiquement à chaque lecture de l'état de la salle.
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
      where ueu.user_id = p_user_id
    ), '[]'::json)
  ) into v_result
  from user_progression up
  join gym_categories gc on gc.id = up.category_id
  where up.user_id = p_user_id;

  return v_result;
end;
$$;

-- Corrige immédiatement ton compte actuel (exécuté une fois, ici,
-- pour tout le monde présent dans la table).
select clamp_pending_choices(user_id) from user_progression;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
