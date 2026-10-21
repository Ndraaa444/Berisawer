import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AudioLines, Check, MessageSquareText,
  Music2, Plus, Radio, ShieldCheck, Sparkles, Timer, ToggleLeft, ToggleRight,
  Save, Trophy, Volume2, Zap,
} from 'lucide-react'
import './live-studio.css'
import LiveToolPricing from './LiveToolPricing'
import ContentModeration from './ContentModeration'
import AlertSoundSettings from './AlertSoundSettings'
import { supabase } from './lib/supabase'

type ToolKey = 'voice' | 'media' | 'ticker' | 'subathon' | 'alerts' | 'goals' | 'polls' | 'redeems'

const initialTools: { key: ToolKey; title: string; description: string; icon: typeof Radio; enabled: boolean; tag: string }[] = [
  { key: 'voice', title: 'Voice Chat / TTS', description: 'Bacakan pesan supporter dengan kontrol antrean dan moderasi.', icon: AudioLines, enabled: true, tag: 'AUDIO' },
  { key: 'media', title: 'Media Share', description: 'Antrian video/link dari penonton dengan filter dan persetujuan streamer.', icon: Music2, enabled: false, tag: 'BETA' },
  { key: 'ticker', title: 'Running Text', description: 'Teks berjalan untuk pengumuman, target, dan pesan komunitas.', icon: MessageSquareText, enabled: true, tag: 'OVERLAY' },
  { key: 'subathon', title: 'Subathon Timer', description: 'Timer live hanya aktif setelah event subathon backend tersedia.', icon: Timer, enabled: true, tag: 'LIVE TOOL' },
  { key: 'alerts', title: 'Alert & Event Animations', description: 'Alert sawer, supporter baru, target tercapai, dan event khusus.', icon: Zap, enabled: true, tag: 'OVERLAY' },
  { key: 'goals', title: 'Target Komunitas', description: 'Target dana, jumlah supporter, atau milestone streaming.', icon: Trophy, enabled: true, tag: 'GOAL' },
  { key: 'polls', title: 'Polling & Voting', description: 'Libatkan penonton untuk memilih tantangan atau konten berikutnya.', icon: Activity, enabled: false, tag: 'INTERAKSI' },
  { key: 'redeems', title: 'Request & Challenge', description: 'Permintaan lagu, tantangan, atau reward dengan antrean yang bisa dimoderasi.', icon: Sparkles, enabled: false, tag: 'INTERAKSI' },
]

const initialQueue: { id: number; title: string; detail: string; status: string }[] = []

