import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Footer from '../Footer/Footer'
import './SubPage.css'

interface SubPageProps {
  children: ReactNode
}

export default function SubPage({ children }: SubPageProps) {
  const { t } = useTranslation()

  return (
    <main className="subpage-container">
      <div className="subpage-card">
        {children}
        <p className="subpage-back">
          <Link to="/" className="btn btn-primary">{t('back')}</Link>
        </p>
      </div>
      <Footer />
    </main>
  )
}

