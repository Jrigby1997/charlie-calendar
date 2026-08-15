'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { urlBase64ToUint8Array } from '@/lib/pushUtils'
import FamilyMembers from './FamilyMembers'

async function sha256(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

type GoogleCalendar = {
  id: number
  external_calendar_id: string
  calendar_name: string
  calendar_color: string | null
  is_enabled: boolean
  family_member_ids: number[]
  last_synced_at: string | null
  integration_id: number
}

type GoogleAccount = {
  integration_id: number
  google_email: string | null
  calendars: GoogleCalendar[]
}

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  onSettingsUpdate: () => void
  onShowToast?: (message: string, tone: 'success' | 'error') => void
  onExternalCalendarsChange?: () => void
  onSignOut?: () => void
}

export default function SettingsModal({ isOpen, onClose, onSettingsUpdate, onShowToast, onExternalCalendarsChange, onSignOut }: SettingsModalProps) {
  const [calendarTitle, setCalendarTitle] = useState('Charlie Calendar')
  const [familySectionTitle, setFamilySectionTitle] = useState('Family Members')
  const [colorTheme, setColorTheme] = useState('glass')
  const [eventColorMode, setEventColorMode] = useState('member')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [weekStartDay, setWeekStartDay] = useState('Sunday')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'calendars' | 'weather' | 'notifications' | 'security'>('general')

  // Feature visibility
  const [showIngredients, setShowIngredients] = useState(true)
  const [showRewards, setShowRewards] = useState(true)

  // Admin PIN state
  const [adminPinHash, setAdminPinHash] = useState<string | null>(null)
  const [pinMode, setPinMode] = useState<'idle' | 'setting' | 'changing' | 'removing'>('idle')
  const [pinCurrent, setPinCurrent] = useState('')
  const [pinNew, setPinNew] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSaving, setPinSaving] = useState(false)

  // Google Calendar integration state
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleSyncing, setGoogleSyncing] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [familyMembersForDropdown, setFamilyMembersForDropdown] = useState<{ id: number; name: string; color: string }[]>([])

  // Push notification state
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushEnabling, setPushEnabling] = useState(false)

  // Weather settings state
  const [weatherLocation, setWeatherLocation] = useState('')
  const [weatherLat, setWeatherLat] = useState<number | null>(null)
  const [weatherLon, setWeatherLon] = useState<number | null>(null)
  const [weatherUnits, setWeatherUnits] = useState<'fahrenheit' | 'celsius'>('fahrenheit')
  const [weatherGeocodingCity, setWeatherGeocodingCity] = useState('')
  const [weatherGeocodingLoading, setWeatherGeocodingLoading] = useState(false)
  const [weatherGeocodingError, setWeatherGeocodingError] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadSettings()
      loadGoogleStatus()
      loadFamilyMembersForDropdown()
      checkPushStatus()
    }
  }, [isOpen])

  async function loadFamilyMembersForDropdown() {
    const { data } = await supabase
      .from('family_members')
      .select('id, name, color')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    setFamilyMembersForDropdown(data || [])
  }

  async function checkPushStatus() {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setPushPermission(Notification.permission)
    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setPushSubscribed(!!sub)
    } else {
      setPushSubscribed(false)
    }
  }

  async function enablePushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setPushEnabling(true)
    try {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)
      if (permission !== 'granted') return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      })
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(sub.toJSON())
      })
      setPushSubscribed(true)
    } finally {
      setPushEnabling(false)
    }
  }

  async function disablePushNotifications() {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
    setPushSubscribed(false)
  }

  async function loadGoogleStatus() {
    setGoogleLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setAccessToken(session?.access_token ?? null)

      const { data: integrations } = await supabase
        .from('user_integrations')
        .select('id, google_email')
        .eq('provider', 'google')
        .order('id', { ascending: true })

      if (!integrations || integrations.length === 0) {
        setGoogleConnected(false)
        setGoogleAccounts([])
        return
      }

      setGoogleConnected(true)

      const { data: calendars } = await supabase
        .from('external_calendars')
        .select('id, external_calendar_id, calendar_name, calendar_color, is_enabled, family_member_ids, last_synced_at, integration_id')
        .eq('provider', 'google')
        .order('calendar_name', { ascending: true })

      // Group calendars by integration_id
      const accounts: GoogleAccount[] = integrations.map(integration => ({
        integration_id: integration.id,
        google_email: integration.google_email ?? null,
        calendars: (calendars || [])
          .filter(c => c.integration_id === integration.id)
          .map(c => ({
            ...c,
            family_member_ids: (() => {
              try { return JSON.parse(c.family_member_ids || '[]') as number[] }
              catch { return [] }
            })(),
          })),
      }))
      setGoogleAccounts(accounts)
    } finally {
      setGoogleLoading(false)
    }
  }

  function handleConnectGoogle() {
    if (!accessToken) {
      onShowToast?.('Please wait while your session loads', 'error')
      return
    }
    window.location.href = `/api/google-auth?token=${accessToken}`
  }

  async function handleSyncGoogle() {
    if (!accessToken) return
    setGoogleSyncing(true)
    try {
      const res = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const result = await res.json()
        onShowToast?.(`Synced ${result.synced} events from Google Calendar`, 'success')
        await loadGoogleStatus()
        onExternalCalendarsChange?.()
      } else {
        onShowToast?.('Sync failed — please try again', 'error')
      }
    } catch {
      onShowToast?.('Sync failed — please try again', 'error')
    } finally {
      setGoogleSyncing(false)
    }
  }

  async function handleDisconnectGoogle(integrationId?: number) {
    if (!accessToken) return
    const label = integrationId ? 'this Google account' : 'all Google accounts'
    if (!window.confirm(`Disconnect ${label}? All synced events will be removed from Skylight.`)) return
    try {
      const res = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(integrationId ? { integrationId } : {}),
      })
      if (res.ok) {
        onShowToast?.('Google Calendar disconnected', 'success')
        await loadGoogleStatus()
        onExternalCalendarsChange?.()
      } else {
        onShowToast?.('Failed to disconnect — please try again', 'error')
      }
    } catch {
      onShowToast?.('Failed to disconnect — please try again', 'error')
    }
  }

  async function handleToggleCalendar(calendarId: number, enabled: boolean) {
    const { error } = await supabase
      .from('external_calendars')
      .update({ is_enabled: enabled })
      .eq('id', calendarId)
    if (!error) {
      setGoogleAccounts(prev => prev.map(acct => ({
        ...acct,
        calendars: acct.calendars.map(c => c.id === calendarId ? { ...c, is_enabled: enabled } : c),
      })))
      onExternalCalendarsChange?.()
    }
  }

  async function handleAssignMember(calendarId: number, memberId: number) {
    // Toggle: add if not present, remove if present
    const account = googleAccounts.find(a => a.calendars.some(c => c.id === calendarId))
    const cal = account?.calendars.find(c => c.id === calendarId)
    if (!cal) return
    const current = cal.family_member_ids
    const updated = current.includes(memberId)
      ? current.filter(id => id !== memberId)
      : [...current, memberId]
    const { error } = await supabase
      .from('external_calendars')
      .update({ family_member_ids: JSON.stringify(updated) })
      .eq('id', calendarId)
    if (!error) {
      setGoogleAccounts(prev => prev.map(acct => ({
        ...acct,
        calendars: acct.calendars.map(c => c.id === calendarId ? { ...c, family_member_ids: updated } : c),
      })))
      onExternalCalendarsChange?.()
    }
  }

  async function loadSettings() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error loading settings:', error)
      // If no settings exist yet, keep defaults
    } else if (data) {
      setCalendarTitle(data.calendar_title)
      setFamilySectionTitle(data.family_section_title)
      setColorTheme(data.color_theme || 'glass')
      setEventColorMode(data.event_color_mode || 'member')
      setDateFormat(data.date_format || 'MM/DD/YYYY')
      setWeekStartDay(data.week_start_day || 'Sunday')
      setAdminPinHash(data.admin_pin_hash || null)
      setShowIngredients(data.show_ingredients ?? true)
      setShowRewards(data.show_rewards ?? true)
      setWeatherLocation(data.weather_location || '')
      setWeatherLat(data.weather_lat ?? null)
      setWeatherLon(data.weather_lon ?? null)
      setWeatherUnits(data.weather_units === 'celsius' ? 'celsius' : 'fahrenheit')
      setWeatherGeocodingCity(data.weather_location || '')
    }

    setLoading(false)
  }

  async function handleSavePin() {
    setPinError('')
    if (pinMode === 'setting' || pinMode === 'changing') {
      if (!/^\d{4}$/.test(pinNew)) { setPinError('PIN must be exactly 4 digits'); return }
      if (pinNew !== pinConfirm) { setPinError('PINs do not match'); return }
      if (pinMode === 'changing') {
        const currentHash = await sha256(pinCurrent)
        if (currentHash !== adminPinHash) { setPinError('Current PIN is incorrect'); return }
      }
      setPinSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setPinSaving(false); return }
      const newHash = await sha256(pinNew)
      const { error } = await supabase.from('app_settings').upsert(
        { user_id: user.id, admin_pin_hash: newHash }, { onConflict: 'user_id' }
      )
      setPinSaving(false)
      if (error) { setPinError('Failed to save PIN'); return }
      setAdminPinHash(newHash)
      cancelPinEdit()
      onShowToast?.('Admin PIN saved', 'success')
    }
  }

  async function handleRemovePin() {
    setPinError('')
    const currentHash = await sha256(pinCurrent)
    if (currentHash !== adminPinHash) { setPinError('Current PIN is incorrect'); return }
    setPinSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setPinSaving(false); return }
    const { error } = await supabase.from('app_settings').upsert(
      { user_id: user.id, admin_pin_hash: null }, { onConflict: 'user_id' }
    )
    setPinSaving(false)
    if (error) { setPinError('Failed to remove PIN'); return }
    setAdminPinHash(null)
    cancelPinEdit()
    onShowToast?.('Admin PIN removed', 'success')
  }

  function cancelPinEdit() {
    setPinMode('idle'); setPinCurrent(''); setPinNew(''); setPinConfirm(''); setPinError('')
  }

  async function handleGeocodeCity() {
    if (!weatherGeocodingCity.trim()) return
    setWeatherGeocodingLoading(true)
    setWeatherGeocodingError('')
    try {
      const res = await fetch(`/api/weather/geocode?city=${encodeURIComponent(weatherGeocodingCity.trim())}`)
      if (!res.ok) {
        const err = await res.json()
        setWeatherGeocodingError(err.error || 'Location not found')
        return
      }
      const { lat, lon, name } = await res.json()
      setWeatherLat(lat)
      setWeatherLon(lon)
      setWeatherLocation(name)
      setWeatherGeocodingCity(name)
      setWeatherGeocodingError('')
    } catch (err) {
      console.error('Geocode lookup failed:', err)
      setWeatherGeocodingError('Failed to look up location')
    } finally {
      setWeatherGeocodingLoading(false)
    }
  }

  async function handleSave() {
    if (!familySectionTitle.trim()) {
      onShowToast?.('Family section title cannot be empty', 'error')
      return
    }

    if (familySectionTitle.length > 25) {
      onShowToast?.('Family section title must be 25 characters or less', 'error')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      onShowToast?.('Not signed in — please refresh and try again', 'error')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        user_id: user.id,
        calendar_title: calendarTitle.trim(),
        family_section_title: familySectionTitle.trim(),
        color_theme: colorTheme,
        event_color_mode: eventColorMode,
        date_format: dateFormat,
        week_start_day: weekStartDay,
        weather_location: weatherLocation || null,
        weather_lat: weatherLat,
        weather_lon: weatherLon,
        weather_units: weatherUnits,
        show_ingredients: showIngredients,
        show_rewards: showRewards,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    setLoading(false)

    if (error) {
      console.error('Error saving settings:', error)
      onShowToast?.('Failed to save settings', 'error')
      return
    }

    onShowToast?.('Settings saved successfully', 'success')
    onSettingsUpdate()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="shrink-0 bg-white/10 backdrop-blur-xl border-b border-white/20 p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-white">⚙️ Settings</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-white/60 hover:text-white text-3xl leading-none transition-colors"
            >
              ✕
            </button>
          </div>
          {!loading && (
            <div className="flex gap-1 mt-4 overflow-x-auto pb-1 -mb-1">
              {([
                ['general', '⚙️', 'General'],
                ['members', '👪', 'Members'],
                ['calendars', '📅', 'Calendars'],
                ['weather', '🌤️', 'Weather'],
                ['notifications', '🔔', 'Alerts'],
                ['security', '🔒', 'Security'],
              ] as const).map(([id, icon, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  aria-current={activeTab === id ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === id ? 'bg-white/25 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-white/60 text-center py-8">Loading settings...</div>
          ) : (
            <>
              {activeTab === 'general' && (<div className="space-y-6">
              {/* Family Name */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Family Name
                  <span className="text-white/60 font-normal text-sm ml-2">
                    ({calendarTitle.length}/30)
                  </span>
                </label>
                <input
                  type="text"
                  value={calendarTitle}
                  onChange={(e) => setCalendarTitle(e.target.value.slice(0, 30))}
                  placeholder="e.g., Williams"
                  maxLength={30}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                />
                <p className="text-white/60 text-sm mt-1">
                  Prefix shown on each section header (e.g. “Williams” → “Williams Calendar”). Leave blank to omit.
                </p>
              </div>

              {/* Family Section Title */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Family Section Title
                  <span className="text-white/60 font-normal text-sm ml-2">
                    ({familySectionTitle.length}/25)
                  </span>
                </label>
                <input
                  type="text"
                  value={familySectionTitle}
                  onChange={(e) => setFamilySectionTitle(e.target.value.slice(0, 25))}
                  placeholder="e.g., Our Gang, The Crew"
                  maxLength={25}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                />
                <p className="text-white/60 text-sm mt-1">
                  This appears above the family members list in the sidebar
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-white/20 pt-4">
                <h4 className="text-white font-semibold mb-4">Display Preferences</h4>
              </div>

              {/* Color Theme */}
              <div>
                <label className="block text-white font-semibold mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'glass', label: 'Glassmorphism', colors: '#ee7752,#e73c7e,#23a6d5,#667eea' },
                    { value: 'pastel', label: 'Pastel', colors: '#ffd6a5,#ffadcc,#c9b8ff,#b8e4ff' },
                  ].map(theme => (
                    <button key={theme.value} type="button" onClick={() => setColorTheme(theme.value)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                        colorTheme === theme.value ? 'border-white/60 bg-white/20' : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}>
                      <div className="h-8 rounded-lg mb-2" style={{ background: `linear-gradient(90deg, ${theme.colors})` }} />
                      <span className="text-white text-sm font-medium">{theme.label}</span>
                      {colorTheme === theme.value && <span className="ml-2 text-green-300 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Colors */}
              <div>
                <label className="block text-white font-semibold mb-2">Event Colors</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEventColorMode('member')}
                    className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      eventColorMode === 'member' ? 'bg-white/25 border-white/50 text-white' : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                    }`}>
                    👨‍👩‍👧 Member Colors
                  </button>
                  <button type="button" onClick={() => setEventColorMode('custom')}
                    className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      eventColorMode === 'custom' ? 'bg-white/25 border-white/50 text-white' : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                    }`}>
                    🎨 Custom Colors
                  </button>
                </div>
                <p className="text-white/60 text-sm mt-1">
                  {eventColorMode === 'member' ? 'Event colors are derived from assigned family members' : 'Each event has its own color chosen when creating/editing'}
                </p>
              </div>

              {/* Date Format */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                >
                  <option value="MM/DD/YYYY" className="bg-gray-800">MM/DD/YYYY (02/07/2026)</option>
                  <option value="DD/MM/YYYY" className="bg-gray-800">DD/MM/YYYY (07/02/2026)</option>
                  <option value="YYYY-MM-DD" className="bg-gray-800">YYYY-MM-DD (2026-02-07)</option>
                  <option value="MMM DD, YYYY" className="bg-gray-800">MMM DD, YYYY (Feb 07, 2026)</option>
                  <option value="DD MMM YYYY" className="bg-gray-800">DD MMM YYYY (07 Feb 2026)</option>
                </select>
                <p className="text-white/60 text-sm mt-1">
                  How dates appear throughout the app
                </p>
              </div>

              {/* Week Start Day */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Week Starts On
                </label>
                <select
                  value={weekStartDay}
                  onChange={(e) => setWeekStartDay(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                >
                  <option value="Sunday" className="bg-gray-800">Sunday</option>
                  <option value="Monday" className="bg-gray-800">Monday</option>
                  <option value="Saturday" className="bg-gray-800">Saturday</option>
                </select>
                <p className="text-white/60 text-sm mt-1">
                  First day of the week in calendar view
                </p>
              </div>

              {/* Divider — Feature Visibility */}
              <div className="border-t border-white/20 pt-4">
                <h4 className="text-white font-semibold mb-1">Feature Visibility</h4>
                <p className="text-white/60 text-sm mb-4">Hide sections you don't use to keep the app tidy.</p>
              </div>

              <div className="space-y-3">
                {[{label: 'Ingredients tab (in Recipes)', value: showIngredients, set: setShowIngredients},
                  {label: 'Rewards (in Tasks)', value: showRewards, set: setShowRewards}]
                  .map(({ label, value, set }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-white/80 text-sm">{label}</span>
                    <button
                      type="button"
                      onClick={() => set(!value)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors duration-200 ${
                        value ? 'bg-green-500/60 border-green-400/60' : 'bg-white/20 border-white/30'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ${
                        value ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              </div>)}
              {activeTab === 'calendars' && (<div className="space-y-6">
              {/* Divider — Connected Calendars */}
              <div className="pt-1">
                <h4 className="text-white font-semibold mb-1">Connected Calendars</h4>
                <p className="text-white/60 text-sm mb-4">
                  View your Google Calendar events alongside Skylight events (read-only).
                </p>
              </div>

              {/* Connected Calendars Section */}
              {googleLoading ? (
                <div className="text-white/60 text-sm text-center py-4">Loading calendar status...</div>
              ) : !googleConnected ? (
                <div className="flex flex-col items-start gap-3">
                  <button
                    onClick={handleConnectGoogle}
                    className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-lg border border-white/30 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{background:'linear-gradient(135deg,#4285F4 25%,#EA4335 50%,#FBBC04 75%,#34A853 100%)',color:'white'}}>G</span> Connect Google Calendar
                  </button>
                  <p className="text-white/50 text-xs">
                    You&apos;ll be redirected to Google to grant read-only calendar access.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Sync + Add Another Account row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={handleSyncGoogle}
                      disabled={googleSyncing}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-lg border border-white/30 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className={googleSyncing ? 'animate-spin' : ''}>🔄</span>
                      {googleSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={handleConnectGoogle}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white/80 text-sm font-medium transition-all duration-200 hover:scale-105"
                    >
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold" style={{background:'linear-gradient(135deg,#4285F4 25%,#EA4335 50%,#FBBC04 75%,#34A853 100%)',color:'white'}}>G</span>
                      Add Another Account
                    </button>
                  </div>

                  {/* Accounts grouped */}
                  {googleAccounts.map(account => (
                    <div key={account.integration_id} className="rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                      {/* Account header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0" style={{background:'linear-gradient(135deg,#4285F4 25%,#EA4335 50%,#FBBC04 75%,#34A853 100%)',color:'white'}}>G</span>
                          <span className="text-white text-sm font-semibold truncate">{account.google_email ?? 'Google Account'}</span>
                        </div>
                        <button
                          onClick={() => handleDisconnectGoogle(account.integration_id)}
                          className="flex-shrink-0 px-3 py-1 bg-red-500/30 hover:bg-red-500/50 border border-red-500/40 rounded-lg text-white text-xs font-medium transition-all duration-200 hover:scale-105"
                        >
                          Disconnect
                        </button>
                      </div>

                      {/* Calendar list for this account */}
                      {account.calendars.length === 0 ? (
                        <p className="text-white/50 text-sm px-4 py-3">No calendars found. Try syncing.</p>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {account.calendars.map(cal => (
                            <div key={cal.id} className="px-4 py-3 space-y-2">
                              {/* Row 1: color dot + name + toggle */}
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.calendar_color ?? '#9CA3AF' }} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-white text-sm font-medium truncate">{cal.calendar_name}</div>
                                  {cal.last_synced_at && (
                                    <div className="text-white/40 text-xs">Synced {new Date(cal.last_synced_at).toLocaleString()}</div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleToggleCalendar(cal.id, !cal.is_enabled)}
                                  className={`flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200 relative ${
                                    cal.is_enabled ? 'bg-green-500/60 border border-green-400/40' : 'bg-white/20 border border-white/20'
                                  }`}
                                  title={cal.is_enabled ? 'Disable this calendar' : 'Enable this calendar'}
                                >
                                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                                    cal.is_enabled ? 'left-4' : 'left-0.5'
                                  }`} />
                                </button>
                              </div>

                              {/* Row 2: assign to family members (avatar toggle buttons) */}
                              {familyMembersForDropdown.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap pl-6">
                                  <span className="text-white/50 text-xs">Assign to:</span>
                                  {familyMembersForDropdown.map(m => {
                                    const active = cal.family_member_ids.includes(m.id)
                                    return (
                                      <button
                                        key={m.id}
                                        onClick={() => handleAssignMember(cal.id, m.id)}
                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-150 border ${
                                          active
                                            ? 'border-transparent text-white scale-105'
                                            : 'border-white/20 text-white/50 hover:text-white/80 hover:border-white/40'
                                        }`}
                                        style={active ? { backgroundColor: m.color + 'cc' } : {}}
                                        title={active ? `Remove ${m.name}` : `Assign to ${m.name}`}
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: m.color }}
                                        />
                                        {m.name}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              </div>)}
              {activeTab === 'security' && (<div className="space-y-6">
              {/* Admin PIN */}
              <div className="pt-1">
                <h4 className="text-white font-semibold mb-1">Admin PIN</h4>
                <p className="text-white/60 text-sm mb-4">
                  Restrict access to Settings with a 4-digit PIN. Optional — leave unset to keep Settings open to everyone.
                </p>
              </div>

              <div className="space-y-3">
                {pinMode === 'idle' && !adminPinHash && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/60 text-sm">🔓 No PIN set — Settings are open to all</span>
                    <button
                      onClick={() => setPinMode('setting')}
                      className="flex-shrink-0 px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all duration-200"
                    >
                      Set PIN
                    </button>
                  </div>
                )}
                {pinMode === 'idle' && adminPinHash && (
                  <div className="space-y-2">
                    <p className="text-green-300 text-sm">🔒 PIN is active — Settings are locked</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPinMode('changing')}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all duration-200"
                      >
                        Change PIN
                      </button>
                      <button
                        onClick={() => setPinMode('removing')}
                        className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-white text-sm font-medium transition-all duration-200"
                      >
                        Remove PIN
                      </button>
                    </div>
                  </div>
                )}
                {(pinMode === 'setting' || pinMode === 'changing' || pinMode === 'removing') && (
                  <div className="space-y-3 bg-white/5 rounded-xl p-4 border border-white/10">
                    {(pinMode === 'changing' || pinMode === 'removing') && (
                      <div>
                        <label className="block text-white/70 text-sm mb-1">
                          {pinMode === 'removing' ? 'Current PIN (to confirm removal)' : 'Current PIN'}
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          value={pinCurrent}
                          onChange={e => { setPinCurrent(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
                          placeholder="••••"
                          className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-center text-lg tracking-[0.5em] placeholder-white/30 focus:outline-none focus:border-white/50"
                        />
                      </div>
                    )}
                    {(pinMode === 'setting' || pinMode === 'changing') && (
                      <>
                        <div>
                          <label className="block text-white/70 text-sm mb-1">New PIN (4 digits)</label>
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            value={pinNew}
                            onChange={e => { setPinNew(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
                            placeholder="••••"
                            className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-center text-lg tracking-[0.5em] placeholder-white/30 focus:outline-none focus:border-white/50"
                          />
                        </div>
                        <div>
                          <label className="block text-white/70 text-sm mb-1">Confirm New PIN</label>
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            value={pinConfirm}
                            onChange={e => { setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
                            placeholder="••••"
                            className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-center text-lg tracking-[0.5em] placeholder-white/30 focus:outline-none focus:border-white/50"
                          />
                        </div>
                      </>
                    )}
                    {pinError && <p className="text-red-300 text-sm">{pinError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={cancelPinEdit}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all duration-200"
                      >
                        Cancel
                      </button>
                      {pinMode !== 'removing' ? (
                        <button
                          onClick={handleSavePin}
                          disabled={pinSaving}
                          className="px-4 py-2 bg-green-500/30 hover:bg-green-500/40 border border-green-500/40 rounded-lg text-white text-sm font-medium transition-all duration-200 disabled:opacity-50"
                        >
                          {pinSaving ? 'Saving…' : 'Save PIN'}
                        </button>
                      ) : (
                        <button
                          onClick={handleRemovePin}
                          disabled={pinSaving}
                          className="px-4 py-2 bg-red-500/30 hover:bg-red-500/40 border border-red-500/40 rounded-lg text-white text-sm font-medium transition-all duration-200 disabled:opacity-50"
                        >
                          {pinSaving ? 'Removing…' : 'Remove PIN'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              </div>)}
              {activeTab === 'weather' && (<div className="space-y-6">
              {/* Weather */}
              <div className="pt-1">
                <h4 className="text-white font-semibold mb-4">🌤️ Weather</h4>
                <p className="text-white/60 text-sm mb-4">
                  Enter your city or zip code to show weather forecasts on the calendar and homescreen.
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={weatherGeocodingCity}
                    onChange={e => setWeatherGeocodingCity(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleGeocodeCity() }}
                    placeholder="City or zip code…"
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/40 text-sm"
                  />
                  <button
                    onClick={handleGeocodeCity}
                    disabled={weatherGeocodingLoading}
                    className="px-4 py-2 bg-blue-500/70 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors disabled:opacity-50"
                  >
                    {weatherGeocodingLoading ? '…' : 'Find'}
                  </button>
                </div>
                {weatherGeocodingError && (
                  <p className="text-red-400 text-xs mb-2">{weatherGeocodingError}</p>
                )}
                {weatherLat !== null && (
                  <p className="text-green-300 text-xs mb-3">📍 {weatherLocation}</p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-sm">Units:</span>
                  <div className="flex gap-1 bg-white/10 rounded-xl p-1">
                    {(['fahrenheit', 'celsius'] as const).map(u => (
                      <button
                        key={u}
                        onClick={() => setWeatherUnits(u)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${weatherUnits === u ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}
                      >
                        {u === 'fahrenheit' ? '°F' : '°C'}
                      </button>
                    ))}
                  </div>
                  {weatherLat !== null && (
                    <button
                      onClick={() => { setWeatherLat(null); setWeatherLon(null); setWeatherLocation(''); setWeatherGeocodingCity('') }}
                      className="text-white/40 hover:text-red-400 text-xs transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              </div>)}
              {activeTab === 'notifications' && (<div className="space-y-6">
              {/* Push Notifications */}
              <div className="pt-1">
                <h4 className="text-white font-semibold mb-4">Push Notifications</h4>
                <p className="text-white/60 text-sm mb-4">
                  Receive a morning summary of today&apos;s tasks every day.
                </p>
                {typeof window !== 'undefined' && 'Notification' in window ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-sm">
                      {pushPermission === 'denied' ? (
                        <span className="text-red-300">Notifications blocked by browser. Enable in browser settings.</span>
                      ) : pushSubscribed ? (
                        <span className="text-green-300">Notifications enabled</span>
                      ) : (
                        <span className="text-white/60">Notifications disabled</span>
                      )}
                    </div>
                    {pushPermission !== 'denied' && (
                      pushSubscribed ? (
                        <button
                          onClick={disablePushNotifications}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={enablePushNotifications}
                          disabled={pushEnabling}
                          className="px-3 py-1.5 bg-blue-500/80 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                        >
                          {pushEnabling ? 'Enabling…' : 'Enable'}
                        </button>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-white/40 text-sm">Push notifications are not supported in this browser.</p>
                )}
              </div>

              </div>)}
              {activeTab === 'members' && (<div className="space-y-6">
              {/* Family Members */}
              <div className="pt-1">
                <h4 className="text-white font-semibold mb-4">Family Members</h4>
                <p className="text-white/60 text-sm mb-4">
                  Manage family members who appear on the calendar. Add members at the beginning of setup.
                </p>
              </div>

              {/* Family Members Section */}
              <div className="-mx-6">
                <div className="px-6">
                  <FamilyMembers title="" />
                </div>
              </div>
              </div>)}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white/10 backdrop-blur-xl border-t border-white/20 p-6">
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full mb-3 px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-300 hover:text-red-200 text-sm font-medium transition-all duration-200"
            >
              🚪 Sign Out
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-lg border border-white/30 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-500/30 hover:bg-green-500/40 backdrop-blur-lg border border-green-500/40 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
