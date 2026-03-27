import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Partners from './pages/Partners'
import Programs from './pages/Programs'
import Activities from './pages/Activities'
import Snapshot from './pages/Snapshot'
import Billing from './pages/Billing'
import Settings from './pages/Settings'
import Layout from './components/Layout'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function Spinner() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#080b0f'}}>
      <div style={{width:22,height:22,border:'2px solid rgba(255,255,255,.08)',borderTopColor:'#d4891a',borderRadius:'50%',animation:'spin .75s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function SmartRedirect() {
  const { session } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!session) return
    supabase.from('partners').select('id',{count:'exact',head:true}).eq('user_id',session.user.id)
      .then(({count}) => navigate(count===0?'/onboarding':'/dashboard',{replace:true}))
  },[session])
  return <Spinner />
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}}) => { setSession(session); setLoading(false) })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session) => setSession(session))
    return () => subscription.unsubscribe()
  },[])

  return (
    <AuthContext.Provider value={{session,loading}}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={session?<Navigate to="/" replace/>:<Login/>}/>
          <Route path="/" element={<ProtectedRoute><SmartRedirect/></ProtectedRoute>}/>
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding/></ProtectedRoute>}/>
          <Route path="/dashboard"  element={<ProtectedRoute><Layout><Dashboard/></Layout></ProtectedRoute>}/>
          <Route path="/partners"   element={<ProtectedRoute><Layout><Partners/></Layout></ProtectedRoute>}/>
          <Route path="/programs"   element={<ProtectedRoute><Layout><Programs/></Layout></ProtectedRoute>}/>
          <Route path="/activities" element={<ProtectedRoute><Layout><Activities/></Layout></ProtectedRoute>}/>
          <Route path="/snapshot"   element={<ProtectedRoute><Layout><Snapshot/></Layout></ProtectedRoute>}/>
          <Route path="/billing"    element={<ProtectedRoute><Layout><Billing/></Layout></ProtectedRoute>}/>
          <Route path="/settings"   element={<ProtectedRoute><Layout><Settings/></Layout></ProtectedRoute>}/>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
