-- ============================================================
-- Bilan de fin de séance : calcule les KPI réels (répétitions,
-- charge totale, durée), compare à la dernière séance du même
-- jour de programme, et calcule l'XP à partir de ces KPI plutôt
-- que du seul nombre de séries.
--
-- Formule XP : 10 XP par série (inchangé, comportement prévisible)
-- + bonus de 20% si la charge totale soulevée dépasse celle de la
-- dernière séance sur ce même jour de programme.
--
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- ============================================================

create or replace function finish_session_and_award_xp(p_user_id uuid, p_session_id uuid)
returns json
language plpgsql security definer as $$
declare
  v_session record;
  v_total_sets int;
  v_total_reps int;
  v_total_volume numeric;
  v_prev_session_id uuid;
  v_prev_volume numeric;
  v_duration_seconds int;
  v_base_xp int;
  v_bonus_xp int;
  v_xp_total int;
  v_level_result record;
  v_prog record;
  v_available_equipment int;
begin
  select * into v_session from sessions where id = p_session_id and user_id = p_user_id;
  if v_session is null then
    raise exception 'Séance introuvable';
  end if;

  select count(*), coalesce(sum(reps), 0), coalesce(sum(reps * coalesce(weight_kg, 0)), 0)
    into v_total_sets, v_total_reps, v_total_volume
  from logged_sets where session_id = p_session_id;

  v_duration_seconds := extract(epoch from (coalesce(v_session.finished_at, now()) - v_session.started_at))::int;

  -- Dernière séance TERMINÉE sur le même jour de programme (hors séance actuelle)
  select s.id into v_prev_session_id
  from sessions s
  where s.user_id = p_user_id
    and s.program_day_id = v_session.program_day_id
    and s.id != p_session_id
    and s.finished_at is not null
  order by s.started_at desc
  limit 1;

  v_prev_volume := null;
  if v_prev_session_id is not null then
    select coalesce(sum(reps * coalesce(weight_kg, 0)), 0) into v_prev_volume
    from logged_sets where session_id = v_prev_session_id;
  end if;

  v_base_xp := v_total_sets * 10;
  v_bonus_xp := 0;
  if v_prev_volume is not null and v_total_volume > v_prev_volume then
    v_bonus_xp := round(v_base_xp * 0.2);
  end if;
  v_xp_total := v_base_xp + v_bonus_xp;

  insert into xp_events (user_id, session_id, sets_logged, xp_earned)
  values (p_user_id, p_session_id, v_total_sets, v_xp_total);

  select * into v_level_result from apply_xp_and_levelup(p_user_id, v_xp_total);

  select * into v_prog from user_progression where user_id = p_user_id;
  select count(*) into v_available_equipment from gym_equipment where category_id = v_prog.category_id;

  return json_build_object(
    'duration_seconds', v_duration_seconds,
    'total_sets', v_total_sets,
    'total_reps', v_total_reps,
    'total_volume_kg', v_total_volume,
    'previous_volume_kg', v_prev_volume,
    'has_previous', (v_prev_volume is not null),
    'is_better', (v_prev_volume is not null and v_total_volume > v_prev_volume),
    'base_xp', v_base_xp,
    'bonus_xp', v_bonus_xp,
    'xp_earned', v_xp_total,
    'leveled_up', v_level_result.leveled_up,
    'pending_choices', v_level_result.pending_choices,
    'level_in_category', v_prog.level_in_category,
    'max_level', v_available_equipment,
    'xp_into_level', v_prog.xp_into_level,
    'xp_needed_for_next', xp_required_for_level(v_prog.level_in_category + 1)
  );
end;
$$;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
