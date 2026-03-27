import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const STAGE_STEPS = ['Initiated','Requirements','In Progress','Launched','Benefit Realized']
const stageProgress = (stage) => ((STAGE_STEPS.indexOf(stage) + 1) / STAGE_STEPS.length) * 100

export default function Dashboard() {
  const { session } = useAuth()
  const [stats, setStats] = useState({ partners:0, programs:0, activities:0, inProgress:0 })
  const [recentPrograms, setRecentPrograms] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const uid = session.user.id
    const [pRes, pgRes, acRes] = await Promise.all([
      supabase.from('partners').select('id', { count: 'exact' }).eq('user_id', uid),
      supabase.from('programs').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('activities').select('*, partners(name), programs(name)').eq('user_id', uid).order('date', { ascending: false }).limit(8),
    ])

    const programs = pgRes.data || []
    const inProgress = programs.filter(p => p.stage === 'In Progress').length

    setStats({ partners: pRes.count || 0, programs: programs.length, activities: acRes.data?.length || 0, inProgress })
    setRecentPrograms(programs.slice(0, 5))
    setRecentActivities(acRes.data || [])
    setLoading(false)
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  const dimCounts = {
    Build: recentPrograms.filter(p => p.dimension === 'Build').length,
    Market: recentPrograms.filter(p => p.dimension === 'Market').length,
    Sell: recentPrograms.filter(p => p.dimension === 'Sell').length,
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Dashboard</h1>
          <p style={s.sub}>Overview of your partnership programs</p>
        </div>
        <div style={{display:'flex',gap:'.75rem'}}>
          <Link to="/programs" style={{...s.addBtn, textDecoration:'none', display:'flex', alignItems:'center', gap:'.4rem'}}>
            <span>+</span> New program
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        <KPICard label="Total Partners" value={stats.partners} note="active in Partnr" link="/partners" />
        <KPICard label="Programs" value={stats.programs} note="tracked" link="/programs" />
        <KPICard label="In Progress" value={stats.inProgress} note="programs active now" accent />
        <KPICard label="Activities (recent)" value={stats.activities} note="logged this session" link="/activities" />
      </div>

      {/* Build / Market / Sell */}
      <div style={s.dimRow}>
        {['Build','Market','Sell'].map(dim => (
          <div key={dim} style={s.dimCard}>
            <div style={s.dimLabel}>{dim}</div>
            <div style={s.dimCount}>{dimCounts[dim]}</div>
            <div style={s.dimSub}>programs</div>
          </div>
        ))}
      </div>

      <div style={s.two}>
        {/* Recent Programs */}
        <div>
          <div style={s.sectionHead}>
            <h2 style={s.sectionTitle}>Recent Programs</h2>
            <Link to="/programs" style={s.viewAll}>View all →</Link>
          </div>
          {recentPrograms.length === 0 ? (
            <EmptyState icon="📋" text="No programs yet. Add your first partner program to get started." action={{ label: 'Add program', to: '/programs' }} />
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
              {recentPrograms.map(p => (
                <ProgramRow key={p.id} program={p} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div>
          <div style={s.sectionHead}>
            <h2 style={s.sectionTitle}>Recent Activities</h2>
            <Link to="/activities" style={s.viewAll}>View all →</Link>
          </div>
          {recentActivities.length === 0 ? (
            <EmptyState icon="⚡" text="No activities logged yet." />
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'.6rem'}}>
              {recentActivities.map(a => (
                <ActivityRow key={a.id} activity={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, note, accent, link }) {
  const inner = (
    <div style={{...s.kpi, ...(accent ? s.kpiAccent : {})}}>
      <div style={s.kpiValue}>{value}</div>
      <div style={s.kpiLabel}>{label}</div>
      <div style={s.kpiNote}>{note}</div>
    </div>
  )
  return link ? <Link to={link} style={{textDecoration:'none'}}>{inner}</Link> : inner
}

function ProgramRow({ program }) {
  const pct = stageProgress(program.stage)
  return (
    <div style={s.progRow}>
      <div style={{flex:1,minWidth:0}}>
        <div style={s.progName}>{program.name}</div>
        <div style={{display:'flex',alignItems:'center',gap:'.6rem',marginTop:'.4rem'}}>
          <span className={`badge badge-${program.dimension?.toLowerCase()}`}>{program.dimension}</span>
          <span style={{fontSize:'.75rem',color:'var(--mu)'}}>{program.stage}</span>
        </div>
      </div>
      <div style={{width:80,flexShrink:0}}>
        <div style={{fontSize:'.72rem',color:'var(--mu)',textAlign:'right',marginBottom:'.3rem'}}>{Math.round(pct)}%</div>
        <div className="stage-bar"><div className="stage-bar-fill" style={{width:pct+'%'}} /></div>
      </div>
    </div>
  )
}

function ActivityRow({ activity }) {
  return (
    <div style={s.actRow}>
      <div style={s.actType}>{activity.type?.split(' ')[0]}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={s.actName}>{activity.outcome || activity.type}</div>
        <div style={s.actMeta}>{activity.programs?.name} · {activity.date}</div>
      </div>
    </div>
  )
}

function EmptyState({ icon, text, action }) {
  return (
    <div className="card" style={{textAlign:'center',padding:'2rem'}}>
      <div style={{fontSize:'1.5rem',marginBottom:'.5rem',opacity:.4}}>{icon}</div>
      <p style={{color:'var(--mu)',fontSize:'.85rem',marginBottom: action ? '1rem' : 0}}>{text}</p>
      {action && <Link to={action.to} style={{color:'var(--amber)',fontSize:'.82rem',textDecoration:'none'}}>{action.label} →</Link>}
    </div>
  )
}

const s = {
  page: {padding:'2rem',maxWidth:1080,margin:'0 auto'},
  header: {display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem'},
  title: {fontFamily:'var(--serif)',fontSize:'1.8rem',letterSpacing:'-.025em'},
  sub: {color:'var(--mu)',fontSize:'.875rem',marginTop:'.2rem'},
  addBtn: {background:'var(--amber)',color:'#080b0f',fontWeight:500,padding:'.5rem 1rem',borderRadius:'var(--radius)',fontSize:'.875rem',border:'none',cursor:'pointer'},
  kpiGrid: {display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'1rem',marginBottom:'1.5rem'},
  kpi: {background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius-lg)',padding:'1.25rem',transition:'border-color .2s'},
  kpiAccent: {borderColor:'rgba(212,137,26,.25)',background:'linear-gradient(135deg,var(--bg2),rgba(212,137,26,.04))'},
  kpiValue: {fontFamily:'var(--serif)',fontSize:'2.2rem',lineHeight:1,marginBottom:'.3rem'},
  kpiLabel: {fontSize:'.78rem',fontWeight:500,color:'var(--tx)',marginBottom:'.15rem'},
  kpiNote: {fontSize:'.72rem',color:'var(--mu2)'},
  dimRow: {display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',marginBottom:'2rem'},
  dimCard: {background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius-lg)',padding:'1rem 1.25rem',display:'flex',alignItems:'center',gap:'1rem'},
  dimLabel: {fontSize:'.75rem',fontWeight:500,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--mu)',minWidth:50},
  dimCount: {fontFamily:'var(--serif)',fontSize:'1.5rem',lineHeight:1,flex:1},
  dimSub: {fontSize:'.72rem',color:'var(--mu2)'},
  two: {display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2rem'},
  sectionHead: {display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'},
  sectionTitle: {fontSize:'.9rem',fontWeight:500,color:'var(--tx)'},
  viewAll: {fontSize:'.78rem',color:'var(--amber)',textDecoration:'none'},
  progRow: {display:'flex',alignItems:'center',gap:'1rem',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius)',padding:'.875rem 1rem'},
  progName: {fontSize:'.875rem',fontWeight:400,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  actRow: {display:'flex',alignItems:'center',gap:.75+'rem',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius)',padding:'.625rem .875rem'},
  actType: {width:70,flexShrink:0,fontSize:'.7rem',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--amber)',backgroundColor:'var(--amblo)',padding:'.15rem .4rem',borderRadius:4,textAlign:'center',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  actName: {fontSize:'.82rem',color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  actMeta: {fontSize:'.72rem',color:'var(--mu2)',marginTop:'.15rem'},
}
