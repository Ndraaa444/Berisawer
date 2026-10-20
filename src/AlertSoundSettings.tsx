import { useEffect, useState } from 'react'
import { AudioLines, Music2, Upload, Volume2, Sparkles } from 'lucide-react'
import { supabase } from './lib/supabase'

const DEFAULT_TEMPLATE = '{donor_name} mengirim {amount}. Pesan: {message}'
type AlertConfig = { template: string; sound_url: string; sound_name: string; volume: number; tts_enabled: boolean; read_donor_message: boolean; sound_pack: string; language: string; voice_name: string }
function chooseDefaultGoogleVoice(available: SpeechSynthesisVoice[], language: string) {
  const local = available.filter(v => v.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()))
  const google = local.filter(v => /google/i.test(v.name))
  const female = (v: SpeechSynthesisVoice) => /female|woman|perempuan|wanita|wavenet-f|standard-c|studio-o/i.test(v.name)
  return google.find(female) || google[0] || local.find(female) || local[0]
}
function playShine(volume: number) {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const master = ctx.createGain()
    master.gain.value = Math.max(0, Math.min(1, volume / 100)) * 0.42
    master.connect(ctx.destination)
    const now = ctx.currentTime
    // Original procedural crystal-digital motif: three short sine partials with a soft, decaying envelope.
    ;[{ f: 1318.51, at: 0, dur: 0.52 }, { f: 1760, at: 0.085, dur: 0.62 }, { f: 2349.32, at: 0.17, dur: 0.78 }].forEach(({ f, at, dur }) => {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, now + at)
      env.gain.setValueAtTime(0.0001, now + at)
      env.gain.exponentialRampToValueAtTime(0.22, now + at + 0.018)
      env.gain.exponentialRampToValueAtTime(0.0001, now + at + dur)
      osc.connect(env); env.connect(master)
      osc.start(now + at); osc.stop(now + at + dur + 0.02)
    })
    window.setTimeout(() => { void ctx.close() }, 1300)
  } catch { /* Audio preview is optional on unsupported browsers. */ }
}
export default function AlertSoundSettings() {
  const [userId, setUserId] = useState<string | null>(null)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [soundUrl, setSoundUrl] = useState('')
  const [soundName, setSoundName] = useState('')
  const [volume, setVolume] = useState(65)
  const [tts, setTts] = useState(true)
  const [readMessage, setReadMessage] = useState(true)
  const [soundPack, setSoundPack] = useState('shine')
  const [language, setLanguage] = useState('id-ID')
  const [voiceName, setVoiceName] = useState('')
  const [voiceWasSaved, setVoiceWasSaved] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [feedback, setFeedback] = useState('')
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const refresh = () => {
      const available = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()))
      setVoices(available)
      if (!voiceWasSaved && !voiceName) {
        const preferred = chooseDefaultGoogleVoice(available, language)
        if (preferred) setVoiceName(preferred.name)
      }
    }
    refresh()
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [language, voiceName, voiceWasSaved])
  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { setFeedback('Login diperlukan untuk menyimpan alert.'); return }
      setUserId(auth.user.id)
      const { data } = await supabase.from('creator_settings').select('live_tools_config').eq('user_id', auth.user.id).maybeSingle()
      const cfg = data?.live_tools_config?.alerts as Partial<AlertConfig> | undefined
      if (active && cfg) {
        setTemplate(cfg.template || DEFAULT_TEMPLATE); setSoundUrl(cfg.sound_url || ''); setSoundName(cfg.sound_name || '')
        setVolume(Number(cfg.volume ?? 65)); setTts(cfg.tts_enabled !== false); setReadMessage(cfg.read_donor_message !== false)
        setSoundPack(cfg.sound_pack || 'shine'); setLanguage(cfg.language || 'id-ID'); if (cfg.voice_name) { setVoiceName(cfg.voice_name); setVoiceWasSaved(true) }
      }
    }
    void load()
    return () => { active = false }
  }, [])
  async function save(patch: Record<string, unknown> = {}) {
    if (!supabase || !userId) { setFeedback('Login kreator diperlukan.'); return }
    const { data, error: readError } = await supabase.from('creator_settings').select('live_tools_config').eq('user_id', userId).maybeSingle()
    if (readError) { setFeedback('Gagal membaca pengaturan.'); return }
    const current = data?.live_tools_config && typeof data.live_tools_config === 'object' ? data.live_tools_config : {}
    const alerts = { ...(current.alerts || {}), template, sound_url: soundUrl, sound_name: soundName, volume, tts_enabled: tts, read_donor_message: readMessage, sound_pack: soundPack, language, voice_name: voiceName, ...patch }
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
    const text = template.replaceAll('{donor_name}', 'Andi').replaceAll('{amount}', 'Rp10.000').replaceAll('{message}', readMessage ? 'Semangat streaming!' : '')
    if (!('speechSynthesis' in window)) { setFeedback('TTS tidak tersedia di browser ini.'); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language; utterance.volume = volume / 100
    const selected = voices.find(v => v.name === voiceName) || chooseDefaultGoogleVoice(voices, language)
    if (selected) utterance.voice = selected
    window.speechSynthesis.speak(utterance)
  }
  return <section className="panel live-config-panel">
    <div className="panel-heading"><div><h2><Volume2 size={17} /> Audio Alert Berisawer</h2><p>Suara bawaan Google/perangkat; default perempuan jika tersedia</p></div></div>
    <div className="live-sound-meta"><Sparkles size={18} /><div><strong>Berisawer Shine</strong><small>Bunyi kristal digital lembut, disintesis langsung oleh Berisawer — bukan salinan audio platform lain.</small></div></div>
    <div className="live-field-footer"><button className="button button-secondary" onClick={() => playShine(volume)}><AudioLines size={15} /> Dengarkan Shine</button><button className="button button-secondary" onClick={() => void save({ sound_pack: 'shine' })}>Pakai Shine</button></div>
    <label className="field-label" htmlFor="alert-language">BAHASA TTS</label>
    <select id="alert-language" className="live-select" value={language} onChange={e => { const next = e.target.value; setLanguage(next); setVoiceName(''); setVoiceWasSaved(false); const preferred = chooseDefaultGoogleVoice(window.speechSynthesis?.getVoices() || [], next); if (preferred) setVoiceName(preferred.name); void save({ language: next, voice_name: preferred?.name || '' }) }}><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English (US)</option></select>
    <label className="field-label" htmlFor="alert-voice">SUARA BAWAAN PERANGKAT</label>
    <select id="alert-voice" className="live-select" value={voiceName} onChange={e => { setVoiceName(e.target.value); setVoiceWasSaved(true); void save({ voice_name: e.target.value }) }}><option value="">Otomatis — Google jika tersedia</option>{voices.map(v => <option key={v.name} value={v.name}>{v.name} · {v.lang}{/google/i.test(v.name) ? ' · Google' : ''}</option>)}</select>
    <p className="field-help">Berisawer tidak membuat suara AI sendiri. Pilihan suara diambil dari mesin TTS perangkat/browser. Sistem memprioritaskan suara Google dan nama suara yang menandakan perempuan jika tersedia. Browser tidak selalu memberikan informasi gender, jadi suara perempuan tidak dapat dijamin pada semua perangkat.</p>
    <label className="live-check-row"><input type="checkbox" checked={tts} onChange={e => { setTts(e.target.checked); void save({ tts_enabled: e.target.checked }) }} /><span><strong>Bacakan alert dengan TTS</strong><small>Pembacaan satu per satu melalui antrean.</small></span></label>
    <label className="live-check-row"><input type="checkbox" checked={readMessage} onChange={e => { setReadMessage(e.target.checked); void save({ read_donor_message: e.target.checked }) }} /><span><strong>Bacakan pesan supporter</strong><small>Pesan harus melewati moderasi terlebih dahulu.</small></span></label>
    <label className="field-label" htmlFor="alert-template">POLA TEKS</label>
    <textarea id="alert-template" className="live-textarea" maxLength={240} value={template} onChange={e => setTemplate(e.target.value)} />
    <p className="field-help">Variabel: <code>{'{donor_name}'}</code>, <code>{'{amount}'}</code>, <code>{'{message}'}</code>.</p>
    <div className="live-field-footer"><button className="button button-secondary" onClick={previewTts}><AudioLines size={15} /> Tes pembacaan</button><button className="button button-primary" onClick={() => void save({ template })}>Simpan pola</button></div>
    <div className="live-sound-upload"><div className="live-sound-meta"><Music2 size={18} /><div><strong>{soundName || 'Sound pack Berisawer Shine aktif'}</strong><small>Opsional: MP3/WAV/OGG/MP4/WebM audio · maksimal 5 MB</small></div></div>
    <label className="button button-secondary"><Upload size={15} /> Upload suara sendiri<input type="file" accept=".mp3,.wav,.ogg,.m4a,.webm" hidden disabled={!userId} onChange={e => { void upload(e.target.files?.[0]); e.currentTarget.value = '' }} /></label>
    {soundUrl && <button className="button button-secondary" onClick={() => { const a = new Audio(soundUrl); a.volume = volume / 100; void a.play() }}>Preview suara upload</button>}
    <label className="field-label" htmlFor="alert-volume">VOLUME · {volume}%</label><input id="alert-volume" type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} onMouseUp={() => void save({ volume })} onTouchEnd={() => void save({ volume })} /></div>
    {feedback && <p className="field-help" role="status">{feedback}</p>}
    <p className="field-help">Pengaturan tersimpan per akun. Pemutaran otomatis saat event donasi terverifikasi tetap menunggu sambungan event produksi; pembayaran masih dinonaktifkan.</p>
  </section>
}