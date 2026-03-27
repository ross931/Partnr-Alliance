// src/pages/Snapshot.jsx
// ─────────────────────────────────────────────────────
// The stickiness driver. Auto-generates a weekly leadership
// snapshot from Partnr activity data using the Anthropic API.
// ─────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const WEEKS = ['This week', 'Last week', '2 weeks ago', '3 weeks ago']

function getDateRange(weekOffset = 0) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) - weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { from: monday, to: sunday }
}

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Snapshot() {
  const { session } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [activities, setActivities] = useState([])
  const [programs, setPrograms] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const { from, to } = getDateRange(weekOffset)

  useEffect(() => { fetchData() }, [weekOffset])

  async function fetchData() {
    setLoading(true)
    setReport(null)
    const uid = session.user.id
    const fromStr = from.toISOString().split('T')[0]
    const toStr = to.toISOString().split('T')[0]

    const [aRes, pgRes, pRes] = await Promise.all([
      supabase.from('activities')
        .select('*, programs(name,dimension,type,stage), partners(name,cloud)')
        .eq('user_id', uid)
        .gte('date', fromStr)
        .lte('date', toStr)
        .order('date', { ascending: false }),
      supabase.from('programs')
        .select('*, partners(name)')
        .eq('user_id', uid),
      supabase.from('partners')
        .select('*')
        .eq('user_id', uid),
    ])
    setActivities(aRes.data || [])
    setPrograms(pgRes.data || [])
    setPartners(pRes.data || [])
    setLoading(false)
  }

  async function generateReport() {
    if (activities.length === 0) return
    setGenerating(true)
    setError('')
    setReport(null)

    // Build context for the AI
    const actSummary = activities.map(a =>
      `- [${a.date}] ${a.type}: ${a.outcome || a.type} (Program: ${a.programs?.name || 'N/A'}, Dimension: ${a.programs?.dimension || 'N/A'}, Partner: ${a.partners?.name || 'N/A'})`
    ).join('\n')

    const inProgress = programs.filter(p => p.stage === 'In Progress')
    const launched = programs.filter(p => p.stage === 'Launched' || p.stage === 'Benefit Realized')
    const progSummary = inProgress.map(p =>
      `- ${p.name} (${p.type}, ${p.dimension}, partner: ${p.partners?.name || 'N/A'})`
    ).join('\n')

    const totalValue = programs
      .filter(p => p.value_usd)
      .reduce((s, p) => s + Number(p.value_usd), 0)

    const prompt = `You are an alliance manager at a Series B SaaS company. Generate a concise, professional weekly partnership update for leadership (CRO/CEO level). 

Week: ${fmtDate(from)} – ${fmtDate(to)}

ACTIVITIES THIS WEEK (${activities.length} total):
${actSummary || 'No activities logged.'}

PROGRAMS IN PROGRESS:
${progSummary || 'None.'}

TOTAL PARTNERS: ${partners.length}
PROGRAMS LAUNCHED/REALIZED: ${launched.length}
TOTAL PIPELINE VALUE TRACKED: $${totalValue.toLocaleString()}

Write the weekly snapshot report. Format it exactly like this:

## Partnership Update — [Week dates]

**TL;DR:** [One sentence of the single most important thing that happened]

### What moved forward
[3-5 bullet points of specific achievements — certifications completed, content published, deals registered, credits secured, meetings with outcomes. Be specific. Include names, numbers, percentages where available.]

### Programs status
[2-4 bullet points on where key programs stand — what stage they're in, what's blocking, what's next]

### Build · Market · Sell breakdown
Build: [1 sentence on technical/certification progress]
Market: [1 sentence on content/co-marketing progress]  
Sell: [1 sentence on pipeline/deal progress]

### Next week's priorities
[2-3 bullet points of the most important things to accomplish]

Keep it tight — under 350 words total. Write in first person ("We completed..."). Make leadership feel the function is making real progress. Don't pad with fluff.`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      if (data.content?.[0]?.text) {
        setReport(data.content[0].text)
      } else if (data.error) {
        throw new Error(data.error.message || 'API error')
      } else {
        throw new Error('Unexpected response from API')
      }
    } catch (err) {
      setError(err.message || 'Failed to generate report. Check your API connection.')
    } finally {
      setGenerating(false)
    }
  }

  async function copyReport() {
    if (!report) return
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exportMarkdown() {
    if (!report) return
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `partnr-snapshot-${from.toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Group activities by dimension
  const byDim = { Build: [], Market: [], Sell: [], Other: [] }
  activities.forEach(a => {
    const dim = a.programs?.dimension || 'Other'
    ;(byDim[dim] || byDim.Other).push(a)
  })

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Weekly Snapshot</h1>
          <p style={s.sub}>Auto-generated partnership update for leadership</p>
        </div>
        <div style={s.weekPicker}>
          {WEEKS.map((label, i) => (
            <button
              key={i}
              style={{...s.weekBtn, ...(weekOffset === i ? s.weekOn : {})}}
              onClick={() => setWeekOffset(i)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={s.dateRange}>
        <span style={s.dateLabel}>
          {fmtDate(from)} – {fmtDate(to)}
        </span>
        <span style={s.actCount}>
          {loading ? '…' : activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} logged
        </span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div style={s.body}>
          {/* Left: raw data preview */}
          <div style={s.left}>
            <div style={s.panelHead}>Activity data this week</div>

            {activities.length === 0 ? (
              <div style={s.emptyActs}>
                <div style={{fontSize:'1.5rem',marginBottom:'.5rem',opacity:.3}}>📭</div>
                <p>No activities logged {weekOffset === 0 ? 'this week' : WEEKS[weekOffset].toLowerCase()}.</p>
                <p style={{marginTop:'.4rem',fontSize:'.78rem'}}>Log activities in the Activities tab to generate a report.</p>
              </div>
            ) : (
              <>
                {/* Dim breakdown pills */}
                <div style={s.dimRow}>
                  {Object.entries(byDim).filter(([,v]) => v.length > 0).map(([dim, acts]) => (
                    <div key={dim} style={s.dimPill(dim)}>
                      <span style={{fontWeight:500}}>{dim}</span>
                      <span style={{opacity:.7}}>{acts.length}</span>
                    </div>
                  ))}
                </div>

                {/* Activity list */}
                <div style={s.actList}>
                  {activities.map(a => (
                    <div key={a.id} style={s.actRow}>
                      <div style={s.actDate}>{a.date}</div>
                      <div style={s.actBody}>
                        <div style={s.actType}>{a.type}</div>
                        <div style={s.actOut}>{a.outcome || '—'}</div>
                        {a.programs?.name && (
                          <div style={s.actMeta}>
                            <span style={s.dimDot(a.programs?.dimension)}>●</span>
                            {a.programs.name}
                            {a.partners?.name && ` · ${a.partners.name}`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Generate button */}
            <button
              style={{
                ...s.genBtn,
                ...(generating || activities.length === 0 ? s.genBtnDisabled : {}),
              }}
              onClick={generateReport}
              disabled={generating || activities.length === 0}
            >
              {generating ? (
                <><span style={s.genSpinner} />Generating report…</>
              ) : (
                <>✦ Generate AI snapshot</>
              )}
            </button>
            {activities.length === 0 && (
              <p style={{fontSize:'.72rem',color:'var(--mu2)',textAlign:'center',marginTop:'.4rem'}}>
                Log at least one activity to generate a report
              </p>
            )}
          </div>

          {/* Right: generated report */}
          <div style={s.right}>
            <div style={s.panelHead}>
              Generated report
              {report && (
                <div style={{display:'flex',gap:'.5rem'}}>
                  <button style={s.smallBtn} onClick={copyReport}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                  <button style={s.smallBtn} onClick={exportMarkdown}>
                    ↓ .md
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="error-msg" style={{margin:0}}>{error}</div>
            )}

            {!report && !generating && !error && (
              <div style={s.reportEmpty}>
                <div style={{fontSize:'2rem',marginBottom:'1rem',opacity:.25}}>✦</div>
                <p style={{color:'var(--mu)',fontSize:'.875rem',textAlign:'center',maxWidth:'28ch',lineHeight:1.6}}>
                  Click "Generate AI snapshot" to create this week's leadership update from your activity data.
                </p>
                <div style={s.previewBox}>
                  <div style={s.previewLine}><div style={{...s.pl, width:'60%'}} /></div>
                  <div style={s.previewLine}><div style={{...s.pl, width:'90%'}} /></div>
                  <div style={s.previewLine}><div style={{...s.pl, width:'75%'}} /></div>
                  <div style={{...s.previewLine, marginTop:'.75rem'}}><div style={{...s.pl, width:'45%',height:2,background:'var(--brdh)'}} /></div>
                  <div style={s.previewLine}><div style={{...s.pl, width:'85%'}} /></div>
                  <div style={s.previewLine}><div style={{...s.pl, width:'70%'}} /></div>
                </div>
              </div>
            )}

            {generating && (
              <div style={s.reportEmpty}>
                <div style={s.genSpinner2} />
                <p style={{color:'var(--mu)',fontSize:'.875rem',marginTop:'1rem'}}>
                  Writing your partnership update…
                </p>
              </div>
            )}

            {report && (
              <div style={s.reportContent}>
                <ReportRenderer text={report} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Renders the markdown report as styled HTML
function ReportRenderer({ text }) {
  const lines = text.split('\n')
  const elements = []
  let key = 0

  for (const line of lines) {
    if (!line.trim()) {
      elements.push(<div key={key++} style={{height:'.5rem'}} />)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} style={r.h2}>{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} style={r.h3}>{line.slice(4)}</h3>)
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={key++} style={r.bold}>{line.slice(2, -2)}</p>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} style={r.li}>
          <span style={r.liDot}>→</span>
          <span dangerouslySetInnerHTML={{__html: renderInline(line.slice(2))}} />
        </div>
      )
    } else if (line.match(/^(Build|Market|Sell):/)) {
      const [label, ...rest] = line.split(': ')
      const dimColor = label === 'Build' ? '#4ecece' : label === 'Market' ? '#d88ad8' : '#d4891a'
      elements.push(
        <div key={key++} style={r.dimLine}>
          <span style={{...r.dimLabel, color: dimColor}}>{label}</span>
          <span style={{color:'var(--mu)'}}>{rest.join(': ')}</span>
        </div>
      )
    } else {
      elements.push(
        <p key={key++} style={r.p}
          dangerouslySetInnerHTML={{__html: renderInline(line)}} />
      )
    }
  }

  return <>{elements}</>
}

function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,.06);padding:.1em .4em;border-radius:3px;font-size:.85em">$1</code>')
}

// Dim color helpers
const dimColors = {
  Build: { bg: 'rgba(0,180,180,.1)', color: '#4ecece', border: 'rgba(0,180,180,.2)' },
  Market: { bg: 'rgba(200,100,200,.1)', color: '#d88ad8', border: 'rgba(200,100,200,.2)' },
  Sell: { bg: 'rgba(212,137,26,.12)', color: '#d4891a', border: 'rgba(212,137,26,.2)' },
  Other: { bg: 'rgba(255,255,255,.04)', color: '#8a8680', border: 'rgba(255,255,255,.08)' },
}

const s = {
  page: {padding:'2rem',maxWidth:1100,margin:'0 auto'},
  header: {display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.25rem',flexWrap:'wrap',gap:'1rem'},
  title: {fontFamily:'var(--serif)',fontSize:'1.8rem',letterSpacing:'-.025em'},
  sub: {color:'var(--mu)',fontSize:'.875rem',marginTop:'.2rem'},
  weekPicker: {display:'flex',gap:'.4rem',flexWrap:'wrap'},
  weekBtn: {background:'transparent',border:'1px solid var(--brd)',color:'var(--mu)',padding:'.35rem .75rem',borderRadius:'var(--radius)',cursor:'pointer',fontSize:'.78rem',transition:'all .15s',fontFamily:'var(--sans)'},
  weekOn: {background:'var(--amblo)',borderColor:'rgba(212,137,26,.3)',color:'var(--amberhi)'},
  dateRange: {display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.5rem',paddingBottom:'1rem',borderBottom:'1px solid var(--brd)'},
  dateLabel: {fontFamily:'var(--serif)',fontSize:'1.1rem',color:'var(--tx)'},
  actCount: {fontSize:'.78rem',color:'var(--mu2)',background:'var(--bg2)',border:'1px solid var(--brd)',padding:'.2rem .6rem',borderRadius:'var(--radius)'},
  body: {display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',alignItems:'start'},
  left: {background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius-lg)',padding:'1.25rem',display:'flex',flexDirection:'column',gap:'1rem'},
  right: {background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius-lg)',padding:'1.25rem',display:'flex',flexDirection:'column',gap:'1rem',minHeight:400},
  panelHead: {display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'.75rem',fontWeight:500,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--mu2)',paddingBottom:'.75rem',borderBottom:'1px solid var(--brd)'},
  emptyActs: {textAlign:'center',padding:'1.5rem 0',color:'var(--mu)',fontSize:'.85rem'},
  dimRow: {display:'flex',gap:'.4rem',flexWrap:'wrap'},
  dimPill: (dim) => {
    const c = dimColors[dim] || dimColors.Other
    return {display:'flex',alignItems:'center',gap:'.35rem',background:c.bg,border:`1px solid ${c.border}`,color:c.color,padding:'.2rem .6rem',borderRadius:'4px',fontSize:'.72rem',fontWeight:500}
  },
  actList: {display:'flex',flexDirection:'column',gap:'.5rem',maxHeight:400,overflowY:'auto'},
  actRow: {display:'flex',gap:'.75rem',padding:'.625rem',background:'var(--bg)',border:'1px solid var(--brd)',borderRadius:'var(--radius)'},
  actDate: {fontSize:'.65rem',color:'var(--mu2)',flexShrink:0,width:55,paddingTop:2},
  actBody: {flex:1,minWidth:0},
  actType: {fontSize:'.68rem',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--amberhi)',background:'var(--amblo)',padding:'.1rem .4rem',borderRadius:3,display:'inline-block',marginBottom:'.2rem'},
  actOut: {fontSize:'.78rem',color:'var(--tx)',lineHeight:1.4,marginBottom:'.2rem'},
  actMeta: {fontSize:'.68rem',color:'var(--mu2)',display:'flex',alignItems:'center',gap:'.3rem'},
  dimDot: (dim) => ({color: dim === 'Build' ? '#4ecece' : dim === 'Market' ? '#d88ad8' : '#d4891a', fontSize:'.5rem'}),
  genBtn: {background:'var(--amber)',color:'#080b0f',border:'none',borderRadius:'var(--radius)',padding:'.65rem',fontFamily:'var(--sans)',fontSize:'.875rem',fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',transition:'background .2s,opacity .2s',marginTop:'.25rem'},
  genBtnDisabled: {opacity:.4,cursor:'not-allowed'},
  genSpinner: {width:14,height:14,border:'2px solid rgba(8,11,15,.3)',borderTopColor:'#080b0f',borderRadius:'50%',animation:'spin .7s linear infinite',flexShrink:0},
  genSpinner2: {width:28,height:28,border:'2px solid var(--brd)',borderTopColor:'var(--amber)',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'2rem auto 0'},
  reportEmpty: {flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem 1rem'},
  previewBox: {marginTop:'1.5rem',width:'100%',display:'flex',flexDirection:'column',gap:'.4rem',opacity:.3},
  previewLine: {display:'flex'},
  pl: {height:10,background:'var(--brd)',borderRadius:3},
  reportContent: {flex:1},
  smallBtn: {background:'transparent',border:'1px solid var(--brd)',color:'var(--mu)',fontSize:'.72rem',padding:'.2rem .6rem',borderRadius:'var(--radius)',cursor:'pointer',fontFamily:'var(--sans)',transition:'all .15s'},
}

const r = {
  h2: {fontFamily:'var(--serif)',fontSize:'1.15rem',letterSpacing:'-.02em',marginBottom:'.25rem',color:'var(--tx)'},
  h3: {fontSize:'.82rem',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--amber)',marginTop:'.5rem',marginBottom:'.4rem'},
  bold: {fontWeight:500,fontSize:'.875rem',marginBottom:'.25rem',color:'var(--tx)'},
  p: {fontSize:'.85rem',color:'var(--mu)',lineHeight:1.65,marginBottom:'.25rem'},
  li: {display:'flex',gap:'.5rem',alignItems:'baseline',fontSize:'.85rem',color:'var(--mu)',lineHeight:1.55,marginBottom:'.3rem'},
  liDot: {color:'var(--amber)',fontSize:'.72rem',flexShrink:0,marginTop:'2px'},
  dimLine: {display:'flex',gap:'.5rem',alignItems:'baseline',fontSize:'.82rem',marginBottom:'.25rem'},
  dimLabel: {fontWeight:500,flexShrink:0,minWidth:48},
}
