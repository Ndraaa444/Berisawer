import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { supabase } from './lib/supabase'

type Rule = { id: string; phrase: string; action: 'reject' | 'mask' | 'hide' }
type Config = { enabled: boolean; rules: Rule[] }
const defaults: Config = { enabled: true, rules: [] }
const storageKey = (id: string | null) => `berisawer-moderation:${id ?? 'preview'}`

export default function ContentModeration() {
  const [userId, setUserId] = useState<string | null>(null)
  const [config, setConfig] = useState<Config>(defaults)
  const [phrase, setPhrase] = useState('')
  const [action, setAction] = useState<Rule['action']>('mask')
  const [editing, setEditing] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let alive = true
    const load = async (uid: string | null) => {
      setUserId(uid)
      let next = defaults
      if (uid && supabase) {
        const { data, error } = await supabase.from('creator_settings').select('live_tools_config').eq('user_id', uid).maybeSingle()
        if (error) setFeedback('Pengaturan moderasi belum dapat dimuat dari Supabase.')
        const stored = data?.live_tools_config?.moderation
        if (stored && typeof stored === 'object') next = { ...defaults, ...stored, rules: Array.isArray(stored.rules) ? stored.rules : [] }
        else { try { const local = localStorage.getItem(storageKey(uid)); if (local) next = JSON.parse(local) as Config } catch { /* safe defaults */ } }
      } else { try { const local = localStorage.getItem(storageKey(null)); if (local) next = JSON.parse(local) as Config } catch { /* safe defaults */ } }
      if (alive) { setConfig(next); setLoaded(true) }
    }
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => { void load(data.session?.user.id ?? null) })
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void load(session?.user.id ?? null) })
      return () => { alive = false; listener.subscription.unsubscribe() }
    }
    void load(null)
    return () => { alive = false }
  }, [])

  function addOrUpdate() {
    const words = phrase
      .trim()
      .split(/[\\s,;]+/)
      .map(word => word.trim())
      .filter(Boolean)

    if (words.length === 0) { setFeedback('Masukkan minimal satu kata.'); return }
    if (editing && words.length !== 1) { setFeedback('Saat mengedit, masukkan satu kata saja. Pisahkan beberapa kata saat menambah aturan.'); return }
    if (words.some(word => word.length > 100)) { setFeedback('Setiap kata maksimal 100 karakter.'); return }

    const existingCount = config.rules.length
    const newWords = editing ? words : [...new Set(words.map(word => word.toLocaleLowerCase()))]
      .filter(word => !config.rules.some(rule => rule.phrase.toLocaleLowerCase() === word))
    if (!editing && newWords.length === 0) { setFeedback('Semua kata tersebut sudah ada di daftar filter.'); return }
    if (!editing && existingCount + newWords.length > 200) { setFeedback('Maksimal 200 kata filter per kreator. Hapus beberapa aturan terlebih dahulu.'); return }
    if (editing && config.rules.some(rule => rule.phrase.toLocaleLowerCase() === words[0].toLocaleLowerCase() && rule.id !== editing)) { setFeedback('Kata tersebut sudah ada di daftar filter.'); return }

    if (editing) {
      const clean = words[0]
      setConfig(current => ({ ...current, rules: current.rules.map(item => item.id === editing ? { ...item, phrase: clean, action } : item) }))
      setFeedback('Kata diperbarui dalam draft. Tekan Simpan aturan untuk menyimpannya.')
    } else {
      const added: Rule[] = newWords.map(word => ({ id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`, phrase: word, action }))
      setConfig(current => ({ ...current, rules: [...current.rules, ...added] }))
      setFeedback(`${added.length} kata ditambahkan sebagai aturan terpisah. Tekan Simpan aturan untuk menyimpannya.`)
    }
    setPhrase('')
    setEditing(null)
  }
  function editRule(rule: Rule) { setEditing(rule.id); setPhrase(rule.phrase); setAction(rule.action); setFeedback('') }
  function cancelEdit() { setEditing(null); setPhrase(''); setAction('mask') }

  async function save() {
    if (!loaded) return
    setBusy(true); setFeedback('')
    const safe: Config = { enabled: Boolean(config.enabled), rules: config.rules.slice(0, 200).map(rule => ({ ...rule, phrase: rule.phrase.trim().slice(0, 100), action: ['reject', 'mask', 'hide'].includes(rule.action) ? rule.action : 'mask' })) }
    try {
      if (userId && supabase) {
        const { data, error: readError } = await supabase.from('creator_settings').select('live_tools_config').eq('user_id', userId).maybeSingle()
        if (readError) throw readError
        const current = data?.live_tools_config && typeof data.live_tools_config === 'object' ? data.live_tools_config : {}
        const { error } = await supabase.from('creator_settings').upsert({ user_id: userId, live_tools_config: { ...current, moderation: safe } }, { onConflict: 'user_id' })
        if (error) throw error
        setFeedback('Aturan moderasi tersimpan di akun Supabase.')
      } else {
        localStorage.setItem(storageKey(null), JSON.stringify(safe))
        setFeedback('Tersimpan di browser ini saja. Masuk untuk menyinkronkan ke akun.')
      }
      setConfig(safe)
    } catch { setFeedback('Gagal menyimpan aturan. Periksa koneksi dan izin RLS; perubahan belum dianggap tersimpan.') }
    finally { setBusy(false) }
  }

  return <section className="panel moderation-panel">
    <div className="panel-heading"><div><h2><ShieldCheck size={17} /> Filter kata & moderasi pesan</h2><p>Tambahkan satu atau banyak kata sekaligus; pisahkan dengan spasi, koma, atau titik koma. Setiap kata menjadi aturan tersendiri.</p></div><span className="live-mini-status">{userId ? 'AKUN' : 'PREVIEW'}</span></div>
    <div className="moderation-status"><div><strong>{config.enabled ? 'Filter aktif' : 'Filter nonaktif'}</strong><small>Satu kata per aturan • maksimum 200 kata per kreator</small></div><label className="pricing-toggle"><span>{config.enabled ? 'Aktif' : 'Nonaktif'}</span><input type="checkbox" checked={config.enabled} onChange={e => setConfig(current => ({ ...current, enabled: e.target.checked }))} /><span className="pricing-switch" aria-hidden="true" /></label></div>
    <p className="moderation-description">Tindakan per kata: tolak pesan, samarkan kata, atau sembunyikan seluruh pesan. Ini menyimpan konfigurasi; penerapan otomatis ke TTS/overlay memerlukan pemeriksaan backend saat event diproses.</p>
    <div className="moderation-controls"><label>KATA YANG DIBLOKIR<input value={phrase} maxLength={1000} onChange={e => setPhrase(e.target.value)} placeholder="Contoh: kata1, kata2, kata3" onKeyDown={e => { if (e.key === 'Enter') addOrUpdate() }} /></label><label>TINDAKAN<select value={action} onChange={e => setAction(e.target.value as Rule['action'])}><option value="reject">Tolak pesan</option><option value="mask">Samarkan kata</option><option value="hide">Sembunyikan pesan</option></select></label></div>
    <div className="moderation-actions"><button type="button" className="button button-primary" onClick={addOrUpdate}>{editing ? <Check size={15} /> : <Plus size={15} />}{editing ? 'Perbarui aturan' : 'Tambah aturan'}</button>{editing && <button type="button" className="button button-secondary" onClick={cancelEdit}><X size={15} /> Batal</button>}<button type="button" className="button button-secondary" onClick={save} disabled={busy || !loaded}>{busy ? 'Menyimpan…' : 'Simpan aturan'}</button></div>
    <div className="moderation-list">{config.rules.map(rule => <div className="moderation-item" key={rule.id}><div className="moderation-word">{rule.phrase}<small>{rule.action === 'reject' ? 'Tolak pesan' : rule.action === 'mask' ? 'Samarkan kata' : 'Sembunyikan pesan'}</small></div><button type="button" onClick={() => editRule(rule)} aria-label={`Edit aturan ${rule.phrase}`} title="Edit"><Pencil size={15} /></button><button type="button" onClick={() => { setConfig(current => ({ ...current, rules: current.rules.filter(item => item.id !== rule.id) })); if (editing === rule.id) cancelEdit(); setFeedback('Aturan dihapus dari draft. Tekan Simpan aturan untuk menyimpan perubahan.') }} aria-label={`Hapus aturan ${rule.phrase}`} title="Hapus"><Trash2 size={15} /></button></div>)}</div>
    {config.rules.length === 0 && <div className="moderation-empty">Belum ada kata yang difilter. Tambahkan aturan sesuai kebutuhan komunitasmu.</div>}
    {feedback && <div className="moderation-feedback" role="status">{feedback}</div>}
  </section>
}
