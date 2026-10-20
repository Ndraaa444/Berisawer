import { useEffect, useState } from 'react'

type OverlayEvent = { id: string; event_type: string; payload: Record<string, unknown>; created_at: string }
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export default function LiveOverlay() {
  const [events, setEvents] = useState<OverlayEvent[]>([])
  const [status, setStatus] = useState('Menghubungkan overlay…')
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')

  useEffect(() => {
    if (!token || token === 'SET_OVERLAY_TOKEN') {
      setStatus('Token overlay belum diatur. Buat token dari dashboard kreator.')
      return
    }
    if (!supabaseUrl || !anonKey) {
      setStatus('Konfigurasi Supabase belum tersedia.')
      return
    }
    let alive = true
    let cursor = ''
    let busy = false
    const poll = async () => {
      if (busy) return
      busy = true
      try {
        const params = new URLSearchParams({ token })
        if (cursor) params.set('after', cursor)
        const response = await fetch(`${supabaseUrl}/functions/v1/overlay-feed?${params.toString()}`, { headers: { apikey: anonKey } })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (alive) setStatus(response.status === 401 ? 'Token tidak valid atau sudah dicabut.' : 'Overlay belum dapat mengambil event.')
          return
        }
        const next = Array.isArray(data.events) ? data.events as OverlayEvent[] : []
        if (next.length) {
          cursor = next[next.length - 1].created_at
          if (alive) setEvents(current => [...current, ...next].slice(-5))
        }
        if (alive) setStatus('Terhubung • menunggu event')
      } catch {
        if (alive) setStatus('Koneksi terputus • mencoba kembali')
      } finally { busy = false }
    }
    void poll()
    const timer = window.setInterval(() => { void poll() }, 3000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [token])

  const latestTicker = [...events].reverse().find(event => event.event_type === 'ticker')
  const tickerText = typeof latestTicker?.payload?.text === 'string' ? latestTicker.payload.text : ''
  return <main style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px', boxSizing: 'border-box' }}>
    <div style={{ position: 'fixed', left: 24, right: 24, bottom: 36, overflow: 'hidden', border: '1px solid rgba(65,230,255,.55)', borderRadius: 16, background: 'rgba(5,12,27,.86)', boxShadow: '0 12px 44px rgba(0,0,0,.35)', backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
        <strong style={{ color: '#41e6ff', letterSpacing: '.14em', fontSize: 12, whiteSpace: 'nowrap' }}>BERISAWER</strong>
        <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,.2)' }} />
        <div style={{ flex: 1, fontSize: 20, fontWeight: 650, overflowWrap: 'anywhere' }}>{tickerText || 'Menunggu running text…'}</div>
      </div>
    </div>
    <div style={{ position: 'fixed', top: 10, right: 12, color: 'rgba(255,255,255,.65)', fontSize: 10, textShadow: '0 1px 3px #000' }}>{status}</div>
  </main>
}
