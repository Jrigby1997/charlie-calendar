/**
 * GET /api/push/digest
 * Called once daily at 13:00 UTC (≈ 8–9 AM US Eastern) by Vercel Cron.
 * Sends a morning task digest for every subscribed user.
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

  const today = new Date().toISOString().split('T')[0]
  let sent = 0

  for (const sub of subs) {
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('id, title, task_type, due_date')
      .eq('user_id', sub.user_id)
      .eq('is_active', true)

    const dueTasks = (tasks || []).filter(t =>
      t.task_type === 'daily' || (t.task_type === 'one_off' && t.due_date === today)
    )

    if (dueTasks.length === 0) continue

    const preview = dueTasks
      .slice(0, 3)
      .map(t => t.title)
      .join(', ')
    const more = dueTasks.length > 3 ? ` +${dueTasks.length - 3} more` : ''
    const body = `${preview}${more}`

    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: `🌅 ${dueTasks.length} task${dueTasks.length !== 1 ? 's' : ''} today`,
          body,
          url: '/',
          tag: `digest-${today}`,
        })
      )
      sent++
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', sub.user_id)
      }
    }
  }

  return NextResponse.json({ sent })
}
