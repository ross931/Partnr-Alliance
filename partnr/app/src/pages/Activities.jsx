import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const TYPES = ['Meeting','Submission','Content Published','Certification Completed','Integration Deployed','Credits Secured','Deal Registered']

const typeIcon = {
  'Meeting': '💬', 'Submission': '📤', 'Content Published': '📝',
  'Certification Completed': '🏆', 'Integration Deployed': '⚙️',
  'Credits Secured': '💰', 'Deal Registered': '🤝',
}

export default function Activities() {
  const { session } = useAuth()
  const [activities, setActivities] = useState([])
  const [programs, setPrograms] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return { type:'Meeting', program_id:'', partner_id:'', date:new Date().toISOString().split('T')[0], owner:'', outcome:'', evidence_url:'', notes:'' }
  }

  useEffect(() => {
    Promise.all([
      supabase.from('activities').select('*, programs(name,dimension), partners(name)').eq('user_id', session.user.id).order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('programs').select('id,name,dimension').eq('user_id', session.user.id).order('name'),
      supabase.from('partners').select('id,name').eq('user_id', session.user.id).order('name'),
    ]).then(([aRes, pgRes, pRes]) => {
      setActivities(aRes.data || [])
      setPrograms(pgRes.data || [])
      setPartners(pRes.data || [])
      setLoading(false)
    })
  }, [])

  async function save() {
    const payload = {
      ...form, user_id: session.user.id,
      program_id: form.program_id || null,
      partner_id: form.partner_id || null,
    }
    if (editing) {
      await supabase.from('activities').update(payload).eq('id', editing)
    } else {
      await supabase.from('activities').insert(payload)
    }
    closeModal()
    const { data } = await supabase.from('activities').select('*, programs(name,dimension), partners(name)').eq('user_id', session.user.id).order('date', { ascending: false })
    setActivities(data || [])
  }

  async function del(id) {
    if (!confirm('Delete this activity?')) return
    await supabase.from('activities').delete().eq('id', id)
    setActivities(prev => prev.filter(a => a.id !== id))
  }

  function openEdit(a) {
    setEditing(a.id)
    setForm({ type:a.type, program_id:a.program_id||'', partner_id:a.partner_id||'',
      date:a.date, owner:a.owner||'', outcome:a.outcome||'', evidence_url:a.evidence_url||'', notes:a.notes||'' })
    setModal(true)
  }

  function closeModal() { setModal(false); setEditing(null); setForm(defaultForm()) }

  const filtered = typeFilter ? activities.filter(a => a.type === typeFilter) : activities

  // Group by date
  const grouped = {}
  filtered.forEach(a => {
    const d = a.date || 'Unknown'
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(a)
  })

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Activities</h1>
          <p style={s.sub}>{activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} logged</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Log activity</button>
      </div>

      {/* Type filter chips */}
      <div style={s.chips}>
        <button style={{...s.chip, ...(typeFilter === '' ? s.chipOn : {})}} onClick={() => setTypeFilter('')}>All</button>
        {TYPES.map(t => (
          <button key={t} style={{...s.chip, ...(typeFilter === t ? s.chipOn : {})}} onClick={() => setTypeFilter(t)}>
            {typeIcon[t]} {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'3rem'}}>
          <div style={{fontSize:'2rem',marginBottom:'.75rem',opacity:.3}}>⚡</div>
          <p style={{color:'var(--mu)',marginBottom:'1rem'}}>No activities logged yet. Start tracking your partnership work.</p>
          <button className="btn-primary" onClick={() => setModal(true)}>Log first activity</button>
        </div>
      ) : (
        <div>
          {Object.entries(grouped).sort(([a],[b]) => b.localeCompare(a)).map(([date, acts]) => (
            <div key={date} style={s.group}>
              <div style={s.dateLabel}>{formatDate(date)}</div>
              <div style={s.actList}>
                {acts.map(a => (
                  <div key={a.id} style={s.actCard}>
                    <div style={s.actLeft}>
                      <div style={s.actIcon}>{typeIcon[a.type] || '📌'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={s.actType}>{a.type}</div>
                        {a.outcome && <div style={s.actOutcome}>{a.outcome}</div>}
                        <div style={s.actMeta}>
                          {a.programs?.name && <span><span style={s.dim(a.programs.dimension)}>{a.programs.dimension}</span> {a.programs.name}</span>}
                          {a.partners?.name && <span> · {a.partners.name}</span>}
                          {a.owner && <span> · {a.owner}</span>}
                        </div>
                        {a.notes && <div style={s.actNotes}>{a.notes}</div>}
                        {a.evidence_url && (
                          <a href={a.evidence_url} target="_blank" rel="noopener noreferrer" style={s.evidenceLink}>
                            🔗 Evidence
                          </a>
                        )}
                      </div>
                    </div>
                    <div style={s.actRight}>
                      <button className="btn-ghost" style={{fontSize:'.72rem',padding:'.3rem .6rem'}} onClick={() => openEdit(a)}>Edit</button>
                      <button className="btn-danger" style={{fontSize:'.72rem',padding:'.3rem .6rem'}} onClick={() => del(a.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? 'Edit activity' : 'Log activity'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Activity type *</label>
                <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Linked program</label>
                <select value={form.program_id} onChange={e => setForm({...form,program_id:e.target.value})}>
                  <option value="">No program</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Linked partner</label>
                <select value={form.partner_id} onChange={e => setForm({...form,partner_id:e.target.value})}>
                  <option value="">No partner</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Owner</label>
                <input type="text" value={form.owner} onChange={e => setForm({...form,owner:e.target.value})} placeholder="Your name" />
              </div>
              <div className="form-row">
                <label>Evidence URL</label>
                <input type="url" value={form.evidence_url} onChange={e => setForm({...form,evidence_url:e.target.value})} placeholder="https://…" />
              </div>
            </div>
            <div className="form-row">
              <label>Outcome — what moved forward?</label>
              <textarea value={form.outcome} onChange={e => setForm({...form,outcome:e.target.value})} rows={2} placeholder="e.g. Submitted 3rd certification exam. Awaiting review." />
            </div>
            <div className="form-row">
              <label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} placeholder="Additional context…" />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={save}>{editing ? 'Save changes' : 'Log activity'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(d) {
  if (!d || d === 'Unknown') return 'Unknown date'
  const date = new Date(d + 'T12:00:00')
  const today = new Date()
  const diff = Math.floor((today - date) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })
}

const s = {
  page: {padding:'2rem',maxWidth:900,margin:'0 auto'},
  header: {display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'},
  title: {fontFamily:'var(--serif)',fontSize:'1.8rem',letterSpacing:'-.025em'},
  sub: {color:'var(--mu)',fontSize:'.875rem',marginTop:'.2rem'},
  chips: {display:'flex',gap:'.5rem',marginBottom:'1.5rem',flexWrap:'wrap'},
  chip: {background:'transparent',border:'1px solid var(--brd)',color:'var(--mu)',padding:'.3rem .75rem',borderRadius:'100px',cursor:'pointer',fontSize:'.75rem',transition:'all .15s',whiteSpace:'nowrap'},
  chipOn: {background:'rgba(212,137,26,.1)',borderColor:'rgba(212,137,26,.3)',color:'var(--amberhi)'},
  group: {marginBottom:'1.75rem'},
  dateLabel: {fontSize:'.72rem',fontWeight:500,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--mu2)',marginBottom:'.75rem',paddingBottom:'.5rem',borderBottom:'1px solid var(--brd)'},
  actList: {display:'flex',flexDirection:'column',gap:'.6rem'},
  actCard: {background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius)',padding:'.875rem 1rem',display:'flex',alignItems:'flex-start',gap:'.75rem',transition:'border-color .2s'},
  actLeft: {display:'flex',alignItems:'flex-start',gap:'.75rem',flex:1,minWidth:0},
  actIcon: {fontSize:'1rem',flexShrink:0,marginTop:'1px'},
  actType: {fontSize:'.82rem',fontWeight:500,marginBottom:'.2rem'},
  actOutcome: {fontSize:'.82rem',color:'var(--mu)',lineHeight:1.55,marginBottom:'.3rem'},
  actMeta: {fontSize:'.72rem',color:'var(--mu2)'},
  actNotes: {fontSize:'.75rem',color:'var(--mu2)',marginTop:'.3rem',fontStyle:'italic'},
  evidenceLink: {display:'inline-flex',alignItems:'center',gap:'.3rem',color:'var(--amber)',fontSize:'.72rem',textDecoration:'none',marginTop:'.3rem'},
  actRight: {display:'flex',gap:'.4rem',flexShrink:0},
  dim: (d) => ({display:'inline-block',fontSize:'.68rem',fontWeight:500,color:d==='Build'?'#4ecece':d==='Market'?'#d88ad8':'var(--amberhi)',marginRight:'.3rem'}),
}
