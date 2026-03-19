import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './NotFoundPage.css'

export default function NotFoundPage() {
  const { t } = useTranslation()
  const messages = t('notFound.confusedMessages', { returnObjects: true }) as string[]
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * messages.length))
  const [spin, setSpin] = useState(false)

  // Rotate through messages on click
  const nextMessage = () => {
    setSpin(true)
    setMsgIndex((prev) => (prev + 1) % messages.length)
    setTimeout(() => setSpin(false), 600)
  }

  return (
    <main className="not-found">
      <div className="not-found-card">
        {/* Giant 404 with beard avatar */}
        <div className="not-found-hero">
          <span className="not-found-four">4</span>
          <div className={`not-found-avatar ${spin ? 'spin' : ''}`} onClick={nextMessage}>
            {/* Inline beard SVG so we can make it big & animated */}
            <svg viewBox="25 15 75 75" xmlns="http://www.w3.org/2000/svg" className="beard-svg">
              <rect x="30" y="30" width="40" height="40" rx="6" fill="#d4a373" />
              <rect x="25" y="32" width="50" height="5" rx="2" fill="#7C4DFF" />
              <path d="M30 32 L70 32 L70 25 Q 50 15 30 25 Z" fill="#7C4DFF" />
              <circle cx="50" cy="18" r="2" fill="#5c38cc" />
              <g stroke="#111" strokeWidth="1.2" fill="none">
                <rect x="34" y="42" width="10" height="7" rx="1" />
                <rect x="56" y="42" width="10" height="7" rx="1" />
                <path d="M44 46 h12" />
              </g>
              {/* Confused eyes — spirals instead of dots */}
              <text x="39" y="47" fontSize="5" textAnchor="middle" fill="#000">?</text>
              <text x="61" y="47" fontSize="5" textAnchor="middle" fill="#000">?</text>
              <path d="M 30 60 Q 50 63 70 60 L 70 76 Q 50 90 30 76 Z" fill="#3d2b1f" />
            </svg>
          </div>
          <span className="not-found-four">4</span>
        </div>

        {/* Funny message */}
        <p className="not-found-message" onClick={nextMessage}>
          {messages[msgIndex]}
        </p>
        <p className="not-found-hint">
          {t('notFound.hint')}
        </p>

        {/* Back button */}
        <Link to="/" className="btn btn-primary not-found-btn">
          {t('back')}
        </Link>
      </div>
    </main>
  )
}

