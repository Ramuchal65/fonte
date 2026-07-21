-- ============================================================
-- Correctif : la progression de niveau se basait sur
-- gym_categories.max_level (valeur théorique, ex: 20 pour Salle
-- perso) au lieu du nombre d'équipements RÉELLEMENT définis dans
-- gym_equipment pour cette catégorie (0 tant qu'elle n'est pas
-- construite). Résultat : un gros gain d'XP pouvait faire monter
-- des niveaux au-delà des équipements existants, et proposer un
-- choix entre 0 équipement -> page bloquée.
--
-- Avec ce correctif, la progression se cale sur le nombre réel
-- d'équipements de la catégorie. Une fois ce nombre atteint (ou
-- si la catégorie est encore vide), l'XP excédentaire reste "en
-- banque" (xp_into_level ne redescend pas en dessous de 0) sans
-- bloquer sur un choix impossible. Dès que tu ajoutes les
-- équipements d'une catégorie dans gym_equipment, la progression
-- des utilisateurs déjà arrivés là reprend automatiquement au
-- prochain gain d'XP.
--
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- ============================================================

create or replace function apply_xp_and_levelup(p_user_id uuid, p_xp int)
returns table(leveled_up boolean, new_level int, new_category_id int, pending_choices int)
language plpgsql security definer as $$
declare
  v_prog record;
  v_needed int;
  v_available_equipment int;  -- nb d'équipements réellement définis pour la catégorie en cours
  v_already_unlocked int;     -- nb déjà débloqués par cet utilisateur dans cette catégorie
  v_next_cat int;
  v_leveled boolean := false;
begin
  insert into user_progression (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_prog from user_progression where user_id = p_user_id for update;

  v_prog.xp_into_level := v_prog.xp_into_level + p_xp;
  v_prog.total_xp := v_prog.total_xp + p_xp;

  loop
    select count(*) into v_available_equipment
    from gym_equipment where category_id = v_prog.category_id;

    -- Catégorie pas encore construite (0 équipement) ou déjà entièrement
    -- vidée de ses équipements disponibles : on arrête de monter en niveau
    -- ici, l'XP excédentaire reste en attente sans rien casser.
    exit when v_prog.level_in_category >= v_available_equipment;

    v_needed := xp_required_for_level(v_prog.level_in_category + 1);
    exit when v_prog.xp_into_level < v_needed;

    v_prog.xp_into_level := v_prog.xp_into_level - v_needed;
    v_prog.level_in_category := v_prog.level_in_category + 1;
    v_prog.pending_choices := v_prog.pending_choices + 1;
    v_leveled := true;

    if v_prog.level_in_category >= v_available_equipment then
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


-- get_room_state doit refléter la même limite réelle (sinon la barre
-- de progression affiche "/20" alors qu'on ne peut monter que jusqu'à
-- ce qui existe vraiment).
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

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