export default function LiveStudio() {
  const [tools, setTools] = useState(initialTools)
  const [userId, setUserId] = useState<string | null>(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [, setTicker] = useState('Terima kasih sudah mendukung stream ini!')
  const [tickerDraft, setTickerDraft] = useState('Halo chat! Jangan lupa follow dan jaga suasana tetap nyaman ✨')
  const [goal, setGoal] = useState('500000')
  const [goalCurrent] = useState(0)
  const [timerMinutes, setTimerMinutes] = useState('10')
  const queue = initialQueue
  const [newRequest, setNewRequest] = useState('')
  const [safeMode, setSafeMode] = useState(true)
  const [message, setMessage] = useState('')
  const [pollTitle, setPollTitle] = useState('Tantangan berikutnya?')
  const [pollA, setPollA] = useState('Main game')
  const [pollB, setPollB] = useState('Q&A')
  const goalValue = Math.max(1, Number(goal) || 1)
  const goalPercent = Math.min(100, Math.round(goalCurrent / goalValue * 100))
  const enabledCount = useMemo(() => tools.filter(tool => tool.enabled).length, [tools])

  useEffect(() => {
    let alive = true
    const load = async (uid: string | null) => {
      setUserId(uid)
      try {
        let switches: Record<string, boolean> | null = null
        if (uid && supabase) {
          const { data, error } = await supabase.from('creator_settings').select('live_tools_config').eq('user_id', uid).maybeSingle()
          if (error) throw error
          const saved = data?.live_tools_config?.tool_switches
          if (saved && typeof saved === 'object') switches = saved as Record<string, boolean>
          const studio = data?.live_tools_config?.studio
          if (studio && typeof studio === 'object') {
            if (typeof studio.tickerDraft === 'string') setTickerDraft(studio.tickerDraft)
            if (typeof studio.goalAmount === 'string') setGoal(studio.goalAmount)
            if (typeof studio.timerMinutes === 'string') setTimerMinutes(studio.timerMinutes)
            if (typeof studio.pollTitle === 'string') setPollTitle(studio.pollTitle)
            if (typeof studio.pollA === 'string') setPollA(studio.pollA)
            if (typeof studio.pollB === 'string') setPollB(studio.pollB)
          }
        } else {
          if (alive) setMessage('Masuk ke akun kreator untuk memuat pengaturan live yang tersimpan di server.')
        }
        if (alive && switches) setTools(current => current.map(tool => typeof switches?.[tool.key] === 'boolean' ? { ...tool, enabled: switches[tool.key] } : tool))
      } catch {
        if (alive) setMessage('Pengaturan switch Live Studio gagal dimuat; nilai default tetap digunakan.')
      } finally {
        if (alive) setSettingsLoaded(true)
      }
    }
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => { void load(data.session?.user.id ?? null) })
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void load(session?.user.id ?? null) })
      return () => { alive = false; listener.subscription.unsubscribe() }
    }
    void load(null)
    return () => { alive = false }
  }, [])

  async function toggleTool(key: ToolKey) {
    const updated = tools.map(tool => tool.key === key ? { ...tool, enabled: !tool.enabled } : tool)
    setTools(updated)
    const switches = Object.fromEntries(updated.map(tool => [tool.key, tool.enabled]))
    if (userId && supabase) {
      try {
        const { data, error: readError } = await supabase.from('creator_settings').select('live_tools_config').eq('user_id', userId).maybeSingle()
        if (readError) throw readError
        const current = data?.live_tools_config && typeof data.live_tools_config === 'object' ? data.live_tools_config : {}
        const { error } = await supabase.from('creator_settings').upsert({ user_id: userId, live_tools_config: { ...current, tool_switches: switches } }, { onConflict: 'user_id' })
        if (error) throw error
        setMessage('Switch Live Studio tersimpan ke akun Supabase.')
      } catch {
        setMessage('Gagal menyimpan switch ke Supabase. Tampilan berubah sementara, tetapi server belum terbarui.')
      }
    } else {
      setTools(current => current.map(tool => tool.key === key ? { ...tool, enabled: !tool.enabled } : tool))
      setMessage('Masuk ke akun kreator untuk mengubah switch yang tersimpan di server.')
    }
  }

  async function saveStudioSettings() {
    const studio = {
      tickerDraft: tickerDraft.slice(0, 180),
      goalAmount: String(Math.max(1, Math.floor(Number(goal) || 1))),
      timerMinutes: String(Math.max(1, Math.min(180, Math.floor(Number(timerMinutes) || 1)))),
      pollTitle: pollTitle.slice(0, 100),
      pollA: pollA.slice(0, 60),
      pollB: pollB.slice(0, 60),
    }
    setMessage('Menyimpan pengaturan Live Studio…')
    try {
      if (userId && supabase) {
        const { data, error: readError } = await supabase.from('creator_settings').select('live_tools_config').eq('user_id', userId).maybeSingle()
        if (readError) throw readError
        const current = data?.live_tools_config && typeof data.live_tools_config === 'object' ? data.live_tools_config : {}
        const { error } = await supabase.from('creator_settings').upsert({
          user_id: userId,
          live_tools_config: { ...current, studio },
        }, { onConflict: 'user_id' })
        if (error) throw error
        setMessage('Pengaturan Live Studio tersimpan permanen ke Supabase.')
      } else {
        setMessage('Masuk ke akun kreator untuk menyimpan pengaturan ke Supabase.')
      }
    } catch {
      setMessage('Pengaturan Live Studio gagal disimpan ke server. Periksa koneksi dan izin tabel; perubahan belum dianggap tersimpan.')
    }
  }

  function addQueueItem() {
    setMessage('Antrean request belum tersedia di backend produksi. Permintaan tidak disimpan dan tidak ditampilkan sebagai aktivitas nyata.')
  }

  async function publishTicker() {
    const text = tickerDraft.trim()
    if (!text) return
    if (userId && supabase) {
      setMessage('Mengirim running text ke antrean overlay…')
      const { data, error } = await supabase.functions.invoke('live-studio-event', { body: { event_type: 'ticker', payload: { text } } })
      if (error || !data?.event) {
        setMessage(data?.error === 'message_blocked_by_moderation'
          ? 'Pesan ditolak oleh filter moderasi.'
          : data?.error === 'ticker_disabled'
            ? 'Running Text sedang nonaktif di pengaturan fitur/tarif.'
            : 'Running Text gagal dikirim ke server; cek status fitur, login, dan koneksi.')
        return
      }
      setTicker(text.slice(0, 180))
      setMessage('Running Text masuk ke antrean overlay Supabase.')
      return
    }
    setTicker(text.slice(0, 180))
    setMessage('Masuk ke akun kreator untuk mengirim Running Text ke server. Tidak ada aktivitas lokal yang ditampilkan sebagai live.')
  }


  return <div className="live-studio">
    <div className="page-heading"><div><div className="eyebrow">STREAMER TOOLKIT</div><h1>Live Studio</h1><p>Kelola interaksi livestream, overlay, antrean, dan aktivitas komunitas dari satu tempat.</p></div><div className="heading-action"><button className="button button-secondary" type="button" onClick={saveStudioSettings}><Save size={15} /> Simpan pengaturan</button><span className="live-preview-pill"><span /> {userId ? 'DATA AKUN' : 'LOGIN DIPERLUKAN'}</span></div></div>
    <div className="live-safety-banner"><ShieldCheck size={20} /><div><strong>Mode aman aktif — pembayaran tetap nonaktif</strong><p>Fitur yang benar-benar terhubung saat ini: penyimpanan pengaturan akun, Running Text ke antrean overlay, dan alert sintetis khusus pengujian. Subathon, target, polling, request, media share, serta integrasi chat belum aktif di backend produksi dan tidak akan ditampilkan sebagai aktivitas nyata.</p></div></div>
    {message && <div className="live-feedback" role="status"><Check size={16} />{message}<button onClick={() => setMessage('')} aria-label="Tutup pesan">×</button></div>}
    <div className="live-stats-grid">
      <div className="live-stat"><span>Tools aktif</span><strong>{enabledCount}<small> / {tools.length}</small></strong><span className="live-stat-foot">{userId ? 'Konfigurasi akun' : 'Login diperlukan'}</span></div>
      <div className="live-stat"><span>Antrean interaksi</span><strong>{queue.length}</strong><span className="live-stat-foot">Event backend tersimpan</span></div>
      <div className="live-stat"><span>Target komunitas</span><strong>{goalPercent}%</strong><span className="live-stat-foot">Total dukungan terverifikasi akan tampil setelah alur pembayaran aktif</span></div>
    </div>

    <div className="live-section-heading"><div><h2>Semua live tools</h2><p>Aktifkan atau nonaktifkan modul. {settingsLoaded ? (userId ? 'Pengaturan akun dimuat dari server.' : 'Login diperlukan untuk mengakses fitur produksi.') : 'Memuat pengaturan…'}</p></div><span className="live-section-counter">{enabledCount} AKTIF</span></div>
    <div className="live-tool-grid">{tools.map(tool => { const Icon = tool.icon; return <article className={`live-tool-card ${tool.enabled ? 'tool-enabled' : ''}`} key={tool.key}>
      <div className="live-tool-top"><span className="live-tool-icon"><Icon size={20} /></span><span className="live-tool-tag">{tool.tag}</span></div>
      <div className="live-tool-copy"><h3>{tool.title}</h3><p>{tool.description}</p></div>
      <div className="live-tool-bottom"><span className={tool.enabled ? 'tool-state state-on' : 'tool-state'}>{tool.enabled ? (userId ? 'Aktif • akun tersimpan' : 'Belum tersimpan di server') : 'Nonaktif'}</span><button className={`live-toggle ${tool.enabled ? 'toggle-on' : ''}`} onClick={() => toggleTool(tool.key)} aria-label={`${tool.enabled ? 'Nonaktifkan' : 'Aktifkan'} ${tool.title}`}>{tool.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}</button></div>
    </article> })}</div>
    <div className="live-config-grid">
      <section className="panel live-config-panel"><div className="panel-heading"><div><h2><MessageSquareText size={17} /> Running Text</h2><p>Konten teks untuk browser overlay</p></div><span className="live-mini-status">SERVER</span></div>
        <label className="field-label" htmlFor="ticker-draft">PESAN BERJALAN</label><textarea id="ticker-draft" className="live-textarea" value={tickerDraft} maxLength={180} onChange={e => setTickerDraft(e.target.value)} />
        <div className="live-field-footer"><span>{tickerDraft.length}/180 karakter</span><button className="button button-primary" onClick={publishTicker}>Kirim ke overlay</button></div>
        <p className="field-help">Pesan hanya dianggap aktif setelah server mengonfirmasi event tersimpan.</p>
      </section>


      <section className="panel live-config-panel"><div className="panel-heading"><div><h2><Volume2 size={17} /> Voice Chat & Media Share</h2><p>Kontrol dasar keamanan antrean</p></div><span className="live-mini-status">MODERASI</span></div>
        <label className="live-check-row"><input type="checkbox" checked={safeMode} onChange={e => setSafeMode(e.target.checked)} /><span><strong>Mode moderasi ketat</strong><small>Permintaan baru masuk moderasi sebelum diputar.</small></span></label>
        <div className="live-security-note"><ShieldCheck size={17} /><span>{safeMode ? 'Filter moderasi ditandai aktif untuk preview.' : 'Moderasi ketat dimatikan pada preview; jangan gunakan untuk live publik.'}</span></div>
        <label className="field-label" htmlFor="new-request">TAMBAH ITEM ANTREAN (DEMO)</label><div className="live-request-input"><input id="new-request" value={newRequest} maxLength={80} onChange={e => setNewRequest(e.target.value)} placeholder="Contoh: pesan suara dari supporter" onKeyDown={e => {if(e.key === 'Enter') addQueueItem()}} /><button className="button button-primary" onClick={addQueueItem} aria-label="Tambah antrean"><Plus size={16} /></button></div>
        <p className="field-help">Media tidak otomatis diputar. Implementasi produksi perlu whitelist domain, batas durasi, filter URL, dan persetujuan moderator.</p>
      </section>
    </div>


    <LiveToolPricing />
    <AlertSoundSettings />
    <ContentModeration />
    <div className="live-roadmap"><Sparkles size={19} /><div><strong>Integrasi berikutnya</strong><p>Supabase realtime untuk event, autentikasi overlay token, TTS provider, media moderation, chat platform, OBS browser source, serta timer subathon yang hanya berubah dari event terverifikasi.</p></div></div>
  </div>
}
