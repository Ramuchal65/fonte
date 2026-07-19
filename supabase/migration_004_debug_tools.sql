-- ============================================================
-- Migration : outils de debug (booster l'XP, réinitialiser sa
-- progression) pour tester la salle évolutive sans faire de
-- vraies séances. À retirer ou désactiver avant lancement public.
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- ============================================================


-- ------------------------------------------------------------
-- Extraction de la logique de montée de niveau dans une fonction
-- interne réutilisable, pour ne pas dupliquer le code entre
-- add_xp_and_check_levelup (vraies séances) et debug_add_xp (test).
-- ------------------------------------------------------------
create or replace function apply_xp_and_levelup(p_user_id uuid, p_xp int)
returns table(leveled_up boolean, new_level int, new_category_id int, pending_choices int)
language plpgsql security definer as $$
declare
  v_prog record;
  v_needed int;
  v_max_level int;
  v_next_cat int;
  v_leveled boolean := false;
begin
  insert into user_progression (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_prog from user_progression where user_id = p_user_id for update;

  v_prog.xp_into_level := v_prog.xp_into_level + p_xp;
  v_prog.total_xp := v_prog.total_xp + p_xp;

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

-- add_xp_and_check_levelup garde exactement le même comportement
-- qu'avant, juste réécrite pour s'appuyer sur la fonction commune.
create or replace function add_xp_and_check_levelup(p_user_id uuid, p_sets_logged int, p_session_id uuid default null)
returns table(leveled_up boolean, new_level int, new_category_id int, pending_choices int)
language plpgsql security definer as $$
declare
  v_xp_gained int := p_sets_logged * 10;
begin
  insert into xp_events (user_id, session_id, sets_logged, xp_earned)
  values (p_user_id, p_session_id, p_sets_logged, v_xp_gained);

  return query select * from apply_xp_and_levelup(p_user_id, v_xp_gained);
end;
$$;


-- ------------------------------------------------------------
-- DEBUG : ajoute de l'XP brute directement, sans passer par une
-- vraie séance. N'écrit rien dans xp_events (pour ne pas fausser
-- ton historique / ta courbe de progression une fois en prod).
-- ------------------------------------------------------------
create or replace function debug_add_xp(p_user_id uuid, p_xp int)
returns table(leveled_up boolean, new_level int, new_category_id int, pending_choices int)
language plpgsql security definer as $$
begin
  return query select * from apply_xp_and_levelup(p_user_id, p_xp);
end;
$$;


-- ------------------------------------------------------------
-- DEBUG : remet à zéro toute la progression d'un utilisateur
-- (retour à Garage niveau 0, salle vide, XP à 0). Pratique pour
-- retester un scénario depuis le début.
-- ------------------------------------------------------------
create or replace function debug_reset_progression(p_user_id uuid)
returns void
language plpgsql security definer as $$
begin
  delete from user_equipment_unlocked where user_id = p_user_id;
  delete from xp_events where user_id = p_user_id;
  delete from user_progression where user_id = p_user_id;
  insert into user_progression (user_id) values (p_user_id);
end;
$$;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
