import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const GEMINI_MODEL = 'gemini-flash-lite-latest'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

function buildSystemPrompt(catalogNames) {
  return `Tu transformes un programme de musculation écrit en langage libre (souvent généré par ChatGPT) en JSON structuré.

Chaque jour est composé de "groupes" d'exercices. Un groupe est de deux types :
- "classique" : un seul exercice répété sur plusieurs séries (le cas le plus courant : "Développé couché 4x8-12").
- "circuit" : plusieurs exercices variés enchaînés sans repos entre eux, le tout répété sur plusieurs tours
  (mots-clés fréquents : "circuit", "superset", "enchaînement", "AxB", "en alternance", "sans repos entre les deux").

Règles :
- Pour un groupe "classique" : exercises contient un seul élément, rounds = le nombre de séries.
- Pour un groupe "circuit" : exercises contient chaque exercice du circuit dans l'ordre d'exécution,
  rounds = le nombre de tours du circuit.
- rest_seconds = le repos après chaque série (classique) ou après chaque tour complet (circuit).
  Déduis 90 si non précisé pour du classique, 60 si non précisé pour du circuit.
- Ignore tout ce qui n'est pas un exercice avec séries/répétitions : échauffement, étirements,
  jours de repos, notes entre parenthèses sur des variantes non détaillées, etc. Un jour sans
  aucun exercice identifiable ne doit simplement pas apparaître dans la réponse.
- Ne déduis pas d'exercices absents du texte. Si une info manque, mets une valeur par défaut raisonnable.

Standardisation des noms d'exercices (important, pour éviter les doublons dans l'historique) :
Voici la liste des noms canoniques déjà connus de l'application :
${catalogNames.map(n => `- ${n}`).join('\n')}

Pour CHAQUE exercice extrait, remplis "canonical_name" avec le nom EXACT de cette liste s'il s'agit
clairement du même mouvement (même en anglais, abrégé, mal orthographié, ou formulé différemment :
"bench press", "développé couché", "couché barre" désignent tous "Développé couché barre").
Si aucun nom de la liste ne correspond avec confiance, laisse "canonical_name" à null — n'invente
jamais un nom qui n'est pas dans la liste ci-dessus. Le champ "name" reste toujours le nom tel
qu'extrait ou reformulé proprement à partir du texte source, que canonical_name soit trouvé ou non.

Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans commentaire, selon ce schéma exact :

{
  "days": [
    {
      "label": "string",
      "groups": [
        {
          "type": "classique" | "circuit",
          "rounds": number,
          "rest_seconds": number,
          "exercises": [
            { "name": "string", "canonical_name": "string|null", "target_reps": "string", "target_weight_kg": number|null }
          ]
        }
      ]
    }
  ]
}`
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY manquant côté serveur.' }, { status: 500 })
  }

  const { text } = await request.json()
  if (!text || text.trim().length < 10) {
    return NextResponse.json({ error: 'Texte de programme vide ou trop court.' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: catalog } = await supabase
    .from('exercise_catalog')
    .select('canonical_name')
    .order('canonical_name')
  const catalogNames = (catalog ?? []).map(c => c.canonical_name)
  const catalogSet = new Set(catalogNames)

  const body = {
    contents: [{ parts: [{ text: `${buildSystemPrompt(catalogNames)}\n\nTexte du programme à parser :\n"""\n${text}\n"""` }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          days: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                label: { type: 'STRING' },
                groups: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      type: { type: 'STRING', enum: ['classique', 'circuit'] },
                      rounds: { type: 'INTEGER' },
                      rest_seconds: { type: 'INTEGER' },
                      exercises: {
                        type: 'ARRAY',
                        items: {
                          type: 'OBJECT',
                          properties: {
                            name: { type: 'STRING' },
                            canonical_name: { type: 'STRING', nullable: true },
                            target_reps: { type: 'STRING' },
                            target_weight_kg: { type: 'NUMBER', nullable: true }
                          },
                          required: ['name', 'target_reps']
                        }
                      }
                    },
                    required: ['type', 'rounds', 'rest_seconds', 'exercises']
                  }
                }
              },
              required: ['label', 'groups']
            }
          }
        },
        required: ['days']
      }
    }
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errText = await res.text()
    return NextResponse.json({ error: `Erreur Gemini : ${errText}` }, { status: 502 })
  }

  const data = await res.json()
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    return NextResponse.json({ error: 'Réponse Gemini vide ou inattendue.' }, { status: 502 })
  }

  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch (e) {
    return NextResponse.json({ error: 'Le parsing JSON a échoué, réessaie ou corrige le texte source.' }, { status: 502 })
  }

  // Normalisation défensive : même avec un schéma strict, on ne fait jamais confiance
  // aveuglément à une sortie de modèle pour ce qui touche à l'affichage.
  // On ne fait confiance à canonical_name que s'il correspond à une entrée RÉELLE
  // du catalogue (défense contre une hallucination du modèle) — sinon on garde le
  // nom brut extrait du texte.
  const normalized = {
    days: (parsed.days || []).map(day => ({
      label: day.label || 'Jour',
      groups: (day.groups || []).map(group => ({
        type: group.type === 'circuit' ? 'circuit' : 'classique',
        rounds: Number(group.rounds) || 3,
        rest_seconds: Number(group.rest_seconds) || (group.type === 'circuit' ? 60 : 90),
        exercises: (group.exercises || []).map(ex => ({
          name: (ex.canonical_name && catalogSet.has(ex.canonical_name)) ? ex.canonical_name : (ex.name || 'Exercice'),
          target_reps: String(ex.target_reps ?? '8-12'),
          target_weight_kg: ex.target_weight_kg != null ? Number(ex.target_weight_kg) : null
        }))
      })).filter(g => g.exercises.length > 0)
    })).filter(d => d.groups.length > 0)
  }

  if (normalized.days.length === 0) {
    return NextResponse.json({ error: 'Aucun exercice n\'a pu être identifié dans ce texte. Vérifie le format et réessaie.' }, { status: 502 })
  }

  return NextResponse.json(normalized)
}
