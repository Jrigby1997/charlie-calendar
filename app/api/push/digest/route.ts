/**
 * GET /api/push/digest
 * Called once daily at 13:00 UTC (≈ 8–9 AM US Eastern) by Vercel Cron.
 * Sends a morning "today at a glance" digest for every subscribed user:
 * weather, today's meals, today's events, per-member chore counts, and the
 * current holder of each family role.
 */

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { dateRotationIndex } from '@/lib/rotation'
import { computeMaintenanceStatus } from '@/lib/maintenance'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '🌨️'
  if (code <= 82) return '🌧️'
  if (code <= 86) return '🌨️'
  return '⛈️'
}

/** Build a multi-line digest body for one user, or null if there's nothing to say. */
async function buildDigest(userId: string, today: string): Promise<{ title: string; body: string } | null> {
  const lines: string[] = []

  // ── Weather (from the user's saved coords via open-meteo) ──
  try {
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('weather_lat, weather_lon, weather_units, weather_location')
      .eq('user_id', userId)
      .maybeSingle()
    if (settings?.weather_lat != null && settings?.weather_lon != null) {
      const units = settings.weather_units === 'celsius' ? 'celsius' : 'fahrenheit'
      const u = new URL('https://api.open-meteo.com/v1/forecast')
      u.searchParams.set('latitude', String(settings.weather_lat))
      u.searchParams.set('longitude', String(settings.weather_lon))
      u.searchParams.set('temperature_unit', units)
      u.searchParams.set('forecast_days', '1')
      u.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min')
      u.searchParams.set('timezone', 'auto')
      const res = await fetch(u.toString())
      if (res.ok) {
        const w = await res.json()
        const hi = Math.round(w.daily?.temperature_2m_max?.[0])
        const lo = Math.round(w.daily?.temperature_2m_min?.[0])
        const code = w.daily?.weathercode?.[0]
        if (Number.isFinite(hi) && Number.isFinite(lo)) {
          const loc = settings.weather_location ? `, ${String(settings.weather_location).split(',')[0]}` : ''
          lines.push(`${weatherEmoji(code)} ${hi}°/${lo}°${loc}`)
        }
      }
    }
  } catch { /* weather is best-effort */ }

  // ── Today's meals ──
  try {
    const { data: meals } = await supabaseAdmin
      .from('meal_plans')
      .select('meal_type, recipes(name)')
      .eq('user_id', userId)
      .eq('date', today)
    if (meals?.length) {
      const order = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']
      const picked = meals
        .map((m: any) => ({
          type: m.meal_type as string,
          name: Array.isArray(m.recipes) ? m.recipes[0]?.name : m.recipes?.name,
        }))
        .filter((m) => m.name)
        .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
      if (picked.length) lines.push('🍽️ ' + picked.map((m) => `${m.type}: ${m.name}`).join(' · '))
    }
  } catch { /* meals best-effort */ }

  // ── Today's events (single-day / non-recurring) ──
  try {
    const { data: events } = await supabaseAdmin
      .from('events')
      .select('title, start_time')
      .eq('user_id', userId)
      .eq('date', today)
      .order('start_time', { ascending: true })
    if (events?.length) {
      const titles = events.slice(0, 3).map((e: any) => e.title)
      const more = events.length > 3 ? ` +${events.length - 3}` : ''
      lines.push(`📅 ${events.length} event${events.length !== 1 ? 's' : ''}: ${titles.join(', ')}${more}`)
    }
  } catch { /* events best-effort */ }

  // ── Members, chore counts, and role holders ──
  try {
    const { data: familyMembers } = await supabaseAdmin
      .from('family_members')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true)
    const members = familyMembers || []
    const nameById = new Map(members.map((m: any) => [m.id, m.name]))

    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*, task_assignments(family_member_id)')
      .eq('user_id', userId)
      .eq('is_active', true)
    const allTasks = tasks || []

    // Chores due today, grouped per member (roles excluded)
    const chores = allTasks.filter(
      (t: any) => !t.is_role && (t.task_type === 'daily' || (t.task_type === 'one_off' && t.due_date === today))
    )
    if (chores.length && members.length) {
      const counts = new Map<number, number>()
      for (const t of chores) {
        for (const a of (t.task_assignments || [])) {
          counts.set(a.family_member_id, (counts.get(a.family_member_id) || 0) + 1)
        }
      }
      const parts = members
        .map((m: any) => ({ name: m.name, n: counts.get(m.id) || 0 }))
        .filter((x) => x.n > 0)
        .map((x) => `${x.name} ${x.n}`)
      if (parts.length) lines.push('✅ ' + parts.join(' · '))
    }

    // Family roles — current holder (date-computed)
    const roleTasks = allTasks.filter((t: any) => t.is_role)
    if (roleTasks.length) {
      const { data: roster } = await supabaseAdmin
        .from('task_rotation_members')
        .select('task_id, family_member_id, rotation_order')
        .in('task_id', roleTasks.map((t: any) => t.id))
      const roleLines = roleTasks
        .map((t: any) => {
          const r = (roster || [])
            .filter((x: any) => x.task_id === t.id)
            .sort((a: any, b: any) => a.rotation_order - b.rotation_order)
          if (!r.length) return null
          const idx = dateRotationIndex(t.last_rotated_date ?? t.created_at, t.rotation_days_interval, r.length)
          const holder = nameById.get(r[idx]?.family_member_id)
          return holder ? `${t.title}: ${holder}` : null
        })
        .filter(Boolean)
      if (roleLines.length) lines.push('👑 ' + roleLines.join(' · '))
    }
  } catch { /* tasks/roles best-effort */ }

  // ── Maintenance overdue ──
  try {
    const [{ data: mAssets }, { data: mItems }] = await Promise.all([
      supabaseAdmin.from('maintenance_assets').select('id, odometer').eq('user_id', userId),
      supabaseAdmin.from('maintenance_items').select('*').eq('user_id', userId),
    ])
    if (mAssets && mItems) {
      const odoById = new Map((mAssets as any[]).map((a) => [a.id, a.odometer]))
      const overdue = (mItems as any[])
        .map((it) => ({ it, s: computeMaintenanceStatus(it, odoById.get(it.asset_id)) }))
        .filter((x) => x.s.state === 'overdue')
        .map((x) => x.it.name as string)
      if (overdue.length) {
        lines.push(`🔧 Overdue: ${overdue.slice(0, 3).join(', ')}${overdue.length > 3 ? ` +${overdue.length - 3}` : ''}`)
      }
    }
  } catch { /* maintenance best-effort */ }

  if (lines.length === 0) return null

  const weekday = new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
  return { title: `🌅 Good morning — ${weekday}`, body: lines.join('\n') }
}

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
    const digest = await buildDigest(sub.user_id, today)
    if (!digest) continue

    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: digest.title,
          body: digest.body,
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
