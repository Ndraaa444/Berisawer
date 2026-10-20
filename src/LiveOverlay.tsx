import { useEffect, useState } from 'react'

type OverlayEvent = { id: string; event_type: string; payload: Record<string, unknown>; created_at: string }
type Leader = { name: string; amount: number; donations: number }
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export default function LiveOverlay() {
  const [events, setEvents] = useState<OverlayEvent[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [status, setStatus] = useState('Menghubungkan overlay…')
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')
  const [feature] = useState(() => new URLSearchParams(window.location.search).get('feature') ?? 'all')

  useEffect(() => {
    if (!token || token === 'TOKEN_BELUM_DIBUAT' || token === 'SET_OVERLAY_TOKEN') {
      setStatus('Token overlay belum diatur. Buat URL dari dashboard kreator.')
      return
    }
    if (!supabaseUrl || !anonKey) {
      setStatus('Konfigurasi Supabase belum tersedia.')
      return
    }
    let alive = true
    let cursor: { created_at: string; id: string } | null = null
    let busy = false
    const poll = async () => {
      if (busy) return
      busy = true
      try {
        const params = new URLSearchParams({ token, feature })
        if (cursor && feature !== 'leaderboard') {
          params.set('after', cursor.created_at)
          params.set('after_id', cursor.id)
        }
        const response = await fetch(supabaseUrl + '/functions/v1/overlay-feed?' + params.toString(), { headers: { apikey: anonKey } })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (alive) setStatus(response.status === 401 ? 'Token tidak valid atau sudah dicabut.' : response.status === 403 ? 'URL ini hanya berlaku untuk fitur yang dipilih saat token dibuat.' : 'Overlay belum dapat mengambil event.')
          return
        }
        if (feature === 'leaderboard') {
          if (alive) setLeaders(Array.isArray(data.leaderboard) ? data.leaderboard as Leader[] : [])
        } else {
          const next = Array.isArray(data.events) ? data.events as OverlayEvent[] : []
          if (data.cursor && typeof data.cursor.created_at === 'string' && typeof data.cursor.id === 'string') {
            cursor = { created_at: data.cursor.created_at, id: data.cursor.id }
          }
          if (next.length && alive) setEvents(current => [...current, ...next].slice(-5))
        }
        if (alive) setStatus('Terhubung • menunggu event')
      } catch {
        if (alive) setStatus('Koneksi terputus • mencoba kembali')
      } finally { busy = false }
    }
    void poll()
    const timer = window.setInterval(() => { void poll() }, feature === 'leaderboard' ? 15000 : 3000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [token, feature])

  const latest = [...events].reverse()[0]
  const latestTicker = [...events].reverse().find(event => event.event_type === 'ticker')
  const tickerText = typeof latestTicker?.payload?.text === 'string' ? latestTicker.payload.text : ''
  const eventName = String(latest?.payload?.donor_name ?? latest?.payload?.name ?? latest?.payload?.title ?? 'Dukungan komunitas')
  const eventMessage = String(latest?.payload?.message ?? latest?.payload?.text ?? '')
  const eventAmount = Number(latest?.payload?.amount ?? 0)
  const titleByFeature: Record<string, string> = { alerts: 'DUKUNGAN BARU', voice: 'PESAN SUPPORTER', media: 'MEDIA SHARE', subathon: 'SUBATHON TIMER', goals: 'TARGET KOMUNITAS', polls: 'POLLING KOMUNITAS', requests: 'REQUEST KOMUNITAS' }

  if (feature === 'leaderboard') return <main style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: 12, boxSizing: 'border-box' }}>
    <section style={{ width: 'min(440px, 100%)', margin: '0 auto', padding: 20, border: '1px solid rgba(65,230,255,.55)', borderRadius: 20, background: 'rgba(5,12,27,.88)', boxShadow: '0 12px 44px rgba(0,0,0,.35)', backdropFilter: 'blur(12px)' }}>
      <div style={{ color: '#41e6ff', fontSize: 11, letterSpacing: '.18em', fontWeight: 800 }}>BERISAWER COMMUNITY</div>
      <h1 style={{ fontSize: 25, margin: '8px 0 4px' }}>🏆 Top Supporter</h1>
      <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,.65)', fontSize: 12 }}>30 hari terakhir · donasi terverifikasi</p>
      {leaders.length ? leaders.map((leader, index) => <div key={leader.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.1)' }}><strong style={{ color: index === 0 ? '#ffd66b' : '#41e6ff', width: 28, fontSize: 18 }}>#{index + 1}</strong><div style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{leader.name}</strong><small style={{ color: 'rgba(255,255,255,.6)' }}>{leader.donations} dukungan</small></div><strong>{money(leader.amount)}</strong></div>) : <div style={{ padding: '22px 0', color: 'rgba(255,255,255,.72)', fontSize: 14 }}>Leaderboard akan terisi setelah donasi terverifikasi tersedia.</div>}
    </section><div style={{ position: 'fixed', bottom: 5, right: 8, color: 'rgba(255,255,255,.45)', fontSize: 9 }}>{status}</div>
  </main>

  if (feature === 'ticker') return <main style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
    <div style={{ position: 'fixed', left: 24, right: 24, bottom: 36, overflow: 'hidden', border: '1px solid rgba(65,230,255,.55)', borderRadius: 16, background: 'rgba(5,12,27,.86)', boxShadow: '0 12px 44px rgba(0,0,0,.35)', backdropFilter: 'blur(12px)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}><strong style={{ color: '#41e6ff', letterSpacing: '.14em', fontSize: 12, whiteSpace: 'nowrap' }}>BERISAWER</strong><span style={{ width: 1, height: 24, background: 'rgba(255,255,255,.2)' }} /><div style={{ flex: 1, fontSize: 20, fontWeight: 650, overflowWrap: 'anywhere' }}>{tickerText || 'Menunggu running text…'}</div></div></div><div style={{ position: 'fixed', top: 10, right: 12, color: 'rgba(255,255,255,.65)', fontSize: 10 }}>{status}</div>
  </main>

  if (feature === 'all' || feature === 'alerts' || feature === 'voice' || feature === 'media' || feature === 'subathon' || feature === 'goals' || feature === 'polls' || feature === 'requests') return <main style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: 24, boxSizing: 'border-box' }}>
    <section style={{ position: 'fixed', left: 24, right: 24, bottom: 36, border: '1px solid rgba(65,230,255,.55)', borderRadius: 18, padding: 20, background: 'rgba(5,12,27,.88)', boxShadow: '0 12px 44px rgba(0,0,0,.35)', backdropFilter: 'blur(12px)' }}><div style={{ color: '#41e6ff', letterSpacing: '.15em', fontSize: 11, fontWeight: 800 }}>{titleByFeature[feature] ?? 'BERISAWER OVERLAY'}</div>{latest ? <><h2 style={{ margin: '10px 0 4px', fontSize: 28 }}>{eventName}</h2>{eventAmount > 0 && <strong style={{ display: 'block', fontSize: 21, color: '#ffd66b' }}>{money(eventAmount)}</strong>}{eventMessage && <p style={{ margin: '10px 0 0', fontSize: 17, overflowWrap: 'anywhere' }}>{eventMessage}</p>}</> : <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,.72)' }}>{feature === 'alerts' ? 'Menunggu alert dukungan…' : 'Menunggu event fitur ini…'}</p>}</section><div style={{ position: 'fixed', top: 10, right: 12, color: 'rgba(255,255,255,.55)', fontSize: 10 }}>{status}</div>
  </main>
  return <main style={{ color: '#fff', background: 'transparent', padding: 20 }}>Overlay fitur tidak dikenal.</main>
}
