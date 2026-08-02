import {useState} from 'react'
import type {FormEvent} from 'react'
import type {User} from '@supabase/supabase-js'
import siteConfig from '../config/siteConfig'
import SubPage from '../components/SubPage/SubPage'
import {useAuth} from '../context/useAuth'
import {useTranslation} from "react-i18next";

/** Endpunkt der Edge Function; nur die Projekt-URL, kein Supabase-Key im Frontend. */
const CONTACT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/contact`

/** Honeypot: fuer Menschen unsichtbar, fuer Bots im DOM und damit ausfuellbar. */
const honeypotStyle = {
  position: 'absolute',
  left: '-9999px',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
} as const

const fieldStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--box-border)',
  background: 'var(--color-btn-bg)',
  color: 'var(--color-text)',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
} as const

const labelStyle = {
  display: 'grid',
  gap: 4,
  fontSize: '0.88rem',
  color: 'var(--muted)',
} as const

/** Gedimmtes Feld, solange die Session noch geladen wird. */
const loadingFieldStyle = {
  ...fieldStyle,
  opacity: 0.6,
  cursor: 'progress',
} as const

/** Anzeigename aus den Twitch-Metadaten, mit Rueckfall auf den Login-Namen. */
function accountDisplayName(user: User | null): string {
  const meta = user?.user_metadata ?? {}
  const candidate = meta.full_name ?? meta.user_login
  return typeof candidate === 'string' ? candidate : ''
}

/** Impressum-Seite: gesetzlich vorgeschriebene Anbieterkennzeichnung aus siteConfig. */
export default function ImpressumPage() {
  const { t } = useTranslation()
  const { impressum } = siteConfig
  const { user, loading: authLoading } = useAuth()

  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Name und E-Mail werden aus dem Konto abgeleitet, nicht per Effect kopiert:
  // null bedeutet "noch nicht angefasst, Konto-Wert benutzen". Sobald der Nutzer
  // tippt, gewinnt der Override — auch wenn die Session erst danach eintrifft.
  const [nameOverride, setNameOverride] = useState<string | null>(null)
  const [emailOverride, setEmailOverride] = useState<string | null>(null)

  const accountName = accountDisplayName(user)
  const accountEmail = user?.email ?? ''

  const name = nameOverride ?? accountName
  const email = emailOverride ?? accountEmail

  async function submitContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setStatus('idle')
    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, website }),
      })
      if (!res.ok) throw new Error(`contact ${res.status}`)
      setStatus('success')
      setMessage('')
      // Overrides loeschen: Name und E-Mail fallen auf die Konto-Werte zurueck
      setNameOverride(null)
      setEmailOverride(null)
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SubPage>
      <h1>{t('impressumPage.title')}</h1>
      <p>
        <strong>{impressum.name}</strong><br />
        {impressum.company}<br />
        {impressum.street}<br />
        {impressum.city}
      </p>
      <p>
        {t('impressumPage.contact')}:{' '}
        <a href={`mailto:${impressum.email}?subject=Anfrage%20Impressum`}>
          {impressum.email}
        </a>
      </p>

      <h2>{t('impressumPage.form.title')}</h2>
      <form onSubmit={submitContact} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <label style={labelStyle}>
          {t('impressumPage.form.name')}
          <input
            type="text"
            value={name}
            onChange={(e) => setNameOverride(e.target.value)}
            required
            maxLength={200}
            autoComplete="name"
            disabled={authLoading}
            placeholder={authLoading ? t('impressumPage.form.loadingAccount') : undefined}
            style={authLoading ? loadingFieldStyle : fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          {t('impressumPage.form.email')}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmailOverride(e.target.value)}
            required
            maxLength={320}
            autoComplete="email"
            disabled={authLoading}
            placeholder={authLoading ? t('impressumPage.form.loadingAccount') : undefined}
            style={authLoading ? loadingFieldStyle : fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          {t('impressumPage.form.message')}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            maxLength={5000}
            rows={6}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </label>

        {/* Honeypot — nicht display:none, damit Bots ihn als echtes Feld werten. */}
        <div style={honeypotStyle} aria-hidden="true">
          <label>
            Website
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
        </div>

        <div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? t('impressumPage.form.sending') : t('impressumPage.form.submit')}
          </button>
        </div>

        {status === 'success' && (
          <p role="status" style={{ margin: 0, color: 'var(--accent)', fontSize: '0.9rem' }}>
            {t('impressumPage.form.success')}
          </p>
        )}
        {status === 'error' && (
          <p role="alert" style={{ margin: 0, color: '#e5534b', fontSize: '0.9rem' }}>
            {t('impressumPage.form.error')}
          </p>
        )}
      </form>
    </SubPage>
  )
}
