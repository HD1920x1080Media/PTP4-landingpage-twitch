import { useTranslation } from 'react-i18next'
import SubPage from '../components/SubPage/SubPage'

export default function ActuatorPage() {
  const { t } = useTranslation()

  return (
    <SubPage>
      <h1>{t('actuatorPage.title')}</h1>
      <p>{t('actuatorPage.comingSoon')}</p>
      {/* TODO: Actuator Data-Dashboard – Supabase Queries */}
    </SubPage>
  )
}

