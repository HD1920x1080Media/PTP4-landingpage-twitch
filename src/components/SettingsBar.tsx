import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/useTheme'
import ProfileButton from './ProfileButton/ProfileButton'
import './SettingsBar.css'

const themeIcons: Record<string, string> = {
  light: '☀️',
  dark: '🌙',
  system: '💻',
}

const themeOrder = ['system', 'light', 'dark'] as const

export default function SettingsBar() {
  const { mode, setMode } = useTheme()
  const { t, i18n } = useTranslation()

  const cycleTheme = () => {
    const idx = themeOrder.indexOf(mode)
    setMode(themeOrder[(idx + 1) % themeOrder.length])
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <div className="settings-bar">
      <ProfileButton />

      <button className="settings-btn" onClick={cycleTheme} title={t('settings.theme')}>
        {themeIcons[mode]} {t(`settings.${mode}`)}
      </button>

      <select
        className="settings-select"
        value={i18n.language?.startsWith('de') ? 'de' : 'en'}
        onChange={(e) => changeLanguage(e.target.value)}
        title={t('settings.language')}
      >
        <option value="de">🇩🇪 Deutsch</option>
        <option value="en">🇬🇧 English</option>
      </select>
    </div>
  )
}

