import { useTranslation } from 'react-i18next'
import siteConfig from '../../config/siteConfig'
import './LiveSection.css'

export default function LiveSection() {
  const { t } = useTranslation()
  const { channel, chatFallbackUrl } = siteConfig.twitch
  const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'

  return (
    <section className="live-section" aria-label="Live Stream">
      <div className="embed-card">
        <a href={`https://www.twitch.tv/${channel}`} target="_blank" rel="noopener noreferrer">
          <div className="embed-title">{t('live.title')}</div>
        </a>
        <div className="embed-row">
          <div className="embed-player">
            <iframe
              src={`https://player.twitch.tv/?channel=${channel}&parent=${parent}`}
              allow="autoplay; fullscreen; clipboard-write; encrypted-media"
              allowFullScreen
              title="Twitch Live Player"
            />
          </div>
          <div className="embed-chat">
            <iframe
              src={`https://www.twitch.tv/embed/${channel}/chat?parent=${parent}&darkpopout`}
              title="Twitch Chat"
              allow="autoplay; fullscreen; clipboard-write"
            />
            <div className="chat-fallback">
              <a href={chatFallbackUrl} target="_blank" rel="noopener noreferrer">
                {t('live.chatFallback')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

