import { useEffect, useState } from 'react'
import { AudioLines, Music2, Upload, Volume2 } from 'lucide-react'
import { supabase } from './lib/supabase'

const DEFAULT_TEMPLATE = '{donor_name} mengirim {amount}. Pesan: {message}'
export default function AlertSoundSettings() {
  const [userId, setUserId] = useState<string | null>(null)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [soundUrl, setSoundUrl] = useState('')
  const [soundName, setSoundName] = useState('')
  const [volume, setVolume] = useState(70)
  const [tts, setTts] = useState(true)
  const [readMessage, setReadMessage] = useState(true)
  const [feedback, setFeedback] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { setFeedback('Login diperlukan untuk menyimpan alert.'); return }
      setUserId(auth.user.id)
      const { data } = await supabase.from('creator_settings').select('live_tools_config').eq('user_id', auth.user.id).maybeSingle()
      const cfg = data?.live_tools_config?.alerts
      if (active && cfg) {
        setTemplate(cfg.template || DEFAULT_TEMPLATE)
        setSoundUrl(cfg.sound_url || '')
        setSoundName(cfg.sound_name || '')
        setVolume(Number(cfg.volume ?? 70))
        setTts(cfg.tts_enabled !== false)
        setReadMessage(cfg.read_donor_message !== false)
      }
    }
    void load()
    return () => { active = false }
  }, [])
  async function save(patch: Record<string, unknown>) {
    if (!supabase || !userId) { setFeedback('Login kreator diperlukan.'); return }
    const { data, error: readError } = await supabase.from('creator_settings').select('live_tools_config').eq('user_id', userId).maybeSingle()
    if (readError) { setFeedback('Gagal membaca pengaturan.'); return }
    const current = data?.live_tools_config && typeof data.live_tools_config === 'object' ? data.live_tools_config : {}
    const alerts = { ...(current.alerts || {}), template, sound_url: soundUrl, sound_name: soundName, volume, tts_enabled: tts, read_donor_message: readMessage, ...patch }
    const { error } = await supabase.from('creator_settings').upsert({ user_id: userId, live_tools_config: { ...current, alerts } }, { onConflict: 'user_id' })
    setFeedback(error ? 'Gagal menyimpan pengaturan alert.' : 'Pengaturan alert tersimpan.')
  }
  async function upload(file?: File) {
    if (!file || !supabase || !userId) return
    const types = ['audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/webm']
    if (!types.includes(file.type) || file.size > 5 * 1024 * 1024) { setFeedback('Gunakan MP3/WAV/OGG/MP4/WebM audio, maksimal 5 MB.'); return }
    const path = userId + '/' + crypto.randomUUID() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const { error } = await supabase.storage.from('creator-alert-sounds').upload(path, file, { contentType: file.type })
    if (error) { setFeedback('Upload gagal. Periksa izin Storage.'); return }
    const { data } = supabase.storage.from('creator-alert-sounds').getPublicUrl(path)
    setSoundUrl(data.publicUrl); setSoundName(file.name)
    await save({ sound_url: data.publicUrl, sound_name: file.name, sound_path: path })
  }
  function previewTts() {
    const text = template.replaceAll('{donor_name}', 'Andi').replaceAll('{amount}', 'Rp10.000').replaceAll('{message}', 'Semangat streaming!')
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)) }
  }
  return <section className="panel live-config-panel">
    <div className="panel-heading"><div><h2><Volume2 size={17} /> Alert Sound & Pola TTS</h2><p>Upload suara dan atur pola pembacaan donasi</p></div></div>
    <label className="live-check-row"><input type="checkbox" checked={tts} onChange={e => { setTts(e.target.checked); void save({ tts_enabled: e.target.checked }) }} /><span><strong>Bacakan alert dengan TTS</strong><small>Pesan akan dibacakan satu per satu melalui antrean.</small></span></label>
    <label className="live-check-row"><input type="checkbox" checked={readMessage} onChange={e => { setReadMessage(e.target.checked); void save({ read_donor_message: e.target.checked }) }} /><span><strong>Bacakan pesan supporter</strong><small>Pesan wajib melewati moderasi terlebih dahulu.</small></span></label>
    <label className="field-label" htmlFor="alert-template">POLA TEKS</label>
    <textarea id="alert-template" className="live-textarea" maxLength={240} value={template} onChange={e => setTemplate(e.target.value)} />
    <p className="field-help">Variabel yang tersedia: <code>{'{donor_name}'}</code>, <code>{'{amount}'}</code>, <code>{'{message}'}</code>.</p>
    <div className="live-field-footer"><button className="button button-secondary" onClick={previewTts}><AudioLines size={15} /> Tes pembacaan</button><button className="button button-primary" onClick={() => void save({ template })}>Simpan pola</button></div>
    <div className="live-sound-upload"><div className="live-sound-meta"><Music2 size={18} /><div><strong>{soundName || 'Belum ada sound effect'}</strong><small>MP3, WAV, OGG, MP4/WebM audio · maksimal 5 MB</small></div></div>
    <label className="button button-secondary"><Upload size={15} /> Upload sound effect<input type="file" accept=".mp3,.wav,.ogg,.m4a,.webm" hidden disabled={!userId} onChange={e => { void upload(e.target.files?.[0]); e.currentTarget.value = '' }} /></label>
    {soundUrl && <button className="button button-secondary" onClick={() => { const a = new Audio(soundUrl); a.volume = volume / 100; void a.play() }}>Preview suara</button>}
    <label className="field-label" htmlFor="alert-volume">VOLUME · {volume}%</label><input id="alert-volume" type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} onMouseUp={() => void save({ volume })} onTouchEnd={() => void save({ volume })} /></div>
    {feedback && <p className="field-help" role="status">{feedback}</p>}
    <p className="field-help">Upload dan pengaturan disiapkan; pemutaran otomatis di alert donasi produksi perlu dihubungkan ke event pembayaran terverifikasi.</p>
  </section>
}
