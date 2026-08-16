'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SectionCard from './ui/SectionCard'
import GlassButton from './ui/GlassButton'
import { computeMaintenanceStatus, TrackType } from '@/lib/maintenance'

type MaintenanceAsset = {
  id: number
  name: string
  emoji: string
  odometer: number | null
  odometer_updated_at: string | null
  sort_order: number
}

type MaintenanceItem = {
  id: number
  asset_id: number
  name: string
  track_type: TrackType
  interval_value: number
  interval_unit: 'days' | 'weeks' | 'months' | null
  last_service_date: string | null
  last_service_odometer: number | null
  uses_since_service: number
  notes: string | null
  sort_order: number
}

type MaintenanceViewProps = {
  sectionTitle?: string
  userId: string
  onShowToast?: (message: string, tone: 'success' | 'error') => void
}

const ASSET_EMOJI = ['🚗', '🚙', '🛻', '🏍️', '🚜', '🔥', '🍖', '🌡️', '❄️', '💧', '🏠', '🪚', '🧹', '⚙️', '🔧']

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STATE_STYLES: Record<string, { bar: string; text: string; ring: string }> = {
  overdue: { bar: 'bg-red-400',    text: 'text-red-300',    ring: 'border-red-400/40' },
  soon:    { bar: 'bg-amber-400',  text: 'text-amber-300',  ring: 'border-amber-400/40' },
  ok:      { bar: 'bg-green-400',  text: 'text-green-300',  ring: 'border-white/15' },
  unknown: { bar: 'bg-white/30',   text: 'text-white/50',   ring: 'border-white/15' },
}

