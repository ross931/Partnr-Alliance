import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('signin') // signin | signup | magic
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + '/dashboard' }
        })
        if (error) throw error
        setMessage('Check your email for a magic link to sign in.')
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + '/dashboard' }
        })
        if (error) throw error
        setMessage('Check your email to confirm your account.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.logoBig}>Part<span style={{color:'#d4891a',fontStyle:'italic'}}>n</span>r</div>
          <h2 style={styles.tagline}>The Partner CRM for Alliance Managers</h2>
          <p style={styles.taglineSub}>Track programs, certifications, and partner activities — not just co-sell revenue.</p>
          <div style={styles.features}>
            {['Multi-tier partner hierarchy','Program lifecycle tracking','Build / Market / Sell framework','Auto-generated weekly snapshots'].map(f => (
              <div key={f} style={styles.feature}>
                <span style={styles.check}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={styles.right}>
        <div style={styles.form}>
          <h1 style={styles.formTitle}>
            {mode === 'signup' ? 'Create your account' : mode === 'magic' ? 'Magic link sign in' : 'Sign in to Partnr'}
          </h1>
          <p style={styles.formSub}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button style={styles.switchBtn} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {error && <div className="error-msg">{error}</div>}
          {message && <div className="success-msg">{message}</div>}

          {!message && (
            <form onSubmit={handleAuth}>
              <div className="form-row">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
              </div>
              {mode !== 'magic' && (
                <div className="form-row">
                  <label>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </div>
              )}
              <button type="submit" className="btn-primary" style={{width:'100%',padding:'.7rem',marginTop:'.5rem',fontSize:'1rem'}} disabled={loading}>
                {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
              </button>
            </form>
          )}

          <div style={styles.divider}><span>or</span></div>
          <button
            className="btn-ghost"
            style={{width:'100%',padding:'.6rem'}}
            onClick={() => { setMode(mode === 'magic' ? 'signin' : 'magic'); setError(''); setMessage(''); }}
          >
            {mode === 'magic' ? 'Sign in with password instead' : '✉️  Sign in with magic link'}
          </button>

          <p style={styles.terms}>By continuing, you agree to Partnr's <a href="#" style={{color:'var(--amber)'}}>Terms</a> and <a href="#" style={{color:'var(--amber)'}}>Privacy Policy</a>.</p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {display:'flex',minHeight:'100vh'},
  left: {flex:'1',background:'linear-gradient(135deg,#0e1116 0%,#131820 100%)',borderRight:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'center',padding:'3rem',display:'none'},
  leftInner: {maxWidth:'400px'},
  logoBig: {fontFamily:'var(--serif)',fontSize:'2.5rem',letterSpacing:'-.03em',marginBottom:'2rem',color:'var(--tx)'},
  tagline: {fontFamily:'var(--serif)',fontSize:'1.5rem',lineHeight:'1.2',letterSpacing:'-.02em',marginBottom:'.75rem',color:'var(--tx)'},
  taglineSub: {color:'var(--mu)',fontSize:'.9rem',lineHeight:'1.7',marginBottom:'2rem',fontWeight:'300'},
  features: {display:'flex',flexDirection:'column',gap:'.6rem'},
  feature: {display:'flex',alignItems:'center',gap:'.6rem',fontSize:'.85rem',color:'var(--mu)'},
  check: {color:'#d4891a',fontWeight:'500',flexShrink:0},
  right: {flex:'1',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem'},
  form: {width:'100%',maxWidth:'380px'},
  formTitle: {fontFamily:'var(--serif)',fontSize:'1.8rem',letterSpacing:'-.02em',marginBottom:'.4rem'},
  formSub: {color:'var(--mu)',fontSize:'.875rem',marginBottom:'1.5rem'},
  switchBtn: {background:'none',border:'none',color:'var(--amber)',cursor:'pointer',fontSize:'.875rem',padding:0,textDecoration:'underline'},
  divider: {display:'flex',alignItems:'center',gap:'1rem',margin:'1.25rem 0',color:'var(--mu2)',fontSize:'.78rem'},
  terms: {marginTop:'1.5rem',fontSize:'.72rem',color:'var(--mu2)',textAlign:'center',lineHeight:1.6},
}

// Show left panel on larger screens
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = '@media(min-width:768px){div[style*="display:none"]{display:flex !important}}'
  document.head.appendChild(style)
}
