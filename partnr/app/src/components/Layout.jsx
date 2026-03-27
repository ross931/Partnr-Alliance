import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const nav = [
  {path:'/dashboard',label:'Dashboard',icon:'⬡'},
  {path:'/partners',label:'Partners',icon:'🏢'},
  {path:'/programs',label:'Programs',icon:'📋'},
  {path:'/activities',label:'Activities',icon:'⚡'},
  {path:'/snapshot',label:'Snapshot',icon:'✦'},
]

export default function Layout({children}) {
  const loc = useLocation()
  const {session} = useAuth()
  const [col, setCol] = useState(false)
  return (
    <div style={s.shell}>
      <aside style={{...s.sb, width:col?58:210}}>
        <div style={s.top}>
          <Link to="/dashboard" style={{...s.logo, justifyContent:col?'center':'flex-start'}}>
            {col ? <em style={{fontFamily:'var(--serif)',color:'#d4891a',fontSize:'1.3rem'}}>P</em>
                 : <span style={{fontFamily:'var(--serif)',fontSize:'1.15rem',letterSpacing:'-.02em',color:'var(--tx)'}}>Part<em style={{color:'#d4891a',fontStyle:'italic'}}>n</em>r</span>}
          </Link>
          <nav style={{display:'flex',flexDirection:'column',gap:'2px'}}>
            {nav.map(item => (
              <Link key={item.path} to={item.path} title={col?item.label:''}
                style={{...s.ni,...(loc.pathname===item.path?s.on:{}),justifyContent:col?'center':'flex-start',padding:col?'.5rem':'.48rem .75rem'}}>
                <span style={{fontSize:'1rem',flexShrink:0,width:20,textAlign:'center'}}>{item.icon}</span>
                {!col&&<span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>
        <div style={s.bot}>
          {!col&&<Link to="/billing" style={s.upcta}><div style={{fontSize:'.72rem',fontWeight:500,color:'#080b0f'}}>⚡ Upgrade plan</div><div style={{fontSize:'.62rem',color:'rgba(8,11,15,.6)',marginTop:'.1rem'}}>Unlock AI features</div></Link>}
          {!col&&session&&<div style={s.user}><div style={s.av}>{session.user.email?.[0]?.toUpperCase()}</div><div style={s.em}>{session.user.email}</div></div>}
          <div style={{display:'flex',gap:'.3rem'}}>
            {!col&&<Link to="/settings" style={{...s.iconbtn,flex:1}} title="Settings">⚙ Settings</Link>}
            <button style={s.iconbtn} onClick={()=>supabase.auth.signOut()} title="Sign out">↩</button>
          </div>
          <button style={s.cl} onClick={()=>setCol(!col)}>{col?'›':'‹'}</button>
        </div>
      </aside>
      <main style={s.main}>{children}</main>
    </div>
  )
}

const s = {
  shell:{display:'flex',height:'100vh',overflow:'hidden'},
  sb:{background:'var(--bg2)',borderRight:'1px solid var(--brd)',display:'flex',flexDirection:'column',justifyContent:'space-between',flexShrink:0,transition:'width .2s ease',overflow:'hidden'},
  top:{display:'flex',flexDirection:'column',padding:'.75rem .625rem',gap:'1.25rem'},
  logo:{display:'flex',alignItems:'center',textDecoration:'none',padding:'.25rem .125rem'},
  ni:{display:'flex',alignItems:'center',gap:'.55rem',color:'var(--mu)',textDecoration:'none',borderRadius:'var(--radius)',fontSize:'.82rem',transition:'all .15s'},
  on:{background:'rgba(212,137,26,.1)',color:'var(--amberhi)'},
  bot:{padding:'.625rem',display:'flex',flexDirection:'column',gap:'.35rem'},
  upcta:{display:'block',background:'var(--amber)',borderRadius:'var(--radius)',padding:'.55rem .75rem',textDecoration:'none',marginBottom:'.2rem'},
  user:{display:'flex',alignItems:'center',gap:'.5rem',padding:'.35rem .25rem'},
  av:{width:26,height:26,background:'rgba(212,137,26,.2)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.72rem',color:'var(--amberhi)',fontWeight:'500',flexShrink:0},
  em:{fontSize:'.68rem',color:'var(--mu2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},
  iconbtn:{background:'transparent',border:'1px solid var(--brd)',color:'var(--mu2)',fontSize:'.72rem',cursor:'pointer',padding:'.32rem .5rem',borderRadius:'var(--radius)',width:'100%',fontFamily:'var(--sans)',transition:'color .15s',textDecoration:'none',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'},
  cl:{background:'transparent',border:'1px solid var(--brd)',color:'var(--mu2)',fontSize:'.875rem',padding:'.3rem',borderRadius:'var(--radius)',cursor:'pointer',width:'100%',marginTop:'.1rem'},
  main:{flex:1,overflow:'auto',background:'var(--bg)'},
}
