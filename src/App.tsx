import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity, ArrowUpRight, Bell, Check, ChevronDown,
  CircleDollarSign, Copy, Eye, EyeOff, Heart,
  LayoutDashboard, Link2, LogOut, Menu, MonitorPlay, Radio, Settings,
  ShieldCheck, Sparkles, Wallet, X,
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import LiveStudio from './LiveStudio'

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

function App() {
  const [section, setSection] = useState<Section>('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('Creator')
  const [handle, setHandle] = useState('creator-kamu')
  const [copied, setCopied] = useState(false)
  const [showUrl, setShowUrl] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user.email ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const overlayUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://your-domain.example/overlay'
    return window.location.origin + '/overlay?token=SET_OVERLAY_TOKEN'
  }, [])

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setAuthMessage('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY terlebih dahulu.')
      return
    }
    setAuthBusy(true)
    setAuthMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setAuthMessage(error ? error.message : 'Tautan masuk dikirim jika email ini diizinkan. Periksa kotak masuk Anda.')
    setAuthBusy(false)
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setUserEmail(null)
    setAuthMessage('')
  }

  async function copyOverlay() {
    try {
      await navigator.clipboard.writeText(overlayUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setAuthMessage('Clipboard tidak tersedia di browser ini. Salin URL overlay secara manual.')
      setShowUrl(true)
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
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
          {section === 'Overlay' && <Overlay url={overlayUrl} copied={copied} showUrl={showUrl} onCopy={copyOverlay} onToggleUrl={() => setShowUrl(!showUrl)} />}
          {section === 'Live Studio' && <LiveStudio />}
          {section === 'Settings' && <SettingsPanel profileName={profileName} setProfileName={setProfileName} handle={handle} setHandle={setHandle} onSave={saveProfile} saved={saved} email={email} setEmail={setEmail} onLogin={sendMagicLink} authBusy={authBusy} userEmail={userEmail} />}
          <footer className="footer"><span>© 2026 Berisawer</span><span><span className="footer-dot" /> Sistem berjalan dalam mode preview</span></footer>
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

function Overlay({ url, copied, showUrl, onCopy, onToggleUrl }: { url: string; copied: boolean; showUrl: boolean; onCopy: () => void; onToggleUrl: () => void }) {
  return <>
    <PageHeading eyebrow="STREAMING TOOLS" title="Browser overlay" description="Siapkan overlay untuk OBS atau software streaming lain." action={<span className="status-tag status-muted">BELUM AKTIF</span>} />
    <div className="overlay-layout"><section className="panel overlay-config"><div className="panel-heading"><div><h2>Konfigurasi overlay</h2><p>URL ini hanya template preview, bukan token aktif.</p></div><div className="overlay-icon"><MonitorPlay size={19} /></div></div>
      <label className="field-label">URL BROWSER SOURCE</label><div className="url-field"><Link2 size={16} /><input readOnly type={showUrl ? 'text' : 'password'} value={url} aria-label="URL overlay preview" /><button className="icon-button" onClick={onToggleUrl} aria-label={showUrl ? 'Sembunyikan URL' : 'Tampilkan URL'}>{showUrl ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
      <div className="url-actions"><button className="button button-primary" onClick={onCopy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Tersalin' : 'Salin URL'}</button><span className="helper-text">Token autentik belum diterbitkan.</span></div>
      <div className="divider-line" /><h3>Rekomendasi OBS</h3><div className="obs-settings"><div><span>Lebar</span><strong>1920 px</strong></div><div><span>Tinggi</span><strong>1080 px</strong></div><div><span>FPS</span><strong>30</strong></div></div>
      <div className="info-card compact"><ShieldCheck size={18} /><p>Jangan gunakan URL contoh ini sebagai Browser Source produksi. Token overlay perlu dibuat dan disimpan dengan aman terlebih dahulu.</p></div>
    </section>
    <section className="overlay-preview"><div className="preview-top"><span><span className="preview-live-dot" /> PREVIEW CANVAS</span><span>16:9</span></div><div className="preview-canvas"><div className="preview-grid" /><div className="preview-empty"><div className="preview-symbol"><Radio size={28} /></div><strong>Overlay kamu akan muncul di sini</strong><span>Hubungkan token untuk melihat event sawer secara real-time.</span><span className="preview-pill">PREVIEW ONLY</span></div><div className="preview-bottom"><span>BERISAWER / OVERLAY</span><span>WAITING FOR EVENT</span></div></div><p className="preview-caption"><Activity size={14} /> Tampilan ilustrasi; koneksi live belum diaktifkan.</p></section></div>
  </>
}

function SettingsPanel({ profileName, setProfileName, handle, setHandle, onSave, saved, email, setEmail, onLogin, authBusy, userEmail }: {
  profileName: string; setProfileName: (value: string) => void; handle: string; setHandle: (value: string) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; saved: boolean; email: string; setEmail: (value: string) => void; onLogin: (event: FormEvent<HTMLFormElement>) => void; authBusy: boolean; userEmail: string | null
}) {
  return <>
    <PageHeading eyebrow="WORKSPACE CONFIGURATION" title="Pengaturan" description="Kelola profil creator dan sambungkan autentikasi Supabase." />
    <div className="settings-grid"><section className="panel settings-panel"><div className="panel-heading"><div><h2>Profil creator</h2><p>Pratinjau profil lokal pada sesi ini</p></div><div className="settings-icon"><Settings size={18} /></div></div>
      <form onSubmit={onSave}><label className="field-label" htmlFor="creator-name">NAMA TAMPILAN</label><input id="creator-name" className="form-input" maxLength={48} value={profileName} onChange={e => setProfileName(e.target.value)} required />
      <label className="field-label" htmlFor="creator-handle">HANDLE PUBLIK</label><div className="handle-input"><span>@</span><input id="creator-handle" maxLength={24} pattern="[a-zA-Z0-9_-]+" value={handle} onChange={e => setHandle(e.target.value.toLowerCase())} required /></div><p className="field-help">Gunakan huruf, angka, garis bawah, atau tanda hubung.</p>
      <div className="form-footer"><span className="helper-text">Belum disimpan ke database.</span><button className="button button-primary" type="submit">{saved ? <Check size={15} /> : null}{saved ? 'Tersimpan di sesi' : 'Simpan profil'}</button></div></form>
    </section>
    <section className="panel settings-panel"><div className="panel-heading"><div><h2>Akun & autentikasi</h2><p>{isSupabaseConfigured ? 'Supabase client terkonfigurasi' : 'Menunggu konfigurasi environment'}</p></div><div className="settings-icon"><ShieldCheck size={18} /></div></div>
      <div className="config-status"><span className={`config-dot ${isSupabaseConfigured ? 'configured' : ''}`} /><span><strong>{isSupabaseConfigured ? 'Supabase tersedia' : 'Supabase belum terkonfigurasi'}</strong><small>{userEmail ? `Masuk sebagai ${userEmail}` : 'Gunakan email untuk menerima tautan masuk.'}</small></span></div>
      {!userEmail && <form onSubmit={onLogin}><label className="field-label" htmlFor="login-email">EMAIL</label><input id="login-email" className="form-input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" required /><button className="button button-primary full-button" type="submit" disabled={authBusy}>{authBusy ? 'Mengirim tautan...' : 'Kirim magic link'}</button></form>}
      <div className="info-card compact"><ShieldCheck size={18} /><p>Frontend memakai public anon key saja. Pastikan RLS aktif pada tabel pengguna dan jangan pernah menaruh service-role key di sini.</p></div>
    </section></div>
    <section className="panel payment-panel"><div className="payment-lock"><ShieldCheck size={20} /></div><div><h2>Integrasi pembayaran</h2><p>QRIS, Midtrans, dan gateway lain tetap nonaktif sampai verifikasi merchant selesai dan pengujian webhook disetujui.</p></div><span className="notice-badge">DINONAKTIFKAN</span></section>
  </>
}

export default App