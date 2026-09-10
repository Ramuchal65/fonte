import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Déclenchée toutes les heures par un GitHub Action (voir
// .github/workflows/send-reminders.yml — le cron intégré de Vercel est
// limité à 1x/jour sur le plan gratuit, incompatible avec une heure
// personnalisable par utilisateur). Protégée par CRON_SECRET.
export async function GET(request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  webpush.setVapidDetails(
    'mailto:contact@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  // Clé de service : seule façon de lire tous les utilisateurs depuis une
  // route serveur (le RLS bloquerait sinon — normal, et voulu partout
  // ailleurs dans l'app, mais ici on a explicitement besoin de tout voir).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const currentUtcHour = new Date().getUTCHours()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  const { data: subs } = await supabase.from('push_subscriptions').select('user_id, subscription')
  if (!subs?.length) return NextResponse.json({ sent: 0, reason: 'no_subscriptions' })

  const userIds = [...new Set(subs.map(s => s.user_id))]

  // Ne notifie que les utilisateurs qui : ont choisi CETTE heure comme
  // rappel, ont un programme actif, et n'ont pas encore terminé de séance
  // aujourd'hui.
  const { data: prefs } = await supabase
    .from('user_stats')
    .select('user_id, reminder_hour_utc')
    .in('user_id', userIds)
    .eq('reminder_hour_utc', currentUtcHour)
  const wantsThisHourSet = new Set((prefs ?? []).map(p => p.user_id))

  if (wantsThisHourSet.size === 0) {
    return NextResponse.json({ sent: 0, reason: 'no_one_scheduled_this_hour', hour: currentUtcHour })
  }

  const { data: activePrograms } = await supabase
    .from('programs')
    .select('user_id')
    .in('user_id', [...wantsThisHourSet])
    .is('archived_at', null)
    .is('deleted_at', null)

  const { data: doneToday } = await supabase
    .from('sessions')
    .select('user_id')
    .in('user_id', [...wantsThisHourSet])
    .gte('finished_at', todayStart.toISOString())

  const doneTodaySet = new Set((doneToday ?? []).map(s => s.user_id))
  const eligibleUserIds = new Set(
    (activePrograms ?? []).map(p => p.user_id).filter(uid => !doneTodaySet.has(uid))
  )

  let sent = 0
  for (const sub of subs) {
    if (!eligibleUserIds.has(sub.user_id)) continue
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({ title: 'Fonte', body: 'N\'oublie pas ta séance aujourd\'hui 💪', url: '/' })
      )
      sent++
    } catch (err) {
      // Abonnement expiré/invalide -> on le supprime pour ne pas réessayer indéfiniment
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.subscription.endpoint)
      }
    }
  }

  return NextResponse.json({ sent, eligible: eligibleUserIds.size, hour: currentUtcHour })
}
