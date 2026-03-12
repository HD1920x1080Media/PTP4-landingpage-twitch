import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/useAuth'
import LoginButton from '../components/LoginButton/LoginButton'
import SubPage from '../components/SubPage/SubPage'

export default function ClipVotingPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <SubPage>
      <h1>{t('clipVotingPage.title')}</h1>
      <p>{t('clipVotingPage.intro')}</p>

      {/* TODO: Clip-Liste aus Supabase laden */}
      <div style={{ margin: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>
        <p>{t('clipVotingPage.comingSoon')}</p>
      </div>

      {/* Voting braucht Login – zeige Login-Hinweis wenn nicht eingeloggt */}
      {!user && (
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>
            {t('clipVotingPage.loginToVote')}
          </p>
          <LoginButton label={t('clipVotingPage.loginButton')} />
        </div>
      )}

      {user && (
        <p style={{ textAlign: 'center', color: 'var(--accent)' }}>
          ✅ {t('clipVotingPage.loggedInAs', { name: user.user_metadata?.full_name ?? user.email })}
        </p>
      )}
    </SubPage>
  )
}

