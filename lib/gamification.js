// Helpers pour la couche gamification (XP, niveaux, salle évolutive).
// Toute la logique de calcul vit côté Supabase (fonctions SQL de
// migration_003_gamification.sql) : ces fonctions ne font qu'appeler
// les RPC correspondantes.

// À appeler juste après avoir marqué une séance comme terminée.
// Retourne { leveled_up, new_level, new_category_id, pending_choices }
export async function addXpAfterSession(supabase, userId, setsLogged, sessionId) {
  const { data, error } = await supabase.rpc('add_xp_and_check_levelup', {
    p_user_id: userId,
    p_sets_logged: setsLogged,
    p_session_id: sessionId ?? null
  })
  if (error) throw error
  return data?.[0] ?? null
}

// État complet de la salle de l'utilisateur : catégorie active, XP,
// image de fond, équipements débloqués avec leurs coordonnées de placement.
export async function getRoomState(supabase, userId) {
  const { data, error } = await supabase.rpc('get_room_state', { p_user_id: userId })
  if (error) throw error
  return data
}

// Les 2 équipements proposés au choix lors d'une montée de niveau.
export async function getEquipmentChoices(supabase, userId) {
  const { data, error } = await supabase.rpc('get_equipment_choices', { p_user_id: userId })
  if (error) throw error
  return data ?? []
}

// Valide le choix de l'utilisateur entre les 2 équipements proposés.
export async function chooseEquipment(supabase, userId, equipmentId) {
  const { error } = await supabase.rpc('choose_equipment', {
    p_user_id: userId,
    p_equipment_id: equipmentId
  })
  if (error) throw error
}
