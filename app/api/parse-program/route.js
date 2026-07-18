import { NextResponse } from 'next/server'

const GEMINI_MODEL = 'gemini-flash-lite-latest'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM_PROMPT = `Tu transformes un programme de musculation écrit en langage libre (souvent généré par ChatGPT) en JSON structuré.

Règles :
- Regroupe les exercices par jour d'entraînement (ex: "Push", "Pull", "Jour 1", peu importe les noms donnés dans le texte).
- Pour chaque exercice, extrait : name, target_sets (nombre), target_reps (texte, ex "8-12" ou "AMRAP"), target_weight_kg (nombre ou null si non précisé), rest_seconds (nombre, déduis 90 si non précisé), superset_group (une lettre A/B/C... si l'exercice est explicitement en superset avec un autre, sinon null).
- Ne déduis pas d'exercices qui ne sont pas dans le texte. Si une info manque, mets une valeur par défaut raisonnable plutôt que d'inventer.
- Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans commentaire, selon ce schéma exact :

{
  "days": [
    {
      "label": "string",
      "exercises": [
        {
          "name": "string",
          "target_sets": number,
          "target_reps": "string",
          "target_weight_kg": number|null,
          "rest_seconds": number,
          "superset_group": "string|null"
        }
      ]
    }
  ]
}`

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY manquant côté serveur.' }, { status: 500 })
  }

  const { text } = await request.json()
  if (!text || text.trim().length < 10) {
    return NextResponse.json({ error: 'Texte de programme vide ou trop court.' }, { status: 400 })
  }

  const body = {
    contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nTexte du programme à parser :\n"""\n${text}\n"""` }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
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

  return NextResponse.json(parsed)
}
