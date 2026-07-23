-- ============================================================
-- GIFs de démonstration pour les exercices du référentiel.
-- Source : yuhonas/free-exercise-db (domaine public, licence
-- Unlicense), 2 photos par exercice recomposées en GIF animé
-- (aller-retour) par nos soins. Fichiers dans public/exercise-gifs/.
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- ============================================================

alter table exercise_catalog add column if not exists gif_filename text;

update exercise_catalog set gif_filename = 'developpe_couche_barre.gif' where canonical_name = 'Développé couché barre';
update exercise_catalog set gif_filename = 'developpe_couche_halteres.gif' where canonical_name = 'Développé couché haltères';
update exercise_catalog set gif_filename = 'developpe_incline_barre.gif' where canonical_name = 'Développé incliné barre';
update exercise_catalog set gif_filename = 'developpe_incline_halteres.gif' where canonical_name = 'Développé incliné haltères';
update exercise_catalog set gif_filename = 'developpe_decline_barre.gif' where canonical_name = 'Développé décliné barre';
update exercise_catalog set gif_filename = 'ecarte_couche_halteres.gif' where canonical_name = 'Écarté couché haltères';
update exercise_catalog set gif_filename = 'ecarte_a_la_poulie_vis_a_vis.gif' where canonical_name = 'Écarté à la poulie vis-à-vis';
update exercise_catalog set gif_filename = 'pompes.gif' where canonical_name = 'Pompes';
update exercise_catalog set gif_filename = 'dips.gif' where canonical_name = 'Dips';
update exercise_catalog set gif_filename = 'pec_deck_butterfly.gif' where canonical_name = 'Pec deck / butterfly';
update exercise_catalog set gif_filename = 'tractions_pronation.gif' where canonical_name = 'Tractions pronation';
update exercise_catalog set gif_filename = 'tractions_supination.gif' where canonical_name = 'Tractions supination';
update exercise_catalog set gif_filename = 'tirage_vertical_poulie.gif' where canonical_name = 'Tirage vertical poulie';
update exercise_catalog set gif_filename = 'rowing_barre.gif' where canonical_name = 'Rowing barre';
update exercise_catalog set gif_filename = 'rowing_haltere_unilateral.gif' where canonical_name = 'Rowing haltère unilatéral';
update exercise_catalog set gif_filename = 'rowing_poulie_basse.gif' where canonical_name = 'Rowing poulie basse';
update exercise_catalog set gif_filename = 'souleve_de_terre.gif' where canonical_name = 'Soulevé de terre';
update exercise_catalog set gif_filename = 'souleve_de_terre_roumain.gif' where canonical_name = 'Soulevé de terre roumain';
update exercise_catalog set gif_filename = 'face_pull.gif' where canonical_name = 'Face pull';
update exercise_catalog set gif_filename = 'shrugs_halteres.gif' where canonical_name = 'Shrugs haltères';
update exercise_catalog set gif_filename = 'superman_extension_lombaire.gif' where canonical_name = 'Superman / extension lombaire';
update exercise_catalog set gif_filename = 'developpe_militaire_barre.gif' where canonical_name = 'Développé militaire barre';
update exercise_catalog set gif_filename = 'developpe_militaire_halteres.gif' where canonical_name = 'Développé militaire haltères';
update exercise_catalog set gif_filename = 'elevations_laterales_halteres.gif' where canonical_name = 'Élévations latérales haltères';
update exercise_catalog set gif_filename = 'elevations_frontales_halteres.gif' where canonical_name = 'Élévations frontales haltères';
update exercise_catalog set gif_filename = 'oiseau_elevations_arriere.gif' where canonical_name = 'Oiseau / élévations arrière';
update exercise_catalog set gif_filename = 'developpe_arnold.gif' where canonical_name = 'Développé Arnold';
update exercise_catalog set gif_filename = 'curl_biceps_barre.gif' where canonical_name = 'Curl biceps barre';
update exercise_catalog set gif_filename = 'curl_biceps_barre_ez.gif' where canonical_name = 'Curl biceps barre EZ';
update exercise_catalog set gif_filename = 'curl_biceps_halteres.gif' where canonical_name = 'Curl biceps haltères';
update exercise_catalog set gif_filename = 'curl_marteau_halteres.gif' where canonical_name = 'Curl marteau haltères';
update exercise_catalog set gif_filename = 'curl_pupitre.gif' where canonical_name = 'Curl pupitre';
update exercise_catalog set gif_filename = 'curl_a_la_poulie.gif' where canonical_name = 'Curl à la poulie';
update exercise_catalog set gif_filename = 'extension_triceps_poulie.gif' where canonical_name = 'Extension triceps poulie';
update exercise_catalog set gif_filename = 'extension_triceps_barre_ez.gif' where canonical_name = 'Extension triceps barre EZ';
update exercise_catalog set gif_filename = 'extension_triceps_haltere_nuque.gif' where canonical_name = 'Extension triceps haltère nuque';
update exercise_catalog set gif_filename = 'barre_au_front.gif' where canonical_name = 'Barre au front';
update exercise_catalog set gif_filename = 'squat_arriere_barre.gif' where canonical_name = 'Squat arrière barre';
update exercise_catalog set gif_filename = 'squat_avant_barre.gif' where canonical_name = 'Squat avant barre';
update exercise_catalog set gif_filename = 'presse_a_cuisses.gif' where canonical_name = 'Presse à cuisses';
update exercise_catalog set gif_filename = 'fentes_marchees.gif' where canonical_name = 'Fentes marchées';
update exercise_catalog set gif_filename = 'fentes_sautees.gif' where canonical_name = 'Fentes sautées';
update exercise_catalog set gif_filename = 'squats_sautes.gif' where canonical_name = 'Squats sautés';
update exercise_catalog set gif_filename = 'leg_extension.gif' where canonical_name = 'Leg extension';
update exercise_catalog set gif_filename = 'fentes_bulgares.gif' where canonical_name = 'Fentes bulgares';
update exercise_catalog set gif_filename = 'leg_curl_allonge.gif' where canonical_name = 'Leg curl allongé';
update exercise_catalog set gif_filename = 'leg_curl_assis.gif' where canonical_name = 'Leg curl assis';
update exercise_catalog set gif_filename = 'good_morning_barre.gif' where canonical_name = 'Good morning barre';
update exercise_catalog set gif_filename = 'hip_thrust_barre.gif' where canonical_name = 'Hip thrust barre';
update exercise_catalog set gif_filename = 'pont_fessier.gif' where canonical_name = 'Pont fessier';
update exercise_catalog set gif_filename = 'mollets_debout.gif' where canonical_name = 'Mollets debout';
update exercise_catalog set gif_filename = 'mollets_a_la_presse.gif' where canonical_name = 'Mollets à la presse';
update exercise_catalog set gif_filename = 'mollets_assis.gif' where canonical_name = 'Mollets assis';
update exercise_catalog set gif_filename = 'gainage_planche.gif' where canonical_name = 'Gainage planche';
update exercise_catalog set gif_filename = 'crunch.gif' where canonical_name = 'Crunch';
update exercise_catalog set gif_filename = 'releve_de_jambes_suspendu.gif' where canonical_name = 'Relevé de jambes suspendu';
update exercise_catalog set gif_filename = 'russian_twist.gif' where canonical_name = 'Russian twist';
update exercise_catalog set gif_filename = 'mountain_climbers.gif' where canonical_name = 'Mountain climbers';
update exercise_catalog set gif_filename = 'corde_a_sauter.gif' where canonical_name = 'Corde à sauter';
update exercise_catalog set gif_filename = 'kettlebell_swing.gif' where canonical_name = 'Kettlebell swing';
update exercise_catalog set gif_filename = 'thruster_halteres.gif' where canonical_name = 'Thruster haltères';

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================