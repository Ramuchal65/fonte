-- ============================================================
-- Correctif : get_room_state était déclarée "stable" alors qu'elle
-- contient un INSERT (pour créer la progression par défaut si besoin).
-- Postgres interdit toute écriture dans une fonction "stable"
-- -> erreur "INSERT is not allowed in a non-volatile function".
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- ============================================================

create or replace function get_room_state(p_user_id uuid)
returns json
language plpgsql security definer as $$
declare
  v_result json;
begin
  insert into user_progression (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

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
