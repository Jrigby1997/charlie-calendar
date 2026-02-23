'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import FamilyMembers from './FamilyMembers'

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  onSettingsUpdate: () => void
  onShowToast?: (message: string, tone: 'success' | 'error') => void
}

export default function SettingsModal({ isOpen, onClose, onSettingsUpdate, onShowToast }: SettingsModalProps) {
  const [calendarTitle, setCalendarTitle] = useState('Charlie Calendar')
  const [familySectionTitle, setFamilySectionTitle] = useState('Family Members')
  const [colorTheme, setColorTheme] = useState('default')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [weekStartDay, setWeekStartDay] = useState('Sunday')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

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
