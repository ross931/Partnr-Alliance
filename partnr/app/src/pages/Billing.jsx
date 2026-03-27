// src/pages/Billing.jsx
import { useState } from 'react'
import { useAuth } from '../App'
import { PLANS, redirectToCheckout } from '../lib/stripe'

export default function Billing() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(null)

  async function handleUpgrade(planKey) {
    const plan = PLANS[planKey]
    if (!plan.priceId || plan.priceId.includes('XXXX')) {
      alert('Stripe Price IDs not configured yet. See src/lib/stripe.js for setup.')
      return
    }
    setLoading(planKey)
    try {
      await redirectToCheckout({
        priceId: plan.priceId,
        userId: session?.user?.id,
        email: session?.user?.email,
      })
    } catch (err) {
      console.error(err)
      alert('Something went wrong. Email hello@getpartnr.co')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Upgrade your plan</h1>
        <p style={s.sub}>You're on the free Starter plan. Upgrade to unlock unlimited partners, weekly snapshots, and AI features.</p>
      </div>

      <div style={s.grid}>
        {Object.entries(PLANS).map(([key, plan]) => (
          <div key={key} style={{...s.card, ...(key === 'growth' ? s.featured : {})}}>
            {key === 'growth' && <div style={s.featBadge}>Most popular</div>}
            <div style={s.planName}>{plan.name}</div>
            <div style={s.price}>
              ${plan.price}<span style={s.priceSuffix}>/mo</span>
            </div>
            <div style={s.pricePer}>Billed monthly · cancel anytime</div>
            <ul style={s.feats}>
              {plan.features.map(f => (
                <li key={f} style={s.feat}>
                  <span style={s.check}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button
              style={{...s.cta, ...(key === 'growth' ? s.ctaPrimary : s.ctaSecondary)}}
              onClick={() => handleUpgrade(key)}
              disabled={loading === key}
            >
              {loading === key ? 'Redirecting…' : `Upgrade to ${plan.name} →`}
            </button>
            <p style={s.ctaNote}>14-day free trial · no credit card until trial ends</p>
          </div>
        ))}
      </div>

      <div style={s.footer}>
        <p>Questions about pricing? <a href="mailto:hello@getpartnr.co" style={{color:'var(--amber)'}}>hello@getpartnr.co</a></p>
      </div>
    </div>
  )
}

const s = {
  page:{padding:'2rem',maxWidth:800,margin:'0 auto'},
  header:{marginBottom:'2.5rem'},
  title:{fontFamily:'var(--serif)',fontSize:'1.8rem',letterSpacing:'-.025em',marginBottom:'.4rem'},
  sub:{color:'var(--mu)',fontSize:'.9rem',maxWidth:'52ch'},
  grid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem'},
  card:{background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:'var(--radius-lg)',padding:'1.75rem',position:'relative',overflow:'hidden'},
  featured:{borderColor:'rgba(212,137,26,.38)',background:'linear-gradient(155deg,var(--bg2),rgba(212,137,26,.04))'},
  featBadge:{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',background:'var(--amber)',color:'#080b0f',fontSize:'.65rem',fontWeight:500,padding:'.2rem 1rem',borderRadius:'0 0 6px 6px',letterSpacing:'.05em',whiteSpace:'nowrap'},
  planName:{fontSize:'.78rem',fontWeight:500,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--mu2)',marginBottom:'.75rem',marginTop:'.5rem'},
  price:{fontFamily:'var(--serif)',fontSize:'2.4rem',lineHeight:1,marginBottom:'.2rem'},
  priceSuffix:{fontFamily:'var(--sans)',fontSize:'1rem',fontWeight:300,color:'var(--mu)'},
  pricePer:{fontSize:'.75rem',color:'var(--mu2)',marginBottom:'1.5rem'},
  feats:{listStyle:'none',display:'flex',flexDirection:'column',gap:'.55rem',marginBottom:'1.5rem'},
  feat:{fontSize:'.82rem',color:'var(--mu)',display:'flex',gap:'.55rem',alignItems:'baseline'},
  check:{color:'var(--amber)',fontSize:'.72rem',flexShrink:0},
  cta:{display:'block',width:'100%',textAlign:'center',padding:'.65rem',borderRadius:'var(--radius)',fontFamily:'var(--sans)',fontSize:'.9rem',fontWeight:500,cursor:'pointer',border:'none',transition:'all .2s'},
  ctaPrimary:{background:'var(--amber)',color:'#080b0f'},
  ctaSecondary:{background:'transparent',color:'var(--tx)',border:'1px solid var(--brd)'},
  ctaNote:{fontSize:'.7rem',color:'var(--mu2)',textAlign:'center',marginTop:'.55rem'},
  footer:{marginTop:'2.5rem',textAlign:'center',fontSize:'.85rem',color:'var(--mu)'},
}
