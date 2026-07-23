-- ============================================================
-- Référentiel d'exercices standardisés
-- Sert 2 objectifs : dédupliquer l'historique (les noms extraits
-- d'un texte importé sont mappés vers ce nom canonique), et poser
-- la base d'une future création de programme sans import de texte.
-- À exécuter dans Supabase > SQL Editor, une seule fois.
-- ============================================================

create table exercise_catalog (
  id serial primary key,
  canonical_name text unique not null,
  muscle_group text not null,
  equipment text not null,
  movement_pattern text,
  aliases text[] not null default '{}'
);

alter table exercise_catalog enable row level security;
create policy "public read exercise_catalog" on exercise_catalog for select using (true);

insert into exercise_catalog (canonical_name, muscle_group, equipment, movement_pattern, aliases) values
  ('Développé couché barre', 'pectoraux', 'barre', 'poussee_horizontale', ARRAY['bench press','développé couché','couché barre','développé couché']),
  ('Développé couché haltères', 'pectoraux', 'halteres', 'poussee_horizontale', ARRAY['dumbbell bench press','développé couché dumbbell']),
  ('Développé incliné barre', 'pectoraux', 'barre', 'poussee_horizontale', ARRAY['incline bench press','développé incliné']),
  ('Développé incliné haltères', 'pectoraux', 'halteres', 'poussee_horizontale', ARRAY['incline dumbbell press']),
  ('Développé décliné barre', 'pectoraux', 'barre', 'poussee_horizontale', ARRAY['decline bench press','développé décliné']),
  ('Écarté couché haltères', 'pectoraux', 'halteres', 'isolation', ARRAY['dumbbell fly','écarté couché','fly haltères']),
  ('Écarté à la poulie vis-à-vis', 'pectoraux', 'poulie', 'isolation', ARRAY['cable crossover','écarté poulie','vis à vis poulie']),
  ('Pompes', 'pectoraux', 'poids_du_corps', 'poussee_horizontale', ARRAY['push ups','pompe','pompes au poids du corps']),
  ('Dips', 'pectoraux', 'poids_du_corps', 'poussee_horizontale', ARRAY['dips au poids du corps','triceps dips']),
  ('Pec deck / butterfly', 'pectoraux', 'machine', 'isolation', ARRAY['pec deck','butterfly','machine écarté']),
  ('Tractions pronation', 'dos', 'poids_du_corps', 'tirage_vertical', ARRAY['pull ups','tractions','traction pronation']),
  ('Tractions supination', 'dos', 'poids_du_corps', 'tirage_vertical', ARRAY['chin ups','tractions supination']),
  ('Tirage vertical poulie', 'dos', 'poulie', 'tirage_vertical', ARRAY['lat pulldown','tirage vertical','tirage vertical prise serrée','tirage vertical prise large']),
  ('Rowing barre', 'dos', 'barre', 'tirage_horizontal', ARRAY['barbell row','rowing barre buste penché']),
  ('Rowing haltère unilatéral', 'dos', 'halteres', 'tirage_horizontal', ARRAY['one arm dumbbell row','rowing haltère','rowing unilatéral']),
  ('Rowing poulie basse', 'dos', 'poulie', 'tirage_horizontal', ARRAY['seated cable row','tirage horizontal poulie basse']),
  ('Soulevé de terre', 'dos', 'barre', 'hinge', ARRAY['deadlift','soulevé de terre conventionnel']),
  ('Soulevé de terre roumain', 'dos', 'barre', 'hinge', ARRAY['romanian deadlift','rdl','souleve de terre jambes tendues']),
  ('Face pull', 'dos', 'poulie', 'isolation', ARRAY['face pulls']),
  ('Shrugs haltères', 'dos', 'halteres', 'isolation', ARRAY['shrugs','haussements d''épaules haltères']),
  ('Superman / extension lombaire', 'dos', 'poids_du_corps', 'isolation', ARRAY['hyperextension','extension lombaire','superman']),
  ('Développé militaire barre', 'epaules', 'barre', 'poussee_verticale', ARRAY['ohp','overhead press','développé militaire']),
  ('Développé militaire haltères', 'epaules', 'halteres', 'poussee_verticale', ARRAY['dumbbell shoulder press','développé épaules haltères']),
  ('Élévations latérales haltères', 'epaules', 'halteres', 'isolation', ARRAY['lateral raise','lat raise','élévations latérales']),
  ('Élévations frontales haltères', 'epaules', 'halteres', 'isolation', ARRAY['front raise','élévations frontales']),
  ('Oiseau / élévations arrière', 'epaules', 'halteres', 'isolation', ARRAY['rear delt fly','oiseau','élévations arrière']),
  ('Développé Arnold', 'epaules', 'halteres', 'poussee_verticale', ARRAY['arnold press']),
  ('Curl biceps barre', 'biceps', 'barre', 'isolation', ARRAY['barbell curl','curl barre']),
  ('Curl biceps barre EZ', 'biceps', 'barre', 'isolation', ARRAY['ez bar curl','curl ez bar','curl barre ez']),
  ('Curl biceps haltères', 'biceps', 'halteres', 'isolation', ARRAY['dumbbell curl','curl haltères']),
  ('Curl marteau haltères', 'biceps', 'halteres', 'isolation', ARRAY['hammer curl','curl marteau']),
  ('Curl pupitre', 'biceps', 'machine', 'isolation', ARRAY['preacher curl','curl biceps pupitre','curl pupitre']),
  ('Curl à la poulie', 'biceps', 'poulie', 'isolation', ARRAY['cable curl','curl poulie']),
  ('Extension triceps poulie', 'triceps', 'poulie', 'isolation', ARRAY['tricep pushdown','pushdown','extension triceps poulie haute']),
  ('Extension triceps barre EZ', 'triceps', 'barre', 'isolation', ARRAY['skull crusher','extension triceps barre ez','barre au front']),
  ('Extension triceps haltère nuque', 'triceps', 'halteres', 'isolation', ARRAY['overhead tricep extension','extension triceps nuque']),
  ('Barre au front', 'triceps', 'barre', 'isolation', ARRAY['french press','barre au front']),
  ('Squat arrière barre', 'quadriceps', 'barre', 'squat', ARRAY['back squat','squat','squat barre']),
  ('Squat avant barre', 'quadriceps', 'barre', 'squat', ARRAY['front squat','squat avant']),
  ('Presse à cuisses', 'quadriceps', 'machine', 'squat', ARRAY['leg press','presse à cuisses','presse cuisses']),
  ('Fentes marchées', 'quadriceps', 'halteres', 'squat', ARRAY['walking lunges','fentes marchées','fentes']),
  ('Fentes sautées', 'quadriceps', 'poids_du_corps', 'squat', ARRAY['jump lunges','fentes sautées']),
  ('Squats sautés', 'quadriceps', 'poids_du_corps', 'squat', ARRAY['jump squats','squats sautés','squat sauté']),
  ('Leg extension', 'quadriceps', 'machine', 'isolation', ARRAY['extension quadriceps','leg extension']),
  ('Fentes bulgares', 'quadriceps', 'halteres', 'squat', ARRAY['bulgarian split squat','fentes bulgares']),
  ('Leg curl allongé', 'ischios_jambiers', 'machine', 'isolation', ARRAY['lying leg curl','leg curl allongé','leg curl']),
  ('Leg curl assis', 'ischios_jambiers', 'machine', 'isolation', ARRAY['seated leg curl']),
  ('Good morning barre', 'ischios_jambiers', 'barre', 'hinge', ARRAY['good morning']),
  ('Hip thrust barre', 'fessiers', 'barre', 'hinge', ARRAY['hip thrust']),
  ('Pont fessier', 'fessiers', 'poids_du_corps', 'hinge', ARRAY['glute bridge','pont fessier']),
  ('Mollets debout', 'mollets', 'machine', 'isolation', ARRAY['standing calf raise','mollets debout','calf raise debout']),
  ('Mollets à la presse', 'mollets', 'machine', 'isolation', ARRAY['leg press calf raise','mollets presse','mollets à la presse']),
  ('Mollets assis', 'mollets', 'machine', 'isolation', ARRAY['seated calf raise','mollets assis']),
  ('Gainage planche', 'core', 'poids_du_corps', 'isolation', ARRAY['plank','planche','gainage']),
  ('Crunch', 'core', 'poids_du_corps', 'isolation', ARRAY['crunch abdos','abdominaux crunch']),
  ('Relevé de jambes suspendu', 'core', 'poids_du_corps', 'isolation', ARRAY['hanging leg raise','relevé de jambes']),
  ('Russian twist', 'core', 'poids_du_corps', 'isolation', ARRAY['russian twist','rotation du buste']),
  ('Mountain climbers', 'core', 'poids_du_corps', 'cardio', ARRAY['mountain climbers','grimpeur']),
  ('Corde à sauter', 'cardio', 'autre', 'cardio', ARRAY['jump rope','corde à sauter']),
  ('Burpees', 'full_body', 'poids_du_corps', 'cardio', ARRAY['burpee','burpees']),
  ('Rameur', 'cardio', 'machine', 'cardio', ARRAY['rowing machine','rameur']),
  ('Kettlebell swing', 'full_body', 'kettlebell', 'hinge', ARRAY['kb swing','kettlebell swing','swing kettlebell']),
  ('Thruster haltères', 'full_body', 'halteres', 'poussee_verticale', ARRAY['dumbbell thruster','thruster']);

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================