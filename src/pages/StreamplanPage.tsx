import { useTranslation } from 'react-i18next'
import siteConfig from '../config/siteConfig'
import SubPage from '../components/SubPage/SubPage'

export default function StreamplanPage() {
  const { t } = useTranslation()
  const { calendarUrl, calendarEmbedUrl } = siteConfig.streamplan

  return (
    <SubPage>
      <h1>{t('streamplanPage.title')}</h1>
      <p>{t('streamplanPage.intro')}</p>

      <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
        <div className="embed-title">{t('streamplanPage.calendarTitle')}</div>
      </a>
      <div className="subpage-embed">
        <iframe
          src={calendarEmbedUrl}
          title={t('streamplanPage.calendarTitle')}
          allowFullScreen
        />
      </div>
    </SubPage>
  )
}

