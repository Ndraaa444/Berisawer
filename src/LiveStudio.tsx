import { useMemo, useState } from 'react'
import {
  Activity, AudioLines, Check, Clock3, MessageSquareText, MonitorPlay,
  Music2, Plus, Radio, ShieldCheck, Sparkles, Timer, ToggleLeft, ToggleRight,
  Trash2, Trophy, Volume2, Zap,
} from 'lucide-react'
import './live-studio.css'

type ToolKey = 'voice' | 'media' | 'ticker' | 'subathon' | 'alerts' | 'goals' | 'polls' | 'redeems'

const initialTools: { key: ToolKey; title: string; description: string; icon: typeof Radio; enabled: boolean; tag: string }[] = [
  { key: 'voice', title: 'Voice Chat / TTS', description: 'Bacakan pesan supporter dengan kontrol antrean dan moderasi.', icon: AudioLines, enabled: true, tag: 'AUDIO' },
  { key: 'media', title: 'Media Share', description: 'Antrian video/link dari penonton dengan filter dan persetujuan streamer.', icon: Music2, enabled: false, tag: 'BETA' },
  { key: 'ticker', title: 'Running Text', description: 'Teks berjalan untuk pengumuman, target, dan pesan komunitas.', icon: MessageSquareText, enabled: true, tag: 'OVERLAY' },
  { key: 'subathon', title: 'Subathon Timer', description: 'Tambah waktu dari event yang sudah diverifikasi atau simulasi.', icon: Timer, enabled: true, tag: 'LIVE TOOL' },
  { key: 'alerts', title: 'Alert & Event Animations', description: 'Alert sawer, supporter baru, target tercapai, dan event khusus.', icon: Zap, enabled: true, tag: 'OVERLAY' },
  { key: 'goals', title: 'Target Komunitas', description: 'Target dana, jumlah supporter, atau milestone streaming.', icon: Trophy, enabled: true, tag: 'GOAL' },
  { key: 'polls', title: 'Polling & Voting', description: 'Libatkan penonton untuk memilih tantangan atau konten berikutnya.', icon: Activity, enabled: false, tag: 'INTERAKSI' },
  { key: 'redeems', title: 'Request & Challenge', description: 'Permintaan lagu, tantangan, atau reward dengan antrean yang bisa dimoderasi.', icon: Sparkles, enabled: false, tag: 'INTERAKSI' },
]

const initialQueue = [
  { id: 1, title: 'Pesan penyemangat', detail: 'Contoh TTS • 8 detik', status: 'Menunggu' },
  { id: 2, title: 'Media komunitas', detail: 'Contoh media • perlu persetujuan', status: 'Moderasi' },
  { id: 3, title: 'Running text', detail: '“Makasih sudah mampir!”', status: 'Aktif' },
]

