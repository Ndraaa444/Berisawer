import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity, ArrowUpRight, Bell, Check, ChevronDown,
  CircleDollarSign, Copy, Eye, EyeOff, Heart,
  LayoutDashboard, Link2, LogOut, Menu, MonitorPlay, Radio, Settings,
  ShieldCheck, Sparkles, Wallet, X,
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import LiveStudio from './LiveStudio'
import LiveOverlay from './LiveOverlay'
import PublicCreator from './PublicCreator'

type Section = 'Overview' | 'Donations' | 'Overlay' | 'Live Studio' | 'Settings'
const navigation: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Donations', icon: Heart },
  { label: 'Overlay', icon: MonitorPlay },
  { label: 'Live Studio', icon: Radio },
  { label: 'Settings', icon: Settings },
]

const sampleDonations = [
  { name: 'Ruang preview', message: 'Semangat terus stream-nya!', amount: 'Rp 25.000', time: 'Contoh data' },
  { name: 'Supporter demo', message: 'Konten yang keren ✨', amount: 'Rp 10.000', time: 'Contoh data' },
  { name: 'Teman stream', message: 'Gas terus!', amount: 'Rp 5.000', time: 'Contoh data' },
]

function formatMoney(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

function Dashboard() {
  const [section, setSection] = useState<Section>('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('Creator')
  const [handle, setHandle] = useState('creator_demo')
  const [bio, setBio] = useState('')
  const [profilePublic, setProfilePublic] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [overlayTokens, setOverlayTokens] = useState<Record<string, string>>({})
  const [overlayBusy, setOverlayBusy] = useState(false)
  const [showUrls, setShowUrls] = useState<Record<string, boolean>>({})
  const [copiedFeature, setCopiedFeature] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    const loadAccount = async (session: import('@supabase/supabase-js').Session | null) => {
      if (!alive) return
      setUserEmail(session?.user.email ?? null)
      setUserId(session?.user.id ?? null)
      if (!session?.user) {
        setProfileName('Creator')
        setHandle('creator_demo')
        setBio('')
        return
      }
      setProfileLoading(true)
      try {
        const { data, error } = await supabase!.from('creator_profiles')
          .select('display_name,handle,bio,is_public')
          .eq('id', session.user.id).maybeSingle()
        if (error) throw error
        if (data) {
          if (alive) {
            setProfileName(data.display_name)
            setHandle(data.handle)
            setBio(data.bio ?? '')
            setProfilePublic(Boolean(data.is_public))
          }
        } else {
          const base = (session.user.email?.split('@')[0] ?? 'creator').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '').slice(0, 20) || 'creator'
          const suggested = `${base}_${session.user.id.replace(/-/g, '').slice(0, 6)}`.slice(0, 30)
          const { error: insertError } = await supabase!.from('creator_profiles').upsert({ id: session.user.id, display_name: base.slice(0, 48) || 'Creator', handle: suggested, bio: '', is_public: true }, { onConflict: 'id', ignoreDuplicates: true })
          if (insertError) throw insertError
          const { data: latest, error: latestError } = await supabase!.from('creator_profiles').select('display_name,handle,bio,is_public').eq('id', session.user.id).single()
          if (latestError) throw latestError
          if (alive) { setProfileName(latest.display_name); setHandle(latest.handle); setBio(latest.bio ?? ''); setProfilePublic(Boolean(latest.is_public)) }
        }
      } catch (error) {
        if (alive) setAuthMessage('Profil akun belum bisa dimuat: ' + (error instanceof Error ? error.message : 'kesalahan tidak diketahui'))
      } finally { if (alive) setProfileLoading(false) }
    }
    supabase.auth.getSession().then(({ data }) => { void loadAccount(data.session) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void loadAccount(session) })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!supabase || !userEmail) {
      setOverlayTokens({})
      return
    }
    let cancelled = false
    async function loadOverlayTokens() {
      const { data: auth } = await supabase!.auth.getUser()
      if (!auth.user) return
      const { data, error } = await supabase!.from('overlay_tokens')
        .select('id,label,revoked_at,created_at')
        .eq('creator_id', auth.user.id)
        .is('revoked_at', null)
        .like('label', 'overlay:%')
        .order('created_at', { ascending: false })
      if (error) {
        if (!cancelled) setAuthMessage('Token overlay belum bisa dimuat: ' + error.message)
        return
      }
      const loaded: Record<string, string> = {}
      for (const row of data ?? []) {
        const feature = typeof row.label === 'string' ? row.label.slice('overlay:'.length) : ''
        if (feature && !loaded[feature]) loaded[feature] = row.id
      }
      if (!cancelled) setOverlayTokens(loaded)
    }
    void loadOverlayTokens()
    return () => { cancelled = true }
  }, [userEmail])

  const overlayFeatures = [
    { key: 'alerts', title: 'Alert Donasi', description: 'Notifikasi dukungan dan animasi event' },
    { key: 'ticker', title: 'Running Text', description: 'Teks berjalan di layar live' },
    { key: 'voice', title: 'TTS / Voice Chat', description: 'Area visual untuk pesan supporter dan TTS' },
    { key: 'media', title: 'Media Share', description: 'Area tampilan media yang disetujui' },
    { key: 'subathon', title: 'Subathon Timer', description: 'Timer live dan tambahan waktu' },
    { key: 'goals', title: 'Target Komunitas', description: 'Progress target dukungan' },
    { key: 'polls', title: 'Polling & Voting', description: 'Hasil voting komunitas' },
    { key: 'requests', title: 'Request & Challenge', description: 'Antrean request komunitas' },
    { key: 'leaderboard', title: 'Leaderboard', description: 'Peringkat supporter berdasarkan donasi terverifikasi' },
  ]
  const overlayUrl = (feature: string) => typeof window === 'undefined' ? 'https://bagisawer.my.id/overlay' : window.location.origin + '/overlay?token=' + (overlayTokens[feature] || 'TOKEN_BELUM_DIBUAT') + '&feature=' + feature

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setAuthMessage('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY terlebih dahulu.')
      return
    }
    setAuthBusy(true)
    setAuthMessage('Mengirim kode OTP…')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      setOtpSent(true)
      setOtp('')
      setAuthMessage('Kode OTP 6 digit dikirim jika email diizinkan. Periksa Inbox dan folder Spam, lalu masukkan kode di bawah. Pastikan template email Supabase menampilkan {{ .Token }}.')
    } catch (error) {
      setAuthMessage('Gagal mengirim kode OTP: ' + (error instanceof Error ? error.message : 'periksa koneksi dan konfigurasi SMTP Supabase.'))
    } finally { setAuthBusy(false) }
  }

  async function verifyEmailOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) { setAuthMessage('Supabase belum dikonfigurasi.'); return }
    if (!email.trim() || !/^\d{6}$/.test(otp.trim())) { setAuthMessage('Masukkan kode OTP 6 digit yang dikirim ke email.'); return }
    setAuthBusy(true)
    setAuthMessage('Memverifikasi kode OTP…')
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: 'email' })
      if (error) throw error
      setOtpSent(false)
      setOtp('')
      setAuthMessage('Email berhasil diverifikasi. Memuat workspace kreator…')
    } catch (error) {
      setAuthMessage('Kode OTP belum berhasil diverifikasi: ' + (error instanceof Error ? error.message : 'kode salah/kedaluwarsa. Coba kirim kode baru.'))
    } finally { setAuthBusy(false) }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setUserEmail(null)
    setAuthMessage('')
  }

  async function generateOverlayTokens() {
    if (!supabase) { setAuthMessage('Supabase belum dikonfigurasi.'); return }
    setOverlayBusy(true)
    setAuthMessage('')
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) throw new Error('Masuk ke akun kreator terlebih dahulu.')
      const { data: existing, error: listError } = await supabase.from('overlay_tokens')
        .select('id,label,created_at')
        .eq('creator_id', auth.user.id)
        .is('revoked_at', null)
        .like('label', 'overlay:%')
        .order('created_at', { ascending: false })
      if (listError) throw listError
      const nextTokens: Record<string, string> = {}
      for (const row of existing ?? []) {
        const feature = typeof row.label === 'string' ? row.label.slice('overlay:'.length) : ''
        if (feature && !nextTokens[feature]) nextTokens[feature] = row.id
      }
      const missing = overlayFeatures.filter(feature => !nextTokens[feature.key])
      if (missing.length) {
        const inserts = await Promise.all(missing.map(async feature => {
          const bytes = crypto.getRandomValues(new Uint8Array(32))
          const randomSecret = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(randomSecret))
          const tokenHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
          return { creator_id: auth.user!.id, token_hash: tokenHash, label: 'overlay:' + feature.key }
        }))
        const { data: created, error } = await supabase.from('overlay_tokens').insert(inserts).select('id,label')
        if (error) throw error
        for (const row of created ?? []) {
          const feature = typeof row.label === 'string' ? row.label.slice('overlay:'.length) : ''
          if (feature) nextTokens[feature] = row.id
        }
      }
      setOverlayTokens(nextTokens)
      setShowUrls(Object.fromEntries(overlayFeatures.map(feature => [feature.key, true])))
      setAuthMessage(missing.length
        ? 'Token stabil siap untuk semua fitur. URL memakai ID token acak yang tersimpan di backend; menyimpan setting tidak mengganti token.'
        : 'Semua token overlay sudah ada. URL tetap sama dan tidak dibuat ulang.')
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Token overlay gagal dimuat/dibuat. Periksa login dan izin RLS.')
    } finally { setOverlayBusy(false) }
  }

  async function copyOverlay(feature: string) {
    try {
      await navigator.clipboard.writeText(overlayUrl(feature))
      setCopiedFeature(feature)
      window.setTimeout(() => setCopiedFeature(''), 1800)
    } catch {
      setAuthMessage('Clipboard tidak tersedia di browser ini. Tampilkan URL lalu salin secara manual.')
      setShowUrls(current => ({ ...current, [feature]: true }))
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !userId) { setAuthMessage('Masuk ke akun terlebih dahulu untuk menyimpan profil ke database.'); return }
    const cleanHandle = handle.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,30}$/.test(cleanHandle)) { setAuthMessage('Handle harus 3–30 karakter dan hanya memakai huruf kecil, angka, atau garis bawah.'); return }
    setSaved(false)
    setProfileLoading(true)
    setAuthMessage('Menyimpan profil kreator…')
    try {
      const { error } = await supabase!.from('creator_profiles').upsert({ id: userId, display_name: profileName.trim(), handle: cleanHandle, bio: bio.trim(), is_public: profilePublic, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      if (error) throw error
      setHandle(cleanHandle)
      setSaved(true)
      setAuthMessage('Profil tersimpan permanen di Supabase.' + (profilePublic ? ` Halaman publik: ${window.location.origin}/creator/${cleanHandle}` : ' Profil saat ini disembunyikan dari publik.'))
      window.setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      setAuthMessage(error instanceof Error && /duplicate key|creator_profiles_handle_key/i.test(error.message) ? 'Handle sudah dipakai kreator lain. Pilih handle berbeda.' : 'Profil gagal disimpan: ' + (error instanceof Error ? error.message : 'periksa koneksi dan izin database.'))
    } finally { setProfileLoading(false) }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={21} /></div>
          <span>beri<span className="brand-accent">sawer</span></span>
          <button className="icon-button mobile-close" aria-label="Tutup menu" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch">
          <div className="avatar">B</div>
          <span><strong>{profileName || 'Creator'}</strong><small>Creator space</small></span>
          <ChevronDown size={15} className="muted-icon" />
        </button>
        <div className="nav-label">MENU UTAMA</div>
        <nav className="nav-list" aria-label="Navigasi utama">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${section === label ? 'nav-active' : ''}`} onClick={() => { setSection(label); setMenuOpen(false) }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === 'Donations' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-note"><ShieldCheck size={17} /><span><strong>Payment-safe mode</strong><small>Gateway nonaktif</small></span></div>
          <div className="profile-row">
            <div className="profile-avatar">{profileName.charAt(0).toUpperCase() || 'C'}</div>
            <div className="profile-copy"><strong>{userEmail ? userEmail.split('@')[0] : 'Guest creator'}</strong><small>{userEmail ?? 'Preview workspace'}</small></div>
            {userEmail && <button className="icon-button" title="Keluar" onClick={signOut}><LogOut size={16} /></button>}
          </div>
        </div>
      </aside>

      {menuOpen && <button className="mobile-backdrop" aria-label="Tutup navigasi" onClick={() => setMenuOpen(false)} />}
      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Buka menu" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{section}</strong></div>
          </div>
          <div className="topbar-actions">
            {!userEmail && <button className="button button-primary" onClick={() => setSection('Settings')}>Daftar / Masuk</button>}
            <span className="system-status"><span className="status-pulse" /> Preview mode</span>
            <button className="icon-button notification-button" aria-label="Notifikasi"><Bell size={18} /><i /></button>
            <div className="top-avatar">{profileName.charAt(0).toUpperCase() || 'C'}</div>
          </div>
        </header>

        <div className="content">
          <div className="notice-banner">
            <div className="notice-icon"><ShieldCheck size={18} /></div>
            <div><strong>Pembayaran belum diaktifkan</strong><p>QRIS dan payment gateway tetap nonaktif sampai verifikasi merchant selesai. Angka pada dashboard adalah data contoh.</p></div>
            <span className="notice-badge">AMAN</span>
          </div>

          {authMessage && <div className="inline-message" role="status"><Activity size={16} /><span>{authMessage}</span><button className="icon-button" aria-label="Tutup pesan" onClick={() => setAuthMessage('')}><X size={15} /></button></div>}

          {section === 'Overview' && <Overview onNavigate={setSection} />}
          {section === 'Donations' && <Donations />}
          {section === 'Overlay' && <Overlay features={overlayFeatures} tokens={overlayTokens} busy={overlayBusy} copiedFeature={copiedFeature} showUrls={showUrls} urlFor={overlayUrl} onGenerate={generateOverlayTokens} onCopy={copyOverlay} onToggleUrl={feature => setShowUrls(current => ({ ...current, [feature]: !current[feature] }))} />}
          {section === 'Live Studio' && <LiveStudio />}
          {section === 'Settings' && <SettingsPanel profileName={profileName} setProfileName={setProfileName} handle={handle} setHandle={setHandle} bio={bio} setBio={setBio} profilePublic={profilePublic} setProfilePublic={setProfilePublic} onSave={saveProfile} saved={saved} profileLoading={profileLoading} email={email} setEmail={setEmail} otp={otp} setOtp={setOtp} otpSent={otpSent} onLogin={sendMagicLink} onVerifyOtp={verifyEmailOtp} authBusy={authBusy} userEmail={userEmail} />}
          <footer className="footer"><span>© 2026 Bagisawer</span><span><span className="footer-dot" /> Sistem berjalan dalam mode preview</span></footer>
        </div>
      </main>
    </div>
  )
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>
}

function Overview({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const stats = [
    { title: 'Total sawer', value: formatMoney(0), change: 'Belum ada transaksi live', icon: Wallet, tone: 'violet' },
    { title: 'Donasi masuk', value: '0', change: 'Data produksi belum tersambung', icon: Heart, tone: 'pink' },
    { title: 'Rata-rata sawer', value: formatMoney(0), change: 'Menunggu aktivasi pembayaran', icon: CircleDollarSign, tone: 'blue' },
    { title: 'Overlay status', value: 'Siap diatur', change: 'Token overlay belum dibuat', icon: Radio, tone: 'green' },
  ]
  return <>
    <PageHeading eyebrow="CREATOR OVERVIEW" title="Dashboard" description="Pantau dukungan komunitas dan siapkan pengalaman streaming kamu." action={<button className="button button-primary" onClick={() => onNavigate('Overlay')}><MonitorPlay size={16} /> Atur overlay</button>} />
    <div className="welcome-card">
      <div className="welcome-copy"><div className="welcome-kicker"><Sparkles size={14} /> CREATOR CONTROL CENTER</div><h2>Halo, Creator. <span>Siap live?</span></h2><p>Bangun ruang dukungan yang lebih dekat dengan komunitasmu. Konfigurasikan profil dan overlay sebelum mengaktifkan pembayaran.</p><button className="button button-light" onClick={() => onNavigate('Settings')}>Lengkapi profil <ArrowUpRight size={15} /></button></div>
      <div className="welcome-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-core"><Heart size={34} fill="currentColor" /></div><div className="float-chip chip-one"><Sparkles size={15} /> Supporter</div><div className="float-chip chip-two"><Activity size={15} /> Live ready</div></div>
    </div>
    <div className="section-heading"><div><h2>Ringkasan performa</h2><p>Statistik akan terisi setelah sumber data produksi dihubungkan.</p></div><span className="sample-pill"><span /> DATA PREVIEW</span></div>
    <div className="stats-grid">{stats.map(({ title, value, change, icon: Icon, tone }) => <div className="stat-card" key={title}><div className="stat-top"><span>{title}</span><span className={`stat-icon ${tone}`}><Icon size={18} /></span></div><strong className="stat-value">{value}</strong><div className="stat-bottom"><span className="stat-change">{change}</span></div></div>)}</div>
    <div className="lower-grid">
      <section className="panel activity-panel"><div className="panel-heading"><div><h2>Aktivitas terbaru</h2><p>Contoh tampilan riwayat sawer</p></div><button className="text-button" onClick={() => onNavigate('Donations')}>Lihat semua <ArrowUpRight size={14} /></button></div>
        {sampleDonations.map((donation, index) => <div className="activity-row" key={donation.name}><div className={`donor-avatar donor-${index}`}>{donation.name.charAt(0)}</div><div className="donor-info"><strong>{donation.name}</strong><span>{donation.message}</span><small>{donation.time}</small></div><strong className="donation-amount">{donation.amount}</strong></div>)}
      </section>
      <section className="panel setup-panel"><div className="panel-heading"><div><h2>Checklist awal</h2><p>Langkah sebelum go-live</p></div><span className="check-count">1/3</span></div>
        <div className="checklist-item"><span className="check-icon complete"><Check size={13} /></span><div><strong>Proyek backend</strong><small>Struktur Supabase tersedia</small></div><span className="tiny-state done">OK</span></div>
        <div className="checklist-item"><span className="check-icon"><span /></span><div><strong>Profil creator</strong><small>Tambahkan nama dan handle</small></div><button className="tiny-link" onClick={() => onNavigate('Settings')}>Atur</button></div>
        <div className="checklist-item"><span className="check-icon"><span /></span><div><strong>Verifikasi pembayaran</strong><small>QRIS/gateway masih ditunda</small></div><span className="tiny-state pending">NANTI</span></div>
        <div className="setup-progress"><span style={{ width: '33.33%' }} /></div>
      </section>
    </div>
  </>
}

function Donations() {
  const [query, setQuery] = useState('')
  const filtered = sampleDonations.filter(d => d.name.toLowerCase().includes(query.toLowerCase()) || d.message.toLowerCase().includes(query.toLowerCase()))
  return <>
    <PageHeading eyebrow="COMMUNITY SUPPORT" title="Riwayat sawer" description="Riwayat nyata akan muncul di sini setelah backend terhubung." />
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Transaksi terbaru</h2><p>Daftar contoh — bukan transaksi sungguhan</p></div><div className="search-box"><Activity size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari aktivitas..." aria-label="Cari aktivitas" /></div></div>
      <div className="table-wrap"><table><thead><tr><th>SUPPORTER</th><th>PESAN</th><th>JUMLAH</th><th>WAKTU</th><th>STATUS</th></tr></thead><tbody>{filtered.map(d => <tr key={d.name}><td><div className="table-person"><span className="donor-avatar">{d.name.charAt(0)}</span><strong>{d.name}</strong></div></td><td>{d.message}</td><td className="table-amount">{d.amount}</td><td>{d.time}</td><td><span className="status-tag">CONTOH</span></td></tr>)}</tbody></table></div>
      {filtered.length === 0 && <div className="empty-state">Tidak ada contoh aktivitas yang cocok dengan pencarian.</div>}
      <div className="table-foot"><span>Menampilkan {filtered.length} data contoh</span><span>Data live belum tersedia</span></div>
    </section>
    <div className="info-card"><ShieldCheck size={19} /><div><strong>Integritas transaksi dijaga</strong><p>Dashboard tidak menganggap donasi sebagai lunas hanya berdasarkan input browser. Status pembayaran harus dikonfirmasi oleh webhook gateway setelah verifikasi merchant.</p></div></div>
  </>
}

type OverlayFeature = { key: string; title: string; description: string }
function Overlay({ features, tokens, busy, copiedFeature, showUrls, urlFor, onGenerate, onCopy, onToggleUrl }: {
  features: OverlayFeature[]; tokens: Record<string, string>
  busy: boolean; copiedFeature: string; showUrls: Record<string, boolean>; urlFor: (feature: string) => string
  onGenerate: () => void; onCopy: (feature: string) => void; onToggleUrl: (feature: string) => void
}) {
  const readyCount = features.filter(feature => Boolean(tokens[feature.key])).length
  return <>
    <PageHeading eyebrow="STREAMING TOOLS" title="Overlay per fitur" description="Semua URL overlay ada di satu tempat. Simpan pengaturan visual tanpa mengubah token atau URL OBS." action={<span className="status-tag status-muted">PAYMENT SAFE</span>} />
    <div className="info-card"><MonitorPlay size={19} /><div><strong>Token tetap untuk setiap fitur</strong><p>Token dibuat sekali per fitur dan dimuat kembali saat creator login. Mengubah atau menyimpan setting tidak membuat token baru. Setiap URL dapat dipasang sebagai Browser Source OBS terpisah.</p></div></div>
    <section className="panel overlay-config">
      <div className="panel-heading"><div><h2>URL Browser Source</h2><p>{readyCount} dari {features.length} token tersedia</p></div><div className="overlay-icon"><Link2 size={19} /></div></div>
      <div className="overlay-feature-list">
        {features.map(feature => <div key={feature.key} className="overlay-feature-row">
          <div className="overlay-feature-copy"><strong>{feature.title}</strong><span>{feature.description}</span></div>
          <div className="url-field"><Link2 size={15} /><input readOnly type={showUrls[feature.key] ? 'text' : 'password'} value={tokens[feature.key] ? urlFor(feature.key) : 'Token belum dibuat'} aria-label={'URL overlay ' + feature.key} /><button className="icon-button" onClick={() => onToggleUrl(feature.key)} aria-label={showUrls[feature.key] ? 'Sembunyikan URL' : 'Tampilkan URL'} disabled={!tokens[feature.key]}>{showUrls[feature.key] ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
          <div className="overlay-row-actions">
            <span className={tokens[feature.key] ? 'tiny-state done' : 'tiny-state pending'}>{tokens[feature.key] ? 'TOKEN TETAP' : 'BELUM ADA'}</span>
            <button className="button button-secondary" onClick={() => onCopy(feature.key)} disabled={!tokens[feature.key]}>{copiedFeature === feature.key ? <Check size={15} /> : <Copy size={15} />}{copiedFeature === feature.key ? 'Tersalin' : 'Salin URL'}</button>
          </div>
        </div>)}
      </div>
      <div className="url-actions"><button className="button button-primary" onClick={onGenerate} disabled={busy}>{busy ? 'Memeriksa / membuat token…' : readyCount === features.length ? 'Muat ulang daftar token' : 'Buat semua token yang belum ada'}</button></div>
      <span className="helper-text">Tombol ini hanya membuat token yang belum tersedia; token yang sudah ada tidak diganti. Simpan URL di OBS sekali saja.</span>
      <div className="divider-line" /><h3>Pengaturan Browser Source OBS</h3><div className="obs-settings"><div><span>Lebar awal</span><strong>1920 px</strong></div><div><span>Tinggi awal</span><strong>1080 px</strong></div><div><span>FPS</span><strong>30</strong></div></div>
    </section>
  </>
}

function SettingsPanel({ profileName, setProfileName, handle, setHandle, bio, setBio, profilePublic, setProfilePublic, onSave, saved, profileLoading, email, setEmail, otp, setOtp, otpSent, onLogin, onVerifyOtp, authBusy, userEmail }: {
  profileName: string; setProfileName: (value: string) => void; handle: string; setHandle: (value: string) => void; bio: string; setBio: (value: string) => void; profilePublic: boolean; setProfilePublic: (value: boolean) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; saved: boolean; profileLoading: boolean; email: string; setEmail: (value: string) => void; otp: string; setOtp: (value: string) => void; otpSent: boolean; onLogin: (event: FormEvent<HTMLFormElement>) => void; onVerifyOtp: (event: FormEvent<HTMLFormElement>) => void; authBusy: boolean; userEmail: string | null
}) {
  return <>
    <PageHeading eyebrow="WORKSPACE CONFIGURATION" title="Pengaturan" description="Kelola profil kreator. Daftar atau masuk dengan kode OTP 6 digit yang dikirim ke email." />
    <div className="settings-grid"><section className="panel settings-panel"><div className="panel-heading"><div><h2>Profil kreator</h2><p>{userEmail ? 'Disimpan permanen ke Supabase' : 'Masuk untuk membuat dan menyimpan profil'}</p></div><div className="settings-icon"><Settings size={18} /></div></div>
      <form onSubmit={onSave}><label className="field-label" htmlFor="creator-name">NAMA TAMPILAN</label><input id="creator-name" className="form-input" maxLength={48} value={profileName} onChange={e => setProfileName(e.target.value)} required />
      <label className="field-label" htmlFor="creator-handle">HANDLE PUBLIK</label><div className="handle-input"><span>@</span><input id="creator-handle" maxLength={30} pattern="[a-z0-9_]{3,30}" value={handle} onChange={e => setHandle(e.target.value.toLowerCase())} required /></div><p className="field-help">3–30 karakter: huruf kecil, angka, dan garis bawah. Handle harus unik.</p>
      <label className="field-label" htmlFor="creator-bio">BIOGRAFI (OPSIONAL)</label><textarea id="creator-bio" className="form-input" maxLength={500} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Ceritakan tentang channel kamu…" />
      <label className="field-help" style={{display:'flex',alignItems:'center',gap:8,marginTop:12}}><input type="checkbox" checked={profilePublic} onChange={e => setProfilePublic(e.target.checked)} /> Tampilkan halaman kreator ke publik</label>
      <div className="form-footer"><span className="helper-text">{userEmail ? (profilePublic ? `Publik: /creator/${handle || 'handle'}` : 'Profil privat') : 'Login diperlukan untuk menyimpan.'}</span><button className="button button-primary" type="submit" disabled={!userEmail || profileLoading}>{profileLoading ? 'Menyimpan…' : saved ? <Check size={15} /> : null}{saved ? 'Tersimpan' : 'Simpan profil'}</button></div></form>
    </section>
    <section className="panel settings-panel"><div className="panel-heading"><div><h2>Akun & autentikasi</h2><p>{isSupabaseConfigured ? 'Supabase client terkonfigurasi' : 'Menunggu konfigurasi environment'}</p></div><div className="settings-icon"><ShieldCheck size={18} /></div></div>
      <div className="config-status"><span className={`config-dot ${isSupabaseConfigured ? 'configured' : ''}`} /><span><strong>{isSupabaseConfigured ? 'Supabase tersedia' : 'Supabase belum terkonfigurasi'}</strong><small>{userEmail ? `Masuk sebagai ${userEmail}` : otpSent ? `Kode dikirim ke ${email}` : 'Masukkan email untuk menerima kode OTP 6 digit.'}</small></span></div>
      {!userEmail && <><form onSubmit={onLogin}><label className="field-label" htmlFor="login-email">EMAIL</label><input id="login-email" className="form-input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" required /><button className="button button-primary full-button" type="submit" disabled={authBusy}>{authBusy ? 'Memproses…' : otpSent ? 'Kirim ulang kode OTP' : 'Daftar / masuk dengan OTP'}</button></form>{otpSent && <form onSubmit={onVerifyOtp} style={{marginTop:16}}><label className="field-label" htmlFor="login-otp">KODE OTP 6 DIGIT</label><input id="login-otp" className="form-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" required /><button className="button button-primary full-button" type="submit" disabled={authBusy || !/^\d{6}$/.test(otp)}>{authBusy ? 'Memverifikasi…' : 'Verifikasi kode & masuk'}</button></form>}</>}
      <div className="info-card compact"><ShieldCheck size={18} /><p>Frontend memakai public anon key saja. Pastikan RLS aktif pada tabel pengguna dan jangan pernah menaruh service-role key di sini.</p></div>
    </section></div>
    <section className="panel payment-panel"><div className="payment-lock"><ShieldCheck size={20} /></div><div><h2>Integrasi pembayaran</h2><p>QRIS, Midtrans, dan gateway lain tetap nonaktif sampai verifikasi merchant selesai dan pengujian webhook disetujui. Halaman publik saat ini hanya profil kreator; belum menerima atau mencatat pembayaran.</p></div><span className="notice-badge">DINONAKTIFKAN</span></section>
  </>
}

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname === '/overlay') return <LiveOverlay />
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/creator/')) return <PublicCreator />
  return <Dashboard />
}