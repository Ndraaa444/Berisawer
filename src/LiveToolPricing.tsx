import { useEffect, useState } from 'react'
import { Check, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { supabase } from './lib/supabase'
import './live-pricing.css'

type PricingConfig = {
  donation: { enabled: boolean; min_amount: number }
  voice: { enabled: boolean; min_amount: number; pricing_mode: 'session' | 'minute'; price_per_minute: number; session_price: number; max_minutes: number }
  media: { enabled: boolean; min_amount: number; price_per_second: number; max_duration_seconds: number }
  ticker: { enabled: boolean; min_amount: number; display_seconds: number; max_chars: number }
  subathon: { enabled: boolean; min_amount: number; minutes_per_1000: number; max_added_minutes: number; max_timer_minutes: number }
  alerts: { enabled: boolean; min_amount: number }
  goals: { enabled: boolean }
  polls: { enabled: boolean }
  requests: { enabled: boolean; min_amount: number }
}

const defaults: PricingConfig = {
  donation: { enabled: true, min_amount: 1000 },
  voice: { enabled: false, min_amount: 10000, pricing_mode: 'session', price_per_minute: 5000, session_price: 15000, max_minutes: 5 },
  media: { enabled: false, min_amount: 10000, price_per_second: 1000, max_duration_seconds: 120 },
  ticker: { enabled: false, min_amount: 5000, display_seconds: 10, max_chars: 120 },
  subathon: { enabled: false, min_amount: 10000, minutes_per_1000: 1, max_added_minutes: 120, max_timer_minutes: 1440 },
  alerts: { enabled: true, min_amount: 1000 },
  goals: { enabled: true },
  polls: { enabled: false },
  requests: { enabled: false, min_amount: 5000 },
}

const rupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
const storageKey = (userId: string | null) => `berisawer-live-tools:${userId ?? 'preview'}`

export default function LiveToolPricing() {
  const [config, setConfig] = useState<PricingConfig>(defaults)
  const [userId, setUserId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let alive = true
    const loadForUser = async (uid: string | null) => {
      if (!alive) return
      setUserId(uid)
      let next: PricingConfig = defaults
      if (uid && supabase) {
        const { data, error } = await supabase.from('creator_settings').select('live_tools_config').eq('user_id', uid).maybeSingle()
        if (error) setFeedback('Pengaturan akun belum dapat dimuat dari Supabase. Periksa koneksi dan izin tabel.')
        if (data?.live_tools_config && typeof data.live_tools_config === 'object') {
          next = { ...defaults, ...data.live_tools_config } as PricingConfig
        } else {
          try {
            const local = localStorage.getItem(storageKey(uid))
            if (local) next = { ...defaults, ...JSON.parse(local) } as PricingConfig
          } catch { /* keep safe defaults */ }
        }
      } else {
        try {
          const local = localStorage.getItem(storageKey(null))
          if (local) next = { ...defaults, ...JSON.parse(local) } as PricingConfig
        } catch { /* keep safe defaults */ }
      }
      if (alive) {
        setConfig(next)
        setLoaded(true)
      }
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => loadForUser(data.session?.user.id ?? null))
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        void loadForUser(session?.user.id ?? null)
      })
      return () => { alive = false; listener.subscription.unsubscribe() }
    }
    void loadForUser(null)
    return () => { alive = false }
  }, [])

  function update<K extends keyof PricingConfig>(key: K, patch: Partial<PricingConfig[K]>) {
    setConfig(current => ({ ...current, [key]: { ...current[key], ...patch } }))
    setFeedback('')
  }

  async function save() {
    setBusy(true)
    setFeedback('')
    const safeConfig = {
      ...config,
      donation: { ...config.donation, min_amount: Math.max(1000, Math.floor(config.donation.min_amount || 1000)) },
      voice: { ...config.voice, min_amount: Math.max(1000, Math.floor(config.voice.min_amount || 1000)), session_price: Math.max(0, Math.floor(config.voice.session_price || 0)), price_per_minute: Math.max(0, Math.floor(config.voice.price_per_minute || 0)), max_minutes: Math.max(1, Math.min(60, Math.floor(config.voice.max_minutes || 1))) },
      media: { ...config.media, min_amount: Math.max(1000, Math.floor(config.media.min_amount || 1000)), price_per_second: Math.max(0, Math.floor(config.media.price_per_second || 0)), max_duration_seconds: Math.max(5, Math.min(600, Math.floor(config.media.max_duration_seconds || 5))) },
      ticker: { ...config.ticker, min_amount: Math.max(1000, Math.floor(config.ticker.min_amount || 1000)), display_seconds: Math.max(3, Math.min(120, Math.floor(config.ticker.display_seconds || 3))), max_chars: Math.max(10, Math.min(280, Math.floor(config.ticker.max_chars || 10))) },
      subathon: { ...config.subathon, min_amount: Math.max(1000, Math.floor(config.subathon.min_amount || 1000)), minutes_per_1000: Math.max(0, Math.min(60, Number(config.subathon.minutes_per_1000) || 0)), max_added_minutes: Math.max(1, Math.min(1440, Math.floor(config.subathon.max_added_minutes || 1))), max_timer_minutes: Math.max(1, Math.min(10080, Math.floor(config.subathon.max_timer_minutes || 1))) },
      requests: { ...config.requests, min_amount: Math.max(1000, Math.floor(config.requests.min_amount || 1000)) },
    } as PricingConfig
    setConfig(safeConfig)
    try {
      if (userId && supabase) {
        const { error } = await supabase.from('creator_settings').upsert({ user_id: userId, live_tools_config: safeConfig }, { onConflict: 'user_id' })
        if (error) throw error
        setFeedback('Pengaturan harga berhasil disimpan ke akun Supabase.')
      } else {
        localStorage.setItem(storageKey(null), JSON.stringify(safeConfig))
        setFeedback('Tersimpan di browser preview ini saja. Masuk dengan akun untuk menyimpan ke Supabase.')
      }
    } catch {
      setFeedback('Gagal menyimpan ke akun. Pengaturan belum dianggap tersimpan di server; periksa koneksi dan RLS Supabase.')
    } finally {
      setBusy(false)
    }
  }

  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => (
    <label className="pricing-toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span className="pricing-switch" aria-hidden="true" /></label>
  )
  const moneyInput = (label: string, value: number, onChange: (value: number) => void, min = 1000) => (
    <label className="pricing-field"><span>{label}</span><div><span>Rp</span><input type="number" min={min} step="1000" value={value} onChange={e => onChange(Number(e.target.value))} /></div></label>
  )
  const numberInput = (label: string, value: number, onChange: (value: number) => void, suffix: string, min = 1, max?: number) => (
    <label className="pricing-field"><span>{label}</span><div><input type="number" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} /><span>{suffix}</span></div></label>
  )

  return <section className="panel pricing-panel">
    <div className="panel-heading"><div><h2><SlidersHorizontal size={17} /> Kontrol fitur & tarif kreator</h2><p>Aktifkan tiap fitur dan tentukan minimum serta tarifnya sendiri.</p></div><span className="live-mini-status">{userId ? 'AKUN' : 'PREVIEW'}</span></div>
    <div className="pricing-safety"><ShieldCheck size={16} /><span>Perubahan harga hanya konfigurasi. QRIS/gateway masih nonaktif; nominal tidak akan memicu pembayaran nyata.</span></div>
    {!userId && <p className="pricing-hint">Mode preview: pengaturan disimpan di browser perangkat ini. Masuk ke akun untuk menyimpan konfigurasi ke Supabase.</p>}
    <div className="pricing-feature-grid">
      <article className="pricing-feature">
        <Toggle label="Saweran standar" checked={config.donation.enabled} onChange={v => update('donation', { enabled: v })} />
        {moneyInput('Minimal sawer', config.donation.min_amount, v => update('donation', { min_amount: v }))}
      </article>
      <article className="pricing-feature">
        <Toggle label="Voice Chat / TTS" checked={config.voice.enabled} onChange={v => update('voice', { enabled: v })} />
        {moneyInput('Minimal sawer voice', config.voice.min_amount, v => update('voice', { min_amount: v }))}
        <label className="pricing-field"><span>Model tarif voice</span><select value={config.voice.pricing_mode} onChange={e => update('voice', { pricing_mode: e.target.value as 'session' | 'minute' })}><option value="session">Per sesi</option><option value="minute">Per menit</option></select></label>
        {config.voice.pricing_mode === 'session' ? moneyInput('Harga per sesi', config.voice.session_price, v => update('voice', { session_price: v }), 0) : moneyInput('Harga per menit', config.voice.price_per_minute, v => update('voice', { price_per_minute: v }), 0)}
        {numberInput('Durasi maksimum', config.voice.max_minutes, v => update('voice', { max_minutes: v }), 'menit', 1, 60)}
      </article>
      <article className="pricing-feature">
        <Toggle label="Media Share" checked={config.media.enabled} onChange={v => update('media', { enabled: v })} />
        {moneyInput('Minimal sawer media', config.media.min_amount, v => update('media', { min_amount: v }))}
        {moneyInput('Tarif per detik', config.media.price_per_second, v => update('media', { price_per_second: v }), 0)}
        {numberInput('Durasi maksimum media', config.media.max_duration_seconds, v => update('media', { max_duration_seconds: v }), 'detik', 5, 600)}
        <small className="pricing-calc">{rupiah(config.media.price_per_second)} per detik • 60 detik = {rupiah(config.media.price_per_second * 60)}</small>
      </article>
      <article className="pricing-feature">
        <Toggle label="Running Text" checked={config.ticker.enabled} onChange={v => update('ticker', { enabled: v })} />
        {moneyInput('Minimal sawer teks', config.ticker.min_amount, v => update('ticker', { min_amount: v }))}
        {numberInput('Lama tampil', config.ticker.display_seconds, v => update('ticker', { display_seconds: v }), 'detik', 3, 120)}
        {numberInput('Batas karakter', config.ticker.max_chars, v => update('ticker', { max_chars: v }), 'karakter', 10, 280)}
      </article>
      <article className="pricing-feature">
        <Toggle label="Subathon" checked={config.subathon.enabled} onChange={v => update('subathon', { enabled: v })} />
        {moneyInput('Minimal sawer subathon', config.subathon.min_amount, v => update('subathon', { min_amount: v }))}
        {numberInput('Tambahan per Rp1.000', config.subathon.minutes_per_1000, v => update('subathon', { minutes_per_1000: v }), 'menit', 0, 60)}
        {numberInput('Batas tambahan per event', config.subathon.max_added_minutes, v => update('subathon', { max_added_minutes: v }), 'menit', 1, 1440)}
        {numberInput('Batas total timer', config.subathon.max_timer_minutes, v => update('subathon', { max_timer_minutes: v }), 'menit', 1, 10080)}
      </article>
      <article className="pricing-feature">
        <Toggle label="Alert sawer" checked={config.alerts.enabled} onChange={v => update('alerts', { enabled: v })} />
        {moneyInput('Minimal untuk alert', config.alerts.min_amount, v => update('alerts', { min_amount: v }))}
      </article>
      <article className="pricing-feature">
        <Toggle label="Target komunitas" checked={config.goals.enabled} onChange={v => update('goals', { enabled: v })} />
        <Toggle label="Polling komunitas" checked={config.polls.enabled} onChange={v => update('polls', { enabled: v })} />
        <Toggle label="Request / Challenge" checked={config.requests.enabled} onChange={v => update('requests', { enabled: v })} />
        {moneyInput('Minimal request', config.requests.min_amount, v => update('requests', { min_amount: v }))}
      </article>
    </div>
    <div className="pricing-footer"><span>{loaded ? (userId ? 'Perubahan per akun' : 'Perubahan lokal preview') : 'Memuat pengaturan…'}</span><button className="button button-primary" type="button" onClick={save} disabled={busy || !loaded}>{busy ? 'Menyimpan…' : <><Save size={15} /> Simpan pengaturan</>}</button></div>
    {feedback && <div className="live-feedback" role="status"><Check size={15} />{feedback}</div>}
  </section>
}