export default function MaintenanceView({ sectionTitle, userId, onShowToast }: MaintenanceViewProps) {
  const [assets, setAssets] = useState<MaintenanceAsset[]>([])
  const [items, setItems] = useState<MaintenanceItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [assetModal, setAssetModal] = useState<{ editing: MaintenanceAsset | null } | null>(null)
  const [itemModal, setItemModal] = useState<{ assetId: number; editing: MaintenanceItem | null } | null>(null)
  const [odometerEdit, setOdometerEdit] = useState<{ id: number; value: string } | null>(null)

  function toast(message: string, tone: 'success' | 'error' = 'success') {
    onShowToast?.(message, tone)
  }

  async function loadData() {
    setLoading(true)
    const [{ data: a }, { data: i }] = await Promise.all([
      supabase.from('maintenance_assets').select('*').eq('user_id', userId).order('sort_order').order('created_at'),
      supabase.from('maintenance_items').select('*').eq('user_id', userId).order('sort_order').order('created_at'),
    ])
    setAssets((a ?? []) as MaintenanceAsset[])
    setItems((i ?? []) as MaintenanceItem[])
    setLoading(false)
  }

  useEffect(() => { if (userId) loadData() }, [userId])

  async function markServiced(item: MaintenanceItem) {
    const asset = assets.find(a => a.id === item.asset_id)
    const patch: Partial<MaintenanceItem> = { last_service_date: todayISO() }
    if (item.track_type === 'miles') patch.last_service_odometer = asset?.odometer ?? item.last_service_odometer ?? 0
    if (item.track_type === 'uses') patch.uses_since_service = 0
    const { error } = await supabase.from('maintenance_items').update(patch).eq('id', item.id).eq('user_id', userId)
    if (error) return toast('Failed to update', 'error')
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, ...patch } as MaintenanceItem : it))
    toast(`${item.name} marked serviced ✓`)
  }

  async function incrementUse(item: MaintenanceItem, delta: number) {
    const next = Math.max(0, (item.uses_since_service ?? 0) + delta)
    const { error } = await supabase.from('maintenance_items').update({ uses_since_service: next }).eq('id', item.id).eq('user_id', userId)
    if (error) return toast('Failed to update', 'error')
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, uses_since_service: next } : it))
  }

  async function saveOdometer(asset: MaintenanceAsset, value: number) {
    const { error } = await supabase.from('maintenance_assets')
      .update({ odometer: value, odometer_updated_at: new Date().toISOString() })
      .eq('id', asset.id).eq('user_id', userId)
    if (error) return toast('Failed to update mileage', 'error')
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, odometer: value } : a))
    setOdometerEdit(null)
  }

  async function deleteAsset(asset: MaintenanceAsset) {
    if (!confirm(`Delete "${asset.name}" and all its maintenance items?`)) return
    const { error } = await supabase.from('maintenance_assets').delete().eq('id', asset.id).eq('user_id', userId)
    if (error) return toast('Failed to delete', 'error')
    setAssets(prev => prev.filter(a => a.id !== asset.id))
    setItems(prev => prev.filter(it => it.asset_id !== asset.id))
    toast('Asset deleted')
  }

  async function deleteItem(item: MaintenanceItem) {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from('maintenance_items').delete().eq('id', item.id).eq('user_id', userId)
    if (error) return toast('Failed to delete', 'error')
    setItems(prev => prev.filter(it => it.id !== item.id))
  }

  const base = (sectionTitle || 'Maintenance').replace(/\s*Maintenance\s*$/i, '').trim()
  const title = base ? `${base} Maintenance` : 'Maintenance'

  return (
    <SectionCard className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 md:px-6 pt-4 md:pt-6 pb-4">
        <h2 className="text-lg md:text-2xl font-bold text-white drop-shadow-lg truncate">🔧 {title}</h2>
        <GlassButton size="sm" onClick={() => setAssetModal({ editing: null })}>+ Add vehicle / appliance</GlassButton>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto view-scroll px-4 md:px-6 pb-6 space-y-4">
        {loading ? (
          <div className="text-white/50 text-center py-16">Loading…</div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 text-white/50">
            <p className="text-4xl mb-3">🔧</p>
            <p className="font-medium text-white/70">No vehicles or appliances yet</p>
            <p className="text-sm mt-1">Add a car, smoker, furnace, etc. — then track oil changes, filter swaps, cleanings by miles, time, or uses.</p>
          </div>
        ) : (
          assets.map(asset => {
            const assetItems = items.filter(it => it.asset_id === asset.id)
            return (
              <div key={asset.id} className="bg-white/5 border border-white/15 rounded-2xl overflow-hidden">
                {/* Asset header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/5">
                  <span className="text-2xl">{asset.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{asset.name}</p>
                    {/* Odometer control */}
                    {odometerEdit?.id === asset.id ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="number"
                          autoFocus
                          value={odometerEdit.value}
                          onChange={e => setOdometerEdit({ id: asset.id, value: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter' && odometerEdit.value) saveOdometer(asset, Number(odometerEdit.value)) }}
                          className="w-28 bg-white/10 border border-white/25 rounded-lg px-2 py-1 text-white text-sm"
                          placeholder="Current mi"
                        />
                        <button onClick={() => odometerEdit.value && saveOdometer(asset, Number(odometerEdit.value))} className="text-green-300 text-sm px-2">✓</button>
                        <button onClick={() => setOdometerEdit(null)} className="text-white/40 text-sm px-1">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setOdometerEdit({ id: asset.id, value: asset.odometer != null ? String(asset.odometer) : '' })}
                        className="text-white/50 hover:text-white/80 text-xs mt-0.5 transition-colors"
                      >
                        {asset.odometer != null ? `📏 ${asset.odometer.toLocaleString('en-US')} mi · update` : '📏 Set current mileage'}
                      </button>
                    )}
                  </div>
                  <button onClick={() => setItemModal({ assetId: asset.id, editing: null })} className="text-white/60 hover:text-white text-xs px-2 py-1 bg-white/8 hover:bg-white/15 rounded-lg border border-white/15 transition-all whitespace-nowrap">+ Item</button>
                  <button onClick={() => setAssetModal({ editing: asset })} className="text-white/40 hover:text-white/70 text-sm px-1" title="Edit">✎</button>
                  <button onClick={() => deleteAsset(asset)} className="text-white/30 hover:text-red-300 text-sm px-1" title="Delete">🗑</button>
                </div>

                {/* Items */}
                {assetItems.length === 0 ? (
                  <p className="text-white/40 text-sm px-4 py-4">No items yet — add oil change, filter, cleaning…</p>
                ) : (
                  <div className="divide-y divide-white/5">
                    {assetItems.map(item => {
                      const s = computeMaintenanceStatus(item, asset.odometer)
                      const styles = STATE_STYLES[s.state]
                      return (
                        <div key={item.id} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-white text-sm font-medium truncate">{item.name}</p>
                                {s.state === 'overdue' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/25 text-red-200 border border-red-400/40">OVERDUE</span>}
                                {s.state === 'soon' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-400/40">SOON</span>}
                              </div>
                              <p className="text-white/40 text-xs mt-0.5">{s.detail}{item.last_service_date ? ` · last ${item.last_service_date}` : ''}</p>
                              {/* Progress bar */}
                              <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${Math.round(s.progress * 100)}%` }} />
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-xs font-semibold ${styles.text}`}>{s.label}</p>
                              <div className="flex items-center gap-1 justify-end mt-1">
                                {item.track_type === 'uses' && (
                                  <button onClick={() => incrementUse(item, 1)} className="text-[11px] px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white/80" title="Log one use">+1 use</button>
                                )}
                                <button onClick={() => markServiced(item)} className="text-[11px] px-2 py-0.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-200" title="Reset — just serviced">Serviced</button>
                                <button onClick={() => setItemModal({ assetId: asset.id, editing: item })} className="text-white/40 hover:text-white/70 text-xs px-1" title="Edit">✎</button>
                                <button onClick={() => deleteItem(item)} className="text-white/30 hover:text-red-300 text-xs px-1" title="Delete">🗑</button>
                              </div>
                            </div>
                          </div>
                          {item.notes && <p className="text-white/40 text-xs mt-1.5 italic">{item.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {assetModal && (
        <AssetModal
          userId={userId}
          editing={assetModal.editing}
          onClose={() => setAssetModal(null)}
          onSaved={() => { setAssetModal(null); loadData() }}
          onError={() => toast('Failed to save', 'error')}
        />
      )}
      {itemModal && (
        <ItemModal
          userId={userId}
          assetId={itemModal.assetId}
          asset={assets.find(a => a.id === itemModal.assetId) || null}
          editing={itemModal.editing}
          onClose={() => setItemModal(null)}
          onSaved={() => { setItemModal(null); loadData() }}
          onError={() => toast('Failed to save', 'error')}
        />
      )}
    </SectionCard>
  )
}

// ── Asset add/edit modal ──────────────────────────────────────────────────────
function AssetModal({ userId, editing, onClose, onSaved, onError }: {
  userId: string; editing: MaintenanceAsset | null
  onClose: () => void; onSaved: () => void; onError: () => void
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [emoji, setEmoji] = useState(editing?.emoji ?? '🚗')
  const [odometer, setOdometer] = useState(editing?.odometer != null ? String(editing.odometer) : '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const payload = {
      user_id: userId,
      name: name.trim(),
      emoji,
      odometer: odometer.trim() === '' ? null : Number(odometer),
      odometer_updated_at: odometer.trim() === '' ? null : new Date().toISOString(),
    }
    const { error } = editing
      ? await supabase.from('maintenance_assets').update(payload).eq('id', editing.id).eq('user_id', userId)
      : await supabase.from('maintenance_assets').insert(payload)
    setSaving(false)
    if (error) return onError()
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">{editing ? 'Edit' : 'Add'} vehicle / appliance</h3>
        <label className="block text-sm text-white/70 mb-1">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Honda Odyssey, Recteq Smoker" className="w-full bg-white/10 border border-white/25 rounded-xl px-3 py-2 text-white placeholder-white/40 mb-4 focus:outline-none focus:border-white/45" />
        <label className="block text-sm text-white/70 mb-2">Icon</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {ASSET_EMOJI.map(e => (
            <button key={e} onClick={() => setEmoji(e)} className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? 'bg-white/30 ring-2 ring-white/60' : 'hover:bg-white/15'}`}>{e}</button>
          ))}
        </div>
        <label className="block text-sm text-white/70 mb-1">Current mileage <span className="text-white/40">(vehicles only — optional)</span></label>
        <input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} placeholder="e.g. 84200" className="w-full bg-white/10 border border-white/25 rounded-xl px-3 py-2 text-white placeholder-white/40 mb-5 focus:outline-none focus:border-white/45" />
        <div className="flex gap-3 justify-end">
          <GlassButton size="md" onClick={onClose}>Cancel</GlassButton>
          <GlassButton size="md" variant="green" onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save'}</GlassButton>
        </div>
      </div>
    </div>
  )
}

// ── Item add/edit modal ─────────────────────────────────────────────────────
function ItemModal({ userId, assetId, asset, editing, onClose, onSaved, onError }: {
  userId: string; assetId: number; asset: MaintenanceAsset | null; editing: MaintenanceItem | null
  onClose: () => void; onSaved: () => void; onError: () => void
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [trackType, setTrackType] = useState<TrackType>(editing?.track_type ?? 'time')
  const [intervalValue, setIntervalValue] = useState(editing ? String(editing.interval_value) : '')
  const [intervalUnit, setIntervalUnit] = useState<'days' | 'weeks' | 'months'>(editing?.interval_unit ?? 'months')
  const [lastDate, setLastDate] = useState(editing?.last_service_date ?? todayISO())
  const [lastOdo, setLastOdo] = useState(
    editing?.last_service_odometer != null ? String(editing.last_service_odometer) : (asset?.odometer != null ? String(asset.odometer) : '')
  )
  const [usesSoFar, setUsesSoFar] = useState(editing ? String(editing.uses_since_service) : '0')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const TYPES: { value: TrackType; label: string }[] = [
    { value: 'miles', label: '📏 Miles' },
    { value: 'time', label: '📅 Time' },
    { value: 'uses', label: '🔁 Uses' },
  ]

  async function save() {
    if (!name.trim() || !intervalValue || Number(intervalValue) <= 0) return
    setSaving(true)
    const payload: any = {
      user_id: userId,
      asset_id: assetId,
      name: name.trim(),
      track_type: trackType,
      interval_value: Number(intervalValue),
      interval_unit: trackType === 'time' ? intervalUnit : null,
      last_service_date: trackType === 'time' ? (lastDate || todayISO()) : (editing?.last_service_date ?? todayISO()),
      last_service_odometer: trackType === 'miles' ? (lastOdo.trim() === '' ? null : Number(lastOdo)) : null,
      uses_since_service: trackType === 'uses' ? Math.max(0, Number(usesSoFar) || 0) : 0,
      notes: notes.trim() || null,
    }
    const { error } = editing
      ? await supabase.from('maintenance_items').update(payload).eq('id', editing.id).eq('user_id', userId)
      : await supabase.from('maintenance_items').insert(payload)
    setSaving(false)
    if (error) return onError()
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-4">{editing ? 'Edit' : 'Add'} maintenance item</h3>

        <label className="block text-sm text-white/70 mb-1">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Oil change, Furnace filter, Clean grates" className="w-full bg-white/10 border border-white/25 rounded-xl px-3 py-2 text-white placeholder-white/40 mb-4 focus:outline-none focus:border-white/45" />

        <label className="block text-sm text-white/70 mb-2">Track by</label>
        <div className="flex gap-2 mb-4">
          {TYPES.map(t => (
            <button key={t.value} onClick={() => setTrackType(t.value)} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${trackType === t.value ? 'bg-indigo-500/40 border-indigo-400/60 text-white' : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'}`}>{t.label}</button>
          ))}
        </div>

        {/* Interval */}
        <label className="block text-sm text-white/70 mb-1">Service every</label>
        <div className="flex items-center gap-2 mb-4">
          <input type="number" value={intervalValue} onChange={e => setIntervalValue(e.target.value)} placeholder={trackType === 'miles' ? '5000' : trackType === 'uses' ? '10' : '3'} className="flex-1 bg-white/10 border border-white/25 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/45" />
          {trackType === 'time' ? (
            <select value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as any)} className="bg-white/10 border border-white/25 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/45">
              <option value="days" className="bg-gray-800">days</option>
              <option value="weeks" className="bg-gray-800">weeks</option>
              <option value="months" className="bg-gray-800">months</option>
            </select>
          ) : (
            <span className="text-white/60 text-sm w-16">{trackType === 'miles' ? 'miles' : 'uses'}</span>
          )}
        </div>

        {/* Baseline (last service) */}
        {trackType === 'time' && (
          <>
            <label className="block text-sm text-white/70 mb-1">Last serviced on</label>
            <input type="date" value={lastDate} onChange={e => setLastDate(e.target.value)} className="w-full bg-white/10 border border-white/25 rounded-xl px-3 py-2 text-white mb-4 [color-scheme:dark] focus:outline-none focus:border-white/45" />
          </>
        )}
        {trackType === 'miles' && (
          <>
            <label className="block text-sm text-white/70 mb-1">Odometer at last service</label>
            <input type="number" value={lastOdo} onChange={e => setLastOdo(e.target.value)} placeholder={asset?.odometer != null ? String(asset.odometer) : 'e.g. 80000'} className="w-full bg-white/10 border border-white/25 rounded-xl px-3 py-2 text-white placeholder-white/40 mb-4 focus:outline-none focus:border-white/45" />
          </>
        )}
        {trackType === 'uses' && (
          <>
            <label className="block text-sm text-white/70 mb-1">Uses since last service</label>
            <input type="number" value={usesSoFar} onChange={e => setUsesSoFar(e.target.value)} className="w-full bg-white/10 border border-white/25 rounded-xl px-3 py-2 text-white mb-4 focus:outline-none focus:border-white/45" />
          </>
        )}

        <label className="block text-sm text-white/70 mb-1">Notes <span className="text-white/40">(optional)</span></label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 5W-30 synthetic" className="w-full bg-white/10 border border-white/25 rounded-xl px-3 py-2 text-white placeholder-white/40 mb-5 focus:outline-none focus:border-white/45" />

        <div className="flex gap-3 justify-end">
          <GlassButton size="md" onClick={onClose}>Cancel</GlassButton>
          <GlassButton size="md" variant="green" onClick={save} disabled={saving || !name.trim() || !intervalValue}>{saving ? 'Saving…' : 'Save'}</GlassButton>
        </div>
      </div>
    </div>
  )
}
