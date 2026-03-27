import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const TYPES = ['Reseller','ISV','GSI','SI','Technology Partner']
const TIERS = ['Primary','Sub-Partner','Joint Customer']
const STATUSES = ['Active','In Onboarding','Inactive','Strategic']
const CLOUDS = ['AWS','Azure','GCP','Multi-Cloud']

export default function Partners() {
  const { session } = useAuth()
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState({ status: '', cloud: '', type: '' })
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return { name:'', type:'ISV', tier:'Primary', status:'Active', cloud:'AWS', primary_contact_name:'', primary_contact_email:'', parent_id:'', notes:'' }
  }

  useEffect(() => { fetchPartners() }, [])

  async function fetchPartners() {
    const { data } = await supabase
      .from('partners').select('*, parent:parent_id(name)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setPartners(data || [])
    setLoading(false)
  }

  async function save() {
    const payload = { ...form, user_id: session.user.id, parent_id: form.parent_id || null }
    if (editing) {
      await supabase.from('partners').update(payload).eq('id', editing)
    } else {
      await supabase.from('partners').insert(payload)
    }
    closeModal()
    fetchPartners()
  }

  async function del(id) {
    if (!confirm('Delete this partner? This cannot be undone.')) return
    await supabase.from('partners').delete().eq('id', id)
    fetchPartners()
  }

  function openEdit(p) {
    setEditing(p.id)
    setForm({ name:p.name, type:p.type, tier:p.tier, status:p.status, cloud:p.cloud,
      primary_contact_name:p.primary_contact_name||'', primary_contact_email:p.primary_contact_email||'',
      parent_id:p.parent_id||'', notes:p.notes||'' })
    setModal(true)
  }

  function closeModal() { setModal(false); setEditing(null); setForm(defaultForm()) }

  const filtered = partners.filter(p =>
    (!filter.status || p.status === filter.status) &&
    (!filter.cloud || p.cloud === filter.cloud) &&
    (!filter.type || p.type === filter.type)
  )

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Partners</h1>
          <p style={s.sub}>{partners.length} partner{partners.length !== 1 ? 's' : ''} in your network</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Add partner</button>
      </div>

      {/* Filters */}
      <div style={s.filters}>
        <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} style={s.filterSel}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filter.cloud} onChange={e => setFilter({...filter, cloud: e.target.value})} style={s.filterSel}>
          <option value="">All clouds</option>
          {CLOUDS.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filter.type} onChange={e => setFilter({...filter, type: e.target.value})} style={s.filterSel}>
          <option value="">All types</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        {(filter.status||filter.cloud||filter.type) && (
          <button className="btn-ghost" style={{fontSize:'.78rem',padding:'.4rem .75rem'}} onClick={() => setFilter({status:'',cloud:'',type:''})}>Clear</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'3rem'}}>
          <div style={{fontSize:'2rem',marginBottom:'.75rem',opacity:.3}}>🏢</div>
          <p style={{color:'var(--mu)',marginBottom:'1rem'}}>No partners yet. Add your first partner to get started.</p>
          <button className="btn-primary" onClick={() => setModal(true)}>Add first partner</button>
        </div>
      ) : (
        <div style={s.grid}>
          {filtered.map(p => (
            <div key={p.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={s.avatar}>{p.name?.[0]?.toUpperCase()}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={s.name}>{p.name}</div>
                  <div style={s.meta}>{p.type} · {p.cloud}</div>
                </div>
                <span className={`badge badge-${p.status?.toLowerCase().replace(' ','-').replace('/','-')}`}>{p.status}</span>
              </div>

              <div style={s.fields}>
                <div style={s.field}><span style={s.fLabel}>Tier</span><span style={s.fVal}>{p.tier}</span></div>
                {p.parent?.name && <div style={s.field}><span style={s.fLabel}>Parent</span><span style={s.fVal}>{p.parent.name}</span></div>}
                {p.primary_contact_name && <div style={s.field}><span style={s.fLabel}>Contact</span><span style={s.fVal}>{p.primary_contact_name}</span></div>}
                {p.primary_contact_email && <div style={s.field}><span style={s.fLabel}>Email</span><span style={{...s.fVal,color:'var(--amber)',fontSize:'.75rem'}}>{p.primary_contact_email}</span></div>}
              </div>

              {p.notes && <p style={s.notes}>{p.notes}</p>}

              <div style={s.cardActions}>
                <button className="btn-ghost" style={{fontSize:'.78rem',padding:'.35rem .75rem'}} onClick={() => openEdit(p)}>Edit</button>
                <button className="btn-danger" onClick={() => del(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? 'Edit partner' : 'Add partner'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="form-row">
              <label>Partner name *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Trace Three" />
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Tier</label>
                <select value={form.tier} onChange={e => setForm({...form,tier:e.target.value})}>
                  {TIERS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Cloud affiliation</label>
                <select value={form.cloud} onChange={e => setForm({...form,cloud:e.target.value})}>
                  {CLOUDS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label>Parent partner (for Sub-Partner / Joint Customer)</label>
              <select value={form.parent_id} onChange={e => setForm({...form,parent_id:e.target.value})}>
                <option value="">None (primary partner)</option>
                {partners.filter(p => p.id !== editing && p.tier === 'Primary').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>PDM contact name</label>
                <input type="text" value={form.primary_contact_name} onChange={e => setForm({...form,primary_contact_name:e.target.value})} placeholder="Jane Smith" />
              </div>
              <div className="form-row">
                <label>PDM contact email</label>
                <input type="email" value={form.primary_contact_email} onChange={e => setForm({...form,primary_contact_email:e.target.value})} placeholder="jane@partner.com" />
              </div>
            </div>
            <div className="form-row">
              <label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={3} placeholder="Key context, relationship history…" />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={!form.name}>{editing ? 'Save changes' : 'Add partner'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: {padding:'2rem',maxWidth:1080,margin:'0 auto'},
  header: {display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'},
  title: {fontFamily:'var(--serif)',fontSize:'1.8rem',letterSpacing:'-.025em'},
  sub: {color:'var(--mu)',fontSize:'.875rem',marginTop:'.2rem'},
  filters: {display:'flex',gap:'.75rem',marginBottom:'1.5rem',flexWrap:'wrap'},
  filterSel: {width:'auto',minWidth:140},
  grid: {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'1rem'},
  card: {background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius-lg)',padding:'1.25rem',display:'flex',flexDirection:'column',gap:'.875rem',transition:'border-color .2s'},
  cardTop: {display:'flex',alignItems:'flex-start',gap:'.75rem'},
  avatar: {width:36,height:36,background:'rgba(212,137,26,.15)',borderRadius:'var(--radius)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:500,color:'var(--amberhi)',flexShrink:0,fontSize:'1rem'},
  name: {fontSize:'.95rem',fontWeight:500,lineHeight:1.3,marginBottom:'.15rem'},
  meta: {fontSize:'.75rem',color:'var(--mu2)'},
  fields: {display:'flex',flexDirection:'column',gap:'.3rem'},
  field: {display:'flex',alignItems:'baseline',gap:'.5rem'},
  fLabel: {fontSize:'.72rem',color:'var(--mu2)',minWidth:55,flexShrink:0},
  fVal: {fontSize:'.82rem',color:'var(--mu)'},
  notes: {fontSize:'.8rem',color:'var(--mu)',lineHeight:1.55,paddingTop:'.5rem',borderTop:'1px solid var(--brd)'},
  cardActions: {display:'flex',gap:'.5rem',justifyContent:'flex-end',paddingTop:'.25rem'},
}
