import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const TYPES = ['Certification','Marketplace Listing','MDF / Credits','Joint Content','Technical Integration','Co-Marketing']
const STAGES = ['Initiated','Requirements','In Progress','Launched','Benefit Realized']
const DIMENSIONS = ['Build','Market','Sell']

const DEFAULT_REQS = {
  'Certification':['Complete training modules','Pass required exams','Submit customer references','Partner team review','Receive official designation'],
  'Marketplace Listing':['Create partner account','Complete listing details','Submit for review','Pass security review','Go live on marketplace'],
  'MDF / Credits':['Identify eligible activities','Submit MDF request','Receive approval','Execute approved activities','Submit proof of execution'],
  'Joint Content':['Define content brief','Assign co-authors','Draft content','Partner review and approval','Publish and distribute'],
  'Technical Integration':['Define integration scope','API/SDK access granted','Development complete','QA testing passed','Integration deployed to prod'],
  'Co-Marketing':['Define campaign brief','Get budget approved','Create campaign assets','Launch campaign','Measure and report results'],
}

function stageIdx(s) { return STAGES.indexOf(s) }

export default function Programs() {
  const { session } = useAuth()
  const [programs, setPrograms] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [dimFilter, setDimFilter] = useState('All')
  const [detailId, setDetailId] = useState(null)
  const [form, setForm] = useState(dflt())

  function dflt() {
    return { name:'',type:'Certification',stage:'Initiated',dimension:'Build',partner_id:'',owner:'',target_date:'',value_usd:'',notes:'',requirements:[] }
  }

  useEffect(() => {
    Promise.all([
      supabase.from('programs').select('*, partners(name)').eq('user_id',session.user.id).order('created_at',{ascending:false}),
      supabase.from('partners').select('id,name').eq('user_id',session.user.id).order('name'),
    ]).then(([pg,p]) => {
      setPrograms((pg.data||[]).map(r => ({ ...r, requirements: Array.isArray(r.requirements) ? r.requirements : (r.requirements ? JSON.parse(r.requirements) : []) })))
      setPartners(p.data||[])
      setLoading(false)
    })
  },[])

  function loadDefaultReqs(type) {
    const reqs = (DEFAULT_REQS[type]||[]).map((text,i) => ({ id:`r${Date.now()}${i}`, text, done:false }))
    setForm(prev => ({ ...prev, type, requirements:reqs }))
  }

  async function save() {
    const payload = {
      name:form.name, type:form.type, stage:form.stage, dimension:form.dimension,
      partner_id:form.partner_id||null, owner:form.owner||null,
      target_date:form.target_date||null, value_usd:form.value_usd?parseFloat(form.value_usd):null,
      notes:form.notes||null, requirements:form.requirements, user_id:session.user.id,
    }
    if (editing) {
      const {data} = await supabase.from('programs').update(payload).eq('id',editing).select('*,partners(name)').single()
      if (data) setPrograms(prev => prev.map(p => p.id===editing ? {...data,requirements:data.requirements||[]} : p))
    } else {
      const {data} = await supabase.from('programs').insert(payload).select('*,partners(name)').single()
      if (data) setPrograms(prev => [{...data,requirements:data.requirements||[]},...prev])
    }
    closeModal()
  }

  async function toggleReq(progId, reqId) {
    const prog = programs.find(p => p.id===progId)
    if (!prog) return
    const reqs = prog.requirements.map(r => r.id===reqId ? {...r,done:!r.done} : r)
    await supabase.from('programs').update({requirements:reqs}).eq('id',progId)
    setPrograms(prev => prev.map(p => p.id===progId ? {...p,requirements:reqs} : p))
  }

  async function advanceStage(prog) {
    const idx = stageIdx(prog.stage)
    if (idx >= STAGES.length-1) return
    const next = STAGES[idx+1]
    await supabase.from('programs').update({stage:next}).eq('id',prog.id)
    setPrograms(prev => prev.map(p => p.id===prog.id ? {...p,stage:next} : p))
  }

  async function del(id) {
    if (!confirm('Delete this program?')) return
    await supabase.from('programs').delete().eq('id',id)
    setPrograms(prev => prev.filter(p => p.id!==id))
    if (detailId===id) setDetailId(null)
  }

  function openEdit(p) {
    setEditing(p.id)
    setForm({name:p.name,type:p.type,stage:p.stage,dimension:p.dimension,partner_id:p.partner_id||'',owner:p.owner||'',target_date:p.target_date||'',value_usd:p.value_usd||'',notes:p.notes||'',requirements:p.requirements||[]})
    setModal(true)
  }

  function closeModal() { setModal(false); setEditing(null); setForm(dflt()) }

  const filtered = dimFilter==='All' ? programs : programs.filter(p => p.dimension===dimFilter)
  const detailProg = programs.find(p => p.id===detailId)

  if (loading) return <div className="loading"><div className="spinner"/></div>

  return (
    <div style={s.page}>
      <div style={s.hdr}>
        <div>
          <h1 style={s.title}>Programs</h1>
          <p style={s.sub}>{programs.length} program{programs.length!==1?'s':''} tracked</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>+ New program</button>
      </div>

      <div style={s.tabs}>
        {['All','Build','Market','Sell'].map(d => (
          <button key={d} style={{...s.tab,...(dimFilter===d?s.tabOn:{})}} onClick={() => setDimFilter(d)}>
            {d} <span style={s.tcount}>{d==='All'?programs.length:programs.filter(p=>p.dimension===d).length}</span>
          </button>
        ))}
      </div>

      <div style={{display:'flex',gap:'1.25rem',alignItems:'start'}}>
        <div style={{flex:1,overflowX:'auto'}}>
          <div style={s.board}>
            {STAGES.map(stage => {
              const col = filtered.filter(p => p.stage===stage)
              return (
                <div key={stage} style={s.col}>
                  <div style={s.colhd}><span style={s.collbl}>{stage}</span><span style={s.colcnt}>{col.length}</span></div>
                  <div style={s.colbd}>
                    {col.map(p => (
                      <Kard key={p.id} p={p}
                        selected={detailId===p.id}
                        onClick={() => setDetailId(detailId===p.id?null:p.id)}
                        onEdit={() => openEdit(p)}
                        onDel={() => del(p.id)}
                        onAdv={() => advanceStage(p)}
                        isLast={stageIdx(p.stage)>=STAGES.length-1}
                      />
                    ))}
                    {col.length===0 && <div style={s.empty}>—</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {detailProg && (
          <div style={s.drawer}>
            <div style={s.drhd}>
              <div>
                <div style={{fontSize:'.68rem',color:'var(--mu2)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.2rem'}}>{detailProg.type}</div>
                <div style={{fontWeight:500,fontSize:'.9rem',lineHeight:1.3}}>{detailProg.name}</div>
              </div>
              <button style={s.drclose} onClick={() => setDetailId(null)}>✕</button>
            </div>
            <div style={s.drbody}>
              <div style={s.metag}>
                {[
                  ['Dimension', <span className={`badge badge-${detailProg.dimension?.toLowerCase()}`}>{detailProg.dimension}</span>],
                  ['Stage', detailProg.stage],
                  detailProg.partners?.name && ['Partner', detailProg.partners.name],
                  detailProg.owner && ['Owner', detailProg.owner],
                  detailProg.target_date && ['Due', detailProg.target_date],
                  detailProg.value_usd && ['Value', `$${Number(detailProg.value_usd).toLocaleString()}`],
                ].filter(Boolean).map(([lbl, val]) => (
                  <div key={lbl} style={s.metarow}>
                    <span style={s.metalbl}>{lbl}</span>
                    <span style={{fontSize:'.82rem',color:'var(--mu)'}}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Checklist */}
              <div>
                <div style={s.clhd}>
                  Requirements
                  {detailProg.requirements?.length>0 && (
                    <span style={s.clpct}>{detailProg.requirements.filter(r=>r.done).length}/{detailProg.requirements.length}</span>
                  )}
                </div>
                {detailProg.requirements?.length>0 && (
                  <div className="stage-bar" style={{marginBottom:'.625rem'}}>
                    <div className="stage-bar-fill" style={{width:(detailProg.requirements.filter(r=>r.done).length/detailProg.requirements.length*100)+'%'}}/>
                  </div>
                )}
                {(detailProg.requirements||[]).length===0 ? (
                  <div style={{fontSize:'.75rem',color:'var(--mu2)',fontStyle:'italic'}}>No requirements. Edit program to add a checklist.</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'.3rem'}}>
                    {detailProg.requirements.map(r => (
                      <div key={r.id} style={s.reqrow} onClick={() => toggleReq(detailProg.id, r.id)}>
                        <div style={{...s.reqbox,...(r.done?s.reqon:{})}}>{r.done&&'✓'}</div>
                        <span style={{fontSize:'.8rem',color:r.done?'var(--mu2)':'var(--mu)',textDecoration:r.done?'line-through':'none',lineHeight:1.4}}>{r.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {detailProg.notes && (
                <div>
                  <div style={s.clhd}>Notes</div>
                  <p style={{fontSize:'.8rem',color:'var(--mu)',lineHeight:1.6}}>{detailProg.notes}</p>
                </div>
              )}
              <div style={{display:'flex',gap:'.5rem'}}>
                <button className="btn-ghost" style={{flex:1,fontSize:'.78rem'}} onClick={() => openEdit(detailProg)}>Edit</button>
                {stageIdx(detailProg.stage)<STAGES.length-1 && (
                  <button style={s.advbtn} onClick={() => advanceStage(detailProg)}>→ Advance</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&closeModal()}>
          <div className="modal" style={{maxWidth:580}}>
            <div className="modal-header">
              <h3>{editing?'Edit program':'New program'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="form-row">
              <label>Program name *</label>
              <input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. AWS AI Competency" autoFocus/>
            </div>
            <div className="form-grid">
              <div className="form-row"><label>Type</label>
                <select value={form.type} onChange={e=>loadDefaultReqs(e.target.value)}>
                  {TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div className="form-row"><label>Dimension</label>
                <select value={form.dimension} onChange={e=>setForm({...form,dimension:e.target.value})}>
                  {DIMENSIONS.map(d=><option key={d}>{d}</option>)}</select></div>
              <div className="form-row"><label>Stage</label>
                <select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>
                  {STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div className="form-row"><label>Partner</label>
                <select value={form.partner_id} onChange={e=>setForm({...form,partner_id:e.target.value})}>
                  <option value="">None</option>
                  {partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="form-row"><label>Owner</label>
                <input type="text" value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})} placeholder="Your name"/></div>
              <div className="form-row"><label>Target date</label>
                <input type="date" value={form.target_date} onChange={e=>setForm({...form,target_date:e.target.value})}/></div>
              <div className="form-row"><label>Value ($)</label>
                <input type="number" value={form.value_usd} onChange={e=>setForm({...form,value_usd:e.target.value})} placeholder="0"/></div>
            </div>

            <div style={{marginBottom:'1rem'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.5rem'}}>
                <label style={{margin:0}}>Requirements checklist ({form.requirements.length} steps)</label>
                <button type="button" style={{background:'none',border:'none',color:'var(--amber)',fontSize:'.78rem',cursor:'pointer',fontFamily:'var(--sans)'}}
                  onClick={() => setForm(prev=>({...prev,requirements:[...prev.requirements,{id:`r${Date.now()}`,text:'',done:false}]}))}>+ Add step</button>
              </div>
              {form.requirements.length>0 ? (
                <div style={{display:'flex',flexDirection:'column',gap:'.3rem'}}>
                  {form.requirements.map((r,i) => (
                    <div key={r.id} style={{display:'flex',gap:'.4rem',alignItems:'center'}}>
                      <span style={{fontSize:'.68rem',color:'var(--mu2)',width:14,textAlign:'right',flexShrink:0}}>{i+1}</span>
                      <input type="text" value={r.text} onChange={e=>setForm(prev=>({...prev,requirements:prev.requirements.map(x=>x.id===r.id?{...x,text:e.target.value}:x)}))} placeholder={`Step ${i+1}`} style={{flex:1}}/>
                      <button type="button" style={{background:'none',border:'none',color:'var(--mu2)',cursor:'pointer',fontSize:'1rem',padding:'0 .2rem'}} onClick={()=>setForm(prev=>({...prev,requirements:prev.requirements.filter(x=>x.id!==r.id)}))}>×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{fontSize:'.75rem',color:'var(--mu2)',fontStyle:'italic',padding:'.3rem 0'}}>Selecting a type auto-populates default steps. You can edit or add your own.</div>
              )}
            </div>

            <div className="form-row">
              <label>Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Context, blockers, links…"/>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={!form.name}>{editing?'Save':'Create program'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Kard({ p, selected, onClick, onEdit, onDel, onAdv, isLast }) {
  const reqs = p.requirements||[]
  return (
    <div style={{...k.c,...(selected?k.sel:{})}} onClick={onClick}>
      <div style={k.top}>
        <span className={`badge badge-${p.dimension?.toLowerCase()}`}>{p.dimension}</span>
        <span style={k.type}>{p.type}</span>
      </div>
      <div style={k.name}>{p.name}</div>
      {p.partners?.name && <div style={k.partner}>↳ {p.partners.name}</div>}
      {reqs.length>0 && (
        <div style={k.reqbar}>
          <div style={k.rbtrack}><div style={{...k.rbfill,width:(reqs.filter(r=>r.done).length/reqs.length*100)+'%'}}/></div>
          <span style={k.rbpct}>{reqs.filter(r=>r.done).length}/{reqs.length}</span>
        </div>
      )}
      {p.target_date && <div style={k.date}>🗓 {p.target_date}</div>}
      {p.value_usd && <div style={k.val}>${Number(p.value_usd).toLocaleString()}</div>}
      <div style={k.acts} onClick={e=>e.stopPropagation()}>
        <button className="btn-ghost" style={{fontSize:'.68rem',padding:'.25rem .5rem'}} onClick={onEdit}>Edit</button>
        {!isLast && <button style={k.adv} onClick={onAdv}>→</button>}
        <button className="btn-danger" style={{fontSize:'.68rem',padding:'.25rem .5rem'}} onClick={onDel}>✕</button>
      </div>
    </div>
  )
}

const k = {
  c:{background:'var(--bg)',border:'1px solid var(--brd)',borderRadius:'var(--radius)',padding:'.75rem',display:'flex',flexDirection:'column',gap:'.38rem',cursor:'pointer',transition:'border-color .15s'},
  sel:{borderColor:'var(--amber)'},
  top:{display:'flex',alignItems:'center',gap:'.35rem',flexWrap:'wrap'},
  type:{fontSize:'.6rem',color:'var(--mu2)'},
  name:{fontSize:'.8rem',fontWeight:500,lineHeight:1.3},
  partner:{fontSize:'.68rem',color:'var(--mu)',fontStyle:'italic'},
  reqbar:{display:'flex',alignItems:'center',gap:'.35rem'},
  rbtrack:{flex:1,height:3,background:'var(--brd)',borderRadius:2,overflow:'hidden'},
  rbfill:{height:'100%',background:'var(--amber)',borderRadius:2},
  rbpct:{fontSize:'.58rem',color:'var(--mu2)',flexShrink:0},
  date:{fontSize:'.65rem',color:'var(--mu2)'},
  val:{fontSize:'.72rem',color:'var(--amberhi)',fontWeight:500},
  acts:{display:'flex',gap:'.3rem',flexWrap:'wrap'},
  adv:{background:'rgba(212,137,26,.1)',border:'1px solid rgba(212,137,26,.2)',color:'var(--amberhi)',fontSize:'.68rem',padding:'.25rem .5rem',borderRadius:'var(--radius)',cursor:'pointer'},
}

const s = {
  page:{padding:'2rem',maxWidth:1400,margin:'0 auto'},
  hdr:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'},
  title:{fontFamily:'var(--serif)',fontSize:'1.8rem',letterSpacing:'-.025em'},
  sub:{color:'var(--mu)',fontSize:'.875rem',marginTop:'.2rem'},
  tabs:{display:'flex',gap:'.5rem',marginBottom:'1.5rem',flexWrap:'wrap'},
  tab:{display:'flex',alignItems:'center',gap:'.35rem',background:'transparent',border:'1px solid var(--brd)',color:'var(--mu)',padding:'.38rem .875rem',borderRadius:'var(--radius)',cursor:'pointer',fontSize:'.78rem',transition:'all .15s',fontFamily:'var(--sans)'},
  tabOn:{background:'rgba(212,137,26,.1)',borderColor:'rgba(212,137,26,.3)',color:'var(--amberhi)'},
  tcount:{background:'var(--brd)',borderRadius:3,padding:'.04rem .35rem',fontSize:'.65rem'},
  board:{display:'grid',gridTemplateColumns:'repeat(5,minmax(160px,1fr))',gap:'.75rem',alignItems:'start'},
  col:{display:'flex',flexDirection:'column',gap:'.5rem'},
  colhd:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.38rem .5rem',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius)'},
  collbl:{fontSize:'.65rem',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--mu)'},
  colcnt:{fontSize:'.65rem',color:'var(--mu2)',background:'var(--bg)',borderRadius:3,padding:'.04rem .35rem',border:'1px solid var(--brd)'},
  colbd:{display:'flex',flexDirection:'column',gap:'.45rem'},
  empty:{color:'var(--mu2)',fontSize:'.68rem',textAlign:'center',padding:'.5rem 0'},
  drawer:{width:280,flexShrink:0,background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius-lg)',overflow:'hidden',position:'sticky',top:'1rem'},
  drhd:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'.875rem',borderBottom:'1px solid var(--brd)',background:'var(--bg3)'},
  drclose:{background:'none',border:'none',color:'var(--mu)',cursor:'pointer',fontSize:'.95rem',padding:'.15rem',borderRadius:4},
  drbody:{padding:'.875rem',display:'flex',flexDirection:'column',gap:'.875rem',maxHeight:'calc(100vh - 180px)',overflowY:'auto'},
  metag:{display:'flex',flexDirection:'column'},
  metarow:{display:'flex',alignItems:'baseline',gap:'.5rem',padding:'.28rem 0',borderBottom:'1px solid var(--brd)'},
  metalbl:{fontSize:'.65rem',color:'var(--mu2)',minWidth:55,flexShrink:0},
  clhd:{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'.68rem',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--mu2)',marginBottom:'.4rem'},
  clpct:{background:'var(--amblo)',color:'var(--amberhi)',padding:'.08rem .4rem',borderRadius:3,fontSize:'.62rem'},
  reqrow:{display:'flex',alignItems:'flex-start',gap:'.5rem',cursor:'pointer',padding:'.25rem',borderRadius:4,transition:'background .12s'},
  reqbox:{width:15,height:15,border:'1px solid var(--brd)',borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.55rem',flexShrink:0,marginTop:2},
  reqon:{background:'var(--amber)',borderColor:'var(--amber)',color:'#080b0f'},
  advbtn:{background:'rgba(212,137,26,.1)',border:'1px solid rgba(212,137,26,.2)',color:'var(--amberhi)',borderRadius:'var(--radius)',padding:'.42rem .75rem',fontSize:'.78rem',cursor:'pointer',fontFamily:'var(--sans)',flex:1},
}
