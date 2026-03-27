// src/pages/Onboarding.jsx
// Shown to new users who have 0 partners.
// Guides them through adding their first partner + program.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const STEPS = ['Welcome', 'First partner', 'First program', 'Done']

const PARTNER_TYPES = ['Reseller','ISV','GSI','SI','Technology Partner']
const TIERS = ['Primary','Sub-Partner','Joint Customer']
const CLOUDS = ['AWS','Azure','GCP','Multi-Cloud']
const PROG_TYPES = ['Certification','Marketplace Listing','MDF / Credits','Joint Content','Technical Integration','Co-Marketing']
const DIMENSIONS = ['Build','Market','Sell']

export default function Onboarding() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [partner, setPartner] = useState({
    name: '', type: 'Technology Partner', tier: 'Primary', cloud: 'AWS', status: 'Active',
  })
  const [program, setProgram] = useState({
    name: '', type: 'Certification', dimension: 'Build', stage: 'In Progress',
  })
  const [partnerId, setPartnerId] = useState(null)

  async function savePartner() {
    if (!partner.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('partners').insert({
      ...partner,
      user_id: session.user.id,
    }).select().single()
    setSaving(false)
    if (!error && data) {
      setPartnerId(data.id)
      setStep(2)
    }
  }

  async function saveProgram() {
    setSaving(true)
    if (program.name.trim()) {
      await supabase.from('programs').insert({
        ...program,
        partner_id: partnerId,
        user_id: session.user.id,
      })
    }
    setSaving(false)
    setStep(3)
  }

  function skip() {
    navigate('/dashboard')
  }

  return (
    <div style={s.page}>
      {/* Progress bar */}
      <div style={s.progress}>
        {STEPS.map((label, i) => (
          <div key={i} style={s.stepItem}>
            <div style={{...s.stepDot, ...(i <= step ? s.stepDotOn : {})}}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{...s.stepLabel, ...(i === step ? s.stepLabelOn : {})}}>{label}</span>
          </div>
        ))}
        <div style={s.progressBar}>
          <div style={{...s.progressFill, width: `${(step / (STEPS.length - 1)) * 100}%`}} />
        </div>
      </div>

      <div style={s.card}>
        {/* STEP 0: Welcome */}
        {step === 0 && (
          <div style={s.stepBody}>
            <div style={s.welcomeIcon}>✦</div>
            <h1 style={s.h1}>Welcome to Partnr</h1>
            <p style={s.p}>
              You're about to set up the first proper system of record for your alliance function.
              This takes about 3 minutes.
            </p>
            <div style={s.steps3}>
              <div style={s.step3}>
                <div style={s.step3n}>1</div>
                <div>
                  <strong>Add your first partner</strong>
                  <p style={{fontSize:'.8rem',color:'var(--mu)',marginTop:'.15rem'}}>AWS, Azure, Snowflake — whoever you manage most actively</p>
                </div>
              </div>
              <div style={s.step3}>
                <div style={s.step3n}>2</div>
                <div>
                  <strong>Create a program</strong>
                  <p style={{fontSize:'.8rem',color:'var(--mu)',marginTop:'.15rem'}}>A certification track, MDF application, or joint content piece</p>
                </div>
              </div>
              <div style={s.step3}>
                <div style={s.step3n}>3</div>
                <div>
                  <strong>Start logging activities</strong>
                  <p style={{fontSize:'.8rem',color:'var(--mu)',marginTop:'.15rem'}}>Every meeting, submission, and win — all in one place</p>
                </div>
              </div>
            </div>
            <button style={s.primary} onClick={() => setStep(1)}>
              Let's set it up →
            </button>
            <button style={s.textBtn} onClick={skip}>Skip — I'll explore on my own</button>
          </div>
        )}

        {/* STEP 1: Add partner */}
        {step === 1 && (
          <div style={s.stepBody}>
            <h2 style={s.h2}>Add your first partner</h2>
            <p style={s.p}>Start with whoever you work most closely with — you can add more later.</p>

            <div className="form-row">
              <label>Partner name *</label>
              <input
                type="text"
                value={partner.name}
                onChange={e => setPartner({...partner, name: e.target.value})}
                placeholder="e.g. Amazon Web Services"
                autoFocus
              />
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
              <div className="form-row">
                <label>Cloud</label>
                <select value={partner.cloud} onChange={e => setPartner({...partner, cloud: e.target.value})}>
                  {CLOUDS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Partner type</label>
                <select value={partner.type} onChange={e => setPartner({...partner, type: e.target.value})}>
                  {PARTNER_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={s.actions}>
              <button style={s.ghost} onClick={skip}>Skip for now</button>
              <button
                style={{...s.primary, ...(saving || !partner.name.trim() ? {opacity:.5,cursor:'not-allowed'} : {})}}
                onClick={savePartner}
                disabled={saving || !partner.name.trim()}
              >
                {saving ? 'Saving…' : 'Save & continue →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Add program */}
        {step === 2 && (
          <div style={s.stepBody}>
            <h2 style={s.h2}>Create your first program</h2>
            <p style={s.p}>
              What's the most active thing you're working on with <strong>{partner.name}</strong>?
            </p>

            <div className="form-row">
              <label>Program name *</label>
              <input
                type="text"
                value={program.name}
                onChange={e => setProgram({...program, name: e.target.value})}
                placeholder="e.g. AWS AI Competency Certification"
                autoFocus
              />
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
              <div className="form-row">
                <label>Program type</label>
                <select value={program.type} onChange={e => setProgram({...program, type: e.target.value})}>
                  {PROG_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Dimension</label>
                <select value={program.dimension} onChange={e => setProgram({...program, dimension: e.target.value})}>
                  {DIMENSIONS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div style={s.dimHelp}>
              <div style={s.dimTip(program.dimension)}>
                {program.dimension === 'Build' && '⚙️ Build — technical integrations, certifications, product work. Reports to CTO.'}
                {program.dimension === 'Market' && '📣 Market — joint content, co-marketing, case studies. Reports to CMO.'}
                {program.dimension === 'Sell' && '💰 Sell — co-sell pipeline, marketplace, deal registration. Reports to CRO.'}
              </div>
            </div>

            <div style={s.actions}>
              <button style={s.ghost} onClick={() => setStep(3)}>Skip program</button>
              <button
                style={{...s.primary, ...(saving || !program.name.trim() ? {opacity:.5,cursor:'not-allowed'} : {})}}
                onClick={saveProgram}
                disabled={saving || !program.name.trim()}
              >
                {saving ? 'Saving…' : 'Save & continue →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === 3 && (
          <div style={{...s.stepBody, textAlign:'center'}}>
            <div style={s.doneIcon}>🎉</div>
            <h2 style={s.h2}>You're set up!</h2>
            <p style={s.p}>
              {partnerId
                ? `${partner.name} is in Partnr. ${program.name ? `Your "${program.name}" program is tracking.` : ''} Start logging activities to build toward your first weekly snapshot.`
                : "Head to your dashboard and start adding partners and programs."}
            </p>
            <div style={s.nextActions}>
              <div style={s.nextAction}>
                <div style={s.naIcon}>⚡</div>
                <div>
                  <strong style={{fontSize:'.875rem'}}>Log an activity</strong>
                  <p style={{fontSize:'.78rem',color:'var(--mu)',marginTop:'.1rem'}}>Record a meeting, certification, or deal</p>
                </div>
              </div>
              <div style={s.nextAction}>
                <div style={s.naIcon}>✦</div>
                <div>
                  <strong style={{fontSize:'.875rem'}}>Generate a snapshot</strong>
                  <p style={{fontSize:'.78rem',color:'var(--mu)',marginTop:'.1rem'}}>Get your first AI leadership report</p>
                </div>
              </div>
            </div>
            <button style={s.primary} onClick={() => navigate('/dashboard')}>
              Go to dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const dimTipColors = {
  Build: 'rgba(0,180,180,.1)',
  Market: 'rgba(200,100,200,.1)',
  Sell: 'rgba(212,137,26,.1)',
}

const s = {
  page:{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'},
  progress:{display:'flex',alignItems:'center',gap:0,marginBottom:'2.5rem',position:'relative',width:'100%',maxWidth:540},
  progressBar:{position:'absolute',top:14,left:14,right:14,height:2,background:'var(--brd)',zIndex:0},
  progressFill:{height:'100%',background:'var(--amber)',borderRadius:1,transition:'width .4s ease'},
  stepItem:{display:'flex',flexDirection:'column',alignItems:'center',gap:'.4rem',flex:1,position:'relative',zIndex:1},
  stepDot:{width:28,height:28,borderRadius:'50%',background:'var(--bg2)',border:'1px solid var(--brd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.72rem',color:'var(--mu2)',transition:'all .2s'},
  stepDotOn:{background:'var(--amber)',borderColor:'var(--amber)',color:'#080b0f',fontWeight:500},
  stepLabel:{fontSize:'.68rem',color:'var(--mu2)',whiteSpace:'nowrap'},
  stepLabelOn:{color:'var(--tx)'},
  card:{background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius-lg)',padding:'2.5rem',width:'100%',maxWidth:520},
  stepBody:{display:'flex',flexDirection:'column',gap:'1.25rem'},
  welcomeIcon:{fontSize:'2rem',textAlign:'center',color:'var(--amber)'},
  h1:{fontFamily:'var(--serif)',fontSize:'1.8rem',letterSpacing:'-.025em',textAlign:'center'},
  h2:{fontFamily:'var(--serif)',fontSize:'1.4rem',letterSpacing:'-.02em'},
  p:{color:'var(--mu)',fontSize:'.9rem',lineHeight:1.65},
  steps3:{display:'flex',flexDirection:'column',gap:'.875rem'},
  step3:{display:'flex',alignItems:'flex-start',gap:.875+'rem'},
  step3n:{width:24,height:24,borderRadius:'50%',background:'var(--amblo)',border:'1px solid rgba(212,137,26,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.72rem',color:'var(--amberhi)',fontWeight:500,flexShrink:0,marginTop:1},
  dimHelp:{marginTop:'-.25rem'},
  dimTip:(dim) => ({fontSize:'.8rem',color:'var(--mu)',background:dimTipColors[dim]||'var(--bg3)',border:'1px solid var(--brd)',borderRadius:'var(--radius)',padding:'.6rem .875rem',lineHeight:1.5}),
  actions:{display:'flex',gap:'.75rem',justifyContent:'flex-end',marginTop:'.5rem'},
  primary:{background:'var(--amber)',color:'#080b0f',border:'none',borderRadius:'var(--radius)',padding:'.62rem 1.5rem',fontFamily:'var(--sans)',fontSize:'.9rem',fontWeight:500,cursor:'pointer',transition:'background .2s'},
  ghost:{background:'transparent',border:'1px solid var(--brd)',color:'var(--mu)',borderRadius:'var(--radius)',padding:'.6rem 1rem',fontFamily:'var(--sans)',fontSize:'.82rem',cursor:'pointer'},
  textBtn:{background:'none',border:'none',color:'var(--mu2)',fontSize:'.78rem',cursor:'pointer',fontFamily:'var(--sans)',textAlign:'center',textDecoration:'underline'},
  doneIcon:{fontSize:'2.5rem',textAlign:'center'},
  nextActions:{display:'flex',flexDirection:'column',gap:'.75rem',textAlign:'left'},
  nextAction:{display:'flex',alignItems:'flex-start',gap:'.875rem',padding:'1rem',background:'var(--bg)',border:'1px solid var(--brd)',borderRadius:'var(--radius)'},
  naIcon:{fontSize:'1.1rem',color:'var(--amber)',flexShrink:0,marginTop:2},
}
