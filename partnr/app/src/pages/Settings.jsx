// src/pages/Settings.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function Settings() {
  const { session } = useAuth()
  const [tab, setTab] = useState('account')
  const [exporting, setExporting] = useState(null)
  const [stats, setStats] = useState({ partners: 0, programs: 0, activities: 0 })
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => {
    const uid = session.user.id
    Promise.all([
      supabase.from('partners').select('id', { count: 'exact' }).eq('user_id', uid),
      supabase.from('programs').select('id', { count: 'exact' }).eq('user_id', uid),
      supabase.from('activities').select('id', { count: 'exact' }).eq('user_id', uid),
    ]).then(([p, pg, a]) => {
      setStats({ partners: p.count || 0, programs: pg.count || 0, activities: a.count || 0 })
    })
  }, [])

  function flash(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  // ── CSV Export ──────────────────────────────────────
  async function exportData(type) {
    setExporting(type)
    const uid = session.user.id
    let data, filename, headers

    try {
      if (type === 'partners') {
        const { data: rows } = await supabase
          .from('partners').select('name,type,tier,status,cloud,primary_contact_name,primary_contact_email,notes,created_at')
          .eq('user_id', uid).order('name')
        data = rows
        headers = ['Name','Type','Tier','Status','Cloud','Contact Name','Contact Email','Notes','Created']
        filename = 'partnr-partners.csv'
      } else if (type === 'programs') {
        const { data: rows } = await supabase
          .from('programs').select('name,type,stage,dimension,owner,target_date,value_usd,notes,created_at,partners(name)')
          .eq('user_id', uid).order('name')
        data = rows?.map(r => ({ ...r, partner: r.partners?.name || '', partners: undefined }))
        headers = ['Name','Type','Stage','Dimension','Owner','Target Date','Value ($)','Partner','Notes','Created']
        filename = 'partnr-programs.csv'
      } else if (type === 'activities') {
        const { data: rows } = await supabase
          .from('activities').select('type,date,owner,outcome,evidence_url,notes,created_at,programs(name,dimension),partners(name)')
          .eq('user_id', uid).order('date', { ascending: false })
        data = rows?.map(r => ({
          ...r,
          program: r.programs?.name || '',
          dimension: r.programs?.dimension || '',
          partner: r.partners?.name || '',
          programs: undefined, partners: undefined,
        }))
        headers = ['Type','Date','Owner','Outcome','Evidence URL','Program','Dimension','Partner','Notes','Created']
        filename = 'partnr-activities.csv'
      }

      if (!data?.length) { flash('No data to export', 'error'); return }

      // Build CSV
      const rows = data.map(row => {
        const vals = Object.values(row)
        return vals.map(v => {
          if (v === null || v === undefined) return ''
          const str = String(v).replace(/"/g, '""')
          return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
        }).join(',')
      })

      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      flash(`Exported ${data.length} ${type}`)
    } catch (err) {
      flash('Export failed: ' + err.message, 'error')
    } finally {
      setExporting(null)
    }
  }

  async function exportAll() {
    await exportData('partners')
    await new Promise(r => setTimeout(r, 300))
    await exportData('programs')
    await new Promise(r => setTimeout(r, 300))
    await exportData('activities')
  }

  // ── Copy API key placeholder ────────────────────────
  async function updatePassword(e) {
    e.preventDefault()
    const pw = e.target.password.value
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) flash(error.message, 'error')
    else { flash('Password updated'); e.target.reset() }
  }

  const TABS = ['account','export','danger']

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Settings</h1>
      </div>

      {msg.text && (
        <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'} style={{marginBottom:'1rem'}}>
          {msg.text}
        </div>
      )}

      <div style={s.layout}>
        {/* Tab list */}
        <div style={s.tabs}>
          {TABS.map(t => (
            <button
              key={t}
              style={{...s.tabBtn, ...(tab === t ? s.tabOn : {})}}
              onClick={() => setTab(t)}
            >
              {t === 'account' && '👤 Account'}
              {t === 'export' && '📤 Export data'}
              {t === 'danger' && '⚠️ Danger zone'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={s.content}>

          {/* ACCOUNT */}
          {tab === 'account' && (
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Account</h2>

              <div className="card" style={{marginBottom:'1.5rem'}}>
                <div style={s.fieldRow}>
                  <div style={s.fieldLabel}>Email</div>
                  <div style={s.fieldValue}>{session.user.email}</div>
                </div>
                <div style={s.fieldRow}>
                  <div style={s.fieldLabel}>User ID</div>
                  <div style={{...s.fieldValue,fontFamily:'monospace',fontSize:'.72rem',color:'var(--mu2)'}}>{session.user.id}</div>
                </div>
                <div style={s.fieldRow}>
                  <div style={s.fieldLabel}>Member since</div>
                  <div style={s.fieldValue}>{new Date(session.user.created_at).toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'})}</div>
                </div>
              </div>

              <h3 style={s.subTitle}>Change password</h3>
              <form className="card" onSubmit={updatePassword}>
                <div className="form-row">
                  <label>New password</label>
                  <input type="password" name="password" placeholder="••••••••" minLength={6} required />
                </div>
                <div style={{marginTop:'.75rem'}}>
                  <button type="submit" className="btn-primary">Update password</button>
                </div>
              </form>

              <h3 style={{...s.subTitle, marginTop:'1.5rem'}}>Your data at a glance</h3>
              <div style={s.statsRow}>
                <div style={s.statCard}><div style={s.statN}>{stats.partners}</div><div style={s.statL}>Partners</div></div>
                <div style={s.statCard}><div style={s.statN}>{stats.programs}</div><div style={s.statL}>Programs</div></div>
                <div style={s.statCard}><div style={s.statN}>{stats.activities}</div><div style={s.statL}>Activities</div></div>
              </div>
            </div>
          )}

          {/* EXPORT */}
          {tab === 'export' && (
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Export your data</h2>
              <p style={{color:'var(--mu)',fontSize:'.875rem',marginBottom:'1.5rem',lineHeight:1.6}}>
                Download your Partnr data as CSV files. Compatible with Excel, Google Sheets, and any data tool. Your data is always yours.
              </p>

              <div style={{display:'flex',flexDirection:'column',gap:'.875rem'}}>
                {[
                  { key: 'partners', label: 'Partners', desc: `${stats.partners} partners with hierarchy, status, and contact info`, icon: '🏢' },
                  { key: 'programs', label: 'Programs', desc: `${stats.programs} programs with lifecycle stages and values`, icon: '📋' },
                  { key: 'activities', label: 'Activities', desc: `${stats.activities} activities with outcomes and evidence links`, icon: '⚡' },
                ].map(({ key, label, desc, icon }) => (
                  <div key={key} style={s.exportRow}>
                    <div style={s.exportIcon}>{icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:500,fontSize:'.9rem',marginBottom:'.15rem'}}>{label}</div>
                      <div style={{fontSize:'.78rem',color:'var(--mu)'}}>{desc}</div>
                    </div>
                    <button
                      className="btn-ghost"
                      style={{fontSize:'.8rem',padding:'.4rem .875rem'}}
                      onClick={() => exportData(key)}
                      disabled={exporting === key}
                    >
                      {exporting === key ? 'Exporting…' : '↓ Export CSV'}
                    </button>
                  </div>
                ))}

                <div style={{paddingTop:'.875rem',borderTop:'1px solid var(--brd)'}}>
                  <button className="btn-primary" onClick={exportAll} disabled={!!exporting}
                    style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
                    {exporting ? 'Exporting…' : '↓ Download all (3 files)'}
                  </button>
                  <p style={{fontSize:'.72rem',color:'var(--mu2)',marginTop:'.6rem'}}>Downloads all three CSVs simultaneously.</p>
                </div>
              </div>
            </div>
          )}

          {/* DANGER ZONE */}
          {tab === 'danger' && (
            <div style={s.section}>
              <h2 style={{...s.sectionTitle,color:'#e07060'}}>Danger zone</h2>
              <p style={{color:'var(--mu)',fontSize:'.875rem',marginBottom:'1.5rem',lineHeight:1.6}}>
                These actions are permanent and cannot be undone. Export your data first.
              </p>

              <div style={s.dangerBox}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:500,marginBottom:'.25rem'}}>Delete all data</div>
                  <div style={{fontSize:'.82rem',color:'var(--mu)'}}>
                    Permanently deletes all partners, programs, and activities. Your account remains active.
                  </div>
                </div>
                <button
                  className="btn-danger"
                  onClick={async () => {
                    if (deleteConfirm !== session.user.email) {
                      setDeleteConfirm('prompt')
                      return
                    }
                    const uid = session.user.id
                    await supabase.from('activities').delete().eq('user_id', uid)
                    await supabase.from('programs').delete().eq('user_id', uid)
                    await supabase.from('partners').delete().eq('user_id', uid)
                    setDeleteConfirm('')
                    setStats({ partners: 0, programs: 0, activities: 0 })
                    flash('All data deleted')
                  }}
                >
                  Delete all data
                </button>
              </div>

              {deleteConfirm === 'prompt' && (
                <div style={s.confirmBox}>
                  <p style={{fontSize:'.82rem',marginBottom:'.75rem'}}>
                    Type your email address to confirm: <strong>{session.user.email}</strong>
                  </p>
                  <input
                    type="email"
                    placeholder={session.user.email}
                    onInput={e => setDeleteConfirm(e.target.value)}
                    style={{marginBottom:'.5rem'}}
                  />
                  <p style={{fontSize:'.72rem',color:'var(--mu2)'}}>Then click "Delete all data" above.</p>
                </div>
              )}

              <div style={{...s.dangerBox,marginTop:'1rem'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:500,marginBottom:'.25rem'}}>Sign out of all devices</div>
                  <div style={{fontSize:'.82rem',color:'var(--mu)'}}>Invalidates all active sessions.</div>
                </div>
                <button className="btn-danger"
                  onClick={async () => { await supabase.auth.signOut({ scope: 'global' }) }}>
                  Sign out everywhere
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  page:{padding:'2rem',maxWidth:860,margin:'0 auto'},
  header:{marginBottom:'2rem'},
  title:{fontFamily:'var(--serif)',fontSize:'1.8rem',letterSpacing:'-.025em'},
  layout:{display:'grid',gridTemplateColumns:'160px 1fr',gap:'2rem',alignItems:'start'},
  tabs:{display:'flex',flexDirection:'column',gap:'2px'},
  tabBtn:{background:'transparent',border:'none',color:'var(--mu)',fontSize:'.82rem',padding:'.5rem .75rem',borderRadius:'var(--radius)',cursor:'pointer',textAlign:'left',fontFamily:'var(--sans)',transition:'all .15s',whiteSpace:'nowrap'},
  tabOn:{background:'var(--amblo)',color:'var(--amberhi)'},
  content:{},
  section:{display:'flex',flexDirection:'column',gap:'.875rem'},
  sectionTitle:{fontFamily:'var(--serif)',fontSize:'1.3rem',letterSpacing:'-.02em'},
  subTitle:{fontSize:'.875rem',fontWeight:500,color:'var(--tx)',marginTop:'.25rem'},
  fieldRow:{display:'flex',alignItems:'baseline',gap:'1rem',padding:'.6rem 0',borderBottom:'1px solid var(--brd)'},
  fieldLabel:{fontSize:'.75rem',color:'var(--mu2)',minWidth:90,flexShrink:0},
  fieldValue:{fontSize:'.875rem',color:'var(--mu)'},
  statsRow:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.75rem'},
  statCard:{background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius)',padding:'1rem',textAlign:'center'},
  statN:{fontFamily:'var(--serif)',fontSize:'1.8rem',lineHeight:1,marginBottom:'.25rem'},
  statL:{fontSize:'.72rem',color:'var(--mu2)',textTransform:'uppercase',letterSpacing:'.05em'},
  exportRow:{display:'flex',alignItems:'center',gap:'.875rem',padding:'1rem',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius)'},
  exportIcon:{fontSize:'1.1rem',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--amblo)',borderRadius:'var(--radius)',flexShrink:0},
  dangerBox:{display:'flex',alignItems:'center',gap:'1rem',padding:'1rem',background:'rgba(192,80,64,.06)',border:'1px solid rgba(192,80,64,.18)',borderRadius:'var(--radius)'},
  confirmBox:{background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius)',padding:'1rem'},
}
