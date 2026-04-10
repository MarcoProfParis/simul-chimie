import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login', { replace: true })
      else setSession(session)
    })
  }, [navigate])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  if (!session) return null

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Tableau de bord</h1>
        <p className={styles.welcome}>
          Connecté en tant que <strong>{session.user.email}</strong>
        </p>
        <button className={styles.btnSignOut} onClick={handleSignOut}>
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
