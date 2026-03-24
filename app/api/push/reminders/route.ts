/**
 * GET /api/push/reminders
 * Called every 15 minutes by Vercel Cron.
 * Sends push notifications for non-recurring events starting in the next 15 minutes.
 */

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (!subs?.length) return NextResponse.json({ sent: 0 })

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  // Window: events starting 5–20 minutes from now
  const windowStart = new Date(now.getTime() + 5 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 20 * 60 * 1000)
  const toHHMM = (d: Date) => d.toTimeString().slice(0, 5)

  let sent = 0
  for (const sub of subs) {
    const { data: events } = await supabaseAdmin
      .from('events')
      .select('title, start_time')
      .eq('user_id', sub.user_id)
      .eq('date', today)
      .eq('is_recurring', false)
      .gte('start_time', toHHMM(windowStart))
      .lt('start_time', toHHMM(windowEnd))

    if (!events?.length) continue

    for (const event of events) {
      try {
        const timeLabel = event.start_time ? ` at ${formatTime(event.start_time)}` : ''
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: '📅 Starting soon',
            body: `${event.title}${timeLabel}`,
            url: '/',
            tag: `reminder-${event.title}-${today}`,
          })
        )
        sent++
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', sub.user_id)
        }
      }
    }
  }

  return NextResponse.json({ sent })
}

function formatTime(time: string): string {
  const [hourStr, minStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  return `${h}:${minStr} ${suffix}`
}
