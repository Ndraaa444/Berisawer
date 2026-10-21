import { useEffect, useState } from 'react'
import { Heart, Sparkles, ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'

type Creator = { handle: string; display_name: string; bio: string | null; avatar_url: string | null; is_public: boolean }

export default function PublicCreator() {
  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const handle = typeof window !== 'undefined' ? decodeURIComponent(window.location.pathname.split('/').filter(Boolean).at(-1) ?? '').toLowerCase() : ''

  useEffect(() => {
    let alive = true
    async function load() {
      if (!supabase) { setError('Halaman kreator belum tersedia karena backend belum dikonfigurasi.'); setLoading(false); return }
      if (!/^[a-z0-9_]{3,30}$/.test(handle)) { setError('Alamat kreator tidak valid.'); setLoading(false); return }
      const { data, error: queryError } = await supabase.from('creator_profiles').select('handle,display_name,bio,avatar_url,is_public').eq('handle', handle).eq('is_public', true).maybeSingle()
      if (!alive) return
      if (queryError) setError('Profil gagal dimuat. Coba lagi beberapa saat lagi.')
      else if (!data) setError('Kreator tidak ditemukan atau halaman ini sedang privat.')
      else setCreator(data as Creator)
      setLoading(false)
    }
    void load()
    return () => { alive = false }
  }, [handle])

  return <main style={{minHeight:'100vh',padding:'32px 18px',display:'grid',placeItems:'center',background:'radial-gradient(ellipse at 50% 0%,rgba(91,70,173,.22),transparent 55%),#080b14',color:'#e8eaf3',fontFamily:'DM Sans, sans-serif'}}>
    <section style={{width:'100%',maxWidth:620,border:'1px solid #242b3e',borderRadius:24,background:'#101522',padding:'36px 28px',textAlign:'center',boxShadow:'0 24px 80px #0005'}}>
      <div style={{display:'inline-flex',alignItems:'center',gap:9,fontWeight:700,fontSize:20,marginBottom:28}}><Sparkles size={22} color="#9a7cff"/> bagi<span style={{color:'#9a7cff'}}>sawer</span></div>
      {loading ? <p role="status">Memuat halaman kreator…</p> : error ? <><h1 style={{fontSize:25}}>Halaman belum tersedia</h1><p style={{color:'#a0a8bf',lineHeight:1.7}}>{error}</p></> : creator ? <>
        <div style={{width:88,height:88,borderRadius:'50%',margin:'0 auto 18px',display:'grid',placeItems:'center',overflow:'hidden',background:'#24203b',border:'1px solid #51427b'}}>{creator.avatar_url ? <img src={creator.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:34,fontWeight:700,color:'#c9baff'}}>{creator.display_name.slice(0,1).toUpperCase()}</span>}</div>
        <h1 style={{fontSize:32,margin:'0 0 8px'}}>{creator.display_name}</h1><p style={{color:'#9a7cff',margin:'0 0 20px'}}>@{creator.handle}</p>
        {creator.bio && <p style={{maxWidth:460,margin:'0 auto 24px',color:'#b6bdd0',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{creator.bio}</p>}
        <div style={{border:'1px solid #3b3155',background:'#171329',borderRadius:16,padding:18,textAlign:'left',display:'flex',gap:12,alignItems:'flex-start'}}><ShieldCheck size={20} color="#9a7cff"/><div><strong>Dukungan belum tersedia</strong><p style={{margin:'6px 0 0',color:'#b6bdd0',fontSize:14,lineHeight:1.7}}>Halaman ini masih dalam beta. Tombol sawer dan pembayaran belum diaktifkan sampai verifikasi merchant selesai.</p></div></div>
      </> : null}
      <footer style={{marginTop:30,borderTop:'1px solid #242b3e',paddingTop:20,color:'#737d96',fontSize:13,display:'flex',justifyContent:'center',alignItems:'center',gap:7}}><Heart size={14}/> Dibangun dengan Bagisawer · Beta</footer>
    </section>
  </main>
}