export default function LiveStudio() {
  const [tools, setTools] = useState(initialTools)
  const [ticker, setTicker] = useState('Terima kasih sudah mendukung stream ini!')
  const [tickerDraft, setTickerDraft] = useState('Halo chat! Jangan lupa follow dan jaga suasana tetap nyaman ✨')
  const [goal, setGoal] = useState('500000')
  const [goalCurrent, setGoalCurrent] = useState(175000)
  const [timerMinutes, setTimerMinutes] = useState('10')
  const [queue, setQueue] = useState(initialQueue)
  const [newRequest, setNewRequest] = useState('')
  const [safeMode, setSafeMode] = useState(true)
  const [message, setMessage] = useState('')
  const [pollTitle, setPollTitle] = useState('Tantangan berikutnya?')
  const [pollA, setPollA] = useState('Main game')
  const [pollB, setPollB] = useState('Q&A')
  const goalValue = Math.max(1, Number(goal) || 1)
  const goalPercent = Math.min(100, Math.round(goalCurrent / goalValue * 100))
  const enabledCount = useMemo(() => tools.filter(tool => tool.enabled).length, [tools])

  function toggleTool(key: ToolKey) {
    setTools(current => current.map(tool => tool.key === key ? { ...tool, enabled: !tool.enabled } : tool))
    setMessage('Pengaturan berubah di preview lokal. Simpan backend belum diaktifkan.')
  }

  function addQueueItem() {
    const text = newRequest.trim()
    if (!text) return
    setQueue(current => [...current, { id: Date.now(), title: text.slice(0, 80), detail: 'Permintaan preview • menunggu moderasi', status: 'Moderasi' }])
    setNewRequest('')
    setMessage('Permintaan contoh ditambahkan ke antrean moderasi.')
  }

  function publishTicker() {
    if (!tickerDraft.trim()) return
    setTicker(tickerDraft.trim().slice(0, 180))
    setMessage('Running text diperbarui untuk preview lokal.')
  }

  function addTimer() {
    const minutes = Math.max(1, Math.min(180, Number(timerMinutes) || 1))
    setMessage(`Simulasi: ${minutes} menit ditambahkan ke subathon. Timer live belum tersambung.`)
  }

  return <div className="live-studio">
    <div className="page-heading"><div><div className="eyebrow">STREAMER TOOLKIT</div><h1>Live Studio</h1><p>Kelola interaksi livestream, overlay, antrean, dan aktivitas komunitas dari satu tempat.</p></div><div className="heading-action"><span className="live-preview-pill"><span /> PREVIEW MODE</span></div></div>
    <div className="live-safety-banner"><ShieldCheck size={20} /><div><strong>Mode aman aktif — fitur ini masih preview</strong><p>Tombol dan perubahan di halaman ini belum menjalankan TTS, memutar media, mengubah timer live, atau menyimpan konfigurasi ke database. Pembayaran tetap nonaktif.</p></div></div>
    {message && <div className="live-feedback" role="status"><Check size={16} />{message}<button onClick={() => setMessage('')} aria-label="Tutup pesan">×</button></div>}
    <div className="live-stats-grid">
      <div className="live-stat"><span>Tools aktif</span><strong>{enabledCount}<small> / {tools.length}</small></strong><span className="live-stat-foot">Konfigurasi preview</span></div>
      <div className="live-stat"><span>Antrean interaksi</span><strong>{queue.length}</strong><span className="live-stat-foot">Item simulasi</span></div>
      <div className="live-stat"><span>Target komunitas</span><strong>{goalPercent}%</strong><span className="live-stat-foot">{new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(goalCurrent)} terkumpul (contoh)</span></div>
    </div>
    <div className="live-section-heading"><div><h2>Semua live tools</h2><p>Aktifkan atau nonaktifkan modul di preview.</p></div><span className="live-section-counter">{enabledCount} AKTIF</span></div>
    <div className="live-tool-grid">{tools.map(tool => { const Icon = tool.icon; return <article className={`live-tool-card ${tool.enabled ? 'tool-enabled' : ''}`} key={tool.key}>
      <div className="live-tool-top"><span className="live-tool-icon"><Icon size={20} /></span><span className="live-tool-tag">{tool.tag}</span></div>
      <div className="live-tool-copy"><h3>{tool.title}</h3><p>{tool.description}</p></div>
      <div className="live-tool-bottom"><span className={tool.enabled ? 'tool-state state-on' : 'tool-state'}>{tool.enabled ? 'Aktif di preview' : 'Nonaktif'}</span><button className={`live-toggle ${tool.enabled ? 'toggle-on' : ''}`} onClick={() => toggleTool(tool.key)} aria-label={`${tool.enabled ? 'Nonaktifkan' : 'Aktifkan'} ${tool.title}`}>{tool.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}</button></div>
    </article> })}</div>
    <div className="live-config-grid">
      <section className="panel live-config-panel"><div className="panel-heading"><div><h2><MessageSquareText size={17} /> Running Text</h2><p>Konten teks untuk browser overlay</p></div><span className="live-mini-status">LOCAL</span></div>
        <label className="field-label" htmlFor="ticker-draft">PESAN BERJALAN</label><textarea id="ticker-draft" className="live-textarea" value={tickerDraft} maxLength={180} onChange={e => setTickerDraft(e.target.value)} />
        <div className="live-field-footer"><span>{tickerDraft.length}/180 karakter</span><button className="button button-primary" onClick={publishTicker}>Perbarui preview</button></div>
        <div className="ticker-demo"><span>BERISAWER</span><div>{ticker || 'Teks berjalan akan tampil di sini'}</div></div>
      </section>
      <section className="panel live-config-panel"><div className="panel-heading"><div><h2><Trophy size={17} /> Target Komunitas</h2><p>Target donasi simulasi</p></div><span className="live-mini-status">CONTOH</span></div>
        <label className="field-label" htmlFor="goal-amount">TARGET (RUPIAH)</label><input id="goal-amount" className="form-input" type="number" min="1" value={goal} onChange={e => setGoal(e.target.value)} />
        <div className="goal-progress-copy"><strong>{goalPercent}% tercapai</strong><span>{new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(goalValue)}</span></div><div className="goal-progress-track"><span style={{width: `${goalPercent}%`}} /></div>
        <button className="button button-secondary live-demo-button" onClick={() => {setGoalCurrent(value => Math.min(goalValue, value + 25000)); setMessage('Contoh progres target diperbarui secara lokal.') }}><Plus size={15} /> Simulasikan +Rp25.000</button>
      </section>
      <section className="panel live-config-panel"><div className="panel-heading"><div><h2><Timer size={17} /> Subathon Timer</h2><p>Simulasi penambahan waktu</p></div><span className="live-mini-status">SIMULASI</span></div>
        <div className="subathon-display"><Clock3 size={22} /><strong>02:14:36</strong><span>Timer contoh • bukan timer live</span></div>
        <label className="field-label" htmlFor="timer-minutes">TAMBAH WAKTU (MENIT)</label><input id="timer-minutes" className="form-input" type="number" min="1" max="180" value={timerMinutes} onChange={e => setTimerMinutes(e.target.value)} />
        <button className="button button-primary live-demo-button" onClick={addTimer}><Plus size={15} /> Simulasikan tambah waktu</button>
      </section>
      <section className="panel live-config-panel"><div className="panel-heading"><div><h2><Volume2 size={17} /> Voice Chat & Media Share</h2><p>Kontrol dasar keamanan antrean</p></div><span className="live-mini-status">MODERASI</span></div>
        <label className="live-check-row"><input type="checkbox" checked={safeMode} onChange={e => setSafeMode(e.target.checked)} /><span><strong>Mode moderasi ketat</strong><small>Permintaan baru masuk moderasi sebelum diputar.</small></span></label>
        <div className="live-security-note"><ShieldCheck size={17} /><span>{safeMode ? 'Filter moderasi ditandai aktif untuk preview.' : 'Moderasi ketat dimatikan pada preview; jangan gunakan untuk live publik.'}</span></div>
        <label className="field-label" htmlFor="new-request">TAMBAH ITEM ANTREAN (DEMO)</label><div className="live-request-input"><input id="new-request" value={newRequest} maxLength={80} onChange={e => setNewRequest(e.target.value)} placeholder="Contoh: pesan suara dari supporter" onKeyDown={e => {if(e.key === 'Enter') addQueueItem()}} /><button className="button button-primary" onClick={addQueueItem} aria-label="Tambah antrean"><Plus size={16} /></button></div>
        <p className="field-help">Media tidak otomatis diputar. Implementasi produksi perlu whitelist domain, batas durasi, filter URL, dan persetujuan moderator.</p>
      </section>
    </div>
    <section className="panel live-queue-panel"><div className="panel-heading"><div><h2><Radio size={17} /> Antrean interaksi</h2><p>Item demo yang dapat dikelola tanpa memutar media sungguhan.</p></div><span className="live-section-counter">{queue.length} ITEM</span></div>
      {queue.map(item => <div className="live-queue-row" key={item.id}><div className="live-queue-icon"><MonitorPlay size={17} /></div><div className="live-queue-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><span className={`live-queue-status ${item.status === 'Aktif' ? 'queue-active' : ''}`}>{item.status}</span><button className="live-queue-remove" onClick={() => {setQueue(current => current.filter(row => row.id !== item.id)); setMessage('Item dihapus dari antrean preview.')}} aria-label={`Hapus ${item.title}`}><Trash2 size={16} /></button></div>)}
      {queue.length === 0 && <div className="empty-state">Antrean preview kosong. Tambahkan item dari panel Voice Chat & Media Share.</div>}
    </section>
    <section className="panel live-config-panel live-poll-panel"><div className="panel-heading"><div><h2><Activity size={17} /> Polling komunitas</h2><p>Siapkan pilihan untuk penonton (preview lokal)</p></div><span className="live-mini-status">DEMO</span></div>
      <label className="field-label" htmlFor="poll-title">PERTANYAAN</label><input id="poll-title" className="form-input" value={pollTitle} onChange={e => setPollTitle(e.target.value)} maxLength={100} />
      <div className="live-poll-options"><div><label className="field-label" htmlFor="poll-a">PILIHAN A</label><input id="poll-a" className="form-input" value={pollA} onChange={e => setPollA(e.target.value)} maxLength={60} /></div><div><label className="field-label" htmlFor="poll-b">PILIHAN B</label><input id="poll-b" className="form-input" value={pollB} onChange={e => setPollB(e.target.value)} maxLength={60} /></div></div>
      <div className="live-poll-preview"><span>POLL PREVIEW</span><strong>{pollTitle || 'Pertanyaan polling'}</strong><div><span>{pollA || 'Pilihan A'}</span><span>{pollB || 'Pilihan B'}</span></div><small>Voting belum tersambung ke chat atau database.</small></div>
    </section>
    <div className="live-roadmap"><Sparkles size={19} /><div><strong>Integrasi berikutnya</strong><p>Supabase realtime untuk event, autentikasi overlay token, TTS provider, media moderation, chat platform, OBS browser source, serta timer subathon yang hanya berubah dari event terverifikasi.</p></div></div>
  </div>
}
