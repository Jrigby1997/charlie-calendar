'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import FamilyMembers from './FamilyMembers'

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
}

export default function SettingsModal({ isOpen, onClose, onSettingsUpdate, onShowToast, onExternalCalendarsChange }: SettingsModalProps) {
  const [calendarTitle, setCalendarTitle] = useState('Charlie Calendar')
  const [familySectionTitle, setFamilySectionTitle] = useState('Family Members')
  const [colorTheme, setColorTheme] = useState('default')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [weekStartDay, setWeekStartDay] = useState('Sunday')
  const [loading, setLoading] = useState(false)

  // Google Calendar integration state
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleSyncing, setGoogleSyncing] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [familyMembersForDropdown, setFamilyMembersForDropdown] = useState<{ id: number; name: string; color: string }[]>([])

  useEffect(() => {
    if (isOpen) {
      loadSettings()
      loadGoogleStatus()
      loadFamilyMembersForDropdown()
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

    // Load settings (for now, get the first row since we don't have auth)
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      console.error('Error loading settings:', error)
      // If no settings exist yet, keep defaults
    } else if (data) {
      setCalendarTitle(data.calendar_title)
      setFamilySectionTitle(data.family_section_title)
      setColorTheme(data.color_theme || 'default')
      setDateFormat(data.date_format || 'MM/DD/YYYY')
      setWeekStartDay(data.week_start_day || 'Sunday')
    }

    setLoading(false)
  }

  async function handleSave() {
    if (!calendarTitle.trim() || !familySectionTitle.trim()) {
      onShowToast?.('Titles cannot be empty', 'error')
      return
    }

    if (calendarTitle.length > 30) {
      onShowToast?.('Calendar title must be 30 characters or less', 'error')
      return
    }

    if (familySectionTitle.length > 25) {
      onShowToast?.('Family section title must be 25 characters or less', 'error')
      return
    }

    setLoading(true)

    // First, check if settings exist
    const { data: existingSettings } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1)
      .single()

    let error

    if (existingSettings) {
      // Update existing settings
      const result = await supabase
        .from('app_settings')
        .update({
          calendar_title: calendarTitle.trim(),
          family_section_title: familySectionTitle.trim(),
          color_theme: colorTheme,
          date_format: dateFormat,
          week_start_day: weekStartDay,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSettings.id)

      error = result.error
    } else {
      // Insert new settings
      const result = await supabase
        .from('app_settings')
        .insert({
          user_id: null, // Will be updated when auth is added
          calendar_title: calendarTitle.trim(),
          family_section_title: familySectionTitle.trim(),
          color_theme: colorTheme,
          date_format: dateFormat,
          week_start_day: weekStartDay
        })

      error = result.error
    }

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
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white/10 backdrop-blur-xl border-b border-white/20 p-6 z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-white">⚙️ Settings</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-3xl leading-none transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="text-white/60 text-center py-8">Loading settings...</div>
          ) : (
            <>
              {/* Calendar Title */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Calendar Title
                  <span className="text-white/60 font-normal text-sm ml-2">
                    ({calendarTitle.length}/30)
                  </span>
                </label>
                <input
                  type="text"
                  value={calendarTitle}
                  onChange={(e) => setCalendarTitle(e.target.value.slice(0, 30))}
                  placeholder="e.g., Williams Family Calendar"
                  maxLength={30}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                />
                <p className="text-white/60 text-sm mt-1">
                  This appears as the main title at the top of the page
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
                <label className="block text-white font-semibold mb-2">
                  Color Theme
                </label>
                <select
                  value={colorTheme}
                  onChange={(e) => setColorTheme(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                >
                  <option value="default" className="bg-gray-800">Default (Purple/Blue)</option>
                  <option value="ocean" className="bg-gray-800">Ocean (Blue/Teal)</option>
                  <option value="sunset" className="bg-gray-800">Sunset (Orange/Pink)</option>
                  <option value="forest" className="bg-gray-800">Forest (Green/Emerald)</option>
                  <option value="lavender" className="bg-gray-800">Lavender (Purple/Pink)</option>
                </select>
                <p className="text-white/60 text-sm mt-1">
                  Changes the background gradient colors
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

              {/* Divider — Connected Calendars */}
              <div className="border-t border-white/20 pt-4">
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
                          className="flex-shrink-0 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-200 text-xs font-medium transition-all duration-200 hover:scale-105"
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

              {/* Divider */}
              <div className="border-t border-white/20 pt-4">
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/10 backdrop-blur-xl border-t border-white/20 p-6 flex gap-3">
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
  )
}
