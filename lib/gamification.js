// Helpers pour la couche gamification (XP, niveaux, salle évolutive).
// Toute la logique de calcul vit côté Supabase (fonctions SQL de
// migration_003_gamification.sql) : ces fonctions ne font qu'appeler
// les RPC correspondantes.

// À appeler juste après avoir marqué une séance comme terminée.
// Calcule les KPI réels (répétitions, charge, durée), les compare à la
// dernière séance du même jour de programme, et calcule/attribue l'XP
// à partir de ces KPI. Remplace addXpAfterSession pour ce flux.
export async function finishSessionAndAwardXp(supabase, userId, sessionId) {
  const { data, error } = await supabase.rpc('finish_session_and_award_xp', {
    p_user_id: userId,
    p_session_id: sessionId
  })
  if (error) throw error
  return data
}

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

// ------------------------------------------------------------
// Succès (achievements). À appeler après les actions concernées ;
// chaque helper retourne la liste des slugs nouvellement débloqués
// (tableau vide si rien de nouveau).
// ------------------------------------------------------------

export async function recordProgramCreated(supabase, userId, isImport) {
  const { data, error } = await supabase.rpc('record_program_created', {
    p_user_id: userId,
    p_is_import: isImport
  })
  if (error) { console.error('record_program_created:', error); return [] }
  return data ?? []
}

export async function recordProgramEdit(supabase, userId) {
  const { data, error } = await supabase.rpc('record_program_edit', { p_user_id: userId })
  if (error) { console.error('record_program_edit:', error); return [] }
  return data ?? []
}

export async function recordAvatarSaved(supabase, userId, outfitId) {
  const { data, error } = await supabase.rpc('record_avatar_saved', {
    p_user_id: userId,
    p_outfit_id: outfitId
  })
  if (error) { console.error('record_avatar_saved:', error); return [] }
  return data ?? []
}

export async function getAchievementsState(supabase, userId) {
  const { data, error } = await supabase.rpc('get_achievements_state', { p_user_id: userId })
  if (error) throw error
  return data ?? []
}

// ------------------------------------------------------------
// Outils de debug (migration_017). Uniquement pour tester
// l'affichage des succès sans avoir à remplir les vraies conditions.
// ------------------------------------------------------------

export async function debugUnlockRandomAchievement(supabase, userId) {
  const { data, error } = await supabase.rpc('debug_unlock_random_achievement', { p_user_id: userId })
  if (error) throw error
  return data // slug débloqué, ou null si tout est déjà débloqué
}

export async function debugResetAchievements(supabase, userId) {
  const { error } = await supabase.rpc('debug_reset_achievements', { p_user_id: userId })
  if (error) throw error
}

// Ajoute de l'XP brute directement, sans passer par une séance.
export async function debugAddXp(supabase, userId, xp) {
  const { data, error } = await supabase.rpc('debug_add_xp', {
    p_user_id: userId,
    p_xp: xp
  })
  if (error) throw error
  return data?.[0] ?? null
}

// Remet à zéro toute la progression (retour Garage niveau 0, salle vide).
export async function debugResetProgression(supabase, userId) {
  const { error } = await supabase.rpc('debug_reset_progression', { p_user_id: userId })
  if (error) throw error
}
